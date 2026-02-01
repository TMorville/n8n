# n8n Workflows

A collection of production n8n workflows with detailed documentation and reusable components.

## Overview

This repository contains fully documented n8n workflows that can be imported and customized for your own use. Each workflow includes:

- Complete node configurations
- Code snippets for JavaScript nodes
- HTTP request documentation
- Setup instructions
- Troubleshooting guides

## Workflows

### [LegacyAI - Slack Bot for Notion Documentation](workflows/legacy-ai/) ✅ Production Ready

Conversational Slack bot that intelligently searches, creates, updates, and fetches Notion documentation using Claude AI and natural language commands.

**Status:** v2.0 Multi-Turn - Production

**Key Features:**
- @mention triggered bot (`@LegacyAI search for API docs`)
- Multi-turn agentic loop (search → fetch → respond with actual content)
- 4 tools: notion-search, notion-create-pages, notion-fetch, notion-update-page
- Claude AI selects database, chooses tools, chains operations intelligently
- Slack mrkdwn formatting with clickable Notion page links
- Bot message filtering prevents infinite loops
- Separate URL verification workflow

**Tech Stack:** Slack Events API, Claude Sonnet 4.5, Notion MCP, n8n (multi-turn loop architecture)

[View Workflow Documentation →](workflows/legacy-ai/README.md)

---

### [Slack Thread to Notion via Claude MCP](workflows/slack-to-notion/)

Capture Slack conversation threads and save them to Notion with AI-powered structuring using Claude and the Model Context Protocol.

**Key Features:**
- Message shortcut integration (right-click menu)
- Claude AI intelligently structures content
- Notion MCP for optimized page creation
- Fully automated workflow

**Tech Stack:** Slack API, Claude API, Notion MCP, n8n

[View Workflow Documentation →](workflows/slack-to-notion/README.md)

---

## Repository Structure

```
n8n-workflows/
├── workflows/
│   └── slack-to-notion/
│       ├── README.md                 # Workflow documentation
│       ├── nodes/                    # Code node snippets (.js)
│       ├── http-requests/            # HTTP node configs (.md)
│       └── mcp-client-config.md      # MCP configuration
├── setup/                            # Infrastructure setup docs
│   ├── gcp-setup.md
│   ├── cloudflare-tunnel.md
│   └── n8n-deployment.md
└── README.md                         # This file
```

## General Setup

### n8n Infrastructure

These workflows assume you have:

1. **Self-hosted n8n instance** with HTTPS access
2. **Persistent storage** for workflow data
3. **Environment variables** configured as needed

See [setup/](setup/) directory for infrastructure documentation:
- GCP deployment
- Cloudflare Tunnel for HTTPS
- Docker Compose configuration

### Common Requirements

Most workflows need:

- **n8n version**: 1.0.0+ (latest recommended)
- **HTTPS webhook URL**: For receiving external callbacks
- **Basic auth**: Secure your n8n dashboard
- **Environment variables**: For sensitive credentials

### MCP-Enabled Workflows

Workflows using Model Context Protocol (MCP) require:

```bash
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

Add this to your n8n environment variables and restart.

## Using These Workflows

### Option 1: Manual Import

1. Navigate to the workflow directory
2. Follow the README for that specific workflow
3. Copy node configurations and code snippets
4. Create nodes in n8n following the architecture diagram
5. Configure credentials and variables
6. Activate workflow

### Option 2: JSON Import (if provided)

1. Download the workflow JSON file
2. In n8n, go to Workflows → Import from File
3. Select the JSON file
4. Update credentials and configuration values
5. Activate workflow

## Configuration

Each workflow has its own configuration requirements. Common patterns:

### Credentials

Create these as reusable credentials in n8n:

- **Header Auth**: For API keys (Slack, Anthropic, etc.)
- **OAuth2**: For services like Notion MCP
- **Basic Auth**: For webhooks with authentication

### Environment Variables

Sensitive values should be stored as environment variables:

```bash
# Example .env file for n8n
N8N_ENCRYPTION_KEY=your-encryption-key
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-password
N8N_HOST=your-domain.com
N8N_PROTOCOL=https

# Optional: Enable MCP support
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

## Contributing

Feel free to:
- Submit issues for bugs or improvements
- Create pull requests with workflow enhancements
- Share your own workflows following the same structure

## Workflow Structure Guidelines

When adding new workflows, follow this structure:

```
workflows/your-workflow-name/
├── README.md                  # Complete workflow documentation
├── nodes/                     # JavaScript code nodes
│   ├── 01-node-name.js
│   └── 02-node-name.js
├── http-requests/             # HTTP node configurations
│   ├── 01-request-name.md
│   └── 02-request-name.md
└── additional-configs/        # Other node types (MCP, etc.)
```

### Documentation Requirements

Each workflow README should include:
- Overview and use case
- Architecture diagram
- Prerequisites
- Setup instructions
- Node details
- Usage guide
- Troubleshooting
- Cost estimates (if applicable)

## Support

For n8n-specific questions:
- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community Forum](https://community.n8n.io/)

For workflow-specific issues:
- Check the workflow's README
- Review troubleshooting section
- Open an issue in this repository

## License

MIT

## Related Resources

- [n8n Official Workflows](https://n8n.io/workflows/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude API Documentation](https://docs.anthropic.com/)
- [Notion API Documentation](https://developers.notion.com/)
