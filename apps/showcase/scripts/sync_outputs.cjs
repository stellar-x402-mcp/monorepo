const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', '.next');
if (!fs.existsSync(srcDir)) {
  console.error('[sync_outputs] Source .next directory does not exist:', srcDir);
  process.exit(0);
}

const targets = [
  path.resolve(__dirname, '..', 'out'),
  path.resolve(__dirname, '..', 'apps', 'showcase', 'out'),
  path.resolve(process.cwd(), 'out'),
  path.resolve(process.cwd(), 'apps', 'showcase', 'out'),
];

for (const target of targets) {
  try {
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(srcDir, target, { recursive: true, force: true });
    console.log('[sync_outputs] Synchronized .next build artifacts to:', target);
  } catch (err) {
    console.warn('[sync_outputs] Warning copying to target:', target, err.message);
  }
}
