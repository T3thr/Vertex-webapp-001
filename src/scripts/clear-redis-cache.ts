import { redisClient as redis } from '@/backend/lib/redis';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const clearCache = async () => {
  console.log('🔌 [Redis] Connecting to client...');
  if (!redis.isOpen) {
    await redis.connect();
  }
  console.log('✅ [Redis] Connected successfully.');

  rl.question('❓ Select cache clearing mode:\n1. Invalidate by pattern (e.g., novel:*)\n2. FLUSH ALL (Deletes all keys!)\nEnter option (1 or 2): ', async (option) => {
    if (option === '1') {
      rl.question('Enter the pattern to invalidate (e.g., novel:*): ', async (pattern) => {
        if (!pattern) {
          console.error('❌ Pattern cannot be empty.');
          rl.close();
          await redis.quit();
          return;
        }
        try {
          console.log(`🗑️  Invalidating cache with pattern: ${pattern}...`);
          const keys = await redis.keys(pattern);
          if (keys.length > 0) {
            await redis.del(keys);
            console.log(`✅ Success! Deleted ${keys.length} keys matching "${pattern}".`);
          } else {
            console.log(`🤷 No keys found matching "${pattern}".`);
          }
        } catch (e) {
          console.error('❌ Error invalidating pattern:', e);
        } finally {
          rl.close();
          await redis.quit();
        }
      });
    } else if (option === '2') {
      rl.question('🛑 Are you sure you want to delete ALL keys from the cache? This cannot be undone. (yes/no): ', async (confirmation) => {
        if (confirmation.toLowerCase() === 'yes') {
          try {
            console.log('🗑️  Flushing all databases...');
            await redis.flushAll();
            console.log('✅ Success! All keys have been deleted.');
          } catch (e) {
            console.error('❌ Error flushing database:', e);
          }
        } else {
          console.log('👍 Operation cancelled.');
        }
        rl.close();
        await redis.quit();
      });
    } else {
      console.log('Invalid option. Exiting.');
      rl.close();
      await redis.quit();
    }
  });
};

clearCache().catch(async (e) => {
  console.error('An unexpected error occurred:', e);
  if (redis.isOpen) {
    await redis.quit();
  }
  process.exit(1);
});
