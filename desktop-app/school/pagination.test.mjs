import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {SchoolStore} from './store.mjs';
import {createSchoolServer} from './gateway.mjs';
import {SchoolClient} from '../desktop/school-client.mjs';
import {BackupManager} from './backups.mjs';

async function fixture(t){
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mench-school-pages-')),store=await SchoolStore.open(path.join(directory,'school.sqlite'),{bootstrapToken:'test-setup'});let runtime;
    t.after(async()=>{if(runtime)await runtime.close();else store.close();if(path.dirname(directory)!==os.tmpdir())throw new Error('Invalid school page fixture cleanup.');await fs.rm(directory,{recursive:true,force:true});});
    const password='pagination-test-password',admin=await store.bootstrap({token:'test-setup',username:'admin',name:'Administrator',password});
    const account=async(role,username)=>{const invite=store.invite(admin,{role,name:username});return store.register({token:invite.token,username,password});};
    const teacher=await account('teacher','teacher'),student=await account('student','student'),outsider=await account('teacher','outsider'),peer=await account('student','peer');
    const classroom=store.createClass(teacher,{name:'Coding class'});store.enroll(teacher,{classId:classroom.id,studentId:student.id});store.enroll(teacher,{classId:classroom.id,studentId:peer.id});
    const files=[{path:'index.html',content:'TEMPLATE_BODY_'+ 'x'.repeat(79000)}],templates=[],assignments=[];
    store.transaction(()=>{
        for(let index=0;index<61;index++){
            const template=store.createTemplate(teacher,{title:'Starter '+String(index).padStart(3,'0'),files});store.approveTemplate(admin,{id:template.id,confirmed:true});templates.push(template);
            assignments.push(store.createAssignment(teacher,{classId:classroom.id,templateId:template.id,title:'Lesson '+String(index).padStart(3,'0'),instructions:'Private detailed instructions '+index}));
        }
    });
    const draft=store.createTemplate(teacher,{title:'Unapproved draft',files});
    const assignment=assignments[0];store.transaction(()=>{
        for(let index=0;index<242;index++){
            const submitted=store.submit(index<240?student:peer,{assignmentId:assignment.id,files:[{path:'index.html',content:'Student work '+index}],note:'n'.repeat(2000)});
            if(index%2===0)store.reviewSubmission(teacher,{id:submitted.id,feedback:'"\\'.repeat(4000)});
        }
    });
    const hash=store.db.prepare('SELECT password FROM users WHERE id=?').get(student.id).password;
    store.transaction(()=>{for(let index=0;index<120;index++)store.db.prepare('INSERT INTO users(id,name,username,role,password,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),'Synthetic student '+index,'synthetic-'+index,'student',hash,new Date().toISOString());});
    async function serve(){runtime=await createSchoolServer({store});await new Promise(resolve=>runtime.server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+runtime.server.address().port;}
    async function client(actor,url){const signed=await store.login({username:actor.username,password});let saved={gatewayUrl:url,schoolSession:{url,token:signed.token}};return new SchoolClient({vault:{read:async()=>saved,update:async change=>(saved=await change(saved))}});}
    return {store,admin,teacher,student,peer,outsider,classroom,files,templates,assignments,draft,assignment,serve,client};
}

test('large school collections stay below the real desktop response limit and fetch full files only on request',async t=>{
    const f=await fixture(t),url=await f.serve(),client=await f.client(f.teacher,url),request=(action,payload)=>client.request({action,payload});
    const templates=await request('template.list',{limit:50});assert.equal(templates.total,62);assert.equal(templates.items.length,50);assert.ok(templates.nextCursor);assert.ok(Buffer.byteLength(JSON.stringify(templates))<30000);assert.equal(JSON.stringify(templates).includes('TEMPLATE_BODY_'),false);
    const assignments=await request('assignment.list',{limit:50});assert.equal(assignments.total,61);assert.equal(assignments.items.length,50);assert.ok(Buffer.byteLength(JSON.stringify(assignments))<50000);assert.equal(JSON.stringify(assignments).includes('Private detailed'),false);assert.equal('templateFiles' in assignments.items[0],false);assert.equal('submissions' in assignments.items[0],false);
    const submissions=await request('assignment.submissions',{assignmentId:f.assignment.id,limit:50});assert.equal(submissions.total,242);assert.equal(submissions.items.length,50);assert.ok(Buffer.byteLength(JSON.stringify(submissions))<65000);assert.equal('files' in submissions.items[0],false);
    const template=await request('template.get',{id:f.templates[0].id});assert.deepEqual(template.files,f.files);
    const assignment=await request('assignment.get',{id:f.assignment.id});assert.deepEqual(assignment.templateFiles,f.files);assert.equal(assignment.instructions,'Private detailed instructions 0');
    const student=await f.client(f.student,url),own=await student.request({action:'assignment.list'});const selected=await student.request({action:'assignment.list',payload:{search:'Lesson 000'}});assert.equal(selected.items[0].submissionCount,240);assert.equal(selected.items[0].reviewedCount,120);assert.equal(own.total,61);
});

test('keyset pages are complete without duplicates when a newer assignment arrives between pages',async t=>{
    const f=await fixture(t),first=f.store.assignments(f.teacher,{limit:17}),seen=[...first.items.map(item=>item.id)];let cursor=first.nextCursor;
    f.store.createAssignment(f.teacher,{classId:f.classroom.id,templateId:f.templates[0].id,title:'Newer lesson',instructions:'Published during paging'});
    while(cursor){const next=f.store.assignments(f.teacher,{limit:17,cursor});seen.push(...next.items.map(item=>item.id));cursor=next.nextCursor;}
    assert.equal(seen.length,61);assert.equal(new Set(seen).size,61);assert.deepEqual(new Set(seen),new Set(f.assignments.map(item=>item.id)));assert.equal(f.store.assignments(f.teacher).total,62);
    const search=f.store.assignments(f.teacher,{search:'Lesson 000'});assert.equal(search.total,1);assert.equal(search.items[0].id,f.assignment.id);
});

test('cursors, filters and detail endpoints cannot cross teacher ownership or student isolation',async t=>{
    const f=await fixture(t),url=await f.serve(),student=await f.client(f.student,url),outsider=await f.client(f.outsider,url);
    assert.equal((await outsider.request({action:'assignment.list'})).total,0);
    for(const [action,payload] of [['assignment.get',{id:f.assignment.id}],['assignment.submissions',{assignmentId:f.assignment.id}],['class.students',{classId:f.classroom.id}]])await assert.rejects(outsider.request({action,payload}),error=>['NOT_FOUND','FORBIDDEN'].includes(error.code));
    await assert.rejects(student.request({action:'account.users'}),error=>error.code==='FORBIDDEN');await assert.rejects(student.request({action:'class.students',payload:{classId:f.classroom.id}}),error=>error.code==='FORBIDDEN');await assert.rejects(student.request({action:'template.get',payload:{id:f.draft.id}}),error=>error.code==='NOT_FOUND');
    const own=await student.request({action:'assignment.submissions',payload:{assignmentId:f.assignment.id,limit:50}});assert.equal(own.total,240);assert.equal(own.items.every(item=>item.student_id===f.student.id),true);
    const peer=f.store.submissions(f.peer,{assignmentId:f.assignment.id});await assert.rejects(student.request({action:'assignment.submission',payload:{id:peer.items[0].id}}),error=>error.code==='FORBIDDEN');
    const cursor=f.store.assignments(f.teacher,{limit:1}).nextCursor;assert.throws(()=>f.store.assignments(f.student,{cursor}),/cursor/);assert.throws(()=>f.store.assignments(f.teacher,{cursor,search:'Lesson'}),/cursor/);assert.throws(()=>f.store.templates(f.teacher,{cursor}),/cursor/);
    for(const limit of [0,51,1.5,'25'])assert.throws(()=>f.store.templates(f.teacher,{limit}),/page size/);
    assert.equal(f.store.templates(f.teacher,{search:"' OR 1=1 --"}).total,0);
    const accounts=f.store.users(f.admin,{roles:['teacher'],active:true});assert.equal(accounts.total,2);assert.equal(accounts.items.every(user=>user.role==='teacher'&&!('password' in user)),true);assert.equal(f.store.users(f.admin,{search:'synthetic-119'}).total,1);
    const teacher=await f.client(f.teacher,url);f.store.setActive(f.admin,{id:f.teacher.id,active:false});await assert.rejects(teacher.request({action:'assignment.get',payload:{id:f.assignment.id}}),error=>error.code==='UNAUTHENTICATED');
});

test('history pages retain older reviews and audit events while bounding worst-case JSON response bytes',async t=>{
    const f=await fixture(t);f.store.transaction(()=>{
        for(let index=0;index<350;index++){
            const id=f.store.recordBlock(f.student,f.store.policy(),'input','private-fixture-prompt-'+index,'Fixture input restriction');
            f.store.resolveReview(f.admin,{id,resolution:'\u0001'.repeat(4000)});
        }
        for(let index=0;index<80;index++)f.store.audit(f.admin,'fixture.largeAudit',String(index),{notes:'\u0001'.repeat(3000)});
    });
    const url=await f.serve(),admin=await f.client(f.admin,url),student=await f.client(f.student,url),teacher=await f.client(f.teacher,url);
    for(const [action,search,total] of [['policy.reviews','reviewed',350],['audit.list','fixture.largeaudit',80]]){
        const ids=[];let cursor=null;do{
            const page=await admin.request({action,payload:{search,limit:50,cursor}});assert.equal(page.total,total);assert.ok(page.items.length<50);assert.ok(Buffer.byteLength(JSON.stringify(page))<410000);assert.equal(JSON.stringify(page).includes('private-fixture-prompt'),false);
            ids.push(...page.items.map(item=>item.id));cursor=page.nextCursor;
        }while(cursor);
        assert.equal(ids.length,total);assert.equal(new Set(ids).size,total);
        for(const client of [student,teacher])await assert.rejects(client.request({action}),error=>error.code==='FORBIDDEN');
    }
    const first=f.store.reviews(f.admin,{limit:1});assert.throws(()=>f.store.auditLog(f.admin,{cursor:first.nextCursor}),/cursor/);assert.throws(()=>f.store.reviews(f.admin,{cursor:first.nextCursor,search:'pending'}),/cursor/);
});

test('backup status stays small and catalog pages are complete, scoped, searchable and resilient to damaged records',async t=>{
    const f=await fixture(t),manager=new BackupManager(f.store),base=await manager.create(f.admin);
    for(let index=0;index<60;index++){
        const id=randomUUID(),record={...base,id,purpose:index%2?'automatic':'manual'};await fs.writeFile(manager.file(id,'.json'),JSON.stringify(record));await fs.link(manager.file(base.id,'.sqlite'),manager.file(id,'.sqlite'));
    }
    await fs.writeFile(manager.file(base.id,'.json'),JSON.stringify({...base,unrecognized:'x'.repeat(10000)}));const damaged=randomUUID(),oversize=randomUUID();await fs.writeFile(manager.file(damaged,'.json'),'{broken catalog');await fs.writeFile(manager.file(oversize,'.json'),'x'.repeat(70000));
    const url=await f.serve(),admin=await f.client(f.admin,url),student=await f.client(f.student,url),status=await admin.request({action:'backup.status'});
    assert.equal(status.total,61);assert.equal('records' in status,false);assert.ok(Buffer.byteLength(JSON.stringify(status))<2000);assert.match(status.lastError,/unreadable backup catalog/);
    const ids=[];let cursor=null;do{const page=await admin.request({action:'backup.list',payload:{limit:17,cursor}});assert.equal(page.total,61);assert.ok(Buffer.byteLength(JSON.stringify(page))<20000);ids.push(...page.items.map(item=>item.id));cursor=page.nextCursor;}while(cursor);
    assert.equal(ids.length,61);assert.equal(new Set(ids).size,61);assert.equal((await manager.page({search:'automatic'})).total,30);
    const first=await manager.page({limit:1},f.admin.id);await assert.rejects(manager.page({cursor:first.nextCursor},'different-admin'),/cursor/);await assert.rejects(manager.page({cursor:first.nextCursor,search:'manual'},f.admin.id),/cursor/);
    await assert.rejects(student.request({action:'backup.list'}),error=>error.code==='FORBIDDEN');assert.equal((await manager.verify(base.id)).verified,true);await assert.rejects(manager.verify(damaged),error=>error.code==='BACKUP_INVALID');await assert.rejects(manager.verify(oversize),error=>error.code==='BACKUP_INVALID');assert.ok(await fs.stat(manager.file(damaged,'.json')));assert.ok(await fs.stat(manager.file(oversize,'.json')));
});
