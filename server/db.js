// db.js



const mongoose = require('mongoose');



const MONGODB_URI = process.env.MONGODB_URI;

/** Atlas database name (not a collection). Default was "test" when URI had no db path. */

const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'pocketpos';



const connectDB = async () => {

    try {

        if (!MONGODB_URI) {

            throw new Error('MONGODB_URI is not set in environment variables');

        }



        await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });

        console.log(`\n✅ MongoDB connected successfully (database: ${MONGODB_DB_NAME}).`);

    } catch (err) {

        console.error(`❌ MongoDB connection failed: ${err.message}`);

        process.exit(1);

    }

};



module.exports = connectDB;


