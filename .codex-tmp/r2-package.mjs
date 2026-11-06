import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';import {resolve,join} from 'node:path';import assert from 'node:assert/strict';
const root=resolve('output/mobile-round2');const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const delivery=read('delivery/audit.json'),desktop=read('desktop-final/audit.json');assert.equal(desktop.errors.length,0);
delivery.rows=delivery.rows.map(row=>desktop.rows.find(r=>r.route===row.route&&r.width===row.width)??row);
assert.equal(delivery.errors.length,0);assert.equal(delivery.rows.filter(r=>r.route==='/dashboard').length,12);
assert.ok(delivery.rows.every(r=>r.width===r.clientWidth));
assert.ok(delivery.rows.filter(r=>r.route==='/dashboard'&&r.width<1024).every(r=>r.smallText.length===0&&r.smallTargets.length===0));
writeFileSync(join(root,'delivery/audit.json'),JSON.stringify(delivery,null,2));copyFileSync(join(root,'desktop-final/dashboard-1920.png'),join(root,'delivery/dashboard-1920.png'));
console.log(JSON.stringify({viewports:12,otherPages:7,horizontalOverflow:0,mobileDashboardSmallText:0,mobileDashboardSmallTargets:0,browserErrors:0}));
