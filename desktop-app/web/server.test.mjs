import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createWebServer} from './server.mjs';

test('production web server serves the compiled workspace, workers and health without exposing source or credentials',async t=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mench-web-'));
    await fs.mkdir(path.join(directory,'assets'));await fs.writeFile(path.join(directory,'index.html'),'<main>Mench AI</main>');
    const worker='self.onmessage = () => {};\n'.repeat(200);await fs.writeFile(path.join(directory,'assets','editor-hash.js'),worker);
    const server=createWebServer({directory});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});});
    const base='http://127.0.0.1:'+server.address().port;
    assert.deepEqual(await (await fetch(base+'/healthz')).json(),{status:'ok',app:'Mench AI',mode:'browser'});
    const page=await fetch(base+'/');assert.equal(await page.text(),'<main>Mench AI</main>');assert.equal(page.headers.get('cache-control'),'no-cache');assert.equal(page.headers.get('x-content-type-options'),'nosniff');
    const asset=await fetch(base+'/assets/editor-hash.js');assert.equal(await asset.text(),worker);assert.equal(asset.headers.get('content-encoding'),'gzip');assert.match(asset.headers.get('content-type'),/^text\/javascript/);assert.match(asset.headers.get('cache-control'),/immutable/);
    const head=await fetch(base+'/assets/editor-hash.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    for(const url of ['/package.json','/web/server.mjs','/../package.json','/%2e%2e%2fpackage.json','/.env','/%5c..%5c.env','/assets/missing.js'])assert.equal((await fetch(base+url)).status,404,url);
    assert.equal((await fetch(base+'/%zz')).status,400);assert.equal((await fetch(base+'/healthz',{method:'POST',body:'secret'})).status,405);
});
