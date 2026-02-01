/**
 * Node: Build Claude Request
 * Type: Code (JavaScript)
 * Position: After Format Thread for Claude
 *
 * Purpose: Build Claude API request with tool definitions for Notion page creation
 */

const threadText = $input.first().json.threadText;
const responseUrl = $input.first().json.responseUrl;
const channelName = $('Extract Thread Info').first().json.channelName;

return [{
  json: {
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    tools: [
      {
        name: "create_notion_page",
        description: "Create a well-structured page in Notion with the thread summary. Structure it intelligently with headings, sections, and formatting.",
        input_schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "A clear, descriptive title for the page"
            },
            content: {
              type: "string",
              description: "The formatted content in Notion-flavored Markdown with proper structure, headings, and sections"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Relevant tags for categorization"
            }
          },
          required: ["title", "content"]
        }
      }
    ],
    messages: [
      {
        role: "user",
        content: `Analyze this Slack thread from #${channelName} and create a well-structured Notion page summarizing it.

Important:
- Create a clear, descriptive title
- Structure the content with proper headings and sections
- Include key points, decisions, and action items
- Use Notion-flavored Markdown for formatting
- Add relevant tags for categorization

Thread content:
${threadText}`
      }
    ],
    responseUrl: responseUrl
  }
}];
