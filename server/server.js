const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv'); 

dotenv.config();
const connectDB = require('./db'); 

// Route Imports
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const salesRoutes = require('./routes/salesRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { router: notificationRoutes } = require('./routes/notificationRoutes'); 
const staffRoutes = require('./routes/staffRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); 
const webhookRouter = require('./routes/webhookRouter');

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io with updated CORS for Production
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*", 
        methods: ["GET", "POST"],
        credentials: true
    }
});

// IMPORTANT: Shared Socket.io instance
app.set('socketio', io);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
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

// Socket.io Logic
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('join_shop', (shopId) => {
        if (shopId) {
            socket.join(shopId.toString());
            console.log(`🏠 User joined shop room: ${shopId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// Server Start
const startServer = async () => {
    try {
        await connectDB(); 
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 Socket.io Active`);
        });
    } catch (error) {
        console.error('Startup Error:', error);
        process.exit(1);
    }
};

startServer();