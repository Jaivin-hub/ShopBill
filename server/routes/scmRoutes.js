const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');

// Import your notification helpers
const { emitAlert, resolveLowStockAlert } = require('./notificationRoutes'); 

// Placeholder for Models (Ensure these paths match your project structure)
const Supplier = require('../models/Supplier'); 
const Purchase = require('../models/Purchase');

const router = express.Router();

/**
 * HELPER: checkAndNotifyLowStock (Shared logic with Inventory)
 * Resolves alerts if stock is added via purchase.
 */
const checkAndNotifyLowStock = async (req, item) => {
    if (!item) return;
    const currentQty = Number(item.quantity);
    const reorderLevel = Number(item.reorderLevel) || 5;
    const shopIdString = item.shopId.toString();

    if (currentQty <= reorderLevel) {
        try {
            await emitAlert(req, shopIdString, 'inventory_low', {
                _id: item._id,
                name: item.name,
                quantity: currentQty
            });
        } catch (err) { console.error("❌ Alert Error:", err); }
    } else {
        try {
            await resolveLowStockAlert(req, shopIdString, item._id);
        } catch (err) { console.error("❌ Resolution Error:", err); }
    }
};

// --- SUPPLIER ROUTES ---

// 1. Get all suppliers for the shop
router.get('/suppliers', protect, async (req, res) => {
    try {
        const suppliers = await Supplier.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch suppliers.' });
    }
});

// 2. Add a new supplier
router.post('/suppliers', protect, async (req, res) => {
    try {
        const supplier = await Supplier.create({
            ...req.body,
            shopId: req.user.shopId
        });
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add supplier.' });
    }
});

// --- PURCHASE / PROCUREMENT ROUTES ---

// 3. Get purchase history
router.get('/purchases', protect, async (req, res) => {
    try {
        const history = await Purchase.find({ shopId: req.user.shopId })
            .populate('productId', 'name')
            .populate('supplierId', 'name')
            .sort({ date: -1, createdAt: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch purchase history.' });
    }
});

// 4. Record a Purchase (CORE LOGIC)
// This records the invoice AND updates the inventory stock in one flow.
router.post('/purchases', protect, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { productId, supplierId, quantity, purchasePrice, invoiceNumber, date } = req.body;
        const shopId = req.user.shopId;

        // 1. Create Purchase Record
        const purchase = await Purchase.create([{
            shopId,
            productId,
            supplierId,
            quantity: Number(quantity),
            purchasePrice: Number(purchasePrice),
            invoiceNumber,
            date: date || new Date()
        }], { session });

        // 2. Increment Inventory Stock
        const updatedItem = await Inventory.findOneAndUpdate(
            { _id: productId, shopId },
            { $inc: { quantity: Number(quantity) } },
            { new: true, session }
        );

        if (!updatedItem) {
            throw new Error('Product not found in inventory.');
        }

        await session.commitTransaction();
        session.endSession();

        // 3. Check if this replenishment resolves a "Low Stock" alert
        await checkAndNotifyLowStock(req, updatedItem);

        res.status(201).json({
            message: 'Purchase recorded and stock updated.',
            purchase: purchase[0],
            newQuantity: updatedItem.quantity
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: error.message || 'Failed to record purchase.' });
    }
});

module.exports = router;