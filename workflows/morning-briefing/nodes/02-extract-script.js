// Extract the script text from Claude's response
// Updated: Faster word rate (160 wpm) and briefing-style title

const response = $input.first().json;

let scriptText = '';
let inputTokens = 0;
let outputTokens = 0;

if (response.content && Array.isArray(response.content)) {
  scriptText = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n\n');
  inputTokens = response.usage?.input_tokens || 0;
  outputTokens = response.usage?.output_tokens || 0;
} else if (response.text) {
  scriptText = response.text;
} else if (typeof response === 'string') {
  scriptText = response;
}

// Clean up for TTS
scriptText = scriptText
  .replace(/^#+ /gm, '')
  .replace(/\*\*/g, '')
  .replace(/\*/g, '')
  .replace(/`/g, '')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .trim();

const wordCount = scriptText.split(/\s+/).length;
// Faster pace for direct delivery: 160 wpm
const estimatedMinutes = Math.round(wordCount / 160);

const today = new Date();
const episodeDate = today.toISOString().split('T')[0];
// Updated title for briefing style
const episodeTitle = `Briefing - ${episodeDate}`;

const firstParagraph = scriptText.split('\n\n')[0] || '';
const description = firstParagraph.substring(0, 200) + (firstParagraph.length > 200 ? '...' : '');

return {
  json: {
    script: scriptText,
    wordCount,
    estimatedMinutes,
    episodeTitle,
    episodeDate,
    description,
    usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens }
  }
};
