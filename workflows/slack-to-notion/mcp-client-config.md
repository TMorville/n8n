# MCP Client Tool Configuration

**Node Type:** MCP Client Tool
**Position:** After Extract Tool Call

## Configuration

### Authentication
1. **Credential for MCP OAuth2 API**: Create new credential
   - **OAuth Redirect URL**: `https://your-n8n-instance.com/rest/oauth2-credential/callback`
   - **Use Dynamic Client Registration**: ON (enabled)
   - **Server URL**: `https://mcp.notion.com/mcp`
   - **Allowed HTTP Request Domains**: All

2. After saving, click "Connect my account" and authorize with Notion

### MCP Client Settings

- **Server Transport**: `HTTP Streamable`
- **MCP Endpoint URL**: `https://mcp.notion.com/mcp`
- **Authentication**: `MCP OAuth2`
- **Credential for MCP OAuth2 API**: Select your connected account
- **Tool**: `From list` → `notion-create-pages`
- **Input Mode**: `Manual`

### Values to Send

In the JSON field at the bottom (Expression mode), enter:

```javascript
{{ $json }}
```

This passes the entire formatted object from the Extract Tool Call node, which includes:

```javascript
{
  parent: {
    database_id: "YOUR_DATABASE_ID"
  },
  pages: [
    {
      properties: {
        title: "Page title from Claude"
      },
      content: "Notion-flavored Markdown content from Claude"
    }
  ]
}
```

## Notes

- The tool expects `parent` with either `database_id`, `page_id`, or `data_source_id`
- `pages` is an array allowing batch creation (we use single page)
- `properties.title` must be in inline markdown format
- `content` uses Notion-flavored Markdown (see Notion MCP docs)
- Response includes created page URLs and IDs

## Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": {
        "pages": [
          {
            "id": "page-id-123",
            "url": "https://www.notion.so/page-url",
            "title": "Created Page Title"
          }
        ]
      }
    }
  ]
}
```
