const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifetrack';
  await mongoose.connect(uri);
  console.log(`[db] connected to ${uri}`);
  return mongoose.connection;
}

module.exports = { connectDB };
