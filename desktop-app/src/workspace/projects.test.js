import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, readdir, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createProject, createProjectFile, scanDirectory, flattenFiles, readProjectFile, writeProjectFile, validateName, loadDrafts, saveDrafts, reopenProject} from './projects.js';

// Exercise the File System Access contract against real temporary files.
class FileHandle {
    kind = 'file';
    constructor(file) {this.file = file; this.name = path.basename(file);}
    async getFile() {return {size:(await stat(this.file)).size,text:() => readFile(this.file,'utf8')};}
    async createWritable() {
        let content;
        return {write:async value => {content = value;},close:async () => writeFile(this.file,content),abort:async () => {}};
    }
}
class DirectoryHandle {
    kind = 'directory';
    constructor(directory) {this.directory = directory; this.name = path.basename(directory);}
    async getDirectoryHandle(name,{create = false} = {}) {
        const directory = path.join(this.directory,name);
        try {if (!(await stat(directory)).isDirectory()) throw new Error('Not a directory');}
        catch (error) {
            if (error.code !== 'ENOENT') throw error;
            if (!create) throw Object.assign(new Error('Missing directory'),{name:'NotFoundError'});
            await mkdir(directory);
        }
        return new DirectoryHandle(directory);
    }
    async getFileHandle(name,{create = false} = {}) {
        const file = path.join(this.directory,name);
        try {if (!(await stat(file)).isFile()) throw new Error('Not a file');}
        catch (error) {
            if (error.code !== 'ENOENT') throw error;
            if (!create) throw Object.assign(new Error('Missing file'),{name:'NotFoundError'});
            await writeFile(file,'',{flag:'wx'});
        }
        return new FileHandle(file);
    }
    async *entries() {
        for (const entry of await readdir(this.directory,{withFileTypes:true})) {
            yield [entry.name,entry.isDirectory() ? new DirectoryHandle(path.join(this.directory,entry.name)) : new FileHandle(path.join(this.directory,entry.name))];
        }
    }
}
const root = new DirectoryHandle(await mkdtemp(path.join(tmpdir(),'mench-workspace-')));

test('new project creates an actual folder and complete web starter',async () => {
    const project = await createProject(root,'My website','web');
    const files = flattenFiles(await scanDirectory(project.directory));
    assert.deepEqual(files.map(file => file.name),['index.html','script.js','styles.css']);
    assert.match(await readProjectFile(files[0]),/href="styles.css"/);
    assert.match(await readProjectFile(files[1]),/addEventListener/);
});

test('new project refuses to overwrite an existing folder',async () => {
    const project = await createProject(root,'Keep my work','empty');
    const file = await createProjectFile(project.directory,'notes.txt','Existing work');
    await assert.rejects(createProject(root,'Keep my work','web'),/already exists/);
    assert.equal(await readProjectFile(file),'Existing work');
});

test('approved template files create nested folders and invalid paths create no project',async()=>{
    const project=await createProject(root,'Nested school starter','import',{'index.html':'<h1>Lesson</h1>','src/main.js':'console.log(1);'});
    const files=flattenFiles(await scanDirectory(project.directory));assert.equal(files.length,2);
    assert.equal(await readProjectFile(files.find(file=>file.path==='src/main.js')),'console.log(1);');
    await assert.rejects(createProject(root,'Invalid starter','import',{'../escape.js':'outside'}),/name/);
    await assert.rejects(root.getDirectoryHandle('Invalid starter'),{name:'NotFoundError'});
});

test('files can be created, edited, saved, and reloaded from disk',async () => {
    const project = await createProject(root,'Editing','empty');
    const file = await createProjectFile(project.directory,'lesson.js','const value = 1;');
    await writeProjectFile(file.handle,'const value = 2;');
    const reopened = flattenFiles(await scanDirectory(project.directory));
    assert.equal(await readProjectFile(reopened[0]),'const value = 2;');
    await assert.rejects(createProjectFile(project.directory,'lesson.js','bad'),/already exists/);
    assert.equal(await readProjectFile(file),'const value = 2;');
});

test('explorer keeps nested files and skips generated dependency folders',async () => {
    const project = await createProject(root,'Nested','empty');
    await project.directory.getDirectoryHandle('src',{create:true});
    await project.directory.getDirectoryHandle('node_modules',{create:true});
    await createProjectFile(project.directory,'src/main.js','export default 1;');
    const tree = await scanDirectory(project.directory);
    assert.equal(tree.length,1);
    assert.equal(flattenFiles(tree)[0].path,'src/main.js');
});

test('project and file names reject traversal and Windows reserved names',() => {
    for (const name of ['..','../escape','folder/file','a\\b','CON','NUL.txt','trailing.','bad?name','']) {
        assert.throws(() => validateName(name));
    }
    assert.equal(validateName('  My lesson  '),'My lesson');
});

test('unsaved drafts survive a session and saved versions clear the draft',() => {
    const storage = new Map();
    globalThis.localStorage = {getItem:key => storage.get(key),setItem:(key,value) => storage.set(key,value)};
    saveDrafts('project-1',[{path:'index.html',content:'unsaved edit',saved:'original'}]);
    assert.deepEqual(loadDrafts('project-1'),{'index.html':'unsaved edit'});
    assert.deepEqual(loadDrafts('another-project'),{});
    saveDrafts('project-1',[{path:'index.html',content:'saved edit',saved:'saved edit'}]);
    assert.deepEqual(loadDrafts('project-1'),{});
});

test('recent project respects denied or expired folder access',async () => {
    const denied = {directory:{queryPermission:async () => 'prompt',requestPermission:async () => 'denied'}};
    await assert.rejects(reopenProject(denied),/not granted/);
    const granted = {directory:{queryPermission:async () => 'granted'}};
    assert.equal(await reopenProject(granted),granted);
});
