const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv'); 

dotenv.config();

// Import DB connection and middleware
const connectDB = require('./db'); 

// Import Routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const salesRoutes = require('./routes/salesRoutes');
const reportRoutes = require('./routes/reportRoutes');
// 💥 NEW: Import the notification routes
const notificationRoutes = require('./routes/notificationRoutes'); 
const staffRoutes = require('./routes/staffRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware setup ---
app.use(cors({ origin: '*' }));
app.use(express.json());

// ----------------------------------------------------
// --- API ROUTE MOUNTING ---
// ----------------------------------------------------

// AUTH ROUTES: Mount the router at /api/auth
app.use('/api/auth', authRoutes);

// DATA ROUTES: Mount the other routers
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);

// 💥 NEW: NOTIFICATION ROUTES: Mount the router at /api/notifications
app.use('/api/notifications', notificationRoutes);

// --- Server Initialization ---
const startServer = async () => {
    // NOTE: This assumes you have created the db.js file as requested in the previous step.
    await connectDB(); 
    
    app.listen(PORT, () => {
        console.log(`\n======================================================`);
        console.log(`🚀 MERN Shop API Mock server running on port ${PORT}`);
        console.log(`Frontend should connect to http://localhost:${PORT}`);
        console.log(`======================================================\n`);
    });
};

startServer();