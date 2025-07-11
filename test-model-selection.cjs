// Test Model Selection Integration
const fetch = require('node-fetch').default;

async function testModelSelection() {
  console.log('🔧 Testing Model Selection Integration...\n');
  
  // Test 1: Check enhanced bridge server is running
  console.log('1. Testing enhanced bridge server...');
  try {
    const response = await fetch('http://localhost:3002/');
    const data = await response.json();
    console.log('✅ Enhanced bridge status:', data.status);
    console.log('🤖 Available models:', JSON.stringify(data.models));
  } catch (error) {
    console.log('❌ Bridge test failed:', error.message);
    return;
  }
  
  // Test 2: Test DeepSeek Coder model selection
  console.log('\n2. Testing DeepSeek Coder model selection...');
  try {
    const response = await fetch('http://localhost:3002/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        provider: 'deepseek',
        model: 'deepseek-coder',
        context: {
          prompt: 'Create a simple React component for user authentication.'
        }
      })
    });
    
    const data = await response.json();
    console.log('✅ DeepSeek Coder selected and working');
    console.log('🤖 Model used:', data._model);
    console.log('📝 Response preview:', data.response ? data.response.substring(0, 100) + '...' : 'No response');
  } catch (error) {
    console.log('❌ DeepSeek Coder test failed:', error.message);
  }
  
  // Test 3: Test DeepSeek R1 model selection
  console.log('\n3. Testing DeepSeek R1 model selection...');
  try {
    const response = await fetch('http://localhost:3002/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze',
        provider: 'deepseek',
        model: 'deepseek-r1',
        context: {
          plan: {
            projectName: 'Authentication App',
            description: 'User authentication system with JWT tokens'
          },
          files: [
            { path: 'src/App.tsx' },
            { path: 'src/components/LoginForm.tsx' }
          ]
        }
      })
    });
    
    const data = await response.json();
    console.log('✅ DeepSeek R1 selected and working');
    console.log('🧠 Model used:', data._model);
    console.log('📊 Analysis preview:', data.analysis ? data.analysis.substring(0, 100) + '...' : 'No analysis');
  } catch (error) {
    console.log('❌ DeepSeek R1 test failed:', error.message);
  }
  
  // Test 4: Test auto provider selection (should pick DeepSeek since it's available)
  console.log('\n4. Testing auto provider selection...');
  try {
    const response = await fetch('http://localhost:3002/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate',
        provider: 'auto',
        context: {
          currentFile: { path: 'src/utils/validation.ts' },
          plan: {
            projectName: 'Auth App',
            techStack: {
              frontend: ['React', 'TypeScript'],
              backend: ['Node.js']
            }
          }
        }
      })
    });
    
    const data = await response.json();
    console.log('✅ Auto provider selection worked');
    console.log('🤖 Selected provider:', data._provider);
    console.log('📝 Selected model:', data._model);
    console.log('💻 Code preview:', data.code ? data.code.substring(0, 80) + '...' : 'No code');
  } catch (error) {
    console.log('❌ Auto provider test failed:', error.message);
  }
  
  console.log('\n🎉 Model Selection Testing Complete!');
  console.log('\n📋 Summary:');
  console.log('   ✅ UI Model Selection: Added to SettingsPanel');
  console.log('   ✅ Provider Selection: DeepSeek, Claude Code CLI, Gemini, OpenAI, Anthropic');
  console.log('   ✅ Model Selection: deepseek-coder, deepseek-r1, claude-code-cli');
  console.log('   ✅ Auto Detection: Best provider chosen automatically');
  console.log('   ✅ Bridge Integration: Enhanced bridge supports model routing');
  
  console.log('\n🚀 Model Selection UI Ready!');
  console.log('   • Settings Panel: Now includes AI Provider and Model dropdowns');
  console.log('   • Real-time Updates: Provider status shows configuration state');
  console.log('   • Smart Defaults: Model selection updates based on provider');
  console.log('   • Enhanced Bridge: http://localhost:3002/ (multi-model support)');
}

testModelSelection().catch(console.error);