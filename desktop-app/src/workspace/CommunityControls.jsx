import React from 'react';
import {defaultCommunities,selectCommunity,COMMUNITY_LABELS} from '../../shared/community-profiles.mjs';

export function CommunitySelection({config,language,community='auto',voice='auto',onChange}){
    if(!config)return <p className="mw-help">Community profiles have not been approved for this school. The current school framework remains in effect.</p>;
    let selected,error;
    try{selected=selectCommunity(config,language,community);}catch(reason){error=reason.message;selected=selectCommunity(config,language);}
    const profile=selected.profile;
    return <>
        <label className="mw-field">Community framework<select name="communityProfile" value={community} onChange={event=>onChange('communityProfile',event.target.value)}>
            <option value="auto">Automatic / {selectCommunity(config,language).profile.label}</option>
            {config.allowOverride&&config.allowedProfiles.map(id=><option key={id} value={id}>{config.profiles[id].label}</option>)}
            {error&&<option value={community}>Current selection is not permitted</option>}
        </select></label>
        {error&&<p className="mw-inline-error">{error}</p>}
        <label className="mw-field">Response approach<select name="voice" value={voice} onChange={event=>onChange('voice',event.target.value)}>
            <option value="auto">Automatic / match the question</option>
            {profile.allowedVoices.map(id=><option key={id} value={id}>{profile.voices[id].label} / {profile.voices[id].inspiration}-inspired</option>)}
            {voice!=='auto'&&!profile.allowedVoices.includes(voice)&&<option value={voice}>Choose an approach for this community</option>}
        </select></label>
        <p className="mw-help">The community framework controls outlook and guidance. Language defaults to its corresponding community; an allowed override keeps that framework when you change language. These are AI approaches inspired by the blueprints, not the rabbis themselves.</p>
    </>;
}
function CommunityEditor({id,profile,onChange}){
    const update=(key,value)=>onChange({...profile,[key]:value});
    return <details><summary>{profile.label}</summary>
        <label className="mw-field">Community rules, philosophy, language and source approach<textarea rows={6} maxLength={5000} value={profile.guidance} onChange={event=>update('guidance',event.target.value)}/></label>
        <label className="mw-field">Additional blocked terms for this community<textarea rows={3} defaultValue={profile.blockedTerms.join('\n')} onChange={event=>update('blockedTerms',event.target.value.split('\n').map(term=>term.trim()).filter(Boolean))}/></label>
        <p className="mw-help">Common school restrictions still apply to every community. Sources are approved separately for English, Israeli, or both frameworks.</p>
        <label className="mw-field">Baseline voice<select value={profile.defaultVoice} onChange={event=>update('defaultVoice',event.target.value)}>{profile.allowedVoices.map(key=><option key={key} value={key}>{profile.voices[key].label}</option>)}</select></label>
        {Object.entries(profile.voices).map(([key,voice])=><details key={key}><summary>{voice.label} / {voice.inspiration}-inspired</summary>
            <label><input type="checkbox" aria-label={'Permit '+id+' '+key} checked={profile.allowedVoices.includes(key)} disabled={profile.allowedVoices.length===1&&profile.allowedVoices.includes(key)} onChange={event=>{const allowed=event.target.checked?[...profile.allowedVoices,key]:profile.allowedVoices.filter(item=>item!==key);onChange({...profile,allowedVoices:allowed,defaultVoice:allowed.includes(profile.defaultVoice)?profile.defaultVoice:allowed[0]});}}/>Permit this approach</label>
            <label className="mw-field">Voice instructions<textarea rows={3} maxLength={2000} value={voice.instructions} onChange={event=>onChange({...profile,voices:{...profile.voices,[key]:{...voice,instructions:event.target.value}}})}/></label>
        </details>)}
    </details>;
}
export function CommunityPolicyEditor({value,onChange}){
    return <fieldset className="mw-school-card"><legend>Community frameworks and voices</legend>
        <label><input type="checkbox" name="enableCommunities" checked={!!value} onChange={event=>onChange(event.target.checked?defaultCommunities():null)}/>Use the English and Israeli blueprint families</label>
        <p className="mw-help">Enabling or changing a framework creates a new policy revision. Existing approval does not silently accept new defaults or voices.</p>
        {value&&<>
            <label className="mw-field">Default framework<select name="defaultCommunity" value={value.defaultProfile} onChange={event=>onChange({...value,defaultProfile:event.target.value})}><option value="language">Hebrew → Israeli; English → English-speaking</option>{value.allowedProfiles.map(id=><option key={id} value={id}>{COMMUNITY_LABELS[id]}</option>)}</select></label>
            <label><input type="checkbox" checked={value.allowOverride} onChange={event=>onChange({...value,allowOverride:event.target.checked})}/>Allow users to explicitly override the language default</label>
            {['english','israeli'].map(id=><label key={id}><input type="checkbox" aria-label={'Permit '+id+' framework'} checked={value.allowedProfiles.includes(id)} disabled={value.allowedProfiles.length===1&&value.allowedProfiles.includes(id)} onChange={event=>{const allowed=event.target.checked?[...value.allowedProfiles,id]:value.allowedProfiles.filter(item=>item!==id);onChange({...value,allowedProfiles:allowed,defaultProfile:value.defaultProfile==='language'||allowed.includes(value.defaultProfile)?value.defaultProfile:'language'});}}/>{COMMUNITY_LABELS[id]}</label>)}
            {['english','israeli'].map(id=><CommunityEditor key={id} id={id} profile={value.profiles[id]} onChange={profile=>onChange({...value,profiles:{...value.profiles,[id]:profile}})}/>)}
        </>}
    </fieldset>;
}
export function CommunityPolicyReview({value}){
    if(!value)return <p className="mw-help">Community-specific profiles are not enabled in this revision.</p>;
    return <details className="mw-school-card"><summary>Community frameworks and voices for this revision</summary>
        <p>Default: {value.defaultProfile==='language'?'Hebrew → Israeli; English → English-speaking':COMMUNITY_LABELS[value.defaultProfile]}. Explicit override: {value.allowOverride?'allowed within the permitted profiles':'disabled'}.</p>
        {value.allowedProfiles.map(id=><section key={id}><h4>{value.profiles[id].label}</h4><pre>{value.profiles[id].guidance}</pre><p>Additional blocked terms: {value.profiles[id].blockedTerms.join(', ')||'None'}</p>
            {value.profiles[id].allowedVoices.map(key=><details key={key}><summary>{value.profiles[id].voices[key].label} / {value.profiles[id].voices[key].inspiration}-inspired</summary><pre>{value.profiles[id].voices[key].instructions}</pre></details>)}
        </section>)}
    </details>;
}
