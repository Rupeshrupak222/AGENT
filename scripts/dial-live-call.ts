import { spawn } from 'child_process';
import * as path from 'path';

const dbDir = path.join(__dirname, '../db');
const targetScript = path.join(dbDir, 'dial-live-call.ts');
const args = ['ts-node', targetScript, ...process.argv.slice(2)];

console.log('⚡ Launching Telephony Live Call Dispatcher from workspace root...');

const child = spawn('npx', args, {
  cwd: dbDir,
  shell: true,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
