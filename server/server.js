const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv'); 

dotenv.config();
// Import the DB connection handler and Mongoose models
const connectDB = require('./db'); 
const Inventory = require('./models/Inventory'); 
const Customer = require('./models/Customer');
const Sale = require('./models/Sale');

const app = express();
const PORT = process.env.PORT || 5000;
const MOCK_LATENCY = 300; 

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

// New Utility: Parses date range query parameters into a MongoDB query object
const getSalesDateFilter = (req) => {
    const { startDate, endDate } = req.query;
    let filter = {};

    if (startDate) {
        // Use Start of the day (00:00:00.000) for $gte
        // Using new Date() on 'YYYY-MM-DD' strings often creates a UTC timestamp 
        // that corresponds to 00:00:00 in the local timezone's offset.
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Ensure the time is set to the start of the day
        filter.$gte = start;
    }

    if (endDate) {
        // --- FIX: Use $lt (Less Than) the start of the NEXT day for a robust end boundary ---
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1); // Increment by one day
        end.setHours(0, 0, 0, 0);       // Set time to 00:00:00.000
        filter.$lt = end; // Use $lt (Less Than) - includes the entire original endDate day
    }

    // Only return the timestamp filter if either date is present
    return (startDate || endDate) ? { timestamp: filter } : {};
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
// This is typically used by the frontend for simple lists/dashboard feeds.
app.get('/api/sales', async (req, res) => {
    try {
        const sales = await Sale.find({}).sort({ timestamp: -1 });
        respondWithDelay(res, sales);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales data.' });
    }
});


// ----------------------------------------------------
// --- NEW API ENDPOINTS FOR REPORTS PAGE (4 & 5) ---
// ----------------------------------------------------

// 4. Get Summary Metrics and Top Items for a given date range
app.get('/api/reports/summary', async (req, res) => {
    try {
        const dateFilter = getSalesDateFilter(req);
        console.log('dateFilter',dateFilter)
        
        // Step 1: Fetch filtered sales, customers, AND ALL INVENTORY ITEMS
        const [filteredSales, customers, inventoryItems] = await Promise.all([
            Sale.find(dateFilter),
            Customer.find({}), // Need all customers for total credit
            Inventory.find({}) // <-- NEW: Fetch all inventory to map item IDs to current names/prices
        ]);
        
        // Create a quick lookup map for current inventory names and prices
        const inventoryMap = new Map();
        inventoryItems.forEach(item => {
            inventoryMap.set(item._id.toString(), { 
                name: item.name, 
                price: item.price // Optional: could be useful later
            });
        });


        // Step 2: Calculate Metrics (Updated to use inventoryMap for names)
        let revenue = 0;
        let billsRaised = filteredSales.length; 
        let itemVolumeMap = new Map();
        let totalVolume = 0;

        filteredSales.forEach(sale => {
            revenue += sale.totalAmount;
            
            (sale.items || []).forEach(item => {
                const key = item.itemId.toString(); // Grouping key MUST be the item ID
                
                // Use the name from the CURRENT Inventory, falling back to the sale name
                const currentInventoryData = inventoryMap.get(key);
                const itemName = currentInventoryData ? currentInventoryData.name : item.name;

                const current = itemVolumeMap.get(key) || { name: itemName, quantity: 0 };
                
                // CRITICAL: Ensure the latest/correct name is used for the Map value
                current.name = itemName; 
                current.quantity += item.quantity;
                
                itemVolumeMap.set(key, current);
                totalVolume += item.quantity;
            });
        });

        const averageBillValue = billsRaised > 0 ? revenue / billsRaised : 0;
        
        const topItems = Array.from(itemVolumeMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
            
        const totalCreditOutstanding = customers.reduce((sum, cust) => sum + (cust.outstandingCredit || 0), 0);
        
        // Step 3: Fetch all-time stats for the Financial Summary block
        const allTimeSales = await Sale.find({});
        const totalAllTimeRevenue = allTimeSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalAllTimeBills = allTimeSales.length;


        respondWithDelay(res, {
            revenue,
            billsRaised,
            averageBillValue,
            volume: totalVolume,
            topItems,
            totalCreditOutstanding,
            totalAllTimeRevenue, 
            totalAllTimeBills,
        });

    } catch (error) {
        console.error('Reports Summary API Error:', error);
        res.status(500).json({ error: 'Failed to generate report summary.' });
    }
});

// 5. Get Chart Data (Aggregated Time Series) for a given date range and view type
app.get('/api/reports/chart-data', async (req, res) => {
    try {
        const { viewType } = req.query; // 'Day', 'Week', or 'Month'
        const dateFilter = getSalesDateFilter(req);
        
        let aggregationId;
        
        // MongoDB aggregation key based on viewType
        if (viewType === 'Month') {
            aggregationId = { 
                $dateToString: { format: "%Y-%m", date: "$timestamp" } 
            };
        } else if (viewType === 'Week') {
             // Calculate week number (ISO week date, 1-53)
            aggregationId = {
                $concat: [
                    { $toString: { $isoWeekYear: "$timestamp" } },
                    "-W",
                    { 
                        $dateToString: { 
                            format: "%V", // %V for ISO week number (1-53)
                            date: "$timestamp" 
                        } 
                    }
                ]
            };
        } else { // Default to 'Day'
            aggregationId = { 
                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } 
            };
        }

        const chartData = await Sale.aggregate([
            // 1. Filter by Date Range (using the helper)
            { $match: dateFilter },
            
            // 2. Group and Aggregate
            {
                $group: {
                    _id: aggregationId,
                    revenue: { $sum: "$totalAmount" },
                    bills: { $sum: 1 } // Count the number of sales
                }
            },
            
            // 3. Rename _id to 'name' for frontend chart compatibility
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    revenue: 1,
                    bills: 1
                }
            },
            
            // 4. Sort by the grouped key ('name' which is the date/week/month string)
            {
                $sort: { name: 1 }
            }
        ]);

        respondWithDelay(res, chartData);

    } catch (error) {
        console.error('Reports Chart Data API Error:', error);
        res.status(500).json({ error: 'Failed to generate chart data.' });
    }
});

// ----------------------------------------------------
// --- API ENDPOINTS (POST/PUT/DELETE - Write Operations) ---
// ----------------------------------------------------

// 6. POST New Sale - Billing API (Handles Inventory Deduction and Credit Update)
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


// 7. POST New Inventory Item
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

// 8. DELETE Inventory Item
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

// 9. PUT Update Inventory Item
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

// 10. POST New Customer (NEW ROUTE)
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


// 11. PUT Update Customer Credit (Payment Received) - Khata API
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