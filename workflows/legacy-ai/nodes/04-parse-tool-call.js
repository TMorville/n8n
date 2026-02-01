/**
 * Node: Parse Tool Call (Multi-Turn)
 * Type: Code (JavaScript)
 * Position: After Claude Planning API Call
 *
 * Purpose: Extract tool_use blocks and manage conversation history for multi-turn
 */

const claudeResponse = $input.first().json;
const claudePlanningRequest = $('Claude Planning').first().json;

// === DEBUG LOGGING ===
console.log('=== PARSE TOOL CALL DEBUG ===');
console.log('Claude stop_reason:', claudeResponse.stop_reason);
console.log('Claude content blocks:', claudeResponse.content?.map(b => b.type).join(', '));
// === END DEBUG ===

/**
 * Fix stringified JSON in tool inputs.
 * Claude sometimes returns JSON arrays/objects as strings instead of actual structures.
 * This recursively parses any string that looks like JSON.
 */
function parseStringifiedJson(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Check if it looks like JSON (starts with [ or {)
    const trimmed = obj.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        // Recursively process the parsed result
        return parseStringifiedJson(parsed);
      } catch (e) {
        // Not valid JSON, return as-is
        return obj;
      }
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => parseStringifiedJson(item));
  }

  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = parseStringifiedJson(value);
    }
    return result;
  }

  return obj;
}

// Find tool_use blocks in Claude's response
const toolCalls = [];
let hasDirectResponse = false;
let directResponseText = '';

if (claudeResponse.content && Array.isArray(claudeResponse.content)) {
  for (const block of claudeResponse.content) {
    if (block.type === 'tool_use') {
      // Fix any stringified JSON in the input
      const fixedInput = parseStringifiedJson(block.input);
      console.log('Tool input before fix:', JSON.stringify(block.input).substring(0, 200));
      console.log('Tool input after fix:', JSON.stringify(fixedInput).substring(0, 200));

      toolCalls.push({
        id: block.id,
        name: block.name,
        input: fixedInput
      });
    } else if (block.type === 'text') {
      hasDirectResponse = true;
      directResponseText += block.text;
    }
  }
}

// Get context from earlier nodes (needed for both tool calls AND direct responses)
const originalCommand = $('Extract Context').first().json.command;
const originalThread = $('Format Thread for Claude').first().json.threadText;

// Build/update conversation history
let conversationHistory = [];

// Get existing messages from the request
if (claudePlanningRequest.messages && Array.isArray(claudePlanningRequest.messages)) {
  conversationHistory = [...claudePlanningRequest.messages];
}

// Add assistant's response to conversation history
conversationHistory.push({
  role: "assistant",
  content: claudeResponse.content  // Full content array (may include tool_use blocks)
});

// Check stop_reason to determine if we should loop or finish
const shouldContinue = claudeResponse.stop_reason === "tool_use" && toolCalls.length > 0;

// === DEBUG LOGGING ===
console.log('Tool calls found:', toolCalls.length);
if (toolCalls.length > 0) {
  console.log('Tool names:', toolCalls.map(t => t.name).join(', '));
}
console.log('Has direct response text?', hasDirectResponse);
console.log('shouldContinue:', shouldContinue);
console.log('Will route to:', shouldContinue ? 'Switch Tool (loop continues)' : 'Extract Direct Response (exit loop)');
// === END DEBUG ===

// If no tool calls AND no direct response, something went wrong
if (toolCalls.length === 0 && !hasDirectResponse) {
  return [{
    json: {
      hasToolCalls: false,
      hasDirectResponse: false,
      shouldContinue: false,
      directResponseText: "I encountered an issue processing the request.",
      stopReason: claudeResponse.stop_reason,
      originalCommand,
      originalThread,
      conversationHistory
    }
  }];
}

// If Claude provided a final text response (no more tool calls)
if (!shouldContinue) {
  return [{
    json: {
      hasToolCalls: false,
      hasDirectResponse: true,
      shouldContinue: false,
      directResponseText,
      stopReason: claudeResponse.stop_reason,
      originalCommand,
      originalThread,
      conversationHistory
    }
  }];
}

// Return tool calls for execution + conversation history for next turn
return [{
  json: {
    hasToolCalls: true,
    hasDirectResponse,
    directResponseText,
    shouldContinue: true,
    toolCalls,
    stopReason: claudeResponse.stop_reason,
    originalCommand,
    originalThread,
    conversationHistory  // Pass to next turn
  }
}];
