const fs = require('fs');

const statusMapping = {
  // Open
  '86d40m01x': 'Open',
  '86d40dm06': 'Open',
  '86d40sep03': 'Open',
  '86d40sep05': 'Open',
  '86d40sep22': 'Open',
  '86d40sep24': 'Open',

  // Activity
  '86d40dm03': 'Activity',
  '86d40dm11': 'Activity',
  '86d40dm15': 'Activity',
  '86d40sep14': 'Activity',

  // Meeting
  '86d40dm19': 'Meeting',
  '86d40dm24': 'Meeting',
  '86d40sep04': 'Meeting',

  // Re-Open
  '86d40esc1': 'Re-Open',
  '86d40dm04': 'Re-Open',
  '86d40sep02': 'Re-Open',
  '86d40sep06': 'Re-Open',
  '86d40sep18': 'Re-Open',

  // Pending
  '86d40dm16': 'Pending',
  '86d40bg02': 'Pending',
  '86d40sep10': 'Pending',
  '86d40sep19': 'Pending',

  // RCA
  '86d40dm09': 'RCA',
  '86d40dm22': 'RCA',
  '86d40dm29': 'RCA',
  '86d40dm32': 'RCA',
  '86d40sep01': 'RCA',
  '86d40sep09': 'RCA',
  '86d40sep11': 'RCA',
  '86d40sep15': 'RCA',
  '86d40sep20': 'RCA',
  '86d40sep23': 'RCA',
};

let content = fs.readFileSync('frontend/app/lib/data.ts', 'utf8');

for (const [id, newStatus] of Object.entries(statusMapping)) {
  // Match ticket block by id and replace status
  const idRegex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?status:\\s*)"(?:Active|In Progress|Escalated|Pending)"`);
  if (idRegex.test(content)) {
    content = content.replace(idRegex, `$1"${newStatus}"`);
    console.log(`Updated ${id} to ${newStatus}`);
  } else {
    console.error(`Could not match ${id}`);
  }
}

fs.writeFileSync('frontend/app/lib/data.ts', content, 'utf8');
console.log('Successfully updated data.ts');
