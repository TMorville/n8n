# Building the n8n Workflow

## Overview

This workflow will:
1. Receive the `/add-to-notion` slash command via webhook
2. Verify the Slack signature for security
3. Fetch all messages in the thread
4. Format the thread for Claude API
5. Summarize the conversation with Claude
6. Create a Notion page with the summary
7. Respond to the user in Slack

## Prerequisites

You'll need to add these credentials in n8n:

### 1. Slack Credentials
- **Bot User OAuth Token**: `xoxb-YOUR-SLACK-BOT-TOKEN`
- **Signing Secret**: (Get from Slack app → Basic Information → App Credentials)

### 2. Anthropic API Key
- Your Claude API key from `.env` file: `sk-ant-api03-...`

### 3. Notion OAuth
- We'll set this up after the workflow is built

## Step-by-Step Workflow Build

### 1. Create New Workflow

1. Go to https://n8n.legacyco2.com
2. Login with: `admin` / `ZN/Z9Aih/BOwdtxJhGZL3A==`
3. Click **+ New Workflow**
4. Name it: "Slack Thread to Notion"

### 2. Add Webhook Trigger

1. Click **Add first step** → Search for "Webhook"
2. Select **Webhook** node
3. Configure:
   - **HTTP Method**: POST
   - **Path**: `add-to-notion`
   - **Authentication**: None (we'll verify manually)
   - **Respond**: Using 'Respond to Webhook' node
4. Note the webhook URL: `https://n8n.legacyco2.com/webhook/add-to-notion`

### 3. Add Slack Signature Verification

For security, we need to verify requests are actually from Slack.

1. Add **Code** node after webhook
2. Name it: "Verify Slack Signature"
3. Paste this code:

```javascript
const crypto = require('crypto');

// Get request details
const timestamp = $input.first().headers['x-slack-request-timestamp'];
const slackSignature = $input.first().headers['x-slack-signature'];
const body = $input.first().body;

// Your Slack Signing Secret (add this as an environment variable in n8n)
const signingSecret = $env.SLACK_SIGNING_SECRET || 'YOUR_SIGNING_SECRET_HERE';

// Check timestamp to prevent replay attacks (within 5 minutes)
const currentTime = Math.floor(Date.now() / 1000);
if (Math.abs(currentTime - timestamp) > 300) {
  throw new Error('Request timestamp is too old');
}

// Create signature base string
const sigBasestring = `v0:${timestamp}:${typeof body === 'string' ? body : JSON.stringify(body)}`;

// Calculate signature
const mySignature = 'v0=' + crypto
  .createHmac('sha256', signingSecret)
  .update(sigBasestring)
  .digest('hex');

// Compare signatures
if (!crypto.timingSafeEqual(
  Buffer.from(mySignature),
  Buffer.from(slackSignature)
)) {
  throw new Error('Invalid signature');
}

// If we get here, signature is valid
return { json: { verified: true, ...body } };
```

### 4. Parse Slash Command Data

1. Add **Code** node
2. Name it: "Extract Thread Info"
3. Code:

```javascript
const body = $input.first().json;

// Parse form-encoded body if needed
let data;
if (typeof body === 'string') {
  const params = new URLSearchParams(body);
  data = Object.fromEntries(params.entries());
} else {
  data = body;
}

// Extract key information
const threadTs = data.thread_ts || data.message_ts; // message_ts if command used in parent
const channelId = data.channel_id;
const userId = data.user_id;
const responseUrl = data.response_url;

// Check if command was used in a thread
if (!data.thread_ts) {
  return [{
    json: {
      error: 'Please use /add-to-notion in a thread, not in the main channel',
      responseUrl: responseUrl
    }
  }];
}

return [{
  json: {
    threadTs,
    channelId,
    userId,
    responseUrl,
    channelName: data.channel_name
  }
}];
```

### 5. Add Error Handler for Non-Thread Usage

1. Add **IF** node after "Extract Thread Info"
2. Configure:
   - **Condition**: `{{ $json.error }}` exists
3. For the **true** branch:
   - Add **HTTP Request** node
   - Method: POST
   - URL: `{{ $json.responseUrl }}`
   - Body:
     ```json
     {
       "text": "❌ {{ $json.error }}",
       "response_type": "ephemeral"
     }
     ```
   - Then add **No Op** node to end this branch

### 6. Fetch Thread Messages (false branch from IF)

1. Add **HTTP Request** node on the **false** branch
2. Name it: "Get Thread Messages"
3. Configure:
   - **Method**: POST
   - **URL**: `https://slack.com/api/conversations.replies`
   - **Authentication**: Generic Credential Type → Header Auth
     - **Name**: Authorization
     - **Value**: `Bearer xoxb-YOUR-SLACK-BOT-TOKEN`
   - **Send Body**: Yes
   - **Body Content Type**: JSON
   - **Specify Body**: Using JSON
   - **JSON**:
     ```json
     {
       "channel": "={{ $json.channelId }}",
       "ts": "={{ $json.threadTs }}"
     }
     ```

### 7. Get User Information for Names

1. Add **Split Out** node
2. Field: `messages`
3. Add **HTTP Request** node
4. Name it: "Get User Info"
5. Configure:
   - **Method**: GET
   - **URL**: `https://slack.com/api/users.info?user={{ $json.user }}`
   - **Authentication**: Same Header Auth as before
6. Add **Aggregate** node to combine results back

### 8. Format Thread for Claude

1. Add **Code** node
2. Name it: "Format Thread for Claude"
3. Code:

```javascript
const messages = $input.all();

// Sort by timestamp
messages.sort((a, b) => parseFloat(a.json.ts) - parseFloat(b.json.ts));

// Format messages with usernames and timestamps
const formattedMessages = messages.map(msg => {
  const userName = msg.json.user_info?.user?.real_name ||
                   msg.json.user_info?.user?.name ||
                   'Unknown User';
  const timestamp = new Date(parseFloat(msg.json.ts) * 1000)
    .toLocaleString('en-US', {
      timeZone: 'Europe/Copenhagen',
      dateStyle: 'short',
      timeStyle: 'short'
    });
  const text = msg.json.text;

  return `[${timestamp}] ${userName}: ${text}`;
}).join('\n\n');

return [{
  json: {
    threadText: formattedMessages,
    messageCount: messages.length,
    firstMessage: messages[0].json,
    channelId: messages[0].json.channel || $('Extract Thread Info').first().json.channelId,
    threadTs: messages[0].json.thread_ts || messages[0].json.ts
  }
}];
```

### 9. Summarize with Claude API

1. Add **HTTP Request** node
2. Name it: "Claude Summarization"
3. Configure:
   - **Method**: POST
   - **URL**: `https://api.anthropic.com/v1/messages`
   - **Authentication**: Generic Credential Type → Header Auth
     - **Name**: x-api-key
     - **Value**: `sk-ant-api03-YOUR-ANTHROPIC-API-KEY`
   - **Send Headers**: Yes
     - **anthropic-version**: `2023-06-01`
   - **Body Content Type**: JSON
   - **JSON**:
     ```json
     {
       "model": "claude-3-5-sonnet-20241022",
       "max_tokens": 2000,
       "messages": [
         {
           "role": "user",
           "content": "You are summarizing a Slack conversation thread. Provide a comprehensive summary that captures:\n\n1. **Context**: What was the discussion about?\n2. **Key Points**: Main topics and information shared\n3. **Decisions Made**: Any conclusions or agreements reached\n4. **Action Items**: Tasks or follow-ups mentioned (with owners if stated)\n5. **Participants**: Who was involved in the discussion\n\nKeep the summary clear and scannable. Use bullet points where appropriate.\n\nHere is the thread:\n\n={{ $json.threadText }}"
         }
       ]
     }
     ```

### 10. Extract Summary and Generate Title

1. Add **Code** node
2. Name it: "Process Claude Response"
3. Code:

```javascript
const claudeResponse = $input.first().json;
const summary = claudeResponse.content[0].text;

// Extract first sentence or key phrase for title
const firstLine = summary.split('\n').find(line => line.trim().length > 0) || 'Slack Thread Summary';
const title = firstLine
  .replace(/^#+\s*/, '') // Remove markdown headers
  .replace(/^\*\*/, '') // Remove bold markers
  .substring(0, 100); // Limit length

return [{
  json: {
    summary,
    title,
    claudeResponse,
    threadData: $('Format Thread for Claude').first().json
  }
}];
```

### 11. Create Notion Page

1. Add **Notion** node
2. Configure:
   - **Authentication**: OAuth2 (we'll set up credentials next)
   - **Resource**: Page
   - **Operation**: Create
   - **Database ID**: (We'll get this when setting up Notion)
   - **Title**: `={{ $json.title }}`
   - **Simple Properties**:
     - **Summary** (Rich Text): `={{ $json.summary }}`
     - **Channel** (Text): `={{ $json.threadData.channelId }}`
     - **Date** (Date): `={{ new Date().toISOString().split('T')[0] }}`
     - **Slack Link** (URL): `=https://wearelegacydk.slack.com/archives/{{ $json.threadData.channelId }}/p{{ $json.threadData.threadTs.replace('.', '') }}`

### 12. Respond to Slack

1. Add **Respond to Webhook** node
2. Configure:
   - **Respond With**: JSON
   - **Response Body**:
     ```json
     {
       "response_type": "ephemeral",
       "text": "✅ Thread summary added to Notion!",
       "blocks": [
         {
           "type": "section",
           "text": {
             "type": "mrkdwn",
             "text": "*✅ Thread summary added to Notion!*\n\n📝 *{{ $json.title }}*\n\n🔗 View in Notion"
           }
         }
       ]
     }
     ```

### 13. Save and Activate

1. Click **Save** in the top right
2. Toggle the workflow to **Active**
3. The webhook is now live!

## Environment Variables Setup

You need to add the Slack Signing Secret as an environment variable:

1. SSH to your VM:
   ```bash
   gcloud compute ssh n8n-server --zone=europe-west4-a --project=slack-notion-93434
   ```

2. Edit the .env file:
   ```bash
   nano ~/.env
   ```

3. Add this line (get signing secret from Slack app → Basic Information):
   ```
   SLACK_SIGNING_SECRET=your_signing_secret_here
   ```

4. Restart n8n:
   ```bash
   docker compose restart
   ```

## Testing the Workflow

1. Go to any Slack channel in wearelegacydk.slack.com
2. Create a thread with 3-4 messages
3. In the thread, type `/add-to-notion`
4. You should see: "✅ Thread summary added to Notion!"

## Troubleshooting

### Signature verification fails
- Check that SLACK_SIGNING_SECRET is set correctly
- Verify the signing secret matches the one in Slack app settings
- Check n8n logs: `docker compose logs n8n`

### "Please use in a thread" error
- Make sure you're using the command inside a thread, not in the main channel
- The command must be used in a reply, not on a parent message

### Claude API errors
- Verify the API key is correct in the HTTP Request node
- Check Claude API rate limits
- Verify the anthropic-version header is set

### Notion integration not working
- Follow the Notion setup guide (06-notion-setup.md) to configure OAuth
- Verify the database ID is correct
- Check that the database has all required properties

## Next Steps

1. Get your Slack Signing Secret and add it to environment variables
2. Set up Notion OAuth integration (see `06-notion-setup.md`)
3. Test the complete workflow end-to-end
4. Monitor n8n execution logs for any issues

## Workflow Architecture

```
Webhook Trigger
    ↓
Verify Slack Signature (Security)
    ↓
Extract Thread Info
    ↓
    IF error? → Respond with error message
    ELSE ↓
    Fetch Thread Messages from Slack API
    ↓
    Get User Info for each message
    ↓
    Format Thread for Claude
    ↓
    Call Claude API for Summarization
    ↓
    Process Response & Generate Title
    ↓
    Create Notion Page
    ↓
    Respond to Webhook with Success
```
