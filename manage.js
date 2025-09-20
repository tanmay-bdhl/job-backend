#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const commands = {
  start: 'Start the server',
  stop: 'Stop the server',
  restart: 'Restart the server',
  status: 'Show status of all processes',
  logs: 'Show logs from all processes',
  'start-server': 'Start only the server',
  'stop-server': 'Stop only the server',
  delete: 'Delete all PM2 processes',
  help: 'Show this help message'
};

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

async function showStatus() {
  console.log('📊 Process Status:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await runCommand('pm2 status');
}

async function main() {
  const command = process.argv[2];

  if (!command || command === 'help') {
    console.log('🔧 Job Backend Process Manager');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Usage: node manage.js <command>');
    console.log('');
    console.log('Available commands:');
    Object.entries(commands).forEach(([cmd, desc]) => {
      console.log(`  ${cmd.padEnd(15)} - ${desc}`);
    });
    return;
  }

  switch (command) {
    case 'start':
      console.log('🚀 Starting server...');
      await runCommand('pm2 start ecosystem.config.js');
      await showStatus();
      break;

    case 'stop':
      console.log('🛑 Stopping server...');
      await runCommand('pm2 stop ecosystem.config.js');
      await showStatus();
      break;

    case 'restart':
      console.log('🔄 Restarting server...');
      await runCommand('pm2 restart ecosystem.config.js');
      await showStatus();
      break;

    case 'status':
      await showStatus();
      break;

    case 'logs':
      console.log('📋 Showing logs (Ctrl+C to exit):');
      await runCommand('pm2 logs');
      break;

    case 'start-server':
      console.log('🚀 Starting server only...');
      await runCommand('pm2 start ecosystem.config.js --only job-backend-server');
      await showStatus();
      break;

    case 'stop-server':
      console.log('🛑 Stopping server...');
      await runCommand('pm2 stop job-backend-server');
      await showStatus();
      break;

    case 'delete':
      console.log('🗑️  Deleting all processes...');
      await runCommand('pm2 delete ecosystem.config.js');
      await showStatus();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "node manage.js help" for available commands');
  }
}

main().catch(console.error); 