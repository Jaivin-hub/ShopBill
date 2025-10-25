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

// 5. POST Bulk upload
router.post('/bulk', protect, async (req, res) => {
    const items = req.body; // Expecting an array of items: [{name: '', price: 0, ...}, ...]
    const shopId = req.user.shopId;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Expected an array of items for bulk upload.' });
    }

    try {
        // Prepare items: Inject shopId and clean up extraneous fields before insert
        const itemsToInsert = items.map(item => ({
            ...item,
            shopId: shopId,
            // Ensure mandatory fields are present and safe defaults are applied
            name: item.name ? String(item.name).trim() : undefined,
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity) || 0,
            reorderLevel: parseInt(item.reorderLevel) || 5,
        })).filter(item => item.name); // Filter out items with no name (basic validation)

        if (itemsToInsert.length === 0) {
             return res.status(400).json({ error: 'No valid items found to insert.' });
        }

        // Use insertMany for efficient bulk insertion
        const result = await Inventory.insertMany(itemsToInsert, { ordered: false }); 
        
        // This will return an array of inserted documents
        res.status(201).json({ 
            message: `${result.length} items added successfully.`,
            insertedCount: result.length,
            items: result 
        });

    } catch (error) {
        console.error('Inventory BULK POST Error:', error);

        // Handle specific MongoDB errors like validation failures in bulk inserts
        if (error.code === 11000) { // Example: Duplicate key error (if unique indexes existed)
             return res.status(400).json({ error: 'One or more items failed due to data constraints (e.g., duplicate unique field or missing data).', details: error.writeErrors });
        }

        res.status(500).json({ error: 'Failed to process bulk inventory upload.' });
    }
});


// NOTE: Other CRUD routes for Inventory would also be added here (POST, PUT, DELETE)

module.exports = router;