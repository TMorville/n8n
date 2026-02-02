# Legacy.AI Workflow Development Guidelines

## n8n Instance

- **URL**: https://n8n.legacyco2.com
- **API Key**: Located in `.env` as `N8N_API_KEY`

### Workflow IDs

| Workflow | ID |
|----------|-----|
| Morning Briefing Podcast | `gT2Q9DU9JWa7NTJj` |
| Morning Briefing Podcast (Agentic) | `W2wCHCcyQXP7tyX8` |
| LegacyAI (Simplified) | `PbAALWXhBoybT8YA` |

### Uploading Workflows

To push local workflow.json changes to n8n:

```bash
cd workflows/<workflow-name>
node update-workflow.js https://n8n.legacyco2.com "$(grep N8N_API_KEY /Users/tomo/code/n8n/.env | cut -d= -f2)" <workflow-id>
```

Example:
```bash
cd workflows/morning-briefing
node update-workflow.js https://n8n.legacyco2.com "$(grep N8N_API_KEY /Users/tomo/code/n8n/.env | cut -d= -f2)" gT2Q9DU9JWa7NTJj
```

## Node File Naming Convention

**CRITICAL: Never create versioned node files**

When updating node code in `workflows/legacy-ai/nodes/`:
- ✅ **DO**: Directly overwrite the existing file (e.g., `03-claude-planning.js`)
- ❌ **DON'T**: Create versioned files like:
  - `03-claude-planning-improved.js`
  - `03-claude-planning-fixed.js`
  - `04-parse-tool-call-corrected.js`
  - `16-build-claude-response-improved.js`

**Rationale:**
- Keeps repository clean and organized
- Prevents confusion about which version is current
- Makes file references in documentation clear
- Reduces maintenance overhead

**Process for updates:**
1. Read the existing file to understand current implementation
2. Make changes directly to the file (use Edit tool or Write tool)
3. Test the changes in n8n UI
4. Export workflow to workflow.json when complete
5. Commit both updated node file and workflow.json together

**If preserving history is needed:**
- Move old version to `history/` directory with date prefix
- Example: `history/2025-12-10-old-planning.js`
- Keep only current version in `nodes/` directory

**Example:**
```bash
# Good - direct overwrite
vim workflows/legacy-ai/nodes/03-claude-planning.js

# Bad - creating versions
mv 03-claude-planning.js 03-claude-planning-old.js
vim 03-claude-planning-improved.js

# If preserving old version
mv 03-claude-planning.js history/2025-12-10-old-planning.js
vim 03-claude-planning.js
```

## Workflow Export

After making changes locally to workflow.json or node files:
```bash
cd workflows/morning-briefing
node update-workflow.js https://n8n.legacyco2.com "$(grep N8N_API_KEY /Users/tomo/code/n8n/.env | cut -d= -f2)" gT2Q9DU9JWa7NTJj
git add workflow.json nodes/*.js
git commit -m "feat: description of changes"
```
