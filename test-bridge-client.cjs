// Test client for Claude Code Bridge
const fetch = require('node-fetch').default;

const BRIDGE_URL = 'http://localhost:3002';

async function testBridge() {
  console.log('🚀 Testing Claude Code Bridge...\n');

  // Test health endpoint
  console.log('1. Testing health endpoint...');
  try {
    const response = await fetch(`${BRIDGE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check:', data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }

  // Test chat action
  console.log('\n2. Testing chat action...');
  try {
    const response = await fetch(`${BRIDGE_URL}/api/claude-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        context: { prompt: 'Can you help me understand this project?' }
      })
    });
    const data = await response.json();
    console.log('✅ Chat response:', data.response.substring(0, 100) + '...');
    console.log('📝 Mock response:', data._mock ? 'Yes' : 'No');
  } catch (error) {
    console.log('❌ Chat test failed:', error.message);
  }

  // Test analyze action
  console.log('\n3. Testing analyze action...');
  try {
    const response = await fetch(`${BRIDGE_URL}/api/claude-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze',
        context: {
          plan: {
            projectName: 'SDLC Agent',
            description: 'Autonomous software development lifecycle management tool'
          },
          files: [
            { path: 'App.tsx' },
            { path: 'components/FileTreeView.tsx' },
            { path: 'services/geminiService.ts' }
          ]
        }
      })
    });
    const data = await response.json();
    console.log('✅ Analysis response:', data.analysis.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ Analyze test failed:', error.message);
  }

  // Test generate action
  console.log('\n4. Testing generate action...');
  try {
    const response = await fetch(`${BRIDGE_URL}/api/claude-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate',
        context: {
          currentFile: { path: 'src/utils/helper.ts' },
          plan: {
            projectName: 'SDLC Agent',
            techStack: ['React', 'TypeScript', 'Node.js']
          }
        }
      })
    });
    const data = await response.json();
    console.log('✅ Generated code preview:', data.code.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ Generate test failed:', error.message);
  }

  // Test refactor action
  console.log('\n5. Testing refactor action...');
  try {
    const response = await fetch(`${BRIDGE_URL}/api/claude-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refactor',
        context: {
          files: [
            { path: 'components/FileTreeView.tsx' },
            { path: 'components/CodeEditor.tsx' }
          ]
        }
      })
    });
    const data = await response.json();
    console.log('✅ Refactor reasoning:', data.reasoning);
    console.log('📁 Files to update:', data.filesToUpdate.length);
  } catch (error) {
    console.log('❌ Refactor test failed:', error.message);
  }

  // Test error handling
  console.log('\n6. Testing error handling...');
  try {
    const response = await fetch(`${BRIDGE_URL}/api/claude-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'invalid_action',
        context: {}
      })
    });
    const data = await response.json();
    console.log('✅ Error handling works:', data.error);
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
  }

  console.log('\n🎉 Bridge testing completed!');
}

// Check if node-fetch is available, otherwise provide instructions
try {
  require('node-fetch');
  testBridge();
} catch (error) {
  console.log('❌ node-fetch is required for this test.');
  console.log('Run: npm install node-fetch');
  console.log('Or use curl commands to test the bridge manually.');
}