import { createClient } from 'redis';

// Create a Redis client pointing to the docker-compose host name
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('connect', () => {
  console.log('🚀 Redis Client Connected Successfully');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

// Connect to the Redis container
await redisClient.connect();

export default redisClient;
