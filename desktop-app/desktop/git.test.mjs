import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import git from 'isomorphic-git';
import nodeFs from 'node:fs';
import {GitService} from './git.mjs';
import {WorkspaceService} from './workspaces.mjs';

async function fixture(t){
    const base=await fs.mkdtemp(path.join(os.tmpdir(),'mench-git-boundary-')),project=path.join(base,'project'),outside=path.join(base,'outside');
    await fs.mkdir(project);await fs.mkdir(outside);await fs.writeFile(path.join(outside,'original.txt'),'Outside project');
    t.after(async()=>{if(path.dirname(base)!==os.tmpdir())throw new Error('Invalid Git fixture cleanup.');await fs.rm(base,{recursive:true,force:true});});
    const workspaces=new WorkspaceService(path.join(base,'state'));await workspaces.initialize();const root=await workspaces.grant(project);
    return {project,outside,root,workspaces,service:new GitService(workspaces)};
}
const author={name:'Boundary test',email:'test@example.invalid',message:'Reviewed lesson'};

test('Git rejects a linked .git directory and an external gitdir pointer without changing either repository',async t=>{
    const {project,outside,root,service}=await fixture(t);await git.init({fs:nodeFs,dir:outside});
    await fs.symlink(path.join(outside,'.git'),path.join(project,'.git'),'junction');
    for(const action of [()=>service.status(root.id),()=>service.initialize(root.id),()=>service.stage(root.id,'lesson.txt'),()=>service.commit(root.id,author)])await assert.rejects(action,/real .git folder/);
    await fs.unlink(path.join(project,'.git'));await fs.writeFile(path.join(project,'.git'),'gitdir: '+path.join(outside,'.git'));
    await assert.rejects(service.status(root.id),/real .git folder/);assert.equal(await fs.readFile(path.join(outside,'original.txt'),'utf8'),'Outside project');
});

test('Git refuses linked object storage before staging can write outside the project',async t=>{
    const {project,outside,root,service}=await fixture(t);await service.initialize(root.id);await fs.rename(path.join(project,'.git','objects'),path.join(project,'saved-objects'));await fs.symlink(outside,path.join(project,'.git','objects'),'junction');
    await fs.writeFile(path.join(project,'lesson.txt'),'A real lesson');const before=await fs.readdir(outside);
    await assert.rejects(service.stage(root.id,'lesson.txt'),/linked metadata|outside the opened project/);assert.deepEqual(await fs.readdir(outside),before);
});

test('Git ignores working-tree junction contents and refuses to stage an escaping link',async t=>{
    const {project,outside,root,service}=await fixture(t);await service.initialize(root.id);await fs.symlink(outside,path.join(project,'linked'),'junction');
    const status=await service.status(root.id);assert.equal(status.files.some(file=>file.path.includes('original.txt')),false);
    await assert.rejects(service.stage(root.id,'linked/original.txt'),/outside/);assert.equal(await fs.readFile(path.join(outside,'original.txt'),'utf8'),'Outside project');
});

test('Git reports linked reference metadata instead of silently treating it as an empty repository',async t=>{
    const {project,outside,root,service}=await fixture(t);await service.initialize(root.id);await fs.rename(path.join(project,'.git','refs'),path.join(project,'saved-refs'));await fs.mkdir(path.join(outside,'heads'));await fs.writeFile(path.join(outside,'heads','main'),'1'.repeat(40)+'\n');await fs.symlink(outside,path.join(project,'.git','refs'),'junction');
    await assert.rejects(service.status(root.id),/linked metadata|outside the opened project/);assert.equal(await fs.readFile(path.join(outside,'heads','main'),'utf8'),'1'.repeat(40)+'\n');
    await fs.unlink(path.join(project,'.git','refs'));await fs.rename(path.join(project,'saved-refs'),path.join(project,'.git','refs'));await fs.rename(path.join(project,'.git','refs','heads'),path.join(project,'saved-heads'));await fs.symlink(path.join(outside,'heads'),path.join(project,'.git','refs','heads'),'junction');
    await assert.rejects(service.status(root.id),/linked metadata|outside the opened project/);
});

test('Git requires canonical individual paths and refuses commits containing previously tracked recovery data',async t=>{
    const {project,root,service}=await fixture(t);await service.initialize(root.id);await fs.mkdir(path.join(project,'.mench'));await fs.writeFile(path.join(project,'.mench','private.txt'),'saved originals');
    for(const filename of ['./.mench/private.txt','.MENCH/private.txt','.mench\\private.txt','.git/config','..','.'])await assert.rejects(service.stage(root.id,filename),/internal|path/);
    await fs.mkdir(path.join(project,'src'));await assert.rejects(service.stage(root.id,'src'),/individual/);
    await fs.writeFile(path.join(project,'lesson.txt'),'A lesson');await service.stage(root.id,'lesson.txt');
    await git.add({fs:nodeFs,dir:project,filepath:'.mench/private.txt'});await assert.rejects(service.commit(root.id,author),/already in the Git index/);
    assert.equal(await fs.readFile(path.join(project,'.mench','private.txt'),'utf8'),'saved originals');
    await git.remove({fs:nodeFs,dir:project,filepath:'.mench/private.txt'});const committed=await service.commit(root.id,author);assert.match(committed.oid,/^[0-9a-f]{40}$/);
});

test('Git preserves real staged deletions and does not disguise missing committed objects as an empty diff',async t=>{
    const {project,root,service}=await fixture(t);await service.initialize(root.id);await fs.writeFile(path.join(project,'lesson.txt'),'First lesson');await service.stage(root.id,'lesson.txt');await service.commit(root.id,author);
    await fs.unlink(path.join(project,'lesson.txt'));await service.stage(root.id,'lesson.txt');assert.equal((await service.status(root.id)).files.find(file=>file.path==='lesson.txt').staged,true);
    await service.unstage(root.id,'lesson.txt');assert.equal((await service.diff(root.id,'lesson.txt')).original,'First lesson');
    const oid=(await git.resolveRef({fs:nodeFs,dir:project,ref:'HEAD'}));await fs.unlink(path.join(project,'.git','objects',oid.slice(0,2),oid.slice(2)));
    await assert.rejects(service.diff(root.id,'lesson.txt'),error=>error.code==='NotFoundError'&&error.data.what===oid);
});
