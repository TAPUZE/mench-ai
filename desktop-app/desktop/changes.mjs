import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {validateProposal} from '../shared/project-changes.mjs';
import {inside} from './workspaces.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
const conflict=message=>Object.assign(new Error(message),{code:'CONFLICT'});
export class ChangeService {
    constructor(workspaces){this.workspaces=workspaces;}
    directory(rootId){this.workspaces.record(rootId);return path.join(this.workspaces.dataDirectory,'changes',rootId);}
    async persist(record){const directory=this.directory(record.rootId);await fs.mkdir(directory,{recursive:true});await this.workspaces.atomic(path.join(directory,record.id+'.json'),JSON.stringify(record));}
    async get(rootId,id){
        if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id))throw new Error('Project change not found.');
        const record=JSON.parse(await fs.readFile(path.join(this.directory(rootId),id+'.json'),'utf8'));
        if(record.rootId!==rootId||record.id!==id)throw new Error('Invalid project change record.');
        validateProposal({format:'mench.changes.v1',summary:record.summary,changes:record.changes});
        for(const change of record.changes)if(typeof change.original!=='string'||digest(change.content)!==change.afterHash||(change.beforeHash?digest(change.original)!==change.beforeHash:change.original!==''))throw new Error('Project change recovery data is damaged. Use saved file history to recover.');
        return record;
    }
    async list(rootId){
        const directory=this.directory(rootId),records=[];
        for(const name of await fs.readdir(directory).catch(()=>[])){
            if(!/^[0-9a-f-]{36}\.json$/.test(name))continue;
            const record=await this.get(rootId,name.slice(0,-5));
            records.push({id:record.id,summary:record.summary,date:record.date,status:record.status,paths:record.selected||record.changes.map(change=>change.path)});
        }
        return records.sort((a,b)=>b.date-a.date).slice(0,100);
    }
    async current(rootId,relative){
        try{return await this.workspaces.read(rootId,relative);}catch(error){if(error.code==='ENOENT')return null;throw error;}
    }
    async prepare(rootId,proposal){
        const validated=validateProposal(proposal),changes=[];let size=0;
        for(const change of validated.changes){
            const current=await this.current(rootId,change.path);
            if(current?.text===change.content)continue;
            size+=current?.size||0;if(size>2*1024*1024)throw new Error('The files being reviewed exceed 2 MB. Review fewer files.');
            changes.push({...change,original:current?.text||'',beforeHash:current?.hash||null,afterHash:digest(change.content)});
        }
        if(!changes.length)throw new Error('The proposal does not change any files.');
        const record={id:randomUUID(),rootId,summary:validated.summary,changes,status:'prepared',date:Date.now(),createdDirectories:[]};
        await this.persist(record);return record;
    }
    async ensureParents(record,relative){
        const parts=relative.split('/').slice(0,-1);let parent='';
        for(const part of parts){
            parent=parent?parent+'/'+part:part;
            const target=await this.workspaces.resolve(record.rootId,parent,{missing:true});
            try{await fs.mkdir(target);record.createdDirectories.push(parent);await this.persist(record);}
            catch(error){if(error.code!=='EEXIST')throw error;if(!(await fs.stat(target)).isDirectory())throw new Error('A parent path is not a folder.');}
        }
    }
    async create(rootId,relative,content){
        const target=await this.workspaces.resolve(rootId,relative,{missing:true}),temporary=target+'.mench-'+randomUUID()+'.tmp';
        try{
            await fs.writeFile(temporary,content,{flag:'wx'});
            // A same-volume hard link creates the name exclusively, preserving
            // an external file that appears after the preflight existence check.
            await fs.link(temporary,target);
        }finally{await fs.unlink(temporary).catch(()=>{});}
    }
    async apply(rootId,id,selected){
        return this.workspaces.serialized('root:'+rootId,async()=>{
            const record=await this.get(rootId,id);
            if(record.status!=='prepared')throw new Error('This proposal has already been applied or interrupted. Prepare a fresh review.');
            if(!Array.isArray(selected)||!selected.length||new Set(selected).size!==selected.length||selected.some(relative=>!record.changes.some(change=>change.path===relative)))throw new Error('Choose files from this reviewed proposal.');
            const changes=record.changes.filter(change=>selected.includes(change.path));
            for(const change of changes){const current=await this.current(rootId,change.path);if((current?.hash||null)!==change.beforeHash)throw conflict(change.path+' changed after the review was prepared. Review a fresh proposal.');}
            record.selected=selected;record.status='applying';await this.persist(record);
            try{
                for(const change of changes){
                    if(change.beforeHash){await this.workspaces.write(rootId,change.path,change.content,change.beforeHash,{locked:true});}
                    else{await this.ensureParents(record,change.path);await this.create(rootId,change.path,change.content);}
                }
                record.status='applied';record.appliedAt=Date.now();await this.persist(record);
                return {id:record.id,status:record.status,paths:selected,summary:record.summary};
            }catch(error){
                record.status='recovery';record.error=error.message;await this.persist(record);
                try{await this.restore(record);record.status='rolled-back';await this.persist(record);}
                catch(recovery){record.recoveryError=recovery.message;await this.persist(record);throw Object.assign(new Error('The change was interrupted. Some files need recovery; open Project changes to review them. '+recovery.message),{code:'RECOVERY_REQUIRED',id:record.id});}
                throw error;
            }
        });
    }
    async restore(record){
        const changes=record.changes.filter(change=>record.selected.includes(change.path)),pending=[];
        // Check every file before restoring any of them. A later edit must never
        // be discarded simply because it followed an assistant change.
        for(const change of changes){
            const current=await this.current(record.rootId,change.path),hash=current?.hash||null;
            if(hash===change.beforeHash)continue;
            if(hash!==change.afterHash)throw conflict(change.path+' has newer edits. Keep them or restore that file from history before undoing this group.');
            pending.push(change);
        }
        for(const change of pending.reverse()){
            if(change.beforeHash)await this.workspaces.write(record.rootId,change.path,change.original,change.afterHash,{locked:true});
            else await this.workspaces.trash(record.rootId,change.path,{locked:true});
        }
        for(const relative of [...record.createdDirectories].reverse()){
            const target=await this.workspaces.resolve(record.rootId,relative,{missing:true}),root=this.workspaces.record(record.rootId).root;
            if(target===root||!inside(root,target))throw new Error('Invalid cleanup folder.');
            await fs.rmdir(target).catch(error=>{if(!['ENOTEMPTY','ENOENT','EEXIST'].includes(error.code))throw error;});
        }
    }
    async undo(rootId,id){
        return this.workspaces.serialized('root:'+rootId,async()=>{
            const record=await this.get(rootId,id);
            if(!['applied','applying','recovery'].includes(record.status))throw new Error('This project change does not need undo or recovery.');
            await this.restore(record);record.status='undone';record.undoneAt=Date.now();await this.persist(record);
            return {id,paths:record.selected,removed:record.changes.filter(change=>record.selected.includes(change.path)&&!change.beforeHash).map(change=>change.path)};
        });
    }
}
