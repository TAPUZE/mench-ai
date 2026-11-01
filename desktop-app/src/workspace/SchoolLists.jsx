import React,{useEffect,useState} from 'react';

export const schoolField=(form,name)=>String(new FormData(form).get(name)||'');
export function ShareFiles({files,selected,setSelected}){
    return <fieldset className="mw-school-files"><legend>Choose the files to share with your school</legend><p className="mw-help">Only checked files are uploaded. Open editor changes are included. Private and generated files are excluded.</p>{files.length?files.map(file=><label key={file.path}><input type="checkbox" checked={selected.includes(file.path)} onChange={event=>setSelected(previous=>event.target.checked?[...previous,file.path]:previous.filter(path=>path!==file.path))}/>{file.path}</label>):<p>Open a project first.</p>}</fieldset>;
}
function usePage({call,action,filter={},refresh}){
    const [search,setSearch]=useState(''),[cursors,setCursors]=useState([null]),[page,setPage]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
    const key=JSON.stringify(filter),cursor=cursors.at(-1);
    useEffect(()=>{
        let active=true;setLoading(true);setError('');
        const timer=setTimeout(()=>call(action,{...JSON.parse(key),cursor,search}).then(value=>{
            if(!value||!Array.isArray(value.items)||typeof value.total!=='number')throw new Error('Update the school service to use searchable pages.');
            if(active)setPage(value);
        }).catch(error=>{if(active){setError(error.message);setPage(null);}}).finally(()=>{if(active)setLoading(false);}),search?180:0);
        return ()=>{active=false;clearTimeout(timer);};
    },[call,action,key,cursor,search,refresh,retry]);
    return {page,loading,error,search,setSearch:value=>{setSearch(value);setCursors([null]);setPage(null);},next:()=>{if(page?.nextCursor){setCursors(previous=>[...previous,page.nextCursor]);setPage(null);}},previous:()=>{setCursors(previous=>previous.slice(0,-1));setPage(null);},hasPrevious:cursors.length>1,retry:()=>setRetry(value=>value+1)};
}
function PageSearch({state,label}){
    return <label className="mw-field mw-school-search">Search {label}<input type="search" value={state.search} maxLength={120} onChange={event=>state.setSearch(event.target.value)}/></label>;
}
function PageNavigation({state,label}){
    return <div className="mw-school-pagination"><span className="mw-help">{state.page?state.page.total+' matching '+label:''}</span><button type="button" className="mw-button" disabled={state.loading||!state.hasPrevious} onClick={state.previous}>Previous {label}</button><button type="button" className="mw-button" disabled={state.loading||!state.page?.nextCursor} onClick={state.next}>Next {label}</button></div>;
}
function PageStatus({state}){
    return <>{state.loading&&<p role="status" className="mw-help">Loading…</p>}{state.error&&<p className="mw-inline-error" role="alert">{state.error} <button type="button" className="mw-button" onClick={state.retry}>Try again</button></p>}</>;
}
export function SchoolPage({label,empty='No results.',children,...options}){
    const state=usePage(options);
    return <section aria-label={label} aria-busy={state.loading}><PageSearch state={state} label={label}/><PageStatus state={state}/>{state.page&&<>{state.page.items.length?state.page.items.map(children):<p className="mw-help">{empty}</p>}</>}<PageNavigation state={state} label={label}/></section>;
}
export function SchoolPicker({name,label,value,onChange,initialLabel,required=true,...options}){
    const state=usePage(options),[selection,setSelection]=useState(null),selected=value===undefined?selection?.id||'':value;
    const items=state.page?.items||[],selectedItem=items.find(item=>item.id===selected)||(selection?.id===selected?selection:null);
    return <fieldset className="mw-school-picker" aria-busy={state.loading}><legend>{label}</legend><PageSearch state={state} label={label.toLowerCase()}/><PageStatus state={state}/><label className="mw-field">Choose {label.toLowerCase()}<select name={name} value={selected} required={required} onChange={event=>{const item=items.find(item=>item.id===event.target.value);setSelection(item||null);onChange?.(event.target.value);}}><option value="">{required?'Choose…':'Not selected'}</option>{selected&&!items.some(item=>item.id===selected)&&<option value={selected}>{selectedItem?.title||selectedItem?.name||initialLabel||'Current selection'}</option>}{items.map(item=><option key={item.id} value={item.id}>{item.title||item.name}{item.username?' ('+item.username+')':''}</option>)}</select></label><PageNavigation state={state} label={label.toLowerCase()}/></fieldset>;
}
function ProjectFiles({files}){return files.map(file=><details key={file.path}><summary>{file.path}</summary><pre>{file.content}</pre></details>);}

export function AssignmentCard({item,call,act,read,busy,refresh,student,projectFiles,selected,setSelected,collectFiles,onStartTemplate,setNotice}){
    const [detail,setDetail]=useState(null),[review,setReview]=useState(null);
    const open=async()=>{const value=await call('assignment.get',{id:item.id});setDetail(value);return value;};
    return <article className="mw-school-card"><h3>{item.title}</h3><p className="mw-help">{item.class_name}{item.due_at?' · Due '+new Date(item.due_at).toLocaleString():''}</p><p className="mw-help">{item.submissionCount} submission{item.submissionCount===1?'':'s'} · {item.reviewedCount} reviewed</p>
        <button type="button" className="mw-button" disabled={busy} onClick={()=>read(async()=>{if(detail){setDetail(null);setReview(null);}else await open();})}>{detail?'Close assignment':'Open assignment'}</button>{' '}
        <button type="button" className="mw-button" disabled={busy} onClick={()=>read(async()=>{const assignment=await open();await onStartTemplate({title:assignment.title,files:assignment.templateFiles});})}>Start project from template</button>
        {detail&&<><p>{detail.instructions}</p>{student&&<details><summary>Submit project for review</summary><form onSubmit={event=>{event.preventDefault();const form=event.currentTarget;act(async()=>{await call('assignment.submit',{assignmentId:item.id,files:await collectFiles(selected),note:schoolField(form,'note')});setSelected([]);form.reset();setNotice('Project snapshot submitted.');});}}><ShareFiles files={projectFiles} selected={selected} setSelected={setSelected}/><label className="mw-field">Note for your teacher<textarea name="note" maxLength={2000}/></label><button className="mw-button primary" disabled={busy||!selected.length}>Submit selected files</button></form></details>}
            <SchoolPage call={call} action="assignment.submissions" filter={{assignmentId:item.id}} refresh={refresh} label="submissions" empty="No submissions yet.">{submission=><div className="mw-school-submission" key={submission.id}><span>{student?'Your submission':submission.student_name} · {new Date(submission.created_at).toLocaleString()}</span>{submission.feedback&&<p>Teacher feedback: {submission.feedback}</p>}<button type="button" className="mw-button" disabled={busy} onClick={()=>read(async()=>setReview(await call('assignment.submission',{id:submission.id})))}>{student?'View submission and feedback':'Review submitted files'}</button></div>}</SchoolPage>
            {review&&<section className="mw-school-card"><h3>{student?'Your submission':'Submitted project'}</h3><p>{review.note}</p><ProjectFiles files={review.files}/>{student?<p>Teacher feedback: {review.feedback||'Awaiting review.'}</p>:<form key={review.id} onSubmit={event=>{event.preventDefault();const form=event.currentTarget;act(async()=>{await call('assignment.review',{id:review.id,feedback:schoolField(form,'feedback')});setReview(null);setNotice('Feedback saved.');});}}><label className="mw-field">Teacher feedback<textarea name="feedback" defaultValue={review.feedback||''} maxLength={8000} required/></label><button className="mw-button primary" disabled={busy}>Save feedback</button></form>}</section>}
        </>}
    </article>;
}
export function TemplateCard({item,call,act,read,busy,admin,onStartTemplate}){
    const [detail,setDetail]=useState(null);
    const open=async()=>{const value=await call('template.get',{id:item.id});setDetail(value);return value;};
    return <article className="mw-school-card"><h3>{item.title} <small>{item.status}</small></h3><button type="button" className="mw-button" disabled={busy} onClick={()=>read(async()=>{if(detail)setDetail(null);else await open();})}>{detail?'Hide template files':'View template files'}</button>{detail&&<ProjectFiles files={detail.files}/>}
        {item.status==='approved'?<button type="button" className="mw-button" disabled={busy} onClick={()=>read(async()=>{const template=await open();await onStartTemplate({title:template.title,files:template.files});})}>Start new project</button>:admin&&detail&&<form onSubmit={event=>{event.preventDefault();const form=event.currentTarget;act(()=>call('template.approve',{id:item.id,confirmed:new FormData(form).has('confirmed')}));}}><label><input type="checkbox" name="confirmed" required/>I reviewed these template files for school use.</label><button className="mw-button" disabled={busy}>Approve template</button></form>}
    </article>;
}
export function ClassCard({item,call,act,busy,student,refresh}){
    const [roster,setRoster]=useState(false);
    return <article className="mw-school-card"><h3>{item.name}</h3><p className="mw-help">{item.teacher_name} · {item.studentCount} students</p>{!student&&<><button type="button" className="mw-button" onClick={()=>setRoster(value=>!value)}>{roster?'Hide class roster':'View class roster'}</button>{roster&&<SchoolPage call={call} action="class.students" filter={{classId:item.id}} refresh={refresh} label="class students" empty="No students enrolled yet.">{user=><p key={user.id}>{user.name} · {user.username}</p>}</SchoolPage>}<form onSubmit={event=>{event.preventDefault();const form=event.currentTarget;act(async()=>{await call('class.enroll',{classId:item.id,username:schoolField(form,'username')});form.reset();});}}><label className="mw-field">Add student by username<input name="username" required/></label><button className="mw-button" disabled={busy}>Add student</button></form></>}</article>;
}
