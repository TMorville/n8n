/**
 * Node: Extract Response Text
 * Type: Code (JavaScript)
 * Position: After Claude Response Call
 *
 * Purpose: Extract text from Claude's response and prepare for Slack posting
 */

const claudeResponse = $input.first().json;
let responseText = '';

if (claudeResponse.content && Array.isArray(claudeResponse.content)) {
  for (const block of claudeResponse.content) {
    if (block.type === 'text') {
      responseText += block.text;
    }
  }
}

if (!responseText) {
  responseText = 'Task completed successfully!';
}

return [{
  json: {
    responseText,
    channelId: $('Extract Context').first().json.channelId,
    threadTs: $('Extract Context').first().json.threadTs
  }
}];