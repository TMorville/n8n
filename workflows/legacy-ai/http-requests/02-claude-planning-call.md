# HTTP Request: Claude Planning Call

**Node Type:** HTTP Request
**Position:** After Claude Planning (code node)

## Configuration

- **Method**: `POST`
- **URL**: `https://api.anthropic.com/v1/messages`
- **Authentication**: `Generic Credential Type` → `Header Auth`
  - **Name**: `x-api-key`
  - **Value**: `YOUR-ANTHROPIC-API-KEY`
- **Send Headers**: Yes
- **Send Body**: Yes (JSON)

## Custom Headers

| Name | Value | Mode |
|------|-------|------|
| `anthropic-version` | `2023-06-01` | Fixed |
| `Content-Type` | `application/json` | Fixed |

## Request Body

Set to **Expression** mode and use:

```
{{ JSON.stringify($json) }}
```

This passes through the complete request built by the Claude Planning code node, which includes:
- `model`: `claude-sonnet-4-20250514`
- `max_tokens`: 4000
- `tools`: Array of all Notion MCP tool definitions (search, create, fetch, update)
- `messages`: User command + thread context + Notion database info

## Response Format

```json
{
  "id": "msg_01...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "I'll help you with that..."
    },
    {
      "type": "tool_use",
      "id": "toolu_01...",
      "name": "notion-create-pages",
      "input": {
        "parent": { "database_id": "..." },
        "pages": [...]
      }
    }
  ],
  "stop_reason": "tool_use"
}
```

## Notes

- Claude analyzes the command and decides which Notion tools to call
- Response may contain multiple `tool_use` blocks for multiple tool calls
- Response may contain only `text` block if Claude can answer directly without tools
- The Parse Tool Calls node processes this response to extract tool calls
