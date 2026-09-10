const DEFAULT_LEARNING_ENDPOINT =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8081/api/learning.php'
    : '/api/learning.php';

export async function sendLearningRecord(record) {
  const endpoint = process.env.REACT_APP_LEARNING_API_URL || DEFAULT_LEARNING_ENDPOINT;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    // Keep HTTP status as the main error if the server returned non-JSON.
  }

  if (!response.ok || !payload?.saved) {
    const error = new Error(payload?.error || `Learning log request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return payload;
}
