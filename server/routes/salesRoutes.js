// routes/salesRouter.js

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');

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
    const { totalAmount, paymentMethod, customerId, items } = req.body; 
    
    // ... (Validation and paymentMethod normalization logic remains the same) ...
    
    const saleCustomerId = (customerId && isValidObjectId(customerId)) ? customerId : null;
    let schemaPaymentMethod = paymentMethod;
    // ... (rest of normalization) ...
    
    try {
        // --- 1. Stock Check & Validation ---
        if (items && items.length > 0) {
            for (const item of items) {
                // SCOPED FIND: Check inventory item exists and belongs to the shop
                const inventoryItem = await Inventory.findOne({ _id: item.itemId, shopId: req.user.shopId }); 
                
                if (!inventoryItem) {
                    throw new Error(`Validation failed: Inventory item ID ${item.itemId} not found for this shop.`);
                }
                // ... (quantity check remains the same) ...
            }
        }
        
        // --- 2. Create the new sale record ---
        const newSale = await Sale.create({
            totalAmount,
            paymentMethod: schemaPaymentMethod,
            customerId: saleCustomerId, 
            items: items || [], 
            shopId: req.user.shopId, // CRITICAL: SCOPE THE SALE TO THE SHOP
        });

        // --- 3. Update Inventory ---
        if (items && items.length > 0) {
             const inventoryUpdates = items.map(item =>
                // SCOPED UPDATE: Only update inventory items belonging to the shop
                Inventory.findOneAndUpdate(
                    { _id: item.itemId, shopId: req.user.shopId }, 
                    { $inc: { quantity: -item.quantity } }, 
                    { new: true } 
                )
            );
            await Promise.all(inventoryUpdates);
        }

        // --- 4. Update Credit ---
        if (schemaPaymentMethod === 'Credit' && saleCustomerId) {
            // SCOPED UPDATE: Only update customer credit if the customer belongs to the shop
            const updatedCustomer = await Customer.findOneAndUpdate(
                { _id: saleCustomerId, shopId: req.user.shopId },
                { $inc: { outstandingCredit: totalAmount } },
                { new: true } 
            );

            if (!updatedCustomer) {
                 throw new Error(`Credit error: Customer ID ${saleCustomerId} not found or does not belong to this shop.`);
            }
        }

        res.json({ message: 'Sale recorded and inventory updated.', newSale });

    } catch (error) {
        console.error('Sale POST Error:', error.message);
        const status = error.message.includes('Validation failed') || error.message.includes('Credit error') ? 400 : 500;
        res.status(status).json({ error: error.message || 'Failed to record sale.' });
    }
});

module.exports = router;