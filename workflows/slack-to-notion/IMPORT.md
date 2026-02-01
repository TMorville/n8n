# Import Methods

There are three ways to use this workflow:

## Method 1: Import JSON File (Fastest)

**If you have the exported JSON:**

1. Download `workflow.json` from this directory
2. In n8n, go to **Workflows** → Click **"+"** → **Import from File**
3. Select the JSON file
4. Update these values:
   - Slack Bot Token (credentials)
   - Anthropic API Key (credentials)
   - Notion database ID in "Extract Tool Call" node
5. Activate the workflow

### Via CLI

```bash
n8n import:workflow --input=workflow.json
```

### Via API

```bash
curl -X POST https://your-n8n-instance.com/api/v1/workflows \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d @workflow.json
```

---

## Method 2: Manual Setup (Most Flexible)

Follow the detailed instructions in [README.md](README.md) to build the workflow node-by-node using:
- Code snippets in `nodes/`
- HTTP configurations in `http-requests/`
- MCP setup in `mcp-client-config.md`

**When to use:**
- You want to understand each component
- You need to customize the workflow
- Learning how n8n workflows work

---

## Method 3: Programmatic Creation (Advanced)

Use the n8n API to create the workflow programmatically:

```javascript
const axios = require('axios');
const fs = require('fs');

const workflowJson = JSON.parse(fs.readFileSync('workflow.json'));

axios.post('https://your-n8n-instance.com/api/v1/workflows', workflowJson, {
  headers: {
    'X-N8N-API-KEY': 'your-api-key',
    'Content-Type': 'application/json'
  }
}).then(response => {
  console.log('Workflow created:', response.data.id);
}).catch(error => {
  console.error('Error:', error.response.data);
});
```

**When to use:**
- Deploying to multiple n8n instances
- CI/CD automation
- Dynamic workflow generation

---

## Post-Import Configuration

Regardless of import method, you'll need to:

### 1. Configure Credentials

**Slack Bot Token:**
- Type: Header Auth
- Name: `Authorization`
- Value: `Bearer xoxb-YOUR-TOKEN`

**Anthropic API Key:**
- Type: Header Auth
- Name: `x-api-key`
- Value: `sk-ant-api03-YOUR-KEY`

**Notion MCP OAuth2:**
- Follow OAuth flow in [mcp-client-config.md](mcp-client-config.md)
- Authorize with your Notion workspace

### 2. Update Variables

**In "Extract Tool Call" node:**
```javascript
database_id: "YOUR_NOTION_DATABASE_ID"
```

Replace with your actual Notion database ID.

### 3. Slack App Configuration

Update your Slack app's **Interactivity Request URL** to:
```
https://your-n8n-instance.com/webhook/add-to-notion
```

---

## Exporting Your Modified Workflow

After making changes:

### Via UI
1. Open workflow in n8n
2. Click **"..."** menu → **Download**
3. Save as `workflow.json`

### Via CLI
```bash
n8n export:workflow --id=5 --output=workflow.json
```

### Via API
```bash
curl https://your-n8n-instance.com/api/v1/workflows/{id} \
  -H "X-N8N-API-KEY: your-api-key" \
  > workflow.json
```

---

## Version Control Best Practices

```bash
# Export workflow after changes
n8n export:workflow --id=5 --output=workflows/slack-to-notion/workflow.json

# Commit to git
git add workflows/slack-to-notion/workflow.json
git commit -m "Update slack-to-notion workflow"
git push
```

**Important:** JSON exports don't include credential values (only references), so you still need to document the setup.

---

## Troubleshooting Imports

### "Credential not found"
- Re-create credentials after import
- Credential names must match exactly

### "Invalid workflow JSON"
- Check JSON syntax
- Ensure all required fields are present
- n8n version compatibility (use same version)

### "Node type not found"
- Missing community nodes
- Install required packages: `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`
- MCP Client Tool requires proper environment setup

---

## Related Resources

- [n8n Export/Import Docs](https://docs.n8n.io/workflows/export-import/)
- [n8n API Documentation](https://docs.n8n.io/api/)
- [Create Dynamic Workflows via API](https://n8n.io/workflows/4544-create-dynamic-workflows-programmatically-via-webhooks-and-n8n-api/)
