// Test Claude Code CLI directly to understand how it works
const { spawn } = require('child_process');

async function testCLIDirect() {
  console.log('🔧 Testing Claude Code CLI Direct Communication...\n');

  console.log('1. Testing version command...');
  const versionProcess = spawn('node', ['node_modules/@anthropic-ai/claude-code/cli.js', '--version']);
  
  versionProcess.stdout.on('data', (data) => {
    console.log('Version output:', data.toString().trim());
  });
  
  versionProcess.on('close', (code) => {
    console.log('Version command exit code:', code);
    
    if (code === 0) {
      console.log('\n2. Testing help command...');
      testHelp();
    }
  });
}

function testHelp() {
  const helpProcess = spawn('node', ['node_modules/@anthropic-ai/claude-code/cli.js', '--help']);
  
  helpProcess.stdout.on('data', (data) => {
    console.log('Help output:', data.toString());
  });
  
  helpProcess.stderr.on('data', (data) => {
    console.log('Help stderr:', data.toString());
  });
  
  helpProcess.on('close', (code) => {
    console.log('Help command exit code:', code);
    
    console.log('\n3. Testing interactive mode...');
    testInteractive();
  });
}

function testInteractive() {
  console.log('Starting interactive session...');
  const interactiveProcess = spawn('node', ['node_modules/@anthropic-ai/claude-code/cli.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let output = '';
  
  interactiveProcess.stdout.on('data', (data) => {
    output += data.toString();
    console.log('Interactive output:', data.toString());
  });
  
  interactiveProcess.stderr.on('data', (data) => {
    console.log('Interactive stderr:', data.toString());
  });
  
  // Send a simple message
  setTimeout(() => {
    console.log('Sending test message...');
    interactiveProcess.stdin.write('Hello Claude! Can you respond with a simple confirmation?\n');
    
    // Wait for response, then close
    setTimeout(() => {
      console.log('Ending session...');
      interactiveProcess.stdin.end();
    }, 3000);
  }, 1000);
  
  interactiveProcess.on('close', (code) => {
    console.log('Interactive session exit code:', code);
    console.log('Total output received:', output.length, 'characters');
    
    if (output.length > 0) {
      console.log('✅ CLI is responsive and working!');
      console.log('📝 Sample output:', output.substring(0, 200));
    } else {
      console.log('❌ No output received from CLI');
    }
    
    console.log('\n🎯 CLI Investigation Complete');
  });
  
  interactiveProcess.on('error', (err) => {
    console.log('❌ Interactive session error:', err.message);
  });
}

testCLIDirect().catch(console.error);