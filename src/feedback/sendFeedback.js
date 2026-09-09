const DEFAULT_FEEDBACK_ENDPOINT =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8081/api/feedback.php'
    : '/api/feedback.php';

export async function sendFeedback(report) {
  const endpoint =
    process.env.REACT_APP_FEEDBACK_API_URL || DEFAULT_FEEDBACK_ENDPOINT;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(report),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    // Keep the HTTP status as the main error if the server returned non-JSON.
  }

  if (!response.ok || !payload?.saved) {
    const message = payload?.error || `Feedback request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}
