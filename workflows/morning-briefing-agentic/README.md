# Morning Briefing Podcast (Agentic)

An agentic version of the morning briefing workflow where Claude decides which data sources to query, loops until satisfied, then generates the briefing.

## Architecture

```
Trigger → Initialize State → [Agentic Loop] → Extract Briefing → TTS → Upload
                                   ↓
                Claude Agent → Claude API → Parse Tool Call → IF continue?
                    ↑                                            ↓ YES
                    └─── Merge ← Format ← Execute ← Switch ← Split Tool Calls
                                                                 ↓ NO
                                                          Extract Briefing
```

## Key Differences from Original

| Original | Agentic |
|----------|---------|
| Fetch all data sources in parallel | Claude decides what to fetch |
| Single Claude call to summarize | Multi-turn conversation with tools |
| Fixed data, then summarize | Iterative information gathering |
| ~4 API calls total | 3-10 Claude API calls (varies) |

## Available Tools

| Tool | Description | n8n Node |
|------|-------------|----------|
| `get-calendar-events` | Today's meetings, times, attendees | Google Calendar |
| `get-emails` | Unread important emails from primary | Gmail |
| `get-slack-messages` | Recent #general and #engineering messages | Slack |
| `get-todoist-tasks` | Today's + overdue tasks | Todoist |
| `notion-search` | Search Notion for context | MCP Notion |
| `notion-fetch` | Fetch specific Notion page | MCP Notion |
| `generate-briefing` | Signal completion with briefing text | Exit loop |

## Loop Control

**Continue conditions:**
- `stop_reason === "tool_use"` AND tool !== `generate-briefing`

**Exit conditions:**
- Claude calls `generate-briefing` tool
- Claude's `stop_reason === "end_turn"`
- Max 10 iterations reached
- 2-minute timeout exceeded

## Typical Flow

1. Claude starts by calling `get-calendar-events`
2. Based on meetings, may call `get-todoist-tasks`
3. Scans `get-emails` for urgent items
4. Checks `get-slack-messages` for team updates
5. Optionally searches Notion for meeting context
6. Calls `generate-briefing` with complete text

Usually 4-6 tool calls before generating the briefing.

## Files

```
workflows/morning-briefing-agentic/
├── workflow.json              # Main workflow definition
├── nodes/
│   ├── 01-initialize-state.js # Setup agent state and tools
│   ├── 02-claude-agent.js     # Build Claude API requests
│   ├── 03-parse-tool-call.js  # Parse responses, control loop
│   ├── 04-format-tool-results.js # Format templates (reference)
│   └── 05-extract-briefing.js # Extract final briefing for TTS
├── update-workflow.js         # Push to n8n instance
└── README.md                  # This file
```

## Uploading to n8n

To deploy this workflow to your n8n instance:

```bash
cd workflows/morning-briefing-agentic
node update-workflow.js https://n8n.legacyco2.com "$(grep N8N_API_KEY /Users/tomo/code/n8n/.env | cut -d= -f2)" <workflow-id>
```

Note: This workflow needs a new workflow ID since it's separate from the original.
To create a new workflow, import the JSON manually in the n8n UI first.

## Credentials Required

All credentials are copied from the original workflow:

- **Google Calendar OAuth** (id: 2Ap7swo3KCsSTLUf)
- **Gmail OAuth** (id: 0y5YjfHHjcDNipgA)
- **Slack OAuth** (id: Zd14IildZOr6iOl1)
- **Todoist API** (id: 3UCpIsn01iEhYil8)
- **MCP Notion OAuth** (id: XIkxOa43ADR9R2Fv)
- **Claude API** (id: gu04rFS1KUubizmj)
- **ElevenLabs API** (id: QUVrU7I55RQ8mhTR)
- **Google Cloud Storage OAuth** (id: mUq2jQi5KHAHHb8R)

## Safety Features

1. **Max iterations**: Stops after 10 Claude API calls
2. **Timeout**: 2-minute hard limit on total execution
3. **Fallback briefing**: Generates a safe message if agent fails
4. **Error handling**: Each tool path has error tolerance

## Tuning

Edit `Initialize State` node to adjust:

- `maxIterations`: Increase for more thorough briefings
- `timeoutMs`: Extend if hitting timeout regularly
- `systemPrompt`: Modify Claude's behavior and briefing style
- `tools`: Add/remove available tools

## Comparison: Token Usage

| Scenario | Original | Agentic |
|----------|----------|---------|
| Light day (few items) | ~3K tokens | ~4K tokens |
| Typical day | ~5K tokens | ~8K tokens |
| Heavy day (lots of data) | ~8K tokens | ~10K tokens |

The agentic version uses more tokens but produces more contextually relevant briefings by fetching only what's needed.
