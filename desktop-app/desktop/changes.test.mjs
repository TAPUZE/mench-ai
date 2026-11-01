import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WorkspaceService} from './workspaces.mjs';
import {ChangeService} from './changes.mjs';
import {GitService} from './git.mjs';
import {validateProposal,shareablePath} from '../shared/project-changes.mjs';

async function fixture(t){
    const temporaryRoot=os.tmpdir(),base=await fs.mkdtemp(path.join(temporaryRoot,'mench-changes-'));
    t.after(async()=>{if(path.dirname(base)!==temporaryRoot)throw new Error('Invalid fixture cleanup.');await fs.rm(base,{recursive:true,force:true});});
    const project=path.join(base,'project');await fs.mkdir(project);
    const workspaces=new WorkspaceService(path.join(base,'state'));await workspaces.initialize();const root=await workspaces.grant(project,{remember:true});
    return {base,project,workspaces,root,changes:new ChangeService(workspaces)};
}
const proposal=changes=>({format:'mench.changes.v1',summary:'Improve the lesson project.',changes});
test('reviewed multi-file changes apply only selected files and undo persists across a service restart',async t=>{
    const {project,workspaces,root,changes}=await fixture(t);
    await fs.writeFile(path.join(project,'index.html'),'<h1>Original</h1>');await fs.writeFile(path.join(project,'styles.css'),'body {}');
    const prepared=await changes.prepare(root.id,proposal([{path:'index.html',content:'<h1>Updated</h1>'},{path:'styles.css',content:'body {color:green}'},{path:'src/main.js',content:'console.log(1);'}]));
    assert.equal(prepared.changes[0].original,'<h1>Original</h1>');assert.equal(await fs.readFile(path.join(project,'index.html'),'utf8'),'<h1>Original</h1>');
    await changes.apply(root.id,prepared.id,['index.html','src/main.js']);
    assert.equal(await fs.readFile(path.join(project,'index.html'),'utf8'),'<h1>Updated</h1>');assert.equal(await fs.readFile(path.join(project,'styles.css'),'utf8'),'body {}');
    const restarted=new ChangeService(workspaces);assert.equal((await restarted.list(root.id))[0].status,'applied');
    await restarted.undo(root.id,prepared.id);assert.equal(await fs.readFile(path.join(project,'index.html'),'utf8'),'<h1>Original</h1>');await assert.rejects(fs.access(path.join(project,'src/main.js')),{code:'ENOENT'});
    const deleted=await workspaces.deleted(root.id);assert.equal(deleted.length,1);assert.equal(deleted[0].path,'src/main.js');await workspaces.restoreTrash(root.id,deleted[0].id);assert.equal(await fs.readFile(path.join(project,'src/main.js'),'utf8'),'console.log(1);');
});
test('an external edit after review prevents every selected change from being applied',async t=>{
    const {project,root,changes}=await fixture(t);await fs.writeFile(path.join(project,'a.js'),'first');await fs.writeFile(path.join(project,'b.js'),'second');
    const prepared=await changes.prepare(root.id,proposal([{path:'a.js',content:'changed first'},{path:'b.js',content:'changed second'}]));
    await fs.writeFile(path.join(project,'b.js'),'external');await assert.rejects(changes.apply(root.id,prepared.id,['a.js','b.js']),error=>error.code==='CONFLICT');
    assert.equal(await fs.readFile(path.join(project,'a.js'),'utf8'),'first');assert.equal(await fs.readFile(path.join(project,'b.js'),'utf8'),'external');
});
test('undo checks the entire group and never discards newer edits',async t=>{
    const {project,root,changes}=await fixture(t);await fs.writeFile(path.join(project,'a.js'),'first');await fs.writeFile(path.join(project,'b.js'),'second');
    const prepared=await changes.prepare(root.id,proposal([{path:'a.js',content:'changed first'},{path:'b.js',content:'changed second'}]));await changes.apply(root.id,prepared.id,['a.js','b.js']);
    await fs.writeFile(path.join(project,'b.js'),'new user work');await assert.rejects(changes.undo(root.id,prepared.id),error=>error.code==='CONFLICT');
    assert.equal(await fs.readFile(path.join(project,'a.js'),'utf8'),'changed first');assert.equal(await fs.readFile(path.join(project,'b.js'),'utf8'),'new user work');
});
test('a failure during a group write rolls back earlier writes using the persistent original data',async t=>{
    const {project,workspaces,root,changes}=await fixture(t);await fs.writeFile(path.join(project,'a.js'),'first');await fs.writeFile(path.join(project,'b.js'),'second');
    const prepared=await changes.prepare(root.id,proposal([{path:'a.js',content:'changed first'},{path:'b.js',content:'changed second'}]));
    const write=workspaces.write.bind(workspaces);workspaces.write=async(...args)=>{if(args[1]==='b.js')throw new Error('Simulated disk failure');return write(...args);};
    await assert.rejects(changes.apply(root.id,prepared.id,['a.js','b.js']),/disk failure/);
    assert.equal(await fs.readFile(path.join(project,'a.js'),'utf8'),'first');assert.equal(await fs.readFile(path.join(project,'b.js'),'utf8'),'second');assert.equal((await changes.get(root.id,prepared.id)).status,'rolled-back');
});
test('an interrupted group can recover after restart while unknown newer edits remain protected',async t=>{
    const {project,workspaces,root,changes}=await fixture(t);await fs.writeFile(path.join(project,'a.js'),'first');await fs.writeFile(path.join(project,'b.js'),'second');
    const prepared=await changes.prepare(root.id,proposal([{path:'a.js',content:'changed first'},{path:'b.js',content:'changed second'}]));prepared.status='applying';prepared.selected=['a.js','b.js'];await changes.persist(prepared);
    await fs.writeFile(path.join(project,'a.js'),'changed first');await new ChangeService(workspaces).undo(root.id,prepared.id);assert.equal(await fs.readFile(path.join(project,'a.js'),'utf8'),'first');
    const next=await changes.prepare(root.id,proposal([{path:'a.js',content:'next first'},{path:'b.js',content:'next second'}]));
    const write=workspaces.write.bind(workspaces);workspaces.write=async(...args)=>{if(args[1]==='b.js'){await fs.writeFile(path.join(project,'a.js'),'new external work');throw new Error('Simulated failure');}return write(...args);};
    await assert.rejects(changes.apply(root.id,next.id,['a.js','b.js']),error=>error.code==='RECOVERY_REQUIRED');assert.equal((await changes.get(root.id,next.id)).status,'recovery');assert.equal(await fs.readFile(path.join(project,'a.js'),'utf8'),'new external work');
});
test('project trash preserves folders, survives reopening, rejects overwrites, and stays out of Git',async t=>{
    const {base,project,workspaces,root}=await fixture(t);await fs.mkdir(path.join(project,'lessons'));await fs.writeFile(path.join(project,'lessons','one.js'),'keep me');
    const removed=await workspaces.trash(root.id,'lessons');await assert.rejects(fs.access(path.join(project,'lessons')),{code:'ENOENT'});
    const reopened=new WorkspaceService(path.join(base,'state'));await reopened.initialize();assert.equal((await reopened.deleted(root.id))[0].id,removed.id);
    await fs.mkdir(path.join(project,'lessons'));await assert.rejects(reopened.restoreTrash(root.id,removed.id),/already exists/);await fs.rmdir(path.join(project,'lessons'));await reopened.restoreTrash(root.id,removed.id);assert.equal(await fs.readFile(path.join(project,'lessons','one.js'),'utf8'),'keep me');
    await assert.rejects(workspaces.trash(root.id,''),/Choose/);await assert.rejects(workspaces.trash(root.id,'.mench'),/outside/);
    await workspaces.trash(root.id,'lessons');const git=new GitService(workspaces);await git.initialize(root.id);assert.equal((await git.status(root.id)).files.some(file=>file.path.startsWith('.mench/')),false);await assert.rejects(git.stage(root.id,'.mench/trash/'+removed.id),/internal recovery/);
});
test('proposal boundaries reject private files, binary paths, path escapes, duplicates, and unknown review selections',async t=>{
    const {root,changes,workspaces}=await fixture(t);
    for(const value of ['.env','.npmrc','.mench/history.json','.aws/config','folder/secrets.json','../outside.js','C:/outside.js','NUL.txt','picture.png'])assert.throws(()=>validateProposal(proposal([{path:value,content:'x'}])));
    for(const value of ['.env','.ssh/id_rsa','.mench/history.json'])assert.equal(shareablePath(value),false);
    assert.throws(()=>validateProposal(proposal([{path:'a.js',content:'x'},{path:'A.js',content:'y'}])),/duplicate/);
    assert.throws(()=>validateProposal(proposal([{path:'a',content:'x'},{path:'a/b.js',content:'y'}])),/folder path/);
    await assert.rejects(workspaces.resolve(root.id,'lesson.txt:private'),/Windows/);
    const prepared=await changes.prepare(root.id,proposal([{path:'a.js',content:'x'}]));await assert.rejects(changes.apply(root.id,prepared.id,['other.js']),/reviewed proposal/);await assert.rejects(changes.get('unknown',prepared.id),/authorized/);
});
test('a project trash catalog can be recovered in a new application profile',async t=>{
    const {base,project,workspaces,root}=await fixture(t);await fs.writeFile(path.join(project,'recover.js'),'original project work');const deleted=await workspaces.trash(root.id,'recover.js');
    const fresh=new WorkspaceService(path.join(base,'fresh-profile'));await fresh.initialize();const reopened=await fresh.grant(project);assert.notEqual(reopened.id,root.id);
    assert.equal((await fresh.deleted(reopened.id))[0].id,deleted.id);await fresh.restoreTrash(reopened.id,deleted.id);assert.equal(await fs.readFile(path.join(project,'recover.js'),'utf8'),'original project work');
});
test('binary and invalid UTF-8 files are refused before they can enter a change journal',async t=>{
    const {project,workspaces,root,changes}=await fixture(t);await fs.writeFile(path.join(project,'binary.js'),Buffer.from([0,1,2]));await fs.writeFile(path.join(project,'legacy.js'),Buffer.from([0xff,0xfe,0x41]));
    await assert.rejects(workspaces.read(root.id,'binary.js'),/Binary/);await assert.rejects(workspaces.read(root.id,'legacy.js'),/UTF-8/);await assert.rejects(changes.prepare(root.id,proposal([{path:'legacy.js',content:'changed'}])),/UTF-8/);
    assert.deepEqual(await fs.readFile(path.join(project,'legacy.js')),Buffer.from([0xff,0xfe,0x41]));
});
