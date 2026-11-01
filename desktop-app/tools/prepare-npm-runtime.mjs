import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const require=createRequire(import.meta.url);
const here=path.dirname(fileURLToPath(import.meta.url));
const source=path.dirname(require.resolve('npm/package.json'));
const target=path.join(here,'npm-runtime');
const original=JSON.parse(await fs.readFile(path.join(source,'package.json'),'utf8'));
const patches={'brace-expansion':'5.0.12','undici':'6.29.1','ip-address':'10.7.5','postcss-selector-parser':'7.1.7'};
const provenance={source:'https://registry.npmjs.org/npm',version:original.version,patchedDependencies:patches};
try {
    const existing=JSON.parse(await fs.readFile(path.join(target,'mench-provenance.json'),'utf8'));
    let valid=JSON.stringify(existing)===JSON.stringify(provenance);
    for(const [name,version] of Object.entries(patches)) valid=valid&&JSON.parse(await fs.readFile(path.join(target,'node_modules',name,'package.json'),'utf8')).version===version;
    if(valid) {console.log('Verified prepared npm runtime '+original.version);process.exit(0);}
} catch { /* A missing or invalid cache must be rebuilt and verified below. */ }
await fs.mkdir(target,{recursive:true});
await fs.cp(source,target,{recursive:true,force:true});
const runtime={...original,private:true,dependencies:{...original.dependencies,...patches}};
delete runtime.workspaces;delete runtime.devDependencies;delete runtime.scripts;delete runtime.bundleDependencies;
await fs.writeFile(path.join(target,'package.json'),JSON.stringify(runtime,null,2));
const cli=process.env.npm_execpath||path.join(source,'bin','npm-cli.js');
const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[cli,'install','--prefix',target,'--omit=dev','--ignore-scripts','--no-fund','--no-audit'],{stdio:'inherit',windowsHide:true});
    child.once('error',reject);child.once('exit',resolve);
});
if(result!==0) throw new Error('Could not prepare the npm runtime.');
await fs.writeFile(path.join(target,'mench-provenance.json'),JSON.stringify(provenance));
console.log('Prepared npm runtime with pinned security fixes.');
