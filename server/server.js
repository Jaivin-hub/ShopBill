const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv'); 
const jwt = require('jsonwebtoken');

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
const scmRoutes = require('./routes/scmRoutes');
const outletRoutes = require('./routes/outletRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// --- MIDDLEWARE ---
const compression = require('compression');
app.use(compression()); // Enable gzip compression for all responses
app.use(cors({
    origin: true, 
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
const path = require('path');
const fs = require('fs');

// Audio uploads
const audioUploadsDir = path.join(__dirname, 'uploads', 'audio');
if (!fs.existsSync(audioUploadsDir)) {
    fs.mkdirSync(audioUploadsDir, { recursive: true });
}
app.use('/uploads/audio', express.static(audioUploadsDir));

// File uploads
const fileUploadsDir = path.join(__dirname, 'uploads', 'files');
if (!fs.existsSync(fileUploadsDir)) {
    fs.mkdirSync(fileUploadsDir, { recursive: true });
}
app.use('/uploads/files', express.static(fileUploadsDir));

// --- SOCKET.IO CONFIG ---
const io = new Server(server, {
    cors: {
        origin: true,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['polling', 'websocket'], 
    allowEIO3: true,
    pingTimeout: 60000, 
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
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/notifications', notificationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/webhooks', webhookRouter);
app.use('/api/scm', scmRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/chat', chatRoutes);

// --- SOCKET.IO LOGIC ---

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next();
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        console.error("Socket Auth Error:", err.message);
        next(); 
    }
});

io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join user-specific room for chat notifications
    if (socket.user && socket.user.id) {
        socket.join(`user_${socket.user.id}`);
        console.log(`👤 Socket ${socket.id} joined user room: user_${socket.user.id}`);
    }

    socket.on('join_shop', (shopId) => {
        if (shopId) {
            const roomName = String(shopId); // Ensure string
            socket.join(roomName);
            console.log(`🏠 Socket ${socket.id} joined Room: ${roomName}`);
        }
    });

    // Join chat room for real-time messaging
    socket.on('join_chat', (chatId) => {
        if (chatId) {
            socket.join(`chat_${chatId}`);
            console.log(`💬 Socket ${socket.id} joined Chat: chat_${chatId}`);
        }
    });

    // Leave chat room
    socket.on('leave_chat', (chatId) => {
        if (chatId) {
            socket.leave(`chat_${chatId}`);
            console.log(`💬 Socket ${socket.id} left Chat: chat_${chatId}`);
        }
    });

    // Handle manual leave if needed
    socket.on('leave_shop', (shopId) => {
        if (shopId) {
            socket.leave(String(shopId));
            console.log(`🚪 Socket ${socket.id} left Room: ${shopId}`);
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
            console.log(`📡 Socket.io Active for Alerts & Resolutions`);
        });
    } catch (error) {
        console.error('Startup Error:', error);
        process.exit(1);
    }
};

startServer();