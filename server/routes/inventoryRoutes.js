const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
// We import emitAlert which handles both Database saving and Socket emitting
const { emitAlert } = require('../routes/notificationRoutes');

const router = express.Router();

/**
 * HELPER: checkAndNotifyLowStock
 * Uses the centralized notification utility to alert the shop owner.
 */
const checkAndNotifyLowStock = async (req, item) => {
    // Check if current quantity is at or below reorder level
    if (item.quantity <= (item.reorderLevel || 5)) {
        try {
            // This helper saves to DB and sends Socket event in one go
            await emitAlert(req, item.shopId, 'inventory_low', item);
            console.log(`📡 Low stock alert triggered for: ${item.name}`);
        } catch (err) {
            console.error("Error triggering low stock notification:", err);
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

        // Trigger check on new item creation
        await checkAndNotifyLowStock(req, item);

        res.json({ message: 'Item added successfully', item });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add new inventory item.' });
    }
});

// 3. DELETE Inventory Item
router.delete('/:id', protect, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Inventory.findOneAndDelete({ _id: id, shopId: req.user.shopId });
        if (result) res.json({ message: `Item ${id} deleted successfully.` });
        else res.status(404).json({ error: 'Item not found.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete inventory item.' });
    }
});

// 4. PUT Update Inventory Item (Triggers Notification if stock is reduced)
router.put('/:id', protect, async (req, res) => {
    const { id } = req.params;
    try {
        const updatedItem = await Inventory.findOneAndUpdate(
            { _id: id, shopId: req.user.shopId }, 
            { $set: req.body }, 
            { new: true, runValidators: true } 
        );

        if (updatedItem) {
            // Trigger check on update
            await checkAndNotifyLowStock(req, updatedItem);
            res.json({ message: 'Item updated successfully', item: updatedItem });
        } else {
            res.status(404).json({ error: 'Item not found.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update inventory item.' });
    }
});

// 5. POST Bulk Upload
router.post('/bulk', protect, async (req, res) => {
    const items = req.body; 
    const shopId = req.user.shopId;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Expected an array of items.' });
    }

    try {
        // Clean and prepare items
        const cleanedItems = items.map(item => ({
            ...item,
            shopId: shopId,
            name: item.name ? String(item.name).trim() : undefined,
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity) || 0,
            reorderLevel: parseInt(item.reorderLevel) || 5,
        })).filter(item => item.name);

        // Perform insertion (Note: Make sure duplication logic is handled per your schema)
        const result = await Inventory.insertMany(cleanedItems, { ordered: false }); 
        
        // Bulk check for low stock items in the newly uploaded list
        result.forEach(item => {
            checkAndNotifyLowStock(req, item);
        });

        res.status(201).json({ 
            message: `${result.length} items added successfully.`,
            insertedCount: result.length,
            items: result
        });

    } catch (error) {
        console.error('Inventory BULK POST Error:', error);
        res.status(500).json({ error: 'Failed to process bulk upload.' });
    }
});

module.exports = router;