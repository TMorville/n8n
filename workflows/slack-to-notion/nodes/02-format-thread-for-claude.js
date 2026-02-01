/**
 * Node: Format Thread for Claude
 * Type: Code (JavaScript)
 * Position: After Get Thread Messages HTTP Request
 *
 * Purpose: Format Slack messages into readable text for Claude API
 */

const response = $input.first().json;

// Check if Slack API call was successful
if (!response.ok) {
  throw new Error(`Slack API error: ${response.error || 'Unknown error'}`);
}

const messages = response.messages;

if (!messages || !Array.isArray(messages)) {
  throw new Error('No messages found in response');
}

// Format messages with timestamps
const formattedMessages = messages.map(msg => {
  const timestamp = new Date(parseFloat(msg.ts) * 1000).toLocaleString('en-US', {
    timeZone: 'Europe/Copenhagen',
    dateStyle: 'short',
    timeStyle: 'short'
  });
  const userId = msg.user;
  const text = msg.text;
  return `[${timestamp}] User ${userId}: ${text}`;
}).join('\n\n');

return [{
  json: {
    threadText: formattedMessages,
    messageCount: messages.length,
    responseUrl: $('Extract Thread Info').first().json.responseUrl
  }
}];
