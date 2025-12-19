#!/usr/bin/env node

/**
 * Motion Sync Agent
 * Runs bidirectional sync between Craft and Motion using Claude Haiku with MCP
 */

const Anthropic = require('@anthropic-ai/sdk');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function runSync() {
  console.log(`[${new Date().toISOString()}] Starting Motion Sync Agent...`);

  // Validate required environment variables
  const requiredVars = ['ANTHROPIC_API_KEY', 'CRAFT_SPACE_ID', 'CRAFT_API_TOKEN'];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Set up Craft MCP client
  const craftMcpClient = new Client({
    name: 'motion-sync-agent',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  // Connect to Craft MCP server via stdio
  const craftTransport = new StdioClientTransport({
    command: 'npx',
    args: [
      '-y',
      '@craftdocs/mcp-server-craft',
      process.env.CRAFT_SPACE_ID,
      process.env.CRAFT_API_TOKEN
    ],
  });

  await craftMcpClient.connect(craftTransport);
  console.log('Connected to Craft MCP server');

  // Get available MCP tools
  const { tools } = await craftMcpClient.listTools();
  console.log(`Loaded ${tools.length} Craft MCP tools`);

  try {
    // Create the sync conversation with MCP tools
    const messages = [{
      role: 'user',
      content: `You are the Motion Sync Agent. Run a full sync cycle now. Current time: ${new Date().toISOString()}`
    }];

    let continueLoop = true;
    let iterationCount = 0;
    const maxIterations = 50; // Prevent infinite loops

    while (continueLoop && iterationCount < maxIterations) {
      iterationCount++;
      console.log(`\n--- Iteration ${iterationCount} ---`);

      const response = await anthropic.messages.create({
        model: 'claude-haiku-3-5-20241022',
        max_tokens: 8000,
        system: `You are the Motion Sync Agent running in headless mode on Railway.

Your instructions are stored in Craft document ID 1723. Load them and execute a full sync cycle.

Execute the sync workflow:
1. Load sync mappings from collection ID 1619
2. Fetch Motion tasks from both workspaces
3. Compare and sync differences
4. Log results to collection ID 2041

Be concise in responses - focus on actions, not explanations.`,
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description || '',
          input_schema: tool.inputSchema
        })),
        messages: messages
      });

      console.log(`Token usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`);

      // Process response
      const assistantMessage = {
        role: 'assistant',
        content: response.content
      };
      messages.push(assistantMessage);

      // Check if we're done
      if (response.stop_reason === 'end_turn') {
        console.log('\nSync completed - agent finished');
        continueLoop = false;
        break;
      }

      // Handle tool calls
      const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

      if (toolUseBlocks.length === 0) {
        console.log('No tool calls - ending conversation');
        continueLoop = false;
        break;
      }

      // Execute tool calls
      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        console.log(`Calling tool: ${toolUse.name}`);

        try {
          const result = await craftMcpClient.callTool({
            name: toolUse.name,
            arguments: toolUse.input
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result.content)
          });

          console.log(`✓ ${toolUse.name} succeeded`);
        } catch (error) {
          console.error(`✗ ${toolUse.name} failed:`, error.message);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Error: ${error.message}`,
            is_error: true
          });
        }
      }

      // Add tool results to conversation
      messages.push({
        role: 'user',
        content: toolResults
      });
    }

    if (iterationCount >= maxIterations) {
      console.warn(`\nWarning: Reached maximum iterations (${maxIterations})`);
    }

    console.log('\n✅ Sync workflow completed successfully');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Clean up MCP connection
    await craftMcpClient.close();
    console.log('Closed Craft MCP connection');
  }

  process.exit(0);
}

// Run the sync
runSync().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
