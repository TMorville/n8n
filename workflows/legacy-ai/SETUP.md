# LegacyAI Setup Guide

Complete setup instructions for building and deploying the LegacyAI Slack bot.

## Prerequisites

- Self-hosted n8n instance with HTTPS (v1.123.4+)
- Slack workspace admin access
- Anthropic API key
- Notion workspace with databases created
- Environment: `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`

---

## Step 1: Update Slack App (5 minutes)

### Apply Updated Manifest

1. Go to https://api.slack.com/apps
2. Select your "Thread to Notion" app
3. Click **"App Manifest"** in left sidebar
4. Replace with the updated manifest from `/slack-app-manifest.yaml` in the root directory

**Key changes:**
- Display name: "LegacyAI"
- Bot display name: "LegacyAI" (always_online: true)
- New scopes: `app_mentions:read`, `chat:write`
- Event subscriptions: `app_mention`, `message.channels`, `message.groups`
- Webhook URL: `https://n8n.legacyco2.com/webhook/legacy-ai`

### Reinstall App

1. Click **"Save Changes"**
2. Slack will prompt to **"Reinstall to Workspace"**
3. Review new permissions
4. Click **"Allow"**

### Verify Event Subscriptions

1. Go to **"Event Subscriptions"** in left sidebar
2. Verify Request URL: `https://n8n.legacyco2.com/webhook/legacy-ai`
3. Once workflow is active, you'll see a green "Verified" checkmark

---

## Step 2: Build n8n Workflow (30-60 minutes)

The workflow has 17 nodes total. Build them in order:

### 2.1 Core Flow (Nodes 1-8)

**1. Webhook Node**
- Type: Webhook
- Method: POST
- Path: `legacy-ai`
- Response Mode: When Last Node Finishes

**2. Extract Context (Code)**
```javascript
// Copy from: nodes/01-extract-context.js
```
Parses app_mention event, extracts command from @mention text.

**3. Get Thread Messages (HTTP Request)**
- Method: POST
- URL: `https://slack.com/api/conversations.replies`
- Auth: Header Auth (Slack Bot Token)
- Query Parameters (Expression mode):
  - `channel`: `={{ $json.channelId }}`
  - `ts`: `={{ $json.threadTs }}`

**4. Format Thread for Claude (Code)**
```javascript
// Use same code from slack-to-notion workflow
// Validates Slack API response and formats messages
```

**5. Build Notion Context (Code)**
```javascript
// Copy from: nodes/02-build-notion-context.js
```
Creates context string with all 3 Notion databases.

**6. Claude Planning (Code)**
```javascript
// Copy from: nodes/03-claude-planning.js
```
Builds first Claude request with ALL 4 tool definitions.

**7. Claude Planning Call (HTTP Request)**
- Method: POST
- URL: `https://api.anthropic.com/v1/messages`
- Auth: Header Auth (Claude API Key)
- Headers: `anthropic-version: 2023-06-01`
- Body (Expression mode): `={{ JSON.stringify($json) }}`

**8. Parse Tool Calls (Code)**
```javascript
// Copy from: nodes/04-parse-tool-calls.js
```
Extracts tool_use blocks and checks for direct responses.

### 2.2 Branching Logic (Nodes 9-10)

**9. IF Has Tool Calls (IF Node)**
- Condition: `={{ $json.hasToolCalls }}` equals `true`
- TRUE path → Switch Tool (node 10)
- FALSE path → Post Direct Response (node 17)

**10. Switch Tool (Switch Node)**
- Mode: Expression
- Output: `={{ $json.toolCalls[0].name }}`
- Create 4 routing rules:
  - Output 0: `notion-search` → MCP Search
  - Output 1: `notion-create-pages` → MCP Create
  - Output 2: `notion-fetch` → MCP Fetch
  - Output 3: `notion-update-page` → MCP Update

### 2.3 MCP Tool Execution (Nodes 11-14)

Create 4 MCP Client nodes, one for each tool:

**11. MCP Search (connected to Switch output 0)**
- Type: MCP Client Tool
- Endpoint: `https://mcp.notion.com/mcp`
- Auth: MCP OAuth2 API
- Tool: `notion-search`
- Input Mode: JSON
- JSON Input: `={{ JSON.stringify($('Parse Tool Calls').first().json.toolCalls[0].input) }}`

**12. MCP Create (connected to Switch output 1)**
- Same config as MCP Search
- Tool: `notion-create-pages`

**13. MCP Fetch (connected to Switch output 2)**
- Same config as MCP Search
- Tool: `notion-fetch`

**14. MCP Update (connected to Switch output 3)**
- Same config as MCP Search
- Tool: `notion-update-page`

### 2.4 Format Tool Results (Nodes after each MCP)

After EACH of the 4 MCP nodes, add a "Format Tool Result" code node:

```javascript
const parseToolCallsData = $('Parse Tool Calls').first().json;
const toolCall = parseToolCallsData.toolCalls[0];
const mcpResult = $input.first().json;

return [{
  json: {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    result: mcpResult
  }
}];
```

You'll have 4 of these nodes total (one after each MCP tool).

### 2.5 Response Generation (Nodes 15-17)

**15. Merge Node**
- Type: Merge
- Mode: Merge By Position
- Connect all 4 "Format Tool Result" nodes to this

**16. Build Claude Response (Code)**
```javascript
const parseToolCallsData = $('Parse Tool Calls').first().json;
const toolResults = $input.all().map(item => ({
  type: "tool_result",
  tool_use_id: item.json.toolCallId,
  content: JSON.stringify(item.json.result, null, 2)
}));

const messages = [
  {
    role: "user",
    content: `You are LegacyAI. User command: "${parseToolCallsData.originalCommand}"\n\nThread context:\n${parseToolCallsData.originalThread}`
  },
  {
    role: "assistant",
    content: parseToolCallsData.originalClaudeResponse
  },
  {
    role: "user",
    content: toolResults
  }
];

return [{
  json: {
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages,
    system: "You are LegacyAI, a helpful assistant for Legacy. Provide a clear, concise response to the user based on the tool results. Format your response in Slack-friendly markdown."
  }
}];
```

**17. Claude Response Call (HTTP Request)**
- Same config as Claude Planning Call (node 7)
- Body: `={{ JSON.stringify($json) }}`

**18. Post to Slack (HTTP Request)**
- Method: POST
- URL: `https://slack.com/api/chat.postMessage`
- Auth: Header Auth (Slack Bot Token)
- Headers: `Content-Type: application/json`
- Body (Expression mode):
```javascript
{{
  JSON.stringify({
    channel: $('Extract Context').first().json.channelId,
    thread_ts: $('Extract Context').first().json.threadTs,
    text: $json.content[0].text
  })
}}
```

**19. Post Direct Response (HTTP Request)**
- Connected from IF node FALSE output
- Same config as Post to Slack
- Body (Expression mode):
```javascript
{{
  JSON.stringify({
    channel: $('Extract Context').first().json.channelId,
    thread_ts: $('Extract Context').first().json.threadTs,
    text: $('Parse Tool Calls').first().json.directResponseText
  })
}}
```

### 2.6 Node Connections Summary

```
1 Webhook → 2 Extract Context
2 Extract Context → 3 Get Thread Messages
3 Get Thread Messages → 4 Format Thread
4 Format Thread → 5 Build Notion Context
5 Build Notion Context → 6 Claude Planning
6 Claude Planning → 7 Claude Planning Call
7 Claude Planning Call → 8 Parse Tool Calls
8 Parse Tool Calls → 9 IF Has Tool Calls

9 IF (TRUE) → 10 Switch Tool
9 IF (FALSE) → 19 Post Direct Response

10 Switch (output 0) → 11 MCP Search → Format Result → 15 Merge
10 Switch (output 1) → 12 MCP Create → Format Result → 15 Merge
10 Switch (output 2) → 13 MCP Fetch → Format Result → 15 Merge
10 Switch (output 3) → 14 MCP Update → Format Result → 15 Merge

15 Merge → 16 Build Claude Response
16 Build Claude Response → 17 Claude Response Call
17 Claude Response Call → 18 Post to Slack
```

---

## Step 3: Configure Credentials

### Slack Bot Token (Header Auth)
- Name: `Authorization`
- Value: `Bearer xoxb-922705511143-...` (your token)
- Used in: Get Thread Messages, Post to Slack, Post Direct Response

### Anthropic API Key (Header Auth)
- Name: `x-api-key`
- Value: `sk-ant-api03-...` (your key)
- Used in: Claude Planning Call, Claude Response Call

### Notion MCP OAuth2

**If not already set up:**

1. In n8n, go to Credentials → Add Credential → "MCP OAuth2 API"
2. Endpoint URL: `https://mcp.notion.com/mcp`
3. Authorization URL: `https://api.notion.com/v1/oauth/authorize`
4. Access Token URL: `https://api.notion.com/v1/oauth/token`
5. Client ID: (will be generated)
6. Client Secret: (will be generated)
7. Scope: Leave empty
8. Click "Connect my account"
9. Authorize with Notion workspace

**Used in:** All 4 MCP Client nodes (Search, Create, Fetch, Update)

---

## Step 4: Activate and Test

### Activate Workflow
1. Save the workflow
2. Toggle to **Active** (not just "Listen for Test Event")
3. Verify webhook is available at `/webhook/legacy-ai`

### Test in Slack
```bash
# Invite bot to channel
/invite @LegacyAI

# Test search
@LegacyAI search notion for test

# Test create
@LegacyAI summarize this thread and add to Engineering Docs

# Test with different databases
@LegacyAI add this to PO Docs
@LegacyAI search Commercial Docs for pricing
```

### Check Execution Logs
1. In n8n, go to Executions
2. Find the latest execution
3. Check each node for errors
4. Verify tool routing through Switch node
5. Confirm Slack response was posted

---

## Troubleshooting

### Workflow Not Triggering
- Ensure workflow is **Active** (not listening mode)
- Check Slack event subscriptions are verified (green checkmark)
- Verify webhook URL matches Slack app settings
- Check n8n logs: `docker logs n8n`

### Claude Not Calling Tools
- Review Claude Planning Call response in execution logs
- Check tool definitions in Claude Planning node
- Verify Notion database IDs are correct
- Test with more explicit commands: `@LegacyAI use notion-search to find X`

### MCP Errors
- Re-authenticate Notion MCP OAuth2 credential
- Verify `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` is set
- Restart n8n after environment changes: `docker compose restart`
- Check MCP Client node execution logs for specific errors

### Switch Node Not Routing
- Verify Parse Tool Calls is outputting `toolCalls` array
- Check Switch expression: `={{ $json.toolCalls[0].name }}`
- Confirm tool name matches exactly (e.g., "notion-search" not "search")
- Test each output path individually

### Slack Response Not Posting
- Verify bot has `chat:write` scope
- Check bot is invited to channel: `/invite @LegacyAI`
- Ensure channel ID and thread_ts are valid
- Review Post to Slack node execution logs

### Slow Responses (>10 seconds)
- Normal for complex operations (Claude + MCP + Claude)
- Consider adding intermediate "Working on it..." message
- Check if Slack webhook times out (3s limit for initial ack)
- May need async pattern for very long operations

---

## Customization

### Add More Databases

Edit `nodes/02-build-notion-context.js`:
```javascript
{
  name: "Customer Support",
  id: "your-database-id-here",
  description: "Support tickets and customer issues"
}
```

### Modify Claude Behavior

Edit `nodes/03-claude-planning.js`:
- Adjust system prompt for different behavior
- Add constraints (e.g., "Always use Engineering Docs unless specified")
- Modify tool descriptions

### Change Response Style

Edit `nodes/06-claude-response.js`:
- Modify system prompt
- Add formatting instructions
- Include emojis or custom formatting

---

## Cost Estimate

| Service | Usage | Cost |
|---------|-------|------|
| n8n | Always running | Infrastructure costs |
| Claude API | 2 calls per command | $0.02-0.10 per @mention |
| Slack API | 2-3 calls per command | Free |
| Notion MCP | 1-2 calls per command | Free |

**Total: ~$0.02-0.10 per @mention command**

---

## Next Steps

1. Export workflow once working: n8n UI → "..." → Download → Save as `workflow.json`
2. Test all 4 tool types (search, create, fetch, update)
3. Train users on command patterns
4. Monitor usage and costs
5. Consider adding conversation memory for follow-up questions

---

## Support

- Check execution logs in n8n for detailed error info
- Review node code in `nodes/` directory
- See HTTP request configs in `http-requests/` directory
- Refer to main [README.md](README.md) for architecture details
