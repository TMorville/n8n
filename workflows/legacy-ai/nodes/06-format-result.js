/**
 * Node: Format Search Result / Format Create Result / Format Fetch Result / Format Update Result
 * Type: Code (JavaScript)
 * Position: After each MCP tool node (Search, Create, Fetch, Update)
 *
 * Purpose: Standardize MCP output for Claude's tool_result format
 *
 * Note: This same code is used in all 4 Format Result nodes (one per tool path)
 */

const parseToolCallData = $('Parse Tool Call').first().json;
const toolCall = parseToolCallData.toolCalls[0];
const mcpResult = $input.first().json;

return [{
  json: {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    result: mcpResult,
    inputParams: toolCall.input
  }
}];