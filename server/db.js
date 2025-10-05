// db.js

const mongoose = require('mongoose');

// IMPORTANT: Replace this placeholder with your actual MongoDB connection string.
// If you are using MongoDB Atlas, get the connection URL from your cluster.
const MONGODB_URI = 'mongodb://localhost:27017/shopmanagerdb'; 
// Alternatively, use a hosted service URI: 'mongodb+srv://<user>:<password>@<cluster-url>/shopmanagerdb?retryWrites=true&w=majority'

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log(`\n✅ MongoDB connected successfully.`);

    } catch (err) {
        console.error(`❌ MongoDB connection failed: ${err.message}`);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;
