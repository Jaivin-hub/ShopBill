const express = require('express');
const cors = require('cors');
// Import the DB connection handler and Mongoose models
const connectDB = require('./db'); 
const Inventory = require('./models/Inventory'); 
const Customer = require('./models/Customer');
const Sale = require('./models/Sale');

const app = express();
const PORT = process.env.PORT || 5000;
const MOCK_LATENCY = 300; 

// --- Initial Data for Seeding ---
// Initial mock data removed.

// Seeding function: Inserts mock data if collections are empty.
// Seeding logic removed.

// --- Middleware setup ---
app.use(cors({ origin: '*' }));
app.use(express.json());


// --- Utility Functions ---

// Helper function to check if a string roughly matches the MongoDB ObjectId format
const isValidObjectId = (id) => {
    if (!id || typeof id !== 'string') return false;
    // ObjectId is a 24-character hexadecimal string
    return /^[0-9a-fA-F]{24}$/.test(id);
};

const respondWithDelay = (res, data) => {
    setTimeout(() => {
        res.json(data);
    }, MOCK_LATENCY);
};

// --- API ENDPOINTS (GET - Read Operations) ---

// 1. Get Inventory
app.get('/api/inventory', async (req, res) => {
    try {
        const inventory = await Inventory.find({});
        respondWithDelay(res, inventory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory.' });
    }
});

// 2. Get Customers (Khata Ledger)
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find({});
        respondWithDelay(res, customers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customers.' });
    }
});

// 3. Get Sales Data (for Dashboard)
app.get('/api/sales', async (req, res) => {
    try {
        const sales = await Sale.find({}).sort({ timestamp: -1 });
        respondWithDelay(res, sales);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales data.' });
    }
});


// --- API ENDPOINTS (POST/PUT/DELETE - Write Operations) ---

// 4. POST New Sale - Billing API (Handles Inventory Deduction and Credit Update)
app.post('/api/sales', async (req, res) => {
    // Destructure required billing data from the frontend
    const { totalAmount, paymentMethod, customerId, items } = req.body; 
    console.log('POST /api/sales called. Items to sell:', items ? items.length : 0, 'Total:', totalAmount);

    // Filter customerId to ensure it's a valid ObjectId or null/undefined, preventing BSON errors.
    const saleCustomerId = (customerId && isValidObjectId(customerId)) ? customerId : null;

    // --- CRITICAL FIX START: Normalize Payment Method for Mongoose Enum ---
    // Mongoose only accepts specific enum values (e.g., 'Cash', 'UPI', 'Credit').
    // If the frontend sends a composite like 'Cash/UPI', we must map it to a valid, non-credit enum value.
    let schemaPaymentMethod = paymentMethod;

    if (paymentMethod === 'Credit') {
        schemaPaymentMethod = 'Credit'; // Use 'Credit' explicitly for Khata transactions
    } else if (paymentMethod.toLowerCase().includes('upi')) {
        schemaPaymentMethod = 'UPI'; // If it contains UPI (e.g., 'Cash/UPI'), prefer UPI
    } else if (paymentMethod.toLowerCase().includes('card')) {
        schemaPaymentMethod = 'Card'; // If it contains card, use 'Card'
    } else {
        // Default to 'Cash' for any other non-credit composite/single values (e.g., 'Cash/UPI' -> 'Cash')
        schemaPaymentMethod = 'Cash';
    }
    // --- CRITICAL FIX END ---

    try {
        // --- 1. Stock Check & Validation ---
        if (items && items.length > 0) {
            for (const item of items) {
                if (!isValidObjectId(item.itemId)) {
                    throw new Error(`Validation failed: Invalid format for Inventory item ID ${item.itemId}.`);
                }
                
                const inventoryItem = await Inventory.findById(item.itemId);

                if (!inventoryItem) {
                    throw new Error(`Validation failed: Inventory item ID ${item.itemId} not found.`);
                }

                if (inventoryItem.quantity < item.quantity) {
                    throw new Error(`Stock error: Cannot sell ${item.quantity} of ${inventoryItem.name}. Only ${inventoryItem.quantity} available.`);
                }
            }
        }
        
        // --- 2. Create the new sale record (stores items sold for reporting) ---
        const newSale = await Sale.create({
            totalAmount,
            paymentMethod: schemaPaymentMethod, // <-- USING THE CLEANED/NORMALIZED VALUE
            customerId: saleCustomerId, 
            items: items || [], 
        });

        // --- 3. Update Inventory for each sold item ---
        if (items && items.length > 0) {
            const inventoryUpdates = items.map(item =>
                Inventory.findByIdAndUpdate(
                    item.itemId, 
                    { $inc: { quantity: -item.quantity } }, 
                    { new: true } 
                )
            );
            await Promise.all(inventoryUpdates);
            console.log(`Inventory updated for ${items.length} items.`);
        }

        // --- 4. Update Credit: If payment method is 'Credit', update customer's outstanding credit ---
        // CRITICAL: Use the schemaPaymentMethod to check for 'Credit'
        if (schemaPaymentMethod === 'Credit' && saleCustomerId) {
            const updatedCustomer = await Customer.findByIdAndUpdate(
                saleCustomerId,
                { $inc: { outstandingCredit: totalAmount } },
                { new: true } 
            );

            if (!updatedCustomer) {
                 throw new Error(`Credit error: Customer ID ${saleCustomerId} not found for credit transaction.`);
            }

            console.log(`Customer ${saleCustomerId} credit updated by ₹${totalAmount}.`);
        }

        respondWithDelay(res, { message: 'Sale recorded and inventory updated.', newSale });

    } catch (error) {
        console.error('Sale POST Error (Detailed):', error.message || error);
        
        const isClientError = error.message && (
            error.message.startsWith('Validation failed:') || 
            error.message.startsWith('Stock error:') ||
            error.message.startsWith('Credit error:')
        );
        
        res.status(isClientError ? 400 : 500).json({ 
            error: isClientError 
                ? error.message 
                : 'Failed to record sale and update inventory due to an unexpected server error.' 
        });
    }
});


// 5. POST New Inventory Item
app.post('/api/inventory', async (req, res) => {
    const newItem = req.body;
    
    if (!newItem.name || !newItem.price) {
        return res.status(400).json({ error: 'Missing required fields: name and price.' });
    }

    try {
        const item = await Inventory.create(newItem);
        respondWithDelay(res, { message: 'Item added successfully', item });
    } catch (error) {
        console.error('Inventory POST Error:', error);
        res.status(500).json({ error: 'Failed to add inventory item.' });
    }
});

// 6. DELETE Inventory Item
app.delete('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Inventory.findByIdAndDelete(id);

        if (result) {
            respondWithDelay(res, { message: `Item ${id} deleted successfully.` });
        } else {
            res.status(404).json({ error: 'Item not found.' });
        }
    } catch (error) {
        console.error('Inventory DELETE Error:', error);
        res.status(500).json({ error: 'Failed to delete inventory item.' });
    }
});

// 🌟 8. PUT Update Inventory Item
app.put('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!updateData.name || updateData.price === undefined || updateData.quantity === undefined) {
        return res.status(400).json({ error: 'Missing required fields for update.' });
    }
    
    if (!isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid Inventory ID format.' });
    }

    try {
        const updatedItem = await Inventory.findByIdAndUpdate(
            id, 
            { $set: updateData }, 
            { new: true, runValidators: true } 
        );

        if (updatedItem) {
            respondWithDelay(res, { message: 'Item updated successfully', item: updatedItem });
        } else {
            res.status(404).json({ error: 'Item not found.' });
        }
    } catch (error) {
        console.error('Inventory PUT Error:', error);
        res.status(500).json({ error: 'Failed to update inventory item.' });
    }
});

// 🌟 9. POST New Customer (NEW ROUTE)
app.post('/api/customers', async (req, res) => {
    // Destructure the fields expected from the frontend form
    const { name, phone, creditLimit } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Customer name is required and must be a valid string.' });
    }

    try {
        // Construct the data object for Mongoose
        const newCustomerData = {
            name: name.trim(),
            phone: phone ? String(phone).trim() : '',
            // Ensure creditLimit is saved as a non-negative number
            creditLimit: Math.max(0, parseFloat(creditLimit) || 0), 
            outstandingCredit: 0, // Always start a new customer with zero outstanding credit
        };

        const customer = await Customer.create(newCustomerData);
        
        console.log(`New customer added: ${customer.name}`);
        
        respondWithDelay(res, { 
            message: 'Customer added successfully', 
            customer 
        });
    } catch (error) {
        console.error('Customer POST Error:', error);
        // Mongoose validation errors often result in 400, but we'll use 500 for simplicity here.
        res.status(500).json({ error: 'Failed to add new customer.' });
    }
});


// 7. PUT Update Customer Credit (Payment Received) - Khata API
app.put('/api/customers/:customerId/credit', async (req, res) => {
    const { customerId } = req.params;
    const { amountChange } = req.body; // amountChange should be negative for payment

    if (!amountChange || isNaN(amountChange)) {
        return res.status(400).json({ error: 'Invalid or missing amountChange in request body.' });
    }
    
    // Ensure the customerId from URL params is a valid ObjectId before proceeding
    if (!isValidObjectId(customerId)) {
        return res.status(400).json({ error: 'Invalid Customer ID format.' });
    }

    try {
        // Use the $inc operator to add/subtract the amountChange
        let updatedCustomer = await Customer.findByIdAndUpdate(
            customerId,
            { $inc: { outstandingCredit: amountChange } },
            { new: true } // Return the updated document
        );
        
        if (!updatedCustomer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        // Prevent outstanding credit from going below zero
        if (updatedCustomer.outstandingCredit < 0) {
             // Reset to zero if it went below
             updatedCustomer = await Customer.findByIdAndUpdate(customerId, { outstandingCredit: 0 }, { new: true });
             return respondWithDelay(res, { 
                message: 'Credit updated successfully (Outstanding cleared).', 
                customer: updatedCustomer
            });
        }

        respondWithDelay(res, { 
            message: 'Credit updated successfully', 
            customer: updatedCustomer
        });
        
    } catch (error) {
        console.error('Credit PUT Error:', error);
        res.status(500).json({ error: 'Failed to update customer credit.' });
    }
});


// --- Server Initialization ---
const startServer = async () => {
    // 1. Connect to Database
    await connectDB();
    
    // 2. Start Express Listener
    app.listen(PORT, () => {
        console.log(`\n======================================================`);
        console.log(`🚀 MERN Shop API Mock server running on port ${PORT}`);
        console.log(`Frontend should connect to http://localhost:${PORT}`);
        console.log(`======================================================\n`);
    });
};

startServer();