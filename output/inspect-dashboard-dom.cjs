const fs = require('fs');
const content = fs.readFileSync('frontend/app/components/tickets/TicketReportView.tsx', 'utf8');
const lines = content.split('\n');

console.log('--- Key Panels and Structures in TicketReportView.tsx ---');
lines.forEach((l, i) => {
  if (l.includes('<article') || l.includes('analytics-filter-section') || l.includes('Live Operations Command Bar') || l.includes('report-panel-header') || l.includes('today-tickets-section') || l.includes('Panel 1:') || l.includes('Panel 2:') || l.includes('Panel 3:')) {
    console.log(`${i + 1}: ${l.trim().slice(0, 120)}`);
  }
});
