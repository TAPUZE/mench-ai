import path from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createSchoolServer} from './gateway.mjs';
import {schoolDataDirectory} from './paths.mjs';

const directory=schoolDataDirectory();
await mkdir(directory,{recursive:true,mode:0o700});
const tokenFile=path.join(directory,'setup-token.txt');
let bootstrapToken=process.env.MENCH_SETUP_TOKEN;
if(!bootstrapToken){
    try{bootstrapToken=(await readFile(tokenFile,'utf8')).trim();}
    catch(error){if(error.code!=='ENOENT')throw error;bootstrapToken=randomBytes(32).toString('base64url');await writeFile(tokenFile,bootstrapToken,{mode:0o600,flag:'wx'});}
}
const host=process.env.MENCH_SCHOOL_HOST||'127.0.0.1',port=Number(process.env.MENCH_SCHOOL_PORT||4180);
if(!['127.0.0.1','::1'].includes(host)&&process.env.MENCH_SCHOOL_BEHIND_TLS_PROXY!=='1') throw new Error('Remote school service access requires a TLS proxy and MENCH_SCHOOL_BEHIND_TLS_PROXY=1.');
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid school service port.');
const runtime=await createSchoolServer({filename:path.join(directory,'school.sqlite'),bootstrapToken,apiKey:process.env.GEMINI_API_KEY,model:process.env.MENCH_AI_MODEL||'gemini-3.8-flash',automaticBackups:true,keepAutomaticBackups:Number(process.env.MENCH_BACKUP_KEEP||14)});
runtime.server.listen(port,host,()=>{
    console.log('Mench school service listening on '+host+':'+runtime.server.address().port);
    if(runtime.store.status().setupRequired)console.log('First administrator setup token is in '+tokenFile+'. Keep this file private.');
    console.log('Provider '+(process.env.GEMINI_API_KEY?'configured':'not configured')+'. School policy: '+runtime.store.policy().status+'.');
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>runtime.close().then(()=>process.exit(0)));
