const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');

// Import your notification helpers
const { emitAlert, resolveLowStockAlert } = require('./notificationRoutes'); 

const Supplier = require('../models/Supplier'); 
const Purchase = require('../models/Purchase');

const router = express.Router();

/**
 * HELPER: checkAndNotifyLowStock
 * Logic: If stock is now healthy, clear old alerts. 
 * Also sends a success notification for the replenishment.
 */
const handlePurchaseNotifications = async (req, item, quantityPurchased) => {
    if (!item) return;
    const currentQty = Number(item.quantity);
    const reorderLevel = Number(item.reorderLevel) || 5;
    const shopIdString = item.shopId.toString();

    // 1. Resolve any existing 'Low Stock' alert if quantity is now above threshold
    if (currentQty > reorderLevel) {
        try {
            await resolveLowStockAlert(req, shopIdString, item._id);
        } catch (err) { console.error("❌ Resolution Error:", err); }
    }

    // 2. Send a Success notification for the replenishment
    try {
        await emitAlert(req, shopIdString, 'success', {
            message: `Purchased ${quantityPurchased} units of ${item.name}. (New Stock: ${currentQty})`,
            _id: item._id
        });
    } catch (err) { console.error("❌ Success Notification Error:", err); }
};

// --- SUPPLIER ROUTES ---
router.get('/suppliers', protect, async (req, res) => {
    try {
        const suppliers = await Supplier.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch suppliers.' });
    }
});

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

/**
 * Record a Purchase
 * Updates stock AND triggers notifications.
 */
router.post('/purchases', protect, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { productId, supplierId, quantity, purchasePrice, invoiceNumber, date } = req.body;
        const shopId = req.user.shopId;
        const numQty = Number(quantity);

        // 1. Create Purchase Record
        const purchase = await Purchase.create([{
            shopId,
            productId,
            supplierId,
            quantity: numQty,
            purchasePrice: Number(purchasePrice),
            invoiceNumber,
            date: date || new Date()
        }], { session });

        // 2. Increment Inventory Stock
        const updatedItem = await Inventory.findOneAndUpdate(
            { _id: productId, shopId },
            { $inc: { quantity: numQty } },
            { new: true, session }
        );

        if (!updatedItem) {
            throw new Error('Product not found in inventory.');
        }

        await session.commitTransaction();
        session.endSession();

        // 3. TRIGGER NOTIFICATIONS
        // We pass 'numQty' to let the user know exactly how much was added in the alert.
        await handlePurchaseNotifications(req, updatedItem, numQty);

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