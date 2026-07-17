const { createClient } = require('redis');
const dotenv = require('dotenv');
dotenv.config();

let client = null;
let isReady = false;

if (process.env.REDIS_URL) {
  client = createClient({
    url: process.env.REDIS_URL
  });
  
  client.on('error', (err) => {
    console.warn('⚠️ Redis Client Error:', err.message);
    isReady = false;
  });
  
  client.on('connect', () => {
    console.log('🔄 Redis Connecting...');
  });
  
  client.on('ready', () => {
    console.log('✅ Redis Connected & Ready');
    isReady = true;
  });
  
  client.connect().catch((err) => {
    console.warn('⚠️ Redis connection failed. Caching will be disabled.');
  });
}

module.exports = {
  get: async (key) => {
    if (!isReady || !client) return null;
    try {
      return await client.get(key);
    } catch (err) {
      console.warn('Redis GET failed:', err.message);
      return null;
    }
  },
  set: async (key, value, options) => {
    if (!isReady || !client) return null;
    try {
      return await client.set(key, JSON.stringify(value), options);
    } catch (err) {
      console.warn('Redis SET failed:', err.message);
      return null;
    }
  },
  del: async (key) => {
    if (!isReady || !client) return null;
    try {
      return await client.del(key);
    } catch (err) {
      console.warn('Redis DEL failed:', err.message);
      return null;
    }
  },
  isReady: () => isReady
};