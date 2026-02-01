#!/usr/bin/env node

/**
 * Update n8n Workflow via API
 *
 * Usage:
 *   node update-workflow.js <n8n-url> <api-key> <workflow-id>
 *
 * Example:
 *   node update-workflow.js https://n8n.legacyco2.com your-api-key aRFV1m9NRqwPEejY
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Parse arguments
const [,, n8nUrl, apiKey, workflowId] = process.argv;

if (!n8nUrl || !apiKey || !workflowId) {
  console.error('Usage: node update-workflow.js <n8n-url> <api-key> <workflow-id>');
  console.error('Example: node update-workflow.js https://n8n.legacyco2.com your-api-key aRFV1m9NRqwPEejY');
  process.exit(1);
}

// Read workflow JSON
const workflowJson = JSON.parse(fs.readFileSync('./workflow.json', 'utf8'));

// Prepare API request
const url = new URL(`/api/v1/workflows/${workflowId}`, n8nUrl);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

console.log(`Updating workflow ${workflowId} at ${n8nUrl}...`);

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Workflow updated successfully!');
      const response = JSON.parse(data);
      console.log(`   Name: ${response.name}`);
      console.log(`   ID: ${response.id}`);
      console.log(`   Active: ${response.active}`);
      console.log(`   Nodes: ${response.nodes.length}`);
    } else {
      console.error(`❌ Error: HTTP ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
});

// Send workflow JSON (only include fields that API accepts)
// Note: 'active' and 'tags' are read-only
const workflowUpdate = {
  name: workflowJson.name,
  nodes: workflowJson.nodes,
  connections: workflowJson.connections,
  settings: workflowJson.settings
};

req.write(JSON.stringify(workflowUpdate));
req.end();
