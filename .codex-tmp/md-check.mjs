import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const stage=process.argv[2]||'stage1', root=new URL('../',import.meta.url), cwd=new URL('frontend/',root), out=new URL(`output/master-data-round1/${stage}`,root);
const tasks=[['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],['lint',['node_modules/eslint/bin/eslint.js','.', '--ignore-pattern','dist','--ignore-pattern','.next','--format','json','--output-file',fileURLToPath(new URL(`${out.href}-lint.json`))]],['build',['node_modules/vinext/dist/cli.js','build']]];
const results=[];
for(const [name,args]of tasks){const result=await new Promise(resolve=>{const child=spawn(process.execPath,args,{cwd,windowsHide:true});let output='';child.stdout.on('data',s=>output+=s);child.stderr.on('data',s=>output+=s);child.on('close',code=>{writeFileSync(new URL(`${out.href}-${name}.log`),output);resolve({name,code});});});results.push(result);console.log(stage,JSON.stringify(result));}
writeFileSync(new URL(`${out.href}-checks.json`),JSON.stringify(results,null,2));
