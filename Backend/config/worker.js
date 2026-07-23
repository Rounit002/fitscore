const { Worker } = require('bullmq');
const { useRedis, redisConnection } = require('./queue');

// Unified processing logic shared between BullMQ and In-Memory fallback
const processJob = async (jobName, data) => {
  // Dynamically require analyze route logic to avoid circular dependencies
  const analyzeProcessor = require('../routes/analyze');

  if (jobName === 'analyzeImage') {
    return await analyzeProcessor.processImageAnalysis(data);
  } else if (jobName === 'analyzeText') {
    return await analyzeProcessor.processTextAnalysis(data);
  } else {
    throw new Error(`Unknown job name: ${jobName}`);
  }
};

// Initialize BullMQ background worker only if Redis Connection is Active
if (useRedis && redisConnection) {
  console.log('[FitScan Worker] Starting BullMQ background worker on "analysis" queue...');
  
  const worker = new Worker('analysis', async (job) => {
    return await processJob(job.name, job.data);
  }, {
    connection: redisConnection,
    concurrency: 2, // Concurrency limit to prevent hitting Gemini rate limits
  });

  worker.on('completed', (job) => {
    console.log(`[FitScan Worker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[FitScan Worker] Job ${job.id} failed:`, err.message);
  });
}

module.exports = {
  processJob,
};
