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
    const storeIdString = item.storeId.toString();

    // 1. Resolve any existing 'Low Stock' alert if quantity is now above threshold
    if (currentQty > reorderLevel) {
        try {
            await resolveLowStockAlert(req, storeIdString, item._id);
        } catch (err) { console.error("❌ Resolution Error:", err); }
    }

    // 2. Send a Success notification for the replenishment
    try {
        await emitAlert(req, storeIdString, 'success', {
            message: `Purchased ${quantityPurchased} units of ${item.name}. (New Stock: ${currentQty})`,
            _id: item._id
        });
    } catch (err) { console.error("❌ Success Notification Error:", err); }
};

// --- SUPPLIER ROUTES ---
router.get('/suppliers', protect, async (req, res) => {
    try {
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const suppliers = await Supplier.find({ storeId: req.user.storeId })
            .select('name contactPerson phone email gstin address storeId createdAt')
            .lean()
            .sort({ createdAt: -1 });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch suppliers.' });
    }
});

router.post('/suppliers', protect, async (req, res) => {
    try {
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const supplier = await Supplier.create({
            ...req.body,
            storeId: req.user.storeId
        });
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add supplier.' });
    }
});

router.put('/suppliers/:id', protect, async (req, res) => {
    try {
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const supplier = await Supplier.findOneAndUpdate(
            { _id: req.params.id, storeId: req.user.storeId },
            { ...req.body },
            { new: true, runValidators: true }
        );
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found.' });
        }
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update supplier.' });
    }
});

// --- PURCHASE / PROCUREMENT ROUTES ---
router.get('/purchases', protect, async (req, res) => {
    try {
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const history = await Purchase.find({ storeId: req.user.storeId })
            .select('productId supplierId quantity purchasePrice invoiceNumber date notes storeId createdAt')
            .populate('productId', 'name hsn')
            .populate('supplierId', 'name')
            .lean()
            .sort({ date: -1, createdAt: -1 })
            .limit(100); // Limit to last 100 purchases for performance
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
        if (!req.user.storeId) {
            throw new Error('No active outlet selected. Please select an outlet first.');
        }
        const { productId, supplierId, quantity, purchasePrice, invoiceNumber, date } = req.body;
        const storeId = req.user.storeId;
        const numQty = Number(quantity);

        // 1. Create Purchase Record
        const purchase = await Purchase.create([{
            storeId,
            productId,
            supplierId,
            quantity: numQty,
            purchasePrice: Number(purchasePrice),
            invoiceNumber,
            date: date || new Date()
        }], { session });

        // 2. Increment Inventory Stock
        const updatedItem = await Inventory.findOneAndUpdate(
            { _id: productId, storeId },
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