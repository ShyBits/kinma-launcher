// Script to run Electron in production mode
process.env.ELECTRON_IS_DEV = '0';
const { spawn } = require('child_process');
const electron = spawn('electron', ['.'], {
  stdio: 'inherit',
  shell: true
});

electron.on('close', (code) => {
  process.exit(code);
});

electron.on('error', (err) => {
  console.error('Failed to start Electron:', err);
  process.exit(1);
});

