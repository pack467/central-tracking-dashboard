const fs = require('fs');
const content = fs.readFileSync('frontend/app/lib/data.ts', 'utf8');

const regex = /{\s*id:\s*"([^"]+)",\s*subject:\s*"([^"]+)"[\s\S]*?status:\s*"([^"]+)"/g;
let match;
const nonClosed = [];
while ((match = regex.exec(content)) !== null) {
  if (match[3] !== 'Closed' && match[3] !== 'Present' && match[3] !== 'Healthy' && match[3] !== 'Needs Attention' && match[3] !== 'Off Duty' && match[3] !== 'On Leave' && match[3] !== 'On Break' && match[3] !== 'Approved') {
    nonClosed.push({ id: match[1], subject: match[2], status: match[3] });
  }
}
console.log('Total non-closed tickets:', nonClosed.length);
console.log(JSON.stringify(nonClosed, null, 2));
