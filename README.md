# Motion Sync Agent

Bidirectional sync between Craft documents and Motion workspaces using Claude Haiku.

## Features

- ✅ Syncs tasks between Craft "Areas of Life" and Motion Private Workspace
- ✅ Syncs projects between Craft "Projects - In Progress" and Motion Life Workspace
- ✅ Intelligent conflict resolution (latest-wins)
- ✅ Label-based location tracking for Areas of Life
- ✅ Cost-efficient: Uses Claude Haiku (~$0.40 per million tokens)
- ✅ Automated scheduling via Railway cron jobs

## Cost Estimate

**With $10/month budget:**
- ~30-40 syncs per day
- Recommended schedule: Every 30 minutes during active hours (6 AM - 11 PM GMT+7)
- ~34 syncs/day = well within budget

## Deployment to Railway

### 1. Prerequisites

- GitHub account
- Railway account (sign up at railway.app)
- Anthropic API key (from console.anthropic.com)
- Craft API access (MCP server credentials)
- Motion API key (stored in your Craft configuration)

### 2. Push to GitHub

```bash
cd ~/motion-sync-agent
git add .
git commit -m "Initial commit: Motion Sync Agent"
gh repo create motion-sync-agent --private --source=. --remote=origin --push
```

Or manually:
1. Create a new private repository on GitHub
2. Follow GitHub's instructions to push existing code

### 3. Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `motion-sync-agent`
4. Railway will auto-detect Node.js and deploy

### 4. Configure Environment Variables

In Railway dashboard, add these variables:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
CRAFT_SPACE_ID=your-craft-space-id
CRAFT_API_TOKEN=your-craft-api-token
```

### 5. Set Up Cron Schedule

In Railway:

1. Go to your service settings
2. Click "Cron" tab
3. Add a new cron job:

**Active hours (6 AM - 11 PM GMT+7):**
```
*/30 0-16,23 * * *
```
This runs every 30 minutes from 6 AM to 11 PM GMT+7 (midnight-4 PM, 11 PM UTC)

**Or simpler - every 30 minutes all day:**
```
*/30 * * * *
```

4. Command: `npm run sync`

### 6. Monitor

Check Railway logs to see sync results:
- Token usage per sync
- Items created/updated
- Any errors

## Local Testing

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env

# Run a test sync
npm run sync

# Dry run (if implemented)
npm test
```

## How It Works

1. **Agent loads** your Motion Sync Agent instructions from Craft (document ID: 1723)
2. **Fetches mappings** from Sync Mappings collection to understand current state
3. **Compares** Craft tasks/projects with Motion tasks/projects
4. **Syncs differences**:
   - Creates missing tasks/projects in either system
   - Updates changed items (latest-wins conflict resolution)
   - Syncs dates: Start dates one-way (Motion → Craft), deadlines bidirectional
   - Updates labels based on Craft document location
5. **Logs results** to Craft Notifications collection

## Sync Rules

**Start Dates:** One-way only (Motion → Craft)
- Motion's `startOn` field is READ-ONLY after creation
- Agent reads from Motion, updates Craft

**Deadlines:** Bidirectional (Craft ↔ Motion)
- Syncs both ways based on latest timestamp

**Labels (Private Workspace):**
- Craft document location → Motion label
- Valid labels match "Areas of Life" document names
- Unmapped tasks go to "Inbox for Motion Tasks"

**Recurring Tasks:** Excluded from sync
- Manual management in each system
- Prevents sync conflicts

## Troubleshooting

**Sync fails:**
- Check Railway logs for error messages
- Verify API keys are correct
- Ensure Craft MCP connection is working

**High token usage:**
- Check if agent is processing unnecessary data
- Consider reducing sync frequency
- Review agent instructions for optimization

**Tasks not syncing:**
- Verify task isn't recurring (has `repeat` or `parentRecurringTaskId`)
- Check Sync Mappings collection for existing mapping
- Review agent logs in Craft Notifications collection

## Architecture

```
Railway Cron (every 30 min)
    ↓
sync.js (Node.js script)
    ↓
Anthropic API (Claude Haiku)
    ↓
Motion Sync Agent (in Craft)
    ↓
Craft MCP ↔ Motion API
```

## Cost Monitoring

Track costs in Railway dashboard:
- Each sync uses ~15,000-30,000 tokens
- Haiku pricing: ~$0.40 per million tokens
- 34 syncs/day × 20,000 tokens = ~680K tokens/day = ~$0.27/day = ~$8/month

## Support

For issues with:
- **Agent logic**: Check Motion Sync Agent instructions (Craft doc ID: 1723)
- **Deployment**: Railway documentation
- **API issues**: Anthropic or Motion API status pages

## License

MIT
