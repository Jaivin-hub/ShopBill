// routes/inventoryRoutes.js

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');

const router = express.Router();

// 1. Get Inventory (Scoped)
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
    const newItem = req.body;
    
    // ... (validation remains the same) ...

    try {
        const item = await Inventory.create({ 
            ...newItem, 
            shopId: req.user.shopId // CRITICAL: SCOPE THE NEW ITEM
        });
        res.json({ message: 'Item added successfully', item });
    } catch (error) {
        console.error('Inventory POST Error:', error);
        res.status(500).json({ error: 'Failed to add new inventory item.' });
    }
});

// 3. DELETE Inventory Item
router.delete('/:id', protect, async (req, res) => {
    const { id } = req.params;

    try {
        // SCOPED DELETE: Only delete if the item ID AND shopId match
        const result = await Inventory.findOneAndDelete({ _id: id, shopId: req.user.shopId });

        if (result) {
            res.json({ message: `Item ${id} deleted successfully.` });
        } else {
            res.status(404).json({ error: 'Item not found or does not belong to this shop.' });
        }
    } catch (error) {
        console.error('Inventory DELETE Error:', error);
        res.status(500).json({ error: 'Failed to delete inventory item.' });
    }
});

// 4. PUT Update Inventory Item
router.put('/:id', protect, async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // ... (validation remains the same) ...

    try {
        // SCOPED UPDATE: Only update if the item ID AND shopId match
        const updatedItem = await Inventory.findOneAndUpdate(
            { _id: id, shopId: req.user.shopId }, 
            { $set: updateData }, 
            { new: true, runValidators: true } 
        );

        if (updatedItem) {
            res.json({ message: 'Item updated successfully', item: updatedItem });
        } else {
            res.status(404).json({ error: 'Item not found or does not belong to this shop.' });
        }
    } catch (error) {
        console.error('Inventory PUT Error:', error);
        res.status(500).json({ error: 'Failed to update inventory item.' });
    }
});

// NOTE: Other CRUD routes for Inventory would also be added here (POST, PUT, DELETE)

module.exports = router;