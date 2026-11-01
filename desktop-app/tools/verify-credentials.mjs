import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import electron from 'electron';

if(process.platform!=='win32')throw new Error('This credential smoke check targets Windows.');
const root=path.resolve(fileURLToPath(new URL('../.local/',import.meta.url)));
await fs.mkdir(root,{recursive:true});const directory=await fs.mkdtemp(path.join(root,'credential-check-'));
if(path.dirname(directory)!==root)throw new Error('Invalid credential-test cleanup directory.');
const env={...process.env,MENCH_CREDENTIAL_TEST_DIRECTORY:directory};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(electron,[fileURLToPath(new URL('./verify-credentials-host.mjs',import.meta.url))],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='',stderr='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{stderr+=chunk;});
const timeout=setTimeout(()=>child.kill(),20000);
try{
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
    if(code!==0)throw new Error('Background credential verification failed: '+stderr);
    if(!output.includes('Windows credential encryption, persistent reopening, and damaged-vault recovery passed.'))throw new Error('Credential verification did not produce success evidence.');
    await fs.writeFile(path.join(root,'credentials-verification.json'),JSON.stringify({verifiedAt:new Date().toISOString(),electron:JSON.parse(await fs.readFile(new URL('../node_modules/electron/package.json',import.meta.url),'utf8')).version,platform:process.platform,method:'Electron safeStorage async API; no windows created',checks:['Windows encryption','Persistent reopening','Plaintext absent from encrypted file','Damaged vault rejected','Clear and protect new credentials after damage'],passed:true},null,2));
    console.log(output.trim());
}finally{
    clearTimeout(timeout);
    
    await fs.rm(directory,{recursive:true,force:true});
}
