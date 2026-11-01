import {validateCommunities} from '../shared/community-profiles.mjs';
import {TEACHING_STYLES} from '../shared/chat-context.mjs';
import {createHash} from 'node:crypto';
import {shareablePath,projectPath} from '../shared/project-changes.mjs';

export function fail(message,status=400,code='INVALID_REQUEST') {
    throw Object.assign(new Error(message),{status,code});
}
export function text(value,label,max=2000,min=1) {
    if(typeof value!=='string'||value.trim().length<min||value.length>max) fail('Invalid '+label+'.');
    return value.trim();
}
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const now=()=>new Date().toISOString();
export const publicUser=user=>({id:user.id,name:user.name,username:user.username,role:user.role,active:!!user.active});
export function projectFiles(value) {
    if(!Array.isArray(value)||!value.length||value.length>40) fail('Choose between 1 and 40 project files.');
    let size=0;const paths=new Set();
    const files=value.map(file=>{
        const path=text(file.path,'file path',240);
        try{projectPath(path);}catch{fail('Invalid project file path.');}
        if(!shareablePath(path))fail('Private or generated files cannot be shared.');
        // eslint-disable-next-line no-control-regex -- Reject Windows path control characters before filesystem access.
        if(path.includes('\\')||path.startsWith('/')||path.includes(':')||path.split('/').some(part=>!part||part==='.'||part==='..')||/[\x00-\x1f]/.test(path)) fail('Invalid project file path.');
        if(path.split('/').some(part=>/[<>:"|?*]|[. ]$/.test(part)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part)))fail('This file path is not supported on Windows.');
        if(path.split('/').some(part=>/^\.(?:env(?:\.|$)|git$)|^(?:node_modules|dist|build)$|(?:credentials|secrets)|\.(?:pem|key|p12|pfx)$/i.test(part))) fail('Private or generated files cannot be shared.');
        if(paths.has(path.toLowerCase())) fail('Duplicate project file path.');paths.add(path.toLowerCase());
        if(typeof file.content!=='string'||file.content.length>100000) fail('A shared file exceeds the size limit.');
        size+=Buffer.byteLength(file.content);if(size>300000) fail('Shared files exceed 300 KB.');
        return {path,content:file.content};
    });
    return files;
}

export function policyRules(value) {
    if(!value||typeof value!=='object'||Array.isArray(value)) fail('Invalid policy rules.');
    const instructions=text(value.instructions,'school instructions',8000);
    if(!Array.isArray(value.blockedTerms)||value.blockedTerms.length>100) fail('Choose up to 100 blocked terms.');
    const blockedTerms=[...new Set(value.blockedTerms.map(term=>text(term,'blocked term',80,2)))];
    const teachingStyle=value.teachingStyle||'clear';if(!Object.hasOwn(TEACHING_STYLES,teachingStyle))fail('Choose a supported teaching style.');
    const sourceTradition=value.sourceTradition?text(value.sourceTradition,'source approach',500):'';
    let communityProfiles;
    if(value.communityProfiles!==undefined&&value.communityProfiles!==null){try{communityProfiles=validateCommunities(value.communityProfiles);}catch(error){fail(error.message);}}
    return {instructions,blockedTerms,teachingStyle,sourceTradition,...(communityProfiles?{communityProfiles}:{})};
}
export const normalize=value=>value.normalize('NFKC').toLowerCase().replace(/[\p{Cf}\p{M}]/gu,'').replace(/\s+/g,' ');
export function policyCheck(value,rules) {
    const normalized=normalize(value),compact=normalized.replace(/[^\p{L}\p{N}]/gu,'');
    for(const term of rules.blockedTerms) {
        const normalizedTerm=normalize(term),compactTerm=normalizedTerm.replace(/[^\p{L}\p{N}]/gu,'');
        if(normalized.includes(normalizedTerm)||(compactTerm.length>=4&&compact.includes(compactTerm))) return {allowed:false,reason:'A school policy term matched.'};
    }
    return {allowed:true};
}
