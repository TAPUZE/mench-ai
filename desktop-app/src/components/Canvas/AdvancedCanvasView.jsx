import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FolderOpen, Save, Play, Square, Terminal as TerminalIcon, Package, Monitor, Smartphone, Tablet, Maximize2, Minimize2, Code, Eye, FileText, AlertCircle, CheckCircle, Loader2, X, HelpCircle } from 'lucide-react';

import MonacoEditor from '../Editor/MonacoEditor';
import ProjectExplorer from '../FileSystem/ProjectExplorer';
import DependencyManager from '../Dependencies/DependencyManager';
import Terminal from '../Terminal/Terminal';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { fileSystemManager } from '../../utils/nativeFileSystemManager';

const AdvancedCanvasView = ({ 
    content, 
    setContent, 
    isFullScreen, 
    setIsFullScreen,
    t: _t = {},
    currentCanvas: _currentCanvas,
    onContentChange
}) => {
    // Project state
    const [projectStructure, setProjectStructure] = useState(null);
    const [openFiles, setOpenFiles] = useState(new Map());
    const [activeFile, setActiveFile] = useState(null);
    const [isProjectLoading, setIsProjectLoading] = useState(false);

    // Editor state
    const [view, setView] = useState('edit');
    const [previewMode, setPreviewMode] = useState('desktop');
    const [editorSettings] = useState({
        fontSize: 14,
        wordWrap: true,
        minimap: true,
        lineNumbers: true,
        theme: 'kosher-dark'
    });

    // Terminal state
    const [showTerminal, setShowTerminal] = useState(false);
    const [terminalOutput, setTerminalOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    // Dependencies state
    const [, setDependencies] = useState([]);
    const [missingDependencies, setMissingDependencies] = useState([]);
    const [showDependencyManager, setShowDependencyManager] = useState(false);

    // UI state
    const [showExplorer, setShowExplorer] = useState(true);
    const [explorerWidth] = useState(300);
    const [terminalHeight] = useState(200);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const iframeRef = useRef(null),saveAction = useRef(null);

    // Keyboard shortcuts
    const { showShortcutsHelp } = useKeyboardShortcuts({
        onSave: () => saveCurrentFile(),
        onOpen: () => openProject(),
        onRun: () => runProject(),
        onToggleTerminal: () => setShowTerminal(!showTerminal),
        onToggleDependencies: () => setShowDependencyManager(!showDependencyManager),
        onToggleExplorer: () => setShowExplorer(!showExplorer),
        onNewFile: () => {
            // Create new file functionality
            const fileName = prompt('Enter file name:');
            if (fileName) {
                handleFileSelect(fileName);
                setOpenFiles(prev => new Map(prev).set(fileName, ''));
            }
        },
        onCloseFile: () => {
            if (activeFile) {
                setOpenFiles(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(activeFile);
                    return newMap;
                });
                setActiveFile(null);
            }
        },
        onFocusEditor: () => {
            // Focus the Monaco editor
            const editor = document.querySelector('.monaco-editor');
            if (editor) {
                editor.focus();
            }
        },
        onTogglePreview: () => setView(view === 'edit' ? 'preview' : 'edit'),
        isEnabled: true
    });

    const createDefaultProject = useCallback((initialContent) => {
        const defaultStructure = {
            name: 'Canvas Project',
            type: 'directory',
            path: 'canvas-project',
            children: [
                {
                    name: 'index.html',
                    type: 'file',
                    path: 'canvas-project/index.html',
                    content: initialContent || '',
                    extension: '.html',
                    isSupported: true,
                    isBinary: false
                }
            ]
        };

        setProjectStructure(defaultStructure);
        setOpenFiles(new Map([['canvas-project/index.html', initialContent || '']]));
        setActiveFile('canvas-project/index.html');
    }, []);

    // Initialize project
    useEffect(() => {
        // Auto-detect if we have content and create a default project
        if (content && !projectStructure) {
            createDefaultProject(content);
        }
    }, [content, projectStructure, createDefaultProject]);

    // Auto-save functionality
    useEffect(() => {
        const saveInterval = setInterval(() => {
            if (activeFile && openFiles.has(activeFile)) {
                saveAction.current();
            }
        }, 30000); // Auto-save every 30 seconds

        return () => clearInterval(saveInterval);
    }, [activeFile, openFiles]);

    const openProject = async () => {
        try {
            setIsProjectLoading(true);
            setError(null);
            
            if (!fileSystemManager.isSupported()) {
                throw new Error('File System Access API is not supported. Please use Chrome 86+ or Edge 86+.');
            }

            const structure = await fileSystemManager.openDirectory();
            setProjectStructure(structure);
            setSuccess('Project opened successfully!');
            
            // Analyze project for dependencies
            analyzeDependencies(structure);
            
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            setError(error.message);
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsProjectLoading(false);
        }
    };

    const handleFileSelect = async (filePath, fileInfo) => {
        try {
            setError(null);
            
            if (fileInfo.isBinary) {
                setError('Binary files cannot be edited in the code editor');
                return;
            }

            if (!fileInfo.isSupported) {
                setError('This file type is not supported for editing');
                return;
            }

            let fileContent = '';
            
            if (fileInfo.handle) {
                // Real file from file system
                fileContent = await fileSystemManager.readFile(fileInfo.handle);
            } else if (openFiles.has(filePath)) {
                // Already open file
                fileContent = openFiles.get(filePath);
            }

            setOpenFiles(prev => new Map(prev.set(filePath, fileContent)));
            setActiveFile(filePath);
            setContent(fileContent);
        } catch (error) {
            setError(`Failed to open file: ${error.message}`);
        }
    };

    const saveCurrentFile = async () => {
        if (!activeFile || !openFiles.has(activeFile)) return;

        try {
            const fileContent = openFiles.get(activeFile);
            
            // Find the file info in project structure
            const fileInfo = findFileInStructure(projectStructure, activeFile);
            
            if (fileInfo?.handle) {
                await fileSystemManager.writeFile(fileInfo.handle, fileContent);
                setSuccess('File saved successfully!');
                setTimeout(() => setSuccess(null), 2000);
            } else {
                // Update local content for non-file-system files
                setContent(fileContent);
            }
        } catch (error) {
            setError(`Failed to save file: ${error.message}`);
        }
    };

    saveAction.current=saveCurrentFile;

    const findFileInStructure = (structure, path) => {
        if (!structure) return null;
        
        if (structure.path === path) {
            return structure;
        }
        
        if (structure.children) {
            for (const child of structure.children) {
                const found = findFileInStructure(child, path);
                if (found) return found;
            }
        }
        
        return null;
    };

    const handleContentChange = (newContent) => {
        if (activeFile) {
            setOpenFiles(prev => new Map(prev.set(activeFile, newContent)));
        }
        setContent(newContent);
        
        // Sync back to main app
        if (onContentChange) {
            onContentChange(newContent);
        }
    };

    const analyzeDependencies = async (structure) => {
        try {
            const packageJsonFile = findFileInStructure(structure, 'package.json');
            if (packageJsonFile?.handle) {
                const packageContent = await fileSystemManager.readFile(packageJsonFile.handle);
                const packageData = JSON.parse(packageContent);
                
                const deps = {
                    ...packageData.dependencies,
                    ...packageData.devDependencies
                };
                
                setDependencies(Object.keys(deps));
                
                // Check for missing dependencies (basic check)
                const missing = Object.keys(deps).filter(dep => {
                    // This is a simplified check - in a real implementation,
                    // you'd check if node_modules exists and contains the packages
                    return !findFileInStructure(structure, `node_modules/${dep}`);
                });
                
                setMissingDependencies(missing);
            }
        } catch (error) {
            console.error('Failed to analyze dependencies:', error);
        }
    };

    const runProject = async () => {
        if (!activeFile) return;

        setIsRunning(true);
        setShowTerminal(true);
        setTerminalOutput([]);

        try {
            const fileInfo = findFileInStructure(projectStructure, activeFile);
            const ext = fileInfo?.extension?.toLowerCase();

            if (ext === '.html') {
                // For HTML files, refresh the preview
                if (iframeRef.current) {
                    iframeRef.current.setAttribute('src', iframeRef.current.src);
                }
                addTerminalOutput('HTML preview refreshed', 'success');
            } else if (ext === '.js') {
                // For JavaScript files, run in a sandbox
                try {
                    const result = eval(openFiles.get(activeFile));
                    addTerminalOutput(`Output: ${result}`, 'success');
                } catch (error) {
                    addTerminalOutput(`Error: ${error.message}`, 'error');
                }
            } else {
                addTerminalOutput('File type not executable in browser environment', 'warning');
            }
        } catch (error) {
            addTerminalOutput(`Failed to run: ${error.message}`, 'error');
        } finally {
            setIsRunning(false);
        }
    };

    const handleInstallDependency = async (packageName, version, isDev) => {
        try {
            setSuccess(null);
            setError(null);
            
            // Add terminal output
            addTerminalOutput(`Installing ${packageName}@${version}...`, 'info');
            
            // Simulate package installation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Update dependencies list
            setDependencies(prev => {
                const newDep = [packageName, version];
                if (isDev) {
                    // Add to dev dependencies
                    return prev;
                } else {
                    // Add to regular dependencies
                    return [...prev.filter(([name]) => name !== packageName), newDep];
                }
            });
            
            addTerminalOutput(`Successfully installed ${packageName}@${version}`, 'success');
            setSuccess(`Successfully installed ${packageName}`);
            
        } catch (error) {
            addTerminalOutput(`Failed to install ${packageName}: ${error.message}`, 'error');
            setError(`Failed to install ${packageName}: ${error.message}`);
        }
    };

    const handleRemoveDependency = async (packageName, _isDev) => {
        try {
            setSuccess(null);
            setError(null);
            
            // Add terminal output
            addTerminalOutput(`Removing ${packageName}...`, 'info');
            
            // Simulate package removal
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update dependencies list
            setDependencies(prev => prev.filter(([name]) => name !== packageName));
            
            addTerminalOutput(`Successfully removed ${packageName}`, 'success');
            setSuccess(`Successfully removed ${packageName}`);
            
        } catch (error) {
            addTerminalOutput(`Failed to remove ${packageName}: ${error.message}`, 'error');
            setError(`Failed to remove ${packageName}: ${error.message}`);
        }
    };

    const getPreviewContent = () => {
        if (!activeFile || !openFiles.has(activeFile)) return '';
        
        const fileContent = openFiles.get(activeFile);
        const fileInfo = findFileInStructure(projectStructure, activeFile);
        const ext = fileInfo?.extension?.toLowerCase();

        if (ext === '.html') {
            return fileContent;
        } else if (ext === '.md') {
            // Basic markdown rendering
            return `<pre>${fileContent}</pre>`;
        } else {
            return `<pre><code>${fileContent}</code></pre>`;
        }
    };

    const getLanguageFromExtension = (filePath) => {
        if (!filePath) return 'plaintext';
        
        const ext = filePath.split('.').pop()?.toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'json': 'json',
            'md': 'markdown',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin'
        };
        
        return languageMap[ext] || 'plaintext';
    };

    const renderStatusBar = () => {

findFileInStructure(projectStructure, activeFile);
        const language = getLanguageFromExtension(activeFile);
        const lineCount = openFiles.get(activeFile)?.split('\n').length || 0;
        const charCount = openFiles.get(activeFile)?.length || 0;

        return (
            <div className="bg-gray-900 border-t border-gray-700 px-4 py-1 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-4">
                    {activeFile && (
                        <>
                            <span>{activeFile.split('/').pop()}</span>
                            <span>Language: {language}</span>
                            <span>{lineCount} lines</span>
                            <span>{charCount} characters</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {missingDependencies.length > 0 && (
                        <span className="text-yellow-400">
                            {missingDependencies.length} missing dependencies
                        </span>
                    )}
                    {isRunning && <span className="text-blue-400">Running...</span>}
                </div>
            </div>
        );
    };

    const addTerminalOutput = (message, type = 'info') => {
        setTerminalOutput(prev => [
            ...prev,
            {
                id: Date.now(),
                message,
                type,
                timestamp: new Date().toLocaleTimeString()
            }
        ]);
    };

    const handleTerminalCommand = async (command) => {
        if (command === '__CLEAR__') {
            setTerminalOutput([]);
            return;
        }
        
        if (command === '__INTERRUPT__') {
            setIsRunning(false);
            addTerminalOutput('Process interrupted', 'warning');
            return;
        }

        addTerminalOutput(command, 'command');
        setIsRunning(true);

        try {
            // Simulate command execution
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Handle common commands
            if (command.startsWith('npm install')) {
                const packageName = command.split(' ')[2] || 'dependencies';
                addTerminalOutput(`Installing ${packageName}...`, 'info');
                await new Promise(resolve => setTimeout(resolve, 2000));
                addTerminalOutput(`Successfully installed ${packageName}`, 'success');
            } else if (command.startsWith('npm start')) {
                addTerminalOutput('Starting development server...', 'info');
                await new Promise(resolve => setTimeout(resolve, 1500));
                addTerminalOutput('Development server started at http://localhost:3000', 'success');
            } else if (command.startsWith('npm run build')) {
                addTerminalOutput('Building project...', 'info');
                await new Promise(resolve => setTimeout(resolve, 3000));
                addTerminalOutput('Build completed successfully', 'success');
            } else if (command.startsWith('git status')) {
                addTerminalOutput('On branch main', 'info');
                addTerminalOutput('Your branch is up to date with origin/main', 'info');
                addTerminalOutput('No changes to commit, working tree clean', 'success');
            } else if (command === 'ls' || command === 'dir') {
                if (projectStructure) {
                    const files = projectStructure.children?.map(child => child.name).join('  ') || 'No files';
                    addTerminalOutput(files, 'info');
                } else {
                    addTerminalOutput('No project loaded', 'warning');
                }
            } else if (command.startsWith('cd ')) {
                const path = command.substring(3);
                addTerminalOutput(`Changed directory to ${path}`, 'info');
            } else if (command === 'pwd') {
                addTerminalOutput(projectStructure?.path || '/canvas-project', 'info');
            } else if (command === 'clear') {
                setTerminalOutput([]);
            } else if (command === 'help') {
                addTerminalOutput('Available commands:', 'info');
                addTerminalOutput('  npm install [package] - Install dependencies', 'info');
                addTerminalOutput('  npm start - Start development server', 'info');
                addTerminalOutput('  npm run build - Build project', 'info');
                addTerminalOutput('  git status - Check git status', 'info');
                addTerminalOutput('  ls/dir - List files', 'info');
                addTerminalOutput('  cd [path] - Change directory', 'info');
                addTerminalOutput('  pwd - Show current directory', 'info');
                addTerminalOutput('  clear - Clear terminal', 'info');
                addTerminalOutput('  help - Show this help', 'info');
            } else {
                addTerminalOutput(`Command not recognized: ${command}`, 'error');
                addTerminalOutput('Type "help" for available commands', 'info');
            }
        } catch (error) {
            addTerminalOutput(`Error: ${error.message}`, 'error');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center gap-2">
                    <button
                        onClick={openProject}
                        disabled={isProjectLoading}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
                    >
                        {isProjectLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <FolderOpen size={16} />
                        )}
                        Open Folder
                    </button>
                    
                    <button
                        onClick={saveCurrentFile}
                        disabled={!activeFile}
                        className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm"
                    >
                        <Save size={16} />
                        Save
                    </button>
                    
                    <button
                        onClick={runProject}
                        disabled={!activeFile || isRunning}
                        className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-sm"
                    >
                        {isRunning ? (
                            <Square size={16} />
                        ) : (
                            <Play size={16} />
                        )}
                        Run
                    </button>
                    
                    <button
                        onClick={() => setShowDependencyManager(true)}
                        className="flex items-center gap-2 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
                    >
                        <Package size={16} />
                        Dependencies
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center gap-1 rounded-lg bg-gray-700 p-1">
                        <button 
                            onClick={() => setView('edit')} 
                            className={`px-3 py-1 text-sm rounded-md flex items-center gap-2 ${
                                view === 'edit' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'
                            }`}
                        >
                            <Code size={14} /> Edit
                        </button>
                        <button 
                            onClick={() => setView('preview')} 
                            className={`px-3 py-1 text-sm rounded-md flex items-center gap-2 ${
                                view === 'preview' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'
                            }`}
                        >
                            <Eye size={14} /> Preview
                        </button>
                    </div>

                    {/* Preview Mode */}
                    {view === 'preview' && (
                        <div className="flex items-center gap-1 rounded-lg bg-gray-700 p-1">
                            <button 
                                onClick={() => setPreviewMode('mobile')} 
                                className={`p-2 rounded-md ${
                                    previewMode === 'mobile' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'
                                }`}
                            >
                                <Smartphone size={14} />
                            </button>
                            <button 
                                onClick={() => setPreviewMode('tablet')} 
                                className={`p-2 rounded-md ${
                                    previewMode === 'tablet' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'
                                }`}
                            >
                                <Tablet size={14} />
                            </button>
                            <button 
                                onClick={() => setPreviewMode('desktop')} 
                                className={`p-2 rounded-md ${
                                    previewMode === 'desktop' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'
                                }`}
                            >
                                <Monitor size={14} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setShowTerminal(!showTerminal)}
                        className={`p-2 rounded-md ${
                            showTerminal ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-600'
                        }`}
                    >
                        <TerminalIcon size={16} />
                    </button>

                    <button
                        onClick={showShortcutsHelp}
                        className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-600"
                        title="Show keyboard shortcuts (F1)"
                    >
                        <HelpCircle size={16} />
                    </button>

                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-600"
                    >
                        {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>

                    {/* Shortcuts Help */}
                    <button
                        onClick={showShortcutsHelp}
                        className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-600"
                        title="Keyboard Shortcuts"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="bg-red-900 border-b border-red-700 p-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-red-200 text-sm">{error}</span>
                    <button 
                        onClick={() => setError(null)}
                        className="ml-auto text-red-400 hover:text-red-200"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {success && (
                <div className="bg-green-900 border-b border-green-700 p-2 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-green-200 text-sm">{success}</span>
                    <button 
                        onClick={() => setSuccess(null)}
                        className="ml-auto text-green-400 hover:text-green-200"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Explorer Panel */}
                {showExplorer && (
                    <div style={{ width: explorerWidth }} className="border-r border-gray-700">
                        <ProjectExplorer
                            projectStructure={projectStructure}
                            selectedFile={activeFile}
                            onFileSelect={handleFileSelect}
                            onStructureUpdate={setProjectStructure}
                            fileSystemManager={fileSystemManager}
                        />
                    </div>
                )}

                {/* Editor/Preview Area */}
                <div className="flex-1 flex flex-col">
                    {view === 'edit' ? (
                        <div className="flex-1">
                            {activeFile ? (
                                <MonacoEditor
                                    value={openFiles.get(activeFile) || ''}
                                    onChange={handleContentChange}
                                    language={getLanguageFromExtension(activeFile)}
                                    theme={editorSettings.theme}
                                    options={{
                                        fontSize: editorSettings.fontSize,
                                        wordWrap: editorSettings.wordWrap ? 'on' : 'off',
                                        minimap: { enabled: editorSettings.minimap },
                                        lineNumbers: editorSettings.lineNumbers ? 'on' : 'off'
                                    }}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <div className="text-center">
                                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                        <p className="text-lg mb-2">No file selected</p>
                                        <p className="text-sm">Open a file from the explorer or create a new project</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 p-4 bg-gray-800 flex items-center justify-center">
                            <div 
                                className="bg-white rounded-lg shadow-lg overflow-hidden"
                                style={{ 
                                    width: previewMode === 'mobile' ? '375px' : 
                                           previewMode === 'tablet' ? '768px' : '100%',
                                    height: previewMode === 'mobile' ? '667px' : 
                                            previewMode === 'tablet' ? '1024px' : '100%',
                                    maxWidth: '100%',
                                    maxHeight: '100%'
                                }}
                            >
                                <iframe 
                                    ref={iframeRef}
                                    srcDoc={getPreviewContent()} 
                                    title="Preview" 
                                    className="w-full h-full border-0" 
                                    sandbox="allow-scripts" 
                                />
                            </div>
                        </div>
                    )}

                    {/* Terminal */}
                    {showTerminal && (
                        <Terminal
                            isOpen={showTerminal}
                            onClose={() => setShowTerminal(false)}
                            output={terminalOutput}
                            onCommand={handleTerminalCommand}
                            isRunning={isRunning}
                            workingDirectory={projectStructure?.path || '/canvas-project'}
                            className="border-t border-gray-700"
                            style={{ height: terminalHeight }}
                        />
                    )}
                </div>
            </div>

            {/* Status Bar */}
            {renderStatusBar()}
            
            {/* Dependency Manager Modal */}
            <DependencyManager
                isOpen={showDependencyManager}
                onClose={() => setShowDependencyManager(false)}
                projectStructure={projectStructure}
                onInstallDependency={handleInstallDependency}
                onRemoveDependency={handleRemoveDependency}
            />
        </div>
    );
};

export default AdvancedCanvasView;
