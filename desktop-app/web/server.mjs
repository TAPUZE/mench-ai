import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createGzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.wasm':'application/wasm'};
export function createWebServer({directory=fileURLToPath(new URL('../dist',import.meta.url))}={}){
    const root=path.resolve(directory);
    return http.createServer(async(request,response)=>{
        response.setHeader('X-Content-Type-Options','nosniff');
        response.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
        response.setHeader('X-Frame-Options','DENY');
        response.setHeader('Content-Security-Policy',"object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
        response.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
        const send=(status,message)=>{response.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});response.end(request.method==='HEAD'?undefined:message);};
        if(!['GET','HEAD'].includes(request.method)){response.setHeader('Allow','GET, HEAD');send(405,'Method not allowed');return;}
        let pathname;
        try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{send(400,'Invalid URL');return;}
        if(pathname==='/healthz'){
            response.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
            response.end(request.method==='HEAD'?undefined:JSON.stringify({status:'ok',app:'Mench AI',mode:'browser'}));return;
        }
        if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(part=>part.startsWith('.'))){send(404,'Not found');return;}
        const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
        if(!filename.startsWith(root+path.sep)){send(404,'Not found');return;}
        let metadata;try{metadata=await stat(filename);}catch{send(404,'Not found');return;}
        if(!metadata.isFile()){send(404,'Not found');return;}
        const type=types[path.extname(filename)]||'application/octet-stream';
        const gzip=/\bgzip\b/i.test(request.headers['accept-encoding']||'')&&/^(text\/|application\/(json|wasm))/.test(type)&&metadata.size>1024;
        response.setHeader('Content-Type',type);response.setHeader('Vary','Accept-Encoding');
        response.setHeader('Cache-Control',pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache');
        if(gzip)response.setHeader('Content-Encoding','gzip');else response.setHeader('Content-Length',metadata.size);
        response.writeHead(200);
        if(request.method==='HEAD'){response.end();return;}
        try{if(gzip)await pipeline(createReadStream(filename),createGzip(),response);else await pipeline(createReadStream(filename),response);}catch{response.destroy();}
    });
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
    const port=Number(process.env.PORT||8080);
    if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be a valid TCP port.');
    const server=createWebServer();server.listen(port,'0.0.0.0',()=>console.log('Mench AI browser workspace listening on port '+port));
    const stop=()=>{server.close(()=>process.exit(0));server.closeIdleConnections();setTimeout(()=>process.exit(1),5000).unref();};
    process.once('SIGTERM',stop);process.once('SIGINT',stop);
}
