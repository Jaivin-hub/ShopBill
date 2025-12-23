const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory'); 
const Customer = require('../models/Customer');
const mongoose = require('mongoose');
// IMPORT the notification utility
const { emitAlert } = require('./notificationRoutes'); 

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const router = express.Router();

const resolveLowStockAlert = async (req, shopId, itemId) => {
    const io = req.app.get('socketio');
    const shopIdStr = shopId.toString();

    try {
        // 1. Remove the "inventory_low" alerts for this specific item from DB
        await Notification.deleteMany({
            shopId: shopIdStr,
            type: 'inventory_low',
            'metadata.itemId': itemId
        });

        // 2. Tell the frontend to remove this item from the notification list
        if (io) {
            io.to(shopIdStr).emit('resolve_notification', { itemId });
            console.log(`🧹 Resolved alerts for item: ${itemId}`);
        }
    } catch (error) {
        console.error("❌ Failed to resolve alerts:", error.message);
    }
};

// GET all sales for the shop (LIST VIEW)
router.get('/', protect, async (req, res) => {
    const { startDate, endDate } = req.query;
    const filter = { shopId: req.user.shopId };
    
    if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    try {
        const sales = await Sale.find(filter)
            .populate('customerId', 'name')
            .sort({ timestamp: -1 });
        res.json(sales);
    } catch (error) {
        console.error('Failed to fetch sales data:', error);
        res.status(500).json({ error: 'Failed to fetch sales data.' });
    }
});

// GET a single sale detail by ID
router.get('/:id', protect, async (req, res) => {
    const saleId = req.params.id;
    if (!isValidObjectId(saleId)) return res.status(400).json({ error: 'Invalid Sale ID.' });

    try {
        const sale = await Sale.findOne({ _id: saleId, shopId: req.user.shopId })
            .populate('items.itemId')
            .populate('customerId', 'name');

        if (!sale) return res.status(404).json({ error: 'Sale not found.' });
        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sale detail.' });
    }
});

// POST a new sale
router.post('/', protect, async (req, res) => {
    // Added forceProceed from req.body
    const { totalAmount, paymentMethod, customerId, items, amountCredited, amountPaid, forceProceed } = req.body; 
    const saleAmountCredited = parseFloat(amountCredited) || 0;
    const saleCustomerId = (customerId && isValidObjectId(customerId)) ? customerId : null;
    const shopId = req.user.shopId;

    try {
        // --- 1. Stock Check & Validation ---
        if (items && items.length > 0) {
             for (const item of items) {
                const inventoryItem = await Inventory.findOne({ _id: item.itemId, shopId }); 
                if (!inventoryItem) throw new Error(`Inventory item not found.`);
                
                // Only block if not forced
                if (inventoryItem.quantity < item.quantity && !forceProceed) {
                    throw new Error(`Not enough stock for ${inventoryItem.name}.`);
                }
            }
        }
        
        // --- 2. Customer Credit Limit Check ---
        let targetCustomer = null;
        if (saleCustomerId) {
            targetCustomer = await Customer.findOne({ _id: saleCustomerId, shopId });
            if (saleAmountCredited > 0 && targetCustomer) {
                const khataDue = targetCustomer.outstandingCredit || 0;
                const creditLimit = targetCustomer.creditLimit || Infinity;

                // Only throw error if forceProceed is false
                if (khataDue + saleAmountCredited > creditLimit && !forceProceed) {
                    // We throw a specific string that the catch block will handle
                    throw new Error(`Credit limit of ₹${creditLimit} exceeded!`);
                }
            }
        }
        
        // --- 3. Create Sale Record ---
        const newSale = await Sale.create({
            totalAmount,
            paymentMethod,
            customerId: saleCustomerId, 
            items: items || [], 
            amountPaid,
            amountCredited: saleAmountCredited,
            shopId,
        });

        // --- 4. Update Inventory ---
        let updatedInventoryDocs = [];
        if (items && items.length > 0) {
             const inventoryUpdates = items.map(item =>
                Inventory.findOneAndUpdate(
                    { _id: item.itemId, shopId }, 
                    { $inc: { quantity: -item.quantity } }, 
                    { new: true } 
                )
            );
            updatedInventoryDocs = await Promise.all(inventoryUpdates);
        }

        // --- 5. Update Customer Credit & Notify ---
        if (saleAmountCredited > 0 && saleCustomerId) { 
            const updatedCustomer = await Customer.findOneAndUpdate(
                { _id: saleCustomerId, shopId },
                { $inc: { outstandingCredit: saleAmountCredited } },
                { new: true }
            );

            if (updatedCustomer.outstandingCredit >= updatedCustomer.creditLimit) {
                await emitAlert(req, shopId, 'credit_exceeded', {
                    _id: updatedCustomer._id,
                    name: updatedCustomer.name,
                    creditLimit: updatedCustomer.creditLimit
                });
            }
        }

        // --- 6. REAL-TIME STOCK LOGIC ---
        for (const item of updatedInventoryDocs) {
            const currentQty = Number(item.quantity);
            const reorderLevel = Number(item.reorderLevel) || 5;

            if (currentQty <= reorderLevel) {
                await emitAlert(req, shopId, 'inventory_low', {
                    _id: item._id,
                    name: item.name,
                    quantity: currentQty
                });
            } else {
                await resolveLowStockAlert(req, shopId, item._id);
            }
        }

        res.status(200).json({ message: 'Sale recorded successfully.', newSale });

    } catch (error) {
        console.error('Sale POST Error:', error.message);
        
        // --- KEY CHANGE HERE ---
        // If it's a credit limit error, return 200 with the error object 
        // so the frontend modal can catch it and show the bypass button.
        if (error.message.includes('limit') || error.message.includes('exceeded')) {
            return res.status(200).json({ 
                error: error.message,
                isWarning: true,
                type: 'CREDIT_LIMIT'
            });
        }

        // For actual server crashes or other errors, keep 400/500
        const status = error.message.includes('stock') ? 400 : 500;
        res.status(status).json({ error: error.message || 'Failed to record sale.' });
    }
});

module.exports = router;