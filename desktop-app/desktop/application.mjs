import {app,BrowserWindow,dialog,ipcMain,protocol,safeStorage} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WorkspaceService,inside} from './workspaces.mjs';
import {ProcessService,npmCliPath} from './processes.mjs';
import {GitService} from './git.mjs';
import {CredentialVault} from './credentials.mjs';
import {SchoolClient} from './school-client.mjs';
import {personalGenerate} from './assistant.mjs';
import {ChangeService} from './changes.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const devUrl='http://127.0.0.1:3000';
const contentTypes={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.png':'image/png'};
export function registerWorkspaceScheme(){
    protocol.registerSchemesAsPrivileged([{scheme:'mench',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
}

// The normal entry point uses visible=true. Background verification shares this
// exact host, IPC authorization, protocol, preload and services, with an isolated
// profile and injected chooser. Background mode has no native dialogs or window.
export async function createWorkspaceApplication(options={}){
    const background=options.visible===false,development=options.development===true&&!app.isPackaged;
    const assetDirectory=options.assetDirectory||path.resolve(here,'../dist');
    let window,workspaces,processes,git,school,changes;
    const chooseDirectory=options.chooseDirectory||(settings=>{
        if(background)throw new Error('A background check must supply an isolated directory chooser.');
        return dialog.showOpenDialog(window,settings);
    });
function trusted(event) {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) return false;
    const url = event.senderFrame.url;
    return development ? url.startsWith(devUrl + '/') : url.startsWith('mench://workspace/');
}
async function dispatch(action,payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid application request.');
    const {rootId,relative = ''} = payload;
    switch (action) {
        case 'school.status':return school.status();
        case 'school.configure':return school.configure(payload);
        case 'school.credentials.reset':return school.resetCredentials(payload);
        case 'school.request':return school.request(payload);
        case 'ai.configure':return school.configureKey(payload);
        case 'ai.cancel':return school.cancel(payload.id);
        case 'ai.ask':{
            const taskResults=payload.taskResultRequest?[processes.result(payload.taskResultRequest.rootId,payload.taskResultRequest.id)]:[];
            return school.ask({...payload,taskResults},personalGenerate);
        }
        case 'workspace.choose': {
            const result = await chooseDirectory({title:payload.purpose === 'create' ? 'Choose where to create your project' : 'Open project folder',properties:['openDirectory','createDirectory']});
            return result.canceled ? null : workspaces.grant(result.filePaths[0]);
        }
        case 'workspace.recent': return workspaces.recent();
        case 'workspace.remember': return workspaces.grant(await workspaces.resolve(rootId,relative),{remember:true});
        case 'workspace.check': await workspaces.resolve(rootId,relative);return true;
        case 'fs.entries': return workspaces.entries(rootId,relative);
        case 'fs.directory': return workspaces.directory(rootId,relative,{create:payload.create === true});
        case 'fs.file': return workspaces.file(rootId,relative,{create:payload.create === true});
        case 'fs.read': return workspaces.read(rootId,relative);
        case 'fs.write': return workspaces.write(rootId,relative,payload.content,payload.expectedHash);
        case 'fs.rename': return workspaces.rename(rootId,payload.from,payload.to);
        case 'fs.trash':return workspaces.trash(rootId,relative);
        case 'fs.deleted':return workspaces.deleted(rootId);
        case 'fs.restore':return workspaces.restoreTrash(rootId,payload.id);
        case 'changes.prepare':return changes.prepare(rootId,payload.proposal);
        case 'changes.apply':return changes.apply(rootId,payload.id,payload.selected);
        case 'changes.list':return changes.list(rootId);
        case 'changes.get':return changes.get(rootId,payload.id);
        case 'changes.undo':return changes.undo(rootId,payload.id);
        case 'fs.search': return workspaces.search(rootId,payload.query,{content:payload.content !== false});
        case 'fs.history': return workspaces.history(rootId,relative);
        case 'fs.revision': return workspaces.revision(rootId,relative,payload.id);
        case 'task.capabilities': return processes.capabilities(rootId);
        case 'task.run': return processes.run(rootId,payload.task);
        case 'task.stop': return processes.stop(payload.id);
        case 'task.list': return processes.list(rootId);
        case 'terminal.create': return processes.createTerminal(rootId,payload);
        case 'terminal.input': return processes.terminalInput(payload.id,payload.data);
        case 'terminal.resize': return processes.resizeTerminal(payload.id,payload.cols,payload.rows);
        case 'terminal.close': return processes.closeTerminal(payload.id);
        case 'git.status': return git.status(rootId);
        case 'git.initialize': return git.initialize(rootId);
        case 'git.diff': return git.diff(rootId,payload.path);
        case 'git.stage': return git.stage(rootId,payload.path);
        case 'git.unstage': return git.unstage(rootId,payload.path);
        case 'git.commit': return git.commit(rootId,payload);
        default: throw new Error('This application operation is not available.');
    }
}

const dataDirectory = options.dataDirectory||path.join(app.getPath('userData'),'workspace-data');
workspaces = new WorkspaceService(dataDirectory);await workspaces.initialize();
git = new GitService(workspaces);
changes=new ChangeService(workspaces);
const vault=new CredentialVault(path.join(app.getPath('userData'),'credentials.enc'),safeStorage);
let managedUrl;
try{const config=JSON.parse(await fs.readFile(options.managedConfigPath||path.join(process.env.ProgramData||'C:\\ProgramData','MenchAI','school.json'),'utf8'));if(!config.gatewayUrl)throw new Error('The managed school connection is missing its gatewayUrl.');managedUrl=config.gatewayUrl;}
catch(error){if(error.code!=='ENOENT')throw error;}
school=new SchoolClient({vault,managedUrl});
const nodePath = options.nodePath||(app.isPackaged ? path.join(process.resourcesPath,'runtime','node.exe') : path.join(here,'../tools/runtime/node.exe'));
const npmPath=options.npmPath||(app.isPackaged?path.join(process.resourcesPath,'npm','bin','npm-cli.js'):npmCliPath());
processes = new ProcessService({workspaces,nodePath,npmPath,emit:event => {if (window && !window.isDestroyed()) window.webContents.send('mench:runtime',event);}});
ipcMain.handle('mench:request',async (event,request) => {
    if (!trusted(event)) return {ok:false,error:{message:'This frame is not authorized to access the desktop.',code:'FORBIDDEN'}};
    try {return {ok:true,value:await dispatch(request?.action,request?.payload)};}
    catch (error) {return {ok:false,error:{name:error.code === 'ENOENT' ? 'NotFoundError' : error.name,message:error.message,code:error.code}};}
});
protocol.handle('mench',async request => {
    const url = new URL(request.url);
    const target = path.resolve(assetDirectory,'.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (url.hostname !== 'workspace' || !inside(assetDirectory,target)) return new Response('Not found',{status:404});
    try {
        return new Response(await fs.readFile(target),{headers:{
            'Content-Type':contentTypes[path.extname(target)] || 'application/octet-stream',
            'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self' https://generativelanguage.googleapis.com http://127.0.0.1:* ws://127.0.0.1:*; frame-src 'self' http://127.0.0.1:*; img-src 'self' data: blob: http://127.0.0.1:*; font-src 'self' data:;"
        }});
    } catch {return new Response('Not found',{status:404});}
});
window = new BrowserWindow({
    width:1440,height:960,minWidth:800,minHeight:600,backgroundColor:'#18191b',show:false,
    autoHideMenuBar:true,title:'Mench AI',icon:path.join(here,'assets','mench.ico'),focusable:!background,skipTaskbar:background,
    webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,offscreen:background,backgroundThrottling:!background}
});
window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
window.webContents.on('will-prevent-unload',event=>{
    if(background){event.preventDefault();return;}
    const response=dialog.showMessageBoxSync(window,{type:'question',buttons:['Keep working','Close and keep drafts'],defaultId:0,cancelId:0,title:'Unsaved changes',message:'Your files have unsaved changes.',detail:'Closing keeps a recovery draft in Mench AI. Save your files first to write them to the project folder.'});
    if(response===1) event.preventDefault();
});
window.webContents.on('will-navigate',(event,url) => {if (!(development ? url.startsWith(devUrl + '/') : url.startsWith('mench://workspace/'))) event.preventDefault();});
if(!background)window.once('ready-to-show',() => window.show());
await window.loadURL(development ? devUrl : 'mench://workspace/index.html');
    return {window,
        activate(){if(background)return;if(window.isMinimized())window.restore();window.show();window.focus();},
        async dispose(){await processes.dispose();ipcMain.removeHandler('mench:request');protocol.unhandle('mench');if(!window.isDestroyed())window.destroy();}
    };
}
