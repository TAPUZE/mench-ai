import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import electron from 'electron';

// Render only our application in an offscreen process. No desktop automation,
// visible windows, native dialogs, installer, or user profile are involved.
const root=fileURLToPath(new URL('..',import.meta.url)),source=process.argv.includes('--source'),managed=process.argv.includes('--managed');
const candidate=source?null:path.resolve(process.argv.slice(2).find(argument=>!argument.startsWith('--'))||'.local/windows-community-candidate/win-unpacked');
const temporaryRoot=path.join(root,'.local');await fs.mkdir(temporaryRoot,{recursive:true});
const directory=await fs.mkdtemp(path.join(temporaryRoot,'desktop-ui-'));
if(path.dirname(directory)!==temporaryRoot)throw new Error('Invalid UI fixture directory.');
const evidence=source?path.join(temporaryRoot,managed?'source-managed-ui-evidence':'source-ui-evidence'):path.join(path.dirname(candidate),managed?'managed-ui-evidence':'ui-evidence');await fs.mkdir(evidence,{recursive:true});
const env={...process.env,MENCH_UI_DIRECTORY:directory,MENCH_UI_EVIDENCE:evidence,MENCH_UI_APPLICATION_ROOT:candidate?path.join(candidate,'resources','app.asar'):root,MENCH_UI_RESOURCES:candidate?path.join(candidate,'resources'):root,MENCH_UI_SOURCE:source?'1':'',MENCH_UI_MANAGED:managed?'1':''};delete env.ELECTRON_RUN_AS_NODE;
const nodePath=path.join(env.MENCH_UI_RESOURCES,source?'tools/runtime':'runtime','node.exe');
const school=spawn(nodePath,[fileURLToPath(new URL('./school-ui-fixture.mjs',import.meta.url))],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let schoolOutput='',schoolErrors='';school.stdout.on('data',chunk=>{schoolOutput+=chunk;});school.stderr.on('data',chunk=>{schoolErrors+=chunk;});
const schoolExit=new Promise(resolve=>{school.once('exit',resolve);school.once('error',()=>resolve(null));});
try{env.MENCH_UI_SCHOOL_URL=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('School UI fixture startup timed out. '+schoolErrors)),15000);school.once('error',error=>{clearTimeout(timer);reject(error);});school.once('exit',()=>{clearTimeout(timer);reject(new Error('School UI fixture exited: '+schoolErrors));});const ready=()=>{const match=schoolOutput.match(/MENCH_UI_SCHOOL_URL:(http:\/\/127\.0\.0\.1:\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}};school.stdout.on('data',ready);ready();});}
catch(error){school.kill();await schoolExit;await fs.rm(directory,{recursive:true,force:true,maxRetries:8,retryDelay:200});throw error;}
const child=spawn(electron,[fileURLToPath(new URL('./verify-desktop-ui-host.mjs',import.meta.url))],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='',stderr='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{stderr+=chunk;});
const timeout=setTimeout(()=>child.kill(),90000);
try{
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
    if(code!==0)throw new Error('Background desktop UI verification failed: '+stderr.slice(-7000));
    const line=output.split('\n').find(line=>line.startsWith('MENCH_UI_REPORT:'));if(!line)throw new Error('The desktop UI check returned no report.');
    const report={...JSON.parse(line.slice('MENCH_UI_REPORT:'.length)),verifiedAt:new Date().toISOString(),candidate,source,managed,evidence,archiveSha256:candidate?createHash('sha256').update(await fs.readFile(path.join(candidate,'resources','app.asar'))).digest('hex'):null};
    await fs.writeFile(path.join(evidence,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{clearTimeout(timeout);school.kill();await schoolExit;await fs.rm(directory,{recursive:true,force:true,maxRetries:8,retryDelay:200});}
