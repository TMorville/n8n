/**
 * Node: Initialize Agent State
 * Type: Code (JavaScript)
 * Position: After trigger
 *
 * Purpose: Initialize the agentic loop state including iteration counter,
 * max iterations, and tool definitions for the morning briefing agent.
 */

const today = new Date();
const dateStr = today.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

// Tool definitions for Claude
const tools = [
  {
    name: "get-calendar-events",
    description: "Get today's calendar events including meetings, times, and attendees. Returns a list of events with their start time, end time, title, location, and attendees.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get-emails",
    description: "Get recent unread important emails from the primary inbox. Filters out automated notifications, receipts, and calendar responses. Returns sender, subject, and snippet for each email.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of emails to return (default: 20)"
        }
      },
      required: []
    }
  },
  {
    name: "get-slack-messages",
    description: "Get recent Slack messages from important channels (#general, #engineering). Returns channel, sender, and message text.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of messages to return (default: 30)"
        }
      },
      required: []
    }
  },
  {
    name: "get-todoist-tasks",
    description: "Get today's tasks and overdue tasks from Todoist. Returns task content, due date, priority, and whether the task is stale (older than 7 days).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "notion-search",
    description: "Search across all Notion pages and databases to find relevant documentation. Use this to look up context for meetings, projects, or stakeholders.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query text"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "notion-fetch",
    description: "Fetch the full content of a specific Notion page by ID. Use after notion-search to read actual page content.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The page ID from search results"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "generate-briefing",
    description: "Signal that you have gathered enough context and are ready to generate the final briefing. Call this when you have the information needed to create a comprehensive morning briefing.",
    input_schema: {
      type: "object",
      properties: {
        briefing_text: {
          type: "string",
          description: "The complete morning briefing text, formatted for TTS (no markdown, natural speech patterns, 400-600 words)"
        }
      },
      required: ["briefing_text"]
    }
  }
];

// System prompt for the agent
const systemPrompt = `You are Tobias's personal assistant preparing his morning briefing.

ABOUT TOBIAS:
- CTO at Legacy, a climate tech startup in Denmark
- Engineering team: Lars, Matei, Divine, Shelby, Chris, Daniel
- Key projects: BEC (banking), Danica (insurance), Platform
- Stakeholders: Magnus (CEO), Mathias, Rune, Christoffer

TODAY: ${dateStr}

YOUR TASK:
Gather the information needed to prepare a comprehensive morning briefing, then generate it.

AVAILABLE TOOLS:
- get-calendar-events: Today's meetings with times and attendees
- get-emails: Unread important emails
- get-slack-messages: Recent channel messages
- get-todoist-tasks: Today's and overdue tasks
- notion-search: Search documentation for context
- notion-fetch: Read specific Notion pages
- generate-briefing: Finalize and output the briefing

RECOMMENDED STRATEGY:
1. Start with calendar (understand the day's structure)
2. Check tasks (know the priorities)
3. Scan emails (identify urgent items)
4. Check Slack (team updates)
5. Optionally use Notion to get context for important meetings
6. Call generate-briefing when you have enough context

3-5 tool calls is usually sufficient. Don't over-fetch.

BRIEFING FORMAT (when you call generate-briefing):
- 400-600 words, suitable for 3-4 minutes spoken
- No markdown, bullets, or formatting - this is for TTS
- Natural speech with pauses (use "..." for pauses)
- Numbers as words ("first" not "1", "eighty percent" not "80%")
- Structure: day overview → priorities → calendar highlights → messages worth attention → capacity check
- Warm but efficient tone, like a capable PA
- Skip empty sections entirely
- End with something useful, not generic sign-off

FILTERING PRIORITIES:
- People over automated notifications
- Skip bot messages, system alerts, marketing emails
- Always flag: deadlines, direct questions, blockers
- Mention stale tasks (older than 7 days) as potential concerns`;

return [{
  json: {
    // Agent state
    iteration: 0,
    maxIterations: 10,
    startTime: Date.now(),
    timeoutMs: 120000, // 2 minutes

    // Date context
    today: dateStr,
    todayISO: today.toISOString().split('T')[0],

    // Tools and prompt
    tools,
    systemPrompt,

    // Conversation history (empty at start)
    conversationHistory: [],

    // Tool results accumulator
    toolResults: {}
  }
}];
