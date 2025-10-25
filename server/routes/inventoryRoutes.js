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
    const items = req.body; 
    const shopId = req.user.shopId;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Expected an array of items for bulk upload.' });
    }

    try {
        // --- 1. Pre-process and clean the incoming items ---
        const cleanedItems = items.map(item => ({
            ...item,
            shopId: shopId,
            // Ensure mandatory fields are present and safe defaults are applied
            name: item.name ? String(item.name).trim() : undefined,
            // We use || 0 or || 5 for defaults if the data is missing or invalid
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity) || 0,
            reorderLevel: parseInt(item.reorderLevel) || 5,
            hsn: item.hsn ? String(item.hsn).trim() : ''
        })).filter(item => item.name); // Filter out items with no name

        if (cleanedItems.length === 0) {
             return res.status(400).json({ error: 'No valid items found to insert.' });
        }
        
        // --- 2. Identify all names and HSNs to check (for existing duplicates) ---
        // Use case-insensitive check by querying with $in and converting to lowercase for the Set
        const namesToCheck = cleanedItems.map(item => item.name).filter(Boolean);
        const hsnsToCheck = cleanedItems.map(item => item.hsn).filter(h => h.length > 0);
        
        // --- 3. Query existing items based on name OR HSN (scoped to shopId) ---
        const existingItems = await Inventory.find({
            shopId: shopId,
            $or: [
                { name: { $in: namesToCheck } },
                { hsn: { $in: hsnsToCheck } }
            ]
        }).select('name hsn');

        // --- 4. Create sets of existing identifiers for quick lookup (case-insensitive) ---
        const existingNames = new Set(existingItems.map(item => item.name.toLowerCase()));
        const existingHsns = new Set(existingItems.map(item => item.hsn).filter(h => h && h.length > 0).map(h => h.toLowerCase()));

        // --- 5. Filter duplicates and prepare final list for insertion ---
        const itemsToInsert = [];
        const skippedItems = [];

        cleanedItems.forEach(item => {
            const isNameDuplicate = existingNames.has(item.name.toLowerCase());
            const isHsnDuplicate = item.hsn && existingHsns.has(item.hsn.toLowerCase());
            
            if (isNameDuplicate || isHsnDuplicate) {
                skippedItems.push({ 
                    item: item.name, 
                    reason: isNameDuplicate ? 'Duplicate Name' : 'Duplicate HSN', 
                    hsn: item.hsn 
                });
            } else {
                itemsToInsert.push(item);
                // IMPORTANT: Add to the sets to prevent duplicates WITHIN the bulk upload itself
                existingNames.add(item.name.toLowerCase());
                if(item.hsn) existingHsns.add(item.hsn.toLowerCase());
            }
        });

        if (itemsToInsert.length === 0) {
            return res.status(200).json({ 
                message: `No new items added. ${skippedItems.length} items skipped due to duplication.`,
                insertedCount: 0,
                skippedCount: skippedItems.length,
                skippedDetails: skippedItems
            });
        }
        
        // --- 6. Use insertMany for efficient bulk insertion of unique items ---
        const result = await Inventory.insertMany(itemsToInsert, { ordered: false }); 
        
        // --- 7. Return comprehensive response ---
        res.status(201).json({ 
            message: `${result.length} new items added successfully. ${skippedItems.length} items skipped.`,
            insertedCount: result.length,
            skippedCount: skippedItems.length,
            items: result,
            skippedDetails: skippedItems
        });

    } catch (error) {
        console.error('Inventory BULK POST Error:', error);

        // Handle specific MongoDB errors like validation failures in bulk inserts
        if (error.code === 11000) { 
             return res.status(400).json({ error: 'One or more items failed due to unique constraints or validation errors in database. Check server logs.', details: error.writeErrors });
        }

        res.status(500).json({ error: 'Failed to process bulk inventory upload.' });
    }
});

// NOTE: Other CRUD routes for Inventory would also be added here (POST, PUT, DELETE)

module.exports = router;