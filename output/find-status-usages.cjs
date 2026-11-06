const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        searchDir(full);
      }
    } else if (/\.(tsx?|mjs|cjs)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/status\s*===?\s*["'][A-Za-z\-]+["']/i.test(line) || /status:\s*["'][A-Za-z\-]+["']/i.test(line)) {
          if (!line.includes('//') && !full.includes('test')) {
            console.log(`${full}:${i+1} -> ${line.trim()}`);
          }
        }
      });
    }
  }
}

searchDir('frontend/app');
