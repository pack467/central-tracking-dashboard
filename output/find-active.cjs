const fs = require('fs');
const content = fs.readFileSync('frontend/app/lib/data.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('status: "Active"') && i < 2600) {
    console.log(i + 1, l.trim(), lines[i - 7], lines[i - 6], lines[i - 5]);
  }
});
