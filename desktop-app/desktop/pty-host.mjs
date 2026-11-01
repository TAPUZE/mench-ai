import * as pty from 'node-pty';
let terminal,closing=false;
const finish=exitCode=>{
    if(closing) return;closing=true;
    if(process.connected) process.send({kind:'exit',exitCode},()=>process.exit(0));
    else process.exit(0);
};
process.on('message',message=>{
    try {
        if(message.kind==='start') {
            terminal=pty.spawn(message.executable,message.args,{name:'xterm-256color',cwd:process.cwd(),env:process.env,cols:message.cols,rows:message.rows,useConptyDll:false});
            terminal.onData(data=>{if(process.connected) process.send({kind:'data',data});});
            terminal.onExit(({exitCode})=>finish(exitCode));
            process.send({kind:'ready'});
        } else if(message.kind==='input') terminal?.write(message.data);
        else if(message.kind==='resize') terminal?.resize(message.cols,message.rows);
        else if(message.kind==='close') {terminal?.kill();finish(0);}
    } catch(error) {if(process.connected) process.send({kind:'error',message:error.message});}
});
process.on('disconnect',()=>{try{terminal?.kill();}finally{process.exit(0);}});
