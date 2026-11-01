import path from 'node:path';
import fs from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {SchoolStore} from './store.mjs';
import {BackupManager,restoreBackup,assertNoPendingRestore} from './backups.mjs';
import {acquireMaintenanceLock} from './maintenance-lock.mjs';
import {schoolDataDirectory} from './paths.mjs';

export async function maintenance(args=process.argv.slice(2)){
    const {values,positionals}=parseArgs({args,allowPositionals:true,options:{data:{type:'string'},id:{type:'string'},username:{type:'string'},confirm:{type:'string'},'replace-damaged':{type:'boolean'}}});
    if(positionals.length!==1||!['list','verify','backup','restore','recover-admin'].includes(positionals[0]))throw new Error('Choose list, verify --id ID, backup, restore --id ID --confirm ID, or recover-admin --username NAME --confirm NAME.');
    const operation=positionals[0],directory=schoolDataDirectory({explicit:values.data}),filename=path.join(directory,'school.sqlite');
    const catalog=new BackupManager({filename});
    if(operation==='list')return {backups:await catalog.list()};
    if(operation==='verify')return catalog.verify(values.id);
    if(operation==='restore'&&values.id!==values.confirm)throw new Error('Preview with verify --id ID, then restore with --id ID --confirm ID.');
    if(operation==='recover-admin'&&(!values.username||values.confirm!==values.username))throw new Error('Use --username NAME --confirm NAME to sign out that administrator and issue a one-use reset token.');
    if(operation!=='restore')await fs.access(filename);const lease=await acquireMaintenanceLock(directory);
    try{
        if(operation==='restore')return await restoreBackup({filename,id:values.id,confirmedId:values.confirm,replaceDamaged:values['replace-damaged']===true,lease});
        await assertNoPendingRestore(filename);
        const store=await SchoolStore.open(filename);
        try{
            if(operation==='backup')return await new BackupManager(store).create(null,'manual');
            const reset=store.offlineAdminReset(values.username,lease),tokenFile=path.join(directory,'admin-recovery-'+randomUUID()+'.txt');
            await fs.writeFile(tokenFile,reset.token,{flag:'wx',mode:0o600});
            return {username:reset.username,expiresAt:reset.expiresAt,resetTokenFile:tokenFile,sessionsRevoked:true};
        }finally{store.close();}
    }finally{lease.release();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    maintenance().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
