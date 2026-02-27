const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src', 'components');
const allowed = [
  'components/projects/ConfettiEffect.tsx',
  'components/canvas/CanvasPreview.tsx',
  'components/layout/sidebar-right.tsx',
  'components/settings/components/ExportDataModal.tsx',
  'components/settings/store/settingsStore.ts',
  'components/trading/ExchangeManager.tsx',
  'components/pattern-scanner-clone/PatternScannerCloneContent.tsx',
  'components/projects/ConfettiEffect.tsx'
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (/\.(tsx|ts|jsx|js)$/.test(full)) {
      const rel = path.relative(path.join(__dirname, '..', 'src'), full).replace(/\\/g, '/');
      if (allowed.some(a => rel.endsWith(a))) continue;
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('setTimeout(')) {
        console.error('Found setTimeout in', rel);
        process.exitCode = 1;
      }
    }
  }
}

walk(root);
if (process.exitCode === 1) {
  console.error('\nPlease replace ephemeral setTimeout usages with useTimeout or add an exemption.');
} else {
  console.log('No disallowed setTimeout usages found in src/components.');
}
