let source,client;
export const desktop = () => {
    const bridge=typeof window !== 'undefined' ? window.menchDesktop : null;
    if(!bridge) return null;
    if(source===bridge) return client;
    source=bridge;
    client=Object.fromEntries(Object.entries(bridge).map(([name,value])=>[name,
        typeof value!=='function'||name==='onRuntimeEvent'?value:async(...args)=>{
            const response=await value(...args);
            if(bridge.version!==2) return response;
            if(!response.ok) {
                const error=new Error(response.error.message);
                error.name=response.error.name||'Error';error.code=response.error.code;throw error;
            }
            return response.value;
        }
    ]));
    return client;
};
const join = (parent,name) => parent ? parent + '/' + name : name;
class DesktopFileHandle {
    kind = 'file';
    constructor(rootId,relative) {this.rootId=rootId;this.path=relative;this.name=relative.split('/').at(-1);}
    async getFile() {
        const data = await desktop().read({rootId:this.rootId,relative:this.path});
        this.revision = data.hash;
        return {size:data.size,text:async () => data.text};
    }
    async createWritable() {
        let content;
        return {
            write:async value => {content=value;},
            close:async () => {const result=await desktop().write({rootId:this.rootId,relative:this.path,content,expectedHash:this.revision});this.revision=result.hash;},
            abort:async () => {}
        };
    }
}
export class DesktopDirectoryHandle {
    kind = 'directory';
    constructor(record,relative = '') {
        this.rootId=record.id;this.path=relative;this.name=relative ? relative.split('/').at(-1) : record.name;
        this.location=record.root;this.record=record;
    }
    async getDirectoryHandle(name,{create = false} = {}) {
        const relative=join(this.path,name);
        await desktop().directory({rootId:this.rootId,relative,create});
        return new DesktopDirectoryHandle(this.record,relative);
    }
    async getFileHandle(name,{create = false} = {}) {
        const relative=join(this.path,name);
        await desktop().file({rootId:this.rootId,relative,create});
        return new DesktopFileHandle(this.rootId,relative);
    }
    async *entries() {
        for (const entry of await desktop().entries({rootId:this.rootId,relative:this.path})) {
            const relative=join(this.path,entry.name);
            yield [entry.name,entry.kind === 'directory' ? new DesktopDirectoryHandle(this.record,relative) : new DesktopFileHandle(this.rootId,relative)];
        }
    }
    async isSameEntry(other) {return this.rootId === other.rootId && this.path === other.path;}
    async queryPermission() {await desktop().checkDirectory({rootId:this.rootId,relative:this.path});return 'granted';}
    async requestPermission() {return this.queryPermission();}
}
export const projectFromDesktop = record => ({id:record.id,name:record.name,location:record.root,lastOpened:record.lastOpened,directory:new DesktopDirectoryHandle(record)});
export async function chooseDirectory(options = {}) {
    if (desktop()) {
        const selected=await desktop().chooseDirectory(options);
        if (!selected) throw Object.assign(new Error('Folder selection cancelled.'),{name:'AbortError'});
        return new DesktopDirectoryHandle(selected);
    }
    if (!window.showDirectoryPicker) throw new Error('Use the Mench AI desktop app, Chrome, or Edge to open local folders.');
    return window.showDirectoryPicker({mode:'readwrite',id:options.purpose === 'create' ? 'mench-project-location' : 'mench-open-project'});
}
