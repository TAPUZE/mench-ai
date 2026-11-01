import React,{useEffect,useRef,useState} from 'react';
import {X,RefreshCw,Square,Plus,Minus} from 'lucide-react';
import {desktop} from './desktop';
import '@xterm/xterm/css/xterm.css';

export default function RuntimePanel({project,request,onClose,onPreview,onError,onOpenFile,currentFile,onReviewRevision,onReviewChanges,onRestored}) {
    const api=desktop();
    const [tasks,setTasks]=useState([]);
    const [selectedTask,setSelectedTask]=useState(null);
    const [capabilities,setCapabilities]=useState({scripts:{}});
    const [git,setGit]=useState({repository:false,files:[]});
    const [gitDiff,setGitDiff]=useState('');
    const [commit,setCommit]=useState({message:'',name:localStorage.getItem('mench-git-name')||'',email:localStorage.getItem('mench-git-email')||''});
    const [search,setSearch]=useState('');
    const [results,setResults]=useState([]);
    const [history,setHistory]=useState([]);
    const [deleted,setDeleted]=useState([]),[changeRecords,setChangeRecords]=useState([]);
    const [working,setWorking]=useState(false);
    const terminalElement=useRef(null),terminal=useRef(null),terminalId=useRef(null),fit=useRef(null);
    const terminalObserver=useRef(null),lifetime=useRef(0),actions=useRef(null),terminalView=useRef(false),terminalEpoch=useRef(0);
    const [terminalVersion,setTerminalVersion]=useState(0);
    const callbacks=useRef({onPreview,onError});callbacks.current={onPreview,onError};
    const rootId=project.directory.rootId;
    const tab=request?.tab||'tasks';
    const historySection=request?.section||'file';
    const terminalVisible=!!request&&tab==='terminal',historyVisible=!!request&&tab==='history',currentPath=currentFile?.path;
    terminalView.current=terminalVisible;
    const load=async()=>{
        try {
            setCapabilities(await api.capabilities({rootId}));
            setTasks(await api.listTasks({rootId}));
            if(tab==='git') setGit(await api.gitStatus({rootId}));
            if(tab==='history'&&currentFile) setHistory(await api.history({rootId,relative:currentFile.path}));
            if(tab==='history'&&historySection==='deleted')setDeleted(await api.deleted({rootId}));
            if(tab==='history'&&historySection==='changes')setChangeRecords(await api.listChanges({rootId}));
        } catch(error){callbacks.current.onError(error.message);}
    };
    useEffect(()=>{
        if(!api) return;
        const unsubscribe=api.onRuntimeEvent(event=>{
            if(event.rootId!==rootId) return;
            if(event.kind==='terminal'&&event.id===terminalId.current) terminal.current?.write(event.output);
            if(event.kind==='terminal-exit'&&event.id===terminalId.current) {terminal.current?.writeln('\r\n[Terminal closed]');terminalId.current=null;}
            if(event.kind==='task') {
                setTasks(previous=>{
                    const existing=previous.find(job=>job.id===event.id);
                    const updated={...existing,...event,output:((existing?.output||'')+(event.output||'')).slice(-256000)};
                    return existing?previous.map(job=>job.id===event.id?updated:job):[...previous,updated];
                });
                setSelectedTask(previous=>previous||event.id);
                if(event.url) callbacks.current.onPreview(event.url);
            }
        });
        actions.current.load();
        return ()=>{
            lifetime.current+=1;terminalObserver.current?.disconnect();
            unsubscribe();
            if(terminalId.current) api.closeTerminal({id:terminalId.current}).catch(()=>{});
            terminal.current?.dispose();terminal.current=null;terminalId.current=null;
            api.listTasks({rootId}).then(jobs=>Promise.all(jobs.filter(job=>job.status==='running').map(job=>api.stopTask({id:job.id})))).catch(()=>{});
        };
    },[rootId,api]);
    useEffect(()=>{
        if(!request) return;
        actions.current.load();
        if(request.task) actions.current.run(request.task);
        if(request.tab==='terminal'&&terminal.current) requestAnimationFrame(()=>fit.current?.fit());
    },[request]);
    useEffect(()=>{
        if(!terminalVisible||terminal.current) return;
        const generation=lifetime.current,epoch=terminalEpoch.current;
        (async()=>{
            try {
                const [{Terminal},{FitAddon}]=await Promise.all([import('@xterm/xterm'),import('@xterm/addon-fit')]);
                if(generation!==lifetime.current||epoch!==terminalEpoch.current||!terminalView.current||terminal.current) return;
                const instance=new Terminal({fontFamily:"'Cascadia Code', Consolas, monospace",fontSize:12,theme:{background:'#191b1e',foreground:'#d3d8d4',cursor:'#99b9a8'},cursorBlink:true,convertEol:true,scrollback:3000});
                const fitAddon=new FitAddon();instance.loadAddon(fitAddon);instance.open(terminalElement.current);
                terminal.current=instance;fit.current=fitAddon;fitAddon.fit();
                const created=await api.createTerminal({rootId,cols:instance.cols,rows:instance.rows});
                if(generation!==lifetime.current||epoch!==terminalEpoch.current) {
                    await api.closeTerminal({id:created.id});
                    if(terminal.current===instance){instance.dispose();terminal.current=null;fit.current=null;}
                    return;
                }
                terminalId.current=created.id;
                instance.onData(data=>api.terminalInput({id:created.id,data}).catch(error=>callbacks.current.onError(error.message)));
                instance.onResize(({cols,rows})=>api.terminalResize({id:created.id,cols,rows}));
                terminalObserver.current=new ResizeObserver(()=>{if(terminalElement.current?.offsetWidth) fitAddon.fit();});
                terminalObserver.current.observe(terminalElement.current);if(terminalView.current)instance.focus();
            } catch(error){callbacks.current.onError(error.message);}
        })();
    },[terminalVisible,rootId,api,terminalVersion]);
    useEffect(()=>{
        if(historyVisible&&currentPath) actions.current.load();
    },[currentPath,historyVisible,historySection]);
    const run=async task=>{
        try {
            setWorking(true);
            const job=await api.runTask({rootId,task});
            setSelectedTask(job.id);setTasks(await api.listTasks({rootId}));
            if(job.url) callbacks.current.onPreview(job.url);
        } catch(error){callbacks.current.onError(error.message);}
        finally{setWorking(false);}
    };
    actions.current={load,run};
    const restartTerminal=async()=>{
        terminalEpoch.current+=1;const id=terminalId.current;
        terminalObserver.current?.disconnect();terminal.current?.dispose();terminal.current=null;terminalId.current=null;fit.current=null;
        try{if(id)await api.closeTerminal({id});setTerminalVersion(value=>value+1);}
        catch(error){callbacks.current.onError(error.message);}
    };
    const updateGit=async operation=>{
        try{setWorking(true);setGit(await operation());setGitDiff('');}
        catch(error){callbacks.current.onError(error.message);}
        finally{setWorking(false);}
    };
    const commitChanges=async event=>{
        event.preventDefault();
        await updateGit(()=>api.gitCommit({rootId,...commit}));
        localStorage.setItem('mench-git-name',commit.name);localStorage.setItem('mench-git-email',commit.email);
    };
    const selected=tasks.find(job=>job.id===selectedTask)||tasks.at(-1);
    if(!api) return null;
    return <section className="mw-runtime-panel" style={{display:request?'flex':'none'}} aria-label="Project runtime">
        <header><div className="mw-runtime-tabs">{['tasks','terminal','git','search','history'].map(name=><button key={name} className={tab===name?'active':''} onClick={()=>onClose({tab:name,id:Date.now()})}>{({tasks:'Tasks',terminal:'Terminal',git:'Source control',search:'Search',history:'File history'})[name]}</button>)}</div><div>{tab==='terminal'&&<button className="mw-icon" aria-label="Restart terminal" title="Stop this terminal and start a fresh session" onClick={restartTerminal}><Plus size={13}/></button>}<button className="mw-icon" aria-label="Refresh runtime" onClick={load}><RefreshCw size={13}/></button><button className="mw-icon" aria-label="Close runtime panel" onClick={()=>onClose(null)}><X size={14}/></button></div></header>
        <div className="mw-runtime-terminal" ref={terminalElement} style={{display:tab==='terminal'?'block':'none'}}/>
        {tab==='tasks'&&<div className="mw-task-view"><aside><div className="mw-task-actions"><button disabled={working} onClick={()=>run('dev')}>Run project</button>{['install','build','test'].map(action=><button key={action} disabled={working||(action!=='install'&&!capabilities.scripts[action])} onClick={()=>run(action)}>{action==='install'?'Install dependencies':action==='build'?'Build':'Test'}</button>)}</div>{tasks.map(job=><button className={'mw-task-entry '+(job.id===selected?.id?'active':'')} key={job.id} onClick={()=>setSelectedTask(job.id)}><span>{job.action||'Task'}</span><small>{job.status}</small></button>)}</aside><div className="mw-task-output">{selected?<><div><span>{selected.status}{selected.exitCode!==undefined?' · exit '+selected.exitCode:''}</span>{selected.status==='running'&&<button onClick={()=>api.stopTask({id:selected.id})}><Square size={11}/>Stop</button>}</div><pre>{selected.output||'Starting process…'}</pre></>:<p>Run your project, install its dependencies, or execute its build and tests. Output here comes from the actual process.</p>}</div></div>}
        {tab==='git'&&<div className="mw-git-view">{!git.repository?<div className="mw-runtime-empty"><p>This folder is not a Git repository.</p><button className="mw-button" disabled={working} onClick={()=>updateGit(()=>api.gitInitialize({rootId}))}>Initialize repository</button></div>:<><aside><div className="mw-git-branch">{git.branch||'main'} · {git.files.length} changed</div>{git.files.map(file=><div className="mw-git-file" key={file.path}><button onClick={async()=>{try{const diff=await api.gitDiff({rootId,path:file.path});setGitDiff(diff.patch);}catch(error){onError(error.message);}}}>{file.path}<small>{file.staged?'staged':file.untracked?'new':'modified'}</small></button><button aria-label={(file.staged?'Unstage ':'Stage ')+file.path} disabled={working} onClick={()=>updateGit(()=>file.staged?api.gitUnstage({rootId,path:file.path}):api.gitStage({rootId,path:file.path}))}>{file.staged?<Minus size={13}/>:<Plus size={13}/>}</button></div>)}{!git.files.length&&<p className="mw-help">Working tree clean.</p>}</aside><div className="mw-git-detail">{gitDiff?<pre>{gitDiff}</pre>:<form onSubmit={commitChanges}><label>Commit message<input value={commit.message} onChange={event=>setCommit({...commit,message:event.target.value})} required/></label><div><label>Author name<input value={commit.name} onChange={event=>setCommit({...commit,name:event.target.value})} required/></label><label>Author email<input value={commit.email} onChange={event=>setCommit({...commit,email:event.target.value})} required type="email"/></label></div><button className="mw-button" disabled={working||!git.files.some(file=>file.staged)}>Commit staged changes</button></form>}</div></>}</div>}
        {tab==='search'&&<div className="mw-runtime-search"><form onSubmit={async event=>{event.preventDefault();try{setResults(await api.search({rootId,query:search}));}catch(error){onError(error.message);}}}><input aria-label="Search project contents" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search across project files…"/><button className="mw-button">Search</button></form><div>{results.map((result,index)=><button key={index} onClick={()=>onOpenFile(result.path)}><span>{result.path}{result.line?':'+result.line:''}</span><code>{result.text}</code></button>)}</div></div>}
        {tab==='history'&&<div className="mw-file-history"><nav className="mw-history-sections" aria-label="History sections">{[['file','File versions'],['deleted','Deleted files'],['changes','Project changes']].map(([section,label])=><button key={section} className={historySection===section?'active':''} onClick={()=>onClose({tab:'history',section,id:Date.now()})}>{label}</button>)}</nav>
            {historySection==='file'&&(!currentFile?<p>Open a file to see saved revisions.</p>:<><p>Saved revisions of {currentFile.path}. Review a revision before restoring it.</p>{history.map(entry=><button key={entry.id} onClick={async()=>{try{onReviewRevision(await api.revision({rootId,relative:currentFile.path,id:entry.id}));}catch(error){onError(error.message);}}}>{new Date(entry.date).toLocaleString()}<span>Review revision</span></button>)}{!history.length&&<p className="mw-help">Previous versions appear after you save changes.</p>}</>)}
            {historySection==='deleted'&&<><p>Files moved to project trash remain recoverable. Restoring never overwrites an existing path.</p>{deleted.map(entry=><button key={entry.id} disabled={working} onClick={async()=>{try{setWorking(true);const result=await api.restoreDeleted({rootId,id:entry.id});await onRestored(result);await load();}catch(error){onError(error.message);}finally{setWorking(false);}}}><span>{entry.path} · {new Date(entry.date).toLocaleString()}</span><span>Restore</span></button>)}{!deleted.length&&<p>No deleted files.</p>}</>}
            {historySection==='changes'&&<><p>Review applied assistant changes, undo them, or recover an interrupted group.</p>{changeRecords.map(entry=><button key={entry.id} onClick={()=>onReviewChanges(entry.id)}><span>{entry.summary} · {entry.paths.length} files · {entry.status}</span><span>Review</span></button>)}{!changeRecords.length&&<p>No project change records yet.</p>}</>}
        </div>}
    </section>;
}
