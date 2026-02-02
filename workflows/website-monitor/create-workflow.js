#!/usr/bin/env node

/**
 * Create n8n Workflow via API
 *
 * Usage:
 *   node create-workflow.js <n8n-url> <api-key>
 *
 * Example:
 *   node create-workflow.js https://n8n.example.com your-api-key
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Parse arguments
const [,, n8nUrl, apiKey] = process.argv;

if (!n8nUrl || !apiKey) {
  console.error('Usage: node create-workflow.js <n8n-url> <api-key>');
  console.error('Example: node create-workflow.js https://n8n.example.com your-api-key');
  process.exit(1);
}

// Read workflow JSON
const workflowJson = JSON.parse(fs.readFileSync('./workflow.json', 'utf8'));

// Prepare API request
const url = new URL('/api/v1/workflows', n8nUrl);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

console.log(`Creating workflow at ${n8nUrl}...`);

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('Workflow created successfully!');
      const response = JSON.parse(data);
      console.log(`   Name: ${response.name}`);
      console.log(`   ID: ${response.id}`);
      console.log(`   Active: ${response.active}`);
      console.log(`   Nodes: ${response.nodes.length}`);
      console.log('\nNext steps:');
      console.log('1. Open the workflow in n8n UI');
      console.log('2. Configure the Slack credential in both Slack nodes');
      console.log('3. Set your Slack User ID in both Slack DM nodes');
      console.log('4. Activate the workflow');
    } else {
      console.error(`Error: HTTP ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error.message);
  process.exit(1);
});

// Send workflow JSON (only include fields that API accepts)
const workflowCreate = {
  name: workflowJson.name,
  nodes: workflowJson.nodes,
  connections: workflowJson.connections,
  settings: workflowJson.settings
};

req.write(JSON.stringify(workflowCreate));
req.end();
