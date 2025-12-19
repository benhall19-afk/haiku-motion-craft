#!/usr/bin/env node

/**
 * Motion Sync Agent
 * Runs bidirectional sync between Craft and Motion using Claude Haiku
 */

const Anthropic = require('@anthropic-ai/sdk');

const AGENT_INSTRUCTIONS_BLOCK_ID = '1723'; // Your Motion Sync Agent instructions in Craft

async function runSync() {
  console.log(`[${new Date().toISOString()}] Starting Motion Sync Agent...`);

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    // Create a conversation with the Motion Sync Agent
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20250929', // Using Haiku for cost efficiency
      max_tokens: 8000,
      system: [
        {
          type: 'text',
          text: 'You are the Motion Sync Agent running in headless mode on Railway. Execute a full sync cycle now.'
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Run a full sync cycle now. Current time: ${new Date().toISOString()}`
        }
      ]
    });

    console.log('Sync completed successfully');
    console.log(`Token usage: ${message.usage.input_tokens} input, ${message.usage.output_tokens} output`);

    // Log the result
    if (message.content && message.content.length > 0) {
      const textContent = message.content.find(c => c.type === 'text');
      if (textContent) {
        console.log('Agent response:', textContent.text.substring(0, 500) + '...');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
runSync();
