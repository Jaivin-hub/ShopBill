const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
// UPDATED: Import resolveLowStockAlert along with emitAlert
const { emitAlert, resolveLowStockAlert } = require('./notificationRoutes'); 

const router = express.Router();

/**
 * HELPER: checkAndNotifyLowStock
 * Handles both alerting for low stock AND resolving alerts when stock is replenished.
 * Now supports variants - checks each variant's stock level.
 */
const checkAndNotifyLowStock = async (req, item) => {
    if (!item) return;

    const storeIdString = item.storeId.toString();
    
    // Check if product has variants
    if (item.variants && item.variants.length > 0) {
        // Check each variant for low stock
        for (const variant of item.variants) {
            const variantQty = Number(variant.quantity) || 0;
            const variantReorderLevel = variant.reorderLevel !== null && variant.reorderLevel !== undefined 
                ? Number(variant.reorderLevel) 
                : Number(item.reorderLevel) || 5;

            if (variantQty <= variantReorderLevel) {
                try {
                    await emitAlert(req, storeIdString, 'inventory_low', {
                        _id: item._id,
                        name: `${item.name} - ${variant.label}`,
                        quantity: variantQty,
                        variantId: variant._id
                    });
                    console.log(`📡 [Low Stock Alert] ${item.name} - ${variant.label}: ${variantQty}`);
                } catch (err) {
                    console.error("❌ Error triggering alert:", err);
                }
            } else {
                // Resolve alert if stock is replenished
                try {
                    await resolveLowStockAlert(req, storeIdString, item._id);
                } catch (err) {
                    console.error("❌ Error resolving notification:", err);
                }
            }
        }
    } else {
        // Original logic for products without variants
        const currentQty = Number(item.quantity) || 0;
        const reorderLevel = Number(item.reorderLevel) || 5;

        if (currentQty <= reorderLevel) {
            // --- CASE 1: STOCK IS LOW ---
            try {
                await emitAlert(req, storeIdString, 'inventory_low', {
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
                await resolveLowStockAlert(req, storeIdString, item._id);

                // 2. (Optional) Only send a "Success" notification if this was an update or bulk add
                // We don't want to spam "Success" during every single sale interaction
                if (req.method === 'PUT' || req.originalUrl.includes('/bulk')) {
                    await emitAlert(req, storeIdString, 'success', {
                        message: `Stock replenished for ${item.name} (Now: ${currentQty})`,
                        _id: item._id
                    });
                }
            } catch (err) {
                console.error("❌ Error resolving notification:", err);
            }
        }
    }
};

// 1. Get Inventory (Scoped to Shop)
router.get('/', protect, async (req, res) => {
    try {
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const inventory = await Inventory.find({ storeId: req.user.storeId });
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory.' });
    }
});

// 2. POST New Inventory Item
router.post('/', protect, async (req, res) => {
    try {
        // Clean the request body
        const cleanedData = { ...req.body };
        
        // Remove _id from variants (frontend React keys)
        if (cleanedData.variants && Array.isArray(cleanedData.variants)) {
            cleanedData.variants = cleanedData.variants.map(v => {
                const cleaned = { ...v };
                delete cleaned._id; // Remove React key _id
                return cleaned;
            });
        }
        
        // Convert empty strings to null/undefined for price and quantity when variants exist
        if (cleanedData.variants && cleanedData.variants.length > 0) {
            if (cleanedData.price === '' || cleanedData.price === null || cleanedData.price === undefined) {
                cleanedData.price = undefined; // Let schema default handle it
            } else {
                cleanedData.price = parseFloat(cleanedData.price) || undefined;
            }
            if (cleanedData.quantity === '' || cleanedData.quantity === null || cleanedData.quantity === undefined) {
                cleanedData.quantity = undefined; // Let schema default handle it
            } else {
                cleanedData.quantity = parseInt(cleanedData.quantity) || undefined;
            }
        } else {
            // Ensure price and quantity are numbers when no variants
            cleanedData.price = parseFloat(cleanedData.price) || 0;
            cleanedData.quantity = parseInt(cleanedData.quantity) || 0;
        }
        
        const item = await Inventory.create({ 
            ...cleanedData, 
            storeId: req.user.storeId 
        });
        await checkAndNotifyLowStock(req, item);
        res.json({ message: 'Item added successfully', item });
    } catch (error) {
        console.error('Add inventory item error:', error);
        res.status(500).json({ error: error.message || 'Failed to add item.' });
    }
});

// 3. DELETE Inventory Item
router.delete('/:id', protect, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Inventory.findOneAndDelete({ _id: id, storeId: req.user.storeId });
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
        // Clean the request body
        const cleanedData = { ...req.body };
        
        // Remove _id from variants (frontend React keys)
        if (cleanedData.variants && Array.isArray(cleanedData.variants)) {
            cleanedData.variants = cleanedData.variants.map(v => {
                const cleaned = { ...v };
                delete cleaned._id; // Remove React key _id
                return cleaned;
            });
        }
        
        // Convert empty strings to null/undefined for price and quantity when variants exist
        if (cleanedData.variants && cleanedData.variants.length > 0) {
            if (cleanedData.price === '' || cleanedData.price === null || cleanedData.price === undefined) {
                cleanedData.price = undefined; // Let schema default handle it
            } else {
                cleanedData.price = parseFloat(cleanedData.price) || undefined;
            }
            if (cleanedData.quantity === '' || cleanedData.quantity === null || cleanedData.quantity === undefined) {
                cleanedData.quantity = undefined; // Let schema default handle it
            } else {
                cleanedData.quantity = parseInt(cleanedData.quantity) || undefined;
            }
        } else {
            // Ensure price and quantity are numbers when no variants
            if (cleanedData.price !== undefined) {
                cleanedData.price = parseFloat(cleanedData.price) || 0;
            }
            if (cleanedData.quantity !== undefined) {
                cleanedData.quantity = parseInt(cleanedData.quantity) || 0;
            }
        }
        
        const updatedItem = await Inventory.findOneAndUpdate(
            { _id: id, storeId: req.user.storeId }, 
            { $set: cleanedData }, 
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
        console.error('Update inventory item error:', error);
        res.status(500).json({ error: error.message || 'Failed to update.' });
    }
});

// 5. POST Bulk Upload
router.post('/bulk', protect, async (req, res) => {
    const items = req.body; 
    const storeId = req.user.storeId;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Expected an array.' });
    }

    try {
        const cleanedItems = items.map(item => ({
            ...item,
            storeId: storeId,
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