import {desktop,chooseDirectory,projectFromDesktop} from './desktop.js';
export {chooseDirectory};
const DB_NAME = 'mench-workspaces';
const STORE = 'projects';
const ignored = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.mench']);
const textExtensions = /\.(html?|css|scss|js|jsx|ts|tsx|json|md|txt|py|java|c|cpp|h|svg|xml|ya?ml|toml|sql|sh|env|gitignore)$/i;

export function validateName(name) {
    const clean = name.trim();
    // eslint-disable-next-line no-control-regex -- Reject Windows path control characters before filesystem access.
    if (!clean || clean === '.' || clean === '..' || /[<>:"/\\|?*\u0000-\u001f]/.test(clean) || /[. ]$/.test(clean)) {
        throw new Error('Use a name without slashes or special characters.');
    }
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(clean)) {
        throw new Error('That name is reserved by Windows. Choose another name.');
    }
    return clean;
}

export function languageFor(path) {
    const extension = path.split('.').pop().toLowerCase();
    return ({html:'html', htm:'html', css:'css', scss:'scss', js:'javascript', jsx:'javascript',
        ts:'typescript', tsx:'typescript', json:'json', md:'markdown', py:'python', java:'java',
        c:'c', cpp:'cpp', svg:'xml', xml:'xml', yml:'yaml', yaml:'yaml', sql:'sql'})[extension] || 'plaintext';
}

export async function scanDirectory(directory, parent = '', depth = 0) {
    const children = [];
    if (depth > 10) return children;
    for await (const [name, handle] of directory.entries()) {
        if (ignored.has(name)) continue;
        const path = parent ? parent + '/' + name : name;
        if (handle.kind === 'directory') {
            children.push({name, path, kind:'directory', handle, children:await scanDirectory(handle, path, depth + 1)});
        } else {
            children.push({name, path, kind:'file', handle, editable:textExtensions.test(name) || !name.includes('.')});
        }
    }
    return children.sort((a,b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1);
}

export function flattenFiles(tree) {
    return tree.flatMap(entry => entry.kind === 'directory' ? flattenFiles(entry.children) : [entry]);
}

export async function readProjectFile(file) {
    const data = await file.handle.getFile();
    if (data.size > 2 * 1024 * 1024) throw new Error('This file is over 2 MB. Open a smaller text file.');
    return data.text();
}

export async function writeProjectFile(handle, content) {
    const writer = await handle.createWritable();
    try {
        await writer.write(content);
        await writer.close();
    } catch (error) {
        await writer.abort?.().catch(() => {});
        throw error;
    }
}

export const webFiles = {
    'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My project</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <main>\n    <p class="eyebrow">MY FIRST PROJECT</p>\n    <h1>Something good starts here.</h1>\n    <p>Make this space your own.</p>\n    <button id="hello">Say hello</button>\n    <p id="message" aria-live="polite"></p>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>\n',
    'styles.css': 'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #f5f3ee;\n  color: #242b27;\n  font-family: system-ui, sans-serif;\n}\nmain { max-width: 560px; padding: 48px; }\nh1 { font-size: 48px; letter-spacing: -2px; line-height: 1.1; }\np { line-height: 1.7; }\n.eyebrow { font-size: 11px; letter-spacing: 3px; color: #637469; }\nbutton { background: #375b49; color: white; border: 0; padding: 12px 20px; border-radius: 4px; cursor: pointer; }\n',
    'script.js': "document.querySelector('#hello').addEventListener('click', () => {\n  document.querySelector('#message').textContent = 'Hello! You made this work.';\n});\n"
};

export async function createProject(parent, name, template = 'web', importedFiles = null) {
    const clean = validateName(name);
    const files = importedFiles || (template === 'web' ? webFiles : {});
    // Validate every path before creating the project folder.
    const prepared=Object.entries(files).map(([fileName,content])=>({parts:fileName.split('/').map(validateName),content}));
    try {
        await parent.getDirectoryHandle(clean);
        throw new Error('A folder with that name already exists here. Choose a different name, or open that project.');
    } catch (error) {
        if (error.name !== 'NotFoundError') throw error;
    }
    const directory = await parent.getDirectoryHandle(clean, {create:true});
    for (const {parts,content} of prepared) {
        let folder=directory;
        for(const part of parts.slice(0,-1))folder=await folder.getDirectoryHandle(part,{create:true});
        const file = await folder.getFileHandle(parts.at(-1), {create:true});
        await writeProjectFile(file, content);
    }
    return {id:crypto.randomUUID(), name:clean, location:parent.name + '/' + clean, directory, lastOpened:Date.now()};
}

export async function createProjectFile(directory, path, content = '') {
    const parts = path.split('/').map(validateName);
    let parent = directory;
    for (const part of parts.slice(0,-1)) parent = await parent.getDirectoryHandle(part);
    const name = parts.at(-1);
    try {
        await parent.getFileHandle(name);
        throw new Error('That file already exists. Open it from the explorer.');
    } catch (error) {
        if (error.name !== 'NotFoundError') throw error;
    }
    const handle = await parent.getFileHandle(name, {create:true});
    await writeProjectFile(handle, content);
    return {name, path, kind:'file', handle, editable:true};
}

function database() {
    return new Promise((resolve,reject) => {
        const request = indexedDB.open(DB_NAME,1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE,{keyPath:'id'});
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function query(mode, operation) {
    const db = await database();
    try {
        return await new Promise((resolve,reject) => {
            const transaction = db.transaction(STORE,mode);
            const request = operation(transaction.objectStore(STORE));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error || new Error('Could not save recent project.'));
        });
    } finally { db.close(); }
}

export async function recentProjects() {
    if (desktop()) return (await desktop().recentProjects()).map(projectFromDesktop);
    return (await query('readonly',store => store.getAll())).sort((a,b) => b.lastOpened-a.lastOpened).slice(0,8);
}

export async function rememberProject(project) {
    if (desktop()) return projectFromDesktop(await desktop().rememberProject({rootId:project.directory.rootId,relative:project.directory.path}));
    // Reopening the same directory keeps the same draft/history identity.
    const recents = await recentProjects();
    for (const recent of recents) {
        if (await recent.directory.isSameEntry(project.directory)) {
            project.id = recent.id;
            break;
        }
    }
    await query('readwrite',store => store.put({...project,lastOpened:Date.now()}));
    return project;
}

export async function reopenProject(project) {
    const options = {mode:'readwrite'};
    if (await project.directory.queryPermission(options) !== 'granted' &&
        await project.directory.requestPermission(options) !== 'granted') {
        throw new Error('Folder access was not granted. Use Open Project to choose it again.');
    }
    return project;
}

export function loadDrafts(projectId) {
    try { return JSON.parse(localStorage.getItem('mench-drafts-' + projectId) || '{}'); }
    catch { return {}; }
}

export function saveDrafts(projectId, documents) {
    const drafts = Object.fromEntries(documents.filter(doc => doc.content !== doc.saved).map(doc => [doc.path,doc.content]));
    localStorage.setItem('mench-drafts-' + projectId, JSON.stringify(drafts));
}

export function legacyCanvases() {
    try { return JSON.parse(localStorage.getItem('mench-ai-canvas-history') || '[]').filter(item => typeof item.content === 'string'); }
    catch { return []; }
}

export async function buildPreview(filePath, documents, files) {
    const findContent = async path => {
        const open = documents.find(doc => doc.path === path);
        if (open) return open.content;
        const file = files.find(file => file.path === path);
        return file ? readProjectFile(file) : null;
    };
    const resolve = (from, reference) => {
        if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) return null;
        const parts = [...(reference.startsWith('/') ? [] : from.split('/').slice(0,-1)), ...reference.split(/[?#]/)[0].split('/')];
        const result = [];
        for (const part of parts) {
            if (part === '..') result.pop();
            else if (part && part !== '.') result.push(part);
        }
        return result.join('/');
    };
    const html = await findContent(filePath);
    if (html === null) throw new Error('Open an HTML file to preview your project.');
    const doc = new DOMParser().parseFromString(html,'text/html');
    const missing = [];
    for (const link of doc.querySelectorAll('link[rel="stylesheet"][href]')) {
        const path = resolve(filePath,link.getAttribute('href'));
        if (!path) continue;
        const css = await findContent(path);
        if (css === null) { missing.push(path); continue; }
        const style = doc.createElement('style');
        style.textContent = css;
        link.replaceWith(style);
    }
    for (const script of doc.querySelectorAll('script[src]')) {
        const path = resolve(filePath,script.getAttribute('src'));
        if (!path) continue;
        const js = await findContent(path);
        if (js === null) { missing.push(path); continue; }
        script.removeAttribute('src');
        script.textContent = js;
    }
    return {html:'<!DOCTYPE html>\n' + doc.documentElement.outerHTML, missing};
}
