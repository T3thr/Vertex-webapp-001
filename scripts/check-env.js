// scripts/check-env.js
// ===================================================================
// Environment Check Script
// Verify that the development environment is properly set up
// ===================================================================

const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true); // Port is available
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false); // Port is in use
    });
  });
}

async function checkEnvironment() {
  console.log('🔍 Checking development environment...\n');
  
  // Check if port 3000 is available
  const port3000Available = await checkPort(3000);
  
  if (!port3000Available) {
    console.log('❌ Port 3000 is already in use');
    console.log('💡 Please stop the other process or use a different port');
    console.log('   You can use: PORT=3001 npm run dev\n');
    return false;
  } else {
    console.log('✅ Port 3000 is available');
  }
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.log(`❌ Node.js version ${nodeVersion} is too old`);
    console.log('💡 Please upgrade to Node.js 18 or later\n');
    return false;
  } else {
    console.log(`✅ Node.js version ${nodeVersion} is compatible`);
  }
  
  // Check if we're in the right directory
  const fs = require('fs');
  if (!fs.existsSync('package.json')) {
    console.log('❌ package.json not found');
    console.log('💡 Please run this command from the project root directory\n');
    return false;
  } else {
    console.log('✅ Project directory structure is correct');
  }
  
  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    console.log('❌ node_modules not found');
    console.log('💡 Please run: npm install\n');
    return false;
  } else {
    console.log('✅ Dependencies are installed');
  }
  
  console.log('\n🎉 Environment check passed! You can now run:');
  console.log('   npm run dev\n');
  
  return true;
}

if (require.main === module) {
  checkEnvironment().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { checkEnvironment };
