const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv'); 
const jwt = require('jsonwebtoken'); // Added for socket auth security

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

// --- MIDDLEWARE ---
app.use(cors({
    origin: true, 
    credentials: true
}));
app.use(express.json());

// --- SOCKET.IO CONFIG ---
const io = new Server(server, {
    cors: {
        origin: true,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['polling', 'websocket'], 
    allowEIO3: true,
    pingTimeout: 60000, // Increase timeout for better stability on mobile/slow networks
});

// IMPORTANT: Shared Socket.io instance for routes to access via req.app.get('socketio')
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

// --- SOCKET.IO LOGIC ---

// Optional but Recommended: Socket Middleware for Security
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(); // In dev, you can allow, but production should check
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        console.error("Socket Auth Error:", err.message);
        next(); // Allow connection but won't have socket.user
    }
});

io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id} using ${socket.conn.transport.name}`);

    // The core of your real-time count: Users join a room named after their shopId
    socket.on('join_shop', (shopId) => {
        if (shopId) {
            const roomName = shopId.toString();
            socket.join(roomName);
            console.log(`🏠 User ${socket.id} joined shop room: ${roomName}`);
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
            console.log(`📡 Socket.io Active and Room-ready`);
        });
    } catch (error) {
        console.error('Startup Error:', error);
        process.exit(1);
    }
};

startServer();