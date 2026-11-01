import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

// The codec is Electron safeStorage in production. Tests inject an encrypted
// codec to exercise persistence and failure paths without opening any windows.
export class CredentialVault {
    constructor(filename,codec){this.filename=filename;this.codec=codec;this.pending=Promise.resolve();}
    async available(){
        if(!await this.codec.isAsyncEncryptionAvailable())throw new Error('Windows credential protection is unavailable. Credentials were not stored.');
    }
    async read(){
        let bytes;try{bytes=await fs.readFile(this.filename);}catch(error){if(error.code==='ENOENT')return {};throw error;}
        await this.available();
        try{
            const decrypted=await this.codec.decryptStringAsync(bytes),data=JSON.parse(decrypted.result);
            if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid credential data.');
            return data;
        }catch{throw new Error('Stored credentials could not be unlocked. Sign out and configure the connection again.');}
    }
    clear(){
        const operation=this.pending.catch(()=>{}).then(()=>fs.rm(this.filename,{force:true}));this.pending=operation;return operation;
    }
    update(change){
        const operation=this.pending.catch(()=>{}).then(async()=>{
            await this.available();const current=await this.read(),next=await change(current);
            const encrypted=await this.codec.encryptStringAsync(JSON.stringify(next));
            await fs.mkdir(path.dirname(this.filename),{recursive:true});const temporary=this.filename+'.'+randomUUID()+'.tmp';
            try{await fs.writeFile(temporary,encrypted,{mode:0o600,flag:'wx'});await fs.rename(temporary,this.filename);}
            finally{await fs.rm(temporary,{force:true});}
            return next;
        });this.pending=operation;return operation;
    }
}
