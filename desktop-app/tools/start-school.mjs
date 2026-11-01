import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const bundled=fileURLToPath(new URL('./runtime/node.exe',import.meta.url));
const binary=process.platform==='win32'&&existsSync(bundled)?bundled:process.execPath;
const child=spawn(binary,[fileURLToPath(new URL('../school/server.mjs',import.meta.url))],{env:process.env,stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code||0;});
