import {createRequire} from 'node:module';
import {readFileSync as read,writeFileSync as write} from 'node:fs';
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const ts=require('typescript');
const reports=JSON.parse(read('output/routing/source-lint.json','utf8').replace(/^\uFEFF/,''));
for(const report of reports){
  if(!/components\/(?:routing|views|layout|runbooks|monitoring|auth|team\/Roster|search\/CommandPalette)|hooks\/useUrlQuery/.test(report.filePath.replaceAll('\\','/')))continue;
  const unused=new Set(report.messages.filter(m=>m.ruleId==='@typescript-eslint/no-unused-vars').map(m=>m.message.match(/^'([^']+)'/)?.[1]).filter(Boolean));
  let s=read(report.filePath,'utf8');
  const source=ts.createSourceFile(report.filePath,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const edits=[];
  for(const node of source.statements){
    if(!ts.isImportDeclaration(node)||!node.importClause)continue;
    const clause=node.importClause;
    let def=clause.name?.text;
    if(def&&unused.has(def))def=undefined;
    const named=clause.namedBindings;
    let parts=[];
    if(named&&ts.isNamedImports(named))parts=named.elements.filter(n=>!unused.has(n.name.text)).map(n=>n.getText(source));
    else if(named&&!unused.has(named.name.text))parts=[named.getText(source)];
    const binding=[def,parts.length?(ts.isNamedImports(named)?`{ ${parts.join(', ')} }`:parts[0]):undefined].filter(Boolean).join(', ');
    const next=binding?`import ${clause.isTypeOnly?'type ':''}${binding} from ${node.moduleSpecifier.getText(source)};`:'';
    if((def!==clause.name?.text)||(named&&ts.isNamedImports(named)&&parts.length!==named.elements.length))edits.push([node.getStart(source),node.end,next]);
  }
  for(const [start,end,next] of edits.reverse())s=s.slice(0,start)+next+s.slice(end);
  write(report.filePath,s);
}
