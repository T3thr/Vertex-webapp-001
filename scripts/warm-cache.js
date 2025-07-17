#!/usr/bin/env node

// scripts/warm-cache.js
// Cache warming script สำหรับ production deployment

const { createClient } = require('redis');

// Redis configuration
const redis = createClient({
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || 'ziqfbKaZwyQ1tiJjnjJHtHauV7BtUdbi',
  socket: {
    host: process.env.REDIS_HOST || 'redis-16974.crce194.ap-seast-1-1.ec2.redns.redis-cloud.com',
    port: parseInt(process.env.REDIS_PORT || '16974'),
  }
});

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Critical endpoints to warm up
const CRITICAL_ENDPOINTS = [
  '/api/novels?filter=trending&limit=8',
  '/api/novels?filter=published&limit=8',
  '/api/novels?filter=promoted&limit=8',
  '/api/novels?filter=completed&limit=8',
];

async function warmUpCache() {
  console.log('🔥 Starting cache warming process...');
  
  try {
    // Connect to Redis
    await redis.connect();
    console.log('✅ Connected to Redis');

    // Warm up critical endpoints
    const promises = CRITICAL_ENDPOINTS.map(async (endpoint) => {
      try {
        console.log(`🌡️ Warming up: ${endpoint}`);
        const response = await fetch(`${API_BASE}${endpoint}`, {
          headers: {
            'User-Agent': 'Cache-Warmer/1.0',
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          console.log(`✅ Warmed up: ${endpoint} (${response.status})`);
        } else {
          console.warn(`⚠️ Failed to warm: ${endpoint} (${response.status})`);
        }
      } catch (error) {
        console.error(`❌ Error warming ${endpoint}:`, error.message);
      }
    });

    await Promise.allSettled(promises);
    
    console.log('🔥 Cache warming completed successfully!');
    
  } catch (error) {
    console.error('❌ Cache warming failed:', error.message);
    process.exit(1);
  } finally {
    await redis.disconnect();
  }
}

// Health check function
async function healthCheck() {
  try {
    await redis.connect();
    await redis.ping();
    console.log('✅ Redis health check passed');
    await redis.disconnect();
    return true;
  } catch (error) {
    console.error('❌ Redis health check failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'health':
      await healthCheck();
      break;
    case 'warm':
    default:
      await warmUpCache();
      break;
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n⏹️ Cache warming interrupted');
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️ Cache warming terminated');
  await redis.disconnect();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { warmUpCache, healthCheck }; 