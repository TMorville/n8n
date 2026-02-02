/**
 * Node: Parse Tool Call
 * Type: Code (JavaScript)
 * Position: After Claude API call
 *
 * Purpose: Extract tool_use blocks from Claude's response and determine
 * whether to continue the loop (execute tools) or exit (generate briefing).
 *
 * Exit conditions:
 * - stop_reason === "end_turn" (Claude finished naturally)
 * - tool === "generate-briefing" (Claude explicitly signals completion)
 * - Error conditions (max iterations, timeout)
 */

const claudeResponse = $input.first().json;
const claudeRequest = $('Claude Agent').first().json;
const state = claudeRequest._state;

// Check for error conditions from Claude Agent
if (claudeResponse.error) {
  return [{
    json: {
      shouldContinue: false,
      exitReason: claudeResponse.error,
      exitMessage: claudeResponse.message,
      briefingText: null,
      ...state
    }
  }];
}

/**
 * Fix stringified JSON in tool inputs.
 * Claude sometimes returns JSON arrays/objects as strings.
 */
function parseStringifiedJson(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        return parseStringifiedJson(JSON.parse(trimmed));
      } catch (e) {
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

// Parse Claude's response content
const toolCalls = [];
let textContent = '';
let briefingText = null;

if (claudeResponse.content && Array.isArray(claudeResponse.content)) {
  for (const block of claudeResponse.content) {
    if (block.type === 'tool_use') {
      const fixedInput = parseStringifiedJson(block.input);
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: fixedInput
      });

      // Check for generate-briefing tool
      if (block.name === 'generate-briefing') {
        briefingText = fixedInput.briefing_text || '';
      }
    } else if (block.type === 'text') {
      textContent += block.text;
    }
  }
}

// Build updated conversation history
const conversationHistory = claudeRequest.messages ? [...claudeRequest.messages] : [];

// Add assistant's response
conversationHistory.push({
  role: "assistant",
  content: claudeResponse.content
});

// Determine if we should continue the loop
const stopReason = claudeResponse.stop_reason;
const hasGenerateBriefing = toolCalls.some(t => t.name === 'generate-briefing');
const hasOtherToolCalls = toolCalls.some(t => t.name !== 'generate-briefing');

// Exit conditions:
// 1. Claude stopped naturally (end_turn)
// 2. Claude called generate-briefing
// 3. No tool calls at all
const shouldContinue = stopReason === "tool_use" && !hasGenerateBriefing && hasOtherToolCalls;

let exitReason = null;
if (!shouldContinue) {
  if (hasGenerateBriefing) {
    exitReason = "generate-briefing";
  } else if (stopReason === "end_turn") {
    exitReason = "end_turn";
    // If Claude ended without generate-briefing, use text content as briefing
    if (!briefingText && textContent) {
      briefingText = textContent;
    }
  } else if (toolCalls.length === 0) {
    exitReason = "no_tool_calls";
    if (!briefingText && textContent) {
      briefingText = textContent;
    }
  }
}

// Filter out generate-briefing from tool calls to execute
const toolCallsToExecute = toolCalls.filter(t => t.name !== 'generate-briefing');

return [{
  json: {
    // Loop control
    shouldContinue,
    exitReason,
    stopReason,

    // Tool calls to execute (excluding generate-briefing)
    toolCalls: toolCallsToExecute,
    toolCallCount: toolCallsToExecute.length,

    // For exit path
    briefingText,
    textContent,

    // State for next iteration
    conversationHistory,
    ...state,

    // Usage stats
    usage: claudeResponse.usage
  }
}];
