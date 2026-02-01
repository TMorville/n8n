/**
 * Node: Claude Planning (Multi-Turn)
 * Type: Code (JavaScript)
 * Position: After Build Notion Context (and in loop for subsequent turns)
 *
 * Purpose: Build Claude API request with conversation history for multi-turn
 * First turn: User command + thread context
 * Subsequent turns: Full conversation history + new tool results
 */

const command = $('Extract Context').first().json.command;
const threadText = $('Format Thread for Claude').first().json.threadText;
const notionContext = $('Build Notion Context').first().json.notionContext;

// === DEBUG LOGGING ===
console.log('=== CLAUDE PLANNING DEBUG ===');
console.log('Checking if subsequent turn...');

// Check if current input is from Merge (subsequent turn) or Build Notion Context (first turn)
const currentInput = $input.first().json;
const isSubsequentTurn = currentInput.toolCallId !== undefined;  // Merge output has toolCallId
console.log('Current input has toolCallId?', !!currentInput.toolCallId);
console.log('Is subsequent turn?', isSubsequentTurn);

const toolResults = isSubsequentTurn ? $input.all() : [];  // Use current input, not $('Merge')

console.log('Tool results count:', toolResults.length);
if (isSubsequentTurn) {
  console.log('SUBSEQUENT TURN - Loading conversation history');
  const parseToolCallData = $('Parse Tool Call').first().json;
  console.log('Parse Tool Call has conversationHistory?', !!parseToolCallData.conversationHistory);
  console.log('Conversation history length:', parseToolCallData.conversationHistory?.length || 0);
  console.log('Tool results:', JSON.stringify(toolResults.map(r => ({
    toolName: r.json.toolName,
    toolCallId: r.json.toolCallId
  }))));
} else {
  console.log('FIRST TURN - Initializing conversation');
}
// === END DEBUG ===

// Get conversation history from previous turn (stored in Parse Tool Call)
const previousMessages = isSubsequentTurn
  ? ($('Parse Tool Call').first().json.conversationHistory || [])
  : [];

// Build messages array
let messages = [];

if (isSubsequentTurn) {
  // Subsequent turn: Load previous conversation + add new tool results
  messages = Array.isArray(previousMessages) ? [...previousMessages] : [];

  // Add tool results as user message
  const toolResultBlocks = toolResults.map(item => ({
    type: "tool_result",
    tool_use_id: item.json.toolCallId,
    content: JSON.stringify(item.json.result)
  }));

  messages.push({
    role: "user",
    content: toolResultBlocks
  });

} else {
  // First turn: Initialize conversation
  messages = [
    {
      role: "user",
      content: `You are LegacyAI, a helpful assistant that manages Notion documentation for Legacy.

${notionContext}

IMPORTANT CONTEXT ABOUT LEGACY'S NOTION WORKSPACE:
- ALL of Legacy's documentation exists in ONLY three databases:
  1. **PO Docs** - Product Owner documentation (features, specifications, product guides)
  2. **Engineering Docs** - Technical documentation (infrastructure, deployment, architecture, code guides)
  3. **Commercial Docs** - Sales and customer documentation (contracts, proposals, customer info)
- There are NO other documentation repositories in Notion
- When searching, you are searching across ALL Legacy documentation (everything is in these 3 databases)
- This makes notion-search very powerful - a single search covers the entire company knowledge base

IMPORTANT: The "Thread context" below contains the FULL conversation from this Slack thread, including all messages exchanged between users. When the user says "this thread" or "this conversation", they are referring to the thread context provided below.

User command: "${command}"

Thread context (this is the conversation to summarize if requested):
${threadText}

MULTI-TURN CAPABILITY:
You can call multiple tools in sequence! After you call a tool and see its results, you can decide to call another tool based on what you learned. This allows you to:
1. Search for a page → See the results → Fetch the page to read its content
2. Search for information → Create a page with that information
3. Find a page → Update it with new content

Based on the user's command and thread context above:

- If the user asks ABOUT a specific page or wants you to READ/SUMMARIZE content:
  1. FIRST: Use notion-search to find the page by name/keywords
  2. THEN: Use notion-fetch with the page ID from search results to read the actual content
  3. FINALLY: Answer based on the real content, not just the page title
  - Example: "summarize Data Share" → search("Data Share") → fetch(page_id) → provide summary

- If the user asks to "summarize this thread", "add to notion", "create a page", etc.:
  - Use notion-create-pages tool with:
    - A clear, descriptive title based on the conversation topic
    - A well-formatted summary of the thread context in the content field
    - The appropriate database_id (Engineering Docs for technical topics, PO Docs for product topics, Commercial Docs for sales/customer topics)

- If the user asks to "search" or "find" pages (without wanting to read them):
  - Use notion-search with relevant keywords
  - notion-search searches across ALL three databases simultaneously
  - Present the list of found pages

- If the user asks to "list", "outline", or "show what's in" a specific database:
  - Use notion-search with broad keywords related to that database
  - Example: "outline PO Docs" → search for "feature", "product", etc.

- If the user asks to "update" or "modify" an existing page:
  - First use notion-search to find the page by title/keywords
  - Then use notion-update-page with the page_id from search results

CRITICAL: When summarizing threads, use ALL the messages from the thread context above. Do not say the thread is "undefined" or unavailable - it's provided in full above.

SLACK FORMATTING RULES (CRITICAL - Your responses go directly to Slack!):
When you give your FINAL text response (not tool calls), you MUST format for Slack mrkdwn:
- Bold: Use *single asterisks* NOT **double asterisks**
  - GOOD: *Legacy API Access*
  - BAD: **Legacy API Access**
- Links: Use <url|text> format NOT [text](url)
  - GOOD: <https://api.wearelegacy.dk|API URL>
  - BAD: [API URL](https://api.wearelegacy.dk)
- Headers: Use *bold text with colon* NOT markdown # headers
  - GOOD: *Main API Information:*
  - BAD: # Main API Information
- Bullets: Use - or • (both work in Slack)
- Line breaks: Use \\n for spacing
- Code blocks: Use \`\`\`language\\ncode\`\`\` (works in Slack)
- Keep responses concise and scannable
- Max 10 results if listing items, mention total count

NOTION PAGE LINKS (CRITICAL):
When you create, update, or reference Notion pages, ALWAYS include clickable links:
- Format: <https://www.notion.so/PAGE_ID|Page Title>
- The page ID is returned in tool results (check the "url" or "id" field)
- Example: "I created <https://www.notion.so/2c774f4c920281f2b516e64584c2ebd1|API Documentation Summary> in Engineering Docs"
- For search results, use the page IDs from the results to create links
- This makes it easy for users to click directly to the page`
    }
  ];
}

return [{
  json: {
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    tools: [
      {
        name: "notion-search",
        description: "Search across all Notion pages and databases. Use this to find existing information, pages, or documentation.",
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
        name: "notion-create-pages",
        description: "Create one or more new pages in a Notion database. Use this to save new information, summaries, or documentation.",
        input_schema: {
          type: "object",
          properties: {
            parent: {
              type: "object",
              description: "Parent database",
              properties: {
                database_id: {
                  type: "string",
                  description: "The ID of the target database (Engineering Docs, PO Docs, or Commercial Docs)"
                }
              },
              required: ["database_id"]
            },
            pages: {
              type: "array",
              description: "Array of pages to create",
              items: {
                type: "object",
                properties: {
                  properties: {
                    type: "object",
                    properties: {
                      title: {
                        type: "string",
                        description: "Page title"
                      }
                    },
                    required: ["title"]
                  },
                  content: {
                    type: "string",
                    description: "Page content in Notion-flavored Markdown"
                  }
                },
                required: ["properties", "content"]
              }
            }
          },
          required: ["parent", "pages"]
        }
      },
      {
        name: "notion-fetch",
        description: "Fetch the full content of a specific Notion page by ID. Use this after searching to read the actual page content, not just the title. Essential for answering questions about what's IN a page.",
        input_schema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The page ID from search results (e.g., from notion-search)"
            }
          },
          required: ["id"]
        }
      },
      {
        name: "notion-update-page",
        description: "Update an existing Notion page's properties or content. Use 'insert_content_after' to append content at the end of a page (use selection_with_ellipsis to match the last content on the page). Use 'replace_content' to replace all content.",
        input_schema: {
          type: "object",
          properties: {
            data: {
              type: "object",
              description: "The update data object",
              properties: {
                page_id: {
                  type: "string",
                  description: "The ID of the page to update (with or without dashes)"
                },
                command: {
                  type: "string",
                  enum: ["update_properties", "replace_content", "replace_content_range", "insert_content_after"],
                  description: "The type of update: 'update_properties' to change properties, 'replace_content' to replace all content, 'insert_content_after' to append after specific text"
                },
                properties: {
                  type: "object",
                  description: "For update_properties: JSON object of property names to values"
                },
                new_str: {
                  type: "string",
                  description: "For replace_content/replace_content_range/insert_content_after: The new content in Notion-flavored Markdown"
                },
                selection_with_ellipsis: {
                  type: "string",
                  description: "For replace_content_range/insert_content_after: First ~10 chars + '...' + last ~10 chars of the text to match. Example: '# Section 1...end of section'"
                }
              },
              required: ["page_id", "command"]
            }
          },
          required: ["data"]
        }
      }
    ],
    messages
  }
}];
