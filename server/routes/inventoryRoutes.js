const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
const { Notification } = require('../routes/notificationRoutes'); // Import your Notification model

const router = express.Router();

// Helper function to handle low stock alerts
const checkAndNotifyLowStock = async (req, item) => {
    // Check if current quantity is at or below reorder level
    if (item.quantity <= (item.reorderLevel || 5)) {
        try {
            // 1. Save notification to Database
            const notification = await Notification.create({
                shopId: item.shopId,
                message: `Low stock alert: ${item.name} (${item.quantity} remaining)`,
                type: 'low_stock',
                metadata: { itemId: item._id },
                createdAt: new Date()
            });

            // 2. Emit via Socket.io
            const io = req.app.get('socketio');
            if (io) {
                // We emit to the specific shop's room
                io.to(item.shopId.toString()).emit('new_notification', notification);
                console.log(`📡 Socket alert sent for ${item.name} to shop ${item.shopId}`);
            }
        } catch (err) {
            console.error("Error triggerring low stock notification:", err);
        }
    }
};

// 1. Get Inventory (Scoped) - [Unchanged]
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
    try {
        const item = await Inventory.create({ 
            ...newItem, 
            shopId: req.user.shopId 
        });

        // Check if the item was added with a quantity already at low stock
        await checkAndNotifyLowStock(req, item);

        res.json({ message: 'Item added successfully', item });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add new inventory item.' });
    }
});

// 3. DELETE Inventory Item - [Unchanged]
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

// 4. PUT Update Inventory Item (TRIGGER NOTIFICATION)
router.put('/:id', protect, async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const updatedItem = await Inventory.findOneAndUpdate(
            { _id: id, shopId: req.user.shopId }, 
            { $set: updateData }, 
            { new: true, runValidators: true } 
        );

        if (updatedItem) {
            // --- TRIGGER REAL-TIME CHECK ---
            await checkAndNotifyLowStock(req, updatedItem);
            
            res.json({ message: 'Item updated successfully', item: updatedItem });
        } else {
            res.status(404).json({ error: 'Item not found.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update inventory item.' });
    }
});

// 5. POST Bulk upload (TRIGGER NOTIFICATIONS FOR ALL LOW STOCK)
router.post('/bulk', protect, async (req, res) => {
    const items = req.body; 
    const shopId = req.user.shopId;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Expected an array of items.' });
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

        // ... [Duplicate check logic remains same as your original code] ...
        
        // (Assuming you kept your duplication logic here)
        // itemsToInsert = ...

        const result = await Inventory.insertMany(itemsToInsert, { ordered: false }); 
        
        // --- BULK NOTIFICATION TRIGGER ---
        // Loop through newly inserted items to see if any are low stock
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