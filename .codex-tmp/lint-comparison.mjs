import {createRequire} from 'node:module';
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve, join, relative} from 'node:path';
const front=resolve('frontend');
const require=createRequire(join(front,'package.json'));
const {ESLint}=require('eslint');
const eslint=new ESLint({cwd:front});
const backup=resolve('output/mobile-redesign/source-before');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const rows=[];
for(const file of walk(backup).filter(f=>/\.tsx?$/.test(f))){
  const name=relative(backup,file),path=join(front,name);
  const [before]=await eslint.lintText(readFileSync(file,'utf8'),{filePath:path});
  const [after]=await eslint.lintFiles([path]);
  const signature=m=>m.ruleId+'|'+m.message.replace(/F:.*?:\d+:\d+/g,'LOCATION').split('\n')[0];
  const old=new Map(); for(const m of before.messages){const key=signature(m);old.set(key,(old.get(key)??0)+1);}
  const added=[];for(const m of after.messages){const key=signature(m);if(old.get(key))old.set(key,old.get(key)-1);else added.push({rule:m.ruleId,line:m.line,message:m.message.split('\n')[0]});}
  rows.push({file:name,before:before.errorCount,after:after.errorCount,warningsBefore:before.warningCount,warningsAfter:after.warningCount,added});
}
const data={rows,totalBefore:rows.reduce((n,r)=>n+r.before,0),totalAfter:rows.reduce((n,r)=>n+r.after,0)};
writeFileSync(resolve('output/mobile-redesign/lint-comparison.json'),JSON.stringify(data,null,2));
console.log(JSON.stringify(data,null,2));
