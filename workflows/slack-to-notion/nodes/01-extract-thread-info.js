/**
 * Node: Extract Thread Info
 * Type: Code (JavaScript)
 * Position: After Webhook → Respond to Webhook
 *
 * Purpose: Parse the Slack message shortcut payload and extract thread information
 */

const input = $input.first().json;

// Parse the form-encoded payload from Slack message shortcut
const data = JSON.parse(input.body.payload);

// Extract from message shortcut payload
const message = data.message;
const threadTs = message.thread_ts || message.ts;
const channelId = data.channel.id;
const channelName = data.channel.name;
const userId = data.user.id;
const responseUrl = data.response_url;

// Check if message is in a thread (has replies)
if (!message.reply_count && !message.thread_ts) {
  return [{
    json: {
      error: 'Not a thread message',
      responseUrl: responseUrl
    }
  }];
}

return [{
  json: {
    threadTs,
    channelId,
    channelName,
    userId,
    responseUrl
  }
}];
