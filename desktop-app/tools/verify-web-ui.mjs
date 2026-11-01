import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import electron from 'electron';

const target=new URL(process.argv[2]||'http://127.0.0.1:8080');
if(!['http:','https:'].includes(target.protocol))throw new Error('Use an HTTP or HTTPS web workspace URL.');
const root=fileURLToPath(new URL('..',import.meta.url)),local=path.join(root,'.local');await fs.mkdir(local,{recursive:true});
const directory=await fs.mkdtemp(path.join(local,'web-ui-')),evidence=path.join(local,'web-ui-evidence');await fs.mkdir(evidence,{recursive:true});
if(path.dirname(directory)!==local)throw new Error('Invalid fixture cleanup path.');
const env={...process.env,MENCH_WEB_URL:target.href,MENCH_WEB_PROFILE:directory,MENCH_WEB_EVIDENCE:evidence};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(electron,[fileURLToPath(new URL('./verify-web-ui-host.mjs',import.meta.url))],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='',errors='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{errors+=chunk;});
const timeout=setTimeout(()=>child.kill(),90000);
try{
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
    if(code!==0)throw new Error('Background browser verification failed: '+errors.slice(-6000)+'\n'+output.slice(-3000));
    const line=output.split('\n').find(line=>line.startsWith('MENCH_WEB_REPORT:'));if(!line)throw new Error('Missing web verification report.');
    const report={...JSON.parse(line.slice('MENCH_WEB_REPORT:'.length)),url:target.href,verifiedAt:new Date().toISOString()};
    await fs.writeFile(path.join(evidence,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
    clearTimeout(timeout);
    await fs.rm(directory,{recursive:true,force:true,maxRetries:8,retryDelay:200});
}
