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
 */

// === FORMAT CALENDAR RESULTS ===
// Use this code for the Format Calendar node

/*
const events = $input.all();
const toolCall = $('Split Tool Calls').first().json;

const formatted = events.map(e => ({
  title: e.json.summary || 'No title',
  start: e.json.start?.dateTime || e.json.start?.date,
  end: e.json.end?.dateTime || e.json.end?.date,
  location: e.json.location || null,
  attendees: (e.json.attendees || []).map(a => a.email).slice(0, 5)
}));

return [{
  json: {
    toolCallId: toolCall.id,
    toolName: 'get-calendar-events',
    result: {
      eventCount: formatted.length,
      events: formatted
    },
    fromMerge: true
  }
}];
*/


// === FORMAT EMAIL RESULTS ===
// Use this code for the Format Emails node

/*
const emails = $input.all();
const toolCall = $('Split Tool Calls').first().json;

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

return [{
  json: {
    toolCallId: toolCall.id,
    toolName: 'get-emails',
    result: {
      emailCount: formatted.length,
      emails: formatted
    },
    fromMerge: true
  }
}];
*/


// === FORMAT SLACK RESULTS ===
// Use this code for the Format Slack node

/*
const messages = $input.all();
const toolCall = $('Split Tool Calls').first().json;

const formatted = messages
  .filter(m => m.json.text)
  .map(m => ({
    channel: m.json.channel?.name || 'DM',
    sender: m.json.user_profile?.real_name || m.json.user || 'Unknown',
    text: m.json.text || ''
  }));

return [{
  json: {
    toolCallId: toolCall.id,
    toolName: 'get-slack-messages',
    result: {
      messageCount: formatted.length,
      messages: formatted
    },
    fromMerge: true
  }
}];
*/


// === FORMAT TODOIST RESULTS ===
// Use this code for the Format Tasks node

/*
const tasks = $input.all();
const toolCall = $('Split Tool Calls').first().json;
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

return [{
  json: {
    toolCallId: toolCall.id,
    toolName: 'get-todoist-tasks',
    result: {
      taskCount: formatted.length,
      staleTaskCount: staleCount,
      tasks: formatted
    },
    fromMerge: true
  }
}];
*/


// === FORMAT NOTION SEARCH RESULTS ===
// Use this code for the Format Notion Search node

/*
const searchResults = $input.first().json;
const toolCall = $('Split Tool Calls').first().json;

// MCP returns: { content: [{ type: 'text', text: '...' }] }
let results = [];
if (searchResults.content && Array.isArray(searchResults.content)) {
  for (const c of searchResults.content) {
    if (c.type === 'text') {
      try {
        // Try to parse as JSON array of results
        const parsed = JSON.parse(c.text);
        if (Array.isArray(parsed)) {
          results = parsed.map(r => ({
            id: r.id,
            title: r.title || r.properties?.title?.[0]?.plain_text || 'Untitled',
            url: r.url
          }));
        }
      } catch (e) {
        // Return raw text if not JSON
        results = [{ text: c.text }];
      }
    }
  }
}

return [{
  json: {
    toolCallId: toolCall.id,
    toolName: 'notion-search',
    result: {
      resultCount: results.length,
      results: results.slice(0, 10)
    },
    fromMerge: true
  }
}];
*/


// === FORMAT NOTION FETCH RESULTS ===
// Use this code for the Format Notion Fetch node

/*
const fetchResult = $input.first().json;
const toolCall = $('Split Tool Calls').first().json;

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

// Limit content length
content = String(content || '').substring(0, 2000);

return [{
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
}];
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
