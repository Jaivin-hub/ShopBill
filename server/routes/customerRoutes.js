const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Customer = require('../models/Customer');
const KhataTransaction = require('../models/KhataTransaction');
const Staff = require('../models/Staff');
const Shop = require('../models/User'); // Ensure this matches your model file name
const mongoose = require('mongoose');
const twilio = require('twilio');
const { emitAlert } = require('./notificationRoutes');

/**
 * Helper function to get actor name with role for notifications
 */
const getActorNameWithRole = async (req) => {
    let actorName = req.user.name || req.user.email;
    let actorRole = req.user.role || 'User';
    
    // For owner: show only role, not email/name
    if (req.user.role === 'owner') {
        return '(Owner)';
    }
    
    // For staff (Manager/Cashier), get name from Staff model and use their role
    if (req.user.role === 'Manager' || req.user.role === 'Cashier') {
        const staffRecord = await Staff.findOne({ userId: req.user._id });
        if (staffRecord) {
            actorName = staffRecord.name || req.user.name || req.user.email;
            actorRole = staffRecord.role || req.user.role;
        }
    }
    
    const roleDisplay = actorRole === 'Manager' ? 'Manager' : actorRole === 'Cashier' ? 'Cashier' : actorRole;
    return `${actorName} (${roleDisplay})`;
};

// Initialize Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const router = express.Router();

// --- GET ALL CUSTOMERS --- (Optimized with lean and projection)
router.get('/', protect, async (req, res) => {
    try {
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const customers = await Customer.find({ storeId: req.user.storeId })
            .select('name phone outstandingCredit creditLimit storeId createdAt updatedAt')
            .lean()
            .sort({ name: 1 });
        res.json(customers);
    } catch (error) {
        console.error('Customer fetch error:', error);
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
            storeId: req.user.storeId
        })
        .select('amount type details timestamp createdAt')
        .lean()
        .sort({ timestamp: -1 })
        .limit(100); // Limit to last 100 transactions for performance

        res.json(transactions);
    } catch (error) {
        console.error('Customer History GET Error:', error);
        res.status(500).json({ error: 'Failed to fetch customer history.' });
    }
});

// --- CREATE CUSTOMER ---
router.post('/', protect, async (req, res) => {
    const { name, phone, creditLimit, initialDue } = req.body;

    if (!req.user.storeId) {
        return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
    }
    
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Customer name is required.', field: 'name' });
    }

    // Phone is mandatory – Indian standard: exactly 10 digits, starting with 6, 7, 8, or 9
    const trimmedPhone = phone != null ? String(phone).trim() : '';
    if (!trimmedPhone) {
        return res.status(400).json({ error: 'Phone number is required.', field: 'phone' });
    }
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
        return res.status(400).json({ error: 'Phone number must be exactly 10 digits.', field: 'phone' });
    }
    if (!/^[6-9]/.test(digitsOnly)) {
        return res.status(400).json({ error: 'Phone number must start with 6, 7, 8, or 9.', field: 'phone' });
    }

    const rawInitialDue = initialDue === undefined || initialDue === null || initialDue === ''
                          ? 0 : initialDue;

    const parsedInitialDue = parseFloat(rawInitialDue);

    if (isNaN(parsedInitialDue) || parsedInitialDue < 0) {
        return res.status(400).json({ error: 'Initial Due must be a non-negative number.', field: 'initialDue' });
    }

    const parsedCreditLimit = Math.max(0, parseFloat(creditLimit) || 0);

    const existingCustomer = await Customer.findOne({
        phone: digitsOnly,
        storeId: req.user.storeId
    });

    if (existingCustomer) {
        return res.status(400).json({
            error: `Phone number is already associated with customer: ${existingCustomer.name}`,
            field: 'phone',
            existingCustomerName: existingCustomer.name
        });
    }
    
    try {
        const newCustomerData = {
            name: name.trim(),
            phone: digitsOnly,
            creditLimit: parsedCreditLimit,
            outstandingCredit: parsedInitialDue,
            storeId: req.user.storeId,
        };
        
        const customer = await Customer.create(newCustomerData);

        if (parsedInitialDue > 0) {
            await KhataTransaction.create({
                storeId: req.user.storeId,
                customerId: customer._id,
                amount: parsedInitialDue,
                type: 'initial_due',
                details: 'Starting balance recorded upon customer creation.',
            });
        }

        // Notify owner and staff (excluding actor): cashier → owner+manager; manager → owner+cashier; owner → manager+cashier
        try {
            const actorLabel = await getActorNameWithRole(req);
            await emitAlert(req, req.user.storeId, 'customer_added', {
                message: `Customer "${customer.name}" was added to ledger by ${actorLabel}.`,
                customerId: customer._id,
            });
        } catch (notifErr) {
            console.error('Error sending customer_added notification:', notifErr);
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
            { _id: customerId, storeId: req.user.storeId },
            { $inc: { outstandingCredit: amountChange } },
            { new: true } 
        );
        
        if (!updatedCustomer) {
            return res.status(404).json({ error: 'Customer not found or does not belong to this shop.' });
        }
        
        const transaction = await KhataTransaction.create({
            storeId: req.user.storeId,
            customerId: updatedCustomer._id,
            amount: paymentAmount || Math.abs(amountChange),
            type: type || 'payment_received',
            details: `Payment recorded: ₹${(paymentAmount || Math.abs(amountChange)).toFixed(0)}`,
        });

        // Send notification for payment received
        try {
            const actorNameWithRole = await getActorNameWithRole(req);
            await emitAlert(req, req.user.storeId, 'ledger_payment', {
                customerId: updatedCustomer._id,
                customerName: updatedCustomer.name,
                amount: paymentAmount || Math.abs(amountChange),
                transactionId: transaction._id,
                message: `Payment of ₹${(paymentAmount || Math.abs(amountChange)).toFixed(2)} received from ${updatedCustomer.name} by ${actorNameWithRole}`
            });
        } catch (err) {
            console.error("❌ Error sending payment notification:", err);
        }

        if (updatedCustomer.outstandingCredit < 0) {
             updatedCustomer = await Customer.findOneAndUpdate(
                { _id: customerId, storeId: req.user.storeId }, 
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

// --- UPDATE CUSTOMER (name, phone, creditLimit) ---
router.put('/:customerId', protect, async (req, res) => {
    const { customerId } = req.params;
    const { name, phone, creditLimit } = req.body;

    if (!req.user.storeId) {
        return res.status(400).json({ error: 'No active outlet selected.' });
    }
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ error: 'Invalid Customer ID.' });
    }

    const updates = {};
    if (name !== undefined) {
        const trimmed = (name || '').trim();
        if (!trimmed.length) return res.status(400).json({ error: 'Customer name is required.', field: 'name' });
        updates.name = trimmed;
    }
    if (phone !== undefined) {
        const trimmed = String(phone || '').trim().replace(/\D/g, '');
        if (trimmed.length < 10) return res.status(400).json({ error: 'Valid 10-digit phone is required.', field: 'phone' });
        const existing = await Customer.findOne({ storeId: req.user.storeId, phone: trimmed, _id: { $ne: customerId } });
        if (existing) {
            return res.status(400).json({ error: `Phone already used by ${existing.name}`, field: 'phone' });
        }
        updates.phone = trimmed;
    }
    if (creditLimit !== undefined) {
        const num = parseFloat(creditLimit);
        if (isNaN(num) || num < 0) return res.status(400).json({ error: 'Credit limit must be a non-negative number.', field: 'creditLimit' });
        updates.creditLimit = num;
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update (name, phone, or creditLimit).' });
    }

    try {
        const updated = await Customer.findOneAndUpdate(
            { _id: customerId, storeId: req.user.storeId },
            { $set: updates },
            { new: true }
        ).select('name phone outstandingCredit creditLimit storeId createdAt updatedAt');
        if (!updated) {
            return res.status(404).json({ error: 'Customer not found or does not belong to this shop.' });
        }
        res.json({ message: 'Customer updated successfully', customer: updated });
    } catch (error) {
        console.error('Customer PUT Error:', error);
        res.status(500).json({ error: 'Failed to update customer.' });
    }
});

// --- SEND REMINDER (WHATSAPP + SMS) ---
// MAKE SURE THIS IS AT THE TOP OF YOUR FILE:
// const User = require('../models/User'); 

router.post('/:id/remind', protect, async (req, res) => {
    const customerId = req.params.id;
    const { message, type } = req.body; // 'whatsapp' or 'sms' (optional selection)

    if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Reminder message cannot be empty.' });
    }

    try {
        // 1. Lookups
        const customer = await Customer.findOne({ _id: customerId, storeId: req.user.storeId });
        const Store = require('../models/Store');
        const store = await Store.findById(req.user.storeId);

        if (!customer) return res.status(404).json({ error: 'Customer not found.' });
        if (!customer.phone) return res.status(400).json({ error: 'Customer phone missing.' });

        // 2. PERSISTENT COOLDOWN CHECK (DB Level)
        // Check if a reminder was sent in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentReminder = await KhataTransaction.findOne({
            customerId: customer._id,
            type: 'reminder_sent',
            createdAt: { $gte: fiveMinutesAgo }
        });

        if (recentReminder) {
            return res.status(429).json({ 
                error: 'Please wait before sending another reminder to this customer.' 
            });
        }

        // 3. Phone Formatting
        let cleanPhone = customer.phone.trim().replace(/[\s\-\(\)]/g, '');
        let formattedTo = cleanPhone.startsWith('+') ? cleanPhone : 
                         (cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`);

        // 4. Execution
        const waFrom = `whatsapp:${process.env.TWILIO_WA_NUMBER || '+14155238886'}`;
        const smsFrom = process.env.TWILIO_PHONE_NUMBER;
        const finalMessage = `From ${store?.name || 'Our Store'}: ${message}`;

        const results = await Promise.allSettled([
            client.messages.create({
                from: waFrom,
                to: `whatsapp:${formattedTo}`,
                contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e', 
                contentVariables: JSON.stringify({
                    1: new Date().toLocaleDateString('en-IN'),
                    2: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                })
            }),
            client.messages.create({
                from: smsFrom,
                to: formattedTo,
                body: finalMessage
            })
        ]);

        const waStatus = results[0].status === 'fulfilled' ? 'Sent' : 'Failed';
        const smsStatus = results[1].status === 'fulfilled' ? 'Sent' : 'Failed';

        // 5. SAVE TO DATABASE (The "Logging" step)
        // We record this as a 0-amount transaction in the Ledger
        await KhataTransaction.create({
            storeId: req.user.storeId,
            customerId: customer._id,
            amount: 0, // Reminders don't change the balance
            type: 'reminder_sent', 
            details: `Reminder Multi-Channel: WhatsApp (${waStatus}), SMS (${smsStatus})`,
            timestamp: new Date()
        });

        res.json({ 
            success: true, 
            delivery: { whatsapp: waStatus, sms: smsStatus } 
        });

    } catch (error) {
        console.error('REMIND ROUTE ERROR:', error);
        res.status(500).json({ error: 'System failed to send reminder.' });
    }
});

module.exports = router;