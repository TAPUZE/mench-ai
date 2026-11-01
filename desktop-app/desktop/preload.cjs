const {contextBridge,ipcRenderer} = require('electron');
const call = async (action,payload = {}) => {
    // Return serializable errors. contextBridge does not preserve custom Error fields.
    return ipcRenderer.invoke('mench:request',{action,payload});
};
contextBridge.exposeInMainWorld('menchDesktop',Object.freeze({
    version:2,
    schoolStatus:()=>call('school.status'),
    configureSchool:options=>call('school.configure',options),
    resetCredentials:options=>call('school.credentials.reset',options),
    schoolRequest:options=>call('school.request',options),
    configureAI:options=>call('ai.configure',options),
    askAI:options=>call('ai.ask',options),
    cancelAI:options=>call('ai.cancel',options),
    chooseDirectory:options => call('workspace.choose',options),
    recentProjects:() => call('workspace.recent'),
    rememberProject:options => call('workspace.remember',options),
    checkDirectory:options => call('workspace.check',options),
    entries:options => call('fs.entries',options),
    directory:options => call('fs.directory',options),
    file:options => call('fs.file',options),
    read:options => call('fs.read',options),
    write:options => call('fs.write',options),
    rename:options => call('fs.rename',options),
    trash:options=>call('fs.trash',options),
    deleted:options=>call('fs.deleted',options),
    restoreDeleted:options=>call('fs.restore',options),
    prepareChanges:options=>call('changes.prepare',options),
    applyChanges:options=>call('changes.apply',options),
    listChanges:options=>call('changes.list',options),
    getChanges:options=>call('changes.get',options),
    undoChanges:options=>call('changes.undo',options),
    search:options => call('fs.search',options),
    history:options => call('fs.history',options),
    revision:options => call('fs.revision',options),
    capabilities:options => call('task.capabilities',options),
    runTask:options => call('task.run',options),
    stopTask:options => call('task.stop',options),
    listTasks:options => call('task.list',options),
    createTerminal:options => call('terminal.create',options),
    terminalInput:options => call('terminal.input',options),
    terminalResize:options => call('terminal.resize',options),
    closeTerminal:options => call('terminal.close',options),
    gitStatus:options => call('git.status',options),
    gitDiff:options => call('git.diff',options),
    gitStage:options => call('git.stage',options),
    gitUnstage:options => call('git.unstage',options),
    gitCommit:options => call('git.commit',options),
    gitInitialize:options => call('git.initialize',options),
    onRuntimeEvent:listener => {
        const receive = (_event,data) => listener(data);
        ipcRenderer.on('mench:runtime',receive);
        return () => ipcRenderer.removeListener('mench:runtime',receive);
    }
}));
