/**
 * CommonJS wrapper for mongodb-local.ts
 * Allows scripts to use require() instead of import
 */

// This will be handled by Next.js/TypeScript compilation
// For scripts, we'll use a runtime approach
const mongoose = require('mongoose');

let isConnected = false;

async function connectDBLocal() {
  // Check if we should use local storage
  const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.MONGODB_URI;
  
  if (USE_LOCAL_STORAGE) {
    isConnected = true;
    console.log('📁 Using local file-based storage (no MongoDB required)');
    return true;
  }

  // Try to connect to MongoDB
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not set, falling back to local storage');
      process.env.USE_LOCAL_STORAGE = 'true';
      isConnected = true;
      return true;
    }

    if (mongoose.connection.readyState === 1) {
      isConnected = true;
      return true;
    }

    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.log('⚠️  MongoDB connection failed, falling back to local storage');
    console.log('   Error:', error.message);
    process.env.USE_LOCAL_STORAGE = 'true';
    isConnected = true;
    return true;
  }
}

function isLocalStorage() {
  return process.env.USE_LOCAL_STORAGE === 'true' || !process.env.MONGODB_URI;
}

module.exports = {
  connectDBLocal,
  isLocalStorage,
};
