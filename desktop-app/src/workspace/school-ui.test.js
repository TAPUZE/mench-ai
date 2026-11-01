import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {SchoolStore} from '../../school/store.mjs';
import {Gateway} from '../../school/gateway.mjs';

const browser=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost:3000'});
for(const name of ['window','document','HTMLElement','Element','localStorage','Event','FormData'])globalThis[name]=name==='window'?browser.window:name==='document'?browser.window.document:browser.window[name];
Object.defineProperty(globalThis,'navigator',{value:browser.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=await import('react'),{createRoot}=await import('react-dom/client');
let server, SchoolDialog, root, directory, store, gateway, admin, teacher, student, session, uploads, started;
const password='long-school-test-password',pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const buttons=()=>[...document.querySelectorAll('button')];
async function until(predicate){for(let attempt=0;attempt<150&&!predicate();attempt++)await React.act(async()=>await pause(20));assert.ok(predicate(),'The school UI did not reach the expected state.');}
async function click(label){
    const find=()=>buttons().find(item=>item.getAttribute('aria-label')===label||item.textContent.trim()===label);
    for(let attempt=0;attempt<30&&!find();attempt++)await React.act(async()=>await pause(20));
    const button=find();assert.ok(button,'Missing '+label);await React.act(async()=>{button.click();await pause(20);});await React.act(async()=>await pause(20));
}
async function input(element,value){await React.act(async()=>{const prototype=element.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:element.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,value);element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));await pause(5);});}
async function submit(form){
    await React.act(async()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await pause(5);});
    const running=()=>!!document.querySelector('[role="dialog"][aria-busy="true"], [role="dialog"] [aria-busy="true"]');
    for(let attempt=0;attempt<200&&running();attempt++)await React.act(async()=>await pause(20));
    assert.equal(running(),false,'The school form did not finish its operation.');
}
before(async()=>{server=await createServer({configFile:false,cacheDir:".local/test-vite/school-ui",server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});SchoolDialog=(await server.ssrLoadModule('/src/workspace/SchoolDialog.jsx')).default;});
after(async()=>{await server.close();browser.window.close();});
beforeEach(async()=>{
    directory=await fs.mkdtemp(path.join(os.tmpdir(),'mench-school-ui-'));store=await SchoolStore.open(path.join(directory,'school.sqlite'),{bootstrapToken:'setup'});
    admin=await store.bootstrap({token:'setup',name:'Administrator',username:'admin',password});
    async function account(role){const invite=store.invite(admin,{role,name:role});return store.register({token:invite.token,username:role,password});}
    teacher=await account('teacher');student=await account('student');gateway=new Gateway({store});
    session=(await store.login({username:'admin',password})).token;uploads=[];started=null;
    const envelope=fn=>async(...args)=>{try{return {ok:true,value:await fn(...args)};}catch(error){return {ok:false,error:{message:error.message,code:error.code}};}};
    window.menchDesktop={version:2,schoolStatus:envelope(async()=>({url:'https://school.example.org',connected:true,user:session?store.authenticate(session):null,policy:store.status().policy,providerConfigured:false})),schoolRequest:envelope(async({action,payload})=>{
        const value=await gateway.dispatch(action,payload,session);
        if(action==='account.logout'||value?.signedOut)session=null;
        if(action==='account.login')session=value.token;
        return value;
    })};
    root=createRoot(document.getElementById('root'));
});
afterEach(async()=>{await React.act(async()=>root.unmount());delete window.menchDesktop;store.close();await fs.rm(directory,{recursive:true,force:true});});
async function renderAs(role){
    session=(await store.login({username:role,password})).token;
    await React.act(async()=>{root.render(React.createElement(SchoolDialog,{onClose:()=>{},onChanged:async()=>{},projectFiles:[{path:'index.html'},{path:'src/main.js'}],collectFiles:async paths=>{uploads.push(paths);return paths.map(path=>({path,content:'Submitted '+path}));},onStartTemplate:value=>{started=value;}}));await pause(40);});
}
async function classroom(){
    const classroom=store.createClass(teacher,{name:'Coding class'});store.enroll(teacher,{classId:classroom.id,username:student.username});
    const template=store.createTemplate(teacher,{title:'Starter',files:[{path:'index.html',content:'<h1>Starter</h1>'},{path:'src/main.js',content:'console.log(1)'}]});store.approveTemplate(admin,{id:template.id,confirmed:true});
    return store.createAssignment(teacher,{classId:classroom.id,templateId:template.id,title:'Loops lesson',instructions:'Count from one to ten.'});
}

test('designated source reviewer creates a draft, reviews the actual revision and approves searchable passages',async()=>{
    const policy=store.draftPolicy(admin,{expectedVersion:1,approverId:teacher.id,rules:{instructions:'Use reviewed school source passages only.',blockedTerms:[]}});
    store.approvePolicy(teacher,{id:policy.id,version:policy.version,confirmed:true,notes:'Reviewed exact source-library fixture policy.'});
    await renderAs('teacher');await click('Sources');
    const details=[...document.querySelectorAll('details')].find(item=>item.querySelector('summary')?.textContent==='Submit source draft');assert.ok(details);await React.act(async()=>{details.open=true;});
    const values={title:'Reviewed loop worksheet',reference:'Lesson 1 / paragraph 2',author:'Fixture teacher',edition:'Revision one',body:'A loop repeats instructions until a stopping condition is met.'};
    for(const [name,value] of Object.entries(values))await input(document.querySelector('[name="'+name+'"]'),value);
    await submit(document.querySelector('textarea[name="body"]').closest('form'));
    await until(()=>document.querySelector('[aria-label="Source revision review"]'));assert.equal(store.knowledge.search(student,{query:'loop'}).length,0);
    const review=document.querySelector('[aria-label="Source revision review"]');assert.match(review.textContent,/A loop repeats instructions/);
    await React.act(async()=>review.querySelector('input[name="confirmed"]').click());await input(review.querySelector('textarea[name="notes"]'),'Reviewed exact passage, reference, and edition for this fixture.');
    await submit(review.querySelector('form'));await until(()=>document.body.textContent.includes('Approved for current policy'));
    assert.equal(store.knowledge.search(student,{query:'loop'})[0].excerpt,values.body);
});

test('student library displays approved exact passages and never exposes draft records',async()=>{
    const policy=store.draftPolicy(admin,{expectedVersion:1,approverId:teacher.id,rules:{instructions:'Use reviewed school passages only.',blockedTerms:[]}});
    store.approvePolicy(teacher,{id:policy.id,version:policy.version,confirmed:true,notes:'Reviewed exact library fixture policy.'});
    const values={title:'Approved geometry',reference:'Geometry worksheet / 1',author:'Fixture teacher',edition:'Fixture edition',language:'English',body:'A triangle has three sides.'};
    const source=store.knowledge.create(teacher,values);store.knowledge.approve(teacher,{id:source.id,contentHash:source.contentHash,confirmed:true,notes:'Reviewed fixture geometry passage.'});store.knowledge.create(teacher,{...values,title:'Private unapproved draft'});
    await renderAs('student');await click('Sources');await until(()=>document.body.textContent.includes(values.title));assert.ok(!document.body.textContent.includes('Private unapproved draft'));assert.ok(!document.querySelector('textarea[name="body"]'));
    await input(document.querySelector('input[name="query"]'),'triangle');await submit(document.querySelector('input[name="query"]').closest('form'));await until(()=>document.body.textContent.includes(values.body));
});
test('policy UI shows pending approval, exact review text, and records approval only for the nominee',async()=>{
    const draft=store.draftPolicy(admin,{expectedVersion:1,approverId:teacher.id,rules:{instructions:'Exact school policy for this test.',blockedTerms:['restricted topic']}});
    await renderAs('teacher');assert.match(document.body.textContent,/awaiting policy approval/);await click('Policy');
    assert.equal(buttons().some(button=>button.textContent==='Accounts'),false);
    assert.match(document.body.textContent,/Exact school policy/);
    const form=document.querySelector('textarea[name="notes"]').closest('form');await input(form.querySelector('textarea'),'Reviewed the exact displayed school policy.');
    await React.act(async()=>form.querySelector('input[type="checkbox"]').click());await submit(form);
    assert.equal(store.policy().id,draft.id);assert.equal(store.policy().status,'approved');assert.equal(store.policy().approverId,teacher.id);
    assert.match(document.body.textContent,/Policy version 2 approved/);
});
test('student UI submits only explicitly chosen files and starts a separate project from the approved template',async()=>{
    const assignment=await classroom();await renderAs('student');await click('Open assignment');assert.match(document.body.textContent,/Loops lesson/);
    assert.equal(buttons().some(button=>button.textContent==='Accounts'),false);assert.equal(buttons().find(button=>button.textContent==='Submit selected files').disabled,true);
    assert.equal([...document.querySelectorAll('.mw-school-files input')].some(input=>input.checked),false);
    await React.act(async()=>document.querySelector('.mw-school-files input').click());
    const form=document.querySelector('.mw-school-files').closest('form');await input(form.querySelector('textarea'),'Please review my loop.');await submit(form);
    assert.deepEqual(uploads,[['index.html']]);const submissions=store.submissions(student,{assignmentId:assignment.id}).items;assert.equal(submissions.length,1);
    assert.deepEqual(store.submission(student,submissions[0].id).files,[{path:'index.html',content:'Submitted index.html'}]);
    await click('Start project from template');assert.equal(started.files.length,2);assert.equal(started.title,'Loops lesson');
});
test('teacher UI reviews actual submitted snapshots and saves feedback visible to the student',async()=>{
    const assignment=await classroom();const submitted=store.submit(student,{assignmentId:assignment.id,files:[{path:'index.html',content:'<h1>My real snapshot</h1>'}],note:'My explanation.'});
    await renderAs('teacher');await click('Open assignment');await click('Review submitted files');assert.match(document.body.textContent,/My real snapshot/);
    const form=document.querySelector('textarea[name="feedback"]').closest('form');await input(form.querySelector('textarea'),'Good work. Explain the stopping condition.');await submit(form);
    assert.equal(store.submission(student,submitted.id).feedback,'Good work. Explain the stopping condition.');assert.match(document.body.textContent,/1 reviewed/);
});
test('administrator UI issues a reset token and the invited user can complete recovery without changing role or work',async()=>{
    await classroom();await renderAs('admin');await click('Accounts');await click('Create password reset token for student');
    const token=document.querySelector('.mw-school-token').textContent;assert.ok(token.length>30);await click('Sign out');await click('Reset password');
    const form=document.querySelector('input[name="token"]').closest('form');await input(form.querySelector('[name="username"]'),'student');await input(form.querySelector('[name="token"]'),token);await input(form.querySelector('[name="password"]'),'new-school-student-password');await input(form.querySelector('[name="confirmPassword"]'),'different-student-password');await submit(form);assert.match(document.querySelector('[role="alert"]').textContent,/do not match/);
    await input(form.querySelector('[name="confirmPassword"]'),'new-school-student-password');await submit(form);assert.match(document.body.textContent,/Password reset. Sign in/);
    const signed=await store.login({username:'student',password:'new-school-student-password'});assert.equal(signed.user.role,'student');assert.equal(store.assignments(signed.user).total,1);
});
test('signed-in users can change passwords and the interface returns to sign-in',async()=>{
    await renderAs('teacher');const oldSession=session;await click('Change password');const form=document.querySelector('input[name="currentPassword"]').closest('form');
    await input(form.querySelector('[name="currentPassword"]'),password);await input(form.querySelector('[name="password"]'),'changed-teacher-password');await input(form.querySelector('[name="confirmPassword"]'),'changed-teacher-password');await submit(form);
    assert.match(document.body.textContent,/Password changed. Sign in again/);assert.throws(()=>store.authenticate(oldSession),/expired/);assert.equal((await store.login({username:'teacher',password:'changed-teacher-password'})).user.role,'teacher');
});

test('signing out from Change password returns to the ordinary sign-in form and the next account starts at assignments',async()=>{
    await renderAs('admin');await click('Accounts');await click('Change password');assert.ok(document.querySelector('input[name="currentPassword"]'));await click('Sign out');
    assert.equal(document.querySelector('input[name="token"]'),null);assert.equal(document.querySelector('input[name="confirmPassword"]'),null);
    const form=document.querySelector('input[name="username"]').closest('form');await input(form.querySelector('[name="username"]'),'student');await input(form.querySelector('[name="password"]'),password);await submit(form);
    assert.equal(document.querySelector('.mw-school-tabs button.active').textContent,'Assignments');assert.equal(buttons().some(button=>button.textContent==='Accounts'),false);
});
test('administrator Data section creates and verifies a real school snapshot',async()=>{
    await classroom();await renderAs('admin');await click('Data');assert.match(document.body.textContent,/No school backups yet/);await click('Create school backup');await click('Verify backup');
    assert.match(document.body.textContent,/Checksum and database integrity verified/);const records=await gateway.backups.list();assert.equal(records.length,1);assert.equal(records[0].summary.assignments,1);assert.equal((await gateway.backups.verify(records[0].id)).verified,true);
});
test('an unreadable local credential connection offers recovery and returns to connection setup',async()=>{
    let locked=true,cleared=false;const bridge=window.menchDesktop;
    window.menchDesktop={...bridge,schoolStatus:async()=>locked?{ok:false,error:{message:'Stored credentials could not be unlocked.'}}:{ok:true,value:{url:null,user:null,apiKeyConfigured:false}},resetCredentials:async input=>{assert.equal(input.confirmed,true);locked=false;cleared=true;return {ok:true,value:{url:null,user:null}};}};
    await React.act(async()=>{root.render(React.createElement(SchoolDialog,{onClose:()=>{},onChanged:async()=>{}}));await pause(25);});assert.match(document.body.textContent,/saved connection needs attention/);await click('Clear saved credentials');assert.equal(cleared,true);assert.match(document.body.textContent,/Connect school/);assert.equal(document.querySelector('[role="alert"]'),null);
});

test('template pages search and navigate without downloading file bodies until explicitly opened',async()=>{
    for(let index=0;index<31;index++){const draft=store.createTemplate(teacher,{title:'Template '+String(index).padStart(2,'0'),files:[{path:'index.html',content:'Template body '+index}]});store.approveTemplate(admin,{id:draft.id,confirmed:true});}
    const calls=[],bridge=window.menchDesktop;window.menchDesktop={...bridge,schoolRequest:async input=>{calls.push(input);return bridge.schoolRequest(input);}};
    await renderAs('student');assert.equal(calls.some(item=>item.action==='template.get'),false);await click('Templates');await until(()=>document.querySelectorAll('.mw-school-card h3').length===25);
    assert.equal(document.body.textContent.includes('Template body'),false);assert.equal(calls.some(item=>item.action==='template.get'),false);
    await click('Next templates');await until(()=>document.querySelectorAll('.mw-school-card h3').length===6);await click('Previous templates');await until(()=>document.querySelectorAll('.mw-school-card h3').length===25);
    await input(document.querySelector('section[aria-label="templates"] input[type="search"]'),'Template 00');await until(()=>document.querySelectorAll('.mw-school-card h3').length===1);await click('View template files');assert.match(document.body.textContent,/Template body 0/);assert.equal(calls.filter(item=>item.action==='template.get').length,1);
    await click('Start new project');assert.equal(started.title,'Template 00');assert.equal(started.files[0].content,'Template body 0');
});

test('administrator teacher picker finds older accounts and keeps the chosen teacher when its search changes',async()=>{
    const hash=store.db.prepare('SELECT password FROM users WHERE id=?').get(teacher.id).password;
    for(let index=0;index<31;index++)store.db.prepare('INSERT INTO users(id,name,username,role,password,created_at) VALUES(?,?,?,?,?,?)').run('staff-'+index,'Staff '+String(index).padStart(2,'0'),'staff-'+index,'teacher',hash,new Date().toISOString());
    await renderAs('admin');await click('Classes');const select=()=>document.querySelector('select[name="teacherId"]');await until(()=>select()?.options.length===26);assert.equal([...select().options].some(item=>item.value===teacher.id),false);
    const search=document.querySelector('.mw-school-picker input[type="search"]');await input(search,'teacher');await until(()=>[...select().options].some(item=>item.value===teacher.id));await input(select(),teacher.id);
    await input(search,'Staff');await until(()=>document.querySelector('.mw-school-picker [role="status"]')===null);assert.equal(select().value,teacher.id);
    const form=document.querySelector('input[name="name"]').closest('form');await input(form.querySelector('input[name="name"]'),'Selected teacher class');await submit(form);const created=store.classes(admin,{search:'Selected teacher class'});assert.equal(created.total,1);assert.equal(created.items[0].teacher_id,teacher.id);
});

test('a late search response cannot replace newer template search results',async()=>{
    for(const title of ['Slow starter','Fast starter']){const draft=store.createTemplate(teacher,{title,files:[{path:'index.html',content:title}]});store.approveTemplate(admin,{id:draft.id,confirmed:true});}
    const bridge=window.menchDesktop;let release,slowStarted=false;const pending=new Promise(resolve=>{release=resolve;});
    window.menchDesktop={...bridge,schoolRequest:async input=>{if(input.action==='template.list'&&input.payload.search==='slow'){slowStarted=true;await pending;}return bridge.schoolRequest(input);}};
    await renderAs('student');await click('Templates');const search=()=>document.querySelector('section[aria-label="templates"] input[type="search"]');
    try{await input(search(),'slow');await until(()=>slowStarted);await input(search(),'fast');await until(()=>document.querySelector('.mw-school-card h3')?.textContent.includes('Fast starter'));release();await React.act(async()=>await pause(50));assert.equal(document.querySelectorAll('.mw-school-card h3').length,1);assert.match(document.querySelector('.mw-school-card h3').textContent,/Fast starter/);}finally{release();}
});

test('template approval requires opening the actual files and explicit review before students can load them',async()=>{
    const draft=store.createTemplate(teacher,{title:'Draft for review',files:[{path:'index.html',content:'Exact starter to review'}]});await renderAs('admin');await click('Templates');await until(()=>document.querySelector('.mw-school-card h3'));
    assert.equal(buttons().some(button=>button.textContent==='Approve template'),false);assert.equal(store.templates(student).total,0);await click('View template files');assert.match(document.body.textContent,/Exact starter to review/);
    const form=buttons().find(button=>button.textContent==='Approve template').closest('form');await React.act(async()=>form.querySelector('input[type="checkbox"]').click());await submit(form);assert.deepEqual(store.template(student,draft.id).files,[{path:'index.html',content:'Exact starter to review'}]);
});

test('administrator review, audit and backup views can navigate older server pages',async()=>{
    for(let index=0;index<35;index++)store.recordBlock(student,store.policy(),index<12?'output':'input','private test body '+index,'Fixture restriction');
    const base=await gateway.backups.create(admin);for(let index=0;index<30;index++){
        const id=crypto.randomUUID();await fs.writeFile(gateway.backups.file(id,'.json'),JSON.stringify({...base,id}));await fs.link(gateway.backups.file(base.id,'.sqlite'),gateway.backups.file(id,'.sqlite'));
    }
    await renderAs('admin');await click('Reviews');await until(()=>document.querySelectorAll('.mw-school-card').length===25);await click('Next policy reviews');await until(()=>document.querySelectorAll('.mw-school-card').length===10);
    await input(document.querySelector('[aria-label="policy reviews"] input[type="search"]'),'output');await until(()=>document.querySelectorAll('.mw-school-card').length===12);assert.equal(document.querySelector('[role="alert"]'),null);
    await click('Audit');await click('Next audit events');assert.equal(buttons().find(button=>button.textContent==='Previous audit events').disabled,false);
    await click('Data');await until(()=>document.querySelectorAll('.mw-school-card').length===25);await click('Next backups');await until(()=>document.querySelectorAll('.mw-school-card').length===6);await click('Verify backup');assert.match(document.body.textContent,/Checksum and database integrity verified/);
});
