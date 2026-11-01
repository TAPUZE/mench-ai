import {app,safeStorage} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import {CredentialVault} from '../desktop/credentials.mjs';

// Deliberately creates no BrowserWindow, dialog, tray, or visible surface.
const directory=process.env.MENCH_CREDENTIAL_TEST_DIRECTORY;
if(!directory)process.exit(1);
app.setName('Mench AI credential verification');app.setPath('userData',directory);
app.whenReady().then(async()=>{
    const filename=path.join(directory,'credential-smoke.enc');
    const vault=new CredentialVault(filename,safeStorage);
    const value='mench-credential-smoke-only';
    await vault.update(current=>({...current,smoke:value}));
    const reopened=new CredentialVault(filename,safeStorage);
    if((await reopened.read()).smoke!==value)throw new Error('Credential round trip failed.');
    if((await fs.readFile(filename)).includes(Buffer.from(value)))throw new Error('Credential bytes were stored as plaintext.');
    await fs.writeFile(filename,'damaged-vault-fixture');let unreadable=false;
    try{await new CredentialVault(filename,safeStorage).read();}catch{unreadable=true;}
    if(!unreadable)throw new Error('Damaged credential file was not rejected.');
    await reopened.clear();
    const recovered=new CredentialVault(filename,safeStorage);await recovered.update(()=>({smoke:'recovered-smoke-only'}));
    if((await new CredentialVault(filename,safeStorage).read()).smoke!=='recovered-smoke-only')throw new Error('Credential recovery after clearing failed.');
    console.log('Windows credential encryption, persistent reopening, and damaged-vault recovery passed.');app.exit(0);
}).catch(error=>{console.error(error.message);app.exit(1);});
