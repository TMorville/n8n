// Update RSS feed with new episode
// Downloads existing feed.xml, prepends new episode, re-uploads

const existingFeed = $('Download RSS').first().json;
const episode = $('Extract Script').first().json;
const config = $('Config').first().json;

// Parse the MP3 URL from GCS upload response
const mp3Upload = $('Upload MP3').first().json;
const mp3Url = mp3Upload.mediaLink || mp3Upload.selfLink ||
  `https://storage.googleapis.com/${config.gcsBucket}/episodes/${episode.episodeDate}-briefing.mp3`;

// Get file size from upload response (needed for RSS enclosure)
const fileSize = mp3Upload.size || 0;

// Current date in RFC 2822 format for RSS
const pubDate = new Date().toUTCString();

// Create new episode item
const newEpisode = `    <item>
      <title>${escapeXml(episode.episodeTitle)}</title>
      <description><![CDATA[${episode.description}]]></description>
      <enclosure url="${mp3Url}" length="${fileSize}" type="audio/mpeg"/>
      <guid isPermaLink="true">${mp3Url}</guid>
      <pubDate>${pubDate}</pubDate>
      <itunes:duration>${episode.estimatedMinutes * 60}</itunes:duration>
      <itunes:episode>${getEpisodeNumber()}</itunes:episode>
    </item>`;

// Parse existing feed and insert new episode
let feedXml = '';

if (existingFeed.data) {
  // Feed exists - insert new episode after <channel> opening tags
  feedXml = existingFeed.data;

  // Find the position after the last channel metadata tag (before first <item> or </channel>)
  const itemMatch = feedXml.match(/<item>/);
  const channelEndMatch = feedXml.match(/<\/channel>/);

  if (itemMatch) {
    // Insert before first existing item
    const insertPos = itemMatch.index;
    feedXml = feedXml.slice(0, insertPos) + newEpisode + '\n' + feedXml.slice(insertPos);
  } else if (channelEndMatch) {
    // No existing items - insert before </channel>
    const insertPos = channelEndMatch.index;
    feedXml = feedXml.slice(0, insertPos) + newEpisode + '\n  ' + feedXml.slice(insertPos);
  }

  // Trim old episodes (keep last 30)
  feedXml = trimOldEpisodes(feedXml, 30);

  // Update lastBuildDate
  feedXml = feedXml.replace(
    /<lastBuildDate>[^<]*<\/lastBuildDate>/,
    `<lastBuildDate>${pubDate}</lastBuildDate>`
  );
} else {
  // No existing feed - create new one
  feedXml = createNewFeed(config, newEpisode, pubDate);
}

return {
  json: {
    feedXml,
    episodeAdded: episode.episodeTitle,
    mp3Url
  }
};

// Helper functions
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getEpisodeNumber() {
  // Calculate episode number based on date (days since start)
  const startDate = new Date('2026-01-01');
  const today = new Date();
  const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  return daysDiff + 1;
}

function trimOldEpisodes(xml, maxEpisodes) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  if (items.length <= maxEpisodes) return xml;

  // Keep only the first maxEpisodes items
  const itemsToRemove = items.slice(maxEpisodes);
  let result = xml;
  for (const item of itemsToRemove) {
    result = result.replace(item + '\n', '');
  }
  return result;
}

function createNewFeed(config, firstEpisode, pubDate) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(config.podcastTitle || 'My Morning Briefing')}</title>
    <description>${escapeXml(config.podcastDescription || 'Personal daily morning briefing podcast')}</description>
    <link>https://storage.googleapis.com/${config.gcsBucket}/</link>
    <language>en-us</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <atom:link href="https://storage.googleapis.com/${config.gcsBucket}/feed.xml" rel="self" type="application/rss+xml"/>
    <itunes:author>${escapeXml(config.userName || 'Morning Briefing')}</itunes:author>
    <itunes:summary>${escapeXml(config.podcastDescription || 'Personal daily morning briefing podcast')}</itunes:summary>
    <itunes:category text="Daily News"/>
    <itunes:explicit>false</itunes:explicit>
    <itunes:image href="https://storage.googleapis.com/${config.gcsBucket}/cover.jpg"/>
${firstEpisode}
  </channel>
</rss>`;
}
