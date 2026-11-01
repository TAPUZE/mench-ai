import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import electron from 'electron';

const candidate=path.resolve(process.argv[2]||'.local/windows-community-candidate/win-unpacked');
const temporaryRoot=fileURLToPath(new URL('../.local/',import.meta.url));await fs.mkdir(temporaryRoot,{recursive:true});const directory=await fs.mkdtemp(path.join(temporaryRoot,'packaged-services-'));
if(path.resolve(path.dirname(directory))!==path.resolve(temporaryRoot))throw new Error('Invalid service-test cleanup directory.');
const env={...process.env,MENCH_SERVICE_TEST_DIRECTORY:directory,MENCH_SERVICE_TEST_CANDIDATE:candidate};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(electron,[fileURLToPath(new URL('./verify-packaged-services-host.mjs',import.meta.url))],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='',stderr='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{stderr+=chunk;});
const timeout=setTimeout(()=>child.kill(),50000);let verificationError;
try{
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
    if(code!==0)throw new Error('Packaged service verification failed: '+stderr);
    const line=output.split('\n').find(line=>line.startsWith('MENCH_SERVICE_REPORT:'));if(!line)throw new Error('No packaged service report was returned.');
    const report={...JSON.parse(line.slice('MENCH_SERVICE_REPORT:'.length)),candidate,verifiedAt:new Date().toISOString(),archiveSha256:createHash('sha256').update(await fs.readFile(path.join(candidate,'resources','app.asar'))).digest('hex'),visibleWindowsCreated:0};
    await fs.writeFile(path.join(path.dirname(candidate),'desktop-services-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){verificationError=error;}finally{
    clearTimeout(timeout);try{await fs.rm(directory,{recursive:true,force:true,maxRetries:8,retryDelay:200});}catch(error){if(!verificationError)verificationError=error;else console.error('Isolated fixture cleanup failed: '+error.code);}
}


if(verificationError)throw verificationError;
