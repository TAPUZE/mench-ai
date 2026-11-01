import {useCallback,useEffect,useRef,useState} from 'react';
import {conversationScope,storedMessages} from '../../shared/chat-history.mjs';
import {desktop} from './desktop';

export function useConversation(projectId,status,onBoundary){
    const key=conversationScope(projectId,status,!!desktop()?.schoolStatus),[state,setState]=useState({key:null,messages:[],brief:'',loaded:false}),[error,setError]=useState(''),[retry,setRetry]=useState(0);
    const identity=useRef({key:null,generation:0}),boundary=useRef(onBoundary),saved=useRef(null);
    boundary.current=onBoundary;
    if(identity.current.key!==key)identity.current={key,generation:identity.current.generation+1};
    const generation=identity.current.generation;
    const messages=state.key===key?state.messages:[],ready=!!key&&state.key===key&&state.loaded;
    useEffect(()=>{
        let active=true;boundary.current?.();setError('');setState({key,messages:[],brief:'',loaded:false});
        if(!key)return ()=>{active=false;};
        const owner=status?.url?{ownerId:status.user.id,projectId}:null,record={key,generation,owner,revision:0,serialized:null,scheduled:null,chain:Promise.resolve()};saved.current=record;
        (async()=>{
            const local=owner?null:JSON.parse(localStorage.getItem('mench-chat-v2:'+key)||'{}');
            const result=owner?await desktop().schoolRequest({action:'chat.get',payload:owner}):{messages:Array.isArray(local)?local:local.messages||[],brief:Array.isArray(local)?'':local.brief||'',revision:0};
            const restored=storedMessages(result.messages);
            if(active){record.revision=result.revision;record.serialized=JSON.stringify({messages:restored,brief:result.brief||''});setState({key,messages:restored,brief:result.brief||'',loaded:true});}
        })().catch(error=>{if(active)setError('Conversation history could not be loaded: '+error.message);});
        return ()=>{active=false;};
        // key includes gateway, account and project; status refreshes must not
        // discard an in-progress conversation or restart its load.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[key,retry]);
    useEffect(()=>{
        if(!ready)return;
        const record=saved.current;if(!record||record.key!==key||record.generation!==generation)return;
        const values=storedMessages(state.messages),serialized=JSON.stringify({messages:values,brief:state.brief||''});if(serialized===record.serialized||serialized===record.scheduled)return;
        record.scheduled=serialized;
        record.chain=record.chain.catch(()=>{}).then(async()=>{
            if(identity.current.generation!==record.generation)return;
            if(record.owner){const result=await desktop().schoolRequest({action:'chat.save',payload:{...record.owner,expectedRevision:record.revision,messages:values,brief:state.brief||''}});record.revision=result.revision;}
            else localStorage.setItem('mench-chat-v2:'+key,serialized);
            record.serialized=serialized;if(identity.current.generation===record.generation)setError('');
        }).catch(error=>{record.scheduled=null;if(identity.current.generation===record.generation)setError('Conversation history could not be saved: '+error.message);});
    },[ready,state.messages,state.brief,key,generation]);
    const setMessages=useCallback(update=>{
        if(identity.current.generation!==generation||!key)return;
        setState(previous=>({...previous,key,loaded:true,messages:typeof update==='function'?update(previous.key===key?previous.messages:[]):update}));
    },[key,generation]);
    const setBrief=useCallback(brief=>{if(identity.current.generation===generation&&key)setState(previous=>({...previous,brief:String(brief).slice(0,4000)}));},[key,generation]);
    return {messages,setMessages,brief:state.key===key?state.brief||'':'',setBrief,ready,error,retry:()=>setRetry(value=>value+1),identity};
}
