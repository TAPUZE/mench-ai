import {app,dialog} from 'electron';
import path from 'node:path';
import {mkdirSync} from 'node:fs';
import {createWorkspaceApplication,registerWorkspaceScheme} from './application.mjs';

registerWorkspaceScheme();app.setName('Mench AI');
if(process.platform==='win32')app.setAppUserModelId('org.mench.workspace');
const profileArgument=process.argv.find(argument=>argument.startsWith('--profile-dir='));
if(profileArgument){const profile=path.resolve(profileArgument.slice('--profile-dir='.length));mkdirSync(profile,{recursive:true});app.setPath('userData',profile);app.setPath('sessionData',profile);}
let application,quitting=false;
if(!app.requestSingleInstanceLock())app.exit(0);
app.on('second-instance',()=>application?.activate());
app.whenReady().then(async()=>{
    application=await createWorkspaceApplication({development:process.argv.includes('--dev')});
    app.on('window-all-closed',()=>{if(quitting)return;quitting=true;application.dispose().finally(()=>app.quit());});
    app.on('before-quit',event=>{if(quitting)return;event.preventDefault();application.window.close();});
}).catch(error=>{dialog.showErrorBox('Mench AI could not start',error.message);app.exit(1);});
process.on('uncaughtException',error=>{dialog.showErrorBox('Mench AI encountered a problem',error.message);});
