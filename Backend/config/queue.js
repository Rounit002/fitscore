const { Queue } = require('bullmq');
const Redis = require('ioredis');

const useRedis = !!process.env.REDIS_URL;
let queue = null;
let redisConnection = null;

const jobsStore = new Map();

// Helper to generate unique IDs for in-memory jobs
const generateJobId = () => `mem_${Math.random().toString(36).substring(2, 15)}`;

// Setup Redis & BullMQ if REDIS_URL is configured
if (useRedis) {
  try {
    console.log('[FitScan Queue] REDIS_URL detected. Initializing BullMQ connection...');
    redisConnection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    
    redisConnection.on('error', (err) => {
      console.error('[FitScan Queue] Redis client error:', err.message);
    });

    queue = new Queue('analysis', {
      connection: redisConnection,
    });
    console.log('[FitScan Queue] BullMQ successfully initialized.');
  } catch (err) {
    console.error('[FitScan Queue] Failed to initialize Redis queue, falling back to In-Memory:', err.message);
  }
} else {
  console.log('[FitScan Queue] No REDIS_URL detected. Running in secure In-Memory queue mode.');
}

// Add job to the queue
const addAnalysisJob = async (jobName, data) => {
  if (useRedis && queue) {
    const job = await queue.add(jobName, data, {
      removeOnComplete: true,
      removeOnFail: false,
    });
    return { id: job.id, status: 'queued' };
  } else {
    const jobId = generateJobId();
    const job = {
      id: jobId,
      name: jobName,
      data,
      status: 'queued',
      result: null,
      error: null,
      createdAt: new Date(),
    };
    jobsStore.set(jobId, job);
    
    // Asynchronously trigger job execution in the background thread
    processInMemoryJob(jobId);
    
    return { id: jobId, status: 'queued' };
  }
};

// Add a pre-completed cache-hit job directly to jobsStore
const addPreCompletedJob = (result) => {
  const jobId = `cache_${Math.random().toString(36).substring(2, 15)}`;
  const job = {
    id: jobId,
    name: 'cachedAnalysis',
    data: {},
    status: 'completed',
    result,
    error: null,
    createdAt: new Date(),
  };
  jobsStore.set(jobId, job);
  return { id: jobId, status: 'completed' };
};

// Retrieve job status
const getJobStatus = async (jobId) => {
  if (useRedis && queue) {
    // If it's a Redis job
    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        // Fallback to checking in-memory cache-hit store
        const memJob = jobsStore.get(jobId);
        if (memJob) {
          return {
            id: memJob.id,
            status: memJob.status,
            result: memJob.result,
            error: memJob.error,
          };
        }
        return null;
      }
      
      const state = await job.getState();
      return {
        id: job.id,
        status: state, // 'completed', 'failed', 'active', 'waiting', etc.
        result: job.returnvalue,
        error: job.failedReason,
      };
    } catch (err) {
      console.error('[FitScan Queue] Error fetching job state from Redis:', err.message);
      return null;
    }
  } else {
    const job = jobsStore.get(jobId);
    if (!job) return null;
    return {
      id: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
    };
  }
};

// Run local In-Memory job processing
const processInMemoryJob = async (jobId) => {
  // Use setImmediate to let Express return the response instantly before starting execution
  setImmediate(async () => {
    const job = jobsStore.get(jobId);
    if (!job) return;
    
    job.status = 'active';
    try {
      const { processJob } = require('./worker');
      const result = await processJob(job.name, job.data);
      job.status = 'completed';
      job.result = result;
    } catch (err) {
      console.error(`[FitScan Queue] Job ${jobId} failed in-memory:`, err.message);
      job.status = 'failed';
      job.error = err.message;
    }
  });
};

module.exports = {
  addAnalysisJob,
  addPreCompletedJob,
  getJobStatus,
  // Exported for Redis Worker instantiation
  redisConnection,
  useRedis,
  // Helper for Redis job updates in worker
  jobsStore,
};
