const encoder=new TextEncoder();
export function projectPath(value){
    // eslint-disable-next-line no-control-regex -- Reject Windows path control characters before filesystem access.
    if(typeof value!=='string'||!value||value.length>240||value!==value.trim()||value.includes('\\')||value.startsWith('/')||/[\x00-\x1f]/.test(value))throw new Error('Use a relative project file path.');
    for(const part of value.split('/')){
        if(!part||part==='.'||part==='..'||/[<>:"|?*]|[. ]$/.test(part)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part))throw new Error('Use a valid Windows project file path.');
    }
    return value;
}
export function shareablePath(value){
    try{projectPath(value);}catch{return false;}
    return !value.split('/').some(part=>/^\.(?:env(?:\.|$)|git$|mench$|npmrc$|yarnrc(?:\.|$)|netrc$|pypirc$|ssh$|aws$|azure$)|^(?:node_modules|dist|build|\.next)$|(?:credentials|secrets|service[-_]account)|^id_(?:rsa|ed25519|dsa|ecdsa)(?:\.|$)|\.(?:pem|key|p12|pfx)$/i.test(part));
}
export const editablePath=value=>/\.(?:html?|css|scss|js|mjs|cjs|jsx|ts|tsx|json|md|txt|py|java|c|cpp|h|svg|xml|ya?ml|toml|sql|sh|gitignore)$/i.test(value)||!value.split('/').at(-1).includes('.');
export function validateProposal(value){
    if(!value||value.format!=='mench.changes.v1'||typeof value.summary!=='string'||!value.summary.trim()||value.summary.length>2000||!Array.isArray(value.changes)||!value.changes.length||value.changes.length>20)throw new Error('The assistant returned an invalid project change proposal.');
    let size=0;const paths=new Set();
    const changes=value.changes.map(change=>{
        const path=projectPath(change?.path);
        if(!shareablePath(path))throw new Error('Private or generated files cannot be changed by an AI proposal.');
        if(!editablePath(path)||(typeof change.content==='string'&&change.content.includes('\0')))throw new Error('Project proposals can only change supported text files.');
        if(paths.has(path.toLowerCase()))throw new Error('The proposal contains duplicate file paths.');paths.add(path.toLowerCase());
        if(typeof change.content!=='string'||encoder.encode(change.content).length>100000)throw new Error('A proposed file exceeds 100 KB.');
        size+=encoder.encode(change.content).length;if(size>300000)throw new Error('The proposed changes exceed 300 KB.');
        return {path,content:change.content};
    });
    for(const path of paths)for(const other of paths)if(other.startsWith(path+'/'))throw new Error('A proposed file conflicts with a proposed folder path.');
    return {format:'mench.changes.v1',summary:value.summary.trim(),changes};
}
export function proposalPart(part){
    if(!['mench-changes','json'].includes(part.language?.toLowerCase()))return {};
    let parsed;
    try{parsed=JSON.parse(part.text);}catch{return part.language==='mench-changes'?{error:'This project proposal is incomplete. Ask the assistant to generate it again.'}:{};}
    if(part.language==='json'&&parsed?.format!=='mench.changes.v1')return {};
    try{return {proposal:validateProposal(parsed)};}catch(error){return {error:error.message};}
}
export function taskPart(part){
    if(part.language!=='mench-task')return {};
    try{const value=JSON.parse(part.text);if(!['install','dev','build','test'].includes(value.task)||typeof value.reason!=='string'||value.reason.length>1000)throw new Error();return {task:value.task,reason:value.reason};}
    catch{return {error:'This task proposal is invalid. Choose a task from the Tasks panel instead.'};}
}
export const changeInstructions='When asked to create or change multiple project files, return a concise explanation followed by one fenced mench-changes JSON block with this shape: {"format":"mench.changes.v1","summary":"Explain the change","changes":[{"path":"relative/file.js","content":"complete replacement contents"}]}. Use at most 20 files and 300 KB. Never target private, secret, generated, .git, or .mench paths. Proposals are data for the user to review, not executed tools. Do not request file deletion or shell execution in this format. For a single current-file edit you may still provide a complete replacement code block. To suggest a project command, use a fenced mench-task JSON block: {"task":"build","reason":"Explain why"}. The only allowed task values are install, dev, build, test. The user must choose to run it; a task proposal is not execution evidence. Never claim changes were applied or commands ran without real tool evidence. Only a completed process with exitCode 0 supports a successful command result; running, stopped, and failed processes do not.';
