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
    const { name, phone, creditLimit } = req.body;
    
    // ... (validation remains the same) ...

    try {
        const newCustomerData = {
            name: name.trim(),
            phone: phone ? String(phone).trim() : '',
            creditLimit: Math.max(0, parseFloat(creditLimit) || 0), 
            outstandingCredit: 0,
            shopId: req.user.shopId, // CRITICAL: SCOPE THE NEW CUSTOMER
        };

        const customer = await Customer.create(newCustomerData);
        
        res.json({ message: 'Customer added successfully', customer });
    } catch (error) {
        console.error('Customer POST Error:', error);
        res.status(500).json({ error: 'Failed to add new customer.' });
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