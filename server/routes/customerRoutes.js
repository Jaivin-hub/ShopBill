const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Customer = require('../models/Customer');

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

router.post('/', protect, async (req, res) => {
    // UPDATED: Destructure the new field, initialDue
    const { name, phone, creditLimit, initialDue } = req.body;
    console.log('req.body',req.body)
    console.log('req.user',req.user)
    
    // --- Initial Validation ---
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Customer name is required.' });
    }
    
    // --- Validation and Parsing for initialDue ---
    const parsedInitialDue = parseFloat(initialDue) || 0;
    if (isNaN(parsedInitialDue) || parsedInitialDue < 0) {
        return res.status(400).json({ error: 'Initial Due must be a non-negative number.', field: 'initialDue' });
    }
    // ----------------------------------------------------
    
    
    // ----------------------------------------------------
    // --- UNIQUE PHONE NUMBER VALIDATION (UNCHANGED) ---
    // ----------------------------------------------------
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
    // ----------------------------------------------------

    try {
        const newCustomerData = {
            name: name.trim(),
            phone: trimmedPhone, 
            creditLimit: Math.max(0, parseFloat(creditLimit) || 0), 
            // CRUCIAL UPDATE: Use the validated and parsed initialDue value
            outstandingCredit: parsedInitialDue, 
            shopId: req.user.shopId,
        };
        console.log('newCustomerData',newCustomerData)
        
        const customer = await Customer.create(newCustomerData);
        
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
    const { amountChange } = req.body;

    // ... (validation remains the same) ...

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