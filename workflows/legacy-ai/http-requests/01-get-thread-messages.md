# HTTP Request: Get Thread Messages

**Node Type:** HTTP Request
**Position:** After Extract Context

## Configuration

- **Method**: `POST`
- **URL**: `https://slack.com/api/conversations.replies`
- **Authentication**: `Generic Credential Type` → `Header Auth`
  - **Name**: `Authorization`
  - **Value**: `Bearer xoxb-YOUR-BOT-TOKEN`
- **Send Body**: No
- **Send Query Parameters**: Yes

## Query Parameters

Both parameters should be in **Expression** mode:

| Name | Value | Mode |
|------|-------|------|
| `channel` | `{{ $json.channelId }}` | Expression |
| `ts` | `{{ $json.threadTs }}` | Expression |

## Notes

- Calls Slack's `conversations.replies` API
- Fetches all messages in the thread
- Bot must be invited to private channels to access messages
- Returns array of message objects with text, user, timestamp, etc.

## Response Format

```json
{
  "ok": true,
  "messages": [
    {
      "user": "U123456",
      "type": "message",
      "ts": "1234567890.123456",
      "text": "Message text",
      "thread_ts": "1234567890.123456"
    }
  ]
}
```
