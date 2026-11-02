import {readFileSync,writeFileSync} from 'node:fs';import ts from '../frontend/node_modules/typescript/lib/typescript.js';
const inventory=JSON.parse(readFileSync('output/mobile-round3/select-inventory.json','utf8'));
for(const file of [...new Set(inventory.map(r=>r.file))]){
 let source=readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[],removed=new Set();
 function visit(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(sf)==='select'){
  for(const tag of [node.openingElement.tagName,node.closingElement.tagName])edits.push({start:tag.getStart(sf),end:tag.getEnd(),text:'Select'});
  const parent=node.parent;if(ts.isJsxElement(parent))for(const sibling of parent.children){if(ts.isJsxSelfClosingElement(sibling)&&sibling.tagName.getText(sf)==='ChevronDown'&&!removed.has(sibling.pos)){edits.push({start:sibling.getStart(sf),end:sibling.getEnd(),text:''});removed.add(sibling.pos);}}
 }ts.forEachChild(node,visit);}visit(sf);
 for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
 const importAt=source.startsWith('"use client";')?source.indexOf('\n')+1:0;
 source=source.slice(0,importAt)+'\nimport { Select } from "@/app/components/ui/Select";\n'+source.slice(importAt);
 source=source.replaceAll('group-has-[select[data-active=true]]','group-has-[[role=combobox][data-active=true]]').replaceAll('[&_select]', '[&_[data-select-trigger]]');
 writeFileSync(file,source);
}
