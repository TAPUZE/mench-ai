import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {extractFile,listPackage} from '@electron/asar';
import {NtExecutable,NtExecutableResource,Resource,Data} from 'resedit';

// CLI-only verification: never launches Electron, the installer, or a window.
const execFile=promisify(execFileCallback),root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const candidate=path.resolve(process.argv[2]||'.local/windows-community-candidate/win-unpacked'),resources=path.join(candidate,'resources'),archive=path.join(resources,'app.asar');
const sha=value=>createHash('sha256').update(value).digest('hex');
const checks=[];
function verify(condition,label){if(!condition)throw new Error('Package verification failed: '+label);checks.push(label);}
const sourcePackage=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const packagedPackage=JSON.parse(extractFile(archive,'package.json'));
verify(packagedPackage.version===sourcePackage.version,'Packaged application version matches the current release');
const executable=NtExecutable.from(await fs.readFile(path.join(candidate,'Mench AI.exe')),{ignoreCert:true});
const executableResources=NtExecutableResource.from(executable);
const versions=Resource.VersionInfo.fromEntries(executableResources.entries);
const strings=versions.flatMap(version=>version.getAllLanguagesForStringValues().map(language=>version.getStringValues(language)));
verify(strings.some(value=>value.ProductName==='Mench AI'&&value.FileDescription==='Mench AI'&&value.FileVersion===sourcePackage.version&&value.ProductVersion===sourcePackage.version+'.0'),'Windows executable has the current product and version resources');
const icon=await fs.readFile(path.join(root,'desktop','assets','mench.ico'));
verify(sha(extractFile(archive,path.join('desktop','assets','mench.ico')))===sha(icon)&&sha(extractFile(archive,path.join('desktop','assets','mench.svg')))===sha(await fs.readFile(path.join(root,'desktop','assets','mench.svg'))),'Current editable mark and Windows icon packaged');
const expectedIcons=Data.IconFile.from(icon).icons.map(item=>sha(Buffer.from(item.data.generate())));
const embeddedIcons=Resource.IconGroupEntry.fromEntries(executableResources.entries).flatMap(group=>group.getIconItemsFromEntries(executableResources.entries)).map(item=>sha(Buffer.from(item.generate())));
verify(expectedIcons.length===9&&expectedIcons.every(value=>embeddedIcons.includes(value)),'All nine Windows icon resolutions are embedded in the executable');
const manifests=executableResources.entries.filter(entry=>entry.type===24).map(entry=>Buffer.from(entry.bin).toString('utf8'));
verify(manifests.some(value=>/requestedExecutionLevel[^>]+level=["']asInvoker["']/.test(value)),'Windows application runs with the signed-in user permissions');
const installer=path.join(path.dirname(candidate),'Mench AI-Setup-'+sourcePackage.version+'-x64.exe');
const installerBytes=await fs.readFile(installer),installerResources=NtExecutableResource.from(NtExecutable.from(installerBytes,{ignoreCert:true}));
const installerVersions=Resource.VersionInfo.fromEntries(installerResources.entries).flatMap(version=>version.getAllLanguagesForStringValues().map(language=>version.getStringValues(language)));
verify(installerVersions.some(value=>value.ProductName==='Mench AI'&&value.FileDescription===sourcePackage.description&&value.ProductVersion===sourcePackage.version),'Windows installer identifies the current application and version');
const installerIcons=Resource.IconGroupEntry.fromEntries(installerResources.entries).flatMap(group=>group.getIconItemsFromEntries(installerResources.entries)).map(item=>sha(Buffer.from(item.generate())));
verify(expectedIcons.every(value=>installerIcons.includes(value)),'Windows installer embeds the Mench icon at every supplied resolution');
const entries=listPackage(archive);
verify(!entries.some(entry=>/^[\\/](?:desktop|school)[\\/].*\.test\.(?:mjs|js)$/.test(entry)),'Application test files excluded from archive');
const desktopSources=(await fs.readdir(path.join(root,'desktop'))).filter(name=>/\.(?:mjs|cjs)$/.test(name)&&!name.endsWith('.test.mjs')).map(name=>'desktop/'+name);
const sharedSources=(await fs.readdir(path.join(root,'shared'))).filter(name=>name.endsWith('.mjs')).map(name=>'shared/'+name);
for(const relative of [...desktopSources,...sharedSources,'school/provider.mjs','school/validation.mjs']){
    verify(sha(extractFile(archive,relative))===sha(await fs.readFile(path.join(root,relative))),'Current source packaged: '+relative);
}
const built=await fs.readdir(path.join(root,'dist'),{recursive:true});
for(const relative of built){
    const source=path.join(root,'dist',relative);if(!(await fs.stat(source)).isFile())continue;
    if(sha(extractFile(archive,path.join('dist',relative)))!==sha(await fs.readFile(source)))throw new Error('A frontend asset is missing or stale in the package: '+relative);
}
checks.push('All current production frontend assets packaged');
for(const relative of (await fs.readdir(path.join(root,'school'))).filter(name=>name.endsWith('.mjs')&&!name.endsWith('.test.mjs'))){
    verify(sha(await fs.readFile(path.join(resources,'school',relative)))===sha(await fs.readFile(path.join(root,'school',relative))),'Current standalone school module: '+relative);
}
verify(!(await fs.readdir(path.join(resources,'school'))).some(name=>name.endsWith('.test.mjs')),'School tests excluded from distributed resources');
for(const relative of sharedSources)verify(sha(await fs.readFile(path.join(resources,relative)))===sha(await fs.readFile(path.join(root,relative))),'Current standalone shared module: '+relative);
const metadata=JSON.parse(await fs.readFile(path.join(resources,'runtime','verified.json'),'utf8'));
const nodePath=path.join(resources,'runtime','node.exe'),npmPath=path.join(resources,'npm','bin','npm-cli.js');
verify(sha(await fs.readFile(nodePath))===metadata.sha256,'Bundled Node binary checksum');
const nodeVersion=await execFile(nodePath,['--version'],{windowsHide:true});
verify(nodeVersion.stdout.trim()===JSON.parse(await fs.readFile(path.join(root,'tools','runtime-lock.json'),'utf8')).version,'Bundled Node version');
const npmVersion=await execFile(nodePath,[npmPath,'--version'],{windowsHide:true});
verify(npmVersion.stdout.trim()==='11.19.1','Prepared npm runs with bundled Node');
const provenance=JSON.parse(await fs.readFile(path.join(resources,'npm','mench-provenance.json'),'utf8'));
for(const [name,version] of Object.entries(provenance.patchedDependencies))verify(JSON.parse(await fs.readFile(path.join(resources,'npm','node_modules',name,'package.json'),'utf8')).version===version,'Packaged npm security patch: '+name);
await fs.access(path.join(resources,'app.asar.unpacked','desktop','pty-host.mjs'));
await fs.access(path.join(resources,'app.asar.unpacked','node_modules','node-pty','package.json'));
checks.push('Terminal helper and native dependency unpacked');

const temporaryRoot=path.join(root,'.local');await fs.mkdir(temporaryRoot,{recursive:true});
const temporary=await fs.mkdtemp(path.join(temporaryRoot,'package-check-'));
if(path.dirname(temporary)!==temporaryRoot)throw new Error('Invalid package-test cleanup directory.');
try{
const env={...process.env,MENCH_SCHOOL_DATA:temporary,MENCH_SCHOOL_PORT:'0',MENCH_SCHOOL_HOST:'127.0.0.1',MENCH_SETUP_TOKEN:'package-smoke-setup-token',GEMINI_API_KEY:'',MENCH_AI_MODEL:'gemini-3.8-flash'};
delete env.ELECTRON_RUN_AS_NODE;
const project=path.join(temporary,'npm-project');await fs.mkdir(path.join(project,'dependency'),{recursive:true});
await fs.writeFile(path.join(project,'package.json'),JSON.stringify({name:'mench-package-check',version:'1.0.0',dependencies:{'offline-fixture':'file:./dependency'},scripts:{build:'node -e "console.log(process.execPath)"'}}));
await fs.writeFile(path.join(project,'dependency','package.json'),JSON.stringify({name:'offline-fixture',version:'1.0.0'}));
const npmEnv={...env,PATH:path.dirname(nodePath)+path.delimiter+process.env.PATH,npm_config_cache:path.join(temporary,'npm-cache')};
await execFile(nodePath,[npmPath,'install','--offline','--ignore-scripts','--no-audit','--no-fund'],{cwd:project,env:npmEnv,windowsHide:true});
verify(JSON.parse(await fs.readFile(path.join(project,'node_modules','offline-fixture','package.json'),'utf8')).version==='1.0.0','Packaged npm installs a real offline project dependency');
const build=await execFile(nodePath,[npmPath,'run','build'],{cwd:project,env:npmEnv,windowsHide:true});
verify(build.stdout.includes(nodePath),'Packaged npm scripts execute the bundled Node');
const pty=spawn(nodePath,[path.join(resources,'app.asar.unpacked','desktop','pty-host.mjs')],{cwd:project,env:npmEnv,windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
let terminalOutput='',terminalError='';pty.stderr.on('data',chunk=>{terminalError+=chunk;});
const terminalExit=new Promise((resolve,reject)=>{pty.once('error',reject);pty.once('exit',resolve);});
const terminalTimeout=setTimeout(()=>pty.kill(),15000);
pty.on('message',message=>{
    if(message.kind==='ready')pty.send({kind:'input',data:"Write-Output ('MENCH_' + 'PACKAGED_PTY'); exit\r"});
    if(message.kind==='data')terminalOutput+=message.data;
    if(message.kind==='error')terminalError+=message.message;
});
pty.send({kind:'start',executable:path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),args:['-NoLogo','-NoProfile'],cols:100,rows:24});
try{verify(await terminalExit===0&&terminalOutput.includes('MENCH_PACKAGED_PTY')&&!terminalError,'Packaged PTY helper runs real PowerShell output and exits cleanly');}
finally{clearTimeout(terminalTimeout);}
const child=spawn(nodePath,[path.join(resources,'school','server.mjs')],{cwd:temporary,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='',stderr='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{stderr+=chunk;});
let exit,snapshotId;const exited=new Promise(resolve=>{child.on('exit',code=>{exit=code;resolve();});});
try{
    const port=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Packaged school service startup timed out. '+stderr)),15000);
        const onData=()=>{const match=output.match(/listening on 127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]));}};
        child.stdout.on('data',onData);child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',()=>{clearTimeout(timer);reject(new Error('Packaged service exited during startup: '+stderr));});onData();
    });
    const call=async(action,payload={},token)=>{
        const response=await fetch('http://127.0.0.1:'+port+'/v1/request',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({action,payload}),signal:AbortSignal.timeout(10000)});
        return {status:response.status,...await response.json()};
    };
    const status=await call('school.status');verify(status.ok&&status.value.setupRequired&&status.value.policy.status==='draft'&&!status.value.providerConfigured,'Packaged school service starts unapproved without a provider key');
    verify((await call('account.users')).status===401,'Packaged service rejects anonymous school data access');
    const setup=await call('school.bootstrap',{token:env.MENCH_SETUP_TOKEN,username:'package-admin',name:'Package smoke administrator',password:'package-smoke-test-password'});verify(setup.ok,'Packaged first-administrator setup');
    const signed=await call('account.login',{username:'package-admin',password:'package-smoke-test-password'});verify(signed.ok&&signed.value.user.role==='admin','Packaged school login');
    const ai=await call('ai.ask',{messages:[{role:'user',content:'Teach a loop'}]},signed.value.token);verify(ai.status===403&&ai.error.code==='POLICY_AWAITING_APPROVAL','Packaged school AI fails closed pending approval');
    const invite=await call('account.invite',{name:'Packaged recovery student',role:'student'},signed.value.token);const student=await call('account.register',{username:'package-student',token:invite.value.token,password:'package-student-password'});verify(student.ok,'Packaged school invitation creates a student account');
    const snapshot=await call('backup.create',{},signed.value.token);verify(snapshot.ok&&snapshot.value.summary.accounts===2,'Packaged school service creates a real online backup');snapshotId=snapshot.value.id;
    verify((await call('backup.verify',{id:snapshotId},signed.value.token)).value?.verified===true,'Packaged school backup passes checksum and database checks');
    const teacherInvite=await call('account.invite',{name:'Packaged teacher',role:'teacher'},signed.value.token),teacher=await call('account.register',{username:'package-teacher',token:teacherInvite.value.token,password:'package-teacher-password'});verify(teacher.ok,'Packaged teacher account registration');
    const templateIds=[],starter='PACKAGED_STARTER_BODY_'+ 'x'.repeat(40000);
    for(let index=0;index<32;index++){
        const draft=await call('template.create',{title:'Packaged starter '+index,files:[{path:'index.html',content:starter}]},signed.value.token);
        if(!draft.ok)throw new Error('Packaged template creation failed.');
        const approval=await call('template.approve',{id:draft.value.id,confirmed:true},signed.value.token);if(!approval.ok)throw new Error('Packaged template approval failed.');templateIds.push(draft.value.id);
    }
    const templatePage=await call('template.list',{},signed.value.token);verify(templatePage.ok&&templatePage.value.total===32&&templatePage.value.items.length===25&&!JSON.stringify(templatePage).includes('PACKAGED_STARTER_BODY_'),'Packaged template pages omit full starter bodies');
    const classroom=await call('class.create',{name:'Packaged coding class',teacherId:teacher.value.id},signed.value.token),enrolled=await call('class.enroll',{classId:classroom.value.id,studentId:student.value.id},signed.value.token);verify(classroom.ok&&enrolled.ok,'Packaged class creation and student enrollment');
    const teacherPage=await call('account.users',{roles:['teacher'],active:true},signed.value.token);verify(teacherPage.ok&&teacherPage.value.total===1&&teacherPage.value.items[0].id===teacher.value.id,'Packaged account pages honor role filters');
    const assignmentIds=[];for(let index=0;index<32;index++){
        const assignment=await call('assignment.create',{classId:classroom.value.id,templateId:templateIds[index],title:'Packaged lesson '+index,instructions:'Review this exact lesson.'},signed.value.token);if(!assignment.ok)throw new Error('Packaged assignment creation failed.');assignmentIds.push(assignment.value.id);
    }
    const reset=await call('account.recovery.issue',{id:student.value.id},signed.value.token);verify(reset.ok,'Packaged administrator issues a one-use password reset');
    const recovered=await call('account.recovery.complete',{username:'package-student',token:reset.value.token,password:'package-recovered-password'});verify(recovered.ok&&recovered.value.signedOut,'Packaged student password recovery completes');
    const studentLogin=await call('account.login',{username:'package-student',password:'package-recovered-password'});verify(studentLogin.ok&&studentLogin.value.user.role==='student','Packaged recovered password signs in with the original role');
    const assignmentPage=await call('assignment.list',{},studentLogin.value.token),assignmentNext=await call('assignment.list',{cursor:assignmentPage.value.nextCursor},studentLogin.value.token);verify(assignmentPage.value.total===32&&assignmentPage.value.items.length===25&&assignmentNext.value.items.length===7&&new Set([...assignmentPage.value.items,...assignmentNext.value.items].map(item=>item.id)).size===32&&!JSON.stringify(assignmentPage).includes('PACKAGED_STARTER_BODY_'),'Packaged student assignment pages are complete and bounded');
    const assignmentDetail=await call('assignment.get',{id:assignmentIds[0]},studentLogin.value.token);verify(assignmentDetail.ok&&assignmentDetail.value.templateFiles[0].content===starter&&assignmentDetail.value.instructions==='Review this exact lesson.','Packaged assignment details load the real starter on demand');
    const submitted=await call('assignment.submit',{assignmentId:assignmentIds[0],files:[{path:'index.html',content:'Packaged student work'}],note:'Please review this snapshot.'},studentLogin.value.token),reviewed=await call('assignment.review',{id:submitted.value.id,feedback:'Packaged review feedback'},signed.value.token),submissions=await call('assignment.submissions',{assignmentId:assignmentIds[0]},studentLogin.value.token);verify(reviewed.ok&&submissions.value.total===1&&submissions.value.items[0].feedback==='Packaged review feedback'&&!('files' in submissions.value.items[0]),'Packaged snapshot review appears in paginated student submission metadata');
    const roster=await call('class.students',{classId:classroom.value.id},signed.value.token);verify(roster.ok&&roster.value.total===1&&roster.value.items[0].id===student.value.id,'Packaged class roster loads through its authorized page endpoint');
    const teacherLogin=await call('account.login',{username:'package-teacher',password:'package-teacher-password'});
    const policyDraft=await call('policy.draft',{expectedVersion:1,approverId:teacher.value.id,rules:{instructions:'Isolated package source-library fixture, not actual school approval.',blockedTerms:[],teachingStyle:'analytical',sourceTradition:'Use only the fixture edition.'}},signed.value.token);
    const policyApproval=await call('policy.approve',{id:policyDraft.value.id,version:policyDraft.value.version,confirmed:true,notes:'Exact isolated fixture policy review.'},teacherLogin.value.token);verify(policyApproval.ok,'Packaged designated reviewer approves the exact fixture policy');
    const sourceDraft=await call('source.create',{title:'Packaged loop source',reference:'Fixture worksheet / 1',author:'Package fixture',edition:'Fixture edition',language:'English',body:'A loop repeats instructions until its condition changes.'},teacherLogin.value.token);
    const draftSearch=await call('source.search',{query:'loop'},studentLogin.value.token);verify(sourceDraft.ok&&draftSearch.ok&&draftSearch.value.length===0,'Packaged source drafts stay out of student lookup');
    const approvedSource=await call('source.approve',{id:sourceDraft.value.id,contentHash:sourceDraft.value.contentHash,confirmed:true,notes:'Exact fixture source and reference reviewed.'},teacherLogin.value.token),sourceSearch=await call('source.search',{query:'loop'},studentLogin.value.token);verify(approvedSource.ok&&sourceSearch.value[0].excerpt==='A loop repeats instructions until its condition changes.','Packaged FTS library returns exact approved passages');
    const chatOwner={ownerId:student.value.id,projectId:'package-shared-project'},chatSaved=await call('chat.save',{...chatOwner,expectedRevision:0,messages:[{id:'fixture-chat',role:'user',content:'Private packaged student conversation.'}]},studentLogin.value.token),chatRead=await call('chat.get',chatOwner,studentLogin.value.token),chatDenied=await call('chat.get',chatOwner,teacherLogin.value.token);verify(chatSaved.ok&&chatRead.value.messages[0].content==='Private packaged student conversation.'&&chatDenied.status===403,'Packaged conversation storage binds histories to the authenticated account');
    const history=await call('audit.list',{},signed.value.token),reviews=await call('policy.reviews',{},signed.value.token);verify(history.ok&&history.value.items.length<=25&&history.value.nextCursor&&reviews.ok&&Array.isArray(reviews.value.items),'Packaged audit and policy-review histories return bounded pages');
    const backupStatus=await call('backup.status',{},signed.value.token),backupPage=await call('backup.list',{},signed.value.token);verify(backupStatus.ok&&!('records' in backupStatus.value)&&backupPage.ok&&backupPage.value.total>=1&&backupPage.value.items.length<=25,'Packaged backup status omits the full catalog and authorized pages remain available');
    const changed=await call('account.password.change',{currentPassword:'package-recovered-password',password:'package-changed-password'},studentLogin.value.token);verify(changed.ok&&(await call('account.me',{},studentLogin.value.token)).status===401,'Packaged password change revokes the existing school session');
}finally{
    if(exit===undefined)child.kill();await exited;
}
const restored=await execFile(nodePath,[path.join(resources,'school','maintenance.mjs'),'restore','--data',temporary,'--id',snapshotId,'--confirm',snapshotId],{env,windowsHide:true});
const restoration=JSON.parse(restored.stdout);verify(restoration.restored&&restoration.sessionsRevoked&&restoration.policyStatus==='draft','Packaged offline restore keeps a safety backup and requires policy reapproval');
const inspected=await execFile(nodePath,[path.join(resources,'school','maintenance.mjs'),'verify','--data',temporary,'--id',restoration.safetyBackupId],{env,windowsHide:true});verify(JSON.parse(inspected.stdout).verified,'Packaged pre-restore safety backup is independently verifiable');
}finally{
    
    await fs.rm(temporary,{recursive:true,force:true});
}
const report={candidate,installer,installerSha256:sha(installerBytes),executableSha256:sha(await fs.readFile(path.join(candidate,'Mench AI.exe'))),verifiedAt:new Date().toISOString(),archiveSha256:sha(await fs.readFile(archive)),checks};
await fs.writeFile(path.join(path.dirname(candidate),'verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:checks.length,candidate,report:path.join(path.dirname(candidate),'verification.json')},null,2));
