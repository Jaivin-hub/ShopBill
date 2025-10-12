const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory'); 
const Customer = require('../models/Customer');
const mongoose = require('mongoose');
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const router = express.Router();

// GET all sales for the shop (LIST VIEW)
router.get('/', protect, async (req, res) => {
    // Extract date range from query parameters
    const { startDate, endDate } = req.query;
    
    // Build the query filter object
    const filter = { shopId: req.user.shopId };
    
    // Add date range filtering if parameters are provided
    if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) {
            // Find sales with timestamp >= startDate
            filter.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
            // Find sales with timestamp <= endDate
            filter.timestamp.$lte = new Date(endDate);
        }
    }

    try {
        // SCOPED QUERY: fetch sales for the user's shopId, applying date filters
        const sales = await Sale.find(filter) // Use the constructed filter object
            .populate('customerId', 'name') // Populate customerId, only retrieving the 'name' field
            .sort({ timestamp: -1 });
            
        // Sales objects will now look like: 
        // { ..., customerId: { _id: '...', name: 'Customer Name' }, ... }
        res.json(sales);
    } catch (error) {
        console.error('Failed to fetch sales data with date filter:', error);
        res.status(500).json({ error: 'Failed to fetch sales data.' });
    }
});

// GET a single sale detail by ID (VIEW BILL MODAL)
router.get('/:id', protect, async (req, res) => {
    const saleId = req.params.id;

    if (!isValidObjectId(saleId)) {
        return res.status(400).json({ error: 'Invalid Sale ID.' });
    }

    try {
        // Fetch the sale, ensuring it belongs to the user's shop
        // Populate item details AND customer details for the detailed view
        const sale = await Sale.findOne({ _id: saleId, shopId: req.user.shopId })
            .populate('items.itemId') // Product details for the bill items
            .populate('customerId', 'name'); // Customer name for the bill header

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found or unauthorized.' });
        }

        res.json(sale);
    } catch (error) {
        console.error('Sale GET by ID Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch sale detail.' });
    }
});


router.post('/', protect, async (req, res) => {
    // Destructure all required fields, including the new payment split amounts
    const { totalAmount, paymentMethod, customerId, items, amountCredited, amountPaid } = req.body; 
    
    // VALIDATION: Ensure amountCredited is a valid number, default to 0
    const saleAmountCredited = parseFloat(amountCredited) || 0;
    
    const saleCustomerId = (customerId && isValidObjectId(customerId)) ? customerId : null;
    let schemaPaymentMethod = paymentMethod; // Assumes client sends 'UPI', 'Credit', or 'Mixed'
    
    try {
        // --- 1. Stock Check & Validation ---
        if (items && items.length > 0) {
             for (const item of items) {
                const inventoryItem = await Inventory.findOne({ _id: item.itemId, shopId: req.user.shopId }); 
                
                if (!inventoryItem) {
                    throw new Error(`Validation failed: Inventory item ID ${item.itemId} not found for this shop.`);
                }
                if (item.quantity > inventoryItem.quantity) {
                    throw new Error(`Validation failed: Not enough stock for ${inventoryItem.name}. Only ${inventoryItem.quantity} available.`);
                }
            }
        }
        
        // --- 2. Customer Credit Limit Check (Server-side defense) ---
        if (saleAmountCredited > 0 && saleCustomerId) {
            const customer = await Customer.findOne({ _id: saleCustomerId, shopId: req.user.shopId });
            
            if (!customer) {
                throw new Error(`Credit error: Customer ID ${saleCustomerId} not found or does not belong to this shop.`);
            }
            
            const khataDue = customer.outstandingCredit || 0;
            const creditLimit = customer.creditLimit || Infinity;

            if (khataDue + saleAmountCredited > creditLimit) {
                throw new Error(`Credit limit of ₹${creditLimit.toFixed(0)} exceeded! Cannot add ₹${saleAmountCredited.toFixed(2)} to Khata.`);
            }
        }
        
        // --- 3. Create the new sale record ---
        const newSale = await Sale.create({
            totalAmount,
            paymentMethod: schemaPaymentMethod,
            customerId: saleCustomerId, 
            items: items || [], 
            amountPaid: amountPaid,          // Saved for audit
            amountCredited: saleAmountCredited, // Saved for audit
            shopId: req.user.shopId, // CRITICAL: SCOPE THE SALE TO THE SHOP
        });

        // --- 4. Update Inventory ---
        if (items && items.length > 0) {
             const inventoryUpdates = items.map(item =>
                Inventory.findOneAndUpdate(
                    { _id: item.itemId, shopId: req.user.shopId }, 
                    { $inc: { quantity: -item.quantity } }, 
                    { new: true } 
                )
            );
            await Promise.all(inventoryUpdates);
        }

        // --- 5. Update Customer Credit (The Single Fix for Khata) ---
        if (saleAmountCredited > 0 && saleCustomerId) { 
            const updatedCustomer = await Customer.findOneAndUpdate(
                { _id: saleCustomerId, shopId: req.user.shopId },
                { $inc: { outstandingCredit: saleAmountCredited } }, // Uses the precise credit amount (no double counting)
                { new: true } 
            );

            if (!updatedCustomer) {
                 throw new Error(`Credit error: Customer ID ${saleCustomerId} not found or does not belong to this shop.`);
            }
        }

        res.json({ message: 'Sale recorded and inventory updated.', newSale });

    } catch (error) {
        console.error('Sale POST Error:', error.message);
        const status = error.message.includes('Validation failed') || error.message.includes('Credit limit') || error.message.includes('Credit error') ? 400 : 500;
        res.status(status).json({ error: error.message || 'Failed to record sale.' });
    }
});

module.exports = router;
