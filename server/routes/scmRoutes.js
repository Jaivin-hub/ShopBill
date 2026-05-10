const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
const Staff = require('../models/Staff');

// Import your notification helpers
const { emitAlert, resolveLowStockAlert } = require('./notificationRoutes'); 

const Supplier = require('../models/Supplier'); 
const Purchase = require('../models/Purchase');

/**
 * Helper function to get actor name with role for notifications
 */
const getActorNameWithRole = async (req) => {
    let actorName = req.user.name || req.user.email;
    let actorRole = req.user.role || 'User';
    
    // For staff (Manager/Cashier), get name from Staff model and use their role
    if (req.user.role === 'Manager' || req.user.role === 'Cashier') {
        const staffRecord = await Staff.findOne({ userId: req.user._id });
        if (staffRecord) {
            actorName = staffRecord.name || req.user.name || req.user.email;
            actorRole = staffRecord.role || req.user.role;
        }
    }
    
    // Format role for display
    const roleDisplay = actorRole === 'owner' ? 'Owner' : 
                       actorRole === 'Manager' ? 'Manager' : 
                       actorRole === 'Cashier' ? 'Cashier' : 
                       actorRole;

    // For owner, don't include name/email in notification text.
    if (roleDisplay === 'Owner') {
        return '(Owner)';
    }

    return `${actorName} (${roleDisplay})`;
};

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

router.delete('/suppliers/:id', protect, async (req, res) => {
    try {
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const deleted = await Supplier.findOneAndDelete({
            _id: req.params.id,
            storeId: req.user.storeId
        });
        if (!deleted) {
            return res.status(404).json({ error: 'Supplier not found.' });
        }
        return res.json({ message: 'Supplier deleted successfully.' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to delete supplier.' });
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
    try {
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const { productId, supplierId, quantity, purchasePrice, invoiceNumber, date } = req.body;
        const storeId = req.user.storeId;
        const numQty = Number(quantity);
        if (!Number.isFinite(numQty) || numQty < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1.' });
        }

        // No Mongo transaction: standalone MongoDB (no replica set) rejects transactions — that broke SCM purchases in production.
        const updatedItem = await Inventory.findOneAndUpdate(
            { _id: productId, storeId },
            { $inc: { quantity: numQty } },
            { new: true }
        );

        if (!updatedItem) {
            return res.status(404).json({
                error: 'Product not found in this outlet inventory. Refresh and pick a product from the current outlet.'
            });
        }

        let purchase;
        try {
            purchase = await Purchase.create({
                storeId,
                productId,
                supplierId,
                quantity: numQty,
                purchasePrice: Number(purchasePrice),
                invoiceNumber,
                date: date || new Date()
            });
        } catch (createErr) {
            await Inventory.findOneAndUpdate(
                { _id: productId, storeId },
                { $inc: { quantity: -numQty } }
            );
            throw createErr;
        }

        await handlePurchaseNotifications(req, updatedItem, numQty);

        try {
            const actorNameWithRole = await getActorNameWithRole(req);
            await emitAlert(req, storeId, 'purchase_recorded', {
                purchaseId: purchase._id,
                itemId: updatedItem._id,
                productName: updatedItem.name,
                message: `Purchase of ${numQty} units of ${updatedItem.name} recorded by ${actorNameWithRole}`
            });
        } catch (err) {
            console.error('❌ Error sending purchase notification:', err);
        }

        res.status(201).json({
            message: 'Purchase recorded and stock updated.',
            purchase,
            newQuantity: updatedItem.quantity
        });
    } catch (error) {
        console.error('SCM purchase error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to record purchase.' });
    }
});

module.exports = router;