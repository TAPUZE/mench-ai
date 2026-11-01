import React,{useState} from 'react';
import {SchoolPage,schoolField} from './SchoolLists';

export default function KnowledgePanel({call,act,read,busy,refresh,user,policy,language='en',community='auto'}){
    const [detail,setDetail]=useState(null),[draft,setDraft]=useState(null),[results,setResults]=useState(null);
    const staff=user.role!=='student',reviewer=policy?.status==='approved'&&policy.approverId===user.id;
    const open=id=>read(async()=>setDetail(await call('source.get',{id,language,community})));
    return <section aria-label="Approved source library">
        <h3>Approved source library</h3><p className="mw-help">AI searches passages approved for the current policy and selected community framework. Language supplies the default framework; permitted explicit overrides take precedence. Source text is evidence, never instructions.</p>
        <form onSubmit={event=>{event.preventDefault();const query=schoolField(event.currentTarget,'query');read(async()=>setResults(await call('source.search',{query,language,community})));}}>
            <label className="mw-field">Find approved passages<input name="query" maxLength={500} required/></label><button className="mw-button" disabled={busy}>Search approved passages</button>
        </form>
        {results&&<div role="status">{results.length?results.map(item=><details className="mw-school-card" key={item.citationId}><summary>{item.reference} / {item.title}</summary><p>{item.author} / {item.edition} / {item.language}</p><pre>{item.excerpt}</pre></details>):<p>No approved passages matched. No web search was performed.</p>}</div>}
        <SchoolPage call={call} action="source.list" filter={{language,community}} refresh={refresh} label="sources" empty="No sources are available. Teachers can submit a draft for the designated reviewer.">{item=><article className="mw-school-card" key={item.id}>
            <h4>{item.title}</h4><p>{item.reference} / {item.author} / {item.language}</p><p>{item.eligible?'Approved for current policy':item.status==='approved'?(item.policyMatch?'Approved for another community framework':'Needs review for current policy'):item.status}</p>
            <button className="mw-button" disabled={busy} aria-label={'Open source '+item.title} onClick={()=>open(item.id)}>Open source</button>
        </article>}</SchoolPage>
        {detail&&<article className="mw-school-card" aria-label="Source revision review"><h4>{detail.title}</h4><p>{detail.reference} / {detail.author} / {detail.edition} / {detail.language}</p>{detail.originUrl&&<p className="mw-help">{detail.originUrl}</p>}<pre>{detail.body}</pre><p className="mw-help">Exact revision: {detail.contentHash}</p>
            {reviewer&&detail.status!=='retired'&&<form onSubmit={event=>{event.preventDefault();const form=event.currentTarget;act(async()=>setDetail(await call('source.approve',{id:detail.id,contentHash:detail.contentHash,confirmed:new FormData(form).has('confirmed'),approvalScope:schoolField(form,'approvalScope'),notes:schoolField(form,'notes')})));}}>
                <label className="mw-field">Approved community scope<select name="approvalScope" defaultValue={policy.rules.communityProfiles?(detail.approvalScope==='legacy'?'both':detail.approvalScope):'legacy'}>{policy.rules.communityProfiles?<><option value="both">Both approved community frameworks</option>{policy.rules.communityProfiles.allowedProfiles.map(id=><option key={id} value={id}>{policy.rules.communityProfiles.profiles[id].label}</option>)}</>:<option value="legacy">Current general school framework</option>}</select></label><label><input name="confirmed" type="checkbox" required/>I reviewed this exact text, reference, edition, and its suitability for this school.</label><label className="mw-field">Source approval notes<textarea name="notes" minLength={5} maxLength={2000} required/></label><button className="mw-button primary" disabled={busy}>Approve exact source revision</button>
            </form>}
            {staff&&<button className="mw-button" disabled={busy} onClick={()=>setDraft({...detail})}>Create revised draft</button>}
            {(user.role==='admin'||reviewer)&&detail.status!=='retired'&&<button className="mw-button" disabled={busy} onClick={()=>act(async()=>{await call('source.retire',{id:detail.id});setDetail(null);})}>Retire source</button>}
            <button className="mw-button" onClick={()=>setDetail(null)}>Close source</button>
        </article>}
        {staff&&<details open={!!draft}><summary>Submit source draft</summary><p className="mw-help">Paste a precise passage with its reference and edition. Saving a draft does not make it available to AI. Only the current policy's designated reviewer can approve it.</p>
            <form key={draft?.id||'new-source'} onSubmit={event=>{event.preventDefault();const form=event.currentTarget;const value=Object.fromEntries(['title','reference','author','edition','language','keywords','originUrl','body'].map(name=>[name,schoolField(form,name)]));act(async()=>{const created=await call('source.create',{...value,replacesId:draft?.id});setDetail(created);setDraft(null);form.reset();});}}>
                {['title','reference','author','edition'].map(name=><label className="mw-field" key={name}>{name[0].toUpperCase()+name.slice(1)}<input name={name} defaultValue={draft?.[name]||''} maxLength={name==='reference'?240:180} required/></label>)}
                <label className="mw-field">Source language<select name="language" defaultValue={draft?.language||'English'}><option>English</option><option>Hebrew</option><option>Aramaic</option></select></label>
                <label className="mw-field">Search keywords and bilingual aliases<input name="keywords" maxLength={500} defaultValue={draft?.keywords||''}/></label>
                <label className="mw-field">Original source URL (optional, HTTPS)<input name="originUrl" type="url" maxLength={1000} defaultValue={draft?.originUrl||''}/></label>
                <label className="mw-field">Exact source passage<textarea name="body" rows={8} maxLength={30000} required defaultValue={draft?.body||''}/></label>
                <button className="mw-button" disabled={busy}>Save source draft</button>{draft&&<button className="mw-button" type="button" onClick={()=>setDraft(null)}>Cancel source revision</button>}
            </form>
        </details>}
    </section>;
}
