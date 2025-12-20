const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
// UPDATED: Import resolveLowStockAlert along with emitAlert
const { emitAlert, resolveLowStockAlert } = require('./notificationRoutes'); 

const router = express.Router();

/**
 * HELPER: checkAndNotifyLowStock
 * Handles both alerting for low stock AND resolving alerts when stock is replenished.
 */
const checkAndNotifyLowStock = async (req, item) => {
    if (!item) return;

    const currentQty = Number(item.quantity);
    const reorderLevel = Number(item.reorderLevel) || 5;
    const shopIdString = item.shopId.toString();

    if (currentQty <= reorderLevel) {
        // --- CASE 1: STOCK IS LOW ---
        try {
            await emitAlert(req, shopIdString, 'inventory_low', {
                _id: item._id,
                name: item.name,
                quantity: currentQty
            });
            console.log(`📡 [Low Stock Alert] ${item.name}: ${currentQty}`);
        } catch (err) {
            console.error("❌ Error triggering alert:", err);
        }
    } else {
        // --- CASE 2: STOCK IS REPLENISHED (GOOD) ---
        try {
            // 1. Remove any existing "Low Stock" notifications for this specific item
            await resolveLowStockAlert(req, shopIdString, item._id);

            // 2. (Optional) Only send a "Success" notification if this was an update or bulk add
            // We don't want to spam "Success" during every single sale interaction
            if (req.method === 'PUT' || req.originalUrl.includes('/bulk')) {
                await emitAlert(req, shopIdString, 'success', {
                    message: `Stock replenished for ${item.name} (Now: ${currentQty})`,
                    _id: item._id
                });
            }
        } catch (err) {
            console.error("❌ Error resolving notification:", err);
        }
    }
};

// 1. Get Inventory (Scoped to Shop)
router.get('/', protect, async (req, res) => {
    try {
        const inventory = await Inventory.find({ shopId: req.user.shopId });
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory.' });
    }
});

// 2. POST New Inventory Item
router.post('/', protect, async (req, res) => {
    try {
        const item = await Inventory.create({ 
            ...req.body, 
            shopId: req.user.shopId 
        });
        await checkAndNotifyLowStock(req, item);
        res.json({ message: 'Item added successfully', item });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add item.' });
    }
});

// 3. DELETE Inventory Item
router.delete('/:id', protect, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Inventory.findOneAndDelete({ _id: id, shopId: req.user.shopId });
        if (result) res.json({ message: `Item deleted.` });
        else res.status(404).json({ error: 'Item not found.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete.' });
    }
});

// 4. PUT Update Inventory Item
router.put('/:id', protect, async (req, res) => {
    const { id } = req.params;
    try {
        const updatedItem = await Inventory.findOneAndUpdate(
            { _id: id, shopId: req.user.shopId }, 
            { $set: req.body }, 
            { new: true, runValidators: true } 
        );

        if (updatedItem) {
            // This will now clear the "Low Stock" alert if quantity was increased
            await checkAndNotifyLowStock(req, updatedItem);
            res.json({ message: 'Item updated successfully', item: updatedItem });
        } else {
            res.status(404).json({ error: 'Item not found.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update.' });
    }
});

// 5. POST Bulk Upload
router.post('/bulk', protect, async (req, res) => {
    const items = req.body; 
    const shopId = req.user.shopId;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Expected an array.' });
    }

    try {
        const cleanedItems = items.map(item => ({
            ...item,
            shopId: shopId,
            name: item.name ? String(item.name).trim() : undefined,
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity) || 0,
            reorderLevel: parseInt(item.reorderLevel) || 5,
        })).filter(item => item.name);

        const result = await Inventory.insertMany(cleanedItems, { ordered: false }); 
        
        // This will clear alerts for any items in the bulk list that have sufficient stock
        await Promise.all(result.map(item => checkAndNotifyLowStock(req, item)));

        res.status(201).json({ 
            message: `${result.length} items added successfully.`,
            insertedCount: result.length,
            items: result
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to process bulk upload.' });
    }
});

module.exports = router;