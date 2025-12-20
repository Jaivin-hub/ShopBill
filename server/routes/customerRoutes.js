const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Customer = require('../models/Customer');
const KhataTransaction = require('../models/KhataTransaction'); // NEW IMPORT
const mongoose = require('mongoose'); // NEW IMPORT

const router = express.Router();

router.get('/', protect, async (req, res) => {
    try {
        // SCOPED QUERY: ONLY fetch customers for the user's shopId
        const customers = await Customer.find({ shopId: req.user.shopId });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customers.' });
    }
});

// NEW ROUTE: Fetch transaction history for a customer
router.get('/:id/history', protect, async (req, res) => {
    const customerId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ error: 'Invalid Customer ID.' });
    }
    
    try {
        // Find transactions for the customer, scoped to the user's shop
        // Sort by timestamp descending (newest first)
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


router.post('/', protect, async (req, res) => {
    // UPDATED: Destructure all fields
    const { name, phone, creditLimit, initialDue } = req.body;
    
    // --- Initial Validation ---
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Customer name is required.' });
    }
    
    // -----------------------------------------------------------------------------------------
    // --- Validation and Parsing for initialDue and creditLimit (MODIFIED FOR OPTIONAL initialDue) ---
    // -----------------------------------------------------------------------------------------
    
    // Safely default initialDue to 0 if missing/null/undefined/empty string.
    // Then parse it as a number.
    const rawInitialDue = initialDue === undefined || initialDue === null || initialDue === '' 
                          ? 0 : initialDue;
    
    const parsedInitialDue = parseFloat(rawInitialDue);

    if (isNaN(parsedInitialDue) || parsedInitialDue < 0) {
        return res.status(400).json({ error: 'Initial Due must be a non-negative number.', field: 'initialDue' });
    }
    
    // Ensure creditLimit is treated as a number. Safely default to 0.
    const parsedCreditLimit = Math.max(0, parseFloat(creditLimit) || 0);

    // ----------------------------------------------------
    // --- UNIQUE PHONE NUMBER VALIDATION ---
    // ----------------------------------------------------
    const trimmedPhone = phone ? String(phone).trim() : '';

    if (trimmedPhone) {
        // We only check for duplicates if a phone number is actually provided.
        const existingCustomer = await Customer.findOne({ 
            phone: trimmedPhone, 
            shopId: req.user.shopId  // SCOPED TO CURRENT SHOP
        });

        if (existingCustomer) {
            return res.status(400).json({ 
                error: `Phone number is already associated with customer: ${existingCustomer.name}`,
                field: 'phone',
                existingCustomerName: existingCustomer.name
            });
        }
    }
    // ----------------------------------------------------
    
    try {
        const newCustomerData = {
            name: name.trim(),
            phone: trimmedPhone, 
            creditLimit: parsedCreditLimit, 
            // Use the validated and parsed initialDue value (which is 0 if optional/empty)
            outstandingCredit: parsedInitialDue, 
            shopId: req.user.shopId,
        };
        
        const customer = await Customer.create(newCustomerData);

        // --- NEW: LOG INITIAL DUE TRANSACTION ---
        if (parsedInitialDue > 0) {
            await KhataTransaction.create({
                shopId: req.user.shopId,
                customerId: customer._id,
                amount: parsedInitialDue,
                type: 'initial_due',
                details: 'Starting balance recorded upon customer creation.',
                // No referenceId needed for initial balance
            });
        }
        // --- END NEW LOGIC ---
        
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

router.put('/:customerId/credit', protect, async (req, res) => {
    const { customerId } = req.params;
    // Client sends amountChange (negative), paymentAmount (positive), and type ('payment_received')
    const { amountChange, paymentAmount, type } = req.body; 

    // Basic validation
    if (typeof amountChange !== 'number' || isNaN(amountChange)) {
        return res.status(400).json({ error: 'Invalid amountChange provided.' });
    }
    
    // Ensure this is a payment (reducing credit)
    if (amountChange >= 0) {
         return res.status(400).json({ error: 'Credit update must be negative for payments.' });
    }

    try {
        // SCOPED UPDATE: Only update if customerId AND shopId match
        let updatedCustomer = await Customer.findOneAndUpdate(
            { _id: customerId, shopId: req.user.shopId },
            { $inc: { outstandingCredit: amountChange } },
            { new: true } 
        );
        
        if (!updatedCustomer) {
            return res.status(404).json({ error: 'Customer not found or does not belong to this shop.' });
        }
        
        // --- NEW: LOG PAYMENT RECEIVED TRANSACTION (Using the positive paymentAmount) ---
        // Log the payment before checking for credit being < 0 (to ensure the payment attempt is recorded)
        await KhataTransaction.create({
            shopId: req.user.shopId,
            customerId: updatedCustomer._id,
            amount: paymentAmount || Math.abs(amountChange), // Use paymentAmount if provided, otherwise derived
            type: type || 'payment_received',
            details: `Payment recorded: ₹${(paymentAmount || Math.abs(amountChange)).toFixed(0)}`,
            // No referenceId needed for payments
        });
        // --- END NEW LOGIC ---


        // Prevent outstanding credit from going below zero 
        if (updatedCustomer.outstandingCredit < 0) {
            // FIX: Use the fully scoped query here to maintain security practice
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

module.exports = router;
