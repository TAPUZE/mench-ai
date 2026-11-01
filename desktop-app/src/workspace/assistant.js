import {getProtectionLevel,shouldBlockContent} from '../constants/protectionLevels';
import {filterHebrewGodNames} from '../utils/helpers';
import {desktop} from './desktop';
import {shareablePath} from '../../shared/project-changes.mjs';
import {historyForRequest,buildChatContext,personalRules,sourceUnavailable,validateCitations} from '../../shared/chat-context.mjs';
import {geminiRequestBody,geminiResult} from '../../shared/gemini-request.mjs';

export async function askAssistant({messages,apiKey='',model,protection,language,currentFile,files=[],taskResultRequest,signal,schoolMode,expectedUserId,communityProfile='auto',voice='auto',brief=''}){
    const attached=[...new Map([...files,...(currentFile?[{path:currentFile.path,content:currentFile.content}]:[])].map(file=>[file.path,file])).values()];
    if(attached.length>20||attached.some(file=>!shareablePath(file.path)||typeof file.content!=='string'||file.content.length>100000)||attached.reduce((size,file)=>size+file.content.length,0)>100000)throw new Error('Choose up to 20 supported project files and less than 100,000 characters of context. Private files are excluded.');
    const input={...historyForRequest(messages),files:attached,language,protection,brief,expectedUserId,community:communityProfile,voice};
    if(!schoolMode){const check=shouldBlockContent(input.messages.at(-1).content,getProtectionLevel(protection));if(check.blocked)return {content:[check.reason,check.alternative].filter(Boolean).join('\n\n'),citations:[]};}
    if(desktop()?.askAI){
        const requestId=crypto.randomUUID(),cancel=()=>desktop().cancelAI({id:requestId}).catch(()=>{});signal?.addEventListener('abort',cancel,{once:true});
        try{
            if(signal?.aborted)throw new DOMException('Request cancelled.','AbortError');
            const result=await desktop().askAI({...input,requestId,model,taskResultRequest});
            if(signal?.aborted)throw new DOMException('Request cancelled.','AbortError');
            return {...result,content:filterHebrewGodNames(result.content)};
        }finally{signal?.removeEventListener('abort',cancel);}
    }
    if(!apiKey.trim())throw new Error('Add your Gemini API key in Settings to use the assistant.');
    const prepared=buildChatContext(input,{policy:{rules:personalRules(protection)}});
    if(prepared.route.humanReview||prepared.route.requiresSources)return {content:sourceUnavailable(prepared.route,language),context:prepared.meta,citations:[]};
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify(geminiRequestBody(prepared)),signal});
    if(!response.ok)throw new Error('The AI provider could not complete this request. Check the connection and provider quota.');
    const result=geminiResult(await response.json());
    if(result.blocked)return {content:'The provider safety filter blocked this response. Ask your teacher for help.',context:prepared.meta,citations:[]};
    return {...result,content:filterHebrewGodNames(result.content),context:prepared.meta,citations:validateCitations(result.content)};
}

export function messageParts(content) {
    const parts = [];
    const regex = /^```([^\r\n]*)\r?\n([\s\S]*?)^```[ \t]*(?:\r?\n|$)/gm;
    let match, previous = 0;
    while ((match = regex.exec(content))) {
        if (match.index > previous) parts.push({type:'text',text:content.slice(previous,match.index)});
        parts.push({type:'code',language:match[1].trim(),text:match[2].trimEnd()});
        previous = regex.lastIndex;
    }
    if (previous < content.length) parts.push({type:'text',text:content.slice(previous)});
    return parts;
}
