// Fetch actual content for each Notion page
// This node sits between Notion and Merge Data to fetch block content

const pages = $input.all();

const results = [];

for (const page of pages.slice(0, 5)) { // Limit to 5 pages
  const pageId = page.json.id;

  if (!pageId) {
    results.push({
      json: {
        ...page.json,
        content: '(No page ID)'
      }
    });
    continue;
  }

  try {
    const response = await this.helpers.httpRequestWithAuthentication.call(
      this,
      'notionApi',
      {
        method: 'GET',
        url: `https://api.notion.com/v1/blocks/${pageId}/children?page_size=50`,
        headers: {
          'Notion-Version': '2022-06-28'
        }
      }
    );

    // Extract text from blocks
    const content = (response.results || [])
      .filter(b => b.type === 'paragraph' || b.type === 'heading_1' ||
                   b.type === 'heading_2' || b.type === 'heading_3' ||
                   b.type === 'bulleted_list_item' || b.type === 'numbered_list_item')
      .map(b => {
        const richText = b[b.type]?.rich_text || [];
        return richText.map(t => t.plain_text).join('');
      })
      .filter(t => t.length > 0)
      .join('\n')
      .substring(0, 1000); // Limit content length

    results.push({
      json: {
        ...page.json,
        content: content || '(No text content)'
      }
    });
  } catch (err) {
    results.push({
      json: {
        ...page.json,
        content: `(Could not fetch content: ${err.message})`
      }
    });
  }
}

return results;
