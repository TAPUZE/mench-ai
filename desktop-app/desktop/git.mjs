import git from 'isomorphic-git';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {createTwoFilesPatch} from 'diff';
import {inside} from './workspaces.mjs';
import {projectPath} from '../shared/project-changes.mjs';

const internal=filepath=>filepath.split('/').some(part=>['.git','.mench'].includes(part.toLowerCase()));
const boundary=()=>Object.assign(new Error('Git cannot follow linked metadata or access files outside the opened project.'),{code:'GIT_BOUNDARY'});

// isomorphic-git performs its own filesystem access, including .git objects,
// refs, config and ignore files. Guard every operation, not just the UI path.
function scopedFilesystem(dir){
    const promises={};let violation;
    const guard=async(filename,{leafLink=false}={})=>{
        if(typeof filename!=='string')throw new TypeError('Git filesystem paths must be strings.');
        const target=path.resolve(filename);if(!inside(dir,target))throw boundary();
        const relative=path.relative(dir,target),parts=relative?relative.split(path.sep):[];
        let current=dir;
        for(let index=0;index<parts.length;index++){
            if(/[<>:"|?*]|[. ]$/.test(parts[index])||parts[index].includes('\0'))throw boundary();
            current=path.join(current,parts[index]);
            const entry=await fsp.lstat(current).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
            if(!entry)break;
            if(entry.isSymbolicLink()){
                // Git may inspect a working-tree link itself without reading
                // its destination. Metadata links are never followed.
                if(index!==parts.length-1||!leafLink||parts[0]?.toLowerCase()==='.git')throw boundary();
            }
        }
        if(await fsp.realpath(dir)!==dir)throw boundary();
        return target;
    };
    for(const name of ['readFile','writeFile','mkdir','rmdir','unlink','stat','lstat','readdir','readlink'])promises[name]=async(filename,...args)=>{
        if(violation)throw violation;
        try{
            const target=await guard(filename,{leafLink:['lstat','readlink','unlink','readdir'].includes(name)});
            // The Git walker probes readdir even for a symlink. Report it as a
            // leaf rather than traversing the linked directory.
            if(name==='readdir'&&(await fsp.lstat(target)).isSymbolicLink())throw Object.assign(new Error('A linked directory is a Git leaf.'),{code:'ENOTDIR'});
            return await fsp[name](target,...args);
        }
        catch(error){if(error.code==='GIT_BOUNDARY')violation=error;throw error;}
    };
    promises.symlink=async()=>{violation=boundary();throw violation;};
    return {promises,assertSafe(){if(violation)throw violation;}};
}
async function gitCall(method,context,options={}){
    // Some library discovery paths treat filesystem errors as an unborn HEAD.
    // A boundary refusal remains fatal even if the library catches it.
    try{return await git[method]({...context,...options});}finally{context.fs.assertSafe();}
}

export class GitService {
    constructor(workspaces) {this.workspaces = workspaces;}
    async context(rootId) {
        const dir=await this.workspaces.resolve(rootId),gitdir=path.join(dir,'.git');
        const metadata=await fsp.lstat(gitdir).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
        if(metadata&&(!metadata.isDirectory()||metadata.isSymbolicLink()))throw new Error('Git requires a real .git folder inside this project. Open a standalone checkout for linked repositories or worktrees.');
        if(metadata)for(const entry of await fsp.readdir(gitdir,{withFileTypes:true}))if(entry.isSymbolicLink())throw boundary();
        return {fs:scopedFilesystem(dir),dir,gitdir,repository:!!metadata};
    }
    filePath(filepath){projectPath(filepath);if(internal(filepath))throw new Error('Git metadata and internal recovery files cannot be staged or edited through source control.');return filepath;}
    async initialize(rootId) {
        const context=await this.context(rootId);
        if(context.repository)throw new Error('This project is already a Git repository.');
        await gitCall('init',context,{defaultBranch:'main'});
        return this.status(rootId);
    }
    async status(rootId) {
        const context=await this.context(rootId);
        if(!context.repository)return {repository:false,branch:null,files:[]};
        const branch = await gitCall('currentBranch',context,{fullname:false});
        const matrix = await gitCall('statusMatrix',context,{filter:filepath=>!internal(filepath)});
        return {repository:true,branch,files:matrix.filter(([,head,worktree,stage]) => head !== worktree || head !== stage).map(([filepath,head,worktree,stage]) => ({
            path:filepath,untracked:head === 0,deleted:worktree === 0,staged:head !== stage,modified:worktree !== stage
        }))};
    }
    async stage(rootId,filepath) {
        this.filePath(filepath);const context=await this.context(rootId);
        const filename=await this.workspaces.resolve(rootId,filepath,{missing:true});
        const entry=await fsp.lstat(filename).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
        if(entry?.isDirectory())throw new Error('Stage individual project files.');
        if(entry)await gitCall('add',context,{filepath});else await gitCall('remove',context,{filepath});
        return this.status(rootId);
    }
    async unstage(rootId,filepath) {
        this.filePath(filepath);const context=await this.context(rootId);
        await this.workspaces.resolve(rootId,filepath,{missing:true});
        await gitCall('resetIndex',context,{filepath});return this.status(rootId);
    }
    async diff(rootId,filepath) {
        this.filePath(filepath);const context=await this.context(rootId);
        await this.workspaces.resolve(rootId,filepath,{missing:true});
        let original = '';
        let oid;
        try {oid=await gitCall('resolveRef',context,{ref:'HEAD'});}
        catch(error){if(error.code!=='NotFoundError')throw error;}
        if(oid){
            try{original=Buffer.from((await gitCall('readBlob',context,{oid,filepath})).blob).toString('utf8');}
            catch(error){if(error.code!=='NotFoundError'||error.data?.what!==`file or directory found at "${oid}:${filepath}"`)throw error;}
        }
        const current = await this.workspaces.read(rootId,filepath).then(value => value.text,error => {if (error.code === 'ENOENT') return '';throw error;});
        return {original,current,patch:createTwoFilesPatch('a/' + filepath,'b/' + filepath,original,current)};
    }
    async commit(rootId,{message,name,email}) {
        for (const value of Object.values({message,name,email})) if (typeof value !== 'string' || !value.trim() || value.length > 2000) throw new Error('Enter a commit message, author name, and email.');
        const status = await this.status(rootId);
        if (!status.files.some(file => file.staged)) throw new Error('Stage the changes you want to commit first.');
        const context=await this.context(rootId);
        if((await gitCall('listFiles',context)).some(internal))throw new Error('Recovery files are already in the Git index. Remove .mench from Git tracking before committing.');
        const oid = await gitCall('commit',context,{message:message.trim(),author:{name:name.trim(),email:email.trim()}});
        return {oid,...await this.status(rootId)};
    }
}
