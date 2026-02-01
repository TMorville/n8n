# LegacyAI - Slack Bot for Notion Documentation

A conversational Slack bot that uses Claude AI to intelligently create Notion documentation via natural language commands.

## Status

**Current Version:** Multi-Turn (v2.0) - Production Ready ✅
- Multi-turn agentic workflow with conversation loops
- 4 tools: search, create, fetch, update
- Intelligent tool chaining (search → fetch → respond)
- Slack mrkdwn formatting with clickable Notion links
- Tested and operational

## Quick Start

```bash
# In Slack
/invite @LegacyAI
@LegacyAI summarize this thread and add to Engineering Docs
@LegacyAI add this conversation to PO Docs
```

**Setup:** See [SETUP.md](SETUP.md) for complete installation instructions.

---

## How It Works

### Multi-Turn Agentic Loop

```
User @mentions LegacyAI in Slack
    ↓
[Entry Phase]
Extract context → Get thread → Format → Build Notion context
    ↓
[Agentic Loop - Iterates until complete]
┌───────────────────────────────────────────────┐
│ Claude Planning Agent                         │
│ - First turn: Receives user command + context│
│ - Subsequent turns: Receives tool results    │
│ - Decides: Which tool? Continue or finish?   │
│      ↓                                        │
│ IF needs tool → Execute MCP tool             │
│      ↓                                        │
│ Format result → LOOP BACK to Claude          │
│      ↓                                        │
│ IF complete → Extract final response         │
└───────────────────────────────────────────────┘
    ↓
Posts formatted response in Slack thread
```

**Why multi-turn matters:**
- **Single-turn limitation:** Can only execute ONE tool, then respond
- **Multi-turn advantage:** Can chain tools (search → fetch → respond)
- **Real example:** "@LegacyAI get me docs on API Access"
  1. Turn 1: Claude searches "API Access" → finds 3 pages
  2. Turn 2: Claude fetches most relevant page → reads content
  3. Turn 3: Claude responds with actual content (not just title)

**Loop control:** Claude's `stop_reason` determines continuation
- `stop_reason: "tool_use"` → Continue loop, execute tool
- `stop_reason: "end_turn"` → Exit loop, post response

---

## Example Commands

### Create Documentation
```
@LegacyAI summarize this thread and add to Engineering Docs
@LegacyAI add this conversation to PO Docs
@LegacyAI create a page in Commercial Docs with this decision
```

**Result:** Creates a formatted Notion page with thread summary in the specified database.

### Search Notion
```
@LegacyAI search notion for API documentation
@LegacyAI find information about the new feature
@LegacyAI what's in Engineering Docs about authentication?
```

**Result:** Returns list of matching pages with clickable links.

### Fetch and Respond with Content (Multi-Turn)
```
@LegacyAI get me docs on Legacy API Access
@LegacyAI what does the Infrastructure page say about deployment?
```

**Result:** Searches → Fetches page content → Responds with actual information (not just title).

### Update Existing Pages
```
@LegacyAI update the roadmap with this information
@LegacyAI add this to the existing API docs page
```

**Result:** Updates specified page with new content.

---

## Available Notion Databases

| Database | Purpose |
|----------|---------|
| **Engineering Docs** | Technical documentation, architecture, API docs |
| **PO Docs** | Product requirements, feature specs, roadmap |
| **Commercial Docs** | Sales materials, customer docs, guides |

Claude automatically selects the right database based on your command.

---

## Architecture

### Multi-Turn Loop Implementation (Production)

**Current workflow:**
```
[Entry Phase]
Webhook (+ URL Verification Workflow)
    ↓
Post Acknowledgment ("Working on it...")
    ↓
Extract Context (parse @mention, filter bot messages)
    ↓
Get Thread Messages (Slack API)
    ↓
Format Thread for Claude
    ↓
Build Notion Context (3 databases)
    ↓
[Agentic Loop - Continues until Claude says "done"]
┌─────────────────────────────────────────┐
│ Claude Planning (Multi-Turn)           │◄─── Loop back
│ - First turn: user command + context   │      from Merge
│ - Subsequent turns: + tool results     │
│ - Outputs: tool calls OR final text    │
│     ↓                                   │
│ Claude API Call (Anthropic)             │
│     ↓                                   │
│ Parse Tool Call                         │
│ - Saves conversation history            │
│ - Sets shouldContinue flag              │
│     ↓                                   │
│ IF shouldContinue = true?               │
│ ├─ YES: Switch Tool (by tool name)     │
│ │   ├─ notion-search → MCP Search      │
│ │   ├─ notion-create-pages → MCP Create│
│ │   ├─ notion-fetch → MCP Fetch        │
│ │   └─ notion-update-page → MCP Update │
│ │       ↓                               │
│ │   Format Result (standardize output) │
│ │       ↓                               │
│ │   Merge Tool Results ─────────────────┘
│ │
│ └─ NO: Extract Direct Response
│         ↓
└─────────[Exit Loop]─────────────────────┘
    ↓
Post to Slack (formatted response)
```

**Key Features:**
- ✅ Multi-turn conversation loop (Claude decides when complete)
- ✅ 4 tools: search, create, fetch, update
- ✅ Tool chaining (search → fetch → respond)
- ✅ Separate URL verification workflow
- ✅ Immediate acknowledgment ("Working on it...")
- ✅ Bot message filtering (prevents loops)
- ✅ Slack mrkdwn formatting with clickable Notion links
- ✅ Input detection via structure check (not execution history)
- ✅ Production tested

**Loop Control:**
- `stop_reason: "tool_use"` → shouldContinue = true → Execute tool, loop back
- `stop_reason: "end_turn"` → shouldContinue = false → Exit loop, post response

### Technology Stack

- **n8n**: Workflow orchestration
- **Claude Sonnet 4.5**: AI planning & response generation
- **Slack Events API**: @mention triggers
- **Notion MCP**: Database operations
- **OAuth2**: Secure authentication

---

## Usage Tips

### Be Specific About Databases
```
✅ @LegacyAI add this to Engineering Docs
❌ @LegacyAI add this to notion (Claude has to guess which DB)
```

### Use Natural Language
```
✅ @LegacyAI what's in PO Docs about feature X?
✅ @LegacyAI search for API authentication docs
✅ @LegacyAI update the roadmap page
```

### Thread Context Matters
LegacyAI reads the entire Slack thread before responding. Commands like "summarize this thread" or "add this conversation" use full context.

### Response Time
Expect 5-10 seconds for responses (two Claude calls + MCP tool execution).

---

## Customization

### Add More Databases

Edit `nodes/02-build-notion-context.js`:
```javascript
{
  name: "Customer Support",
  id: "your-database-id-here",
  description: "Support tickets and FAQs"
}
```

### Change Claude's Behavior

Edit `nodes/03-claude-planning.js`:
- Adjust how Claude interprets commands
- Add constraints or preferences
- Modify tool selection logic

### Modify Response Style

Edit `nodes/06-claude-response.js`:
- Change response formatting
- Add emojis or custom styling
- Include additional context

---

## Comparison with slack-to-notion

| Feature | slack-to-notion | LegacyAI |
|---------|----------------|----------|
| **Trigger** | Right-click shortcut | @mention |
| **Intent** | Always create page | Inferred from command |
| **Database** | Fixed (Engineering Docs) | Claude selects from 3 |
| **Operations** | Only create-pages | search, create, fetch, update |
| **Workflow** | Single Claude call | Two Claude calls |
| **Use case** | Quick thread capture | Conversational interaction |
| **Cost** | ~$0.01-0.05 per use | ~$0.02-0.10 per use |

---

## Troubleshooting

### Bot Not Responding
- Check workflow is **Active** in n8n
- Verify Slack event subscriptions are verified (green checkmark)
- Ensure bot is invited to channel: `/invite @LegacyAI`

### Claude Gives Wrong Answer
- Be more specific in command
- Mention database explicitly: "Engineering Docs"
- Check Claude Planning Call execution logs

### Tool Not Executing
- Verify Notion MCP OAuth2 credential is valid
- Check database IDs in Build Notion Context node
- Review MCP Client node execution logs

### Slow Responses (>10s)
- Normal for complex operations
- Check if APIs are rate-limited
- Review execution logs for bottlenecks

**For detailed troubleshooting, see [SETUP.md](SETUP.md#troubleshooting).**

---

## Cost Estimate

**Per @mention command:** $0.02-0.10

- Claude API: 2 calls (planning + response)
- Slack API: 2-3 calls (free)
- Notion MCP: 1-2 calls (free)
- n8n: Infrastructure costs only

---

## File Structure

```
workflows/legacy-ai/
├── README.md                    # This file - overview and usage
├── SETUP.md                     # Complete setup instructions
├── nodes/                       # Code node snippets
│   ├── 01-extract-context.js
│   ├── 02-build-notion-context.js
│   ├── 03-claude-planning.js
│   ├── 04-parse-tool-calls.js
│   ├── 05-aggregate-results.js
│   └── 06-claude-response.js
└── http-requests/               # HTTP request configs
    ├── 01-get-thread-messages.md
    ├── 02-claude-planning-call.md
    ├── 03-claude-response-call.md
    └── 04-post-slack-message.md
```

---

## Next Steps

1. **Setup**: Follow [SETUP.md](SETUP.md) to build the workflow
2. **Test**: Try simple commands first, then complex ones
3. **Train**: Share example commands with your team
4. **Monitor**: Review usage and costs in first week
5. **Iterate**: Customize based on actual usage patterns

---

## Support & Resources

- **Setup Issues**: See [SETUP.md](SETUP.md#troubleshooting)
- **Notion MCP**: https://developers.notion.com/docs/mcp
- **Claude Tool Use**: https://docs.anthropic.com/claude/docs/tool-use
- **n8n MCP Client**: https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/
