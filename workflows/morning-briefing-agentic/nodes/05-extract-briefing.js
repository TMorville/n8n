/**
 * Node: Extract Briefing
 * Type: Code (JavaScript)
 * Position: Exit path from agent loop (after Parse Tool Call when shouldContinue=false)
 *
 * Purpose: Extract and format the final briefing text for TTS processing.
 * Handles both generate-briefing tool output and natural end_turn responses.
 */

const parseResult = $('Parse Tool Call').first().json;

let briefingText = parseResult.briefingText || '';
const exitReason = parseResult.exitReason;

// If no briefing text was captured, try to extract from text content
if (!briefingText && parseResult.textContent) {
  briefingText = parseResult.textContent;
}

// If still no text, generate a fallback message
if (!briefingText) {
  const today = parseResult.today || new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (exitReason === 'max_iterations_reached') {
    briefingText = `Good morning. I ran into some technical difficulties preparing your full briefing today. I'd recommend checking your calendar and email directly. Have a good day.`;
  } else if (exitReason === 'timeout') {
    briefingText = `Good morning. The briefing preparation took longer than expected. Please check your calendar and tasks directly for today's schedule.`;
  } else {
    briefingText = `Good morning. There was an issue generating your briefing for ${today}. Please check your calendar and email for today's schedule.`;
  }
}

// Clean up the briefing text for TTS
briefingText = briefingText
  // Remove any markdown formatting that slipped through
  .replace(/^#+ /gm, '')
  .replace(/\*\*/g, '')
  .replace(/\*/g, '')
  .replace(/`/g, '')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // Normalize whitespace
  .replace(/\n{3,}/g, '\n\n')
  .trim();

// Calculate stats for the episode
const wordCount = briefingText.split(/\s+/).length;
const estimatedMinutes = Math.round(wordCount / 160); // ~160 wpm for natural speech

const today = new Date();
const episodeDate = today.toISOString().split('T')[0];
const episodeTitle = `Briefing - ${episodeDate}`;

// Create description from first paragraph
const firstParagraph = briefingText.split('\n\n')[0] || '';
const description = firstParagraph.substring(0, 200) + (firstParagraph.length > 200 ? '...' : '');

// Calculate total token usage across all iterations
const usage = parseResult.usage || {};

return [{
  json: {
    // Main output for TTS
    script: briefingText,

    // Episode metadata
    episodeTitle,
    episodeDate,
    description,

    // Stats
    wordCount,
    estimatedMinutes,

    // Agent stats
    exitReason,
    iteration: parseResult.iteration,
    usage: {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
    }
  }
}];
