# HTTP Request: Post to Slack Thread

**Node Type:** HTTP Request
**Position:** After Claude Response Call

## Configuration

- **Method**: `POST`
- **URL**: `https://slack.com/api/chat.postMessage`
- **Authentication**: `Generic Credential Type` → `Header Auth`
  - **Name**: `Authorization`
  - **Value**: `Bearer xoxb-YOUR-BOT-TOKEN`
- **Send Headers**: Yes
- **Send Body**: Yes (JSON)

## Custom Headers

| Name | Value | Mode |
|------|-------|------|
| `Content-Type` | `application/json` | Fixed |

## Request Body

Set to **Expression** mode:

```javascript
{{
  JSON.stringify({
    channel: $('Extract Context').first().json.channelId,
    thread_ts: $('Extract Context').first().json.threadTs,
    text: $json.content[0].text
  })
}}
```

## Explanation

- **channel**: The channel where the @mention occurred
- **thread_ts**: The thread timestamp to reply in the thread
- **text**: Claude's natural language response extracted from the response content

## Response Format

```json
{
  "ok": true,
  "channel": "C123456",
  "ts": "1234567890.123456",
  "message": {
    "type": "message",
    "text": "I've searched Notion...",
    "user": "U987654",
    "thread_ts": "1234567890.123456"
  }
}
```

## Notes

- Bot needs `chat:write` scope
- Using `thread_ts` ensures reply is posted in the thread, not main channel
- If this is the root message (@mention not in a thread), `thread_ts` equals the event ts
- Response will be visible to all channel members
