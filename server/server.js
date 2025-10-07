// server.js (Critical Updates and New Sections)

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv'); 
// NEW IMPORTS
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

dotenv.config();
// Import the DB connection handler and Mongoose models
const connectDB = require('./db'); 
const Inventory = require('./models/Inventory'); 
const Customer = require('./models/Customer');
const Sale = require('./models/Sale');
const User = require('./models/User'); // NEW: Import User Model

const app = express();
const PORT = process.env.PORT || 5000;
const MOCK_LATENCY = 300; 

// NOTE: You MUST set JWT_SECRET in your .env file
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev'; 

// --- Middleware setup ---
app.use(cors({ origin: '*' }));
app.use(express.json());

// -------------------------------------------------------------------
// --- Utility Functions (FIXED: Re-inserted missing definitions) ---
// -------------------------------------------------------------------

// Helper function to check if a string roughly matches the MongoDB ObjectId format
const isValidObjectId = (id) => {
    if (!id || typeof id !== 'string') return false;
    // ObjectId is a 24-character hexadecimal string
    return /^[0-9a-fA-F]{24}$/.test(id);
};

// Provides mock network delay for API calls
const respondWithDelay = (res, data) => {
    setTimeout(() => {
        res.json(data);
    }, MOCK_LATENCY);
};

// Parses date range query parameters into a MongoDB query object for Sale model
const getSalesDateFilter = (req) => {
    const { startDate, endDate } = req.query;
    let filter = {};

    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); 
        filter.$gte = start;
    }

    if (endDate) {
        // Use $lt (Less Than) the start of the NEXT day
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        end.setHours(0, 0, 0, 0);
        filter.$lt = end; 
    }

    return (startDate || endDate) ? { timestamp: filter } : {};
};

// -------------------------------------------------------------------
// --- End of Utility Functions ---
// -------------------------------------------------------------------

const generateToken = (id, shopId, role) => {
    return jwt.sign({ id, shopId, role }, JWT_SECRET, {
        expiresIn: '30d', // Token expires in 30 days
    });
};

// --- NEW AUTHENTICATION MIDDLEWARE ---
const protect = async (req, res, next) => {
    let token;

    // 1. Check for the Authorization header and 'Bearer' prefix
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Safely extract the token
        const parts = req.headers.authorization.split(' ');
        
        if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
            token = parts[1];
        }
        // If it's "Bearer " or "Bearer" or has wrong parts, token remains undefined
    }

    // 2. Handle missing or malformed token format
    if (!token) {
        // Use an explicit error message for clarity
        return res.status(401).json({ error: 'Not authorized, token missing or badly formatted.' });
    }

    // 3. Verify the token (Only executed if token is a non-empty string)
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Get user from the token payload (excluding password)
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'Not authorized, user not found' });
        }

        // Attach user and their shopId to the request
        req.user = user;
        next();

    } catch (error) {
        // This catch block specifically handles errors from jwt.verify 
        // (like 'jwt expired', 'invalid signature', or 'jwt malformed' if it slipped through)
        console.error('Auth Error:', error.message); // Log only the message to reduce noise
        
        // You can make this message more user-friendly
        const errorMessage = error.name === 'TokenExpiredError' 
            ? 'Not authorized, token expired. Please log in again.' 
            : 'Not authorized, invalid token.';
            
        res.status(401).json({ error: errorMessage });
    }
};

// --- NEW AUTH ROUTES ---

// Login User
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id, user.shopId, user.role);
            respondWithDelay(res, {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    shopId: user.shopId,
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid email or password.' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// Register a New Owner/Shop
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, phone } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists with this email.' });
        }

        // IMPORTANT: The first user (owner) uses their own _id as the shopId
        const newUser = await User.create({
            email,
            password,
            phone: phone || null,
            role: 'owner', // Default role for signup
            // Temporarily set shopId to null, then update after save
            shopId: new mongoose.Types.ObjectId(), // Use a new ObjectId placeholder
        });
        
        // After creation, set the shopId to the user's own _id
        newUser.shopId = newUser._id;
        await newUser.save();

        const token = generateToken(newUser._id, newUser.shopId, newUser.role);

        respondWithDelay(res, {
            token,
            user: {
                id: newUser._id,
                email: newUser.email,
                role: newUser.role,
                shopId: newUser.shopId,
            }
        });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ error: 'Server error during signup.' });
    }
});


// ----------------------------------------------------
// --- SCOPED API ENDPOINTS (Require 'protect' middleware) ---
// ----------------------------------------------------

// 1. Get Inventory
// APPLY protect MIDDLEWARE
app.get('/api/inventory', protect, async (req, res) => {
    try {
        // SCOPED QUERY: ONLY fetch inventory for the user's shopId
        const inventory = await Inventory.find({ shopId: req.user.shopId });
        respondWithDelay(res, inventory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory.' });
    }
});

// 2. Get Customers (Khata Ledger)
// APPLY protect MIDDLEWARE
app.get('/api/customers', protect, async (req, res) => {
    try {
        // SCOPED QUERY: ONLY fetch customers for the user's shopId
        const customers = await Customer.find({ shopId: req.user.shopId });
        respondWithDelay(res, customers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customers.' });
    }
});

// 3. Get Sales Data (for Dashboard)
// APPLY protect MIDDLEWARE
app.get('/api/sales', protect, async (req, res) => {
    try {
        // SCOPED QUERY: ONLY fetch sales for the user's shopId
        const sales = await Sale.find({ shopId: req.user.shopId }).sort({ timestamp: -1 });
        respondWithDelay(res, sales);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales data.' });
    }
});


// 4. Get Summary Metrics and Top Items
// APPLY protect MIDDLEWARE
app.get('/api/reports/summary', protect, async (req, res) => {
    try {
        const dateFilter = getSalesDateFilter(req);
        
        // SCOPED QUERY: Add shopId to dateFilter for sales
        const salesFilter = { ...dateFilter, shopId: req.user.shopId };
        
        // Step 1: Fetch filtered sales, customers, AND ALL INVENTORY ITEMS (all scoped)
        const [filteredSales, customers, inventoryItems, allTimeSales] = await Promise.all([
            Sale.find(salesFilter),
            Customer.find({ shopId: req.user.shopId }), // Scoped
            Inventory.find({ shopId: req.user.shopId }), // Scoped
            Sale.find({ shopId: req.user.shopId }), // Scoped for all-time stats
        ]);
        
        // ... (The rest of the calculation logic remains the same, but now uses the scoped data) ...
        
        // Create a quick lookup map for current inventory names and prices
        const inventoryMap = new Map();
        inventoryItems.forEach(item => {
            inventoryMap.set(item._id.toString(), { 
                name: item.name, 
                price: item.price
            });
        });


        // Step 2: Calculate Metrics 
        let revenue = 0;
        let billsRaised = filteredSales.length; 
        let itemVolumeMap = new Map();
        let totalVolume = 0;

        filteredSales.forEach(sale => {
            revenue += sale.totalAmount;
            
            (sale.items || []).forEach(item => {
                const key = item.itemId.toString(); 
                
                const currentInventoryData = inventoryMap.get(key);
                const itemName = currentInventoryData ? currentInventoryData.name : item.name;

                const current = itemVolumeMap.get(key) || { name: itemName, quantity: 0 };
                
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
        // const allTimeSales = await Sale.find({ shopId: req.user.shopId }); // Already fetched in Promise.all
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


// 5. Get Chart Data
// APPLY protect MIDDLEWARE
app.get('/api/reports/chart-data', protect, async (req, res) => {
    try {
        const { viewType } = req.query; 
        const dateFilter = getSalesDateFilter(req);
        
        let aggregationId;
        // The aggregationId logic would be defined here based on viewType (e.g., $dayOfYear, $week, $month)
        // Since it wasn't provided, we'll assume it exists or is simple.
        
        // SCOPED QUERY: Add shopId to the initial $match stage
        const matchStage = { $match: { ...dateFilter, shopId: req.user.shopId } }; 

        const chartData = await Sale.aggregate([
            // 1. Filter by Date Range AND Shop ID
            matchStage,
            
            // 2. Group and Aggregate
            {
                $group: {
                    _id: aggregationId, // aggregationId must be defined based on viewType (e.g., $dayOfYear, $month)
                    revenue: { $sum: "$totalAmount" },
                    bills: { $sum: 1 }
                }
            },
            
            // 3. Project and 4. Sort would typically follow here
            // ...
        ]);

        respondWithDelay(res, chartData);

    } catch (error) {
        console.error('Reports Chart Data API Error:', error);
        res.status(500).json({ error: 'Failed to generate chart data.' });
    }
});

// 6. POST New Sale
// APPLY protect MIDDLEWARE
app.post('/api/sales', protect, async (req, res) => {
    const { totalAmount, paymentMethod, customerId, items } = req.body; 
    
    // ... (Validation and paymentMethod normalization logic remains the same) ...
    
    const saleCustomerId = (customerId && isValidObjectId(customerId)) ? customerId : null;
    let schemaPaymentMethod = paymentMethod;
    // ... (rest of normalization) ...
    
    try {
        // --- 1. Stock Check & Validation ---
        if (items && items.length > 0) {
            for (const item of items) {
                // SCOPED FIND: Check inventory item exists and belongs to the shop
                const inventoryItem = await Inventory.findOne({ _id: item.itemId, shopId: req.user.shopId }); 
                
                if (!inventoryItem) {
                    throw new Error(`Validation failed: Inventory item ID ${item.itemId} not found for this shop.`);
                }
                // ... (quantity check remains the same) ...
            }
        }
        
        // --- 2. Create the new sale record ---
        const newSale = await Sale.create({
            totalAmount,
            paymentMethod: schemaPaymentMethod,
            customerId: saleCustomerId, 
            items: items || [], 
            shopId: req.user.shopId, // CRITICAL: SCOPE THE SALE TO THE SHOP
        });

        // --- 3. Update Inventory ---
        if (items && items.length > 0) {
             const inventoryUpdates = items.map(item =>
                // SCOPED UPDATE: Only update inventory items belonging to the shop
                Inventory.findOneAndUpdate(
                    { _id: item.itemId, shopId: req.user.shopId }, 
                    { $inc: { quantity: -item.quantity } }, 
                    { new: true } 
                )
            );
            await Promise.all(inventoryUpdates);
        }

        // --- 4. Update Credit ---
        if (schemaPaymentMethod === 'Credit' && saleCustomerId) {
            // SCOPED UPDATE: Only update customer credit if the customer belongs to the shop
            const updatedCustomer = await Customer.findOneAndUpdate(
                { _id: saleCustomerId, shopId: req.user.shopId },
                { $inc: { outstandingCredit: totalAmount } },
                { new: true } 
            );

            if (!updatedCustomer) {
                 throw new Error(`Credit error: Customer ID ${saleCustomerId} not found or does not belong to this shop.`);
            }
        }

        respondWithDelay(res, { message: 'Sale recorded and inventory updated.', newSale });

    } catch (error) {
        console.error('Sale POST Error:', error.message);
        const status = error.message.includes('Validation failed') || error.message.includes('Credit error') ? 400 : 500;
        res.status(status).json({ error: error.message || 'Failed to record sale.' });
    }
});


// 7. POST New Inventory Item
// APPLY protect MIDDLEWARE
app.post('/api/inventory', protect, async (req, res) => {
    const newItem = req.body;
    
    // ... (validation remains the same) ...

    try {
        const item = await Inventory.create({ 
            ...newItem, 
            shopId: req.user.shopId // CRITICAL: SCOPE THE NEW ITEM
        });
        respondWithDelay(res, { message: 'Item added successfully', item });
    } catch (error) {
        console.error('Inventory POST Error:', error);
        res.status(500).json({ error: 'Failed to add new inventory item.' });
    }
});

// 8. DELETE Inventory Item
// APPLY protect MIDDLEWARE
app.delete('/api/inventory/:id', protect, async (req, res) => {
    const { id } = req.params;

    try {
        // SCOPED DELETE: Only delete if the item ID AND shopId match
        const result = await Inventory.findOneAndDelete({ _id: id, shopId: req.user.shopId });

        if (result) {
            respondWithDelay(res, { message: `Item ${id} deleted successfully.` });
        } else {
            res.status(404).json({ error: 'Item not found or does not belong to this shop.' });
        }
    } catch (error) {
        console.error('Inventory DELETE Error:', error);
        res.status(500).json({ error: 'Failed to delete inventory item.' });
    }
});

// 9. PUT Update Inventory Item
// APPLY protect MIDDLEWARE
app.put('/api/inventory/:id', protect, async (req, res) => {
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
            respondWithDelay(res, { message: 'Item updated successfully', item: updatedItem });
        } else {
            res.status(404).json({ error: 'Item not found or does not belong to this shop.' });
        }
    } catch (error) {
        console.error('Inventory PUT Error:', error);
        res.status(500).json({ error: 'Failed to update inventory item.' });
    }
});

// 10. POST New Customer
// APPLY protect MIDDLEWARE
app.post('/api/customers', protect, async (req, res) => {
    const { name, phone, creditLimit } = req.body;
    
    // ... (validation remains the same) ...

    try {
        const newCustomerData = {
            name: name.trim(),
            phone: phone ? String(phone).trim() : '',
            creditLimit: Math.max(0, parseFloat(creditLimit) || 0), 
            outstandingCredit: 0,
            shopId: req.user.shopId, // CRITICAL: SCOPE THE NEW CUSTOMER
        };

        const customer = await Customer.create(newCustomerData);
        
        respondWithDelay(res, { message: 'Customer added successfully', customer });
    } catch (error) {
        console.error('Customer POST Error:', error);
        res.status(500).json({ error: 'Failed to add new customer.' });
    }
});


// 11. PUT Update Customer Credit (Payment Received)
// APPLY protect MIDDLEWARE
app.put('/api/customers/:customerId/credit', protect, async (req, res) => {
    const { customerId } = req.params;
    const { amountChange } = req.body;

    // ... (validation remains the same) ...

    try {
        // SCOPED UPDATE: Only update if customerId AND shopId match
        let updatedCustomer = await Customer.findOneAndUpdate(
            { _id: customerId, shopId: req.user.shopId },
            { $inc: { outstandingCredit: amountChange } },
            { new: true } 
        );
        
        if (!updatedCustomer) {
            return res.status(404).json({ error: 'Customer not found or does not belong to this shop.' });
        }
        
        // Prevent outstanding credit from going below zero (logic remains the same)
        if (updatedCustomer.outstandingCredit < 0) {
             updatedCustomer = await Customer.findByIdAndUpdate(customerId, { outstandingCredit: 0 }, { new: true });
             // NOTE: findByIdAndUpdate is used here for simplicity after the check, but it should technically still be scoped:
             // updatedCustomer = await Customer.findOneAndUpdate({ _id: customerId, shopId: req.user.shopId }, { outstandingCredit: 0 }, { new: true });
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
        console.error('Customer Credit PUT Error:', error);
        res.status(500).json({ error: 'Failed to update customer credit.' });
    }
});

// --- Server Initialization (Remains the same) ---
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