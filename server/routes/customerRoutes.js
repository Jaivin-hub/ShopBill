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

    if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Reminder message cannot be empty.' });
    }

    try {
        const customer = await Customer.findOne({ 
            _id: customerId, 
            shopId: req.user.shopId 
        });

        const shop = await Shop.findById(req.user.shopId);

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found or access denied.' });
        }
        
        if (!shop) {
            return res.status(404).json({ error: 'Shop profile not found.' });
        }

        if (!customer.phone) {
            return res.status(400).json({ error: 'Customer does not have a registered phone number.' });
        }

        // 1. Format the 'To' number: Ensure it has the '+' prefix for Twilio
        const formattedTo = customer.phone.startsWith('+') ? customer.phone : `+${customer.phone}`;

        // 2. Use Twilio platform numbers from .env
        // For WhatsApp Sandbox, this is usually 'whatsapp:+14155238886'
        const waFrom = `whatsapp:${process.env.TWILIO_WA_NUMBER || '+14155238886'}`;
        const smsFrom = process.env.TWILIO_PHONE_NUMBER;

        // 3. Optional: Add Shop Name to the message so the customer knows who is messaging
        const finalMessage = `From ${shop.name}: ${message}`;

        // Send both messages simultaneously
        const results = await Promise.allSettled([
            // WhatsApp Channel
            client.messages.create({
                from: waFrom,
                to: `whatsapp:${formattedTo}`,
                body: finalMessage
            }),
            // SMS Channel
            client.messages.create({
                from: smsFrom,
                to: formattedTo,
                body: finalMessage
            })
        ]);

        const waStatus = results[0].status === 'fulfilled' ? 'Success' : 'Failed';
        const smsStatus = results[1].status === 'fulfilled' ? 'Success' : 'Failed';

        // Log specific errors to your server console for debugging
        results.forEach((res, index) => {
            if (res.status === 'rejected') {
                console.error(`${index === 0 ? 'WhatsApp' : 'SMS'} Error Detail:`, res.reason.message);
            }
        });

        // Log the event in transaction history
        await KhataTransaction.create({
            shopId: req.user.shopId,
            customerId: customer._id,
            amount: 0,
            type: 'reminder_sent',
            details: `Reminder sent. WhatsApp: ${waStatus}, SMS: ${smsStatus}`,
        });

        res.json({ 
            success: true, 
            message: `Reminder processed for ${customer.name}`,
            delivery: { 
                whatsapp: waStatus, 
                sms: smsStatus,
                details: {
                    waError: results[0].status === 'rejected' ? results[0].reason.message : null,
                    smsError: results[1].status === 'rejected' ? results[1].reason.message : null
                }
            }
        });

    } catch (error) {
        console.error('Customer Reminder POST Error:', error);
        res.status(500).json({ error: 'Internal server error while processing reminder.' });
    }
});

module.exports = router;