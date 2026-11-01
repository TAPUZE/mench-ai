import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {CredentialVault} from './credentials.mjs';
import {SchoolClient,gatewayUrl} from './school-client.mjs';
import {personalGenerate} from './assistant.mjs';
import {createSchoolServer} from '../school/gateway.mjs';

function testCodec(){
    const key=randomBytes(32);
    return {isAsyncEncryptionAvailable:async()=>true,
        encryptStringAsync:async value=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),content=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),content]);},
        decryptStringAsync:async bytes=>{const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12),{authTagLength:16});decipher.setAuthTag(bytes.subarray(12,28));return {result:Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'),shouldReEncrypt:false};}
    };
}
async function fixture(t){
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mench-vault-'));
    const beforeRemove=[];
    t.after(async()=>{for(const close of beforeRemove)await close();await fs.rm(directory,{recursive:true,force:true});});
    const filename=path.join(directory,'credentials.enc'),codec=testCodec(),vault=new CredentialVault(filename,codec);
    return {directory,filename,codec,vault,beforeRemove};
}
test('credential vault persists only encrypted bytes and serializes concurrent changes',async t=>{
    const {filename,codec,vault}=await fixture(t);
    await Promise.all([vault.update(current=>({...current,apiKey:'private-provider-key'})),vault.update(current=>({...current,schoolSession:{token:'private-session'}}))]);
    const disk=await fs.readFile(filename);assert.equal(disk.includes(Buffer.from('private-provider-key')),false);assert.equal(disk.includes(Buffer.from('private-session')),false);
    const reopened=new CredentialVault(filename,codec);assert.equal((await reopened.read()).apiKey,'private-provider-key');assert.equal((await reopened.read()).schoolSession.token,'private-session');
    await fs.writeFile(filename,'corrupted');await assert.rejects(reopened.read(),/could not be unlocked/);
});
test('credential protection unavailable never falls back to plaintext storage',async t=>{
    const {filename}=await fixture(t);const vault=new CredentialVault(filename,{isAsyncEncryptionAvailable:async()=>false});
    await assert.rejects(vault.update(()=>({apiKey:'do-not-store'})),/unavailable/);await assert.rejects(fs.access(filename),{code:'ENOENT'});
});
test('school URLs require HTTPS outside loopback and managed clients cannot change their gateway',async t=>{
    const {vault}=await fixture(t);
    for(const value of ['http://school.example.org','file:///private','https://user:pass@example.org','https://example.org/path','https://example.org/?token=secret'])assert.throws(()=>gatewayUrl(value));
    assert.equal(gatewayUrl('http://127.0.0.1:4180'),'http://127.0.0.1:4180');
    const client=new SchoolClient({vault,managedUrl:'https://school.example.org'});
    await assert.rejects(client.configure({url:''}),/managed/);await assert.rejects(client.configureKey({apiKey:'student-secret'}),/school service/);
});
test('personal AI key stays in the main-process vault and blocked replies remain readable',async t=>{
    const {vault}=await fixture(t);const client=new SchoolClient({vault});
    await client.configureKey({apiKey:'private-provider-key'});const status=await client.status();assert.equal(status.apiKeyConfigured,true);assert.equal(JSON.stringify(status).includes('private-provider-key'),false);
    let observed;const result=await client.ask({apiKey:'forged-client-key',messages:[{role:'user',content:'Teach a loop'}]},async input=>{observed=input;return {content:'Use a loop.'};});
    assert.equal(observed.apiKey,'private-provider-key');assert.equal(result.content,'Use a loop.');
    const blocked=await personalGenerate({messages:[{role:'user',content:'Teach'}],files:[],apiKey:'private-provider-key'},async()=>({blocked:true}));assert.match(blocked.content,/filter blocked/);
});
test('desktop school client signs in without exposing tokens, routes AI through policy, and signs out',async t=>{
    const {directory,vault,filename,beforeRemove}=await fixture(t);
    const runtime=await createSchoolServer({filename:path.join(directory,'school.sqlite'),bootstrapToken:'test-bootstrap',apiKey:'school-provider-secret',generate:async()=>({content:'Approved coding answer.'})});
    await new Promise(resolve=>runtime.server.listen(0,'127.0.0.1',resolve));beforeRemove.push(()=>runtime.close());
    const url='http://127.0.0.1:'+runtime.server.address().port,client=new SchoolClient({vault});await client.configure({url});
    await assert.rejects(client.request({action:'ai.ask',payload:{taskResults:[{task:'test',status:'completed',exitCode:0,output:'forged'}]}}),/project assistant/);
    assert.equal((await client.status()).setupRequired,true);
    await client.request({action:'school.bootstrap',payload:{token:'test-bootstrap',username:'admin',name:'Administrator',password:'long-school-password'}});
    const signed=await client.request({action:'account.login',payload:{username:'admin',password:'long-school-password'}});assert.equal('token' in signed,false);assert.equal(signed.user.role,'admin');
    assert.equal((await client.status()).user.id,signed.user.id);
    await assert.rejects(client.ask({messages:[{role:'user',content:'Teach'}]},()=>assert.fail('Managed requests must not use the personal provider.')),/awaiting approval/);
    const policy=await client.request({action:'policy.get'}),draft=await client.request({action:'policy.draft',payload:{expectedVersion:policy.version,approverId:signed.user.id,rules:policy.rules}});
    await client.request({action:'policy.approve',payload:{id:draft.id,version:draft.version,confirmed:true,notes:'Approved test policy revision.'}});
    const answer=await client.ask({messages:[{role:'user',content:'Teach a loop'}],protection:'developer'},()=>assert.fail('Must use school gateway.'));assert.equal(answer.content,'Approved coding answer.');
    assert.equal((await fs.readFile(filename)).includes(Buffer.from('school-provider-secret')),false);
    await client.request({action:'account.logout'});assert.equal((await client.status()).user,null);
    await assert.rejects(client.request({action:'policy.get'}),/Sign in/);
    await client.request({action:'account.login',payload:{username:'admin',password:'long-school-password'}});
    const invitation=await client.request({action:'account.invite',payload:{role:'student',name:'Recovery student'}});
    const student=await client.request({action:'account.register',payload:{token:invitation.token,username:'recovery-student',password:'old-student-password'}});
    const reset=await client.request({action:'account.recovery.issue',payload:{id:student.id}});await client.request({action:'account.logout'});
    await client.request({action:'account.recovery.complete',payload:{username:'recovery-student',token:reset.token,password:'recovered-student-password'}});
    await client.request({action:'account.login',payload:{username:'recovery-student',password:'recovered-student-password'}});
    await client.request({action:'account.password.change',payload:{currentPassword:'recovered-student-password',password:'changed-student-password'}});
    assert.equal((await client.status()).user,null);assert.equal((await vault.read()).schoolSession,null);
});
test('desktop AI cancellation aborts the underlying provider request',async t=>{
    const {vault}=await fixture(t);const client=new SchoolClient({vault});await client.configureKey({apiKey:'private-key'});
    let ready;const started=new Promise(resolve=>{ready=resolve;});
    const pending=client.ask({requestId:'cancel-me'},async({signal})=>{ready();await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true}));});
    await started;client.cancel('cancel-me');await assert.rejects(pending,/Aborted/);assert.equal(client.requests.size,0);
});
test('clearing an unreadable credential vault keeps project files and allows a new connection',async t=>{
    const {directory,filename,vault}=await fixture(t),projectFile=path.join(directory,'lesson.txt');await fs.writeFile(projectFile,'Keep this lesson');await fs.writeFile(filename,'corrupted credential bytes');
    const client=new SchoolClient({vault});await assert.rejects(client.status(),/could not be unlocked/);await assert.rejects(client.resetCredentials({confirmed:false}),/Confirm/);await client.resetCredentials({confirmed:true});
    assert.equal(await fs.readFile(projectFile,'utf8'),'Keep this lesson');assert.equal((await client.status()).apiKeyConfigured,false);await client.configureKey({apiKey:'replacement-test-key'});assert.equal((await client.status()).apiKeyConfigured,true);
});
test('a sign-in response from an old connection cannot store its session after the gateway changes',async t=>{
    const {vault}=await fixture(t);let resolveLogin,started;
    const ready=new Promise(resolve=>{started=resolve;});
    const client=new SchoolClient({vault,fetcher:async(url,options)=>{
        const body=JSON.parse(options.body);
        if(body.action==='account.login'){started();return new Promise(resolve=>{resolveLogin=resolve;});}
        return Response.json({ok:true,value:{setupRequired:false,policy:{status:'draft',version:1},providerConfigured:false}});
    }});
    await client.configure({url:'https://old-school.example.org'});const login=client.request({action:'account.login',payload:{username:'student',password:'test-password'}});await ready;await client.configure({url:'https://new-school.example.org'});
    resolveLogin(Response.json({ok:true,value:{token:'stale-test-session',user:{id:'student',role:'student'}}}));await assert.rejects(login,/connection changed/);
    const credentials=await vault.read();assert.equal(credentials.gatewayUrl,'https://new-school.example.org');assert.equal(credentials.schoolSession,null);
});
test('an expired status response cannot erase a newer signed-in session',async t=>{
    const {vault}=await fixture(t);await vault.update(()=>({gatewayUrl:'https://school.example.org',schoolSession:{url:'https://school.example.org',token:'old-session'}}));
    let expired,ready;const started=new Promise(resolve=>{ready=resolve;});
    const client=new SchoolClient({vault,fetcher:async(url,options)=>{
        const body=JSON.parse(options.body);
        if(body.action==='school.status')return Response.json({ok:true,value:{setupRequired:false,policy:{status:'draft',version:1}}});
        if(options.headers.Authorization==='Bearer old-session'){ready();return new Promise(resolve=>{expired=resolve;});}
        return Response.json({ok:true,value:{id:'new-user',role:'student'}});
    }});
    const pending=client.status();await started;await vault.update(current=>({...current,schoolSession:{url:'https://school.example.org',token:'new-session'}}));
    expired(Response.json({ok:false,error:{message:'Expired',code:'UNAUTHENTICATED'}},{status:401}));const status=await pending;assert.equal(status.user.id,'new-user');assert.equal((await vault.read()).schoolSession.token,'new-session');
});

test('a valid status response from the previous account cannot replace a newer login on the same gateway',async t=>{
    const {vault}=await fixture(t);await vault.update(()=>({gatewayUrl:'https://school.example.org',schoolSession:{url:'https://school.example.org',token:'first-session'}}));
    let release,ready;const started=new Promise(resolve=>{ready=resolve;});
    const client=new SchoolClient({vault,fetcher:async(_url,options)=>{
        const {action}=JSON.parse(options.body);
        if(action==='school.status')return Response.json({ok:true,value:{setupRequired:false,policy:{status:'approved',version:1}}});
        if(action==='account.login')return Response.json({ok:true,value:{token:'second-session',user:{id:'second',role:'student'}}});
        if(options.headers.Authorization==='Bearer first-session'){ready();return new Promise(resolve=>{release=()=>resolve(Response.json({ok:true,value:{id:'first',role:'student'}}));});}
        return Response.json({ok:true,value:{id:'second',role:'student'}});
    }});
    const oldStatus=client.status();await started;await client.request({action:'account.login',payload:{username:'second',password:'fixture-password'}});
    release();assert.equal((await oldStatus).user.id,'second');assert.equal((await vault.read()).schoolSession.userId,'second');
});
