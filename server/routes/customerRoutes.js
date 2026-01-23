const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Customer = require('../models/Customer');
const KhataTransaction = require('../models/KhataTransaction');
const Shop = require('../models/User'); // Ensure this matches your model file name
const mongoose = require('mongoose');
const twilio = require('twilio');

// Initialize Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const router = express.Router();

// --- GET ALL CUSTOMERS ---
router.get('/', protect, async (req, res) => {
    try {
        const customers = await Customer.find({ shopId: req.user.shopId });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customers.' });
    }
});

// --- GET TRANSACTION HISTORY ---
router.get('/:id/history', protect, async (req, res) => {
    const customerId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ error: 'Invalid Customer ID.' });
    }
    
    try {
        const transactions = await KhataTransaction.find({
            customerId: customerId,
            shopId: req.user.shopId
        }).sort({ timestamp: -1 });

        res.json(transactions);
    } catch (error) {
        console.error('Customer History GET Error:', error);
        res.status(500).json({ error: 'Failed to fetch customer history.' });
    }
});

// --- CREATE CUSTOMER ---
router.post('/', protect, async (req, res) => {
    const { name, phone, creditLimit, initialDue } = req.body;
    
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Customer name is required.' });
    }
    
    const rawInitialDue = initialDue === undefined || initialDue === null || initialDue === '' 
                          ? 0 : initialDue;
    
    const parsedInitialDue = parseFloat(rawInitialDue);

    if (isNaN(parsedInitialDue) || parsedInitialDue < 0) {
        return res.status(400).json({ error: 'Initial Due must be a non-negative number.', field: 'initialDue' });
    }
    
    const parsedCreditLimit = Math.max(0, parseFloat(creditLimit) || 0);
    const trimmedPhone = phone ? String(phone).trim() : '';

    if (trimmedPhone) {
        const existingCustomer = await Customer.findOne({ 
            phone: trimmedPhone, 
            shopId: req.user.shopId
        });

        if (existingCustomer) {
            return res.status(400).json({ 
                error: `Phone number is already associated with customer: ${existingCustomer.name}`,
                field: 'phone',
                existingCustomerName: existingCustomer.name
            });
        }
    }
    
    try {
        const newCustomerData = {
            name: name.trim(),
            phone: trimmedPhone, 
            creditLimit: parsedCreditLimit, 
            outstandingCredit: parsedInitialDue, 
            shopId: req.user.shopId,
        };
        
        const customer = await Customer.create(newCustomerData);

        if (parsedInitialDue > 0) {
            await KhataTransaction.create({
                shopId: req.user.shopId,
                customerId: customer._id,
                amount: parsedInitialDue,
                type: 'initial_due',
                details: 'Starting balance recorded upon customer creation.',
            });
        }
        
        res.status(201).json({ message: 'Customer added successfully', customer });
    } catch (error) {
        console.error('Customer POST Error:', error);
        if (error.code === 11000) {
            const duplicateKey = Object.keys(error.keyValue)[0];
            return res.status(400).json({ 
                error: `A customer with this ${duplicateKey} already exists in your shop.`,
                field: duplicateKey 
            });
        }
        res.status(500).json({ error: 'Failed to add new customer. Please try again.' });
    }
});

// --- UPDATE CREDIT (PAYMENTS) ---
router.put('/:customerId/credit', protect, async (req, res) => {
    const { customerId } = req.params;
    const { amountChange, paymentAmount, type } = req.body; 

    if (typeof amountChange !== 'number' || isNaN(amountChange)) {
        return res.status(400).json({ error: 'Invalid amountChange provided.' });
    }
    
    if (amountChange >= 0) {
         return res.status(400).json({ error: 'Credit update must be negative for payments.' });
    }

    try {
        let updatedCustomer = await Customer.findOneAndUpdate(
            { _id: customerId, shopId: req.user.shopId },
            { $inc: { outstandingCredit: amountChange } },
            { new: true } 
        );
        
        if (!updatedCustomer) {
            return res.status(404).json({ error: 'Customer not found or does not belong to this shop.' });
        }
        
        await KhataTransaction.create({
            shopId: req.user.shopId,
            customerId: updatedCustomer._id,
            amount: paymentAmount || Math.abs(amountChange),
            type: type || 'payment_received',
            details: `Payment recorded: ₹${(paymentAmount || Math.abs(amountChange)).toFixed(0)}`,
        });

        if (updatedCustomer.outstandingCredit < 0) {
             updatedCustomer = await Customer.findOneAndUpdate(
                { _id: customerId, shopId: req.user.shopId }, 
                { outstandingCredit: 0 }, 
                { new: true }
            );
             
             return res.json({ 
                message: 'Credit updated successfully (Outstanding cleared).', 
                customer: updatedCustomer
            });
        }

        res.json({ 
            message: 'Credit updated successfully', 
            customer: updatedCustomer
        });
        
    } catch (error) {
        console.error('Customer Credit PUT Error:', error);
        res.status(500).json({ error: 'Failed to update customer credit.' });
    }
});

// --- SEND REMINDER (WHATSAPP + SMS) ---
router.post('/:id/remind', protect, async (req, res) => {
    const customerId = req.params.id;
    const { message } = req.body;

    console.log('--- Start Reminder Process ---');

    if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Reminder message cannot be empty.' });
    }

    try {
        // 1. Database Lookups
        const customer = await Customer.findOne({ 
            _id: customerId, 
            shopId: req.user.shopId 
        });

        // Use 'User' instead of 'Shop' based on your provided schema
        const shop = await User.findById(req.user.shopId);

        if (!customer) return res.status(404).json({ error: 'Customer not found.' });
        if (!shop) return res.status(404).json({ error: 'Shop/User profile not found.' });
        if (!customer.phone) return res.status(400).json({ error: 'Customer phone missing.' });

        // 2. Variable Prep
        const formattedTo = customer.phone.startsWith('+') ? customer.phone : `+${customer.phone}`;
        const waFrom = `whatsapp:${process.env.TWILIO_WA_NUMBER || '+14155238886'}`;
        const smsFrom = process.env.TWILIO_PHONE_NUMBER;

        // Note: Using shopName because your User schema uses 'shopName' not 'name'
        const finalMessage = `From ${shop.shopName || 'Shop'}: ${message}`;

        // 3. Execution (Using the Template SID from your screenshot)
        console.log('Attempting to send messages...');
        const results = await Promise.allSettled([
            // WhatsApp Channel - Using the Content Template from your screenshot
            client.messages.create({
                from: waFrom,
                to: `whatsapp:${formattedTo}`,
                contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e', // From your screenshot
                contentVariables: JSON.stringify({
                    1: new Date().toLocaleDateString(), // Fills {{1}}
                    2: new Date().toLocaleTimeString()  // Fills {{2}}
                })
            }),
            // SMS Channel - Using free-form text
            client.messages.create({
                from: smsFrom,
                to: formattedTo,
                body: finalMessage
            })
        ]);

        const waStatus = results[0].status === 'fulfilled' ? 'Success' : 'Failed';
        const smsStatus = results[1].status === 'fulfilled' ? 'Success' : 'Failed';

        // 4. Transaction Logging
        // IMPORTANT: Ensure you have added 'reminder_sent' to your KhataTransactionSchema enum
        await KhataTransaction.create({
            shopId: req.user.shopId,
            customerId: customer._id,
            amount: 0,
            type: 'reminder_sent', 
            details: `Reminder: WhatsApp ${waStatus}, SMS ${smsStatus}. Content: ${message}`,
        });

        console.log('--- Process Complete ---');
        res.json({ 
            success: true, 
            delivery: { 
                whatsapp: waStatus, 
                sms: smsStatus,
                waDetails: results[0].status === 'rejected' ? results[0].reason.message : 'Sent'
            } 
        });

    } catch (error) {
        console.error('CRITICAL ERROR:', error.message);
        res.status(500).json({ 
            error: 'Internal server error while processing reminder.',
            dev_error: error.message 
        });
    }
});

module.exports = router;