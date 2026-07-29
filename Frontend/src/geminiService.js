// FitScan AI Service â€” All Gemini calls are now proxied through the backend server.
// This avoids CORS issues, keeps the API key secure, and allows server-side background queues.

import i18n from './i18n/index.js';
import { API as BACKEND_URL } from './api/client.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mirror of the backend marker (Backend/routes/analyze.js). A non-food rejection
// travels through the job queue as a plain error string prefixed with this, so
// the caller can tell "you scanned a tablet" apart from a genuine failure.
const NON_FOOD_ERROR_PREFIX = 'NON_FOOD::';

function buildNonFoodError(message) {
  const clean = message.startsWith(NON_FOOD_ERROR_PREFIX)
    ? message.slice(NON_FOOD_ERROR_PREFIX.length)
    : message;
  const error = new Error(clean);
  error.nonFood = true;
  return error;
}

// Transparently polls the backend job status endpoint until completed or failed
async function pollJobStatus(jobId, signal) {
  const maxAttempts = 40; // 60 seconds total timeout
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (signal?.aborted) throw new DOMException('Scan cancelled.', 'AbortError');

    const response = await fetch(`${BACKEND_URL}/api/analyze/status/${jobId}`, {
      method: 'GET',
      credentials: 'include',
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to check background scan status.`);
    }

    const job = await response.json();
    if (job.status === 'completed') {
      return job.result;
    }
    if (job.status === 'failed') {
      const message = job.error || 'Background nutrition analysis failed.';
      if (message.startsWith(NON_FOOD_ERROR_PREFIX)) {
        throw buildNonFoodError(message);
      }
      throw new Error(message);
    }

    attempts++;
    await sleep(1500); // Poll every 1.5 seconds
  }

  throw new Error('Analysis timed out. Please try again.');
}

export async function analyzeFoodImage(imageBase64, userProfile, signal) {
  const lang = i18n.resolvedLanguage || i18n.language || 'en';
  const response = await fetch(`${BACKEND_URL}/api/analyze/image`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept-Language': lang
    },
    credentials: 'include',
    signal,
    body: JSON.stringify({ imageBase64, userProfile, lang }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 403 && err.quotaExceeded) {
      const quotaError = new Error(err.error || 'Scan limit reached. Please upgrade your plan.');
      quotaError.quotaExceeded = true;
      throw quotaError;
    }
    if (response.status === 422 && err.nonFood) {
      throw buildNonFoodError(err.error || 'This is not a food product.');
    }
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  const { id } = await response.json();
  return await pollJobStatus(id, signal);
}

export async function analyzeFoodText(productData, userProfile, signal) {
  const lang = i18n.resolvedLanguage || i18n.language || 'en';
  const response = await fetch(`${BACKEND_URL}/api/analyze/text`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept-Language': lang
    },
    credentials: 'include',
    signal,
    body: JSON.stringify({ productData, userProfile, lang }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 403 && err.quotaExceeded) {
      const quotaError = new Error(err.error || 'Scan limit reached. Please upgrade your plan.');
      quotaError.quotaExceeded = true;
      throw quotaError;
    }
    if (response.status === 422 && err.nonFood) {
      throw buildNonFoodError(err.error || 'This is not a food product.');
    }
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  const { id } = await response.json();
  return await pollJobStatus(id, signal);
}
