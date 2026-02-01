/**
 * Node: Post Acknowledgment
 * Type: Code (JavaScript)
 * Position: After Extract Context (before Get Thread Messages)
 *
 * Purpose: Immediately post "Working on it..." to Slack so user knows bot is processing
 * This provides instant feedback while the workflow executes (which can take 10-30 seconds)
 *
 * IMPORTANT: This node sends the acknowledgment via HTTP but returns the ORIGINAL
 * Extract Context data so downstream nodes (Get Thread Messages, etc.) work correctly
 */

// Get context from Extract Context node
const contextData = $input.first().json;

// Send acknowledgment using $http helper (available in n8n Code nodes)
try {
  await $http.request({
    method: 'POST',
    url: 'https://slack.com/api/chat.postMessage',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + $('Post Acknowledgment').credentials.httpHeaderAuth.token
    },
    body: {
      channel: contextData.channelId,
      thread_ts: contextData.threadTs,
      text: "👍 Got it! Working on that now..."
    },
    json: true
  });
} catch (err) {
  console.log('Acknowledgment post failed (non-fatal):', err.message);
}

// Return ORIGINAL context data so downstream nodes work correctly
return [{
  json: contextData
}];
