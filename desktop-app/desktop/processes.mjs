import {spawn,execFile,fork} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';

const require = createRequire(import.meta.url);
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2'};
export class ProcessService {
    constructor({workspaces,nodePath,npmPath,emit}) {
        this.workspaces = workspaces;this.nodePath = nodePath;this.npmPath = npmPath;
        this.emit = emit || (() => {});this.jobs = new Map();this.terminals = new Map();
    }
    environment(source=process.env) {
        const env={...source,NODE_ENV:'development',HOST:'127.0.0.1',BROWSER:'none',NO_COLOR:'1'};
        for(const name of Object.keys(env))if(['PATH','ELECTRON_RUN_AS_NODE','GEMINI_API_KEY','GOOGLE_API_KEY','MENCH_SETUP_TOKEN'].includes(name.toUpperCase()))delete env[name];
        env.PATH=[path.dirname(this.nodePath),path.join(this.workspaces.dataDirectory,'bin'),source.PATH||source.Path].join(path.delimiter);
        env.MENCH_NODE_BINARY=this.nodePath;env.MENCH_NPM_CLI=this.npmPath;env.MENCH_NPX_CLI=path.join(path.dirname(this.npmPath),'npx-cli.js');
        return env;
    }
    async ensureCommandShims(){
        if(process.platform!=='win32')return;
        await this.workspaces.serialized('command-shims',async()=>{
            const bin=path.join(this.workspaces.dataDirectory,'bin');await fs.mkdir(bin,{recursive:true});
            for(const [name,variable] of [['npm','MENCH_NPM_CLI'],['npx','MENCH_NPX_CLI']]){
                // Keep the batch file ASCII. cmd.exe otherwise decodes Hebrew
                // installation paths using the console code page.
                const content='@echo off\r\n"%MENCH_NODE_BINARY%" "%'+variable+'%" %*\r\n';
                const target=path.join(bin,name+'.cmd');if(await fs.readFile(target,'utf8').catch(()=>null)!==content)await this.workspaces.atomic(target,content);
            }
        });
    }
    event(job,update) {
        const {output,...state} = update;
        Object.assign(job,state);
        if (output) job.output = (job.output + output).slice(-256000);
        this.emit({kind:'task',id:job.id,rootId:job.rootId,action:job.action,status:job.status,url:job.url,output:update.output || '',exitCode:job.exitCode});
    }
    async capabilities(rootId) {
        const directory = await this.workspaces.resolve(rootId);
        const manifest = JSON.parse(await this.workspaces.read(rootId,'package.json').then(data=>data.text,error=>{if(error.code==='ENOENT')return '{}';throw error;}));
        return {node:await fs.access(this.nodePath).then(() => true,() => false),scripts:manifest.scripts || {},dependencies:!!(manifest.dependencies || manifest.devDependencies),installed:await fs.access(path.join(directory,'node_modules')).then(() => true,() => false)};
    }
    async run(rootId,action) {
        if (!['dev','start','build','test','install'].includes(action)) throw new Error('Choose an available project task.');
        const directory = await this.workspaces.resolve(rootId);
        if ([...this.jobs.values()].some(job => job.rootId === rootId && job.action === action && job.status === 'running')) throw new Error('That task is already running.');
        const capabilities = await this.capabilities(rootId);
        if (action === 'dev' && !capabilities.scripts.dev && !capabilities.scripts.start) return this.serve(rootId);
        if (action !== 'install' && !capabilities.scripts[action]) {
            if (action === 'dev' && capabilities.scripts.start) action = 'start';
            else throw new Error('This project has no ' + action + ' script in package.json.');
        }
        if (!capabilities.node) throw new Error('The bundled Node runtime is missing. Rebuild or reinstall Mench AI.');
        await this.ensureCommandShims();
        const args = [this.npmPath,...(action === 'install' ? ['install','--no-fund','--no-audit'] : ['run',action])];
        if (action === 'dev' && /\bvite\b/.test(capabilities.scripts.dev)) args.push('--','--host','127.0.0.1');
        const child = spawn(this.nodePath,args,{cwd:directory,env:this.environment(),windowsHide:true,stdio:['ignore','pipe','pipe']});
        const job = {id:randomUUID(),rootId,action,status:'running',child,output:'',url:null};
        this.jobs.set(job.id,job);
        this.event(job,{output:'> npm ' + (action === 'install' ? 'install' : 'run ' + action) + '\r\n'});
        const data = chunk => {
            const text = chunk.toString();
            // eslint-disable-next-line no-control-regex -- Strip terminal escape sequences before sharing output.
            const url = text.replace(/\x1b\[[0-9;]*m/g,'').match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+[^\s]*/);
            if (url) job.url = url[0].replace('localhost','127.0.0.1');
            this.event(job,{output:text});
        };
        child.stdout.on('data',data);child.stderr.on('data',data);
        child.on('error',error => this.event(job,{status:'failed',output:error.message + '\r\n'}));
        child.on('exit',code => this.event(job,{status:job.status === 'stopping' ? 'stopped' : code === 0 ? 'completed' : 'failed',exitCode:code,output:'\r\nProcess exited with code ' + code + '\r\n'}));
        return {id:job.id,rootId,action,status:'running'};
    }
    async serve(rootId) {
        const existing = [...this.jobs.values()].find(job => job.rootId === rootId && job.action === 'static' && job.status === 'running');
        if (existing) return {id:existing.id,rootId,url:existing.url,status:existing.status,action:'static'};
        const token = randomUUID();
        const server = http.createServer(async (request,response) => {
            try {
                const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
                if (!pathname.startsWith('/' + token + '/')) {response.writeHead(404).end();return;}
                const relative = pathname.slice(token.length+2) || 'index.html';
                const target = await this.workspaces.resolve(rootId,relative);
                const metadata = await fs.stat(target);
                if (!metadata.isFile() || metadata.size > 20*1024*1024) {response.writeHead(404).end();return;}
                let content = await fs.readFile(target);
                const type = mime[path.extname(target)] || 'application/octet-stream';
                if (type === 'text/html') content = Buffer.from(content.toString().replace(/((?:src|href)=["'])\/(?!\/)/g,'$1/' + token + '/'));
                response.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
                response.end(content);
            } catch {response.writeHead(404).end('File not found.');}
        });
        await new Promise((resolve,reject) => {server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
        const job = {id:randomUUID(),rootId,action:'static',status:'running',server,url:'http://127.0.0.1:' + server.address().port + '/' + token + '/',output:''};
        this.jobs.set(job.id,job);this.event(job,{output:'Static preview running at ' + job.url + '\r\n'});
        return {id:job.id,rootId,url:job.url,status:'running',action:'static'};
    }
    async stop(id) {
        const job = this.jobs.get(id);
        if (!job || !['running','stopping'].includes(job.status)) return;
        if (job.server) {await new Promise(resolve => job.server.close(resolve));this.event(job,{status:'stopped',output:'Preview stopped.\r\n'});return;}
        job.status = 'stopping';
        if (process.platform === 'win32') await new Promise(resolve => execFile('taskkill',['/pid',String(job.child.pid),'/T','/F'],{windowsHide:true},() => resolve()));
        else job.child.kill('SIGTERM');
    }
    async createTerminal(rootId,{cols = 100,rows = 24} = {}) {
        const cwd = await this.workspaces.resolve(rootId);
        const executable = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe') : (process.env.SHELL || '/bin/sh');
        await this.ensureCommandShims();
        const host=fileURLToPath(new URL('./pty-host.mjs',import.meta.url)).replace('app.asar' + path.sep,'app.asar.unpacked' + path.sep);
        const child=fork(host,[],{execPath:this.nodePath,cwd,env:this.environment(),windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
        const id=randomUUID();this.terminals.set(id,{child,rootId});
        child.on('message',message=>{
            if (message.kind==='data') this.emit({kind:'terminal',id,rootId,output:message.data});
            if (message.kind==='exit') this.emit({kind:'terminal-exit',id,rootId,exitCode:message.exitCode});
        });
        child.on('exit',code=>{this.terminals.delete(id);this.emit({kind:'terminal-exit',id,rootId,exitCode:code});});
        await new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>{child.kill();reject(new Error('The terminal did not start.'));},10000);
            child.once('error',error=>{clearTimeout(timer);reject(error);});
            child.on('message',message=>{
                if(message.kind==='ready') {clearTimeout(timer);resolve();}
                if(message.kind==='error') {clearTimeout(timer);reject(new Error(message.message));}
            });
            child.send({kind:'start',executable,args:process.platform==='win32'?['-NoLogo','-NoProfile']:[],cols,rows});
        });
        return {id,rootId};
    }
    terminalInput(id,data) {
        if (typeof data !== 'string' || data.length > 100000) throw new Error('Invalid terminal input.');
        const child = this.terminals.get(id)?.child;if (!child?.connected) throw new Error('Terminal is closed.');child.send({kind:'input',data});
    }
    resizeTerminal(id,cols,rows) {
        if (![cols,rows].every(value => Number.isInteger(value) && value > 0 && value < 1000)) return;
        this.terminals.get(id)?.child.send({kind:'resize',cols,rows});
    }
    closeTerminal(id) {const child=this.terminals.get(id)?.child;if(child?.connected) child.send({kind:'close'});this.terminals.delete(id);}
    list(rootId) {return [...this.jobs.values()].filter(job => job.rootId === rootId).map(({id,action,status,url,output,exitCode}) => ({id,action,status,url,output,exitCode}));}
    result(rootId,id){
        this.workspaces.record(rootId);const job=this.jobs.get(id);
        if(!job||job.rootId!==rootId)throw new Error('This task result does not belong to the open project.');
        // eslint-disable-next-line no-control-regex -- Strip terminal escape sequences before sharing output.
        return {task:job.action,status:job.status,exitCode:job.exitCode??null,output:job.output.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').slice(-16000)};
    }
    async dispose() {for (const id of this.terminals.keys()) this.closeTerminal(id);await Promise.all([...this.jobs.keys()].map(id => this.stop(id)));}
}

export function npmCliPath() {
    const prepared=fileURLToPath(new URL('../tools/npm-runtime/bin/npm-cli.js',import.meta.url));
    if(existsSync(prepared)) return prepared;
    return path.join(path.dirname(require.resolve('npm/package.json')),'bin','npm-cli.js').replace('app.asar' + path.sep,'app.asar.unpacked' + path.sep);
}
