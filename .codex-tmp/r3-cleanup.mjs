import {readFileSync,writeFileSync,readdirSync} from 'node:fs';import ts from '../frontend/node_modules/typescript/lib/typescript.js';
let p='frontend/app/styles/tailwind/base.css',s=readFileSync(p,'utf8');s=s.replace(/\n  select \{[\s\S]*?\n  \}\r?\n\r?\n  select option \{[\s\S]*?\n  \}\r?\n/,'\n');s=s.replace('button, input, textarea, select {','button, input, textarea {').replace('textarea:focus-visible, select:focus-visible','textarea:focus-visible');writeFileSync(p,s);
p='frontend/app/styles/tailwind/overlays.css';s=readFileSync(p,'utf8').replace('.ticket-modal input:not([type="checkbox"]),\r\n.ticket-modal select {','.ticket-modal input:not([type="checkbox"]):not([data-select-value]) {').replace('.ticket-modal input:not([type="checkbox"]),\n.ticket-modal select {','.ticket-modal input:not([type="checkbox"]):not([data-select-value]) {');s=s.replace(/\/\* Select dropdowns: custom vertically-centered chevron matching left padding \*\/\r?\n\.ticket-modal select \{[\s\S]*?\r?\n\}\r?\n/, '');s=s.replace('.ticket-modal textarea:focus,\r\n.ticket-modal select:focus {','.ticket-modal textarea:focus {').replace('.ticket-modal textarea:focus,\n.ticket-modal select:focus {','.ticket-modal textarea:focus {');writeFileSync(p,s);
p='frontend/app/styles/tailwind/utilities.css';s=readFileSync(p,'utf8').replace(/\.view-toolbar > select \{[\s\S]*?\r?\n\}\r?\n/, '');s=s.replace('.toolbar-label input,\r\n.toolbar-label select {','.toolbar-label input {').replace('.toolbar-label input,\n.toolbar-label select {','.toolbar-label input {');writeFileSync(p,s);
// Remove imports made unused by the control migration; retain all used type names.
const files=JSON.parse(readFileSync('output/mobile-round3/select-inventory.json','utf8')).map(row=>row.file);
files.push('frontend/app/components/dashboard/MonitoringSchedule.tsx');
for(const file of new Set(files)){
 let text=readFileSync(file,'utf8'),sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),used=new Set(),edits=[];
 for(const statement of sf.statements){if(ts.isImportDeclaration(statement))continue;const visit=node=>{if(ts.isIdentifier(node))used.add(node.text);ts.forEachChild(node,visit);};visit(statement);}
 for(const statement of sf.statements){if(!ts.isImportDeclaration(statement)||!statement.importClause)continue;const clause=statement.importClause,named=clause.namedBindings;
  const defaultName=clause.name&&used.has(clause.name.text)?clause.name.getText(sf):null;
  let binding='';if(named&&ts.isNamedImports(named)){const retained=named.elements.filter(element=>used.has(element.name.text));if(retained.length)binding='{ '+retained.map(n=>n.getText(sf)).join(', ')+' }';}else if(named&&ts.isNamespaceImport(named)&&used.has(named.name.text))binding=named.getText(sf);
  const imports=[defaultName,binding].filter(Boolean).join(', ');
  const replacement=imports?`import ${clause.isTypeOnly?'type ':''}${imports} from ${statement.moduleSpecifier.getText(sf)};`:'';
  if(replacement!==statement.getText(sf))edits.push({start:statement.getStart(sf),end:statement.getEnd(),replacement});
 }
 for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.replacement+text.slice(edit.end);
 writeFileSync(file,text);
}
