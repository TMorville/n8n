/**
 * Node: Build Notion Context
 * Type: Code (JavaScript)
 * Position: After Get Thread Messages
 *
 * Purpose: Build context about available Notion databases for Claude
 */

// Available Notion databases with their IDs
const notionDatabases = [
  {
    name: "Engineering Docs",
    id: "27174f4c920280c3b266f3714a5723b9",
    description: "Technical documentation, architecture decisions, API docs"
  },
  {
    name: "PO Docs",
    id: "28c74f4c920281029bb4faed43f61cc1",
    description: "Product requirements, feature specs, roadmap items"
  },
  {
    name: "Commercial Docs",
    id: "28c74f4c920281ae89d2dfd231ff48e8",
    description: "Sales materials, customer documentation, commercial guides"
  }
];

// Build formatted context string
const notionContext = `Available Notion Databases:

${notionDatabases.map(db => `- **${db.name}** (ID: ${db.id})
  ${db.description}`).join('\n\n')}

When creating pages, use the database_id from above in the parent object.
When searching, searches across all accessible pages and databases.`;

return [{
  json: {
    notionDatabases,
    notionContext
  }
}];
