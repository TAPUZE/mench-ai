import {app} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Backend verification only. No BrowserWindow, dialogs, or visible surfaces.
const directory=process.env.MENCH_SERVICE_TEST_DIRECTORY,candidate=process.env.MENCH_SERVICE_TEST_CANDIDATE;
if(!directory||!candidate)process.exit(1);
app.setName('Mench AI background service verification');app.setPath('userData',directory);
app.whenReady().then(async()=>{
    const archive=path.join(candidate,'resources','app.asar'),load=relative=>import(pathToFileURL(path.join(archive,relative)).href);
    const [{WorkspaceService},{ChangeService},{ProcessService},{GitService}]=await Promise.all(['desktop/workspaces.mjs','desktop/changes.mjs','desktop/processes.mjs','desktop/git.mjs'].map(load));
    const checks=[];const verify=(condition,label)=>{if(!condition)throw new Error(label);checks.push(label);};
    const project=path.join(directory,'project');await fs.mkdir(project);
    const workspaces=new WorkspaceService(path.join(directory,'state'));await workspaces.initialize();const root=await workspaces.grant(project,{remember:true});
    await fs.writeFile(path.join(project,'index.html'),'<h1>Original lesson</h1>');
    const changes=new ChangeService(workspaces),proposal=await changes.prepare(root.id,{format:'mench.changes.v1',summary:'Packaged change check',changes:[{path:'index.html',content:'<h1>Reviewed lesson</h1>'},{path:'src/lesson.js',content:'export const lesson = 1;'}]});
    verify((await workspaces.read(root.id,'index.html')).text==='<h1>Original lesson</h1>','Packaged proposal preparation does not write files');
    await changes.apply(root.id,proposal.id,['index.html','src/lesson.js']);verify((await workspaces.read(root.id,'src/lesson.js')).text==='export const lesson = 1;','Packaged multi-file apply writes reviewed contents');
    await new ChangeService(workspaces).undo(root.id,proposal.id);verify((await workspaces.read(root.id,'index.html')).text==='<h1>Original lesson</h1>','Packaged undo restores original contents');
    const deleted=await workspaces.deleted(root.id);verify(deleted.length===1&&deleted[0].path==='src/lesson.js','Packaged undo keeps new files recoverable');
    await workspaces.restoreTrash(root.id,deleted[0].id);verify((await workspaces.read(root.id,'src/lesson.js')).text==='export const lesson = 1;','Packaged project trash restores nested files');
    const git=new GitService(workspaces);await git.initialize(root.id);await git.stage(root.id,'index.html');const commit=await git.commit(root.id,{message:'Packaged service check',name:'Mench package check',email:'check@example.invalid'});verify(/^[0-9a-f]{40}$/.test(commit.oid),'Packaged Git stages and commits without host Git');
    const externalObjects=path.join(directory,'outside-objects'),savedObjects=path.join(directory,'saved-git-objects'),objectPath=path.join(project,'.git','objects');await fs.mkdir(externalObjects);await fs.writeFile(path.join(externalObjects,'untouched.txt'),'Keep outside Git storage');await fs.rename(objectPath,savedObjects);await fs.symlink(externalObjects,objectPath,'junction');
    try{let rejected=false;try{await git.stage(root.id,'index.html');}catch(error){rejected=/linked metadata|outside the opened project/.test(error.message);}verify(rejected&&(await fs.readdir(externalObjects)).join(',')==='untouched.txt','Packaged Git rejects linked object storage without writing outside the project');}
    finally{await fs.unlink(objectPath);await fs.rename(savedObjects,objectPath);}
    const resources=path.join(candidate,'resources'),nodePath=path.join(resources,'runtime','node.exe'),npmPath=path.join(resources,'npm','bin','npm-cli.js');
    await fs.writeFile(path.join(project,'package.json'),JSON.stringify({name:'packaged-runtime-check',version:'1.0.0',scripts:{build:'npm run inner && npx --version',inner:'node -e "console.log(process.execPath)"',test:'node -e "process.exit(4)"'}}));
    let terminalOutput='',terminalExited=false;
    const runtime=new ProcessService({workspaces,nodePath,npmPath,emit:event=>{if(event.kind==='terminal')terminalOutput+=event.output;if(event.kind==='terminal-exit')terminalExited=true;}});
    const environment=runtime.environment.bind(runtime);runtime.environment=()=>({...environment(),PATH:[path.dirname(nodePath),path.join(workspaces.dataDirectory,'bin'),path.join(process.env.SystemRoot||'C:\\Windows','System32')].join(path.delimiter)});
    const until=async predicate=>{const deadline=Date.now()+15000;while(Date.now()<deadline){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,30));}throw new Error('Packaged process verification timed out.');};
    try{
        const build=await runtime.run(root.id,'build');await until(()=>runtime.list(root.id).find(job=>job.id===build.id)?.status!=='running');const built=runtime.result(root.id,build.id);
        verify(built.exitCode===0&&built.output.includes(nodePath)&&built.output.includes('11.19.1'),'Packaged npm and npx nested scripts use bundled Node through Unicode-safe launchers');
        const test=await runtime.run(root.id,'test');await until(()=>runtime.list(root.id).find(job=>job.id===test.id)?.status==='failed');verify(runtime.result(root.id,test.id).exitCode===4,'Packaged task result retains a real failing exit code');
        const terminal=await runtime.createTerminal(root.id);runtime.terminalInput(terminal.id,"Write-Output ('MENCH_' + 'ASAR_PTY'); exit\r");await until(()=>terminalExited);verify(terminalOutput.includes('MENCH_ASAR_PTY'),'Packaged ProcessService starts its real unpacked terminal helper');
    }finally{await runtime.dispose();}
    console.log('MENCH_SERVICE_REPORT:'+JSON.stringify({passed:checks.length,checks}));app.exit(0);
}).catch(error=>{console.error(error.stack||error.message);app.exit(1);});
