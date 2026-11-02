const fs = require('fs');
const content = fs.readFileSync('frontend/app/lib/data.ts', 'utf8');
const lines = content.split('\n');
const targets = [
  '86d40esc1', '86d40m01x', '86d40dm01', '86d40dm03', '86d40dm04',
  '86d40dm06', '86d40dm09', '86d40dm11', '86d40dm15', '86d40dm16',
  '86d40dm19', '86d40dm22', '86d40dm24', '86d40dm29', '86d40dm32',
  '86d40bg02', '86d40sep01', '86d40sep02', '86d40sep03', '86d40sep04',
  '86d40sep05', '86d40sep06', '86d40sep09', '86d40sep10', '86d40sep11',
  '86d40sep14', '86d40sep15', '86d40sep18', '86d40sep19', '86d40sep20',
  '86d40sep22', '86d40sep23', '86d40sep24'
];
targets.forEach(id => {
  const idx = lines.findIndex(l => l.includes(`id: "${id}"`));
  if (idx !== -1) {
    // Find where status is defined for this ticket
    for (let j = idx; j < idx + 15; j++) {
      if (lines[j].includes('status:')) {
        console.log(`${id} -> line ${j+1}: ${lines[j].trim()}`);
        break;
      }
    }
  }
});
