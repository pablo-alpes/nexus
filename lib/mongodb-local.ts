/**
 * MongoDB connection adapter that uses local storage when MongoDB is not available
 */

import { useLocalStorage } from './local-storage';

let isConnected = false;

export async function connectDBLocal() {
  if (useLocalStorage()) {
    // Using local storage, no connection needed
    isConnected = true;
    console.log('📁 Using local file-based storage (no MongoDB required)');
    return true;
  }

  // Try to connect to MongoDB
  try {
    const mongoose = require('mongoose');
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
  } catch (error: any) {
    console.log('⚠️  MongoDB connection failed, falling back to local storage');
    console.log('   Error:', error.message);
    process.env.USE_LOCAL_STORAGE = 'true';
    isConnected = true;
    return true;
  }
}

export function isLocalStorage(): boolean {
  return useLocalStorage();
}

export { useLocalStorage } from './local-storage';
