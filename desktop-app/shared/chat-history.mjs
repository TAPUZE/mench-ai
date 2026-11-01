const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
export function conversationScope(projectId,status,desktopPending=false){
    if(!projectId||desktopPending&&!status)return null;
    if(status?.url&&!status.user)return null;
    return JSON.stringify(status?.url?['school',status.url,status.user.id,projectId]:['personal',projectId]);
}
export function storedMessages(value){
    if(!Array.isArray(value))throw new Error('Invalid conversation history.');
    const result=value.slice(-80).map(message=>{
        if(!message||!['user','model'].includes(message.role)||typeof message.content!=='string'||message.content.length>100000)throw new Error('Invalid conversation message.');
        const item={id:typeof message.id==='string'?message.id.slice(0,100):'',role:message.role,content:message.content};
        if(message.attached)item.attached=String(message.attached).slice(0,1000);
        if(message.error)item.error=true;
        if(message.context&&typeof message.context==='object')item.context={intent:String(message.context.intent||'').slice(0,40),style:String(message.context.style||'').slice(0,40),lookup:String(message.context.lookup||'').slice(0,40),estimatedTokens:Number(message.context.estimatedTokens)||0,tokenBudget:Number(message.context.tokenBudget)||24000,recentMessages:Number(message.context.recentMessages)||0,earlierExcerpts:Number(message.context.earlierExcerpts)||0,sourceCount:Number(message.context.sourceCount)||0};
        if(item.context&&message.context.community){const value=message.context.community;item.context.community={id:String(value.id||'').slice(0,40),label:String(value.label||'').slice(0,100),selection:String(value.selection||'').slice(0,80),voices:Array.isArray(value.voices)?value.voices.slice(0,2).map(voice=>({id:String(voice.id||'').slice(0,40),label:String(voice.label||'').slice(0,180),inspiration:String(voice.inspiration||'').slice(0,180)})):[]};}
        if(Array.isArray(message.citations))item.citations=message.citations.slice(0,6).map(source=>Object.fromEntries(['citationId','sourceId','reference','title','author','edition','language','originUrl','contentHash','excerpt'].map(key=>[key,String(source[key]||'').slice(0,key==='excerpt'?1600:1000)])));
        return item;
    });
    while(result.length>1&&bytes(result)>240000)result.shift();
    if(bytes(result)>240000)throw new Error('This conversation message exceeds the storage limit.');
    return result;
}
