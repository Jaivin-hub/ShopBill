const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory'); 
const Customer = require('../models/Customer');
const mongoose = require('mongoose');
// IMPORT the notification utilities
const { emitAlert, resolveLowStockAlert } = require('./notificationRoutes'); 

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const router = express.Router();

// GET all sales for the shop (LIST VIEW)
router.get('/', protect, async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!req.user.storeId) {
        return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
    }
    const filter = { storeId: req.user.storeId };
    
    if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    try {
        // Add pagination for large datasets
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        const sales = await Sale.find(filter)
            .select('totalAmount paymentMethod customerId timestamp amountPaid amountCredited items')
            .populate('customerId', 'name')
            .lean()
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip);
            
        const total = await Sale.countDocuments(filter);
        
        res.json({
            sales,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
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
        const sale = await Sale.findOne({ _id: saleId, storeId: req.user.storeId })
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
    // Added forceProceed from req.body
    const { totalAmount, paymentMethod, customerId, items, amountCredited, amountPaid, forceProceed } = req.body; 
    const saleAmountCredited = parseFloat(amountCredited) || 0;
    const saleCustomerId = (customerId && isValidObjectId(customerId)) ? customerId : null;
    if (!req.user.storeId) {
        return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
    }
    const storeId = req.user.storeId;

    try {
        // --- 1. Stock Check & Validation ---
        if (items && items.length > 0) {
             for (const item of items) {
                const inventoryItem = await Inventory.findOne({ _id: item.itemId, storeId }); 
                if (!inventoryItem) throw new Error(`Inventory item not found.`);
                
                // Check if this is a variant sale
                if (item.variantId && inventoryItem.variants && inventoryItem.variants.length > 0) {
                    // Find the specific variant
                    const variant = inventoryItem.variants.id(item.variantId);
                    if (!variant) {
                        throw new Error(`Variant not found for ${inventoryItem.name}.`);
                    }
                    
                    // Check variant stock
                    if (variant.quantity < item.quantity && !forceProceed) {
                        throw new Error(`Not enough stock for ${inventoryItem.name} - ${variant.label}. Available: ${variant.quantity}`);
                    }
                } else {
                    // Regular product (no variant)
                    if (!inventoryItem.variants || inventoryItem.variants.length === 0) {
                        // Only block if not forced
                        if (inventoryItem.quantity < item.quantity && !forceProceed) {
                            throw new Error(`Not enough stock for ${inventoryItem.name}.`);
                        }
                    } else {
                        // Product has variants but no variantId provided
                        throw new Error(`${inventoryItem.name} has variants. Please select a variant.`);
                    }
                }
            }
        }
        
        // --- 2. Customer Credit Limit Check ---
        let targetCustomer = null;
        if (saleCustomerId) {
            targetCustomer = await Customer.findOne({ _id: saleCustomerId, storeId });
            if (saleAmountCredited > 0 && targetCustomer) {
                const khataDue = targetCustomer.outstandingCredit || 0;
                const creditLimit = targetCustomer.creditLimit || Infinity;

                // Only throw error if forceProceed is false
                if (khataDue + saleAmountCredited > creditLimit && !forceProceed) {
                    // We throw a specific string that the catch block will handle
                    throw new Error(`Credit limit of ₹${creditLimit} exceeded!`);
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
            storeId,
        });

        // --- 4. Update Inventory ---
        let updatedInventoryDocs = [];
        if (items && items.length > 0) {
             const inventoryUpdates = items.map(async (item) => {
                const inventoryItem = await Inventory.findOne({ _id: item.itemId, storeId });
                if (!inventoryItem) {
                    throw new Error(`Inventory item not found for ${item.name}`);
                }

                if (item.variantId) {
                    // Update specific variant quantity
                    const variant = inventoryItem.variants.id(item.variantId);
                    if (!variant) {
                        throw new Error(`Variant not found for ${inventoryItem.name}`);
                    }
                    
                    // Use arrayFilters to update the specific variant
                    return Inventory.findOneAndUpdate(
                        { _id: item.itemId, storeId },
                        { $inc: { 'variants.$[elem].quantity': -item.quantity } },
                        { 
                            arrayFilters: [{ 'elem._id': item.variantId }],
                            new: true 
                        }
                    );
                } else {
                    // Update base quantity (only if product doesn't have variants)
                    if (inventoryItem.variants && inventoryItem.variants.length > 0) {
                        throw new Error(`${inventoryItem.name} has variants but no variant was selected.`);
                    }
                    
                    // Only update if quantity is not null
                    if (inventoryItem.quantity === null || inventoryItem.quantity === undefined) {
                        throw new Error(`Cannot update quantity for ${inventoryItem.name}: quantity is null.`);
                    }
                    
                    return Inventory.findOneAndUpdate(
                        { _id: item.itemId, storeId },
                        { $inc: { quantity: -item.quantity } },
                        { new: true }
                    );
                }
            });
            updatedInventoryDocs = await Promise.all(inventoryUpdates);
        }

        // --- 5. Update Customer Credit & Notify ---
        if (saleAmountCredited > 0 && saleCustomerId) { 
            const updatedCustomer = await Customer.findOneAndUpdate(
                { _id: saleCustomerId, storeId },
                { $inc: { outstandingCredit: saleAmountCredited } },
                { new: true }
            );

            if (updatedCustomer.outstandingCredit >= updatedCustomer.creditLimit) {
                await emitAlert(req, storeId.toString(), 'credit_exceeded', {
                    _id: updatedCustomer._id,
                    name: updatedCustomer.name,
                    creditLimit: updatedCustomer.creditLimit
                });
            }
            
            // Send notification for credit given during sale
            try {
                const Staff = require('../models/Staff');
                let actorName = req.user.name || req.user.email;
                let actorRole = req.user.role || 'User';
                
                // For staff, get name from Staff model
                if (req.user.role === 'Manager' || req.user.role === 'Cashier') {
                    const staffRecord = await Staff.findOne({ userId: req.user._id });
                    if (staffRecord) {
                        actorName = staffRecord.name || req.user.name || req.user.email;
                        actorRole = staffRecord.role || req.user.role;
                    }
                }
                
                const roleDisplay = actorRole === 'owner' ? 'Owner' : 
                                   actorRole === 'Manager' ? 'Manager' : 
                                   actorRole === 'Cashier' ? 'Cashier' : 
                                   actorRole;
                const actorNameWithRole = `${actorName} (${roleDisplay})`;
                
                await emitAlert(req, storeId.toString(), 'ledger_credit', {
                    customerId: updatedCustomer._id,
                    customerName: updatedCustomer.name,
                    amount: saleAmountCredited,
                    transactionId: newSale._id,
                    message: `Credit of ₹${saleAmountCredited.toFixed(2)} given to ${updatedCustomer.name} by ${actorNameWithRole}`
                });
            } catch (err) {
                console.error("❌ Error sending credit notification:", err);
            }
        }

        // --- 6. REAL-TIME STOCK LOGIC ---
        for (const item of updatedInventoryDocs) {
            // Check if product has variants
            if (item.variants && item.variants.length > 0) {
                // Check each variant for low stock
                for (const variant of item.variants) {
                    const variantQty = Number(variant.quantity) || 0;
                    const variantReorderLevel = variant.reorderLevel !== null && variant.reorderLevel !== undefined 
                        ? Number(variant.reorderLevel) 
                        : Number(item.reorderLevel) || 5;

                    if (variantQty <= variantReorderLevel) {
                        await emitAlert(req, storeId.toString(), 'inventory_low', {
                            _id: item._id,
                            name: `${item.name} (${variant.label})`,
                            quantity: variantQty,
                            variantId: variant._id
                        });
                        console.log(`📡 [Low Stock Alert] ${item.name} - ${variant.label}: ${variantQty}`);
                    } else {
                        // Resolve alert if variant stock is replenished
                        await resolveLowStockAlert(req, storeId.toString(), item._id, variant._id);
                    }
                }
            } else {
                // Original logic for products without variants
                const currentQty = Number(item.quantity) || 0;
                const reorderLevel = Number(item.reorderLevel) || 5;

                if (currentQty <= reorderLevel) {
                    await emitAlert(req, storeId.toString(), 'inventory_low', {
                        _id: item._id,
                        name: item.name,
                        quantity: currentQty
                    });
                } else {
                    await resolveLowStockAlert(req, storeId.toString(), item._id);
                }
            }
        }

        res.status(200).json({ message: 'Sale recorded successfully.', newSale });

    } catch (error) {
        console.error('Sale POST Error:', error.message);
        
        // --- KEY CHANGE HERE ---
        // If it's a credit limit error, return 200 with the error object 
        // so the frontend modal can catch it and show the bypass button.
        if (error.message.includes('limit') || error.message.includes('exceeded')) {
            return res.status(200).json({ 
                error: error.message,
                isWarning: true,
                type: 'CREDIT_LIMIT'
            });
        }

        // For actual server crashes or other errors, keep 400/500
        const status = error.message.includes('stock') ? 400 : 500;
        res.status(status).json({ error: error.message || 'Failed to record sale.' });
    }
});

module.exports = router;