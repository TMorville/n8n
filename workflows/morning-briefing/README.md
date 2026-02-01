# Morning Briefing Podcast Workflow

An n8n workflow that generates a personalized daily morning briefing podcast. Runs at 6:00 AM, gathers data from multiple sources, generates a ~10-minute podcast script via Claude, converts to audio via ElevenLabs TTS, and publishes as an RSS podcast feed on Google Cloud Storage.

## Architecture

```
┌─────────────────┐
│ Schedule Trigger│ (6:00 AM daily)
└────────┬────────┘
         │
         ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     PARALLEL DATA GATHERING                            │
├──────────────┬──────────────┬─────────────┬─────────────┬─────────────┤
│ Google       │ Gmail        │ Slack       │ Todoist     │ Notion      │
│ Calendar     │ (important/  │ (DMs &      │ (today's    │ (notes from │
│ (today's     │ starred)     │ mentions)   │ tasks)      │ last week)  │
│ events)      │              │             │             │             │
└──────────────┴──────────────┴─────────────┴─────────────┴─────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Merge + Format │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Claude API      │
                    │ (Script Gen)    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ ElevenLabs TTS  │
                    │ (Script → MP3)  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ GCS Upload      │
                    │ (MP3 + RSS)     │
                    └─────────────────┘
```

## Setup Instructions

### 1. Create GCS Bucket

Create a bucket in a **non-US region** (e.g., `europe-west1`):

```bash
gsutil mb -l europe-west1 gs://your-bucket-name/
```

Make the bucket publicly readable:

```bash
gsutil iam ch allUsers:objectViewer gs://your-bucket-name/
```

Optionally upload a podcast cover image:

```bash
gsutil cp cover.jpg gs://your-bucket-name/cover.jpg
```

### 2. Set Environment Variables

Configure these in your n8n instance:

| Variable | Description | Example |
|----------|-------------|---------|
| `BRIEFING_USER_NAME` | Your name for personalized greetings | `John` |
| `BRIEFING_GCS_BUCKET` | GCS bucket name | `morning-briefing-podcast` |
| `BRIEFING_PODCAST_TITLE` | Podcast title for RSS feed | `My Morning Briefing` |
| `BRIEFING_PODCAST_DESC` | Podcast description | `Personal daily briefing` |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID | `EXAVITQu4vr4xnSDxMaL` |
| `TODOIST_PROJECT_ID` | Todoist project to filter (optional) | `2312345678` |
| `SLACK_CHANNELS` | Slack channels to monitor (optional) | `general,team` |
| `NOTION_DATABASE_ID` | Notion database ID for notes | `abc123...` |

### 3. Configure Credentials

Create the following credentials in n8n:

#### Google Calendar OAuth2
- Type: OAuth2
- Scopes: `https://www.googleapis.com/auth/calendar.readonly`
- Already configured if you have existing Google Calendar credential

#### Gmail OAuth2
- Type: OAuth2
- Scopes: `https://www.googleapis.com/auth/gmail.readonly`
- Already configured if you have existing Gmail credential

#### Slack OAuth2
- Type: OAuth2
- Scopes: `channels:history`, `groups:history`, `im:history`, `mpim:history`, `users:read`

#### Todoist OAuth2
- Type: OAuth2 or API Token
- Get API token from Todoist Settings → Integrations

#### Notion OAuth2
- Type: OAuth2 or Internal Integration Token
- Create integration at https://www.notion.so/my-integrations
- Share the database with your integration

#### Anthropic API (Claude)
- Type: Header Auth
- Header Name: `x-api-key`
- Header Value: Your Anthropic API key

#### ElevenLabs API
- Type: Header Auth
- Header Name: `xi-api-key`
- Header Value: Your ElevenLabs API key

#### Google Cloud Storage
- Type: Service Account JSON or OAuth2
- Service account needs Storage Object Admin role on bucket

### 4. Import Workflow

1. Open n8n
2. Create new workflow
3. Import from file: `workflow.json`
4. Update credential IDs in each node
5. Save and activate

### 5. Subscribe to Podcast

Add the RSS feed URL to your podcast app:

```
https://storage.googleapis.com/YOUR_BUCKET_NAME/feed.xml
```

Works with:
- Apple Podcasts
- Overcast
- Pocket Casts
- Any RSS-compatible podcast app

## Files

```
workflows/morning-briefing/
├── README.md                    # This file
├── workflow.json                # n8n workflow definition
├── update-workflow.js           # API update utility
├── feed-template.xml            # Initial RSS feed template
└── nodes/
    ├── 01-format-data.js        # Data formatting code
    ├── 02-extract-script.js     # Claude response extraction
    └── 03-update-rss.js         # RSS feed update logic
```

## ElevenLabs Voice Options

Popular voice IDs:

| Voice | ID | Style |
|-------|-----|-------|
| Rachel | `21m00Tcm4TlvDq8ikWAM` | Calm, professional |
| Adam | `pNInz6obpgDQGcFmaJgB` | Deep, authoritative |
| Antoni | `ErXwobaYiN019PkySvjV` | Warm, conversational |
| Bella | `EXAVITQu4vr4xnSDxMaL` | Friendly, energetic |
| Josh | `TxGEqnHWrfWFTfGW9XjX` | Warm, narrative |

## Cost Estimates

Per episode (~10 minutes):
- Claude API: ~$0.02-0.05 (Sonnet)
- ElevenLabs: ~$0.30 (multilingual v2)
- GCS Storage: ~$0.001
- **Total**: ~$0.35/day or ~$10/month

## Testing

1. Use "Manual Trigger" node to test without waiting for schedule
2. Check each data source node individually
3. Test ElevenLabs with a short script first
4. Validate RSS feed at https://podba.se/validate/

## Troubleshooting

### No calendar events
- Check Google Calendar OAuth permissions
- Verify calendar ID (use "primary" for main calendar)

### Gmail returns empty
- Check query syntax in Gmail node
- Verify OAuth scopes include gmail.readonly

### Slack authentication fails
- Ensure bot is added to channels you want to monitor
- Check OAuth scopes

### Notion returns no pages
- Share database with your Notion integration
- Check database ID format (remove dashes)

### TTS fails
- Check ElevenLabs API key
- Verify voice ID exists
- Script might be too long (max ~5000 chars per request)

### GCS upload fails
- Check service account permissions
- Verify bucket exists and is in non-US region
- Check bucket name doesn't have special characters

## Customization

### Change schedule time
Edit the Schedule Trigger node's cron expression:
- `0 6 * * *` = 6:00 AM daily
- `0 7 * * 1-5` = 7:00 AM weekdays only
- `30 5 * * *` = 5:30 AM daily

### Modify script style
Edit the system prompt in the Claude API node to change:
- Tone and personality
- Section order and duration
- Content focus

### Add more data sources
1. Add new node to parallel data gathering
2. Update Merge Data node to include new input
3. Update Format Data code to process new source
4. Update Claude prompt to include new data section
