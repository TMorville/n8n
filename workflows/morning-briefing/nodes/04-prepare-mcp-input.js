// Prepare input for MCP notion-fetch - process each item
// This node sits between Limit and MCP Client

const items = $input.all();
return items.map(item => ({
  json: {
    ...item.json,
    mcpInput: {
      id: item.json.id,
      type: "page"
    }
  }
}));
