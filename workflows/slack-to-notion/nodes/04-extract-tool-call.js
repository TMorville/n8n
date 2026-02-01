/**
 * Node: Extract Tool Call
 * Type: Code (JavaScript)
 * Position: After Claude API Call
 *
 * Purpose: Extract Claude's tool call parameters and prepare for MCP Client
 */

const claudeResponse = $input.first().json;
const toolUseBlock = claudeResponse.content.find(block => block.type === 'tool_use');

if (!toolUseBlock) {
  throw new Error('Claude did not return a tool call');
}

// Get responseUrl from earlier in the workflow
const responseUrl = $('Build Claude Request').first().json.responseUrl;

return [{
  json: {
    parent: {
      database_id: "27174f4c920280c3b266f3714a5723b9"  // Replace with your database ID
    },
    pages: [
      {
        properties: {
          title: toolUseBlock.input.title  // Title in markdown format
        },
        content: toolUseBlock.input.content  // Notion-flavored Markdown content
      }
    ],
    responseUrl: responseUrl
  }
}];
