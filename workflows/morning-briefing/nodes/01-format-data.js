// Format all gathered data for Claude prompt
// This node combines data from all 5 sources into a structured format
// Updated: Stale task detection, capacity calculation, MCP Notion content

const calendar = $('Google Calendar').all();
const emails = $('Gmail').all();
const slack = $('Slack').all();
const tasks = $('Todoist').all();
const notion = $('Process MCP Result').all();

// Stale task detection constants
const STALE_DAYS = 7;
const today = new Date();

// Format calendar events and calculate duration
const calendarData = calendar.map(e => {
  const start = e.json.start?.dateTime || e.json.start?.date;
  const end = e.json.end?.dateTime || e.json.end?.date;
  return {
    title: e.json.summary || 'No title',
    start,
    end,
    location: e.json.location || null
  };
});

// Calculate calendar load (minutes)
const calendarMinutes = calendarData.reduce((sum, e) => {
  if (!e.start || !e.end) return sum;
  const startDate = new Date(e.start);
  const endDate = new Date(e.end);
  // Skip all-day events (no time component)
  if (e.start.length <= 10) return sum;
  return sum + (endDate - startDate) / 60000;
}, 0);

// Format emails - handle different Gmail response formats
const emailData = emails.map(e => {
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

// Format Slack messages
const slackData = slack.filter(m => m.json.text).map(m => ({
  channel: m.json.channel?.name || 'DM',
  sender: m.json.user_profile?.real_name || m.json.user || 'Unknown',
  text: m.json.text || ''
}));

// Format Todoist tasks with staleness detection
const taskData = tasks.map(t => {
  const created = t.json.created_at ? new Date(t.json.created_at) : null;
  const ageInDays = created ? Math.floor((today - created) / 86400000) : null;

  return {
    content: t.json.content,
    due: t.json.due?.date || 'Today',
    priority: t.json.priority,
    ageInDays,
    isStale: ageInDays !== null && ageInDays >= STALE_DAYS
  };
});

// Count stale tasks
const staleTaskCount = taskData.filter(t => t.isStale).length;

// Format Notion pages with content from MCP
const notionData = notion.map(n => ({
  title: n.json.title || 'Untitled',
  url: n.json.url,
  content: n.json.content || ''
}));

const dateStr = today.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

// Capacity calculation
const WORKDAY = 480; // 8 hours in minutes
const taskMinutes = taskData.length * 30; // estimate 30 min/task
const loadPercent = Math.round(((calendarMinutes + taskMinutes) / WORKDAY) * 100);

return {
  json: {
    date: dateStr,
    calendar: calendarData,
    emails: emailData,
    slack: slackData,
    tasks: taskData,
    recentNotes: notionData,
    stats: {
      eventCount: calendarData.length,
      emailCount: emailData.length,
      slackCount: slackData.length,
      taskCount: taskData.length,
      staleTaskCount,
      noteCount: notionData.length
    },
    capacity: {
      calendarMinutes,
      taskMinutes,
      loadPercent,
      isOverCapacity: loadPercent > 80
    }
  }
};
