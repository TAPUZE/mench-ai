import {validateCommunities} from '../shared/community-profiles.mjs';
import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs/promises';
import {createReadStream,constants} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {now,fail,digest} from './validation.mjs';
import {pageSearch} from './pagination.mjs';
import {assertMaintenanceLock} from './maintenance-lock.mjs';
import {sourceFields,sourceHash} from './knowledge.mjs';
import {normalizeSearch} from '../shared/chat-context.mjs';
import {storedMessages} from '../shared/chat-history.mjs';

const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const tables=['users','sessions','invitations','password_resets','policies','audit','classrooms','enrollment','templates','assignments','submissions','review_queue'];
async function readCatalogFile(filename){
    const info=await fs.lstat(filename);if(!info.isFile()||info.isSymbolicLink()||info.size>65536)throw new Error('Invalid backup catalog file.');
    const chunks=[];let size=0;for await(const chunk of createReadStream(filename,{highWaterMark:16384})){size+=chunk.length;if(size>65536)throw new Error('Backup catalog record exceeds 64 KB.');chunks.push(chunk);}return Buffer.concat(chunks).toString('utf8');
}
function catalogRecord(value,id){
    const valid=value?.format==='mench.backup.v1'&&value.id===id&&typeof value.createdAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.createdAt)&&Number.isFinite(Date.parse(value.createdAt))&&['manual','automatic','pre-restore'].includes(value.purpose)&&/^[a-f0-9]{64}$/.test(value.sha256)&&Number.isSafeInteger(value.size)&&value.size>0;
    const summary=value?.summary;
    if(!valid||![2,3,4].includes(summary?.schemaVersion)||!['draft','approved'].includes(summary?.policyStatus)||!Number.isSafeInteger(summary.policyVersion)||summary.policyVersion<1||['accounts','classes','assignments','submissions'].some(key=>!Number.isSafeInteger(summary[key])||summary[key]<0))throw new Error('Damaged backup catalog record.');
    return {format:value.format,id,createdAt:value.createdAt,purpose:value.purpose,sha256:value.sha256,size:value.size,summary:{schemaVersion:summary.schemaVersion,accounts:summary.accounts,classes:summary.classes,assignments:summary.assignments,submissions:summary.submissions,policyVersion:summary.policyVersion,policyStatus:summary.policyStatus}};
}
export async function fileHash(filename){const hash=createHash('sha256');for await(const chunk of createReadStream(filename))hash.update(chunk);return hash.digest('hex');}
async function syncFile(filename){const file=await fs.open(filename,'r+');try{await file.sync();}finally{await file.close();}}
async function atomicJson(filename,value){const temporary=filename+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temporary,JSON.stringify(value,null,2),{flag:'wx',mode:0o600});await syncFile(temporary);await fs.rename(temporary,filename);}finally{await fs.rm(temporary,{force:true});}}
export function inspectDatabase(db){
    db.exec('PRAGMA trusted_schema=OFF');
    const version=db.prepare('PRAGMA user_version').get().user_version;
    if(![2,3,4].includes(version))throw new Error('This school database version cannot be restored by this program.');
    const present=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name));
    if([...tables,...(version>=3?['knowledge_sources','knowledge_chunks','knowledge_fts','chat_histories']:[])].some(name=>!present.has(name)))throw new Error('The school database is missing required tables.');
    const integrity=db.prepare('PRAGMA quick_check').all();if(integrity.length!==1||Object.values(integrity[0])[0]!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('The school database failed its integrity check.');
    const count=table=>db.prepare('SELECT COUNT(*) AS count FROM '+table).get().count;
    const policy=db.prepare('SELECT version,status,rules FROM policies ORDER BY version DESC LIMIT 1').get();if(!policy)throw new Error('The school database has no content policy.');
    try{
        const rules=JSON.parse(policy.rules);if(typeof rules.instructions!=='string'||!Array.isArray(rules.blockedTerms)||rules.blockedTerms.some(term=>typeof term!=='string'))throw new Error();
        if(rules.communityProfiles)validateCommunities(rules.communityProfiles);
        for(const table of ['templates','submissions'])for(const row of db.prepare('SELECT files FROM '+table).iterate()){
            const files=JSON.parse(row.files);if(!Array.isArray(files)||!files.length||files.length>40||files.some(file=>typeof file?.path!=='string'||typeof file.content!=='string'))throw new Error();
        }
        if(version>=3){
            for(const row of db.prepare('SELECT * FROM knowledge_sources').iterate()){
                const fields=sourceFields({title:row.title,reference:row.reference,author:row.author,edition:row.edition,language:row.language,keywords:row.keywords,originUrl:row.origin_url,body:row.body});
                if(version===4&&!['legacy','english','israeli','both'].includes(row.approval_scope))throw new Error();
                if(sourceHash(JSON.stringify(fields))!==row.content_hash||row.status==='approved'&&(!row.approved_by||!row.approval_policy_id))throw new Error();
                let end=0,position=0;
                for(const chunk of db.prepare('SELECT * FROM knowledge_chunks WHERE source_id=? ORDER BY position').iterate(row.id)){
                    if(chunk.position!==position++||chunk.start_offset!==end||chunk.body!==row.body.slice(chunk.start_offset,chunk.end_offset)||chunk.end_offset<=end||chunk.body.length>1600)throw new Error();
                    end=chunk.end_offset;
                }
                if(end!==row.body.length)throw new Error();
            }
            const seen=new Set();
            for(const row of db.prepare('SELECT * FROM knowledge_fts').iterate()){
                const chunk=db.prepare('SELECT c.body,s.title,s.reference,s.keywords FROM knowledge_chunks c JOIN knowledge_sources s ON s.id=c.source_id WHERE c.id=?').get(row.chunk_id);
                if(!chunk||seen.has(row.chunk_id)||['title','reference','keywords','body'].some(key=>row[key]!==normalizeSearch(chunk[key])))throw new Error();
                seen.add(row.chunk_id);
            }
            if(seen.size!==count('knowledge_chunks'))throw new Error();
            for(const row of db.prepare('SELECT messages,brief FROM chat_histories').iterate()){
                if(JSON.stringify(storedMessages(JSON.parse(row.messages)))!==row.messages||typeof row.brief!=='string'||row.brief.length>4000)throw new Error();
            }
        }
    }catch{throw new Error('The school database contains invalid policy, project, source, index, or conversation data.');}
    return {schemaVersion:version,accounts:count('users'),classes:count('classrooms'),assignments:count('assignments'),submissions:count('submissions'),policyVersion:policy.version,policyStatus:policy.status};
}
export class BackupManager {
    constructor(store,{directory=path.join(path.dirname(store.filename),'backups'),automatic=false,keepAutomatic=14}={}){
        if(!Number.isInteger(keepAutomatic)||keepAutomatic<1||keepAutomatic>365)throw new Error('Keep between 1 and 365 automatic backups.');
        this.store=store;this.directory=path.resolve(directory);this.automatic=automatic;this.keepAutomatic=keepAutomatic;this.pending=Promise.resolve();this.running=false;this.lastError=null;
    }
    file(id,extension){if(typeof id!=='string'||!idPattern.test(id))fail('Invalid backup identifier.');const filename=path.resolve(this.directory,id+extension);if(path.dirname(filename)!==this.directory)throw new Error('Invalid backup location.');return filename;}
    async list(){
        const records=[];let damaged=0;
        for(const name of await fs.readdir(this.directory).catch(error=>{if(error.code==='ENOENT')return [];throw error;})){
            if(!name.endsWith('.json')||!idPattern.test(name.slice(0,-5)))continue;
            try{records.push(catalogRecord(JSON.parse(await readCatalogFile(this.file(name.slice(0,-5),'.json'))),name.slice(0,-5)));}catch{damaged++;}
        }
        this.catalogWarnings=damaged;
        return records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
    }
    async status(){const records=await this.list();return {automatic:this.automatic,keepAutomatic:this.keepAutomatic,running:this.running,lastError:[this.lastError,this.catalogWarnings?this.catalogWarnings+' unreadable backup catalog records were kept for administrator inspection.':null].filter(Boolean).join(' ')||null,latest:records[0]||null,total:records.length};}
    async page(input={},actorId='local'){
        const limit=input.limit??25;if(!Number.isInteger(limit)||limit<1||limit>50)fail('Choose a page size between 1 and 50.');
        const search=pageSearch(input),fingerprint=digest(JSON.stringify(['backups',actorId,search])).slice(0,24);let before=null;
        if(input.cursor!=null){
            if(typeof input.cursor!=='string'||input.cursor.length>256||!/^[A-Za-z0-9_-]+$/.test(input.cursor))fail('Invalid backup page cursor.');
            let parts;try{parts=JSON.parse(Buffer.from(input.cursor,'base64url').toString('utf8'));}catch{fail('Invalid backup page cursor.');}
            if(!Array.isArray(parts)||parts.length!==3||parts[0]!==1||parts[2]!==fingerprint||typeof parts[1]!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z\|[0-9a-f-]{36}$/.test(parts[1]))fail('This page cursor does not match the current backup search.');before=parts[1];
        }
        const key=record=>record.createdAt+'|'+record.id,records=(await this.list()).filter(record=>(record.id+' '+record.purpose+' '+record.createdAt).toLowerCase().includes(search)),remaining=records.filter(record=>!before||key(record)<before),items=remaining.slice(0,limit);
        return {items,total:records.length,nextCursor:remaining.length>items.length?Buffer.from(JSON.stringify([1,key(items.at(-1)),fingerprint])).toString('base64url'):null};
    }
    create(actor,purpose='manual'){
        if(!['manual','automatic','pre-restore'].includes(purpose))throw new Error('Invalid backup purpose.');
        const operation=this.pending.catch(()=>{}).then(async()=>{
            this.running=true;
            const id=randomUUID(),temporary=this.file(id,'.sqlite.tmp'),target=this.file(id,'.sqlite');
            try{
                if(purpose==='automatic'){
                    const existing=(await this.list()).find(record=>record.purpose==='automatic'&&record.createdAt.slice(0,10)===now().slice(0,10));
                    if(existing)return existing;
                }
                await fs.mkdir(this.directory,{recursive:true,mode:0o700});await fs.writeFile(temporary,'',{flag:'wx',mode:0o600});
                this.store.audit?.(actor,'backup.started',id,{purpose});
                await backup(this.store.db,temporary);
                const snapshot=new DatabaseSync(temporary,{readOnly:true});let summary;try{summary=inspectDatabase(snapshot);}finally{snapshot.close();}
                await syncFile(temporary);await fs.chmod(temporary,0o600);await fs.rename(temporary,target);
                const metadata={format:'mench.backup.v1',id,createdAt:now(),purpose,sha256:await fileHash(target),size:(await fs.stat(target)).size,summary};
                await atomicJson(this.file(id,'.json'),metadata);this.store.audit?.(actor,'backup.completed',id,{purpose,sha256:metadata.sha256});
                this.lastError=null;
                if(purpose==='automatic')await this.prune().catch(()=>{this.lastError='The new snapshot is verified, but older automatic backups could not be cleaned up. Check the backup catalog.';});
                return metadata;
            }catch(error){this.lastError='The last backup failed. Check the school service log.';throw error;}
            finally{this.running=false;await fs.rm(temporary,{force:true});}
        });this.pending=operation;return operation;
    }
    async verify(id){
        const bytes=await readCatalogFile(this.file(id,'.json')).catch(error=>{if(error.code==='ENOENT')fail('This backup was not found.',404,'NOT_FOUND');fail('This backup has a damaged catalog. The current school database has not been changed.',409,'BACKUP_INVALID');});
        let metadata,checksum;try{metadata=catalogRecord(JSON.parse(bytes),id);const info=await fs.lstat(this.file(id,'.sqlite'));if(!info.isFile()||info.isSymbolicLink())throw new Error('Invalid snapshot file.');checksum=await fileHash(this.file(id,'.sqlite'));}catch{fail('This backup has a damaged catalog or missing data. The current school database has not been changed.',409,'BACKUP_INVALID');}
        if(metadata.sha256!==checksum)fail('This backup failed checksum verification. The current school database has not been changed.',409,'BACKUP_INVALID');
        let snapshot,summary;try{snapshot=new DatabaseSync(this.file(id,'.sqlite'),{readOnly:true});summary=inspectDatabase(snapshot);}catch{fail('This backup failed its database integrity check. Current school data has not been changed.',409,'BACKUP_INVALID');}finally{snapshot?.close();}
        if(JSON.stringify(summary)!==JSON.stringify(metadata.summary))fail('This backup does not match its recorded summary.',409,'BACKUP_INVALID');return {...metadata,verified:true};
    }
    async prune(){
        const records=(await this.list()).filter(record=>record.purpose==='automatic');
        for(const record of records.slice(this.keepAutomatic)){
            // Delete only generated automatic snapshots with valid app catalog
            // records. Manual and pre-restore backups are never auto-pruned.
            await this.verify(record.id);await fs.unlink(this.file(record.id,'.sqlite'));await fs.unlink(this.file(record.id,'.json'));
        }
    }
    async ensureAutomatic(){
        if(!this.automatic||this.store.status?.().setupRequired)return null;
        const existing=(await this.list()).find(record=>record.purpose==='automatic'&&record.createdAt.slice(0,10)===now().slice(0,10));
        return existing||this.create(null,'automatic');
    }
    async idle(){await this.pending.catch(()=>{});}
}

// The caller must hold acquireMaintenanceLock for the data directory. Restore
// is deliberately an offline operation, never a student/admin HTTP action.
export async function assertNoPendingRestore(filename){
    const directory=path.dirname(filename);
    let state;try{state=JSON.parse(await fs.readFile(path.join(directory,'restore-state.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('The restore recovery record could not be read. Ask the service administrator to inspect it.');}
    if(state&&!['complete','rolled-back'].includes(state.status)){
        const id=idPattern.test(state.backupId)?state.backupId:'the chosen backup';
        throw new Error('An interrupted school restore needs recovery. Re-run maintenance restore for '+id+' with --confirm and --replace-damaged before starting the service. Original data and safety copies have been kept.');
    }
    if(await fs.access(filename).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;}))return;
    const files=await fs.readdir(directory),backups=await fs.readdir(path.join(directory,'backups')).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
    if(state||files.some(name=>name.startsWith('restore-original-')||[path.basename(filename)+'-wal',path.basename(filename)+'-journal'].includes(name))||backups.some(name=>name.endsWith('.json')&&idPattern.test(name.slice(0,-5))))throw new Error('The school database is missing, but previous school data or backups remain. Restore a verified backup with maintenance restore --id ID --confirm ID --replace-damaged. A fresh empty school was not created.');
}
export async function restoreBackup({filename,id,confirmedId,backupDirectory=path.join(path.dirname(filename),'backups'),lease,replaceDamaged=false}){
    if(id!==confirmedId)throw new Error('Preview the backup, then repeat restore with --confirm and its exact ID.');
    filename=path.resolve(filename);const directory=path.dirname(filename);
    assertMaintenanceLock(lease,directory);
    const manager=new BackupManager({filename},{directory:backupDirectory});const selected=await manager.verify(id);
    const present=await fs.access(filename).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
    let current,safety=null,currentState=present?'unverified':'missing';
    try{
        if(present){try{current=new DatabaseSync(filename,{readOnly:true});inspectDatabase(current);currentState='verified';}catch(error){
            if([5,6].includes(Number(error.errcode)&255))throw new Error('The school database is in use. Stop other database tools before restoring.');
            if(!replaceDamaged)throw new Error('The current school database could not be verified. Repeat restore with --replace-damaged to preserve its raw files and replace it from this verified backup.');
        }}
        else if(!replaceDamaged)throw new Error('The current school database is missing. Repeat restore with --replace-damaged to recreate it from this verified backup.');
        if(currentState==='verified'){
            current.close();current=new DatabaseSync(filename);inspectDatabase(current);
            current.exec('PRAGMA busy_timeout=0');const checkpoint=current.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();if(checkpoint.busy)throw new Error('The school database is in use. Stop other database tools before restoring.');
            const mode=Object.values(current.prepare('PRAGMA journal_mode=DELETE').get())[0];if(mode!=='delete')throw new Error('The school database is in use.');
            const safetyManager=new BackupManager({filename,db:current},{directory:backupDirectory});safety=await safetyManager.create(null,'pre-restore');
        }
    }finally{if(current?.isOpen)current.close();}
    if(currentState==='verified')for(const suffix of ['-wal','-shm'])if(await fs.access(filename+suffix).then(()=>true,()=>false))throw new Error('The school database still has active journal files. Stop other database tools before restoring.');
    const operation=randomUUID(),staged=path.join(directory,'restore-staged-'+operation+'.sqlite'),original=path.join(directory,'restore-original-'+operation+'.sqlite');
    const quarantine=path.join(directory,'restore-original-'+operation),stateFile=path.join(directory,'restore-state.json');
    if([staged,original,quarantine,stateFile].some(target=>path.dirname(path.resolve(target))!==directory))throw new Error('Invalid restore staging location.');
    let state;
    try{
        await fs.copyFile(manager.file(id,'.sqlite'),staged,constants.COPYFILE_EXCL);
        if(await fileHash(staged)!==selected.sha256)throw new Error('The backup changed while it was being prepared. Restore was cancelled.');
        const restored=new DatabaseSync(staged);
        try{
            restored.exec('PRAGMA trusted_schema=OFF; PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; BEGIN IMMEDIATE;');
            restored.exec('DELETE FROM sessions; DELETE FROM invitations; DELETE FROM password_resets;');
            const policy=restored.prepare('SELECT * FROM policies ORDER BY version DESC LIMIT 1').get();
            restored.prepare('INSERT INTO policies(id,version,rules,status,created_at) VALUES(?,?,?,?,?)').run(randomUUID(),policy.version+1,policy.rules,'draft',now());
            restored.prepare('INSERT INTO audit(actor_id,action,target,details,created_at) VALUES(?,?,?,?,?)').run(null,'backup.restored',id,JSON.stringify({sha256:selected.sha256,safetyBackupId:safety?.id||null,previousDatabaseState:currentState,sessionsRevoked:true,policyReapprovalRequired:true}),now());
            restored.exec('COMMIT');inspectDatabase(restored);
        }finally{restored.close();}
        await syncFile(staged);
        const originals=[];
        if(currentState==='verified')originals.push({source:path.basename(filename),saved:path.basename(original)});
        else{
            for(const suffix of ['','-wal','-shm','-journal'])if(await fs.access(filename+suffix).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;}))originals.push({source:path.basename(filename)+suffix,saved:path.basename(quarantine)+'/'+path.basename(filename)+suffix});
            if(originals.length)await fs.mkdir(quarantine,{mode:0o700});
        }
        for(const entry of originals){const source=path.resolve(directory,entry.source),saved=path.resolve(directory,entry.saved);if(path.dirname(source)!==directory||!saved.startsWith(directory+path.sep))throw new Error('Invalid original-data preservation path.');entry.sha256=await fileHash(source);}
        let previous=null;try{previous=await fs.readFile(stateFile);}catch(error){if(error.code!=='ENOENT')throw error;}
        const previousFile=previous?'restore-history-'+operation+'.json':null;
        if(previous){const history=path.join(directory,previousFile);await fs.writeFile(history,previous,{flag:'wx',mode:0o600});await syncFile(history);}
        state={format:'mench.restore.v1',operation,backupId:id,createdAt:now(),status:'prepared',currentState,staged:path.basename(staged),stagedSha256:await fileHash(staged),originals,safetyBackupId:safety?.id||null,previousFile};
        await atomicJson(stateFile,state);
        const moved=[];
        try{
            // Each resolved source is in this data directory; each destination
            // is an explicit generated preservation path within the directory.
            for(const entry of originals){await fs.rename(path.join(directory,entry.source),path.join(directory,entry.saved));moved.push(entry);}
            await fs.rename(staged,filename);state.status='complete';await atomicJson(stateFile,state);
        }catch(error){
            // If publication happened but writing the completion record failed,
            // retain the pending record so startup cannot silently continue.
            const published=await fs.access(staged).then(()=>false,()=>true);
            if(!published){
                for(const entry of moved.reverse())await fs.rename(path.join(directory,entry.saved),path.join(directory,entry.source));state.status='rolled-back';await atomicJson(stateFile,state);
            }
            throw error;
        }
        return {restored:true,id,safetyBackupId:safety?.id||null,originalFile:originals.length?(currentState==='verified'?path.basename(original):path.basename(quarantine)):null,previousDatabaseState:currentState,policyStatus:'draft',sessionsRevoked:true};
    }finally{await fs.rm(staged,{force:true});}
}
