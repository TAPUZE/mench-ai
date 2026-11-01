import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs/promises';
import path from 'node:path';
const leases=new WeakMap();
export function assertMaintenanceLock(lease,directory){
    const state=leases.get(lease);
    if(!state||!state.db.isOpen||path.resolve(directory)!==state.directory)throw new Error('Stop the service and acquire its maintenance lock before this operation.');
}

// A separate SQLite transaction holds a real OS file lock. A process crash
// releases it automatically; a leftover file never acts as proof of a live PID.
export async function acquireMaintenanceLock(directory){
    await fs.mkdir(directory,{recursive:true});const filename=path.join(path.resolve(directory),'service-lock.sqlite');
    const metadata=await fs.lstat(filename).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(metadata?.isSymbolicLink())throw new Error('The school service lock cannot be a symbolic link.');
    let db;
    try{db=new DatabaseSync(filename);db.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE;');}
    catch(error){if(db?.isOpen)db.close();throw new Error('Another school service or maintenance operation is using this data directory. Stop it before retrying.');}
    const lease={release(){if(db.isOpen){db.exec('ROLLBACK');db.close();}}};leases.set(lease,{db,directory:path.resolve(directory)});return lease;
}
