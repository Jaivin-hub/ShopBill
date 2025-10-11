const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory'); 
const Customer = require('../models/Customer');
const mongoose = require('mongoose');
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const router = express.Router();

router.get('/', protect, async (req, res) => {
    try {
        // SCOPED QUERY: ONLY fetch sales for the user's shopId
        const sales = await Sale.find({ shopId: req.user.shopId }).sort({ timestamp: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales data.' });
    }
});


router.post('/', protect, async (req, res) => {
    // Destructure all required fields, including the new payment split amounts
    const { totalAmount, paymentMethod, customerId, items, amountCredited, amountPaid } = req.body; 
    
    // VALIDATION: Ensure amountCredited is a valid number, default to 0
    const saleAmountCredited = parseFloat(amountCredited) || 0;
    
    const saleCustomerId = (customerId && isValidObjectId(customerId)) ? customerId : null;
    let schemaPaymentMethod = paymentMethod; // Assumes client sends 'UPI', 'Credit', or 'Mixed'
    
    try {
        // --- 1. Stock Check & Validation ---
        if (items && items.length > 0) {
             for (const item of items) {
                const inventoryItem = await Inventory.findOne({ _id: item.itemId, shopId: req.user.shopId }); 
                
                if (!inventoryItem) {
                    throw new Error(`Validation failed: Inventory item ID ${item.itemId} not found for this shop.`);
                }
                if (item.quantity > inventoryItem.quantity) {
                    throw new Error(`Validation failed: Not enough stock for ${inventoryItem.name}. Only ${inventoryItem.quantity} available.`);
                }
            }
        }
        
        // --- 2. Customer Credit Limit Check (Server-side defense) ---
        if (saleAmountCredited > 0 && saleCustomerId) {
            const customer = await Customer.findOne({ _id: saleCustomerId, shopId: req.user.shopId });
            
            if (!customer) {
                throw new Error(`Credit error: Customer ID ${saleCustomerId} not found or does not belong to this shop.`);
            }
            
            const khataDue = customer.outstandingCredit || 0;
            const creditLimit = customer.creditLimit || Infinity;

            if (khataDue + saleAmountCredited > creditLimit) {
                throw new Error(`Credit limit of ₹${creditLimit.toFixed(0)} exceeded! Cannot add ₹${saleAmountCredited.toFixed(2)} to Khata.`);
            }
        }
        
        // --- 3. Create the new sale record ---
        const newSale = await Sale.create({
            totalAmount,
            paymentMethod: schemaPaymentMethod,
            customerId: saleCustomerId, 
            items: items || [], 
            amountPaid: amountPaid,          // Saved for audit
            amountCredited: saleAmountCredited, // Saved for audit
            shopId: req.user.shopId, // CRITICAL: SCOPE THE SALE TO THE SHOP
        });

        // --- 4. Update Inventory ---
        if (items && items.length > 0) {
             const inventoryUpdates = items.map(item =>
                Inventory.findOneAndUpdate(
                    { _id: item.itemId, shopId: req.user.shopId }, 
                    { $inc: { quantity: -item.quantity } }, 
                    { new: true } 
                )
            );
            await Promise.all(inventoryUpdates);
        }

        // --- 5. Update Customer Credit (The Single Fix for Khata) ---
        if (saleAmountCredited > 0 && saleCustomerId) { 
            const updatedCustomer = await Customer.findOneAndUpdate(
                { _id: saleCustomerId, shopId: req.user.shopId },
                { $inc: { outstandingCredit: saleAmountCredited } }, // Uses the precise credit amount (no double counting)
                { new: true } 
            );

            if (!updatedCustomer) {
                 throw new Error(`Credit error: Customer ID ${saleCustomerId} not found or does not belong to this shop.`);
            }
        }

        res.json({ message: 'Sale recorded and inventory updated.', newSale });

    } catch (error) {
        console.error('Sale POST Error:', error.message);
        const status = error.message.includes('Validation failed') || error.message.includes('Credit limit') || error.message.includes('Credit error') ? 400 : 500;
        res.status(status).json({ error: error.message || 'Failed to record sale.' });
    }
});

module.exports = router;