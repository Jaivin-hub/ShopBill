// routes/inventoryRoutes.js

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');

const router = express.Router();

// ... (Existing GET, POST single, DELETE, PUT routes remain the same) ...

// 5. POST Bulk Inventory Items (NEW ROUTE)
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

module.exports = router;