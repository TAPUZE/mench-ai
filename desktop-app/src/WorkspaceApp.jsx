import {useConversation} from './workspace/useConversation';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Editor, DiffEditor} from '@monaco-editor/react';
import {Files, MessageSquare, Settings, ChevronRight, X, Plus, FolderOpen, PanelLeft, PanelRight, RefreshCw, Search, Check, Shield, ArrowRight, GitBranch} from 'lucide-react';
import {getDefaultModel,AVAILABLE_MODELS} from './constants/models';
import {getDefaultProtectionLevel, getProtectionLevel} from './constants/protectionLevels';
import {createProject, createProjectFile, flattenFiles, languageFor, scanDirectory, readProjectFile, writeProjectFile, recentProjects, rememberProject, reopenProject, loadDrafts, saveDrafts, legacyCanvases, buildPreview, validateName, chooseDirectory} from './workspace/projects';
import {askAssistant} from './workspace/assistant';
import {Dialog, NewProjectDialog, SettingsDialog, FileTree, AssistantPanel} from './workspace/Panels';
import './workspace/workspace.css';
import {desktop} from './workspace/desktop';
import RuntimePanel from './workspace/RuntimePanel';
import SchoolDialog from './workspace/SchoolDialog';
import ProjectChangesDialog from './workspace/ProjectChangesDialog';
import {shareablePath} from '../shared/project-changes.mjs';

function initialSettings() {
    const read = (key,fallback) => localStorage.getItem(key) || fallback;
    const protection = read('mench-ai-protection-level',read('kosher-ai-protection-level',getDefaultProtectionLevel().id));
    return {
        apiKey:desktop()?.configureAI?'':read('gemini-api-key',''),
        model:AVAILABLE_MODELS[read('mench-ai-selected-model',read('kosher-ai-selected-model',''))]?read('mench-ai-selected-model',read('kosher-ai-selected-model','')):getDefaultModel(),
        language:read('mench-ai-language',read('kosher-ai-language','en')),
        communityProfile:read('mench-ai-community-profile','auto'),voice:read('mench-ai-voice','auto'),
        protection:protection === 'developer' ? getDefaultProtectionLevel().id : protection
    };
}

export default function WorkspaceApp() {
    const [project,setProject] = useState(null);
    const [tree,setTree] = useState([]);
    const [recents,setRecents] = useState([]);
    const [legacy] = useState(legacyCanvases);
    const [documents,setDocuments] = useState([]);
    const [activePath,setActivePath] = useState(null);
    const [settings,setSettings] = useState(initialSettings);
    const [settingsOpen,setSettingsOpen] = useState(false);
    const [schoolOpen,setSchoolOpen] = useState(false);
    const [schoolStatus,setSchoolStatus] = useState(null);
    const [newProject,setNewProject] = useState(null);
    const [newFile,setNewFile] = useState(null);
    const [newFileName,setNewFileName] = useState('');
    const [search,setSearch] = useState('');
    const [explorer,setExplorer] = useState(true);
    const [assistant,setAssistant] = useState(true);
    const [preview,setPreview] = useState(false);
    const [previewResult,setPreviewResult] = useState({html:'',missing:[]});
    const [previewError,setPreviewError] = useState('');
    const [aiBusy,setAiBusy] = useState(false);
    const [busy,setBusy] = useState(false);
    const [saving,setSaving] = useState(false);
    const [error,setError] = useState('');
    const [notice,setNotice] = useState('');
    const [menu,setMenu] = useState(null);
    const [pending,setPending] = useState(null);
    const [closing,setClosing] = useState(null);
    const [suggestion,setSuggestion] = useState(null);
    const [projectChanges,setProjectChanges]=useState(null),[changesBusy,setChangesBusy]=useState(false),[changesError,setChangesError]=useState('');
    const [entryMenu,setEntryMenu]=useState(null),[entryDialog,setEntryDialog]=useState(null);
    const [cursor,setCursor] = useState({line:1,column:1});
    const [panelWidths,setPanelWidths] = useState({explorer:225,assistant:325});
    const [resizing,setResizing] = useState(null);
    const [runtimeRequest,setRuntimeRequest] = useState(null);
    const [runtimeUrl,setRuntimeUrl] = useState('');
    const [contextTasks,setContextTasks]=useState([]);
    const abort = useRef(null);
    const editor = useRef(null);
    const [editorReadyKey,setEditorReadyKey]=useState('');
    const positionSubscription = useRef(null);
    const noticeTimer = useRef(null);
    const switchSequence = useRef(0);
    const pendingSaves = useRef(new Map());
    const pendingEditorChange=useRef(null),viewSequence=switchSequence.current;
    const conversation=useConversation(project?.id,schoolStatus,()=>{abort.current?.abort();setAiBusy(false);setSuggestion(null);setProjectChanges(null);});
    const {messages,setMessages}=conversation;
    const communityAccount=schoolStatus?.url?schoolStatus.url+':'+(schoolStatus.user?.id||'signed-out'):'personal';
    useEffect(()=>{if(communityAccount!=='personal')setSettings(previous=>({...previous,communityProfile:'auto',voice:'auto'}));},[communityAccount]);
    const allFiles = flattenFiles(tree);
    const active = documents.find(document => document.path === activePath);
    const editorKey=project&&active?project.id+'/'+active.path:'';
    const dirty = documents.some(document => document.content !== document.saved);
    const dirtyCount = documents.filter(document => document.content !== document.saved).length;
    const htmlFile = active?.path.match(/\.html?$/i) ? active.path : allFiles.find(file => file.name === 'index.html')?.path || allFiles.find(file => /\.html?$/i.test(file.path))?.path;
    const aiReady=schoolStatus?.url?!!schoolStatus.user:!!(settings.apiKey||settings.apiConfigured);
    const shareableFiles=allFiles.filter(file=>file.editable&&shareablePath(file.path));
    const refreshSchool=async()=>{
        if(!desktop()?.schoolStatus)return;
        const status=await desktop().schoolStatus();setSchoolStatus(status);
        setSettings(previous=>({...previous,apiConfigured:status.apiKeyConfigured}));return status;
    };
    useEffect(()=>{
        if(!desktop()?.schoolStatus)return;
        (async()=>{
            const status=await refreshSchool(),legacyKey=localStorage.getItem('gemini-api-key');
            if(legacyKey){if(!status.url&&!status.apiKeyConfigured)await desktop().configureAI({apiKey:legacyKey});localStorage.removeItem('gemini-api-key');await refreshSchool();}
        })().catch(error=>setError(error.message));
    },[]);
    const collectFiles=async paths=>Promise.all(paths.map(async path=>{
        const file=shareableFiles.find(item=>item.path===path);if(!file)throw new Error('This file is no longer available to share.');
        return {path,content:documents.find(doc=>doc.path===path)?.content??await readProjectFile(file)};
    }));

    const notify = useCallback(text => {
        setNotice(text); clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNotice(''),4000);
    },[]);
    const refreshRecents = useCallback(() => recentProjects().then(setRecents).catch(() => {}),[]);
    useEffect(()=>{
        const api=desktop(),rootId=project?.directory.rootId;if(!rootId||!api?.listTasks){setContextTasks([]);return;}
        let live=true;setContextTasks([]);
        api.listTasks({rootId}).then(jobs=>{if(live)setContextTasks(jobs.map(({output,...job})=>job));}).catch(()=>{});
        const unsubscribe=api.onRuntimeEvent(event=>{
            if(event.kind!=='task'||event.rootId!==rootId)return;
            const {output,...task}=event;
            setContextTasks(previous=>previous.some(item=>item.id===task.id)?previous.map(item=>item.id===task.id?{...item,...task}:item):[...previous,task]);
        });
        return ()=>{live=false;unsubscribe();};
    },[project?.id,project?.directory.rootId]);
    useEffect(() => {refreshRecents(); return () => {abort.current?.abort(); clearTimeout(noticeTimer.current); positionSubscription.current?.dispose();};},[refreshRecents]);
    useEffect(() => {
        document.title = project ? project.name + ' — Mench AI' : 'Welcome — Mench AI';
    },[project]);
    useEffect(() => {
        if (!project) return;
        try {saveDrafts(project.id,documents);}
        catch {setError('Your browser could not back up these drafts. Save your files before closing.');}
    },[project,documents]);
    useEffect(() => {
        if (!resizing) return;
        const move = event => {
            const delta = (event.clientX-resizing.start) * (resizing.side === 'explorer' ? 1 : -1);
            const maximum = Math.min(460, Math.max(220,window.innerWidth * .36));
            setPanelWidths(previous => ({...previous,[resizing.side]:Math.min(maximum,Math.max(180,resizing.width+delta))}));
        };
        const stop = () => setResizing(null);
        window.addEventListener('pointermove',move); window.addEventListener('pointerup',stop,{once:true});
        return () => {window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);};
    },[resizing]);
    useEffect(() => {
        const handler = event => {if (dirty) {event.preventDefault(); event.returnValue = '';}};
        window.addEventListener('beforeunload',handler);
        return () => window.removeEventListener('beforeunload',handler);
    },[dirty]);
    useEffect(() => {
        const handler = event => {
            if (event.key === 'Escape') {setMenu(null);setEntryMenu(null);}
        };
        window.addEventListener('keydown',handler);
        return () => window.removeEventListener('keydown',handler);
    },[]);

    const enterProject = async selected => {
        setBusy(true); setError('');
        try {
            // A usable folder remains usable even if browser recent-project storage is disabled.
            let remembered = selected;
            try {remembered = await rememberProject(selected);}
            catch {notify('Project opened. Recent-project storage is unavailable in this browser.');}
            const entries = await scanDirectory(remembered.directory);
            const files = flattenFiles(entries);
            const drafts = loadDrafts(remembered.id);
            const restored = [];
            for (const [path,content] of Object.entries(drafts)) {
                const file = files.find(file => file.path === path);
                restored.push({...file,path,name:path.split('/').at(-1),content,saved:file ? await readProjectFile(file) : '',recovered:!file});
            }
            const first = files.find(file => file.name === 'index.html') || files.find(file => file.editable);
            if (first && !restored.some(doc => doc.path === first.path)) {
                const content = await readProjectFile(first);
                restored.push({...first,content,saved:content});
            }
            abort.current?.abort();
            switchSequence.current += 1;
            setAiBusy(false); setProject(remembered); setTree(entries); setDocuments(restored);
            setActivePath(restored[0]?.path || null); setNewProject(null); 
            setPreview(false); setSearch(''); setSuggestion(null); setMenu(null);
            setRuntimeRequest(null);setRuntimeUrl('');
            setProjectChanges(null);setEntryMenu(null);setEntryDialog(null);
            if (Object.keys(drafts).length) notify('Unsaved work from your last session has been restored.');
            refreshRecents();
        } finally {setBusy(false);}
    };

    const requestAction = action => {
        setMenu(null);
        if (dirty) setPending({action});
        else Promise.resolve().then(action).catch(error => {if (error.name !== 'AbortError') setError(error.message);});
    };
    const openProject = () => requestAction(async () => {
        // The picker is invoked from the user's click, before asynchronous work.
        const directory = await chooseDirectory();
        await enterProject({id:crypto.randomUUID(),name:directory.name,location:directory.name,directory,lastOpened:Date.now()});
    });
    const openRecent = recent => requestAction(async () => {await reopenProject(recent); await enterProject(recent);});
    const startNew = imported => requestAction(() => setNewProject({imported}));
    const create = async (parent,name,template,imported) => {
        const files = imported?.files?Object.fromEntries(imported.files.map(file=>[file.path,file.content])):imported ? {[validateName(imported.fileName?.endsWith('.html') ? imported.fileName : 'index.html')]:imported.content} : null;
        const created = await createProject(parent,name,template,files);
        await enterProject(created);
    };
    const openDocument = async file => {
        if (!file.editable) {notify('This file is not a supported text file.'); return;}
        if (documents.some(document => document.path === file.path)) {setActivePath(file.path); return;}
        const sequence = switchSequence.current;
        try {
            const content = await readProjectFile(file);
            if (sequence !== switchSequence.current) return;
            setDocuments(previous => previous.some(doc => doc.path === file.path) ? previous : [...previous,{...file,content,saved:content}]);
            setActivePath(file.path);
        } catch (error) {setError(error.message);}
    };
    const editorSnapshot = doc => {
        if(!doc||doc.path!==activePath)return doc;
        const model=editor.current?.getModel(),expected=project?.id+'/'+doc.path;
        if(!model||model.uri.path.replace(/^\//,'')!==expected)return doc;
        const change=pendingEditorChange.current,content=model.getValue();
        if(!change||change.sequence!==viewSequence||change.path!==doc.path||change.baseline!==doc.saved||change.content!==content||content===doc.content)return doc;
        setDocuments(previous=>previous.map(current=>current.path===doc.path&&current.content===doc.content?{...current,content}:current));
        return {...doc,content};
    };
    const saveDocument = snapshot => {
        const doc=editorSnapshot(snapshot);
        if (!doc || doc.content === doc.saved) return Promise.resolve();
        const sequence=viewSequence,key=sequence+':'+doc.path,directory=project.directory,previous=pendingSaves.current.get(key);
        if(previous?.content===doc.content)return previous.promise;
        const entry={content:doc.content};
        entry.promise=(async()=>{
            if(previous)await previous.promise;
            let handle=doc.handle;
            if(handle){
                const onDisk=await readProjectFile({...doc,handle});
                const baseline=previous?previous.content:doc.saved;
                if(onDisk!==baseline&&onDisk!==doc.content)throw new Error(doc.name+' changed outside Mench AI. Reopen the project or save your work to a new file before overwriting it.');
                if(onDisk!==doc.content)await writeProjectFile(handle,doc.content);
            }else handle=(await createProjectFile(directory,doc.path,doc.content)).handle;
            if(sequence===switchSequence.current)setDocuments(previous=>previous.map(current=>current.path===doc.path?{...current,handle,saved:doc.content,recovered:false}:current));
        })().finally(()=>{if(pendingSaves.current.get(key)===entry)pendingSaves.current.delete(key);});
        pendingSaves.current.set(key,entry);return entry.promise;
    };
    const saveAll = async () => {
        setSaving(true); setError('');
        try {for (const doc of documents) await saveDocument(doc); notify('All files saved.'); return true;}
        catch (error) {setError(error.message); return false;}
        finally {setSaving(pendingSaves.current.size>0);}
    };
    const saveActive = async () => {
        setSaving(true); setError('');
        try {await saveDocument(active); notify('Saved to your project folder.');}
        catch (error) {setError(error.message);}
        finally {setSaving(pendingSaves.current.size>0);}
    };
    const runProject = async () => {
        if(!await saveAll()) return;
        setRuntimeRequest({tab:'tasks',task:'dev',id:Date.now()});setPreview(true);
    };
    const runAssistantTask=async task=>{
        if(!desktop()){setError('Use the Windows desktop app to run project tasks.');return;}
        if(!await saveAll())return;
        setRuntimeRequest({tab:'tasks',task,id:Date.now()});if(task==='dev')setPreview(true);
    };
    const togglePreview = () => {
        if(desktop()&&!preview&&!runtimeUrl) {runProject();return;}
        setPreview(!preview);
    };
    const closeDocument = path => {
        setDocuments(previous => previous.filter(doc => doc.path !== path));
        if (activePath === path) setActivePath(documents.filter(doc => doc.path !== path).at(-1)?.path || null);
    };
    const closeTab = doc => doc.content !== doc.saved ? setClosing(doc) : closeDocument(doc.path);
    const closeProject = () => requestAction(() => {
        abort.current?.abort(); switchSequence.current += 1;
        setProject(null); setTree([]); setDocuments([]); setActivePath(null); setMessages([]); setAiBusy(false);
        setProjectChanges(null);setSuggestion(null);setEntryMenu(null);setEntryDialog(null);setRuntimeRequest(null);setRuntimeUrl('');
    });
    const refreshTree = async () => {
        try {setTree(await scanDirectory(project.directory)); notify('Explorer refreshed.');}
        catch (error) {setError(error.message);}
    };
    const addEntry = async event => {
        event.preventDefault(); setError('');
        try {
            if (newFile === 'folder') {
                const name = validateName(newFileName);
                try {await project.directory.getDirectoryHandle(name); throw new Error('That folder already exists.');}
                catch (error) {if (error.name !== 'NotFoundError') throw error;}
                await project.directory.getDirectoryHandle(name,{create:true});
            } else {
                const file = await createProjectFile(project.directory,newFileName);
                await openDocument(file);
            }
            setNewFile(null); setNewFileName(''); await refreshTree();
        } catch (error) {setError(error.message);}
    };
    const updateContent = value => {
        const content=value??'';pendingEditorChange.current={sequence:viewSequence,path:activePath,baseline:active?.saved,content};
        setDocuments(previous=>previous.map(doc=>doc.path===activePath?{...doc,content}:doc));
    };
    const reviewProposal=async proposal=>{
        if(!desktop()?.prepareChanges){setError('Apply project-wide proposals in the Windows desktop app. Single-file review is available here.');return;}
        if(documents.map(editorSnapshot).some(doc=>proposal.changes.some(change=>change.path===doc.path)&&doc.content!==doc.saved)){setError('Save your unsaved edits in the proposed files before preparing a project review.');return;}
        const sequence=switchSequence.current;
        try{const record=await desktop().prepareChanges({rootId:project.directory.rootId,proposal});if(sequence===switchSequence.current){setChangesError('');setProjectChanges(record);}}
        catch(error){setError(error.message);}
    };
    const reviewRecordedChanges=async id=>{
        const sequence=switchSequence.current;
        try{const record=await desktop().getChanges({rootId:project.directory.rootId,id});if(sequence===switchSequence.current){setChangesError('');setProjectChanges(record);}}
        catch(error){setError(error.message);}
    };
    const syncChangedFiles=async(paths,removed=[],sequence=switchSequence.current)=>{
        const entries=await scanDirectory(project.directory),files=flattenFiles(entries),loaded=new Map();
        for(const relative of paths){const file=files.find(file=>file.path===relative);if(file){const content=await readProjectFile(file);loaded.set(relative,{...file,content,saved:content});}}
        if(sequence!==switchSequence.current)return;
        setTree(entries);
        setDocuments(previous=>{
            const next=previous.filter(doc=>!removed.includes(doc.path)).map(doc=>loaded.get(doc.path)||doc);
            const first=loaded.values().next().value;if(first&&!next.some(doc=>doc.path===first.path))next.push(first);
            return next;
        });
        setActivePath(previous=>removed.includes(previous)?loaded.keys().next().value||documents.find(doc=>!removed.includes(doc.path))?.path||null:previous||loaded.keys().next().value||null);
    };
    const changeProject=async(selected,undo=false)=>{
        const paths=undo?projectChanges.selected:selected;
        if(documents.some(doc=>paths.includes(doc.path)&&doc.content!==doc.saved)){setChangesError('These files have unsaved edits. Close this review and save or keep those edits before applying or undoing project changes.');return;}
        const sequence=switchSequence.current;setChangesBusy(true);setChangesError('');
        try{
            const result=await (undo?desktop().undoChanges({rootId:project.directory.rootId,id:projectChanges.id}):desktop().applyChanges({rootId:project.directory.rootId,id:projectChanges.id,selected}));
            await syncChangedFiles(result.paths,result.removed||[],sequence);
            if(sequence===switchSequence.current){setProjectChanges(null);setRuntimeRequest(previous=>previous?{...previous,id:Date.now()}:previous);notify(undo?'Original files restored. Newly created files remain recoverable in project trash.':'Reviewed changes saved to the project. Undo is available in History → Project changes.');}
        }catch(error){if(sequence===switchSequence.current)setChangesError(error.message);}
        finally{setChangesBusy(false);}
    };
    const changeEntry=async event=>{
        event.preventDefault();const dialog=entryDialog,entry=dialog.entry,sequence=switchSequence.current;
        setEntryDialog(previous=>({...previous,busy:true,error:''}));
        const affected=doc=>doc.path===entry.path||doc.path.startsWith(entry.path+'/');
        try{
            if(dialog.type==='trash'){
                for(const doc of documents.filter(affected))await saveDocument(doc);
                await desktop().trash({rootId:project.directory.rootId,relative:entry.path});
                if(sequence!==switchSequence.current)return;
                setDocuments(previous=>previous.filter(doc=>!affected(doc)));setActivePath(previous=>previous===entry.path||previous?.startsWith(entry.path+'/')?documents.find(doc=>!affected(doc))?.path||null:previous);
                await refreshTree();notify('Moved to project trash. Restore it from History → Deleted files.');
            }else{
                const target=dialog.name.split('/').map(validateName).join('/');
                if(target!==entry.path)await desktop().rename({rootId:project.directory.rootId,from:entry.path,to:target});
                const entries=await scanDirectory(project.directory),files=flattenFiles(entries);
                if(sequence!==switchSequence.current)return;
                const renamed=relative=>relative===entry.path||relative.startsWith(entry.path+'/')?target+relative.slice(entry.path.length):relative;
                setTree(entries);setDocuments(previous=>previous.map(doc=>affected(doc)?{...doc,...files.find(file=>file.path===renamed(doc.path)),path:renamed(doc.path),name:renamed(doc.path).split('/').at(-1)}:doc));setActivePath(previous=>previous?renamed(previous):previous);notify('Project entry moved. Unsaved editor work is preserved.');
            }
            setEntryDialog(null);
        }catch(error){if(sequence===switchSequence.current)setEntryDialog(previous=>({...previous,busy:false,error:error.message}));}
    };
    const updateSettings = async next => {
        try {
            if(desktop()?.configureAI){
                if(next.apiKey||next.removeKey)await desktop().configureAI({apiKey:next.removeKey?'':next.apiKey});
                localStorage.removeItem('gemini-api-key');
            }else localStorage.setItem('gemini-api-key',next.apiKey);
            localStorage.setItem('mench-ai-selected-model',next.model);
            localStorage.setItem('mench-ai-language',next.language);
            if(!schoolStatus?.url){localStorage.setItem('mench-ai-community-profile',next.communityProfile||'auto');localStorage.setItem('mench-ai-voice',next.voice||'auto');}
            localStorage.setItem('mench-ai-protection-level',next.protection);
            setSettings({...next,...(desktop()?.configureAI?{apiKey:'',apiConfigured:next.removeKey?false:!!next.apiKey||settings.apiConfigured,removeKey:false}:{})}); setSettingsOpen(false); notify('Settings saved.');
        } catch(error) {setError(error.message||'Settings could not be saved. Check your browser storage.');}
    };

    useEffect(() => {
        if (!project || !preview || !htmlFile || desktop()) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const result = await buildPreview(htmlFile,documents,flattenFiles(tree));
                if (!cancelled) {setPreviewResult(result); setPreviewError('');}
            } catch (error) {if (!cancelled) setPreviewError(error.message);}
        },250);
        return () => {cancelled = true; clearTimeout(timer);};
    },[project,preview,htmlFile,documents,tree]);

    useEffect(() => {
        const keyboard = event => {
            if(event.defaultPrevented)return;
            if (!(event.ctrlKey || event.metaKey)) return;
            const key = event.key.toLowerCase();
            if (key === 's' && project) {event.preventDefault(); event.shiftKey ? saveAll() : saveActive();}
            if (key === 'o') {event.preventDefault(); openProject();}
            if (key === 'n' && project && !event.shiftKey) {event.preventDefault(); setNewFile('file'); setNewFileName('');}
            if (key === 'b') {event.preventDefault(); setExplorer(previous => !previous);}
        };
        window.addEventListener('keydown',keyboard);
        return () => window.removeEventListener('keydown',keyboard);
    });

    const send = async (text,attach,selected=[],taskId='') => {
        if(aiBusy||!conversation.ready)return;
        const identity=conversation.identity.current.generation;
        const sequence = switchSequence.current;
        const paths=[...new Set([...selected,...(attach&&active?[active.path]:[])])];
        const attachmentLabel=[paths.length>1?paths.length+' project files':paths[0],taskId?'Local task output':null].filter(Boolean).join(' · ');
        const updated = [...messages,{id:crypto.randomUUID(),role:'user',content:text,attached:attachmentLabel||null}];
        setMessages(updated); setAiBusy(true);
        const controller = new AbortController(); abort.current = controller;
        try {
            const files=await collectFiles(paths);
            const result = await askAssistant({messages:updated.filter(message => !message.error),...settings,schoolMode:!!schoolStatus?.url,expectedUserId:schoolStatus?.user?.id,brief:conversation.brief,currentFile:attach ? active : null,files,taskResultRequest:taskId?{rootId:project.directory.rootId,id:taskId}:undefined,signal:controller.signal});
            if(sequence===switchSequence.current&&identity===conversation.identity.current.generation)setMessages(previous=>[...previous,{id:crypto.randomUUID(),role:'model',...(typeof result==='string'?{content:result}:result)}]);
        } catch (error) {
            if(sequence===switchSequence.current&&identity===conversation.identity.current.generation&&error.name!=='AbortError') setMessages(previous => [...previous,{id:crypto.randomUUID(),role:'model',content:error.message,error:true}]);
        } finally {if(sequence===switchSequence.current&&identity===conversation.identity.current.generation)setAiBusy(false);if(schoolStatus?.url)refreshSchool().catch(()=>{});}
    };
    const continuePending = async save => {
        if (save && !await saveAll()) return;
        try {
            saveDrafts(project.id,save ? [] : documents);
            const action = pending.action; setPending(null); await action();
        } catch (error) {if (error.name !== 'AbortError') setError(error.message);}
    };
    const visibleTree = search.trim() ? allFiles.filter(file => file.path.toLowerCase().includes(search.toLowerCase())).map(file => ({...file,name:file.path})) : tree;

    const resizeHandle = side => <div className={'mw-resize-handle ' + side} role="separator" aria-label={'Resize ' + side} aria-orientation="vertical" tabIndex={0}
        onPointerDown={event => {event.preventDefault();setResizing({side,start:event.clientX,width:panelWidths[side]});}}
        onKeyDown={event => {if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault();const amount = (event.key === 'ArrowRight' ? 20 : -20) * (side === 'explorer' ? 1 : -1);setPanelWidths(previous => ({...previous,[side]:Math.max(180,Math.min(460,previous[side]+amount))}));}}}/>;

    return <div className={'mw-app ' + (resizing ? 'resizing' : '')} style={{'--mw-explorer-width':panelWidths.explorer + 'px','--mw-assistant-width':panelWidths.assistant + 'px'}}>
        <header className="mw-titlebar">
            <button className="mw-wordmark" onClick={closeProject} title="Back to welcome">mench<span>ai</span></button>
            <nav aria-label="Application menu">
                <div className="mw-menu-wrap"><button className={menu === 'file' ? 'selected' : ''} onClick={() => setMenu(menu === 'file' ? null : 'file')}>File</button>{menu === 'file' && <><div className="mw-menu-backdrop" onClick={() => setMenu(null)}/><div className="mw-menu" role="menu">
                    <button role="menuitem" onClick={() => startNew(null)}>New Project…</button>
                    <button role="menuitem" onClick={openProject}>Open Project…<kbd>Ctrl O</kbd></button>
                    {project && <><hr/><button role="menuitem" onClick={() => {setMenu(null); setNewFile('file'); setNewFileName('');}}>New File…<kbd>Ctrl N</kbd></button><button role="menuitem" onClick={() => {setMenu(null); saveAll();}}>Save All<kbd>Ctrl Shift S</kbd></button>{desktop()?.listChanges&&<><hr/><button role="menuitem" onClick={()=>{setMenu(null);setRuntimeRequest({tab:"history",section:"changes",id:Date.now()});}}>Project changes</button><button role="menuitem" onClick={()=>{setMenu(null);setRuntimeRequest({tab:"history",section:"deleted",id:Date.now()});}}>Deleted files</button></>}<hr/><button role="menuitem" onClick={closeProject}>Close Project</button></>}
                </div></>}</div>
                <div className="mw-menu-wrap"><button className={menu === 'view' ? 'selected' : ''} onClick={() => setMenu(menu === 'view' ? null : 'view')}>View</button>{menu === 'view' && <><div className="mw-menu-backdrop" onClick={() => setMenu(null)}/><div className="mw-menu" role="menu">
                    <button role="menuitem" onClick={() => {setExplorer(!explorer); setMenu(null);}}>Explorer{explorer && <Check size={13}/>}</button>
                    <button role="menuitem" onClick={() => {setAssistant(!assistant); setMenu(null);}}>AI Assistant{assistant && <Check size={13}/>}</button>
                    <button role="menuitem" onClick={() => {setSettingsOpen(true); setMenu(null);}}>Settings…</button>
                    {project&&desktop()&&<button role="menuitem" onClick={()=>{setRuntimeRequest({tab:'terminal',id:Date.now()});setMenu(null);}}>Terminal</button>}
                </div></>}</div>
            </nav>
            <div className="mw-window-title">{project ? project.name : 'Welcome'}<span> — Mench AI</span></div>
            <div className="mw-title-actions">{desktop()?.schoolStatus&&<button className="mw-text-button" onClick={()=>setSchoolOpen(true)}>School{schoolStatus?.user?" \u00b7 "+schoolStatus.user.name:""}</button>}{project && <><button className="mw-icon" aria-label="Toggle explorer" aria-pressed={explorer} onClick={() => setExplorer(!explorer)} title="Toggle explorer (Ctrl+B)"><PanelLeft size={16}/></button><button className="mw-icon" aria-label="Toggle assistant" aria-pressed={assistant} onClick={() => setAssistant(!assistant)} title="Toggle assistant"><PanelRight size={16}/></button></>}<button className="mw-icon" aria-label="Settings" title="Settings" onClick={() => setSettingsOpen(true)}><Settings size={16}/></button></div>
        </header>
        {error && <div className="mw-error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={15}/></button></div>}
        {busy && <div className="mw-progress" role="status">Opening your workspace…</div>}
        {!project ? <main className="mw-welcome">
            <div className="mw-welcome-inner">
                <div className="mw-welcome-heading"><div className="mw-eyebrow"><span/>YOUR LOCAL WORKSPACE</div><h1>A place to make<br/>something <em>meaningful.</em></h1><p>Your files. Your ideas. A little guidance along the way.</p></div>
                <div className="mw-start-grid">
                    <section className="mw-start"><h2>Start building</h2>
                        <button className="mw-start-action" onClick={() => startNew(null)} disabled={busy}><span className="mw-start-icon"><Plus size={21}/></span><span><strong>New project</strong><small>Start fresh, in a folder you choose</small></span><ArrowRight size={18}/></button>
                        <button className="mw-start-action" onClick={openProject} disabled={busy}><span className="mw-start-icon"><FolderOpen size={20}/></span><span><strong>Open project</strong><small>Pick up where you left off</small></span><ArrowRight size={18}/></button>
                        <p className="mw-start-note">No setup needed to start coding.<br/>Connect AI whenever you’re ready.{!desktop()&&<><br/>Use Chrome or Edge for local folders. Terminal and Git are in the Windows app.</>}</p>
                    </section>
                    <section className="mw-recent"><div className="mw-section-heading"><h2>Recent projects</h2><span>{recents.length ? String(recents.length).padStart(2,'0') : '—'}</span></div>
                        {recents.length ? <div>{recents.map(recent => <button className="mw-recent-project" key={recent.id} onClick={() => openRecent(recent)} disabled={busy}><span><strong>{recent.name}</strong><small>{recent.location}</small></span><ChevronRight size={15}/></button>)}</div> : <div className="mw-recent-empty"><div className="mw-empty-lines"><span/><span/><span/></div><p>Your next project belongs here.</p><small>Projects you create or open will appear in this list.</small></div>}
                        {!!legacy.length && <details className="mw-legacy"><summary>Previous browser canvases ({legacy.length})</summary>{legacy.slice().reverse().slice(0,8).map((canvas,index) => <button key={canvas.id || index} onClick={() => startNew(canvas)}>{canvas.title || canvas.fileName || 'Untitled canvas'}<span>Save as project <ArrowRight size={12}/></span></button>)}</details>}
                    </section>
                </div>
                <footer className="mw-welcome-footer"><span><Shield size={13}/>Torah-centered learning, at your pace</span><button onClick={() => setSettingsOpen(true)}>{aiReady ? 'AI connection configured' : 'Set up AI assistance'}<ArrowRight size={13}/></button></footer>
            </div>
            <div className="mw-welcome-watermark" aria-hidden="true">m.</div>
        </main> : <div className={'mw-workbench ' + (!explorer ? 'no-explorer ' : '') + (!assistant ? 'no-assistant' : '')}>
            <aside className="mw-activity" aria-label="Workspace panels"><button className={'mw-activity-button ' + (explorer ? 'active' : '')} aria-label="Explorer" aria-pressed={explorer} onClick={() => setExplorer(!explorer)}><Files size={21}/></button>{desktop()&&<><button className="mw-activity-button" aria-label="Search project" onClick={()=>setRuntimeRequest({tab:'search',id:Date.now()})}><Search size={20}/></button><button className="mw-activity-button" aria-label="Source control" onClick={()=>setRuntimeRequest({tab:'git',id:Date.now()})}><GitBranch size={20}/></button></>}<button className={'mw-activity-button ' + (assistant ? 'active' : '')} aria-label="AI assistant panel" aria-pressed={assistant} onClick={() => setAssistant(!assistant)}><MessageSquare size={20}/></button><div/><button className="mw-activity-button" aria-label="Workspace settings" onClick={() => setSettingsOpen(true)}><Settings size={20}/></button></aside>
            {explorer && <aside className="mw-explorer"><header className="mw-panel-header"><h2>Explorer</h2><div><button className="mw-icon" aria-label="New file" title="New file" onClick={() => {setNewFile('file'); setNewFileName('');}}><Plus size={16}/></button><button className="mw-icon" aria-label="Refresh files" title="Refresh files" onClick={refreshTree}><RefreshCw size={13}/></button></div></header>
                <div className="mw-project-root"><ChevronRight size={13}/><span>{project.name}</span></div>
                <div className="mw-file-search"><Search size={12}/><input aria-label="Find a file" placeholder="Find a file…" value={search} onChange={event => setSearch(event.target.value)}/></div>
                <div className="mw-tree-scroll"><FileTree entries={visibleTree} activePath={activePath} onOpen={openDocument} onMenu={desktop()?.trash?(entry,position)=>setEntryMenu({entry,...position}):null}/>{!allFiles.length && <div className="mw-explorer-empty">Your project is ready.<br/>Add your first file to begin.<button onClick={() => {setNewFile('file'); setNewFileName('');}}>Create a file</button></div>}{search && !visibleTree.length && <p className="mw-help">No matching files.</p>}</div>
                <footer><button onClick={() => {setNewFile('folder'); setNewFileName('');}}>New folder</button><button onClick={openProject}>Open another project</button></footer>{resizeHandle('explorer')}
            </aside>}
            <main className="mw-editor-area">
                <div className="mw-tabs" role="tablist" aria-label="Open files">{documents.map(doc => <div className={'mw-tab ' + (doc.path === activePath ? 'active' : '')} key={doc.path}><button role="tab" aria-selected={doc.path === activePath} title={doc.path} onClick={() => setActivePath(doc.path)}><span className={'mw-tab-file file-' + doc.name.split('.').pop()}>{doc.name.split('.').pop() === 'html' ? '<>' : doc.name.split('.').pop() === 'js' ? 'JS' : '·'}</span>{doc.name}{doc.content !== doc.saved && <span className="mw-dirty" aria-label="Unsaved changes"/>}</button><button aria-label={'Close ' + doc.name} className="mw-tab-close" onClick={() => closeTab(doc)}><X size={13}/></button></div>)}{!documents.length && <span className="mw-empty-tab">Welcome</span>}</div>
                <div className="mw-editor-toolbar"><span className="mw-breadcrumb">{project.name}{active && <><ChevronRight size={12}/>{active.path}</>}</span><div>{active && <button className="mw-text-button" disabled={saving||(editor.current&&editorReadyKey!==editorKey)} onClick={saveActive}>{saving ? 'Saving…' : 'Save'}<kbd>Ctrl S</kbd></button>}{desktop()&&<><button className="mw-text-button" onClick={runProject}>Run project</button><button className="mw-text-button" onClick={()=>setRuntimeRequest({tab:'terminal',id:Date.now()})}>Terminal</button></>}<button className={'mw-text-button ' + (preview ? 'selected' : '')} disabled={!htmlFile&&!desktop()} title={htmlFile ? 'Preview ' + htmlFile : 'Project preview'} onClick={togglePreview}>{preview ? 'Close preview' : 'Preview'}</button></div></div>
                <div className={'mw-editors ' + (preview ? 'with-preview' : '')}>
                    <div className="mw-code-editor" data-editor-ready={editorReadyKey===editorKey}>{active ? <Editor key={editorKey} path={editorKey} language={languageFor(active.path)} value={active.content} theme="vs-dark" onChange={updateContent}
                        onMount={(instance,monaco) => {editor.current = instance;setEditorReadyKey(editorKey);positionSubscription.current?.dispose(); positionSubscription.current = instance.onDidChangeCursorPosition(event => setCursor({line:event.position.lineNumber,column:event.position.column}));
                            instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,() => window.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true})));}}
                        options={{automaticLayout:true,fontSize:13,fontFamily:"'Cascadia Code', Consolas, monospace",lineHeight:22,padding:{top:18,bottom:18},minimap:{enabled:false},scrollBeyondLastLine:false,wordWrap:'on',renderLineHighlight:'gutter',overviewRulerBorder:false,tabSize:2}}
                        loading={<div className="mw-editor-loading">Opening editor…</div>}/> : <div className="mw-empty-editor"><div className="mw-empty-monogram">m.</div><h2>Your workspace is ready.</h2><p>Open a file from the explorer, or create something new.</p><button className="mw-button" onClick={() => {setNewFile('file'); setNewFileName('');}}>New file<kbd>Ctrl N</kbd></button></div>}</div>
                    {preview && <section className="mw-preview" aria-label="Live preview"><header><span>LIVE PREVIEW</span><span>{desktop()?'Local project':htmlFile}</span><button className="mw-icon" aria-label="Close preview" onClick={() => setPreview(false)}><X size={14}/></button></header>{desktop()?(runtimeUrl?<iframe title="Project preview" sandbox="allow-scripts allow-same-origin" src={runtimeUrl}/>:<p className="mw-help">Start your project to open its preview. Check Tasks for output or errors.</p>):previewError ? <p className="mw-inline-error">{previewError}</p> : <iframe title="Project preview" sandbox="allow-scripts" srcDoc={previewResult.html}/>} {!!previewResult.missing.length && <p className="mw-preview-warning">Missing preview files: {previewResult.missing.join(', ')}</p>}</section>}
                </div>
                {desktop()&&<RuntimePanel key={project.id} project={project} request={runtimeRequest} onClose={setRuntimeRequest} onPreview={url=>setRuntimeUrl(url)} onError={setError} onOpenFile={path=>{const file=allFiles.find(file=>file.path===path);if(file)openDocument(file);}} currentFile={active} onReviewRevision={content=>setSuggestion({path:active.path,content,original:active.content})} onReviewChanges={reviewRecordedChanges} onRestored={async()=>{await refreshTree();notify("Restored from project trash.");}}/>}
            </main>
            {assistant && <aside className="mw-assistant-area"><header className="mw-panel-header"><h2>Assistant</h2><div><button className="mw-text-button" disabled={aiBusy} onClick={() => setMessages([])}>New chat</button><button className="mw-icon" aria-label="Close assistant" onClick={() => setAssistant(false)}><X size={15}/></button></div></header><AssistantPanel key={conversation.identity.current.key||'signed-out'} historyError={conversation.error} onRetryHistory={conversation.retry} historyReady={conversation.ready} brief={conversation.brief} onBriefChange={conversation.setBrief} messages={messages} contextFiles={shareableFiles} tasks={contextTasks} onRunTask={runAssistantTask} onReviewSet={reviewProposal} onSend={send} busy={aiBusy} onStop={() => abort.current?.abort()} apiReady={aiReady} onSettings={() => schoolStatus?.url?setSchoolOpen(true):setSettingsOpen(true)} currentFile={active} onReview={content => setSuggestion({path:active.path,content,original:active.content})} protection={settings.protection} language={settings.language} schoolStatus={schoolStatus}/>{resizeHandle('assistant')}</aside>}
        </div>}
        <footer className="mw-statusbar"><div><span className="mw-status-mark"/>{project ? project.name : 'Ready when you are'}{project && <span className="mw-status-muted">{dirtyCount ? dirtyCount + ' unsaved' : 'All changes saved'}</span>}</div><div>{notice && <span role="status" className="mw-notice">{notice}</span>}{active && <><span>Ln {cursor.line}, Col {cursor.column}</span><span>UTF-8</span><span>{languageFor(active.path)}</span></>}<span className="mw-status-protection">{schoolStatus?.url?(schoolStatus.connected?(schoolStatus.policy?.status==="approved"?"School policy \u00b7 v"+schoolStatus.policy.version:"Awaiting school approval"):"School connection unavailable"):getProtectionLevel(settings.protection).name}</span></div></footer>
        {newProject && <NewProjectDialog onClose={() => setNewProject(null)} onCreate={create} imported={newProject.imported}/>}
        {settingsOpen && <SettingsDialog settings={settings} schoolStatus={schoolStatus} onSchool={()=>{setSettingsOpen(false);setSchoolOpen(true);}} onSave={updateSettings} onClose={() => setSettingsOpen(false)}/>}
        {schoolOpen&&<SchoolDialog language={settings.language} communityProfile={settings.communityProfile} onClose={()=>setSchoolOpen(false)} onChanged={refreshSchool} projectFiles={shareableFiles} collectFiles={collectFiles} onStartTemplate={template=>{setSchoolOpen(false);startNew(template);}}/>}
        {projectChanges&&<ProjectChangesDialog key={projectChanges.id} record={projectChanges} busy={changesBusy} error={changesError} onClose={()=>setProjectChanges(null)} onApply={selected=>changeProject(selected)} onUndo={()=>changeProject(null,true)}/>}
        {entryMenu&&project&&<><div className="mw-menu-backdrop" onClick={()=>setEntryMenu(null)}/><div className="mw-menu mw-entry-menu" role="menu" style={{left:Math.max(8,Math.min(entryMenu.x,window.innerWidth-250)),top:Math.max(44,Math.min(entryMenu.y,window.innerHeight-140))}}><button role="menuitem" onClick={()=>{setEntryDialog({entry:entryMenu.entry,type:'rename',name:entryMenu.entry.path});setEntryMenu(null);}}>Rename or move?</button><button role="menuitem" onClick={()=>{setEntryDialog({entry:entryMenu.entry,type:'trash'});setEntryMenu(null);}}>Move to project trash?</button></div></>}
        {entryDialog&&project&&<Dialog title={entryDialog.type==='trash'?'Move to project trash':'Rename or move'} onClose={()=>!entryDialog.busy&&setEntryDialog(null)}><form onSubmit={changeEntry}>{entryDialog.type==='rename'?<><label className="mw-field">New relative path<input autoFocus required value={entryDialog.name} onChange={event=>setEntryDialog({...entryDialog,name:event.target.value})} disabled={entryDialog.busy}/></label><p className="mw-help">Rename {entryDialog.entry.path}, or enter a path in an existing folder. Unsaved editor contents are preserved.</p></>:<p className="mw-dialog-intro">Move {entryDialog.entry.path} to project trash. It can be restored from History ? Deleted files. Any unsaved files inside this entry will be saved first.</p>}{entryDialog.error&&<p className="mw-inline-error" role="alert">{entryDialog.error}</p>}<footer><button type="button" className="mw-button" onClick={()=>setEntryDialog(null)} disabled={entryDialog.busy}>Cancel</button><button className="mw-button primary" disabled={entryDialog.busy}>{entryDialog.busy?'Working?':entryDialog.type==='trash'?'Save and move to trash':'Rename or move'}</button></footer></form></Dialog>}
        {newFile && <Dialog title={newFile === 'folder' ? 'New folder' : 'New file'} onClose={() => setNewFile(null)}><form onSubmit={addEntry}><label className="mw-field">{newFile === 'folder' ? 'Folder name' : 'File name'}<input autoFocus required value={newFileName} onChange={event => setNewFileName(event.target.value)} placeholder={newFile === 'folder' ? 'components' : 'index.html'}/></label><p className="mw-help">Create in {project.name}. {newFile === 'file' && 'Use an existing folder path, such as components/header.js.'}</p><footer><button type="button" className="mw-button" onClick={() => setNewFile(null)}>Cancel</button><button className="mw-button primary" disabled={!newFileName.trim()}>Create {newFile}</button></footer></form></Dialog>}
        {pending && <Dialog title="You have unsaved changes" onClose={() => setPending(null)}><p className="mw-dialog-intro">Save your changes to the project folder before leaving, or keep a browser draft for the next time you open this project.</p><footer><button className="mw-button" onClick={() => setPending(null)}>Cancel</button><button className="mw-button" onClick={() => continuePending(false)}>Keep drafts & continue</button><button className="mw-button primary" onClick={() => continuePending(true)}>Save & continue</button></footer></Dialog>}
        {closing && <Dialog title={'Save changes to ' + closing.name + '?'} onClose={() => setClosing(null)}><p className="mw-dialog-intro">This file has changes that haven’t been saved to your folder.</p><footer><button className="mw-button" onClick={() => setClosing(null)}>Cancel</button><button className="mw-button" onClick={() => {closeDocument(closing.path); setClosing(null);}}>Discard changes</button><button className="mw-button primary" onClick={async () => {try {await saveDocument(closing); closeDocument(closing.path); setClosing(null);} catch (error) {setError(error.message);}}}>Save file</button></footer></Dialog>}
        {suggestion && <Dialog title={'Review change · ' + suggestion.path} className="mw-diff-dialog" onClose={() => setSuggestion(null)}><p className="mw-dialog-intro">Review the proposed change before applying it. Your file will only be written when you save.</p><div className="mw-diff-editor"><DiffEditor original={documents.find(doc => doc.path === suggestion.path)?.content || ''} modified={suggestion.content} language={languageFor(suggestion.path)} theme="vs-dark" options={{readOnly:true,automaticLayout:true,minimap:{enabled:false},fontSize:12,renderSideBySide:true}}/></div><footer><button className="mw-button" onClick={() => setSuggestion(null)}>Cancel</button><button className="mw-button primary" onClick={() => {setDocuments(previous => previous.map(doc => doc.path === suggestion.path ? {...doc,content:suggestion.content} : doc)); setActivePath(suggestion.path); setSuggestion(null); notify('Change applied. Save the file when you’re ready.');}}>Apply change</button></footer></Dialog>}
    </div>;
}
