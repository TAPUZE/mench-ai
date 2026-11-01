import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';

const directory=path.dirname(fileURLToPath(import.meta.url));
const lock=JSON.parse(await fs.readFile(path.join(directory,'runtime-lock.json'),'utf8'));
const target=path.join(directory,'runtime');
const metadata=path.join(target,'verified.json');
try {
    const verified=JSON.parse(await fs.readFile(metadata,'utf8'));
    const binary=await fs.readFile(path.join(target,'node.exe'));
    if (verified.version === lock.version && verified.sha256 === createHash('sha256').update(binary).digest('hex')) {
        console.log('Verified bundled Node runtime ' + lock.version);process.exit(0);
    }
} catch { /* A missing or invalid cache must be rebuilt and verified below. */ }
const archive='node-' + lock.version + '-' + lock.platform;
const url='https://nodejs.org/dist/' + lock.version + '/' + archive + '.zip';
console.log('Downloading official Node runtime ' + lock.version);
const response=await fetch(url);
if (!response.ok) throw new Error('Node runtime download failed: ' + response.status);
const bytes=Buffer.from(await response.arrayBuffer());
if (createHash('sha256').update(bytes).digest('hex') !== lock.archiveSha256) throw new Error('Node runtime checksum verification failed.');
const zip=await JSZip.loadAsync(bytes);
const executable=await zip.file(archive + '/node.exe').async('nodebuffer');
const license=await zip.file(archive + '/LICENSE').async('nodebuffer');
await fs.mkdir(target,{recursive:true});
await fs.writeFile(path.join(target,'node.exe'),executable);
await fs.writeFile(path.join(target,'LICENSE.txt'),license);
await fs.writeFile(metadata,JSON.stringify({version:lock.version,sha256:createHash('sha256').update(executable).digest('hex')},null,2));
console.log('Bundled Node runtime downloaded and verified.');
