/**
 * Node: Extract Context
 * Type: Code (JavaScript)
 * Position: After Webhook
 *
 * Purpose: Parse app_mention event payload and extract command + thread context
 */

const input = $input.first().json;

// Handle different possible payload structures
let event;

// Case 1: Direct event object (if webhook already parsed JSON)
if (input.event) {
  event = input.event;
}
// Case 2: Body contains the actual payload
else if (input.body) {
  const parsed = typeof input.body === 'string' ? JSON.parse(input.body) : input.body;
  event = parsed.event;
}
// Case 3: Input IS the event
else if (input.type === 'app_mention') {
  event = input;
}
else {
  throw new Error('Unable to parse event structure. Check execution logs for input structure.');
}

if (!event) {
  throw new Error('No event found in payload');
}

// CRITICAL: Ignore bot's own messages to prevent infinite loop
// Get bot_id from the parsed payload or check if user is a bot
if (event.bot_id || (input.authorizations && input.authorizations[0] && event.user === input.authorizations[0].user_id)) {
  // This is from the bot itself, skip processing
  return [];
}

const channelId = event.channel;
const userId = event.user;
const eventTs = event.ts;
const text = event.text;

// Extract thread_ts (if this is in a thread) or use event ts as thread root
const threadTs = event.thread_ts || event.ts;

// Remove bot mention from text to get the actual command
// Bot mention format: <@U123456789> command text
const botMentionPattern = /<@[A-Z0-9]+>/g;
const command = text.replace(botMentionPattern, '').trim();

// Check if command is empty
if (!command) {
  return [{
    json: {
      error: 'Empty command',
      channelId,
      threadTs,
      eventTs
    }
  }];
}

return [{
  json: {
    channelId,
    threadTs,
    eventTs,
    userId,
    command,
    originalText: text
  }
}];
