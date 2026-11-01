import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {WorkspaceService} from '../../desktop/workspaces.mjs';
import {ChangeService} from '../../desktop/changes.mjs';
import {ProcessService} from '../../desktop/processes.mjs';
import {webFiles} from './projects.js';

const browser=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost:3000'});
for(const name of ['window','document','HTMLElement','Element','localStorage','KeyboardEvent','MouseEvent','Event'])globalThis[name]=name==='window'?browser.window:name==='document'?browser.window.document:browser.window[name];
Object.defineProperty(globalThis,'navigator',{value:browser.window.navigator,configurable:true});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
browser.window.HTMLElement.prototype.scrollIntoView=()=>{};
const React=await import('react'),{createRoot}=await import('react-dom/client');
let vite,App,root,base,project,workspaces,changes,record,processes,lastRequest,reply,listeners;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const buttons=()=>[...document.querySelectorAll('button')];
const findButton=label=>buttons().find(item=>item.getAttribute('aria-label')===label||item.textContent.trim()===label||item.textContent.trim().startsWith(label));
async function click(label){
    for(let attempt=0;attempt<30&&!findButton(label);attempt++)await React.act(async()=>await pause(20));
    const item=findButton(label);assert.ok(item,'Missing button: '+label+'\n'+document.body.textContent.slice(-2500));
    await React.act(async()=>{item.click();await pause(40);});
    await React.act(async()=>await pause(20));
}
async function input(element,value){await React.act(async()=>{const prototype=element.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));await pause(10);});}
async function submit(form){await React.act(async()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await pause(70);});}
async function context(relative){const element=document.querySelector('[role="treeitem"][title="'+relative+'"]');assert.ok(element);await React.act(async()=>{element.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:100,clientY:150}));await pause(10);});}
const aiProposal=()=>({format:'mench.changes.v1',summary:'Refresh the lesson',changes:[{path:'styles.css',content:'body { color: green; }'},{path:'script.js',content:'console.log("new behavior");'},{path:'src/helper.js',content:'export const count = 10;'}]});
before(async()=>{
    vite=await createServer({configFile:false,cacheDir:".local/test-vite/native-workbench",server:{middlewareMode:true,hmr:false,ws:false},appType:'custom',ssr:{noExternal:['@monaco-editor/react']},plugins:[{name:'native-component-editor',enforce:'pre',resolveId:id=>id==='@monaco-editor/react'?'\0test-editor':null,load:id=>id==='\0test-editor'?"import React from \"react\";\nexport function Editor(props){\n const value=React.useRef(props.value);window.__setModelOnly=text=>{value.current=text;};\n React.useEffect(()=>{value.current=props.value;},[props.value]);\n React.useEffect(()=>{props.onMount?.({getModel:()=>({uri:{path:props.path},getValue:()=>value.current}),onDidChangeCursorPosition:()=>({dispose(){}}),addCommand(){}},{KeyMod:{CtrlCmd:2048},KeyCode:{KeyS:31}});},[]);\n return React.createElement(\"textarea\",{\"aria-label\":\"Test editor\",value:props.value,onChange:event=>{value.current=event.target.value;if(window.__deferEditorChange){const text=event.target.value;window.__pendingEditorChange=()=>props.onChange(text);}else props.onChange(event.target.value);}});\n}\nexport function DiffEditor(props){return React.createElement(\"div\",null,React.createElement(\"pre\",{\"aria-label\":\"Original diff\"},props.original),React.createElement(\"pre\",{\"aria-label\":\"Proposed diff\"},props.modified));}\n":null}]});
    App=(await vite.ssrLoadModule('/src/WorkspaceApp.jsx')).default;
});
after(async()=>{await vite.close();browser.window.close();});
beforeEach(async()=>{
    localStorage.clear();base=await fs.mkdtemp(path.join(os.tmpdir(),'mench-native-ui-'));project=path.join(base,'Lesson');await fs.mkdir(project);
    for(const [name,content] of Object.entries({...webFiles,'.env':'PRIVATE_VALUE=not-to-share','.npmrc':'//private-registry/:_authToken=not-to-share'}))await fs.writeFile(path.join(project,name),content);
    await fs.mkdir(path.join(project,'lessons'));await fs.writeFile(path.join(project,'lessons','one.js'),'const one = 1;');
    workspaces=new WorkspaceService(path.join(base,'state'));await workspaces.initialize();record=await workspaces.grant(project,{remember:true});changes=new ChangeService(workspaces);listeners=new Set();processes=new ProcessService({workspaces,nodePath:process.execPath,npmPath:path.resolve('tools/npm-runtime/bin/npm-cli.js'),emit:event=>{for(const listener of listeners)listener(event);}});
    lastRequest=null;reply='Reviewed project proposal.\n```mench-changes\n'+JSON.stringify(aiProposal())+'\n```';
    const envelope=fn=>async(...args)=>{try{return {ok:true,value:await fn(...args)};}catch(error){return {ok:false,error:{message:error.message,code:error.code,name:error.code==='ENOENT'?'NotFoundError':error.name}};}};
    window.menchDesktop={version:2,
        chooseDirectory:envelope(()=>record),recentProjects:envelope(()=>workspaces.recent()),rememberProject:envelope(({rootId,relative=''})=>workspaces.resolve(rootId,relative).then(directory=>workspaces.grant(directory,{remember:true}))),checkDirectory:envelope(({rootId,relative=''})=>workspaces.resolve(rootId,relative)),
        entries:envelope(({rootId,relative=''})=>workspaces.entries(rootId,relative)),directory:envelope(({rootId,relative,create})=>workspaces.directory(rootId,relative,{create})),file:envelope(({rootId,relative,create})=>workspaces.file(rootId,relative,{create})),read:envelope(({rootId,relative})=>workspaces.read(rootId,relative)),write:envelope(({rootId,relative,content,expectedHash})=>workspaces.write(rootId,relative,content,expectedHash)),
        rename:envelope(({rootId,from,to})=>workspaces.rename(rootId,from,to)),trash:envelope(({rootId,relative})=>workspaces.trash(rootId,relative)),deleted:envelope(({rootId})=>workspaces.deleted(rootId)),restoreDeleted:envelope(({rootId,id})=>workspaces.restoreTrash(rootId,id)),history:envelope(({rootId,relative})=>workspaces.history(rootId,relative)),revision:envelope(({rootId,relative,id})=>workspaces.revision(rootId,relative,id)),
        prepareChanges:envelope(({rootId,proposal})=>changes.prepare(rootId,proposal)),applyChanges:envelope(({rootId,id,selected})=>changes.apply(rootId,id,selected)),listChanges:envelope(({rootId})=>changes.list(rootId)),getChanges:envelope(({rootId,id})=>changes.get(rootId,id)),undoChanges:envelope(({rootId,id})=>changes.undo(rootId,id)),
        capabilities:envelope(({rootId})=>processes.capabilities(rootId)),listTasks:envelope(({rootId})=>processes.list(rootId)),runTask:envelope(({rootId,task})=>processes.run(rootId,task)),stopTask:envelope(({id})=>processes.stop(id)),onRuntimeEvent:listener=>{listeners.add(listener);return ()=>listeners.delete(listener);},
        schoolStatus:envelope(()=>({url:null,user:null,apiKeyConfigured:true})),askAI:envelope(request=>{lastRequest={...request,taskResults:request.taskResultRequest?[processes.result(request.taskResultRequest.rootId,request.taskResultRequest.id)]:[]};return {content:reply};}),cancelAI:envelope(()=>({cancelled:true}))
    };
    root=createRoot(document.getElementById('root'));await React.act(async()=>{root.render(React.createElement(App));await pause(25);});await click('Open project');
});
afterEach(async()=>{await React.act(async()=>root.unmount());await processes.dispose();delete window.menchDesktop;delete window.__deferEditorChange;delete window.__pendingEditorChange;delete window.__setModelOnly;if(path.dirname(base)!==os.tmpdir())throw new Error('Invalid fixture cleanup.');await fs.rm(base,{recursive:true,force:true});});
async function ask(){await input(document.getElementById('assistant-prompt'),'Improve the project');await submit(document.querySelector('.mw-composer'));}

test('switching school accounts clears visible history, cancels old replies and never stores school chats in local storage',async()=>{
    const status={url:'https://school.example.org',connected:true,user:{id:'one',name:'First student',role:'student'},policy:{status:'approved',version:1}};
    const histories=new Map([['one',{revision:1,messages:[{id:'private-one',role:'user',content:'PRIVATE_FIRST_ACCOUNT'}]}],['two',{revision:0,messages:[]}]]);
    const api=window.menchDesktop;api.schoolStatus=async()=>({ok:true,value:{...status,user:status.user?{...status.user}:null}});
    api.schoolRequest=async({action,payload={}})=>{
        if(action==='chat.get')return {ok:true,value:histories.get(payload.ownerId)};
        if(action==='chat.save'){assert.equal(payload.ownerId,status.user.id);const value={revision:payload.expectedRevision+1,messages:payload.messages,brief:payload.brief||''};histories.set(payload.ownerId,value);return {ok:true,value:{revision:value.revision}};}
        if(action==='policy.get')return {ok:true,value:{...status.policy,rules:{instructions:'Fixture policy',blockedTerms:[]}}};
        return {ok:true,value:{items:[],total:0,nextCursor:null}};
    };
    window.menchDesktop={...api};
    await click('School');await click('Refresh');await click('Close dialog');assert.match(document.querySelector('.mw-messages').textContent,/PRIVATE_FIRST_ACCOUNT/);
    await input(document.querySelector('[aria-label="Project brief"]'),'PRIVATE_FIRST_ACCOUNT_BRIEF');await click('Save project brief');assert.equal(histories.get('one').brief,'PRIVATE_FIRST_ACCOUNT_BRIEF');
    let sentBrief;let finish;window.menchDesktop={...window.menchDesktop,askAI:request=>new Promise(resolve=>{sentBrief=request.brief;finish=()=>resolve({ok:true,value:{content:'PRIVATE_OLD_PENDING_REPLY'}});})};
    await ask();assert.equal(typeof finish,'function');assert.equal(sentBrief,'PRIVATE_FIRST_ACCOUNT_BRIEF');
    status.user={id:'two',name:'Second student',role:'student'};await click('School');await click('Refresh');await click('Close dialog');
    await React.act(async()=>{finish();await pause(40);});
    assert.ok(!document.querySelector('.mw-messages').textContent.includes('PRIVATE_FIRST_ACCOUNT'));assert.ok(!document.querySelector('.mw-messages').textContent.includes('PRIVATE_OLD_PENDING_REPLY'));
    assert.equal(histories.get('two').messages.length,0);assert.equal(document.querySelector('[aria-label="Project brief"]').value,'');assert.ok(!Object.keys(localStorage).some(key=>key.includes('school.example.org')));
});
test('native UI shares selected context, reviews selected changes, saves real files, and undoes through persistent history',async()=>{
    assert.equal(document.querySelector('[aria-label="Attach .env"]'),null);assert.equal(document.querySelector('[aria-label="Attach .npmrc"]'),null);
    assert.equal([...document.querySelectorAll('.mw-context-files input[type="checkbox"]')].some(input=>input.checked),false);
    await React.act(async()=>{document.querySelector('[aria-label="Attach styles.css"]').click();document.querySelector('[aria-label="Attach script.js"]').click();});await ask();
    assert.deepEqual(lastRequest.files.map(file=>file.path).sort(),['script.js','styles.css']);assert.equal(JSON.stringify(lastRequest).includes('not-to-share'),false);
    await click('Review 3 project changes');assert.equal(document.querySelector('[role="dialog"]').getAttribute('aria-label'),'Review project changes');assert.equal(await fs.readFile(path.join(project,'styles.css'),'utf8'),webFiles['styles.css']);
    await React.act(async()=>document.querySelector('[aria-label="Apply script.js"]').click());await click('src/helper.js');assert.match(document.querySelector('[aria-label="Proposed diff"]').textContent,/count = 10/);
    await click('Apply and save 2 files');assert.equal(document.querySelector('[role="dialog"]'),null);assert.equal(await fs.readFile(path.join(project,'styles.css'),'utf8'),'body { color: green; }');assert.equal(await fs.readFile(path.join(project,'script.js'),'utf8'),webFiles['script.js']);assert.equal(await fs.readFile(path.join(project,'src','helper.js'),'utf8'),'export const count = 10;');
    await click('File');await click('Project changes');await click('Refresh the lesson');await click('Undo and save originals');
    assert.equal(await fs.readFile(path.join(project,'styles.css'),'utf8'),webFiles['styles.css']);await assert.rejects(fs.access(path.join(project,'src','helper.js')),{code:'ENOENT'});assert.equal((await workspaces.deleted(record.id))[0].path,'src/helper.js');
});
test('native folder rename preserves unsaved contents and saves them at the new path',async()=>{
    await click('lessons');const treeFile=document.querySelector('[role="treeitem"][title="lessons/one.js"]');await React.act(async()=>{treeFile.click();await pause(30);});await input(document.querySelector('[aria-label="Test editor"]'),'const one = "unsaved work";');
    await context('lessons');await click('Rename or move');await input(document.querySelector('[role="dialog"] input'),'teaching');await submit(document.querySelector('[role="dialog"] form'));
    assert.equal(await fs.readFile(path.join(project,'teaching','one.js'),'utf8'),'const one = 1;');assert.equal(document.querySelector('[aria-label="Test editor"]').value,'const one = "unsaved work";');assert.match(document.body.textContent,/1 unsaved/);
    await click('Save');assert.equal(await fs.readFile(path.join(project,'teaching','one.js'),'utf8'),'const one = "unsaved work";');await assert.rejects(fs.access(path.join(project,'lessons')),{code:'ENOENT'});
});
test('native trash asks before saving unsaved work and restores the saved version through History',async()=>{
    const content='<h1>Keep this unsaved lesson</h1>';await input(document.querySelector('[aria-label="Test editor"]'),content);await context('index.html');await click('Move to project trash');
    assert.equal(await fs.readFile(path.join(project,'index.html'),'utf8'),webFiles['index.html']);await click('Save and move to trash');await assert.rejects(fs.access(path.join(project,'index.html')),{code:'ENOENT'});
    await click('File');await click('Deleted files');await click('index.html');assert.equal(await fs.readFile(path.join(project,'index.html'),'utf8'),content);assert.equal((await workspaces.deleted(record.id)).length,0);
});
test('native group review displays conflicts and keeps every file unchanged when newer disk work exists',async()=>{
    await ask();await click('Review 3 project changes');await fs.writeFile(path.join(project,'styles.css'),'new external work');await click('Apply and save 3 files');
    assert.match(document.querySelector('[role="dialog"] [role="alert"]').textContent,/changed after the review/);assert.equal(await fs.readFile(path.join(project,'styles.css'),'utf8'),'new external work');assert.equal(await fs.readFile(path.join(project,'script.js'),'utf8'),webFiles['script.js']);await assert.rejects(fs.access(path.join(project,'src','helper.js')),{code:'ENOENT'});
});
test('native Run project connects to a real project HTTP server and records real task state',async()=>{
    await click('Run project');await React.act(async()=>await pause(50));const iframe=document.querySelector('iframe[title="Project preview"]');assert.ok(iframe?.src.startsWith('http://127.0.0.1:'));
    const response=await fetch(iframe.src);assert.equal(response.status,200);assert.match(await response.text(),/Something good starts here/);assert.equal(processes.list(record.id)[0].status,'running');
});

test('overlapping saves share a pending write and queue newer editor text without a false external-change conflict',async()=>{
    const bridge=window.menchDesktop;let release,writes=0;const blocked=new Promise(resolve=>{release=resolve;});
    window.menchDesktop={...bridge,write:async payload=>{writes++;await blocked;return bridge.write(payload);}};
    try{
        await input(document.querySelector('[aria-label="Test editor"]'),'First saved edit');
        await React.act(async()=>{for(let index=0;index<2;index++)window.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true}));await pause(30);});
        assert.equal(writes,1);await input(document.querySelector('[aria-label="Test editor"]'),'Newer edit while saving');
        await React.act(async()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true}));await pause(20);});assert.equal(writes,1);
        release();for(let attempt=0;attempt<80&&(await fs.readFile(path.join(project,'index.html'),'utf8'))!=='Newer edit while saving';attempt++)await React.act(async()=>await pause(20));
        assert.equal(await fs.readFile(path.join(project,'index.html'),'utf8'),'Newer edit while saving');assert.equal(writes,2);assert.equal(document.querySelector('[role="alert"]'),null);assert.match(document.body.textContent,/All changes saved/);
    }finally{release();}
});

test('Save reads the active project model when its change event has not reached the document state',async()=>{
    window.__deferEditorChange=true;const text='Current model text must be saved';
    await input(document.querySelector('[aria-label="Test editor"]'),text);
    assert.match(document.body.textContent,/All changes saved/);
    await React.act(async()=>{window.__pendingEditorChange();findButton('Save').click();await pause(50);});
    assert.equal(await fs.readFile(path.join(project,'index.html'),'utf8'),text);assert.equal(document.querySelector('[role="alert"]'),null);assert.match(document.body.textContent,/All changes saved/);
});

test('a stale model value without a user change event cannot overwrite the saved document',async()=>{
    const text='This saved user text must stay';await input(document.querySelector('[aria-label="Test editor"]'),text);await click('Save');
    window.__setModelOnly('Stale programmatic model text');await click('Save');assert.equal(await fs.readFile(path.join(project,'index.html'),'utf8'),text);assert.equal(document.querySelector('[role="alert"]'),null);
});

test('a pending Save All from the previous project cannot replace handles or document state in the next project',async()=>{
    await input(document.querySelector('[aria-label="Test editor"]'),'First project index edit');await click('styles.css');await input(document.querySelector('[aria-label="Test editor"]'),'First project style edit');
    const bridge=window.menchDesktop;let release,writes=0;const blocked=new Promise(resolve=>{release=resolve;});
    const second=path.join(base,'Second');await fs.mkdir(second);await fs.writeFile(path.join(second,'index.html'),'Second project index');await fs.writeFile(path.join(second,'styles.css'),'Second project styles');const secondRecord=await workspaces.grant(second);
    window.menchDesktop={...bridge,chooseDirectory:async()=>({ok:true,value:secondRecord}),write:async payload=>{if(payload.rootId===record.id)await blocked;const result=await bridge.write(payload);if(payload.rootId===record.id)writes++;return result;}};
    try{
        await React.act(async()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,shiftKey:true,bubbles:true,cancelable:true}));await pause(30);});
        await click('Open another project');await click('Keep drafts & continue');await click('styles.css');assert.equal(document.querySelector('[aria-label="Test editor"]').value,'Second project styles');
        release();for(let attempt=0;attempt<80&&writes<2;attempt++)await React.act(async()=>await pause(20));assert.equal(writes,2);assert.equal(document.querySelector('[aria-label="Test editor"]').value,'Second project styles');
        await input(document.querySelector('[aria-label="Test editor"]'),'Second project only');await click('Save');assert.equal(await fs.readFile(path.join(second,'styles.css'),'utf8'),'Second project only');assert.equal(await fs.readFile(path.join(project,'styles.css'),'utf8'),'First project style edit');
    }finally{release();await React.act(async()=>await pause(30));}
});
test('assistant task suggestions run only after a click and attach the actual failing output only when selected',async()=>{
    await fs.writeFile(path.join(project,'package.json'),JSON.stringify({name:'ui-task-check',version:'1.0.0',scripts:{test:'node -e "console.log(556677);process.exit(4)"'}}));
    reply='Try the project tests.\n```mench-task\n'+JSON.stringify({task:'test',reason:'Check the current implementation.'})+'\n```';await ask();assert.equal(processes.list(record.id).length,0);
    await click('Run test in this project');
    for(let attempt=0;attempt<80&&processes.list(record.id)[0]?.status!=='failed';attempt++)await React.act(async()=>await pause(20));
    const actual=processes.list(record.id)[0];assert.equal(actual.status,'failed');assert.equal(actual.exitCode,4);
    const select=document.querySelector('[aria-label="Attach task output"]');assert.ok(select);assert.equal(select.value,'');
    reply='This failed with exit code 4.';await ask();assert.deepEqual(lastRequest.taskResults,[]);
    await React.act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(select,actual.id);select.dispatchEvent(new Event('change',{bubbles:true}));});await ask();
    assert.equal(lastRequest.taskResults[0].exitCode,4);assert.match(lastRequest.taskResults[0].output,/556677/);
});
test('change proposals preserve embedded code fences and reject private-file edits and arbitrary task commands',async()=>{
    const markdown='# Lesson\n\n```js\nconsole.log(1);\n```\n';
    reply='A lesson document.\n```mench-changes\n'+JSON.stringify({format:'mench.changes.v1',summary:'Add a lesson document',changes:[{path:'README.md',content:markdown}]})+'\n```';await ask();await click('Review 1 project changes');assert.equal(document.querySelector('[aria-label="Proposed diff"]').textContent,markdown);await click('Apply and save 1 file');assert.equal(await fs.readFile(path.join(project,'README.md'),'utf8'),markdown);
    reply='```mench-changes\n'+JSON.stringify({format:'mench.changes.v1',summary:'Unsafe request',changes:[{path:'.env',content:'overwritten'}]})+'\n```';await ask();assert.match(document.querySelector('.mw-message:last-of-type').textContent,/Private or generated/);assert.equal(await fs.readFile(path.join(project,'.env'),'utf8'),'PRIVATE_VALUE=not-to-share');
    reply='```mench-task\n'+JSON.stringify({task:'powershell arbitrary-command',reason:'Not an allowed task'})+'\n```';await ask();assert.match(document.querySelector('.mw-message:last-of-type').textContent,/task proposal is invalid/);assert.equal(processes.list(record.id).length,0);
});
