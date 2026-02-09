/**
 * Node: Format Tool Results
 * Type: Code (JavaScript)
 * Position: After each tool execution path, before Merge
 *
 * Purpose: Format the raw tool output into a consistent structure for
 * Claude's tool_result format. Each tool has its own formatting logic.
 *
 * This is a template - actual implementation depends on which tool was called.
 * The workflow uses separate Format nodes for each tool path.
 *
 * MULTI-CALL HANDLING:
 * When Claude calls the same tool multiple times in one turn, each tool_use ID
 * must get a matching tool_result. Two patterns are used:
 *
 * Pattern A (API-based tools: Calendar, Gmail, Slack, Todoist):
 *   Prepare node collapses all calls into 1 item with _toolCalls array.
 *   Format node outputs one result per tool call ID, all sharing the same data.
 *
 * Pattern B (MCP-based tools: Notion Search, Notion Fetch):
 *   Prepare node outputs all items (one per call, each with different params).
 *   Format node pairs results with Prepare outputs by index.
 */

// === FORMAT CALENDAR RESULTS (Pattern A) ===
// Use this code for the Format Calendar node

/*
const events = $input.all();
const allToolCalls = $('Prepare Calendar').first().json._toolCalls;

const formatted = events.map(e => ({
  title: e.json.summary || 'No title',
  start: e.json.start?.dateTime || e.json.start?.date,
  end: e.json.end?.dateTime || e.json.end?.date,
  location: e.json.location || null,
  attendees: (e.json.attendees || []).map(a => a.email).slice(0, 5)
}));

const result = { eventCount: formatted.length, events: formatted };

return allToolCalls.map(tc => ({
  json: {
    toolCallId: tc.id,
    toolName: 'get-calendar-events',
    result,
    fromMerge: true
  }
}));
*/


// === FORMAT EMAIL RESULTS (Pattern A) ===
// Use this code for the Format Emails node

/*
const emails = $input.all();
const allToolCalls = $('Prepare Emails').first().json._toolCalls;

const formatted = emails.map(e => {
  const headers = e.json.payload?.headers || [];
  const getHeader = (name) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;

  return {
    from: getHeader('From') || e.json.from || 'Unknown',
    subject: getHeader('Subject') || e.json.subject || 'No subject',
    snippet: e.json.snippet || '',
    isImportant: e.json.labelIds?.includes('IMPORTANT'),
    isStarred: e.json.labelIds?.includes('STARRED')
  };
});

const result = { emailCount: formatted.length, emails: formatted };

return allToolCalls.map(tc => ({
  json: {
    toolCallId: tc.id,
    toolName: 'get-emails',
    result,
    fromMerge: true
  }
}));
*/


// === FORMAT SLACK RESULTS (Pattern A) ===
// Use this code for the Format Slack node

/*
const messages = $input.all();
const allToolCalls = $('Prepare Slack').first().json._toolCalls;

const formatted = messages
  .filter(m => m.json.text)
  .map(m => ({
    channel: m.json.channel?.name || 'DM',
    sender: m.json.user_profile?.real_name || m.json.user || 'Unknown',
    text: m.json.text || ''
  }));

const result = { messageCount: formatted.length, messages: formatted };

return allToolCalls.map(tc => ({
  json: {
    toolCallId: tc.id,
    toolName: 'get-slack-messages',
    result,
    fromMerge: true
  }
}));
*/


// === FORMAT TODOIST RESULTS (Pattern A) ===
// Use this code for the Format Tasks node

/*
const tasks = $input.all();
const allToolCalls = $('Prepare Tasks').first().json._toolCalls;
const today = new Date();
const STALE_DAYS = 7;

const formatted = tasks.map(t => {
  const created = t.json.created_at ? new Date(t.json.created_at) : null;
  const ageInDays = created ? Math.floor((today - created) / 86400000) : null;

  return {
    content: t.json.content,
    due: t.json.due?.date || 'Today',
    priority: t.json.priority,
    project: t.json.project?.name || null,
    ageInDays,
    isStale: ageInDays !== null && ageInDays >= STALE_DAYS
  };
});

const staleCount = formatted.filter(t => t.isStale).length;
const result = { taskCount: formatted.length, staleTaskCount: staleCount, tasks: formatted };

return allToolCalls.map(tc => ({
  json: {
    toolCallId: tc.id,
    toolName: 'get-todoist-tasks',
    result,
    fromMerge: true
  }
}));
*/


// === FORMAT NOTION SEARCH RESULTS (Pattern B) ===
// Use this code for the Format Notion Search node

/*
const allResults = $input.all();
const prepareItems = $('Prepare Notion Search').all();

return allResults.map((item, index) => {
  const searchResult = item.json;
  const toolCall = prepareItems[index]?.json._toolCall || prepareItems[0]?.json._toolCall;

  // MCP returns: { content: [{ type: 'text', text: '...' }] }
  let results = [];
  if (searchResult.content && Array.isArray(searchResult.content)) {
    for (const c of searchResult.content) {
      if (c.type === 'text') {
        try {
          const parsed = JSON.parse(c.text);
          if (Array.isArray(parsed)) {
            results = parsed.map(r => ({
              id: r.id,
              title: r.title || r.properties?.title?.[0]?.plain_text || 'Untitled',
              url: r.url
            }));
          }
        } catch (e) {
          results = [{ text: c.text }];
        }
      }
    }
  }

  return {
    json: {
      toolCallId: toolCall.id,
      toolName: 'notion-search',
      result: { resultCount: results.length, results: results.slice(0, 10) },
      fromMerge: true
    }
  };
});
*/


// === FORMAT NOTION FETCH RESULTS (Pattern B) ===
// Use this code for the Format Notion Fetch node

/*
const allResults = $input.all();
const prepareItems = $('Prepare Notion Fetch').all();

return allResults.map((item, index) => {
  const fetchResult = item.json;
  const toolCall = prepareItems[index]?.json._toolCall || prepareItems[0]?.json._toolCall;

  let content = '';
  let title = '';
  let url = '';

  if (fetchResult.content && Array.isArray(fetchResult.content)) {
    for (const c of fetchResult.content) {
      if (c.type === 'text' && c.text) {
        const textObj = c.text;
        if (typeof textObj === 'string') {
          content = textObj;
        } else {
          title = textObj.title || title;
          url = textObj.url || url;
          content = textObj.text || content;
        }
      }
    }
  }

  content = String(content || '').substring(0, 2000);

  return {
    json: {
      toolCallId: toolCall.id,
      toolName: 'notion-fetch',
      result: {
        title: title || '(Untitled)',
        url: url || '',
        content: content || '(No content extracted)'
      },
      fromMerge: true
    }
  };
});
*/


// === GENERIC PASSTHROUGH ===
// Default implementation - passes through input with tool metadata
const toolCall = $('Split Tool Calls').first().json;
const result = $input.first().json;

return [{
  json: {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    result: result,
    fromMerge: true
  }
}];
