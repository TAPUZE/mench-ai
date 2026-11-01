import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {fileURLToPath} from 'node:url';
import {WorkspaceService} from './workspaces.mjs';
import {ProcessService,npmCliPath} from './processes.mjs';
import {GitService} from './git.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const nodePath=path.join(here,'../tools/runtime/node.exe');
async function fixture() {
    const base=await fs.mkdtemp(path.join(os.tmpdir(),'mench-desktop-'));
    const project=path.join(base,'project');await fs.mkdir(project);
    const workspaces=new WorkspaceService(path.join(base,'state'));await workspaces.initialize();
    const root=await workspaces.grant(project,{remember:true});
    return {base,project,workspaces,root};
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,timeout=15000) {
    const start=Date.now();
    while(Date.now()-start<timeout) {if(await predicate()) return;await delay(30);}
    throw new Error('Timed out waiting for real process output.');
}

test('native saves preserve history, detect conflicts, and persist recent projects',async()=>{
    const {base,project,workspaces,root}=await fixture();
    await workspaces.file(root.id,'lesson.js',{create:true});
    const initial=await workspaces.read(root.id,'lesson.js');
    await workspaces.write(root.id,'lesson.js','const lesson = 1;',initial.hash);
    const current=await workspaces.read(root.id,'lesson.js');
    await fs.writeFile(path.join(project,'lesson.js'),'external edit');
    await assert.rejects(workspaces.write(root.id,'lesson.js','overwrite',current.hash),/changed on disk/);
    assert.equal(await fs.readFile(path.join(project,'lesson.js'),'utf8'),'external edit');
    const history=await workspaces.history(root.id,'lesson.js');
    assert.equal(history.length,1);
    assert.equal(await workspaces.revision(root.id,'lesson.js',history[0].id),'');
    const restored=new WorkspaceService(path.join(base,'state'));await restored.initialize();
    assert.equal(restored.recent()[0].id,root.id);
});

test('Windows atomic saves retry temporary rename locks without replacing the file non-atomically',{skip:process.platform!=='win32'},async t=>{
    const {base,project,workspaces,root}=await fixture();t.after(()=>fs.rm(base,{recursive:true,force:true,maxRetries:8,retryDelay:100}));
    const target=path.join(project,'locked.txt');await fs.writeFile(target,'Original text');const initial=await workspaces.read(root.id,'locked.txt'),rename=fs.rename;let attempts=0;
    fs.rename=async(from,to)=>{if(to===target&&attempts++<2)throw Object.assign(new Error('Temporary fixture lock'),{code:'EPERM'});return rename(from,to);};
    try{await workspaces.write(root.id,'locked.txt','Saved after lock',initial.hash);assert.equal(await fs.readFile(target,'utf8'),'Saved after lock');assert.equal(attempts,3);}
    finally{fs.rename=rename;}
});

test('an external edit during a Windows rename retry is preserved and reported as a conflict',{skip:process.platform!=='win32'},async t=>{
    const {base,project,workspaces,root}=await fixture();t.after(()=>fs.rm(base,{recursive:true,force:true,maxRetries:8,retryDelay:100}));
    const target=path.join(project,'conflict.txt');await fs.writeFile(target,'Original text');const initial=await workspaces.read(root.id,'conflict.txt'),rename=fs.rename;let attempts=0;
    fs.rename=async(from,to)=>{if(to===target&&attempts++===0){await fs.writeFile(target,'New external edit');throw Object.assign(new Error('Temporary fixture lock'),{code:'EPERM'});}return rename(from,to);};
    try{await assert.rejects(workspaces.write(root.id,'conflict.txt','Stale replacement',initial.hash),{code:'CONFLICT'});assert.equal(await fs.readFile(target,'utf8'),'New external edit');assert.equal(attempts,1);}
    finally{fs.rename=rename;}
});

test('workspace capabilities reject traversal, unknown roots, and escaping links',async()=>{
    const {base,project,workspaces,root}=await fixture();
    await fs.writeFile(path.join(base,'private.txt'),'outside');
    for (const relative of ['../private.txt','..\\private.txt',path.join(base,'private.txt')]) {
        await assert.rejects(workspaces.read(root.id,relative),/project|Invalid/);
    }
    await assert.rejects(workspaces.read('unknown','private.txt'),/authorized/);
    const outside=path.join(base,'outside');await fs.mkdir(outside);await fs.writeFile(path.join(outside,'secret.txt'),'outside');
    await fs.symlink(outside,path.join(project,'linked'),'junction');
    await assert.rejects(workspaces.read(root.id,'linked/secret.txt'),/outside/);
    assert.equal((await workspaces.entries(root.id)).some(entry=>entry.name==='linked'),false);
});

test('project search, rename, and bounded file access use real local files',async()=>{
    const {project,workspaces,root}=await fixture();
    await fs.writeFile(path.join(project,'one.js'),'const topic = "algebra";\n');
    await fs.writeFile(path.join(project,'.env'),'SECRET=algebra');
    const result=await workspaces.search(root.id,'algebra');
    assert.equal(result.length,1);assert.equal(result[0].path,'one.js');assert.equal(result[0].line,1);
    await workspaces.rename(root.id,'one.js','lesson.js');
    assert.match((await workspaces.read(root.id,'lesson.js')).text,/algebra/);
    await assert.rejects(workspaces.rename(root.id,'lesson.js','.env'),/already exists/);
    await fs.writeFile(path.join(project,'large.txt'),Buffer.alloc(3*1024*1024));
    await assert.rejects(workspaces.read(root.id,'large.txt'),/2 MB/);
});

test('Git initializes, stages, commits, and shows a real working-tree diff',async()=>{
    const {project,workspaces,root}=await fixture();
    const git=new GitService(workspaces);
    assert.equal((await git.status(root.id)).repository,false);
    await fs.writeFile(path.join(project,'lesson.txt'),'First lesson\n');
    await git.initialize(root.id);
    assert.equal((await git.status(root.id)).files[0].untracked,true);
    await git.stage(root.id,'lesson.txt');
    const commit=await git.commit(root.id,{message:'Create lesson',name:'Mench Test',email:'test@example.invalid'});
    assert.match(commit.oid,/^[0-9a-f]{40}$/);
    assert.equal(commit.files.length,0);
    await fs.writeFile(path.join(project,'lesson.txt'),'Updated lesson\n');
    const diff=await git.diff(root.id,'lesson.txt');
    assert.match(diff.patch,/-First lesson/);assert.match(diff.patch,/\+Updated lesson/);
    await git.stage(root.id,'lesson.txt');await git.unstage(root.id,'lesson.txt');
    assert.equal((await git.status(root.id)).files[0].staged,false);
});

test('bundled Node runs actual npm scripts and reports a failing exit code',async()=>{
    const {project,workspaces,root}=await fixture();
    await fs.writeFile(path.join(project,'package.json'),JSON.stringify({name:'runtime-check',version:'1.0.0',scripts:{build:'node -e "console.log(12345)"',test:'node -e "process.exit(3)"'}}));
    const service=new ProcessService({workspaces,nodePath,npmPath:npmCliPath()});
    try {
        const built=await service.run(root.id,'build');
        await until(()=>service.list(root.id).some(job=>job.id===built.id&&job.status==='completed'));
        assert.match(service.list(root.id).find(job=>job.id===built.id).output,/12345/);
        const tested=await service.run(root.id,'test');
        await until(()=>service.list(root.id).some(job=>job.id===tested.id&&job.status==='failed'));
        assert.equal(service.list(root.id).find(job=>job.id===tested.id).exitCode,3);
    } finally {await service.dispose();}
});

test('static preview serves only the selected root behind its capability URL',async()=>{
    const {base,project,workspaces,root}=await fixture();
    await fs.writeFile(path.join(project,'index.html'),'<h1>Real preview</h1><script src="/script.js"></script>');
    await fs.writeFile(path.join(project,'script.js'),'window.lesson = 1;');
    await fs.writeFile(path.join(base,'secret.txt'),'outside');
    const service=new ProcessService({workspaces,nodePath,npmPath:npmCliPath()});
    try {
        const job=await service.run(root.id,'dev');
        const response=await fetch(job.url);
        assert.match(await response.text(),/Real preview/);
        assert.equal((await fetch(new URL('/secret.txt',job.url))).status,404);
        assert.equal((await fetch(new URL('script.js',job.url))).status,200);
        await service.stop(job.id);
        assert.equal(service.list(root.id)[0].status,'stopped');
    } finally {await service.dispose();}
});

test('real Windows PTY accepts input and reports command output and exit',async()=>{
    const {workspaces,root}=await fixture();
    let output='',exited=false;
    const service=new ProcessService({workspaces,nodePath,npmPath:npmCliPath(),emit:event=>{if(event.kind==='terminal') output+=event.output;if(event.kind==='terminal-exit') exited=true;}});
    try {
        const terminal=await service.createTerminal(root.id);
        service.terminalInput(terminal.id,"Write-Output ('MENCH_' + 'PTY_CHECK'); exit\r");
        await until(()=>exited,20000);
        assert.match(output,/MENCH_PTY_CHECK/);
    } finally {await service.dispose();}
});

test('project scripts can call bundled npm and npx without a host Node install and report actual task outcomes',async()=>{
    const {base,project,workspaces,root}=await fixture();
    await fs.writeFile(path.join(project,'package.json'),JSON.stringify({name:'nested-runtime-check',version:'1.0.0',scripts:{build:'npm run inner && npx --version',inner:'node -e "console.log(998877)"',test:'node -e "process.exit(4)"'}}));
    const service=new ProcessService({workspaces,nodePath,npmPath:npmCliPath()}),environment=service.environment.bind(service);
    service.environment=()=>({...environment(),PATH:[path.dirname(nodePath),path.join(workspaces.dataDirectory,'bin'),path.join(process.env.SystemRoot||'C:\\Windows','System32')].join(path.delimiter)});
    try{
        const built=await service.run(root.id,'build');await until(()=>service.list(root.id).find(job=>job.id===built.id)?.status!=='running');
        const result=service.result(root.id,built.id);assert.equal(result.exitCode,0,result.output);assert.match(result.output,/998877/);assert.match(result.output,/11\.19\.1/);
        const failed=await service.run(root.id,'test');await until(()=>service.list(root.id).find(job=>job.id===failed.id)?.status==='failed');assert.equal(service.result(root.id,failed.id).exitCode,4);
        const other=path.join(base,'other');await fs.mkdir(other);const otherRoot=await workspaces.grant(other);assert.throws(()=>service.result(otherRoot.id,built.id),/does not belong/);
        const safe=environment({Gemini_Api_Key:'test-private',MENCH_SETUP_TOKEN:'test-private',ELECTRON_RUN_AS_NODE:'1',PATH:'example'});assert.equal(Object.keys(safe).some(name=>['GEMINI_API_KEY','MENCH_SETUP_TOKEN','ELECTRON_RUN_AS_NODE'].includes(name.toUpperCase())),false);
    }finally{await service.dispose();}
});
