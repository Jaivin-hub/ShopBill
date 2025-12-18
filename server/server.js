const express = require('express');
const http = require('http'); // Required for Socket.io
const { Server } = require('socket.io'); // Required for Socket.io
const cors = require('cors');
const dotenv = require('dotenv'); 

dotenv.config();

// Import DB connection
const connectDB = require('./db'); 

// Import Routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const salesRoutes = require('./routes/salesRoutes');
const reportRoutes = require('./routes/reportRoutes');
// Updated: notificationRoutes now exports { router, emitAlert }
const { router: notificationRoutes } = require('./routes/notificationRoutes'); 
const staffRoutes = require('./routes/staffRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); 
const webhookRouter = require('./routes/webhookRouter');

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP Server to wrap Express app
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: '*', // In production, replace with your frontend URL
        methods: ["GET", "POST"]
    }
});

// Attach io to app so it's accessible in all routes via req.app.get('socketio')
app.set('socketio', io);

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
app.use('/api/webhooks', webhookRouter);

// ----------------------------------------------------
// --- SOCKET.IO EVENT HANDLING ---
// ----------------------------------------------------



io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Multitenancy: Users join a room based on their Shop ID
    socket.on('join_shop', (shopId) => {
        if (shopId) {
            socket.join(shopId.toString());
            console.log(`🏠 Socket ${socket.id} joined shop room: ${shopId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// Debug route to list all available routes
app.get('/api/routes', (req, res) => {
    res.json({
        message: 'Available API routes',
        routes: [
            '/api/auth/login',
            '/api/auth/signup',
            '/api/payment/process',
            '/api/inventory',
            '/api/customers',
            '/api/sales',
            '/api/notifications/alerts'
        ]
    });
});

// --- Server Initialization ---
const startServer = async () => {
    try {
        await connectDB(); 
        
        // Start the HTTP server (which includes Socket.io), not app.listen
        server.listen(PORT, () => {
            console.log(`\n======================================================`);
            console.log(`🚀 MERN Shop API Server running on port ${PORT}`);
            console.log(`📡 Real-time WebSockets enabled`);
            console.log(`Frontend should connect to http://localhost:${PORT}`);
            console.log(`======================================================\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();