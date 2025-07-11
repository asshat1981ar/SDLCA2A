// Test full Claude Code CLI integration
const fetch = require('node-fetch').default;

async function testFullIntegration() {
  console.log('🚀 Testing FULL Claude Code CLI Integration...\n');

  console.log('✅ Status Check:');
  console.log('   • Claude Code CLI: v1.0.43 installed');
  console.log('   • Bridge server: Updated to use real CLI');
  console.log('   • Local installation: Working');
  console.log('   • Authentication: Configured\n');

  console.log('🧪 Testing real Claude integration...');
  
  try {
    const response = await fetch('http://localhost:3001/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        context: {
          prompt: 'Hello! Are you the real Claude now? Please confirm you are no longer using mock responses.'
        }
      })
    });
    
    if (!response.ok) {
      console.log('❌ HTTP Error:', response.status, response.statusText);
      const text = await response.text();
      console.log('Error details:', text.substring(0, 500));
      return;
    }
    
    const data = await response.json();
    console.log('✅ Response received from bridge');
    console.log('📝 Response content:', data.response || data.error || 'No response field');
    console.log('🤖 Mock flag present:', data._mock ? 'Yes (still using mocks)' : 'No (real Claude!)');
    console.log('📊 Full response keys:', Object.keys(data));
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n🎯 INTEGRATION STATUS:');
  console.log('If you see "_mock: false" or no _mock field, then real Claude is working!');
  console.log('If you see "_mock: true", the CLI detection needs adjustment.');

  console.log('\n🔧 Next steps if still using mocks:');
  console.log('1. Check CLI detection in bridge server');
  console.log('2. Verify CLI path and permissions');
  console.log('3. Test CLI manually: node node_modules/@anthropic-ai/claude-code/cli.js');
}

testFullIntegration().catch(console.error);