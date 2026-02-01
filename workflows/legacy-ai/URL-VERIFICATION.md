# Slack URL Verification for LegacyAI

## Overview

LegacyAI uses **two separate n8n workflows** that share the same webhook URL (`/webhook/legacy-ai`):

1. **Slack URL Verification** - Handles Slack's challenge verification
2. **LegacyAI (Simplified)** - Main bot logic

## Why Two Workflows?

### The Problem

When you configure Slack event subscriptions, Slack sends a "challenge" request to verify the webhook URL. This request requires an **instant synchronous response** with the challenge value:

```json
Request: {"type": "url_verification", "challenge": "abc123", "token": "..."}
Response: {"challenge": "abc123"}
```

However, n8n workflows are **asynchronous** by default. The main LegacyAI workflow takes several seconds to:
- Fetch thread messages from Slack
- Call Claude API
- Execute Notion MCP tools
- Post response back to Slack

Slack times out (3 seconds) before the workflow completes.

### The Solution

**Separate the concerns:**

- **URL Verification Workflow**: Responds instantly with just the challenge
- **Main Bot Workflow**: Handles actual @mention events asynchronously

Both workflows listen to the same `/webhook/legacy-ai` path. They process different event types:
- `url_verification` → Verification workflow
- `app_mention` → Main bot workflow

---

## URL Verification Workflow

### File
`workflows/legacy-ai/slack-url-verification.json`

### Structure (2 nodes)

```
Webhook (path: legacy-ai)
    ↓
Respond to Webhook
```

### Webhook Node Configuration

```javascript
{
  "httpMethod": "POST",
  "path": "legacy-ai",
  "responseMode": "responseNode",  // Important: Use responseNode mode
  "options": {}
}
```

### Respond to Webhook Node Configuration

- **Respond With**: JSON
- **Response Body** (expression mode):
  ```javascript
  {"challenge": "={{ $json.body.challenge }}"}
  ```

This extracts the `challenge` field from Slack's request and returns it immediately.

---

## How to Set Up

### 1. Import the Verification Workflow

**Option A: Via n8n UI**
1. Open n8n
2. Click **Workflows** → **Import from File**
3. Select `workflows/legacy-ai/slack-url-verification.json`
4. Activate the workflow

**Option B: Via API**
```bash
cd /Users/tomo/code/to-notion/workflows/legacy-ai

jq '{name, nodes, connections, settings}' slack-url-verification.json | \
curl -s -X POST https://n8n.legacyco2.com/api/v1/workflows \
  -H "X-N8N-API-KEY: your_api_key" \
  -H "Content-Type: application/json" \
  -d @-
```

### 2. Activate the Workflow

The workflow must be **active** for the webhook to respond. Toggle it on in the n8n UI.

### 3. Test the Webhook

```bash
curl -X POST https://n8n.legacyco2.com/webhook/legacy-ai \
  -H "Content-Type: application/json" \
  -d '{"type": "url_verification", "challenge": "test123"}'
```

Expected response:
```json
{"challenge":"test123"}
```

### 4. Configure Slack Event Subscriptions

1. Go to [Slack API Console](https://api.slack.com/apps)
2. Select your app
3. Go to **Event Subscriptions**
4. Enable Events
5. Set **Request URL**: `https://n8n.legacyco2.com/webhook/legacy-ai`
6. Slack will send the challenge request
7. If configured correctly, you'll see ✅ **Verified**

### 5. Subscribe to Events

Under **Subscribe to bot events**, add:
- ` app_mention` (required)

**Do NOT add:**
- `message.channels` (causes bot to respond to every message)
- `message.groups` (causes bot to respond to every message)

---

## Troubleshooting

### Error: "Your URL didn't respond with the value of the challenge parameter"

**Causes:**
1. Verification workflow not active
2. Respond to Webhook node misconfigured
3. Expression not in "expression mode"
4. Wrong webhook path

**Solutions:**
1. Check workflow is **active** (toggle on)
2. Verify Respond to Webhook uses **JSON** response type
3. Ensure response body expression is: `{"challenge": "={{ $json.body.challenge }}"}`
4. Click the expression field icon (fx) to enable expression mode
5. Test manually with curl (see above)

### Error: "URL isn't verified. Verification unsuccessful, try again"

**Causes:**
1. Workflow returning wrong data format
2. Cloudflare/proxy timeout
3. n8n not accessible from Slack

**Solutions:**
1. Test locally: `curl -X POST https://n8n.legacyco2.com/webhook/legacy-ai -d '{"type": "url_verification", "challenge": "test"}'`
2. Check n8n execution logs for errors
3. Verify n8n is publicly accessible
4. Check Cloudflare settings if using proxy

### Both Workflows Running on Same Path?

**Yes, this is intentional.**

n8n allows multiple workflows to listen to the same webhook path. Both workflows will execute when a request arrives, but they handle different event types:

- **Verification workflow**: Checks `input.body.type === 'url_verification'`
- **Main workflow**: Processes `app_mention` events

The verification workflow responds instantly, while the main workflow continues processing in the background.

---

## Workflow IDs

For reference (deployed workflows):

- **Slack URL Verification**: `lG903aW0H9sij1JF`
- **LegacyAI (Simplified)**: `PbAALWXhBoybT8YA`

---

## Key Learnings

### 1. Slack Challenge Must Be Synchronous

Slack requires a response within 3 seconds. n8n workflows that call external APIs (Claude, Notion) take too long.

### 2. responseMode: "responseNode" is Critical

The webhook must use `responseMode: "responseNode"` to respond immediately with data from the Respond to Webhook node.

### 3. Expression Mode is Required

The response body must be in **expression mode** (click fx icon) to evaluate `$json.body.challenge`.

### 4. Multiple Workflows, Same Path = OK

n8n supports multiple workflows listening to the same webhook path. Both will execute, but they can handle different event types.

---

## Future Improvements

When expanding to v2.0 (17-node workflow), consider:

1. **Merge workflows**: Add challenge handling directly to main workflow with IF node
2. **Dedicated verification endpoint**: Use `/webhook/legacy-ai-verify` for challenges
3. **Slack retry logic**: Handle Slack's retry attempts gracefully

For now, the two-workflow pattern works reliably and keeps concerns separated.
