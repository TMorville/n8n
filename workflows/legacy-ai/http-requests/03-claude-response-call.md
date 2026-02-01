# HTTP Request: Claude Response Call

**Node Type:** HTTP Request
**Position:** After Claude Response (code node)

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

This passes through the complete request built by the Claude Response code node, which includes:
- `model`: `claude-sonnet-4-20250514`
- `max_tokens`: 2000
- `messages`: Multi-turn conversation with tool_use and tool_result messages
- `system`: LegacyAI system prompt

## Response Format

```json
{
  "id": "msg_02...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "I've searched Notion and found 3 relevant pages about API documentation..."
    }
  ],
  "stop_reason": "end_turn"
}
```

## Notes

- This is Claude's second call in the two-Claude pattern
- Claude receives the original context + tool execution results
- Claude formulates a natural language response for the user
- Response should only contain text blocks (no more tool calls)
- The Post to Slack node extracts this text and sends it to the thread
