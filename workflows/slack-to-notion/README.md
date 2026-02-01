# Slack Thread to Notion via Claude MCP

Capture Slack conversation threads, have Claude intelligently structure them, and save to Notion using the Model Context Protocol (MCP).

## Overview

This workflow:
1. Receives a Slack message shortcut callback
2. Fetches all messages in the thread via Slack API
3. Sends the thread to Claude with tool definitions
4. Claude decides how to structure the Notion page
5. Creates the page in Notion via Notion MCP
6. Responds to user in Slack with success message

## Architecture

```
Slack Message Shortcut
    ↓
n8n Webhook
    ↓
Respond (immediate ack)
    ↓
Extract Thread Info
    ↓
Fetch Thread Messages (Slack API)
    ↓
Format for Claude
    ↓
Claude API (with tool definitions)
    ↓
Extract Tool Call
    ↓
MCP Client → Notion MCP Server
    ↓
Send Response to Slack
```

## Prerequisites

### 1. Slack App Setup
- Create a Slack app with message shortcuts
- Enable interactivity with webhook URL
- Required bot scopes:
  - `channels:history`
  - `groups:history`
  - `users:read`
  - `commands` (required for shortcuts)
- Install app to workspace and get Bot User OAuth Token

### 2. Anthropic API
- Get API key from https://console.anthropic.com/

### 3. Notion Setup
- Create a database for storing summaries
- Note the database ID from the URL

### 4. n8n Configuration
- Self-hosted n8n instance with HTTPS
- Environment variable: `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`

## Setup Instructions

### 1. Import Workflow

1. Copy all node configurations from the `nodes/` and `http-requests/` directories
2. Create a new workflow in n8n
3. Add nodes in the order specified in the architecture diagram

### 2. Configure Credentials

**Slack Bot Token** (Header Auth):
- Name: `Authorization`
- Value: `Bearer xoxb-YOUR-BOT-TOKEN`

**Anthropic API Key** (Header Auth):
- Name: `x-api-key`
- Value: `sk-ant-api03-YOUR-API-KEY`

**Notion MCP OAuth2**:
- Follow instructions in `mcp-client-config.md`
- Authorize with Notion workspace

### 3. Update Configuration Values

**In `04-extract-tool-call.js`:**
```javascript
database_id: "YOUR_NOTION_DATABASE_ID"
```

Replace with your actual Notion database ID.

### 4. Slack App Manifest

Use the manifest in the root `slack-app-manifest.yaml`:
- Update `request_url` with your n8n webhook URL
- Update `redirect_urls` if needed

### 5. Activate Workflow

- Save the workflow
- Toggle to **Active** (not just "Listen for Test Event")
- The webhook will be available at: `https://your-n8n.com/webhook/add-to-notion`

## Node Details

### Code Nodes
- **01-extract-thread-info.js**: Parse Slack message shortcut payload
- **02-format-thread-for-claude.js**: Format messages for AI processing
- **03-build-claude-request.js**: Build API request with tool definitions
- **04-extract-tool-call.js**: Extract Claude's structured response

### HTTP Request Nodes
- **01-get-thread-messages.md**: Fetch thread via Slack API
- **02-claude-api-call.md**: Call Claude with tool use

### MCP Client Tool
- **mcp-client-config.md**: Notion MCP configuration

## Usage

1. Go to any Slack thread
2. Right-click (or click "...") on any message in the thread
3. Select **"Add to Notion"** from shortcuts menu
4. Bot processes the thread and creates a Notion page
5. Receive confirmation message in Slack

## Customization

### Change Claude's Prompt

Edit `03-build-claude-request.js` to modify how Claude structures pages:
- Adjust the instructions in the `content` field
- Add more context or requirements
- Modify tool schema for different properties

### Add More Tools

Extend the `tools` array in `03-build-claude-request.js`:
- `notion_search`: Search for existing pages
- `notion_update_page`: Update existing pages
- Add routing logic in Extract Tool Call node

### Different MCP Operations

The workflow can be adapted for:
- `notion-update-page`: Update existing documentation
- `notion-search`: Find and append to existing pages
- `notion-fetch`: Get database schema first

## Troubleshooting

### Workflow Not Triggering
- Ensure workflow is **Activated** (not just listening)
- Check Slack app's Interactivity URL matches webhook
- Verify bot is invited to private channels

### MCP OAuth Issues
- Re-authenticate Notion MCP credential
- Check `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` is set
- Restart n8n after environment variable changes

### Claude Not Using Tool
- Check the tool definition schema in Build Claude Request
- Verify prompt is clear about using the tool
- Review Claude API response for errors

### Notion Page Not Created
- Verify database ID is correct
- Check bot has access to the database in Notion
- Review MCP Client Tool execution logs

## Cost Estimate

| Service | Cost |
|---------|------|
| n8n (self-hosted) | Infrastructure costs |
| Claude API | ~$0.01-0.05 per summary |
| Slack API | Free |
| Notion API/MCP | Free |

## Future Enhancements

- [ ] Extract Notion page URL and send in Slack response
- [ ] Support multiple MCP tools (search, update)
- [ ] Add user name resolution instead of user IDs
- [ ] Tag suggestion based on content
- [ ] Support for attaching files/images
- [ ] Batch processing of multiple threads

## References

- [Notion MCP Documentation](https://developers.notion.com/docs/mcp)
- [Claude API Tool Use](https://docs.anthropic.com/claude/docs/tool-use)
- [n8n MCP Client Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/)
- [Slack Message Shortcuts](https://api.slack.com/interactivity/shortcuts/using)
