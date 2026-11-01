import {fail,text,projectFiles} from './validation.mjs';
import {buildChatContext} from '../shared/chat-context.mjs';
import {geminiRequestBody,geminiResult} from '../shared/gemini-request.mjs';

export async function geminiGenerate({apiKey,model,prepared,policy,...input}) {
    if(!apiKey)fail('The administrator has not configured the school AI provider.',503,'PROVIDER_NOT_CONFIGURED');
    const plan=prepared||buildChatContext(input,{policy,mode:'school'});
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
        method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},signal:input.signal,body:JSON.stringify(geminiRequestBody(plan))
    });
    if(!response.ok)fail(response.status===429?'The AI provider is busy or its quota is exhausted.':'The school AI provider could not complete this request.',502,'PROVIDER_ERROR');
    return geminiResult(await response.json());
}

export function assistantInput(input) {
    if(!Array.isArray(input.messages)||!input.messages.length||input.messages.length>16) fail('Send between 1 and 16 messages.');
    let size=0;
    const messages=input.messages.map(message=>{
        if(!message||!['user','model'].includes(message.role)) fail('Invalid conversation role.');
        const content=text(message.content,'message',32000);size+=content.length;return {role:message.role,content};
    });
    if(messages.at(-1).role!=='user'||size>64000) fail('The conversation is too large or has no final user request.');
    const files=input.files?.length?projectFiles(input.files):[];
    if(input.taskResults!==undefined&&(!Array.isArray(input.taskResults)||input.taskResults.length>1))fail('Attach at most one local task result.');
    const taskResults=(input.taskResults||[]).map(result=>{
        if(!result||!['dev','start','static','install','build','test'].includes(result.task)||!['running','completed','failed','stopping','stopped'].includes(result.status)||!(result.exitCode===null||Number.isInteger(result.exitCode))||typeof result.output!=='string'||result.output.length>16000)fail('Invalid local task result.');
        if(result.status==='completed'&&result.exitCode!==0)fail('A completed task must have a zero exit code.');
        return {task:result.task,status:result.status,exitCode:result.exitCode,output:result.output};
    });
    if(files.reduce((total,file)=>total+file.content.length,0)+taskResults.reduce((total,result)=>total+result.output.length,0)+size>100000) fail('AI context exceeds 100,000 characters.');
    let earlierMessages=[];
    if(input.earlierMessages!==undefined){
        if(!Array.isArray(input.earlierMessages)||input.earlierMessages.length>64)fail('Too many earlier conversation records.');
        let earlierSize=0;earlierMessages=input.earlierMessages.map(message=>{if(!message||!['user','model'].includes(message.role))fail('Invalid earlier conversation role.');const content=text(message.content,'earlier conversation excerpt',1200);earlierSize+=content.length;return {role:message.role,content};});
        if(earlierSize>64000)fail('Earlier conversation excerpts exceed the size limit.');
    }
    const brief=input.brief===undefined?'':text(input.brief,'project brief',4000,0);
    const community=input.community===undefined?'auto':text(input.community,'community selection',40),voice=input.voice===undefined?'auto':text(input.voice,'voice selection',40);
    return {messages,earlierMessages,brief,files,taskResults,community,voice,language:input.language==='he'?'he':'en'};
}

