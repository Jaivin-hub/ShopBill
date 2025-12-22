const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory'); 
const Customer = require('../models/Customer');
const mongoose = require('mongoose');
// IMPORT the notification utility
const { emitAlert } = require('./notificationRoutes'); 

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const router = express.Router();

// GET all sales for the shop (LIST VIEW)
router.get('/', protect, async (req, res) => {
    const { startDate, endDate } = req.query;
    const filter = { shopId: req.user.shopId };
    
    if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    try {
        const sales = await Sale.find(filter)
            .populate('customerId', 'name')
            .sort({ timestamp: -1 });
        res.json(sales);
    } catch (error) {
        console.error('Failed to fetch sales data:', error);
        res.status(500).json({ error: 'Failed to fetch sales data.' });
    }
});

// GET a single sale detail by ID
router.get('/:id', protect, async (req, res) => {
    const saleId = req.params.id;
    if (!isValidObjectId(saleId)) return res.status(400).json({ error: 'Invalid Sale ID.' });

    try {
        const sale = await Sale.findOne({ _id: saleId, shopId: req.user.shopId })
            .populate('items.itemId')
            .populate('customerId', 'name');

        if (!sale) return res.status(404).json({ error: 'Sale not found.' });
        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sale detail.' });
    }
});

// POST a new sale
router.post('/', protect, async (req, res) => {
    // Added 'forceProceed' to destructuring
    const { totalAmount, paymentMethod, customerId, items, amountCredited, amountPaid, forceProceed } = req.body; 
    const saleAmountCredited = parseFloat(amountCredited) || 0;
    const saleCustomerId = (customerId && isValidObjectId(customerId)) ? customerId : null;
    const shopId = req.user.shopId;

    try {
        // --- 1. Stock Check & Validation ---
        if (items && items.length > 0) {
             for (const item of items) {
                const inventoryItem = await Inventory.findOne({ _id: item.itemId, shopId }); 
                if (!inventoryItem) throw new Error(`Inventory item not found.`);
                
                if (inventoryItem.quantity < item.quantity) {
                    throw new Error(`Not enough stock for ${inventoryItem.name}. Current stock: ${inventoryItem.quantity}`);
                }
            }
        }
        
        // --- 2. Customer Credit Limit Check ---
        let targetCustomer = null;
        if (saleCustomerId) {
            targetCustomer = await Customer.findOne({ _id: saleCustomerId, shopId });
            
            if (saleAmountCredited > 0 && targetCustomer) {
                const currentDue = targetCustomer.outstandingCredit || 0;
                const limit = targetCustomer.creditLimit || 0;

                // Only block if forceProceed is NOT true
                if (!forceProceed && (currentDue + saleAmountCredited > limit)) {
                    // Send a specific error code so frontend can show a "Confirm Bypass" dialog
                    return res.status(409).json({ 
                        error: 'CREDIT_LIMIT_EXCEEDED', 
                        message: `Customer credit limit of ₹${limit} exceeded. Current balance: ₹${currentDue}. Proceed anyway?`,
                        currentBalance: currentDue,
                        limit: limit
                    });
                }
            }
        }
        
        // --- 3. Create Sale Record ---
        const newSale = await Sale.create({
            totalAmount,
            paymentMethod,
            customerId: saleCustomerId, 
            items: items || [], 
            amountPaid,
            amountCredited: saleAmountCredited,
            shopId,
        });

        // --- 4. Update Inventory ---
        let updatedInventoryDocs = [];
        if (items && items.length > 0) {
             const inventoryUpdates = items.map(item =>
                Inventory.findOneAndUpdate(
                    { _id: item.itemId, shopId }, 
                    { $inc: { quantity: -item.quantity } }, 
                    { new: true } 
                )
            );
            updatedInventoryDocs = await Promise.all(inventoryUpdates);
        }

        // --- 5. Update Customer Credit & Notify ---
        if (saleAmountCredited > 0 && saleCustomerId) { 
            const updatedCustomer = await Customer.findOneAndUpdate(
                { _id: saleCustomerId, shopId },
                { $inc: { outstandingCredit: saleAmountCredited } },
                { new: true }
            );

            // Trigger real-time alert if they are now at/near limit
            if (updatedCustomer.outstandingCredit >= updatedCustomer.creditLimit) {
                await emitAlert(req, shopId, 'credit_exceeded', {
                    _id: updatedCustomer._id,
                    name: updatedCustomer.name,
                    creditLimit: updatedCustomer.creditLimit,
                    currentBalance: updatedCustomer.outstandingCredit
                });
            }
        }

        // --- 6. REAL-TIME STOCK LOGIC ---
        for (const item of updatedInventoryDocs) {
            const currentQty = Number(item.quantity);
            const reorderLevel = Number(item.reorderLevel) || 5;

            if (currentQty <= reorderLevel) {
                await emitAlert(req, shopId, 'inventory_low', {
                    _id: item._id,
                    name: item.name,
                    quantity: currentQty
                });
            } else {
                await resolveLowStockAlert(req, shopId, item._id);
            }
        }

        res.json({ message: 'Sale recorded successfully.', newSale });

    } catch (error) {
        console.error('Sale POST Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to record sale.' });
    }
});

module.exports = router;