import React,{useState} from 'react';
import {DiffEditor} from '@monaco-editor/react';
import {Dialog} from './Panels';
import {languageFor} from './projects';

export default function ProjectChangesDialog({record,busy,error,onClose,onApply,onUndo}){
    const review=record.status==='prepared';
    const changes=review?record.changes:record.changes.filter(change=>record.selected?.includes(change.path));
    const [selected,setSelected]=useState(changes.map(change=>change.path)),[active,setActive]=useState(changes[0]?.path);
    const current=changes.find(change=>change.path===active)||changes[0];
    return <Dialog title={review?'Review project changes':'Project change history'} className="mw-project-diff-dialog" onClose={()=>!busy&&onClose()}>
        <p className="mw-dialog-intro">{record.summary}</p>
        <p className="mw-help">{review?'Choose the files to apply. Applying writes the selected files to your project and keeps a recovery record for undo.':'Status: '+record.status+'. Undo restores the recorded originals and moves newly created files to project trash. Newer edits are protected.'}</p>
        <div className="mw-project-diff"><aside aria-label="Proposed files">{changes.map(change=><div key={change.path}>{review&&<input aria-label={'Apply '+change.path} type="checkbox" checked={selected.includes(change.path)} disabled={busy} onChange={event=>setSelected(previous=>event.target.checked?[...previous,change.path]:previous.filter(path=>path!==change.path))}/>}<button className={current?.path===change.path?'active':''} onClick={()=>setActive(change.path)}>{change.path}<small>{change.beforeHash?'Modify':'New file'}</small></button></div>)}</aside><section aria-label="Selected file diff">{current&&<><p>{current.path}</p><DiffEditor key={current.path} original={current.original} modified={current.content} language={languageFor(current.path)} theme="vs-dark" options={{readOnly:true,automaticLayout:true,minimap:{enabled:false},fontSize:12,renderSideBySide:true}}/></>}</section></div>
        {error&&<p role="alert" className="mw-inline-error">{error}</p>}
        <footer><button className="mw-button" disabled={busy} onClick={onClose}>Close</button>{review?<button className="mw-button primary" disabled={busy||!selected.length} onClick={()=>onApply(selected)}>{busy?'Applying…':'Apply and save '+selected.length+' file'+(selected.length===1?'':'s')}</button>:['applied','applying','recovery'].includes(record.status)&&<button className="mw-button primary" disabled={busy} onClick={onUndo}>{busy?'Restoring…':record.status==='applied'?'Undo and save originals':'Recover original files'}</button>}</footer>
    </Dialog>;
}
