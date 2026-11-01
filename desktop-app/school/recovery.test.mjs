import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFile as execFileCallback} from 'node:child_process';
import {scrypt,randomUUID} from 'node:crypto';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {SchoolStore} from './store.mjs';
import {Gateway,createSchoolServer} from './gateway.mjs';
import {BackupManager,restoreBackup,inspectDatabase} from './backups.mjs';
import {acquireMaintenanceLock} from './maintenance-lock.mjs';
import {schoolDataDirectory} from './paths.mjs';
import {defaultCommunities} from '../shared/community-profiles.mjs';

const password='school-recovery-test-password',nextPassword='new-school-recovery-password';
async function fixture(t){
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mench-school-recovery-')),filename=path.join(directory,'school.sqlite');
    const store=await SchoolStore.open(filename,{bootstrapToken:'recovery-test-setup'}),stores=[store],leases=[],beforeRemove=[];
    t.after(async()=>{for(const close of beforeRemove)await close();for(const item of stores)item.close();for(const item of leases)item.release();if(path.dirname(directory)!==os.tmpdir())throw new Error('Invalid fixture cleanup.');await fs.rm(directory,{recursive:true,force:true});});
    const admin=await store.bootstrap({token:'recovery-test-setup',username:'admin',name:'Administrator',password});
    async function account(role,name){const invite=store.invite(admin,{role,name});return store.register({token:invite.token,username:name,password});}
    const teacher=await account('teacher','teacher'),student=await account('student','student');
    const backups=new BackupManager(store),gateway=new Gateway({store,backups});
    return {directory,filename,store,admin,teacher,student,account,backups,gateway,stores,leases,beforeRemove};
}
async function seedClass({store,admin,teacher,student}){
    const classroom=store.createClass(teacher,{name:'Recovery class'});store.enroll(teacher,{classId:classroom.id,studentId:student.id});
    const template=store.createTemplate(teacher,{title:'Starter',files:[{path:'index.html',content:'<h1>Starter</h1>'}]});store.approveTemplate(admin,{id:template.id,confirmed:true});
    const assignment=store.createAssignment(teacher,{classId:classroom.id,templateId:template.id,title:'Recovery lesson',instructions:'Complete the lesson.'});
    store.submit(student,{assignmentId:assignment.id,files:[{path:'index.html',content:'<h1>Saved submission</h1>'}],note:'Before backup'});
    const policy=store.draftPolicy(admin,{expectedVersion:1,approverId:teacher.id,rules:store.policy().rules});store.approvePolicy(teacher,{id:policy.id,version:policy.version,confirmed:true,notes:'Test review of exact revision.'});return assignment;
}

test('schema four snapshots preserve private conversations and source revisions while restore requires new source approval',async t=>{
    const f=await fixture(t);await seedClass(f);
    const communities=defaultCommunities();communities.profiles.israeli.guidance+=' Recovery fixture instruction.';
    const policy=f.store.draftPolicy(f.admin,{expectedVersion:2,approverId:f.teacher.id,rules:{...f.store.policy().rules,communityProfiles:communities}});
    f.store.approvePolicy(f.teacher,{id:policy.id,version:policy.version,confirmed:true,notes:'Isolated recovery fixture approval.'});
    const source=f.store.knowledge.create(f.teacher,{title:'Recovery source',reference:'Fixture worksheet / 1',author:'Fixture teacher',edition:'Fixture edition',language:'English',body:'A recovery loop repeats until its condition changes.'});
    f.store.knowledge.approve(f.teacher,{id:source.id,contentHash:source.contentHash,confirmed:true,approvalScope:'israeli',notes:'Reviewed exact recovery fixture source.'});
    const session=(await f.store.login({username:'student',password})).token;
    await f.gateway.dispatch('chat.save',{ownerId:f.student.id,projectId:'recovery-project',expectedRevision:0,messages:[{id:'private-turn',role:'user',content:'Retain this private recovery conversation.'}]},session);
    const snapshot=await f.backups.create(f.admin);assert.equal(snapshot.summary.schemaVersion,4);assert.equal((await f.backups.verify(snapshot.id)).verified,true);
    f.store.close();const lease=await acquireMaintenanceLock(f.directory);f.leases.push(lease);
    const result=await restoreBackup({filename:f.filename,id:snapshot.id,confirmedId:snapshot.id,lease});
    assert.equal(result.policyStatus,'draft');
    const restored=await SchoolStore.open(f.filename);f.stores.push(restored);
    assert.equal(restored.db.prepare('SELECT body FROM knowledge_sources WHERE id=?').get(source.id).body,'A recovery loop repeats until its condition changes.');
    assert.deepEqual(restored.policy().rules.communityProfiles,communities);
    assert.equal(restored.db.prepare('SELECT approval_scope FROM knowledge_sources WHERE id=?').get(source.id).approval_scope,'israeli');
    assert.match(restored.db.prepare('SELECT messages FROM chat_histories WHERE user_id=?').get(f.student.id).messages,/private recovery conversation/);
    assert.equal(restored.knowledge.search(f.student,{query:'recovery loop'}).length,0);
});

test('backup inspection rejects damaged source text and a mismatched search index',async t=>{
    const {store,teacher}=await fixture(t),source=store.knowledge.create(teacher,{title:'Inspection source',reference:'Fixture / 1',author:'Fixture teacher',edition:'Fixture',language:'English',body:'A loop repeats instructions.'});
    assert.equal(inspectDatabase(store.db).schemaVersion,4);
    store.db.prepare('UPDATE knowledge_sources SET body=? WHERE id=?').run('Undeclared replacement text.',source.id);assert.throws(()=>inspectDatabase(store.db),/invalid.*source/);
    store.db.prepare('UPDATE knowledge_sources SET body=? WHERE id=?').run('A loop repeats instructions.',source.id);
    store.db.prepare('UPDATE knowledge_fts SET body=? WHERE chunk_id=?').run('wrong indexed text',source.id+':0');assert.throws(()=>inspectDatabase(store.db),/invalid.*index/);
});
test('changing a password verifies the current password and revokes every existing session',async t=>{
    const {store,student,gateway}=await fixture(t),one=await store.login({username:'student',password}),two=await store.login({username:'student',password});
    await assert.rejects(gateway.dispatch('account.password.change',{currentPassword:'wrong',password:nextPassword},one.token),error=>error.code==='CURRENT_PASSWORD');assert.equal(store.authenticate(two.token).id,student.id);
    const result=await gateway.dispatch('account.password.change',{currentPassword:password,password:nextPassword},one.token);assert.equal(result.signedOut,true);
    for(const session of [one,two])assert.throws(()=>store.authenticate(session.token),error=>error.code==='UNAUTHENTICATED');
    await assert.rejects(store.login({username:'student',password}),/incorrect/);assert.equal((await store.login({username:'student',password:nextPassword})).user.id,student.id);
});
test('administrator reset tokens are one use, account bound, expiring, hashed, and never grant a new role',async t=>{
    const {store,admin,student,gateway}=await fixture(t),adminSession=await store.login({username:'admin',password}),studentSession=await store.login({username:'student',password});
    await assert.rejects(gateway.dispatch('account.recovery.issue',{id:admin.id},studentSession.token),error=>error.code==='FORBIDDEN');
    const first=store.issueReset(admin,{id:student.id});assert.throws(()=>store.authenticate(studentSession.token),/expired/);
    const second=store.issueReset(admin,{id:student.id});assert.equal(JSON.stringify(store.db.prepare('SELECT * FROM password_resets').all()).includes(second.token),false);
    await assert.rejects(gateway.dispatch('account.recovery.complete',{username:'student',token:first.token,password:nextPassword}),error=>error.code==='INVALID_RESET');
    await assert.rejects(gateway.dispatch('account.recovery.complete',{username:'teacher',token:second.token,password:nextPassword}),error=>error.code==='INVALID_RESET');
    await gateway.dispatch('account.recovery.complete',{username:'student',token:second.token,password:nextPassword,role:'admin'});
    await assert.rejects(gateway.dispatch('account.recovery.complete',{username:'student',token:second.token,password:nextPassword}),error=>error.code==='INVALID_RESET');
    assert.equal((await store.login({username:'student',password:nextPassword})).user.role,'student');assert.equal(store.authenticate(adminSession.token).role,'admin');
    const expired=store.issueReset(admin,{id:student.id});store.db.prepare('UPDATE password_resets SET expires_at=?').run('2000-01-01T00:00:00.000Z');await assert.rejects(store.completeReset({username:'student',token:expired.token,password}),error=>error.code==='INVALID_RESET');
    assert.equal(JSON.stringify(store.auditLog(admin)).includes(second.token),false);
});
test('in-flight authentication cannot survive deactivation or session revocation during password changes',async t=>{
    const {store,admin,student}=await fixture(t);const signingIn=store.login({username:'student',password});store.setActive(admin,{id:student.id,active:false});await assert.rejects(signingIn,/incorrect/);
    store.setActive(admin,{id:student.id,active:true});const signed=await store.login({username:'student',password});
    const changing=store.changePassword(student,{currentPassword:password,password:nextPassword},signed.token);store.logout(signed.token);await assert.rejects(changing,error=>error.code==='UNAUTHENTICATED');assert.ok(await store.login({username:'student',password}));
});
test('consistent online backups include committed WAL data and verify classroom contents',async t=>{
    const fixtureData=await fixture(t),{store,backups,admin,filename}=fixtureData;store.db.exec('PRAGMA wal_autocheckpoint=0');await seedClass(fixtureData);
    assert.ok((await fs.stat(filename+'-wal')).size>0);const metadata=await backups.create(admin);assert.equal(metadata.summary.submissions,1);assert.equal(metadata.summary.policyStatus,'approved');assert.equal((await backups.verify(metadata.id)).verified,true);
    const snapshot=new DatabaseSync(backups.file(metadata.id,'.sqlite'),{readOnly:true});try{assert.equal(inspectDatabase(snapshot).accounts,3);assert.match(snapshot.prepare('SELECT files FROM submissions').get().files,/Saved submission/);}finally{snapshot.close();}
    assert.equal((await backups.status()).total,1);
});
test('restore preserves a safety snapshot, restores real work, revokes old access, and requires fresh policy approval',async t=>{
    const data=await fixture(t),{store,backups,admin,student,filename,directory,stores,leases}=data,assignment=await seedClass(data);
    const session=await store.login({username:'admin',password}),invitation=store.invite(admin,{role:'student',name:'Unused invite'}),reset=store.issueReset(admin,{id:student.id});
    const snapshot=await backups.create(admin);store.submit(student,{assignmentId:assignment.id,files:[{path:'index.html',content:'After backup'}],note:'Newer work'});store.close();
    const lease=await acquireMaintenanceLock(directory);leases.push(lease);const result=await restoreBackup({filename,id:snapshot.id,confirmedId:snapshot.id,lease});assert.equal(result.restored,true);
    const reopened=await SchoolStore.open(filename);stores.push(reopened);assert.equal(reopened.policy().status,'draft');assert.equal(reopened.policy().approverId,null);assert.equal(reopened.db.prepare('SELECT COUNT(*) AS count FROM submissions').get().count,1);assert.throws(()=>reopened.authenticate(session.token),/expired/);
    await assert.rejects(reopened.register({token:invitation.token,username:'old-invite',password}),/invalid/);await assert.rejects(reopened.completeReset({username:'student',token:reset.token,password:nextPassword}),/invalid/);
    assert.equal((await storeBackupSummary(backups,result.safetyBackupId)).submissions,2);assert.ok((await fs.stat(path.join(directory,result.originalFile))).size>0);assert.equal(reopened.db.prepare("SELECT action FROM audit ORDER BY id DESC LIMIT 1").get().action,'backup.restored');
});
async function storeBackupSummary(backups,id){return (await backups.verify(id)).summary;}
test('corrupt snapshots and missing confirmation or lock cannot modify the live database',async t=>{
    const {store,backups,admin,filename,directory,leases}=await fixture(t),snapshot=await backups.create(admin);
    await assert.rejects(restoreBackup({filename,id:snapshot.id,confirmedId:'wrong'}),/confirm/);await assert.rejects(restoreBackup({filename,id:snapshot.id,confirmedId:snapshot.id}),/maintenance lock/);
    const bytes=await fs.readFile(backups.file(snapshot.id,'.sqlite'));bytes[0]^=1;await fs.writeFile(backups.file(snapshot.id,'.sqlite'),bytes);store.close();
    const lease=await acquireMaintenanceLock(directory);leases.push(lease);await assert.rejects(restoreBackup({filename,id:snapshot.id,confirmedId:snapshot.id,lease}),/checksum/);
    const db=new DatabaseSync(filename,{readOnly:true});try{assert.equal(inspectDatabase(db).accounts,3);}finally{db.close();}
});
test('automatic snapshots are deduplicated by day and prune only old generated automatic snapshots',async t=>{
    const {store,backups,admin}=await fixture(t),manual=await backups.create(admin),automatic=new BackupManager(store,{automatic:true,keepAutomatic:2});
    const [first,duplicate]=await Promise.all([automatic.ensureAutomatic(),automatic.ensureAutomatic()]);assert.equal(first.id,duplicate.id);
    async function age(record,days){const changed={...record,createdAt:new Date(Date.now()-days*86400000).toISOString()};await fs.writeFile(automatic.file(record.id,'.json'),JSON.stringify(changed));}
    await age(first,3);const second=await automatic.ensureAutomatic();await age(second,2);const third=await automatic.ensureAutomatic();const records=await automatic.list();
    assert.equal(records.some(record=>record.id===first.id),false);assert.ok(records.some(record=>record.id===manual.id));assert.ok(records.some(record=>record.id===third.id));assert.equal(records.filter(record=>record.purpose==='automatic').length,2);
    assert.throws(()=>new BackupManager(store,{keepAutomatic:0}),/between/);assert.throws(()=>new BackupManager(store,{keepAutomatic:NaN}),/between/);
});
test('maintenance lock excludes a live service and permits offline admin recovery only after shutdown',async t=>{
    const {directory,filename,store,admin,beforeRemove,leases}=await fixture(t),runtime=await createSchoolServer({store});beforeRemove.push(()=>runtime.close());await new Promise(resolve=>runtime.server.listen(0,'127.0.0.1',resolve));
    await assert.rejects(acquireMaintenanceLock(directory),/Another school service/);await assert.rejects(createSchoolServer({filename}),/Another school service/);assert.throws(()=>store.offlineAdminReset(admin.username),/maintenance lock/);
    await runtime.close();const lease=await acquireMaintenanceLock(directory);leases.push(lease);const reopened=await SchoolStore.open(filename);beforeRemove.push(()=>reopened.close());const reset=reopened.offlineAdminReset('admin',lease);await reopened.completeReset({username:'admin',token:reset.token,password:nextPassword});assert.equal((await reopened.login({username:'admin',password:nextPassword})).user.role,'admin');
});
test('OS maintenance locks release automatically after their owning process exits',async t=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mench-lock-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
    const code='const {acquireMaintenanceLock}=await import('+JSON.stringify(new URL('./maintenance-lock.mjs',import.meta.url).href)+');await acquireMaintenanceLock('+JSON.stringify(directory)+');console.log("READY");setInterval(()=>{},1000);';
    const child=spawn(process.execPath,['--input-type=module','-e',code],{windowsHide:true,stdio:['ignore','pipe','pipe']});let error='';child.stderr.on('data',chunk=>{error+=chunk;});
    const exited=new Promise(resolve=>child.once('exit',resolve));
    try{
        await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Lock process startup timeout: '+error)),5000);child.stdout.on('data',chunk=>{if(String(chunk).includes('READY')){clearTimeout(timeout);resolve();}});child.once('exit',()=>{clearTimeout(timeout);reject(new Error(error));});});
        await assert.rejects(acquireMaintenanceLock(directory),/Another school service/);child.kill();await exited;const lease=await acquireMaintenanceLock(directory);lease.release();
    }finally{if(child.exitCode===null)child.kill();await exited;}
});
test('legacy password hashes upgrade on a real successful sign-in without losing account access',async t=>{
    const {store,student}=await fixture(t),salt='1234567890abcdef1234567890abcdef';
    const legacy=await promisify(scrypt)(password,salt,64,{N:16384,r:8,p:1});store.db.prepare('UPDATE users SET password=? WHERE id=?').run(salt+':'+legacy.toString('hex'),student.id);
    const signed=await store.login({username:'student',password});assert.equal(store.authenticate(signed.token).id,student.id);assert.match(store.db.prepare('SELECT password FROM users WHERE id=?').get(student.id).password,/^scrypt-v2:/);
    assert.equal((await store.login({username:'student',password})).user.id,student.id);
    store.db.prepare('UPDATE users SET password=? WHERE id=?').run('damaged-hash',student.id);await assert.rejects(store.login({username:'student',password}),error=>error.code==='UNAUTHENTICATED');
});
test('maintenance CLI uses the bundled Node runtime for backup, private administrator recovery, and restore',async t=>{
    const {store,filename,directory,admin,stores}=await fixture(t);store.close();
    const execFile=promisify(execFileCallback),binary=fileURLToPath(new URL('../tools/runtime/node.exe',import.meta.url)),entry=fileURLToPath(new URL('./maintenance.mjs',import.meta.url));
    const run=async(operation,...args)=>{const result=await execFile(binary,[entry,operation,'--data',directory,...args],{windowsHide:true});return {result:JSON.parse(result.stdout),stdout:result.stdout};};
    const snapshot=(await run('backup')).result;assert.equal((await run('verify','--id',snapshot.id)).result.verified,true);
    const recovery=await run('recover-admin','--username','admin','--confirm','admin'),secret=(await fs.readFile(recovery.result.resetTokenFile,'utf8')).trim();assert.equal(recovery.stdout.includes(secret),false);assert.equal(path.dirname(recovery.result.resetTokenFile),directory);
    const opened=await SchoolStore.open(filename);stores.push(opened);await opened.completeReset({username:'admin',token:secret,password:nextPassword});assert.equal((await opened.login({username:'admin',password:nextPassword})).user.role,'admin');
    const invite=opened.invite(admin,{role:'student',name:'After backup'});await opened.register({token:invite.token,username:'after-backup',password});opened.close();
    const restored=(await run('restore','--id',snapshot.id,'--confirm',snapshot.id)).result;assert.equal(restored.restored,true);
    const final=await SchoolStore.open(filename);stores.push(final);assert.equal(final.users(admin).total,3);assert.equal(final.policy().status,'draft');assert.equal((await run('verify','--id',restored.safetyBackupId)).result.summary.accounts,4);
});
test('shutdown waits for automatic snapshot work and releases the maintenance lock afterward',async t=>{
    const {store,filename,directory,beforeRemove}=await fixture(t),runtime=await createSchoolServer({store,automaticBackups:true});beforeRemove.push(()=>runtime.close());
    await new Promise(resolve=>runtime.server.listen(0,'127.0.0.1',resolve));await runtime.close();assert.equal((await runtime.backups.list()).some(record=>record.purpose==='automatic'),true);
    const lease=await acquireMaintenanceLock(directory);lease.release();const db=new DatabaseSync(filename,{readOnly:true});try{assert.equal(inspectDatabase(db).accounts,3);}finally{db.close();}
});
test('a verified new automatic snapshot stays successful when an older corrupt snapshot cannot be pruned',async t=>{
    const {store}=await fixture(t),manager=new BackupManager(store,{automatic:true,keepAutomatic:1}),first=await manager.ensureAutomatic();
    await fs.writeFile(manager.file(first.id,'.json'),JSON.stringify({...first,createdAt:'2000-01-01T00:00:00.000Z'}));const old=await fs.readFile(manager.file(first.id,'.sqlite'));old[0]^=1;await fs.writeFile(manager.file(first.id,'.sqlite'),old);
    const latest=await manager.ensureAutomatic();assert.notEqual(latest.id,first.id);assert.equal((await manager.verify(latest.id)).verified,true);assert.match((await manager.status()).lastError,/older automatic backups/);assert.ok(await fs.stat(manager.file(first.id,'.sqlite')));
});
test('school data defaults to application data, preserves a legacy database, and refuses ambiguous defaults',async t=>{
    const {directory}=await fixture(t),cwd=path.join(directory,'application'),local=path.join(directory,'profile');await fs.mkdir(cwd);
    const options={cwd,platform:'win32',env:{LOCALAPPDATA:local},home:directory},expected=path.join(local,'MenchAI','school-service');assert.equal(schoolDataDirectory(options),expected);
    const legacy=path.join(cwd,'.local','school');await fs.mkdir(legacy,{recursive:true});await fs.writeFile(path.join(legacy,'school.sqlite'),'legacy marker');assert.equal(schoolDataDirectory(options),legacy);
    await fs.mkdir(expected,{recursive:true});await fs.writeFile(path.join(expected,'school.sqlite'),'profile marker');assert.throws(()=>schoolDataDirectory(options),/both the old development folder/);
    assert.equal(schoolDataDirectory({...options,explicit:legacy}),legacy);assert.equal(schoolDataDirectory({...options,env:{MENCH_SCHOOL_DATA:expected}}),expected);
    await fs.unlink(path.join(legacy,'school.sqlite'));await fs.mkdir(path.join(legacy,'backups'));assert.throws(()=>schoolDataDirectory(options),/both the old development folder/);
    await fs.unlink(path.join(expected,'school.sqlite'));assert.equal(schoolDataDirectory(options),legacy);
});
test('a damaged current database is preserved before a verified snapshot replaces it',async t=>{
    const {store,backups,admin,filename,directory,leases,stores}=await fixture(t),snapshot=await backups.create(admin);store.close();
    const damaged=Buffer.from('damaged school database bytes');await fs.writeFile(filename,damaged);const lease=await acquireMaintenanceLock(directory);leases.push(lease);
    await assert.rejects(restoreBackup({filename,id:snapshot.id,confirmedId:snapshot.id,lease}),/replace-damaged/);assert.deepEqual(await fs.readFile(filename),damaged);
    const journal=Buffer.from('damaged original rollback journal');await fs.writeFile(filename+'-journal',journal);
    const result=await restoreBackup({filename,id:snapshot.id,confirmedId:snapshot.id,lease,replaceDamaged:true});assert.equal(result.previousDatabaseState,'unverified');assert.deepEqual(await fs.readFile(path.join(directory,result.originalFile,'school.sqlite')),damaged);assert.deepEqual(await fs.readFile(path.join(directory,result.originalFile,'school.sqlite-journal')),journal);await assert.rejects(fs.access(filename+'-journal'),{code:'ENOENT'});
    const reopened=await SchoolStore.open(filename);stores.push(reopened);assert.equal(reopened.users(admin).total,3);assert.equal(reopened.policy().status,'draft');
});
test('a missing current database can be recreated from a verified snapshot',async t=>{
    const {store,backups,admin,filename,directory,leases,stores}=await fixture(t),snapshot=await backups.create(admin);store.close();await fs.unlink(filename);const lease=await acquireMaintenanceLock(directory);leases.push(lease);
    await assert.rejects(restoreBackup({filename,id:snapshot.id,confirmedId:snapshot.id,lease}),/missing/);
    const restored=await restoreBackup({filename,id:snapshot.id,confirmedId:snapshot.id,lease,replaceDamaged:true});assert.equal(restored.previousDatabaseState,'missing');assert.equal(restored.originalFile,null);
    const reopened=await SchoolStore.open(filename);stores.push(reopened);assert.equal(reopened.users(admin).total,3);
});

test('missing school data with existing backups cannot silently bootstrap an empty school',async t=>{
    const {store,backups,admin,filename}=await fixture(t);await backups.create(admin);store.close();await fs.unlink(filename);
    await assert.rejects(createSchoolServer({filename}),/fresh empty school was not created/);await assert.rejects(fs.access(filename),{code:'ENOENT'});
});
test('an interrupted restore blocks empty service startup and can be retried without losing its preservation record',async t=>{
    const {store,backups,admin,filename,directory,leases,stores}=await fixture(t),snapshot=await backups.create(admin);store.close();
    const operation=randomUUID(),original='restore-original-'+operation+'.sqlite';await fs.rename(filename,path.join(directory,original));
    const state={format:'mench.restore.v1',operation,backupId:snapshot.id,status:'prepared',originals:[{source:'school.sqlite',saved:original}]};await fs.writeFile(path.join(directory,'restore-state.json'),JSON.stringify(state));
    await assert.rejects(createSchoolServer({filename}),/interrupted school restore/);await assert.rejects(fs.access(filename),{code:'ENOENT'});
    const lease=await acquireMaintenanceLock(directory);leases.push(lease);await restoreBackup({filename,id:snapshot.id,confirmedId:snapshot.id,lease,replaceDamaged:true});
    const record=JSON.parse(await fs.readFile(path.join(directory,'restore-state.json'),'utf8'));assert.equal(record.status,'complete');assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory,record.previousFile),'utf8')),state);assert.ok(await fs.stat(path.join(directory,original)));
    await fs.writeFile(path.join(directory,'restore-state.json'),'damaged recovery record');await restoreBackup({filename,id:snapshot.id,confirmedId:snapshot.id,lease,replaceDamaged:true});
    const next=JSON.parse(await fs.readFile(path.join(directory,'restore-state.json'),'utf8'));assert.equal(await fs.readFile(path.join(directory,next.previousFile),'utf8'),'damaged recovery record');
    const reopened=await SchoolStore.open(filename);stores.push(reopened);assert.equal(reopened.users(admin).total,3);
});
test('failure publishing a staged restore rolls the original database back and records that outcome',async t=>{
    const {store,backups,admin,filename,directory,leases,stores,account}=await fixture(t),snapshot=await backups.create(admin);await account('student','newer-student');store.close();const lease=await acquireMaintenanceLock(directory);leases.push(lease);
    const rename=fs.rename;fs.rename=async(from,to)=>{if(path.basename(from).startsWith('restore-staged-')&&to===filename)throw new Error('Simulated restore publication failure');return rename(from,to);};
    try{await assert.rejects(restoreBackup({filename,id:snapshot.id,confirmedId:snapshot.id,lease}),/publication failure/);}finally{fs.rename=rename;}
    const record=JSON.parse(await fs.readFile(path.join(directory,'restore-state.json'),'utf8'));assert.equal(record.status,'rolled-back');
    const reopened=await SchoolStore.open(filename);stores.push(reopened);assert.equal(reopened.users(admin).total,4);assert.equal((await backups.verify(record.safetyBackupId)).summary.accounts,4);
});
