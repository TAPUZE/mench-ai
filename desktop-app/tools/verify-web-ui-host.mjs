import {app,BrowserWindow,dialog,session} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const target=process.env.MENCH_WEB_URL,profile=process.env.MENCH_WEB_PROFILE,evidence=process.env.MENCH_WEB_EVIDENCE;
if(!target||!profile||!evidence)process.exit(1);
app.setName('Mench AI isolated web verification');app.setPath('userData',profile);app.setPath('sessionData',profile);app.disableHardwareAcceleration();
let visibleWindows=0,nativeDialogs=0,phase='startup';
for(const method of ['showErrorBox','showMessageBox','showMessageBoxSync','showOpenDialog','showOpenDialogSync','showSaveDialog','showSaveDialogSync'])dialog[method]=()=>{nativeDialogs++;throw new Error('Unexpected native dialog.');};
app.on('browser-window-created',(_event,window)=>window.on('show',()=>{visibleWindows++;app.exit(1);}));
app.whenReady().then(async()=>{
    const checks=[],errors=[],external=[];const verify=(condition,label)=>{if(!condition)throw new Error(label);checks.push(label);console.log('MENCH_WEB_CHECK:'+label);};
    const origin=new URL(target).origin;
    session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{const allowed=details.url.startsWith(origin+'/')||/^(?:blob:|data:|devtools:)/.test(details.url);if(!allowed)external.push(details.url);callback({cancel:!allowed});});
    const window=new BrowserWindow({show:false,focusable:false,width:1440,height:960,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}}),contents=window.webContents;
    contents.on('console-message',(_event,...args)=>{const message=typeof args[0]==='object'?args[0].message:args[1];if(message&&/Uncaught|Failed to load|Refused to|Could not create web worker/i.test(message))errors.push(message);});
    const evaluate=async(fn,...args)=>{try{return await contents.executeJavaScript('('+fn.toString()+')('+args.map(value=>JSON.stringify(value)).join(',')+')',true);}catch(error){throw new Error('Page evaluation '+fn.toString().slice(0,100)+': '+(error?.message||String(error)));}};
    const wait=async(fn,label)=>{const until=Date.now()+20000;while(Date.now()<until){if(await contents.executeJavaScript('(async()=>{try{return Boolean(await ('+fn.toString()+')());}catch{return false;}})()',true))return;await new Promise(resolve=>setTimeout(resolve,60));}throw new Error('Timed out: '+label+'\n'+await evaluate(()=>document.body.innerText.slice(-1800)));};
    const click=label=>evaluate(label=>{const button=[...document.querySelectorAll('button')].find(item=>!item.disabled&&(item.getAttribute('aria-label')===label||item.textContent.trim()===label||item.textContent.trim().startsWith(label)));if(!button)throw new Error('Missing button '+label);button.click();},label);
    const input=(selector,value)=>evaluate((selector,value)=>{const element=document.querySelector(selector);if(!element)throw new Error('Missing field '+selector);const prototype=element.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,value);element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));},selector,value);
    const screenshot=async name=>{await new Promise(resolve=>setTimeout(resolve,150));await fs.writeFile(path.join(evidence,name+'.png'),(await contents.capturePage()).toPNG());};
    await contents.loadURL(target);await wait(()=>document.querySelector('.mw-welcome'),'welcome');
    verify(!window.isVisible()&&!window.isFocusable()&&contents.isOffscreen(),'Remote browser workspace loads with zero visible or focusable windows');
    verify(await evaluate(()=>!window.menchDesktop&&typeof window.require==='undefined'&&window.isSecureContext),'The live page uses browser mode in a secure context without desktop privileges');
    verify(await evaluate(()=>document.body.innerText.includes('New project')&&document.body.innerText.includes('Open project')&&document.body.innerText.includes('Chrome or Edge')),'Welcome offers new/open projects and explains browser capabilities');await screenshot('01-live-welcome');
    await click('Settings');await input('select[name="assistantLanguage"]','he');verify(await evaluate(()=>document.querySelector('[name="communityProfile"]').selectedOptions[0].textContent.includes('Israeli')),'Hebrew defaults to the Israeli community on the live page');
    await input('select[name="communityProfile"]','english');await input('select[name="voice"]','feinstein');await click('Save settings');await wait(()=>!document.querySelector('[role="dialog"]'),'saved settings');
    // The chooser alone is replaced with genuine origin-private file handles in
    // this disposable browser profile. No OS picker or user folder is involved.
    await evaluate(()=>{window.showDirectoryPicker=async()=>navigator.storage.getDirectory();});
    await click('New project');await input('input[placeholder="my-first-project"]','Railway verification');await click('Choose location');await wait(()=>!document.querySelector('[role="dialog"] button.primary').disabled,'chosen fixture location');await click('Create project');
    await wait(()=>document.querySelector('.mw-code-editor')?.dataset.editorReady==='true','bundled Monaco editor');
    verify(await evaluate(async()=>{const project=await (await navigator.storage.getDirectory()).getDirectoryHandle('Railway verification');const names=[];for await(const [name] of project.entries())names.push(name);return ['index.html','styles.css','script.js'].every(name=>names.includes(name));}),'New project writes real starter files through browser file handles and loads bundled Monaco');
    phase='Monaco input';await wait(()=>document.querySelector('.monaco-editor textarea'),'Monaco input');phase='debugger attach';contents.debugger.attach('1.3');phase='editor focus';await evaluate(()=>document.querySelector('.monaco-editor textarea').focus());
    for(const type of ['keyDown','keyUp']){phase='select all '+type;await contents.debugger.sendCommand('Input.dispatchKeyEvent',{type,key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});}
    const edited='<h1>Live Railway verification</h1><script>document.querySelector("h1").dataset.ran="yes";</script>';
    phase='paste';await evaluate(content=>{const clipboardData=new DataTransfer();clipboardData.setData('text/plain',content);document.querySelector('.monaco-editor textarea').dispatchEvent(new ClipboardEvent('paste',{clipboardData,bubbles:true,cancelable:true}));},edited);
    await wait(()=>document.body.innerText.includes('1 unsaved'),'editor change');await click('Save');phase='save completion';await wait(()=>document.body.innerText.includes('All changes saved'),'save completion');
    await wait(async()=>{const project=await (await navigator.storage.getDirectory()).getDirectoryHandle('Railway verification');return (await (await project.getFileHandle('index.html')).getFile()).text().then(text=>text.includes('Live Railway verification'));},'saved browser file');
    verify(await evaluate(async()=>{const project=await (await navigator.storage.getDirectory()).getDirectoryHandle('Railway verification');return (await (await project.getFileHandle('index.html')).getFile()).text();})===edited,'Save writes the exact real Monaco edit to the isolated browser project');
    await click('Preview');await wait(()=>document.querySelector('iframe[title="Project preview"]'),'browser preview');
    let ran=false;for(let attempt=0;attempt<100&&!ran;attempt++){for(const frame of contents.mainFrame.frames){ran=await frame.executeJavaScript('document.querySelector("h1")?.dataset.ran === "yes"').catch(()=>false);if(ran)break;}if(!ran)await new Promise(resolve=>setTimeout(resolve,60));}
    verify(ran,'Sandboxed browser preview executes the actual saved project HTML and script');await screenshot('02-live-editor-preview');
    await contents.reload();await wait(()=>document.querySelector('.mw-welcome'),'reload');await click('Settings');
    verify(await evaluate(()=>document.querySelector('[name="assistantLanguage"]').value==='he'&&document.querySelector('[name="communityProfile"]').value==='english'&&document.querySelector('[name="voice"]').value==='feinstein'),'Explicit community and voice settings persist independently of answer language');await screenshot('03-live-community-settings');await click('Cancel');
    await click('Railway verification');await wait(()=>document.querySelector('.mw-code-editor')?.dataset.editorReady==='true','recent browser project');
    await wait(()=>document.querySelector('.monaco-editor .view-lines')?.textContent.replace(/\u00a0/g,' ').includes('Live Railway verification'),'saved content rendering');
    verify(await evaluate(()=>document.querySelector('.monaco-editor .view-lines').textContent.replace(/\u00a0/g,' ').includes('Live Railway verification')),'Recent projects reopen the saved browser file after a real page reload');
    verify(errors.length===0,'Live assets and editor workers load without browser errors: '+errors.join(' | '));verify(external.length===0,'The app and editor load without external CDN requests or AI calls');verify(nativeDialogs===0&&visibleWindows===0,'Verification never opens an OS dialog or visible window');
    console.log('MENCH_WEB_REPORT:'+JSON.stringify({passed:checks.length,checks,visibleWindows,nativeDialogs,aiVerified:false,fileChooser:'Isolated origin-private fixture, no user folders'}));window.destroy();app.quit();
}).catch(error=>{console.error(phase+': '+(error?.stack||JSON.stringify(error)));app.exit(1);});
