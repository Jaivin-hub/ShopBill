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
const notificationRoutes = require('./routes/notificationRoutes'); 
const staffRoutes = require('./routes/staffRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); 
const webhookRouter = require('./routes/webhookRouter');
const superadminRouter = require('./routes/superadminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware setup ---
app.use(cors({ origin: '*' }));
app.use(express.json());

// ----------------------------------------------------
// --- API ROUTE MOUNTING ---
// ----------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/webhooks', webhookRouter); // CRITICAL: This route MUST be accessible publicly
app.use('/api/superadmin', superadminRouter);

// Debug route to list all available routes
app.get('/api/routes', (req, res) => {
    res.json({
        message: 'Available API routes',
        routes: [
            '/api/auth/login',
            '/api/auth/signup',
            '/api/payment/test',
            '/api/payment/process',
            '/api/inventory',
            '/api/customers',
            '/api/sales',
        ]
    });
});

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