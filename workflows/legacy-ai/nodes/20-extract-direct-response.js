/**
 * Node: Extract Direct Response
 * Type: Code (JavaScript)
 * Position: After IF Has Tool Calls? (FALSE branch)
 *
 * Purpose: Handle commands where Claude doesn't use any tools
 */

const parseToolCallData = $input.first().json;

return [{
  json: {
    responseText: parseToolCallData.directResponseText || "I'm not sure how to help with that. Try asking me to search, create, or update Notion pages.",
    channelId: $('Extract Context').first().json.channelId,
    threadTs: $('Extract Context').first().json.threadTs
  }
}];