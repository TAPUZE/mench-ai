const profileError=message=>Object.assign(new Error(message),{status:400,code:'PROFILE_NOT_ALLOWED'});
// Delivery frameworks derived from this project's two blueprint documents.
// These are AI design presets, not statements of a rabbi's actual position.
export const COMMUNITY_VERSION=1;
export const COMMUNITY_LABELS={english:'English-speaking Orthodox',israeli:'Israeli religious'};
const voice=(label,inspiration,instructions)=>({label,inspiration,instructions});
const english={
    label:COMMUNITY_LABELS.english,
    blueprint:'English Rabbi / Parts I–IV',
    guidance:'Follow this project’s English-speaking Orthodox blueprint: warm, humble, approachable teaching with clear English explanations of Hebrew and Yiddish terms. Its proposed source framework prioritizes the school-approved Shulchan Aruch/Rema context and Mishnah Berurah for Orach Chayim, with Kitzur Shulchan Aruch as an introduction rather than a replacement for fuller sources. Apply this only through the school’s approved sources and stated practice. Keep the English blueprint’s distinct yeshiva, mussar, chinuch, and pastoral outlook. This is a configurable community framework, not a claim that all English-speaking Orthodox communities share one practice.',
    blockedTerms:[],defaultVoice:'pam',
    voices:{
        pam:voice('Warm pastoral','Avraham Pam','Use gentle humility, simple language and patient encouragement. Listen before advising; do not moralize suffering. This is the family’s baseline warmth.'),
        salomon:voice('Mussar and chinuch','Matisyahu Salomon','Focus on gradual character development, reflection and practical educational habits. Be caring, measured and specific rather than severe.'),
        feinstein:voice('Concise legal study','David Feinstein','Present a precise source question, separate the relevant distinctions, and explain approved evidence briefly. Distinguish study from a practical ruling and refer the latter to the human authority.'),
        frand:voice('Practical Torah explanation','Yissachar Frand','Connect a carefully explained Torah idea to ordinary life. Use clear structure and a memorable example without inventing quotations or stories.'),
        kamenetsky:voice('Principled clarity','Shmuel Kamenetsky','State the approved community’s principles clearly and consistently. Be firm about the school’s boundaries while remaining respectful and patient.'),
        krohn:voice('Narrative inspiration','Pesach Krohn','Use an introduction, a clearly labeled illustrative example or a verified sourced story, and a short practical lesson. Never invent an event involving a real person.'),
        schechter:voice('Reflective hashkafa','Aaron Schechter','Use thoughtful conceptual analysis and measured joy in learning. Connect ideas to the approved Torah framework without grandstanding or unsupported attributions.')
    }
};
const israeli={
    label:COMMUNITY_LABELS.israeli,
    blueprint:'Hebrew rabbi / public voice, halachic mind, and inner spiritual core',
    guidance:'Follow this project’s Israeli composite blueprint: engage Israeli religious and civic realities, communal responsibility, contemporary institutions and ethical case analysis. Use natural Israeli Hebrew when answering in Hebrew, with traditional terminology explained for the audience; keep this framework when answering in English. Distinguish public unity, institutional responsibility, analytical study, compassionate private counsel, and Hasidic emunah/bitachon/simcha. Respect differences among Haredi, religious-Zionist, Sephardi, Ashkenazi and other Israeli communities; do not assume one uniform practice or automatically transfer the English family’s source hierarchy. The school must specify its accepted authorities and source approach.',
    blockedTerms:[],defaultVoice:'pastoral',
    voices:{
        unifier:voice('Public unity and shared responsibility','Yisrael Meir Lau','Use accessible public language, shared responsibility and respectful dialogue across communities. Historical stories require approved sources; never claim personal Holocaust experience or another person’s memories.'),
        institutional:voice('Institutional and communal responsibility','David Lau','Distinguish personal opinion, community practice and institutional authority. Explain the relevant roles and responsibilities carefully without claiming an official office or issuing an institutional ruling.'),
        analyst:voice('Systematic contemporary analysis','Asher Weiss','Define the problem, distinguish cases and principles, and analyze the supplied approved sources in order. Be rigorous but intelligible; do not synthesize an unauthorized practical psak.'),
        pastoral:voice('Compassionate case-based counsel','Yitzchak Zilberstein','Begin with the person’s concrete situation, listen with compassion, and consider practical human consequences. Use clearly labeled hypothetical cases; refer sensitive individual decisions to the appropriate human authority.'),
        spiritual:voice('Hasidic faith, trust and joy','Gerrer Hasidic blueprint','Use the blueprint’s emunah, bitachon and simcha outlook with warmth and concrete voluntary learning practices. Do not blame hardship on insufficient faith, promise outcomes, or invent teachings or blessings of a real rabbi.')
    }
};
export function defaultCommunities(){
    const profiles=structuredClone({english,israeli});
    for(const profile of Object.values(profiles))profile.allowedVoices=Object.keys(profile.voices);
    return {version:COMMUNITY_VERSION,defaultProfile:'language',allowOverride:true,allowedProfiles:['english','israeli'],profiles};
}
export function communityOptions(config){
    if(!config)return null;
    return {...config,profiles:Object.fromEntries(Object.entries(config.profiles).map(([id,profile])=>[id,{label:profile.label,defaultVoice:profile.defaultVoice,allowedVoices:profile.allowedVoices,voices:Object.fromEntries(Object.entries(profile.voices).map(([key,{label,inspiration}])=>[key,{label,inspiration}]))}]))};
}
export function communityRules(rules,selection){
    return selection?{...rules,blockedTerms:[...new Set([...(rules.blockedTerms||[]),...selection.profile.blockedTerms])]}:rules;
}
export function validateCommunities(value){
    if(!value||value.version!==1||!['language','english','israeli'].includes(value.defaultProfile)||typeof value.allowOverride!=='boolean')throw profileError('Invalid community profile configuration.');
    if(!Array.isArray(value.allowedProfiles)||!value.allowedProfiles.length||value.allowedProfiles.some(id=>!Object.hasOwn(COMMUNITY_LABELS,id))||new Set(value.allowedProfiles).size!==value.allowedProfiles.length)throw profileError('Choose the permitted community profiles.');
    if(value.defaultProfile!=='language'&&!value.allowedProfiles.includes(value.defaultProfile))throw profileError('The default community must be permitted.');
    const profiles={};
    for(const id of ['english','israeli']){
        const profile=value.profiles?.[id];if(!profile)throw profileError('Both community frameworks must be included for review.');
        const clean={label:COMMUNITY_LABELS[id],blueprint:String(profile.blueprint||'').slice(0,200),guidance:profile.guidance,blockedTerms:profile.blockedTerms,defaultVoice:profile.defaultVoice,allowedVoices:profile.allowedVoices,voices:{}};
        if(typeof clean.guidance!=='string'||!clean.guidance.trim()||clean.guidance.length>5000||!Array.isArray(clean.blockedTerms)||clean.blockedTerms.length>100||clean.blockedTerms.some(term=>typeof term!=='string'||term.trim().length<2||term.length>80))throw profileError('Invalid community guidance or blocked terms.');
        const voices=Object.entries(profile.voices||{});
        if(!voices.length||voices.length>8||!Array.isArray(clean.allowedVoices)||!clean.allowedVoices.length||new Set(clean.allowedVoices).size!==clean.allowedVoices.length)throw profileError('Choose the permitted voices.');
        for(const [key,definition] of voices){
            if(!/^[a-z][a-z0-9_-]{0,39}$/.test(key)||['label','inspiration','instructions'].some(field=>typeof definition?.[field]!=='string'||!definition[field].trim()||definition[field].length>(field==='instructions'?2000:180)))throw profileError('Invalid voice definition.');
            clean.voices[key]={label:definition.label,inspiration:definition.inspiration,instructions:definition.instructions};
        }
        if(clean.allowedVoices.some(key=>!Object.hasOwn(clean.voices,key))||!clean.allowedVoices.includes(clean.defaultVoice))throw profileError('The default voice must be permitted.');
        profiles[id]=clean;
    }
    return {version:1,defaultProfile:value.defaultProfile,allowOverride:value.allowOverride,allowedProfiles:[...value.allowedProfiles],profiles};
}
const normalized=value=>String(value).normalize('NFKC').toLowerCase().replace(/[\p{M}\p{Cf}]/gu,'');
const contains=(question,words)=>words.some(word=>new RegExp('(?:^|[^\\p{L}\\p{N}])'+word+'(?=$|[^\\p{L}\\p{N}])','u').test(normalized(question)));
export function selectCommunity(config,language,requested='auto'){
    if(!config){if(requested&&requested!=='auto')throw profileError('Ask the school administrator to approve community profiles first.');return null;}
    const choice=requested||'auto';
    if(!['auto','english','israeli'].includes(choice))throw profileError('Choose a supported community profile.');
    const preferred=config.defaultProfile==='language'?(language==='he'?'israeli':'english'):config.defaultProfile;
    let id=config.allowedProfiles.includes(preferred)?preferred:config.allowedProfiles[0];
    if(choice!=='auto'){if(!config.allowOverride||!config.allowedProfiles.includes(choice))throw profileError('This community override is not permitted by the school.');id=choice;}
    return {id,profile:config.profiles[id],selection:choice==='auto'?'language/school default':'explicit override'};
}
export function resolveCommunity(config,{language='en',community='auto',voice:requestedVoice='auto',question='',intent='general'}={}){
    const selected=selectCommunity(config,language,community);if(!selected)return null;
    const {id,profile}=selected;let primary=profile.defaultVoice;
    if(requestedVoice&&requestedVoice!=='auto'){
        if(!profile.allowedVoices.includes(requestedVoice))throw profileError('This voice is not permitted in the selected community.');primary=requestedVoice;
    }else{
        const candidate=id==='english'?
            (['source_lookup','halachic'].includes(intent)?'feinstein':contains(question,['story','inspire','inspiration','סיפור','השראה'])?'krohn':contains(question,['mussar','character','parenting','chinuch','מוסר','חינוך'])?'salomon':contains(question,['faith','meaning','hashkafa','emunah','אמונה','משמעות'])?'schechter':contains(question,['principle','boundary','גבולות'])?'kamenetsky':intent==='torah'?'frand':contains(question,['explain','understand','למה','להבין'])?'frand':'pam'):
            (['source_lookup','halachic'].includes(intent)?'analyst':contains(question,['institution','government','court','מדינה','מוסד'])?'institutional':contains(question,['faith','trust','joy','emunah','bitachon','simcha','אמונה','בטחון','שמחה'])?'spiritual':contains(question,['story','inspire','inspiration','community','unity','public','אחדות','ציבור','קהילה'])?'unifier':intent==='torah'?'analyst':'pastoral');
        if(profile.allowedVoices.includes(candidate))primary=candidate;
    }
    const secondary=primary!==profile.defaultVoice?profile.defaultVoice:null,ids=[primary,...(secondary?[secondary]:[])];
    return {...selected,voiceIds:ids,voices:ids.map(key=>({id:key,...profile.voices[key]}))};
}
export function communityInstructions(selection,approved=false){
    if(!selection)return '';
    return [(approved?'APPROVED SCHOOL COMMUNITY FRAMEWORK: ':'PERSONAL BLUEPRINT COMMUNITY FRAMEWORK: ')+selection.profile.label,selection.profile.guidance,
        ...selection.voices.map((voice,index)=>(index?'Secondary tonal influence: ':'Primary voice: ')+voice.label+' / inspired by '+voice.inspiration+'\n'+voice.instructions),
        'These are AI delivery approaches inspired by the project blueprints. Do not impersonate their inspirations, invent personal memories or quotes, claim their endorsement, or present profile descriptions as evidence. Actual attributions require approved cited passages. Community choices never relax common school policy or grant authority to issue practical rulings.'
    ].join('\n\n');
}
