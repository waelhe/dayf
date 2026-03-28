// NodeBB Service - منصة المجتمع
import { spawn } from 'child_process';
import path from 'path';

const NODEBB_DIR = path.join(process.env.HOME || '/home/z', 'nodebb');
const PORT = process.env.NODEBB_PORT || '3001';

console.log(`Starting NodeBB on port ${PORT}...`);
console.log(`NodeBB directory: ${NODEBB_DIR}`);

const nodebb = spawn('node', ['loader.js', '--no-daemon'], {
    cwd: NODEBB_DIR,
    env: {
        ...process.env,
        NODE_ENV: 'development',
        port: PORT,
    },
    stdio: 'inherit',
});

nodebb.on('error', (err) => {
    console.error('Failed to start NodeBB:', err);
    process.exit(1);
});

nodebb.on('exit', (code) => {
    console.log(`NodeBB exited with code ${code}`);
    process.exit(code || 0);
});

process.on('SIGTERM', () => {
    nodebb.kill('SIGTERM');
});

process.on('SIGINT', () => {
    nodebb.kill('SIGINT');
});
