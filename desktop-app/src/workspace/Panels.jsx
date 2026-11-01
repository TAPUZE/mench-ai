import {CommunitySelection} from './CommunityControls';
import {defaultCommunities} from '../../shared/community-profiles.mjs';
import React, {useEffect, useRef, useState} from 'react';
import {ChevronRight, ChevronDown, File, Folder, X, ArrowUp, Square, Check, Copy} from 'lucide-react';
import packageInfo from '../../package.json';
import {TEACHING_STYLES} from '../../shared/chat-context.mjs';
import {TUTOR_PROFILES} from '../../shared/tutor-profile.mjs';
import {AVAILABLE_MODELS} from '../constants/models';
import {getProtectionLevel, PROTECTION_LEVELS} from '../constants/protectionLevels';
import {messageParts} from './assistant';
import {chooseDirectory} from './projects';
import {proposalPart,shareablePath,taskPart} from '../../shared/project-changes.mjs';

export function Dialog({title, children, onClose, className = '',busy=false}) {
    const ref = useRef(null);
    const close = useRef(onClose);
    close.current = onClose;
    useEffect(() => {
        const previous = document.activeElement;
        const initialFocus = ref.current?.querySelector('input:not([type="radio"]), textarea, select');
        if (initialFocus) initialFocus.focus();
        else ref.current?.focus();
        const key = event => {
            if (event.key === 'Escape') { event.stopPropagation(); close.current(); }
            if (event.key === 'Tab') {
                const focusable = [...ref.current.querySelectorAll('button:not(:disabled), input, select, textarea, [tabindex="0"]')];
                const first = focusable[0], last = focusable.at(-1);
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        };
        const element = ref.current;
        element.addEventListener('keydown',key);
        return () => { element.removeEventListener('keydown',key); previous?.focus(); };
    },[]);
    return <div className="mw-overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}>
        <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-busy={busy} aria-label={title} className={'mw-dialog ' + className}>
            <header><h2>{title}</h2><button className="mw-icon" onClick={onClose} aria-label="Close dialog"><X size={17}/></button></header>
            {children}
        </section>
    </div>;
}

export function NewProjectDialog({onClose, onCreate, imported}) {
    const [name,setName] = useState(imported ? (imported.title || 'Imported project').replace(/[<>:"/\\|?*]/g,'-') : '');
    const [template,setTemplate] = useState(imported ? 'import' : 'web');
    const [parent,setParent] = useState(null);
    const [busy,setBusy] = useState(false);
    const [error,setError] = useState('');
    const chooseLocation = async () => {
        try {
            setError('');
            setParent(await chooseDirectory({purpose:'create'}));
        } catch (error) { if (error.name !== 'AbortError') setError(error.message); }
    };
    const submit = async event => {
        event.preventDefault();
        if (!parent) return;
        setBusy(true); setError('');
        try { await onCreate(parent,name,template,imported); }
        catch (error) { setError(error.message); setBusy(false); }
    };
    return <Dialog title={imported?.files ? 'New project from school template' : imported ? 'Save browser canvas as a project' : 'New project'} onClose={() => !busy && onClose()}>
        <form onSubmit={submit}>
            <p className="mw-dialog-intro">Give your project a home. You can reopen this folder any time.</p>
            <label className="mw-field">Project name<input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="my-first-project" disabled={busy}/></label>
            <fieldset className="mw-template-options" disabled={busy}>
                <legend>Start with</legend>
                {!imported ? <>
                    <label className={template === 'web' ? 'selected' : ''}><input type="radio" name="template" value="web" checked={template === 'web'} onChange={() => setTemplate('web')}/><span><strong>Simple website</strong><small>HTML, CSS, and JavaScript. Ready to preview.</small></span></label>
                    <label className={template === 'empty' ? 'selected' : ''}><input type="radio" name="template" value="empty" checked={template === 'empty'} onChange={() => setTemplate('empty')}/><span><strong>Empty folder</strong><small>A blank workspace for your own files.</small></span></label>
                </> : <p className="mw-muted">{imported.files?'The approved template files will be copied into your new project folder.':'Your saved canvas will become an HTML file in the new folder.'}</p>}
            </fieldset>
            <div className="mw-field">Location<div className="mw-location"><span>{parent ? parent.name : 'Choose a folder on your computer'}</span><button type="button" className="mw-button" disabled={busy} onClick={chooseLocation}>Choose location…</button></div></div>
            <p className="mw-help">{parent && name.trim() ? 'A new folder will be created at ' + parent.name + '/' + name.trim() : 'Your project files will be saved inside a new folder here.'}</p>
            {error && <p className="mw-inline-error" role="alert">{error}</p>}
            <footer><button type="button" className="mw-button" onClick={onClose} disabled={busy}>Cancel</button><button className="mw-button primary" disabled={busy || !parent || !name.trim()}>{busy ? 'Creating project…' : 'Create project'}</button></footer>
        </form>
    </Dialog>;
}

export function SettingsDialog({settings, onSave, onClose,schoolStatus,onSchool}) {
    const [draft,setDraft] = useState(settings);
    const change = (key,value) => setDraft(previous => ({...previous,[key]:value,...(['language','communityProfile'].includes(key)?{voice:'auto'}:{})}));
    return <Dialog title="Workspace settings" onClose={onClose}>
        <form onSubmit={event => {event.preventDefault(); onSave(draft);}}>
            <p className="mw-help">Mench AI {packageInfo.version}{schoolStatus && ' / Windows desktop. Updates are installed by your administrator.'}</p>
            <p className="mw-dialog-intro">Your editor works on its own. Connect Gemini when you want AI help.</p>
            {schoolStatus?.url?<><p className="mw-help">AI uses your school service. Provider keys, model choice, and content policy are controlled by its administrator.</p><button type="button" className="mw-button" onClick={onSchool}>Open school</button></>:<>
            <label className="mw-field">Gemini API key<input type="password" value={draft.apiKey} autoComplete="off" onChange={event => change('apiKey',event.target.value)} placeholder={settings.apiConfigured?'A key is configured. Leave blank to keep it.':'Enter your API key'}/></label>
            <p className="mw-help">{schoolStatus?'Protected with Windows credential encryption. AI requests go to Google through the desktop process.':'Saved only in this browser. AI requests go directly to Google.'}</p>
            {schoolStatus&&settings.apiConfigured&&<label className="mw-help"><input type="checkbox" checked={!!draft.removeKey} onChange={event=>change('removeKey',event.target.checked)}/>Remove the saved provider key</label>}
            <label className="mw-field">Model<select value={draft.model} onChange={event => change('model',event.target.value)}>{Object.entries(AVAILABLE_MODELS).map(([id,model]) => <option key={id} value={id}>{model.name}</option>)}</select></label>
            </>}
            <label className="mw-field">Assistant language<select name="assistantLanguage" value={draft.language} onChange={event => change('language',event.target.value)}><option value="en">English</option><option value="he">עברית</option></select></label>
            <CommunitySelection config={schoolStatus?.url?schoolStatus.communityOptions:defaultCommunities()} language={draft.language} community={draft.communityProfile||'auto'} voice={draft.voice||'auto'} onChange={change}/>
            {!schoolStatus?.url&&<><label className="mw-field">Content protection<select value={draft.protection} onChange={event => change('protection',event.target.value)}>{Object.values(PROTECTION_LEVELS).filter(level => !level.devOnly).map(level => <option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
            <p className="mw-help">{getProtectionLevel(draft.protection).description}. Personal settings do not establish school policy approval.</p></>}
            <footer><button type="button" className="mw-button" onClick={onClose}>Cancel</button><button className="mw-button primary">Save settings</button></footer>
        </form>
    </Dialog>;
}

export function FileTree({entries, activePath, onOpen,onMenu, level = 0}) {
    const [expanded,setExpanded] = useState(new Set());
    return <div className="mw-tree" role={level === 0 ? 'tree' : 'group'} aria-label={level === 0 ? 'Project files' : undefined}>
        {entries.map(entry => <div key={entry.path}>
            <button role="treeitem" aria-selected={entry.kind === 'file' ? activePath === entry.path : undefined} aria-expanded={entry.kind === 'directory' ? expanded.has(entry.path) : undefined}
                className={'mw-tree-item ' + (entry.path === activePath ? 'active' : '')}
                style={{paddingLeft:12 + level * 14}} title={entry.path}
                onContextMenu={event=>{if(onMenu){event.preventDefault();onMenu(entry,{x:event.clientX,y:event.clientY});}}}
                onKeyDown={event=>{if(onMenu&&event.shiftKey&&event.key==='F10'){event.preventDefault();const rect=event.currentTarget.getBoundingClientRect();onMenu(entry,{x:rect.left+30,y:rect.bottom});}}}
                onClick={() => entry.kind === 'directory' ? setExpanded(previous => {const next = new Set(previous); next.has(entry.path) ? next.delete(entry.path) : next.add(entry.path); return next;}) : onOpen(entry)}>
                {entry.kind === 'directory' ? <>{expanded.has(entry.path) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}<Folder size={14}/></> : <><span className="mw-tree-spacer"/><File size={14} className={'file-' + entry.name.split('.').pop()}/></>}
                <span>{entry.name}</span>
            </button>
            {entry.kind === 'directory' && expanded.has(entry.path) && <FileTree entries={entry.children} activePath={activePath} onOpen={onOpen} onMenu={onMenu} level={level+1}/>}
        </div>)}
    </div>;
}

function AssistantCodeBlock({part,currentFile,onReview,onReviewSet,onRunTask,onCopy,copied}){
    const project=proposalPart(part),task=taskPart(part);
    if(project.error||task.error)return <p className="mw-inline-error">{project.error||task.error}</p>;
    if(project.proposal)return <div className="mw-project-proposal"><p>{project.proposal.summary}</p><ul>{project.proposal.changes.map(change=><li key={change.path}>{change.path}</li>)}</ul><button className="mw-review-button" onClick={()=>onReviewSet(project.proposal)}>Review {project.proposal.changes.length} project changes</button></div>;
    if(task.task)return <div className="mw-project-proposal"><p>{task.reason}</p><small>The command runs only when you choose to run it.</small><button className="mw-review-button" onClick={()=>onRunTask(task.task)}>Run {task.task} in this project</button></div>;
    return <div className="mw-code-block"><div><span>{part.language||'code'}</span><button title="Copy code" aria-label="Copy code" onClick={onCopy}>{copied?<Check size={13}/>:<Copy size={13}/>}</button></div><pre><code>{part.text}</code></pre>{currentFile&&<button className="mw-review-button" onClick={()=>onReview(part.text)}>Review change to {currentFile.name}</button>}</div>;
}

export function AssistantPanel({messages, onSend, busy, onStop, apiReady, onSettings, currentFile, onReview,onReviewSet,onRunTask,contextFiles=[],tasks=[], protection, language,schoolStatus,historyReady=true,historyError,onRetryHistory,brief='',onBriefChange}) {
    const [input,setInput] = useState('');
    const [draftBrief,setDraftBrief]=useState(brief);
    useEffect(()=>setDraftBrief(brief),[brief]);
    const [attach,setAttach] = useState(false);
    const [copied,setCopied] = useState('');
    const [selected,setSelected]=useState([]),[contextSearch,setContextSearch]=useState('');
    const [taskId,setTaskId]=useState('');
    const end = useRef(null);
    useEffect(() => {end.current?.scrollIntoView({block:'nearest'});},[messages,busy]);
    useEffect(() => {setAttach(false);},[currentFile?.path]);
    const submit = event => {
        event.preventDefault();
        if (!input.trim() || busy || !historyReady) return;
        if (!apiReady) {onSettings(); return;}
        onSend(input.trim(),attach,selected,taskId);
        setInput('');
    };
    return <div className="mw-assistant">
        <div className="mw-assistant-meta"><span className="mw-policy-dot"/>{schoolStatus?.url?(schoolStatus.policy?.status==='approved'?'School policy · v'+schoolStatus.policy.version:'School policy awaiting approval'):getProtectionLevel(protection).name}<span className="mw-subtle">Torah-centered</span></div>
        <div className="mw-messages" aria-live="polite" role="log" aria-label="Assistant conversation">
            {historyError&&<p role="alert" className="mw-inline-error">{historyError} <button type="button" onClick={onRetryHistory}>Reload conversation</button></p>}{!historyReady&&schoolStatus?.user&&<p role="status">Loading your private conversation...</p>}
            {!messages.length && <div className="mw-chat-empty"><div className="mw-small-label">A LITTLE HELP, WHEN YOU NEED IT</div><h3>Build with understanding.</h3><p>Ask a question, work through an idea, or get help with your code.</p><div className="mw-suggested">{['Explain the current file','Help me plan this project','What should I try next?'].map(text => <button key={text} onClick={() => setInput(text)}>{text}<ChevronRight size={13}/></button>)}</div></div>}
            {messages.map(message => <article className={'mw-message ' + message.role} key={message.id} dir={language === 'he' ? 'rtl' : 'auto'}>
                <div className="mw-message-author">{message.role === 'user' ? 'You' : message.error ? 'Connection issue' : 'Mench AI'}{message.attached && <small>{message.attached}</small>}</div>
                {messageParts(message.content).map((part,index) => part.type === 'code' ? <AssistantCodeBlock key={index} part={part} currentFile={currentFile} onReview={onReview} onReviewSet={onReviewSet} onRunTask={onRunTask} copied={copied===message.id+index} onCopy={async()=>{await navigator.clipboard.writeText(part.text);setCopied(message.id+index);}}/> : <p key={index}>{part.text.replace(/\[\[source:([^\]\r\n]+)\]\]/g,(_match,id)=>{const citation=(message.citations||[]).findIndex(source=>source.citationId===id);return citation<0?'[unverified source]':'['+(citation+1)+']';})}</p>)}
                {message.context&&<details className="mw-help mw-context-receipt"><summary>Context: {message.context.lookup==='approved-library'?message.context.sourceCount+' approved passage'+(message.context.sourceCount===1?'':'s'):message.context.lookup==='no-approved-sources'?'no approved sources found':'conversation and selected context'}</summary>{message.context.community&&<p>{message.context.community.label} / {message.context.community.voices.map(voice=>voice.label+' ('+voice.inspiration+'-inspired)').join(' + ')}</p>}<p>{TUTOR_PROFILES[message.context.intent]?.name||'Learning tutor'} / {TEACHING_STYLES[message.context.style]||'Clear and practical'}</p><p>Estimated {message.context.estimatedTokens} of {message.context.tokenBudget} context tokens; {message.context.earlierExcerpts} earlier conversation excerpts.</p></details>}
                {!!message.citations?.length&&<div className="mw-citations" aria-label="Retrieved source passages">{message.citations.map((source,index)=><details key={source.citationId}><summary>[{index+1}] {source.reference} / {source.title}</summary><p>{source.author} / {source.edition} / {source.language}</p><blockquote>{source.excerpt}</blockquote><details><summary>Source revision</summary><small>{source.contentHash}{source.originUrl?' / '+source.originUrl:''}</small></details></details>)}<p className="mw-help">Passages retrieved for this answer; approval may change later.</p></div>}
            </article>)}
            {busy && <div className="mw-assistant-working"><span/>Waiting for a response…</div>}<div ref={end}/>
        </div>
        <form className="mw-composer" onSubmit={submit}>
            {!apiReady && <button type="button" className="mw-connect" onClick={onSettings}>{schoolStatus?.url?'Sign in to your school to use the assistant':'Connect Gemini to use the assistant'} <ChevronRight size={13}/></button>}
            <label className="mw-sr-only" htmlFor="assistant-prompt">Message the assistant</label>
            <textarea id="assistant-prompt" value={input} onChange={event => setInput(event.target.value)} placeholder="Ask about your project…" rows={3}
                onKeyDown={event => {if (event.key === 'Enter' && !event.shiftKey) {event.preventDefault(); submit(event);}}}/>
            {!!contextFiles.length&&<details className="mw-context-files"><summary>Project context{selected.length?' · '+selected.length+' selected':''}</summary><p>Checked file contents are sent to your AI provider. Nothing is attached automatically.</p><input aria-label="Find context files" placeholder="Find a project file" value={contextSearch} onChange={event=>setContextSearch(event.target.value)}/><div>{contextFiles.filter(file=>file.path.toLowerCase().includes(contextSearch.toLowerCase())).map(file=><label key={file.path}><input type="checkbox" aria-label={'Attach '+file.path} checked={selected.includes(file.path)} disabled={busy||(!selected.includes(file.path)&&selected.length>=20)} onChange={event=>setSelected(previous=>event.target.checked?[...previous,file.path]:previous.filter(path=>path!==file.path))}/>{file.path}</label>)}</div></details>}
            {!!tasks.length&&<label className="mw-context-task">Task output<select aria-label="Attach task output" value={taskId} disabled={busy} onChange={event=>setTaskId(event.target.value)}><option value="">Do not attach output</option>{tasks.map(task=><option key={task.id} value={task.id}>{task.action} ? {task.status}{task.exitCode!==undefined?" ? exit "+task.exitCode:""}</option>)}</select><small>Choose output to send to your AI provider.</small></label>}
            <details className="mw-context-files"><summary>Project brief{brief?' / saved':' / optional'}</summary><p>Your notes and decisions stay with this account and project and are included as context. They do not override school policy.</p><textarea aria-label="Project brief" maxLength={4000} rows={3} value={draftBrief} onChange={event=>setDraftBrief(event.target.value)}/><button type="button" className="mw-button" disabled={!historyReady||busy||draftBrief===brief} onClick={()=>onBriefChange?.(draftBrief)}>Save project brief</button></details><p className="mw-help mw-context-preview">Includes recent conversation, your saved brief, and checked files. {schoolStatus?.url?'The school service searches its approved library.':'No verified source library or web search is connected.'}</p><div className="mw-compose-actions">{currentFile&&shareablePath(currentFile.path) ? <label title="Share this file with your AI provider as context for this message"><input type="checkbox" checked={attach} onChange={event => setAttach(event.target.checked)}/>Include {currentFile.name}</label> : <span>{currentFile?'Private file excluded':'No file attached'}</span>}
                {busy ? <button type="button" className="mw-send" onClick={onStop} aria-label="Stop response"><Square size={13}/></button> : <button className="mw-send" disabled={!input.trim()||!historyReady} aria-label="Send message"><ArrowUp size={16}/></button>}
            </div>
        </form>
    </div>;
}
