const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    await mongoose.connect(MONGODB_URI, {
      dbName: process.env.DB_NAME || 'superb',
    });
    
    console.log('1. MongoDB Atlas connected successfully');
    console.log('2. Database:', mongoose.connection.db.databaseName);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
