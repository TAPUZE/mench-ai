import {test, before, after, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';

const browser = new JSDOM('<!doctype html><html><body><div id="test-root"></div></body></html>',{url:'http://localhost:3000'});
for (const name of ['window','document','HTMLElement','Element','DOMParser','localStorage','KeyboardEvent','Event','MouseEvent']) {
    globalThis[name] = name === 'window' ? browser.window : name === 'document' ? browser.window.document : browser.window[name];
}
Object.defineProperty(globalThis,'navigator',{value:browser.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
browser.window.HTMLElement.prototype.scrollIntoView = () => {};
const React = await import('react');
const {createRoot} = await import('react-dom/client');
const records = new Map();
globalThis.indexedDB = {open:() => {
    const request = {};
    request.result = {
        createObjectStore:() => {},close:() => {},
        transaction:() => {
            const transaction = {objectStore:() => ({
                getAll:() => {
                    const operation = {result:[...records.values()]};
                    setTimeout(() => transaction.oncomplete?.(),0);
                    return operation;
                },
                put:value => {
                    records.set(value.id,value);
                    const operation = {result:value.id};
                    setTimeout(() => transaction.oncomplete?.(),0);
                    return operation;
                }
            })};
            return transaction;
        }
    };
    setTimeout(() => request.onsuccess?.(),0);
    return request;
}};

class MemoryFile {
    kind = 'file';
    constructor(name,content = '') {this.name = name;this.content = content;}
    async getFile() {return {size:this.content.length,text:async () => this.content};}
    async createWritable() {
        return {write:async content => {this.next = content;},close:async () => {this.content = this.next;},abort:async () => {}};
    }
}
class MemoryDirectory {
    kind = 'directory';
    constructor(name) {this.name = name;this.children = new Map();}
    async getDirectoryHandle(name,{create = false} = {}) {
        if (!this.children.has(name)) {
            if (!create) throw Object.assign(new Error('Missing folder'),{name:'NotFoundError'});
            this.children.set(name,new MemoryDirectory(name));
        }
        return this.children.get(name);
    }
    async getFileHandle(name,{create = false} = {}) {
        if (!this.children.has(name)) {
            if (!create) throw Object.assign(new Error('Missing file'),{name:'NotFoundError'});
            this.children.set(name,new MemoryFile(name));
        }
        return this.children.get(name);
    }
    async *entries() {yield* this.children.entries();}
    async isSameEntry(other) {return this === other;}
    async queryPermission() {return 'granted';}
}
let server, WorkspaceApp, root, parent, pickerTarget;
const originalFetch = globalThis.fetch;
before(async () => {
    server = await createServer({
        configFile:false,cacheDir:".local/test-vite/workbench",server:{middlewareMode:true,hmr:false,ws:false},appType:'custom',
        ssr:{noExternal:['@monaco-editor/react']},
        plugins:[{name:'component-test-editor',enforce:'pre',
            resolveId:id => id === '@monaco-editor/react' ? '\0test-editor' : null,
            load:id => id === '\0test-editor' ? 'import React from "react"; export function Editor(props) { return React.createElement("textarea", {"aria-label":"Test editor", value:props.value, onChange:event=>props.onChange(event.target.value)}); } export function DiffEditor() {return React.createElement("div",null,"Review diff");}' : null
        }]
    });
    WorkspaceApp = (await server.ssrLoadModule('/src/WorkspaceApp.jsx')).default;
});
after(async () => {await server?.close();browser.window.close();});
beforeEach(async () => {
    records.clear();localStorage.clear();
    parent = new MemoryDirectory('My projects');
    pickerTarget = parent;
    window.showDirectoryPicker = async () => pickerTarget;
    root = createRoot(document.getElementById('test-root'));
    await React.act(async () => {root.render(React.createElement(WorkspaceApp));await pause(15);});
});
afterEach(async () => {globalThis.fetch = originalFetch;await React.act(async () => root.unmount());});
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
const buttons = () => [...document.querySelectorAll('button')];
const button = label => {
    const item = buttons().find(item => item.getAttribute('aria-label') === label || item.textContent.trim() === label || item.textContent.trim().startsWith(label));
    assert.ok(item,'Missing button: ' + label);
    return item;
};
const click = async label => React.act(async () => {button(label).click();await pause(25);});
const input = async (element,value) => React.act(async () => {
    const setter = Object.getOwnPropertyDescriptor(element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,'value').set;
    setter.call(element,value);
    element.dispatchEvent(new Event('input',{bubbles:true}));
    await pause(5);
});
const formSubmit = async form => React.act(async () => {form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await pause(50);});
async function newProject(name = 'School project') {
    await click('New project');
    await input(document.querySelector('input[placeholder="my-first-project"]'),name);
    await click('Choose location');
    await formSubmit(document.querySelector('[role="dialog"] form'));
    assert.equal(document.querySelector('[role="dialog"]'),null);
    assert.match(document.title,new RegExp(name));
}

test('welcome starts with new/open, then creates a real project and opens the editor',async () => {
    assert.match(document.body.textContent,/Recent projects/);
    assert.equal(document.querySelector('[role="tablist"]'),null);
    await newProject();
    const directory = await parent.getDirectoryHandle('School project');
    assert.equal(directory.children.size,3);
    assert.match((await directory.getFileHandle('index.html')).content,/My project/);
    assert.equal(document.querySelector('[role="tab"][aria-selected="true"]').textContent.includes('index.html'),true);
    assert.equal(document.querySelector('[aria-label="Test editor"]').value.includes('<!DOCTYPE html>'),true);
    assert.match(document.body.textContent,/Connect Gemini/);
    assert.equal(document.querySelector('[aria-label="Project files"]').textContent.includes('styles.css'),true);
});

test('editing, Ctrl+S, preview assets, and recent-project reopening work together',async () => {
    await newProject('Saved lesson');
    const edit = document.querySelector('[aria-label="Test editor"]');
    await input(edit,edit.value.replace('Something good starts here.','A saved lesson'));
    assert.match(document.body.textContent,/1 unsaved/);
    await React.act(async () => {window.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,cancelable:true}));await pause(35);});
    const directory = await parent.getDirectoryHandle('Saved lesson');
    assert.match((await directory.getFileHandle('index.html')).content,/A saved lesson/);
    assert.match(document.body.textContent,/All changes saved/);
    await click('Preview');
    await React.act(async () => {await pause(320);});
    const source = document.querySelector('iframe[title="Project preview"]').getAttribute('srcdoc');
    assert.match(source,/A saved lesson/);
    assert.match(source,/<style>/);
    assert.match(source,/addEventListener/);
    assert.equal(source.includes('src="script.js"'),false);
    await click('menchai');
    assert.match(document.title,/Welcome/);
    await click('Saved lesson');
    assert.match(document.title,/Saved lesson/);
    assert.match(document.querySelector('[aria-label="Test editor"]').value,/A saved lesson/);
});

test('leaving a project keeps unsaved drafts and restores them on reopen',async () => {
    await newProject('Draft lesson');
    const edit = document.querySelector('[aria-label="Test editor"]');
    await input(edit,'An unsaved lesson draft');
    await click('menchai');
    assert.match(document.querySelector('[role="dialog"]').textContent,/unsaved changes/);
    await click('Keep drafts & continue');
    assert.match(document.title,/Welcome/);
    await click('Draft lesson');
    assert.equal(document.querySelector('[aria-label="Test editor"]').value,'An unsaved lesson draft');
    assert.match(document.body.textContent,/1 unsaved/);
    const directory = await parent.getDirectoryHandle('Draft lesson');
    assert.notEqual((await directory.getFileHandle('index.html')).content,'An unsaved lesson draft');
});

test('external edits are not silently overwritten and new files appear in the explorer',async () => {
    await newProject('Conflict check');
    const edit = document.querySelector('[aria-label="Test editor"]');
    await input(edit,'My local edit');
    const directory = await parent.getDirectoryHandle('Conflict check');
    const disk = await directory.getFileHandle('index.html');
    disk.content = 'Changed by another editor';
    await click('Save');
    assert.match(document.querySelector('[role="alert"]').textContent,/changed outside/);
    assert.equal(disk.content,'Changed by another editor');
    await click('New file');
    await input(document.querySelector('[placeholder="index.html"]'),'notes.txt');
    await formSubmit(document.querySelector('[role="dialog"] form'));
    assert.ok(await directory.getFileHandle('notes.txt'));
    assert.match(document.querySelector('[aria-label="Project files"]').textContent,/notes.txt/);
});

test('AI setup, explicit file context, and reviewed changes do not write files automatically',async () => {
    await newProject('Assistant check');
    await input(document.getElementById('assistant-prompt'),'Help me improve this code');
    await formSubmit(document.querySelector('.mw-composer'));
    assert.equal(document.querySelector('[role="dialog"]').getAttribute('aria-label'),'Workspace settings');
    await input(document.querySelector('input[type="password"]'),'test-key-not-a-secret');
    await formSubmit(document.querySelector('[role="dialog"] form'));
    assert.equal(document.querySelector('.mw-compose-actions input').checked,false);
    await React.act(async () => document.querySelector('.mw-compose-actions input').click());
    let request;
    globalThis.fetch = async (url,options) => {
        request = {url,...options,payload:JSON.parse(options.body)};
        return {ok:true,json:async () => ({candidates:[{finishReason:'STOP',content:{parts:[{text:'Here is a simpler file.\n\x60\x60\x60html\n<h1>A reviewed change</h1>\n\x60\x60\x60'}]}}]})};
    };
    await formSubmit(document.querySelector('.mw-composer'));
    assert.equal(request.url.includes('test-key'),false);
    assert.equal(request.headers['x-goog-api-key'],'test-key-not-a-secret');
    assert.match(request.payload.systemInstruction.parts[0].text,/TORAH|Torah/);
    const sentFiles=JSON.parse(request.payload.contents.at(-1).parts[1].text.split('\n').slice(1).join('\n'));
    assert.equal(sentFiles[0].path,'index.html');assert.match(sentFiles[0].content,/<html/);
    assert.ok(!request.payload.systemInstruction.parts[0].text.includes(sentFiles[0].content));
    const directory = await parent.getDirectoryHandle('Assistant check');
    const original = (await directory.getFileHandle('index.html')).content;
    await click('Review change');
    assert.match(document.querySelector('[role="dialog"]').textContent,/Review change/);
    await click('Apply change');
    assert.equal(document.querySelector('[aria-label="Test editor"]').value,'<h1>A reviewed change</h1>');
    assert.equal((await directory.getFileHandle('index.html')).content,original);
    assert.match(document.body.textContent,/1 unsaved/);
});

test('canceling the folder picker leaves a usable welcome screen',async () => {
    window.showDirectoryPicker = async () => {throw Object.assign(new Error('Cancelled'),{name:'AbortError'});};
    await click('Open project');
    assert.equal(document.querySelector('[role="alert"]'),null);
    assert.match(document.title,/Welcome/);
    assert.equal(button('New project').disabled,false);
});
