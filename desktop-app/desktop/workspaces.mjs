import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';

const hash = text => createHash('sha256').update(text).digest('hex');
export const ignoredDirectories = new Set(['node_modules','.git','dist','build','.next','.mench']);
export const editableFile = name => /\.(html?|css|scss|js|mjs|cjs|jsx|ts|tsx|json|md|txt|py|java|c|cpp|h|svg|xml|ya?ml|toml|sql|sh|env|gitignore)$/i.test(name) || !name.includes('.');
export const inside = (root,target) => {
    const relative = path.relative(root,target);
    return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};

export class WorkspaceService {
    constructor(dataDirectory) {
        this.dataDirectory = dataDirectory;
        this.roots = new Map();
        this.locks = new Map();
    }
    async initialize() {
        await fs.mkdir(this.dataDirectory,{recursive:true});
        try {
            const records = JSON.parse(await fs.readFile(path.join(this.dataDirectory,'workspaces.json'),'utf8'));
            for (const record of records) if (typeof record.id === 'string' && typeof record.root === 'string') this.roots.set(record.id,record);
        } catch (error) {if (error.code !== 'ENOENT') throw new Error('Workspace history could not be read: ' + error.message);}
    }
    async persist() {
        await this.atomic(path.join(this.dataDirectory,'workspaces.json'),JSON.stringify([...this.roots.values()],null,2));
    }
    async grant(directory,{remember = false} = {}) {
        const root = await fs.realpath(directory);
        if (!(await fs.stat(root)).isDirectory()) throw new Error('Choose a project folder.');
        let record = [...this.roots.values()].find(item => item.root === root);
        if (!record) {record = {id:randomUUID(),root,name:path.basename(root),lastOpened:0};this.roots.set(record.id,record);}
        if (remember) record.lastOpened = Date.now();
        await this.persist();
        return {...record};
    }
    record(rootId) {
        const root = this.roots.get(rootId);
        if (!root) throw new Error('This folder is not authorized. Open it using the folder picker.');
        return root;
    }
    async resolve(rootId,relative = '',{missing = false} = {}) {
        const record = this.record(rootId);
        if (typeof relative !== 'string' || relative.length > 4096 || relative.includes('\0') || path.isAbsolute(relative) || /^[a-z]:/i.test(relative)) throw new Error('Invalid project path.');
        const segments = relative.replaceAll('\\','/').split('/');
        if (segments.some(segment => segment === '..')) throw new Error('A project path cannot leave its folder.');
        if(segments.some(segment=>/[<>:"|?*]|[. ]$/.test(segment)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(segment)))throw new Error('Invalid Windows project path.');
        const target = path.resolve(record.root,...segments);
        if (!inside(record.root,target)) throw new Error('A project path cannot leave its folder.');
        let ancestor = target;
        while (true) {
            try {
                const real = await fs.realpath(ancestor);
                if (!inside(record.root,real)) throw new Error('Links outside the project folder are not accessible.');
                break;
            } catch (error) {
                if (!missing || error.code !== 'ENOENT' || ancestor === record.root) throw error;
                ancestor = path.dirname(ancestor);
            }
        }
        return target;
    }
    async entries(rootId,relative = '') {
        const directory = await this.resolve(rootId,relative);
        const entries = await fs.readdir(directory,{withFileTypes:true});
        return entries.filter(entry => !entry.isSymbolicLink()).map(entry => ({name:entry.name,kind:entry.isDirectory() ? 'directory' : 'file'}));
    }
    async directory(rootId,relative,{create = false} = {}) {
        const target = await this.resolve(rootId,relative,{missing:create});
        if (create) await fs.mkdir(target,{recursive:false}).catch(error => {if (error.code !== 'EEXIST') throw error;});
        if (!(await fs.stat(target)).isDirectory()) throw new Error('This entry is not a folder.');
        return {kind:'directory',name:path.basename(target),path:relative};
    }
    async file(rootId,relative,{create = false} = {}) {
        const target = await this.resolve(rootId,relative,{missing:create});
        if (create) {
            const handle = await fs.open(target,'wx').catch(error => {if (error.code !== 'EEXIST') throw error;return null;});
            await handle?.close();
        }
        if (!(await fs.stat(target)).isFile()) throw new Error('This entry is not a file.');
        return {kind:'file',name:path.basename(target),path:relative};
    }
    async read(rootId,relative) {
        const target = await this.resolve(rootId,relative);
        const metadata = await fs.stat(target);
        if (!metadata.isFile() || metadata.size > 2*1024*1024) throw new Error('Open a text file smaller than 2 MB.');
        const bytes=await fs.readFile(target);
        if(bytes.length>2*1024*1024||bytes.includes(0))throw new Error('Open a text file smaller than 2 MB. Binary files cannot be edited here.');
        let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{throw new Error('This file is not valid UTF-8. Convert its encoding before editing it.');}
        return {text,size:metadata.size,modified:metadata.mtimeMs,hash:hash(text)};
    }
    async serialized(key,operation) {
        const previous = this.locks.get(key) || Promise.resolve();
        const next = previous.catch(() => {}).then(operation);
        this.locks.set(key,next);
        try {return await next;} finally {if (this.locks.get(key) === next) this.locks.delete(key);}
    }
    async write(rootId,relative,content,expectedHash,{locked=false}={}) {
        if(!locked)return this.serialized('root:'+rootId,()=>this.write(rootId,relative,content,expectedHash,{locked:true}));
        if (typeof content !== 'string' || content.includes('\0') || Buffer.byteLength(content) > 2*1024*1024) throw new Error('Save a text file smaller than 2 MB.');
        const target = await this.resolve(rootId,relative);
        return this.serialized(target,async () => {
            const previous = await fs.readFile(target,'utf8');
            if (expectedHash && hash(previous) !== expectedHash) throw Object.assign(new Error('This file changed on disk. Reload it before saving.'),{code:'CONFLICT'});
            if (previous !== content) {
                const history = path.join(this.dataDirectory,'history',rootId,hash(relative));
                await fs.mkdir(history,{recursive:true});
                await fs.writeFile(path.join(history,Date.now() + '-' + randomUUID() + '.txt'),previous,{flag:'wx'});
                const revisions = (await fs.readdir(history)).sort().reverse();
                for (const old of revisions.slice(20)) await fs.unlink(path.join(history,old));
                await this.atomic(target,content,{beforeRename:async()=>{
                    if(await this.resolve(rootId,relative)!==target||hash(await fs.readFile(target,'utf8'))!==hash(previous))throw Object.assign(new Error('This file changed on disk. Reload it before saving.'),{code:'CONFLICT'});
                }});
            }
            return {hash:hash(content)};
        });
    }
    async atomic(target,content,{beforeRename}={}) {
        const temporary = target + '.mench-' + randomUUID() + '.tmp';
        try {
            await fs.writeFile(temporary,content,{flag:'wx'});
            for(let attempt=0;;attempt++){
                await beforeRename?.();
                try{await fs.rename(temporary,target);break;}
                catch(error){
                    if(process.platform!=='win32'||!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=7)throw error;
                    await new Promise(resolve=>setTimeout(resolve,Math.min(40*2**attempt,250)));
                }
            }
        }
        finally {await fs.unlink(temporary).catch(() => {});}
    }
    async remember(rootId) {
        const record = this.record(rootId);
        await this.resolve(rootId);
        record.lastOpened = Date.now();await this.persist();
        return {...record};
    }
    recent() {return [...this.roots.values()].filter(record => record.lastOpened > 0).sort((a,b) => b.lastOpened-a.lastOpened).slice(0,12);}
    async search(rootId,query,{content = true} = {}) {
        if (typeof query !== 'string' || query.length < 1 || query.length > 300) return [];
        const results = [];
        const needle = query.toLowerCase();
        const walk = async (relative = '',depth = 0) => {
            if (depth > 10 || results.length >= 200) return;
            for (const entry of await this.entries(rootId,relative)) {
                const entryPath = relative ? relative + '/' + entry.name : entry.name;
                if (entry.kind === 'directory') {if (!ignoredDirectories.has(entry.name)) await walk(entryPath,depth+1);continue;}
                if (entryPath.toLowerCase().includes(needle)) results.push({path:entryPath,line:0,text:'File name matches'});
                if (content && editableFile(entry.name) && !/^\.env(?:\.|$)/.test(entry.name)) {
                    const data = await this.read(rootId,entryPath).catch(() => null);
                    if (data) for (const [index,line] of data.text.split('\n').entries()) {
                        if (line.toLowerCase().includes(needle)) results.push({path:entryPath,line:index+1,text:line.trim().slice(0,220)});
                        if (results.length >= 200) break;
                    }
                }
                if (results.length >= 200) break;
            }
        };
        await walk();return results.slice(0,200);
    }
    async rename(rootId,from,to,{locked=false}={}) {
        if(!locked)return this.serialized('root:'+rootId,()=>this.rename(rootId,from,to,{locked:true}));
        if (!from || !to) throw new Error('Choose a file or folder to rename.');
        this.userEntry(from);this.userEntry(to);
        const source = await this.resolve(rootId,from);
        const target = await this.resolve(rootId,to,{missing:true});
        try {await fs.lstat(target);throw new Error('An entry with that name already exists.');}
        catch (error) {if (error.code !== 'ENOENT') throw error;}
        await fs.rename(source,target);return {from,to};
    }
    async trash(rootId,relative,{locked=false}={}){
        if(!locked)return this.serialized('root:'+rootId,()=>this.trash(rootId,relative,{locked:true}));
        this.userEntry(relative);
        const source=await this.resolve(rootId,relative),root=this.record(rootId).root;
        if(source===root||!inside(root,source))throw new Error('The project folder cannot be moved to trash.');
        const id=randomUUID(),trashRelative='.mench/trash/'+id;
        const target=await this.resolve(rootId,trashRelative,{missing:true});
        if(!inside(root,target))throw new Error('Invalid project trash location.');
        await fs.mkdir(path.dirname(target),{recursive:true});
        const ignore=await this.resolve(rootId,'.mench/.gitignore',{missing:true});
        await fs.writeFile(ignore,'*\n',{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
        const record={id,rootId,path:relative,trashRelative,kind:(await fs.stat(source)).isDirectory()?'directory':'file',date:Date.now(),status:'preparing'};
        const directory=path.join(this.dataDirectory,'trash',rootId);await fs.mkdir(directory,{recursive:true});
        const metadata=path.join(directory,id+'.json');await this.atomic(metadata,JSON.stringify(record));
        const projectMetadata=await this.resolve(rootId,trashRelative+'.json',{missing:true});await this.atomic(projectMetadata,JSON.stringify(record));
        await fs.rename(source,target);record.status='trashed';await this.atomic(metadata,JSON.stringify(record));await this.atomic(projectMetadata,JSON.stringify(record));return record;
    }
    userEntry(relative){
        if(typeof relative!=='string'||!relative||relative.replaceAll('\\','/').split('/').some(part=>['.git','.mench'].includes(part.toLowerCase())))throw new Error('Choose a project file or folder outside .git and .mench.');
    }
    async deleted(rootId){
        this.record(rootId);const directory=path.join(this.dataDirectory,'trash',rootId);
        const records=[],catalogs=new Map();
        for(const name of await fs.readdir(directory).catch(()=>[])){
            if(!/^[0-9a-f-]{36}\.json$/.test(name))continue;
            catalogs.set(name,JSON.parse(await fs.readFile(path.join(directory,name),'utf8')));
        }
        const projectDirectory=await this.resolve(rootId,'.mench/trash',{missing:true});
        for(const name of await fs.readdir(projectDirectory).catch(()=>[])){
            if(!/^[0-9a-f-]{36}\.json$/.test(name)||catalogs.has(name))continue;
            const metadata=await this.resolve(rootId,'.mench/trash/'+name),record=JSON.parse(await fs.readFile(metadata,'utf8'));
            // This catalog travels with the project. Rebind only its capability
            // ID; every restored path still goes through the current root checks.
            catalogs.set(name,{...record,rootId});
        }
        for(const [name,record] of catalogs){
            if(record.id!==name.slice(0,-5)||record.trashRelative!=='.mench/trash/'+record.id)throw new Error('A project trash record is damaged.');
            if(record.rootId!==rootId||record.status==='restored')continue;
            const target=await this.resolve(rootId,record.trashRelative,{missing:true});
            if(await fs.access(target).then(()=>true,()=>false)){records.push({...record,status:'trashed'});await fs.mkdir(directory,{recursive:true});await this.atomic(path.join(directory,name),JSON.stringify(record));}
        }
        return records.sort((a,b)=>b.date-a.date);
    }
    async restoreTrash(rootId,id,{locked=false}={}){
        if(!locked)return this.serialized('root:'+rootId,()=>this.restoreTrash(rootId,id,{locked:true}));
        if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id))throw new Error('Deleted file not found.');
        const metadata=path.join(this.dataDirectory,'trash',rootId,id+'.json');
        const record=JSON.parse(await fs.readFile(metadata,'utf8'));
        if(record.id!==id||record.rootId!==rootId||record.trashRelative!=='.mench/trash/'+id)throw new Error('Invalid deleted-file record.');
        this.userEntry(record.path);
        const source=await this.resolve(rootId,record.trashRelative),target=await this.resolve(rootId,record.path,{missing:true}),root=this.record(rootId).root;
        if(!inside(root,source)||!inside(root,target)||target===root)throw new Error('Invalid restore location.');
        try{await fs.lstat(target);throw new Error('An entry already exists at the original path. Rename it before restoring.');}catch(error){if(error.code!=='ENOENT')throw error;}
        await fs.mkdir(path.dirname(target),{recursive:true});
        await fs.rename(source,target);record.status='restored';await this.atomic(metadata,JSON.stringify(record));
        const projectMetadata=await this.resolve(rootId,record.trashRelative+'.json',{missing:true});await this.atomic(projectMetadata,JSON.stringify(record));return {path:record.path,kind:record.kind};
    }
    async history(rootId,relative) {
        await this.resolve(rootId,relative,{missing:true});
        const directory = path.join(this.dataDirectory,'history',rootId,hash(relative));
        return (await fs.readdir(directory).catch(() => [])).sort().reverse().map(id => ({id,date:Number(id.split('-')[0])}));
    }
    async revision(rootId,relative,id) {
        const entries = await this.history(rootId,relative);
        if (!entries.some(entry => entry.id === id)) throw new Error('Revision not found.');
        return fs.readFile(path.join(this.dataDirectory,'history',rootId,hash(relative),id),'utf8');
    }
}
