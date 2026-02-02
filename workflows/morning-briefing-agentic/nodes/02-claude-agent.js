/**
 * Node: Claude Agent
 * Type: Code (JavaScript)
 * Position: In the agent loop (receives from Initialize or from Merge after tool execution)
 *
 * Purpose: Build Claude API request with tool definitions and conversation history.
 * Handles both first turn (no history) and subsequent turns (with tool results).
 */

// Determine if this is the first turn or a subsequent turn
const currentInput = $input.first().json;

// Check for subsequent turn indicators
const isSubsequentTurn = currentInput.toolCallId !== undefined ||
                         (currentInput.conversationHistory && currentInput.conversationHistory.length > 0 && currentInput.fromMerge);

let state, conversationHistory, tools, systemPrompt;

if (isSubsequentTurn) {
  // Subsequent turn: Get state from Parse Tool Call node
  const parseData = $('Parse Tool Call').first().json;
  state = {
    iteration: parseData.iteration,
    maxIterations: parseData.maxIterations,
    startTime: parseData.startTime,
    timeoutMs: parseData.timeoutMs,
    today: parseData.today,
    todayISO: parseData.todayISO
  };
  conversationHistory = parseData.conversationHistory || [];
  tools = parseData.tools;
  systemPrompt = parseData.systemPrompt;

  // Add tool results as user message
  const toolResults = $input.all();
  const toolResultBlocks = toolResults.map(item => ({
    type: "tool_result",
    tool_use_id: item.json.toolCallId,
    content: JSON.stringify(item.json.result)
  }));

  conversationHistory.push({
    role: "user",
    content: toolResultBlocks
  });

} else {
  // First turn: Initialize from state
  state = currentInput;
  conversationHistory = [];
  tools = currentInput.tools;
  systemPrompt = currentInput.systemPrompt;

  // Add initial user message
  conversationHistory.push({
    role: "user",
    content: `Please prepare my morning briefing for today (${state.today}).

Start by gathering the information you need using the available tools. A typical approach:
1. Check my calendar to understand the day's structure
2. Check my tasks to know my priorities
3. Scan emails for anything urgent
4. Check Slack for team updates
5. Optionally look up Notion context for important meetings

Once you have enough context (usually 3-5 tool calls), call generate-briefing with the complete briefing text.`
  });
}

// Check iteration and timeout limits
const iteration = (state.iteration || 0) + 1;
const elapsed = Date.now() - state.startTime;

if (iteration > state.maxIterations) {
  // Safety limit reached - force exit
  return [{
    json: {
      error: "max_iterations_reached",
      message: `Reached maximum of ${state.maxIterations} iterations`,
      iteration,
      conversationHistory
    }
  }];
}

if (elapsed > state.timeoutMs) {
  // Timeout reached - force exit
  return [{
    json: {
      error: "timeout",
      message: `Exceeded ${state.timeoutMs / 1000}s timeout`,
      iteration,
      elapsed,
      conversationHistory
    }
  }];
}

// Build the Claude API request
return [{
  json: {
    // API request body
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    tools: tools,
    messages: conversationHistory,

    // Pass state through for next iteration
    _state: {
      iteration,
      maxIterations: state.maxIterations,
      startTime: state.startTime,
      timeoutMs: state.timeoutMs,
      today: state.today,
      todayISO: state.todayISO,
      tools,
      systemPrompt
    }
  }
}];
