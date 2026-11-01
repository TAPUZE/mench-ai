import {randomUUID} from 'node:crypto';

export function gatewayUrl(value){
    const url=new URL(value);
    if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Use the school service origin, without a path or credentials.');
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','[::1]','localhost'].includes(url.hostname)))throw new Error('School connections require HTTPS, except on this computer.');
    return url.origin;
}
const actions=new Set(['school.status','school.bootstrap','account.login','account.register','account.me','account.logout','account.invite','account.users','account.state','account.password.change','account.recovery.issue','account.recovery.complete','backup.status','backup.create','backup.verify','policy.get','policy.draft','policy.approve','policy.reviews','policy.resolve','audit.list','class.list','class.create','class.enroll','template.list','template.create','template.approve','assignment.list','assignment.create','assignment.submit','assignment.submission','assignment.review','ai.ask']);
for(const action of ['class.students','template.get','assignment.get','assignment.submissions','backup.list','chat.get','chat.save','source.list','source.get','source.create','source.approve','source.retire','source.search'])actions.add(action);
export class SchoolClient {
    constructor({vault,managedUrl,fetcher=fetch}){this.vault=vault;this.managedUrl=managedUrl?gatewayUrl(managedUrl):null;this.fetcher=fetcher;this.requests=new Map();this.generation=0;}
    abortRequests(){for(const controller of this.requests.values())controller.abort();}
    async configuration(){const credentials=await this.vault.read();return {credentials,url:this.managedUrl||credentials.gatewayUrl||null};}
    async configure(input){
        if(this.managedUrl)throw new Error('This connection is managed by the school administrator.');
        const url=input.url?gatewayUrl(input.url):null;
        this.generation++;this.abortRequests();
        await this.vault.update(current=>({...current,gatewayUrl:url,schoolSession:null}));return this.status();
    }
    async resetCredentials(input){
        if(input.confirmed!==true)throw new Error('Confirm clearing saved sign-in credentials and API keys.');
        this.generation++;this.abortRequests();await this.vault.clear();return this.status();
    }
    async exchange(url,action,payload,session,signal){
        if(!actions.has(action))throw new Error('This school operation is unavailable.');
        const response=await this.fetcher(url+'/v1/request',{method:'POST',redirect:'error',signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(50000)]),headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session}:{})},body:JSON.stringify({action,payload})});
        if(!response.body)throw new Error('The school service returned an empty response.');
        const reader=response.body.getReader(),chunks=[];let length=0;
        try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>1200000)throw new Error('The school response exceeds the size limit.');chunks.push(Buffer.from(value));}}
        finally{await reader.cancel();}
        let envelope;try{envelope=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('The school service returned an invalid response.');}
        if(!response.ok||!envelope.ok)throw Object.assign(new Error(envelope.error?.message||'The school service could not complete the request.'),{code:envelope.error?.code});
        return envelope.value;
    }
    async status(){
        const generation=this.generation;
        const {credentials,url}=await this.configuration();
        if(generation!==this.generation)return this.status();
        const base={managed:!!this.managedUrl,url,connected:false,user:null,apiKeyConfigured:!!credentials.apiKey};
        if(!url)return base;
        try{
            const status=await this.exchange(url,'school.status',{});let user=null;
            const session=credentials.schoolSession?.url===url?credentials.schoolSession.token:null;
            if(session){try{user=await this.exchange(url,'account.me',{},session);}catch(error){
                if(generation!==this.generation)return this.status();if(error.code!=='UNAUTHENTICATED')throw error;
                let cleared=false;await this.vault.update(current=>{if(generation!==this.generation||current.schoolSession?.token!==session)return current;cleared=true;return {...current,schoolSession:null};});
                if(!cleared)return this.status();
            }}
            if(generation!==this.generation)return this.status();
            return {...base,...status,connected:true,user};
        }catch(error){if(generation!==this.generation)return this.status();return {...base,error:error.message};}
    }
    async request(input,signal,{allowAI=false}={}){
        const generation=this.generation;
        const {credentials,url}=await this.configuration();if(!url)throw new Error('Connect to your school service first.');
        const {action,payload={}}=input;
        if(action==='ai.ask'&&!allowAI)throw new Error('Use the project assistant to attach verified runtime output.');
        const session=credentials.schoolSession?.url===url?credentials.schoolSession.token:null;
        if(action==='account.logout'){
            const current=++this.generation;this.abortRequests();
            try{if(session)await this.exchange(url,action,payload,session,signal);}
            finally{if(current===this.generation)await this.vault.update(value=>({...value,schoolSession:null}));}
            return {signedOut:true};
        }
        const value=await this.exchange(url,action,payload,session,signal);
        if(generation!==this.generation)throw new Error('The school connection changed during this request. Sign in again.');
        if(action==='account.login'){
            const signedInGeneration=++this.generation;this.abortRequests();
            await this.vault.update(current=>{if(signedInGeneration!==this.generation)throw new Error('The school connection changed. Sign in again.');return {...current,schoolSession:{url,token:value.token,userId:value.user.id}};});
            return {user:value.user,expiresAt:value.expiresAt};
        }
        if(value?.signedOut){this.generation++;this.abortRequests();await this.vault.update(current=>({...current,schoolSession:null}));}
        return value;
    }
    async configureKey(input){
        const {url}=await this.configuration();if(url)throw new Error('Provider keys are configured on the school service.');
        if(typeof input.apiKey!=='string'||input.apiKey.length>500)throw new Error('Invalid provider key.');
        this.generation++;this.abortRequests();
        await this.vault.update(current=>({...current,apiKey:input.apiKey.trim()}));return {configured:!!input.apiKey.trim()};
    }
    async ask(input,personalGenerate){
        const generation=this.generation;
        const id=input.requestId||randomUUID();if(this.requests.has(id))throw new Error('That request is already running.');
        const controller=new AbortController();this.requests.set(id,controller);
        try{
            const {credentials,url}=await this.configuration();
            if(generation!==this.generation)throw new Error('The AI account changed during this request.');
            if(url)return await this.request({action:'ai.ask',payload:input},controller.signal,{allowAI:true});
            if(!credentials.apiKey)throw new Error('Add your Gemini API key in Settings to use the assistant.');
            return await personalGenerate({...input,apiKey:credentials.apiKey,signal:controller.signal});
        }finally{this.requests.delete(id);}
    }
    cancel(id){this.requests.get(id)?.abort();return {cancelled:true};}
}
