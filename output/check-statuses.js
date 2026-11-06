const fs = require('fs');
const content = fs.readFileSync('frontend/app/lib/data.ts', 'utf8');
const ticketsMatch = content.match(/export const seedTickets: Ticket\[\] = \[([\s\S]*?)\];\s*\n/);
if (ticketsMatch) {
  const statuses = [...ticketsMatch[1].matchAll(/status:\s*"([^"]+)"/g)].map(m => m[1]);
  console.log('Distinct statuses:', [...new Set(statuses)]);
  const counts = {};
  statuses.forEach(s => counts[s] = (counts[s]||0) + 1);
  console.log('Counts:', counts);
} else {
  console.log('Match not found');
}
