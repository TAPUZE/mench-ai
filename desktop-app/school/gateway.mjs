import {resolveCommunity,communityRules} from '../shared/community-profiles.mjs';
import {getConversation,saveConversation} from './conversations.mjs';
import {buildChatContext,sourceUnavailable,validateCitations,retrievalQuery} from '../shared/chat-context.mjs';
import {createServer} from 'node:http';
import {SchoolStore} from './store.mjs';
import path from 'node:path';
import {BackupManager,assertNoPendingRestore} from './backups.mjs';
import {acquireMaintenanceLock} from './maintenance-lock.mjs';
import {fail,policyCheck,digest} from './validation.mjs';

import {geminiGenerate,assistantInput} from './provider.mjs';
export {geminiGenerate,assistantInput} from './provider.mjs';

export class Gateway {
    constructor({store,backups,apiKey='',model='gemini-3.8-flash',generate=geminiGenerate,requestsPerMinute=10}) {
        if(!/^[a-z0-9][a-z0-9.-]{1,100}$/.test(model)) throw new Error('Invalid school model identifier.');
        this.store=store;this.backups=backups||new BackupManager(store);this.apiKey=apiKey;this.model=model;this.generate=generate;this.limits=new Map();this.requestsPerMinute=requestsPerMinute;this.inFlight=new Set();this.authInFlight=0;
    }
    limit(key,maximum,window=60000){
        const timestamp=Date.now();
        for(const [id,record] of this.limits) if(record.until<timestamp)this.limits.delete(id);
        if(!this.limits.has(key)&&this.limits.size>=10000)fail('The school service is busy. Please try again shortly.',429,'RATE_LIMIT');
        const record=this.limits.get(key)||{count:0,until:timestamp+window};
        if(record.count>=maximum) fail('Too many requests. Please wait before trying again.',429,'RATE_LIMIT');
        record.count++;this.limits.set(key,record);
    }
    async ask(actor,input,signal,session){
        const policy=this.store.policy();
        if(policy.status!=='approved') fail('School AI is awaiting approval of the current content policy.',403,'POLICY_AWAITING_APPROVAL');
        if(input.expectedUserId!==undefined&&input.expectedUserId!==actor.id)fail('The conversation account changed. Sign in again.',403,'FORBIDDEN');
        const context=assistantInput(input);
        const selection=resolveCommunity(policy.rules.communityProfiles,{language:context.language,community:context.community,voice:context.voice,question:context.messages.at(-1).content}),effectiveRules=communityRules(policy.rules,selection);
        const sources=this.store.knowledge.search(actor,{query:retrievalQuery(context.messages)},selection?.id),prepared=buildChatContext(context,{policy,sources,mode:'school'});
        const combined=context.messages.map(message=>message.content).concat(context.brief,context.earlierMessages.map(message=>message.content),context.files.map(file=>file.path+'\n'+file.content),context.taskResults.map(result=>result.output),sources.map(source=>source.excerpt)).join('\n');
        const check=policyCheck(combined,effectiveRules);
        const blocked=(phase,value,reason)=>({blocked:true,content:'This request needs a school policy review. Your teacher or administrator can help.',reviewId:this.store.recordBlock(actor,policy,phase,value,reason),policyVersion:policy.version});
        if(!check.allowed) return blocked('input',combined,check.reason);
        if(this.inFlight.has(actor.id)) fail('Your previous AI request is still running.',409,'REQUEST_RUNNING');
        this.limit('ai:'+actor.id,this.requestsPerMinute);
        if(prepared.route.humanReview||prepared.route.requiresSources&&!sources.length){this.store.audit(actor,'ai.referred',policy.id,{intent:prepared.route.intent,policyVersion:policy.version});return {content:sourceUnavailable(prepared.route,context.language),context:prepared.meta,citations:[],policyVersion:policy.version};}
        this.inFlight.add(actor.id);
        try {
            const result=await this.generate({apiKey:this.apiKey,model:this.model,...context,policy,prepared,signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(45000)])});
            // A policy revision, logout, or account revocation during the provider call
            // must not release a response using obsolete authorization.
            const fresh=this.store.db.prepare('SELECT active FROM users WHERE id=?').get(actor.id);
            if(!fresh?.active) fail('This account is disabled.',403,'FORBIDDEN');
            if(session)this.store.authenticate(session);
            if(this.store.policy().id!==policy.id||this.store.policy().status!=='approved') fail('School policy changed during the request. Please try again.',409,'POLICY_CHANGED');
            if(!this.store.knowledge.stillApproved(sources,policy.id,selection?.id))fail('Source approval changed during the request. Please try again.',409,'SOURCE_CHANGED');
            if(result.blocked) return blocked('provider',combined,result.reason||'The provider blocked the response.');
            if(typeof result.content!=='string'||!result.content.length||result.content.length>100000) fail('Invalid provider response.',502,'PROVIDER_ERROR');
            const checked=policyCheck(result.content,effectiveRules);
            if(!checked.allowed) return blocked('output',result.content,checked.reason);
            let citations;try{citations=validateCitations(result.content,sources);}catch(error){fail(error.message,502,'UNVERIFIED_CITATION');}
            if(prepared.route.requiresSources&&!citations.length)fail('The answer did not cite its retrieved evidence. Please try again.',502,'CITATION_REQUIRED');
            this.store.audit(actor,'ai.allowed',policy.id,{policyVersion:policy.version,model:this.model,inputHash:digest(combined),outputHash:digest(result.content),attachedPaths:context.files.map(file=>file.path),sourceIds:citations.map(source=>source.sourceId),intent:prepared.route.intent,community:selection?.id,voices:prepared.community?.voiceIds});
            return {content:result.content,policyVersion:policy.version,model:this.model,context:prepared.meta,citations};
        } finally {this.inFlight.delete(actor.id);}
    }
    async dispatch(action,input={},session,remote='local',signal){
        if(!input||typeof input!=='object'||Array.isArray(input))fail('Invalid request payload.');
        if(action==='school.status')return {...this.store.status(),providerConfigured:!!this.apiKey,model:this.model};
        if(['account.login','account.register','school.bootstrap','account.recovery.complete'].includes(action)){
            this.limit('auth-remote:'+remote,100);
            const identity=typeof input.username==='string'?input.username.trim().toLowerCase().slice(0,80):'';
            const key='auth:'+remote+':'+digest(identity);this.limit(key,10,15*60000);
            if(this.authInFlight>=6)fail('Account sign-in is busy. Please try again shortly.',429,'RATE_LIMIT');
            this.authInFlight++;
            try{
                const value=await (action==='school.bootstrap'?this.store.bootstrap(input):action==='account.login'?this.store.login(input):action==='account.recovery.complete'?this.store.completeReset(input):this.store.register(input));
                this.limits.delete(key);
                if(action==='school.bootstrap'&&this.backups.automatic)await this.backups.ensureAutomatic().catch(error=>console.error('School automatic backup failed: '+error.message));
                return value;
            }finally{this.authInFlight--;}
        }
        const actor=this.store.authenticate(session);
        const family=['source.list','source.get','source.search'].includes(action)?resolveCommunity(this.store.policy().rules.communityProfiles,{language:input.language,community:input.community})?.id:null;
        switch(action){
            case 'account.me':return actor;
            case 'account.logout':return this.store.logout(session);
            case 'account.invite':return this.store.invite(actor,input);
            case 'account.users':return this.store.users(actor,input);
            case 'account.state':return this.store.setActive(actor,input);
            case 'account.recovery.issue':return this.store.issueReset(actor,input);
            case 'account.password.change':{
                this.limit('password:'+actor.id,5,5*60000);
                if(this.authInFlight>=6)fail('Account updates are busy. Please try again shortly.',429,'RATE_LIMIT');
                this.authInFlight++;try{return await this.store.changePassword(actor,input,session);}finally{this.authInFlight--;}
            }
            case 'chat.get':return getConversation(this.store,actor,input);
            case 'chat.save':return saveConversation(this.store,actor,input);
            case 'source.list':return this.store.knowledge.list(actor,input,family);
            case 'source.get':return this.store.knowledge.get(actor,input,family);
            case 'source.create':return this.store.knowledge.create(actor,input);
            case 'source.approve':return this.store.knowledge.approve(actor,input);
            case 'source.retire':return this.store.knowledge.retire(actor,input);
            case 'source.search':return this.store.knowledge.search(actor,input,family);
            case 'backup.status':this.store.require(actor,['admin']);return this.backups.status();
            case 'backup.list':this.store.require(actor,['admin']);return this.backups.page(input,actor.id);
            case 'backup.create':this.store.require(actor,['admin']);this.limit('backup:'+actor.id,5,3600000);return this.backups.create(actor);
            case 'backup.verify':this.store.require(actor,['admin']);return this.backups.verify(input.id);
            case 'policy.get':return this.store.policy();
            case 'policy.draft':return this.store.draftPolicy(actor,input);
            case 'policy.approve':return this.store.approvePolicy(actor,input);
            case 'policy.reviews':return this.store.reviews(actor,input);
            case 'policy.resolve':return this.store.resolveReview(actor,input);
            case 'audit.list':return this.store.auditLog(actor,input);
            case 'class.list':return this.store.classes(actor,input);
            case 'class.students':return this.store.classStudents(actor,input);
            case 'class.create':return this.store.createClass(actor,input);
            case 'class.enroll':return this.store.enroll(actor,input);
            case 'template.list':return this.store.templates(actor,input);
            case 'template.get':return this.store.template(actor,input.id);
            case 'template.create':return this.store.createTemplate(actor,input);
            case 'template.approve':return this.store.approveTemplate(actor,input);
            case 'assignment.list':return this.store.assignments(actor,input);
            case 'assignment.get':return this.store.assignment(actor,input.id);
            case 'assignment.submissions':return this.store.submissions(actor,input);
            case 'assignment.create':return this.store.createAssignment(actor,input);
            case 'assignment.submit':return this.store.submit(actor,input);
            case 'assignment.submission':return this.store.submission(actor,input.id);
            case 'assignment.review':return this.store.reviewSubmission(actor,input);
            case 'ai.ask':return this.ask(actor,input,signal,session);
            default:fail('School operation not found.',404,'NOT_FOUND');
        }
    }
}

async function readBody(request){
    if(!request.headers['content-type']?.startsWith('application/json')) fail('Use application/json.',415,'CONTENT_TYPE');
    let size=0;const chunks=[];
    for await(const chunk of request){size+=chunk.length;if(size>600000)fail('Request exceeds 600 KB.',413,'TOO_LARGE');chunks.push(chunk);}
    try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('Invalid JSON.');}
}
export async function createSchoolServer(options){
    const filename=options.store?.filename||options.filename,lease=await acquireMaintenanceLock(path.dirname(filename));
    let store,backups,gateway;
    try{await assertNoPendingRestore(filename);store=options.store||await SchoolStore.open(filename,options);backups=options.backups||new BackupManager(store,{automatic:options.automaticBackups===true,keepAutomatic:options.keepAutomaticBackups??14});gateway=new Gateway({...options,store,backups});}
    catch(error){store?.close();lease.release();throw error;}
    const server=createServer(async(request,response)=>{
        const send=(status,value)=>{if(!response.destroyed){response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(value));}};
        try{
            if(request.headers.origin)fail('Use the school desktop client.',403,'FORBIDDEN');
            if(request.method!=='POST'||request.url!=='/v1/request')fail('School endpoint not found.',404,'NOT_FOUND');
            const body=await readBody(request);
            const session=request.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]+)$/)?.[1];
            const controller=new AbortController();response.on('close',()=>{if(!response.writableEnded)controller.abort();});
            const value=await gateway.dispatch(body?.action,body?.payload,session,request.socket.remoteAddress,controller.signal);
            send(200,{ok:true,value});
        }catch(error){
            const status=error.status||500;
            send(status,{ok:false,error:{message:status===500?'The school service encountered an internal error.':error.message,code:error.code||'INTERNAL_ERROR'}});
        }
    });
    server.requestTimeout=20000;server.headersTimeout=10000;server.keepAliveTimeout=3000;
    let timer,closing,automaticWork=Promise.resolve();
    if(backups.automatic){
        const automatic=()=>{if(closing)return;automaticWork=automaticWork.catch(()=>{}).then(()=>backups.ensureAutomatic());automaticWork.catch(error=>console.error('School automatic backup failed: '+error.message));};
        server.once('listening',automatic);timer=setInterval(automatic,3600000);timer.unref();
    }
    return {server,store,gateway,backups,close:()=>{
        if(closing)return closing;clearInterval(timer);
        closing=new Promise((resolve,reject)=>server.close(async()=>{try{await automaticWork.catch(()=>{});await backups.idle();store.close();lease.release();resolve();}catch(error){lease.release();reject(error);}}));return closing;
    }};
}
