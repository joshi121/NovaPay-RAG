import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { sendTransactionEmail, sendTransactionFailureEmail } from '../services/email.service.js';

// 1. Create a persistent Redis connection for BullMQ using ioredis
const queueConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null // Required by BullMQ specifications
});

// 2. Initialize the BullMQ Job Queue
export const emailQueue = new Queue('emailQueue', {
  connection: queueConnection
});

// 3. Initialize the Background Worker to process queue jobs asynchronously
const emailWorker = new Worker('emailQueue', async (job) => {
  const { type, email, name, amount, toAccount } = job.data;
  console.log(`[QUEUE WORKER] Processing job ${job.id} of type "${type}" for user: ${email}`);

  try {
    if (type === 'SUCCESS') {
      await sendTransactionEmail(email, name, amount, toAccount);
      console.log(`[QUEUE WORKER] Success email sent successfully for job ${job.id}`);
    } else if (type === 'FAILURE') {
      await sendTransactionFailureEmail(email, name, amount, toAccount);
      console.log(`[QUEUE WORKER] Failure email sent successfully for job ${job.id}`);
    }
  } catch (error) {
    console.error(`[QUEUE WORKER] ❌ Failed to process email job ${job.id}:`, error.message);
    throw error; // Let BullMQ handle automatic retries
  }
}, {
  connection: queueConnection
});

emailWorker.on('failed', (job, err) => {
  console.error(`[QUEUE WORKER] Job ${job?.id} failed definitively:`, err.message);
});

emailWorker.on('completed', (job) => {
  console.log(`[QUEUE WORKER] Job ${job.id} completed successfully`);
});
