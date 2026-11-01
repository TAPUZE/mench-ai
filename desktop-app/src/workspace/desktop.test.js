import {test} from 'node:test';
import assert from 'node:assert/strict';
import {desktop,DesktopDirectoryHandle} from './desktop.js';

test('desktop errors preserve NotFoundError and conflict codes on the renderer side',async()=>{
    globalThis.window={menchDesktop:{version:2,
        directory:async()=>({ok:false,error:{name:'NotFoundError',code:'ENOENT',message:'Folder missing'}}),
        write:async()=>({ok:false,error:{name:'Error',code:'CONFLICT',message:'Changed on disk'}})
    }};
    try {
        const directory=new DesktopDirectoryHandle({id:'root',name:'Project',root:'C:/Project'});
        await assert.rejects(directory.getDirectoryHandle('new'),error=>error.name==='NotFoundError'&&error.code==='ENOENT');
        await assert.rejects(desktop().write({}),error=>error.code==='CONFLICT');
    } finally {delete globalThis.window;}
});

test('desktop file handles retain the revision used for optimistic saves',async()=>{
    let write;
    globalThis.window={menchDesktop:{version:2,
        file:async()=>({ok:true,value:{kind:'file',name:'lesson.txt'}}),
        read:async()=>({ok:true,value:{text:'Original',size:8,hash:'revision-1'}}),
        write:async value=>{write=value;return {ok:true,value:{hash:'revision-2'}};}
    }};
    try {
        const directory=new DesktopDirectoryHandle({id:'root',name:'Project',root:'C:/Project'});
        const handle=await directory.getFileHandle('lesson.txt');
        assert.equal(await (await handle.getFile()).text(),'Original');
        const writer=await handle.createWritable();await writer.write('Changed');await writer.close();
        assert.equal(write.expectedHash,'revision-1');assert.equal(write.content,'Changed');
    } finally {delete globalThis.window;}
});
