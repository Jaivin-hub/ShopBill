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

// --- UPDATED MIDDLEWARE ---
// Allow multiple origins or use a fallback for development
app.use(cors({
    origin: true, // Dynamically allow the requesting origin
    credentials: true
}));
app.use(express.json());

// --- UPDATED SOCKET.IO CONFIG ---
const io = new Server(server, {
    cors: {
        origin: true, // Set to true to allow any origin in development
        methods: ["GET", "POST"],
        credentials: true
    },
    // Adding these settings helps Render's proxy handle connections
    transports: ['polling', 'websocket'], 
    allowEIO3: true // Support older socket clients if necessary
});

// IMPORTANT: Shared Socket.io instance
app.set('socketio', io);

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
    // Log the transport type to see if it's 'polling' or 'websocket'
    console.log(`🔌 Client connected: ${socket.id} using ${socket.conn.transport.name}`);

    socket.on('join_shop', (shopId) => {
        if (shopId) {
            socket.join(shopId.toString());
            console.log(`🏠 User joined shop room: ${shopId}`);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`❌ Client disconnected: ${socket.id} (Reason: ${reason})`);
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