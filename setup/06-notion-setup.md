# Notion Integration Setup

## Overview

This guide shows how to set up Notion OAuth integration with n8n to create pages in your Notion database.

**Note**: Complete this AFTER you have the Slack → Claude workflow working.

## Prerequisites

- Working n8n workflow (Slack → Claude)
- Notion workspace
- Admin access to Notion

## Step 1: Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click **+ New integration**
3. Configure:
   - **Name**: Thread to Notion
   - **Associated workspace**: Your workspace
   - **Type**: Internal
4. Click **Submit**
5. Copy the **Internal Integration Token** (starts with `secret_`)
6. Save this token securely

## Step 2: Create Notion Database

1. Open Notion and create a new page
2. Name it: "Slack Thread Summaries"
3. Add a database with these properties:

| Property Name | Type | Description |
|--------------|------|-------------|
| **Title** | Title | Auto-generated summary title |
| **Summary** | Text | Full AI summary |
| **Channel** | Text | Slack channel name |
| **Date** | Date | When summary was created |
| **Slack Link** | URL | Link back to thread |
| **Message Count** | Number | Number of messages in thread |

4. Click **Share** button (top right)
5. Invite your integration: "Thread to Notion"
6. Grant access

## Step 3: Get Database ID

The database ID is in the URL when viewing the database:

```
https://notion.so/{workspace}/{database_id}?v={view_id}
```

Example:
```
https://www.notion.so/myworkspace/a1b2c3d4e5f6?v=...
                                 ^^^^^^^^^^^^
                                 This is the database ID
```

Copy the database ID (the long alphanumeric string).

## Step 4: Configure Notion in n8n

### Option A: Using Notion API (Simpler)

1. In n8n, go to **Settings** → **Credentials**
2. Click **+ Add Credential**
3. Search for **Notion API**
4. Configure:
   - **API Key**: Your Internal Integration Token from Step 1
5. Save the credential

### Option B: Using OAuth (More Secure)

1. In n8n, go to **Settings** → **Credentials**
2. Click **+ Add Credential**
3. Search for **Notion OAuth2 API**
4. You'll need to create a Notion OAuth app:
   - Go to https://www.notion.so/my-integrations
   - Select your integration
   - Enable **Public distribution** (if needed)
   - Set **Redirect URI**: `https://n8n.legacyco2.com/rest/oauth2-credential/callback`
5. Copy the **OAuth client ID** and **client secret**
6. In n8n, enter these credentials
7. Click **Connect my account** and authorize

## Step 5: Add Notion Node to Workflow

1. Open your "Slack Thread to Notion" workflow in n8n
2. After the **Process Claude Response** node, add a **Notion** node
3. Configure the Notion node:

### Basic Settings
- **Credential**: Select the Notion credential you created
- **Resource**: Page
- **Operation**: Create
- **Database ID**: Paste your database ID from Step 3

### Page Properties

Configure the properties to match your database:

#### Title
```
={{ $json.title }}
```

#### Summary (Rich Text)
```
={{ $json.summary }}
```

#### Channel (Text)
```
={{ $json.threadData.channelId }}
```

#### Date (Date)
```
={{ new Date().toISOString().split('T')[0] }}
```

#### Slack Link (URL)
```
=https://wearelegacydk.slack.com/archives/{{ $json.threadData.channelId }}/p{{ $json.threadData.threadTs.replace('.', '') }}
```

#### Message Count (Number)
```
={{ $json.threadData.messageCount }}
```

## Step 6: Update Webhook Response

Update the **Respond to Webhook** node to include Notion link:

```json
{
  "response_type": "ephemeral",
  "text": "✅ Thread summary added to Notion!",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*✅ Thread summary added to Notion!*\n\n📝 *{{ $('Process Claude Response').first().json.title }}*\n\n🔗 <{{ $('Notion').first().json.url }}|View in Notion>"
      }
    }
  ]
}
```

## Step 7: Test End-to-End

1. Save and activate the workflow
2. Go to Slack
3. Create a thread with 3-4 messages
4. Type `/add-to-notion` in the thread
5. Check:
   - ✅ Slack shows success message
   - ✅ New page appears in Notion database
   - ✅ All properties are filled correctly
   - ✅ Link works back to Slack thread

## Troubleshooting

### "Database not found" error

- Verify you shared the database with your integration
- Check the database ID is correct (no extra characters)
- Ensure the integration has access to the workspace

### Properties not showing up

- Verify property names in Notion match exactly (case-sensitive)
- Check property types are correct (Text vs Rich Text)
- Ensure you're using the right expression syntax in n8n

### OAuth connection fails

- Verify redirect URI is exactly: `https://n8n.legacyco2.com/rest/oauth2-credential/callback`
- Check OAuth is enabled in Notion integration settings
- Try recreating the credential in n8n

### Page created but missing data

- Check n8n execution logs for the Notion node
- Verify the expressions are evaluating correctly
- Test each expression in the n8n expression editor

## Alternative: Using Notion MCP Server

If you want to use the Notion MCP server instead:

1. Install Notion MCP: https://github.com/makenotion/notion-mcp
2. Configure OAuth redirect to your n8n instance
3. Use HTTP Request node in n8n to call MCP server
4. This requires more setup but provides more flexibility

## Database Template

You can duplicate this Notion database template:

**Properties:**
- Title (title) - Summary title
- Summary (text) - Full AI summary with context, key points, decisions
- Channel (text) - Slack channel ID
- Date (date) - Creation date
- Slack Link (url) - Direct link to thread
- Message Count (number) - Number of messages
- Participants (multi-select) - Who was in the thread (optional)
- Status (select) - Read/Unread/Archived (optional)

## Next Steps

After Notion integration works:

1. Customize the summary prompt in Claude node
2. Add more properties to Notion (tags, priority, etc.)
3. Set up Notion automation rules (notifications, etc.)
4. Consider adding thread filtering (minimum message count, etc.)

## Cost Implications

Notion API is free for:
- Up to 1000 API requests per day
- All integration types

This should be more than sufficient for typical usage.

## Security Notes

- **Internal Integration Token**: Keep secret, gives access to shared pages
- **OAuth**: More secure, users authorize access explicitly
- **Sharing**: Only share database with integration, not entire workspace
- **Audit**: Check Notion integration logs periodically

## Additional Features to Consider

1. **Thread categorization**: Auto-tag based on content
2. **Duplicate detection**: Check if thread already summarized
3. **Search integration**: Make summaries searchable
4. **Weekly digest**: Aggregate summaries into weekly report
5. **User preferences**: Let users customize summary format

See Notion API docs for more ideas: https://developers.notion.com/
