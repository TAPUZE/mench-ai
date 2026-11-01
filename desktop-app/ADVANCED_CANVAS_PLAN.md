# Advanced Canvas IDE Implementation Plan

## 🎯 Goal
Transform the current canvas system into a full-featured VS Code-like IDE with real file system access, folder management, dependency detection, and AI-powered code assistance.

## 🏗️ Architecture Overview

### Core Components to Implement
1. **FileSystemManager** - Real file system access using File System Access API
2. **ProjectExplorer** - VS Code-like folder tree with file operations
3. **AdvancedCodeEditor** - Monaco Editor integration with syntax highlighting
4. **DependencyManager** - Package.json analysis and dependency installation
5. **TerminalIntegration** - Embedded terminal for running commands
6. **AICodeAssistant** - Enhanced AI integration for code generation and debugging
7. **BuildSystem** - Project building and running capabilities

### Technical Stack Additions
- **Monaco Editor**: Full VS Code editor experience
- **File System Access API**: Direct file system interaction
- **Node.js Integration**: For running npm commands and building projects
- **Tree-sitter**: Advanced syntax highlighting and parsing
- **Language Servers**: IntelliSense and code completion
- **Webpack/Vite**: Build system integration

## 📁 Implementation Structure

### Phase 1: File System Access (Days 1-2)
```
src/
├── components/
│   ├── FileSystem/
│   │   ├── FileSystemManager.jsx
│   │   ├── ProjectExplorer.jsx
│   │   ├── FileTree.jsx
│   │   └── FileOperations.jsx
│   └── Editor/
│       ├── MonacoEditor.jsx
│       ├── EditorTabs.jsx
│       └── EditorSettings.jsx
├── utils/
│   ├── fileSystemUtils.js
│   ├── projectUtils.js
│   └── pathUtils.js
└── hooks/
    ├── useFileSystem.js
    ├── useProject.js
    └── useEditor.js
```

### Phase 2: Advanced Editor (Days 3-4)
```
src/
├── components/
│   ├── Editor/
│   │   ├── MonacoEditor.jsx
│   │   ├── EditorTabs.jsx
│   │   ├── SyntaxHighlighter.jsx
│   │   ├── IntelliSense.jsx
│   │   └── CodeCompletion.jsx
│   └── Terminal/
│       ├── EmbeddedTerminal.jsx
│       ├── TerminalManager.jsx
│       └── CommandRunner.jsx
├── services/
│   ├── languageServer.js
│   ├── linting.js
│   └── formatting.js
└── workers/
    ├── syntaxWorker.js
    └── lintWorker.js
```

### Phase 3: Build System & Dependencies (Days 5-6)
```
src/
├── components/
│   ├── Dependencies/
│   │   ├── DependencyManager.jsx
│   │   ├── PackageInstaller.jsx
│   │   └── DependencyTree.jsx
│   ├── Build/
│   │   ├── BuildSystem.jsx
│   │   ├── TaskRunner.jsx
│   │   └── OutputConsole.jsx
│   └── Debug/
│       ├── Debugger.jsx
│       ├── Breakpoints.jsx
│       └── VariableInspector.jsx
└── services/
    ├── buildService.js
    ├── dependencyService.js
    └── debugService.js
```

### Phase 4: AI Integration (Days 7-8)
```
src/
├── components/
│   ├── AI/
│   │   ├── AICodeAssistant.jsx
│   │   ├── CodeSuggestions.jsx
│   │   ├── ErrorAnalyzer.jsx
│   │   └── CodeRefactoring.jsx
│   └── Features/
│       ├── GitIntegration.jsx
│       ├── SearchReplace.jsx
│       └── MultiCursor.jsx
└── services/
    ├── aiService.js
    ├── codeAnalysis.js
    └── refactoring.js
```

## 🔧 Implementation Details

### 1. File System Access Implementation

```javascript
// utils/fileSystemUtils.js
export class FileSystemManager {
    constructor() {
        this.currentDirectory = null;
        this.supportedFormats = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md'];
    }

    async openDirectory() {
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await window.showDirectoryPicker();
                this.currentDirectory = dirHandle;
                return await this.loadDirectoryStructure(dirHandle);
            } catch (error) {
                console.error('Failed to open directory:', error);
                throw error;
            }
        } else {
            throw new Error('File System Access API not supported');
        }
    }

    async loadDirectoryStructure(dirHandle, path = '') {
        const structure = { name: dirHandle.name, type: 'directory', path, children: [] };
        
        for await (const [name, handle] of dirHandle.entries()) {
            const currentPath = path ? `${path}/${name}` : name;
            
            if (handle.kind === 'directory') {
                structure.children.push(await this.loadDirectoryStructure(handle, currentPath));
            } else {
                structure.children.push({ name, type: 'file', path: currentPath, handle });
            }
        }
        
        return structure;
    }

    async readFile(fileHandle) {
        try {
            const file = await fileHandle.getFile();
            return await file.text();
        } catch (error) {
            console.error('Failed to read file:', error);
            throw error;
        }
    }

    async writeFile(fileHandle, content) {
        try {
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
        } catch (error) {
            console.error('Failed to write file:', error);
            throw error;
        }
    }

    async createFile(dirHandle, fileName, content = '') {
        try {
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            await this.writeFile(fileHandle, content);
            return fileHandle;
        } catch (error) {
            console.error('Failed to create file:', error);
            throw error;
        }
    }

    async deleteFile(dirHandle, fileName) {
        try {
            await dirHandle.removeEntry(fileName);
        } catch (error) {
            console.error('Failed to delete file:', error);
            throw error;
        }
    }
}
```

### 2. Monaco Editor Integration

```javascript
// components/Editor/MonacoEditor.jsx
import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';

const MonacoEditor = ({ 
    value, 
    onChange, 
    language = 'javascript',
    theme = 'vs-dark',
    options = {},
    onMount,
    onError
}) => {
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const [isEditorReady, setIsEditorReady] = useState(false);

    useEffect(() => {
        if (containerRef.current) {
            // Configure Monaco Editor
            monaco.editor.defineTheme('kosher-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [],
                colors: {
                    'editor.background': '#1a202c',
                    'editor.foreground': '#e2e8f0',
                    'editorLineNumber.foreground': '#4a5568',
                    'editor.selectionBackground': '#3182ce',
                    'editor.inactiveSelectionBackground': '#2d3748'
                }
            });

            const editor = monaco.editor.create(containerRef.current, {
                value: value || '',
                language,
                theme: theme === 'dark' ? 'kosher-dark' : theme,
                automaticLayout: true,
                fontSize: 14,
                lineNumbers: 'on',
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                insertSpaces: true,
                ...options
            });

            editorRef.current = editor;
            setIsEditorReady(true);

            // Set up change listener
            editor.onDidChangeModelContent(() => {
                const newValue = editor.getValue();
                onChange?.(newValue);
            });

            // Configure language features
            setupLanguageFeatures(editor, language);

            onMount?.(editor);

            return () => {
                editor.dispose();
            };
        }
    }, []);

    useEffect(() => {
        if (isEditorReady && editorRef.current && value !== editorRef.current.getValue()) {
            editorRef.current.setValue(value || '');
        }
    }, [value, isEditorReady]);

    useEffect(() => {
        if (isEditorReady && editorRef.current) {
            monaco.editor.setModelLanguage(editorRef.current.getModel(), language);
        }
    }, [language, isEditorReady]);

    const setupLanguageFeatures = (editor, language) => {
        // Add custom completion provider
        monaco.languages.registerCompletionItemProvider(language, {
            provideCompletionItems: (model, position) => {
                const suggestions = getLanguageSpecificSuggestions(language);
                return { suggestions };
            }
        });

        // Add hover provider
        monaco.languages.registerHoverProvider(language, {
            provideHover: (model, position) => {
                const word = model.getWordAtPosition(position);
                if (word) {
                    return {
                        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                        contents: [{ value: `**${word.word}**` }]
                    };
                }
                return null;
            }
        });
    };

    const getLanguageSpecificSuggestions = (language) => {
        const suggestions = {
            javascript: [
                { label: 'console.log', kind: monaco.languages.CompletionItemKind.Function, insertText: 'console.log(${1:value});' },
                { label: 'function', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'function ${1:name}(${2:params}) {\\n\\t${0}\\n}' },
                { label: 'const', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'const ${1:name} = ${0};' },
                { label: 'let', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'let ${1:name} = ${0};' },
                { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if (${1:condition}) {\\n\\t${0}\\n}' },
                { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\\n\\t${0}\\n}' },
                { label: 'forEach', kind: monaco.languages.CompletionItemKind.Method, insertText: 'forEach((${1:item}) => {\\n\\t${0}\\n});' },
                { label: 'map', kind: monaco.languages.CompletionItemKind.Method, insertText: 'map((${1:item}) => {\\n\\t${0}\\n});' },
                { label: 'filter', kind: monaco.languages.CompletionItemKind.Method, insertText: 'filter((${1:item}) => ${0});' },
                { label: 'reduce', kind: monaco.languages.CompletionItemKind.Method, insertText: 'reduce((${1:acc}, ${2:item}) => {\\n\\t${0}\\n}, ${3:initial});' }
            ],
            html: [
                { label: 'div', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '<div>${0}</div>' },
                { label: 'span', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '<span>${0}</span>' },
                { label: 'p', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '<p>${0}</p>' },
                { label: 'a', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '<a href="${1:url}">${0}</a>' },
                { label: 'img', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '<img src="${1:url}" alt="${2:description}">' },
                { label: 'button', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '<button onclick="${1:function}">${0}</button>' },
                { label: 'input', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '<input type="${1:text}" placeholder="${2:placeholder}">' },
                { label: 'form', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '<form onsubmit="${1:function}">\\n\\t${0}\\n</form>' }
            ],
            css: [
                { label: 'display', kind: monaco.languages.CompletionItemKind.Property, insertText: 'display: ${1:block};' },
                { label: 'position', kind: monaco.languages.CompletionItemKind.Property, insertText: 'position: ${1:relative};' },
                { label: 'margin', kind: monaco.languages.CompletionItemKind.Property, insertText: 'margin: ${1:0};' },
                { label: 'padding', kind: monaco.languages.CompletionItemKind.Property, insertText: 'padding: ${1:0};' },
                { label: 'background', kind: monaco.languages.CompletionItemKind.Property, insertText: 'background: ${1:#ffffff};' },
                { label: 'color', kind: monaco.languages.CompletionItemKind.Property, insertText: 'color: ${1:#000000};' },
                { label: 'font-size', kind: monaco.languages.CompletionItemKind.Property, insertText: 'font-size: ${1:16px};' },
                { label: 'border', kind: monaco.languages.CompletionItemKind.Property, insertText: 'border: ${1:1px solid #ccc};' },
                { label: 'border-radius', kind: monaco.languages.CompletionItemKind.Property, insertText: 'border-radius: ${1:4px};' },
                { label: 'flex', kind: monaco.languages.CompletionItemKind.Property, insertText: 'display: flex;\\njustify-content: ${1:center};\\nalign-items: ${2:center};' }
            ]
        };

        return suggestions[language] || [];
    };

    return (
        <div 
            ref={containerRef} 
            style={{ height: '100%', width: '100%' }}
            className="monaco-editor-container"
        />
    );
};

export default MonacoEditor;
```

### 3. Project Explorer Component

```javascript
// components/FileSystem/ProjectExplorer.jsx
import React, { useState, useEffect } from 'react';
import { 
    Folder, 
    FolderOpen, 
    FileText, 
    Plus, 
    Trash2, 
    Edit3,
    Download,
    Upload,
    RefreshCw,
    Search,
    MoreVertical
} from 'lucide-react';

const ProjectExplorer = ({ 
    projectStructure, 
    onFileSelect, 
    onFileCreate, 
    onFileDelete, 
    onFileRename,
    onDirectoryCreate,
    onDirectoryDelete,
    selectedFile,
    fileSystemManager
}) => {
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [contextMenu, setContextMenu] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredStructure, setFilteredStructure] = useState(projectStructure);

    useEffect(() => {
        if (searchQuery) {
            const filtered = filterStructure(projectStructure, searchQuery);
            setFilteredStructure(filtered);
        } else {
            setFilteredStructure(projectStructure);
        }
    }, [searchQuery, projectStructure]);

    const filterStructure = (structure, query) => {
        if (!structure) return null;
        
        const filtered = { ...structure };
        
        if (structure.type === 'file') {
            return structure.name.toLowerCase().includes(query.toLowerCase()) ? structure : null;
        }
        
        if (structure.children) {
            filtered.children = structure.children
                .map(child => filterStructure(child, query))
                .filter(Boolean);
        }
        
        return filtered.children?.length > 0 || structure.name.toLowerCase().includes(query.toLowerCase()) ? filtered : null;
    };

    const toggleFolder = (path) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    };

    const handleContextMenu = (e, item) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            item
        });
    };

    const handleContextMenuAction = (action, item) => {
        switch (action) {
            case 'create-file':
                onFileCreate?.(item.path);
                break;
            case 'create-folder':
                onDirectoryCreate?.(item.path);
                break;
            case 'delete':
                if (item.type === 'file') {
                    onFileDelete?.(item.path);
                } else {
                    onDirectoryDelete?.(item.path);
                }
                break;
            case 'rename':
                onFileRename?.(item.path);
                break;
            case 'download':
                downloadFile(item);
                break;
        }
        setContextMenu(null);
    };

    const downloadFile = async (item) => {
        if (item.type === 'file' && item.handle) {
            try {
                const content = await fileSystemManager.readFile(item.handle);
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.name;
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Failed to download file:', error);
            }
        }
    };

    const renderFileTree = (structure, level = 0) => {
        if (!structure) return null;

        const { name, type, path, children } = structure;
        const isExpanded = expandedFolders.has(path);
        const isSelected = selectedFile === path;

        return (
            <div key={path}>
                <div 
                    className={`flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer select-none ${
                        isSelected ? 'bg-blue-600' : ''
                    }`}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                    onClick={() => {
                        if (type === 'directory') {
                            toggleFolder(path);
                        } else {
                            onFileSelect?.(path, structure);
                        }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, structure)}
                >
                    {type === 'directory' ? (
                        <div className="flex items-center gap-1">
                            {isExpanded ? (
                                <FolderOpen size={16} className="text-blue-400" />
                            ) : (
                                <Folder size={16} className="text-blue-400" />
                            )}
                            <span className="text-sm text-gray-200">{name}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <FileText size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-200">{name}</span>
                        </div>
                    )}
                </div>
                
                {type === 'directory' && isExpanded && children && (
                    <div>
                        {children.map(child => renderFileTree(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full bg-gray-800 border-r border-gray-700">
            {/* Header */}
            <div className="p-3 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-200">Explorer</h3>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onFileCreate?.('')}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="New File"
                        >
                            <Plus size={14} className="text-gray-400" />
                        </button>
                        <button
                            onClick={() => onDirectoryCreate?.('')}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="New Folder"
                        >
                            <Folder size={14} className="text-gray-400" />
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="Refresh"
                        >
                            <RefreshCw size={14} className="text-gray-400" />
                        </button>
                    </div>
                </div>
                
                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-auto">
                {filteredStructure ? (
                    renderFileTree(filteredStructure)
                ) : (
                    <div className="p-4 text-center text-gray-400">
                        <Folder size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No project opened</p>
                        <p className="text-xs mt-1">Use "Open Folder" to get started</p>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onMouseLeave={() => setContextMenu(null)}
                >
                    <button
                        onClick={() => handleContextMenuAction('create-file', contextMenu.item)}
                        className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Plus size={14} />
                        New File
                    </button>
                    <button
                        onClick={() => handleContextMenuAction('create-folder', contextMenu.item)}
                        className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Folder size={14} />
                        New Folder
                    </button>
                    <hr className="border-gray-600 my-1" />
                    <button
                        onClick={() => handleContextMenuAction('rename', contextMenu.item)}
                        className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Edit3 size={14} />
                        Rename
                    </button>
                    <button
                        onClick={() => handleContextMenuAction('delete', contextMenu.item)}
                        className="w-full px-3 py-1 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>
                    <hr className="border-gray-600 my-1" />
                    <button
                        onClick={() => handleContextMenuAction('download', contextMenu.item)}
                        className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Download size={14} />
                        Download
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProjectExplorer;
```

## 🚀 Implementation Timeline

### Week 1: Foundation (Days 1-7)
- [ ] Implement FileSystemManager with File System Access API
- [ ] Create ProjectExplorer component with file tree
- [ ] Integrate Monaco Editor for advanced code editing
- [ ] Add basic file operations (create, read, write, delete)
- [ ] Implement project structure loading and saving

### Week 2: Advanced Features (Days 8-14)
- [ ] Add dependency detection and package.json parsing
- [ ] Implement embedded terminal for command execution
- [ ] Create build system integration (npm, yarn, etc.)
- [ ] Add language server support for IntelliSense
- [ ] Implement debugging capabilities

### Week 3: AI Integration (Days 15-21)
- [ ] Enhanced AI code assistant with project context
- [ ] Intelligent error detection and suggestions
- [ ] Code refactoring recommendations
- [ ] Auto-completion based on project files
- [ ] Smart import suggestions

### Week 4: Polish & Testing (Days 22-28)
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation and user guides
- [ ] Bug fixes and refinements
- [ ] User feedback integration

## 📊 Success Metrics

### Technical Metrics
- [ ] File system operations complete in <100ms
- [ ] Monaco Editor loads in <2s
- [ ] Project structure renders in <500ms
- [ ] AI suggestions appear in <1s
- [ ] Build processes complete successfully

### User Experience Metrics
- [ ] VS Code-like file management
- [ ] Seamless project navigation
- [ ] Intelligent code completion
- [ ] Real-time error detection
- [ ] Smooth multi-file editing

## 🔧 Technical Considerations

### Browser Compatibility
- File System Access API requires Chrome 86+
- Fallback to traditional file input for unsupported browsers
- Progressive enhancement for advanced features

### Performance Optimization
- Virtual scrolling for large file trees
- Lazy loading of file contents
- Web Workers for heavy computations
- Monaco Editor optimization

### Security
- Sandboxed file system access
- Secure command execution
- Input validation and sanitization
- CORS handling for external resources

This plan will transform your canvas into a professional-grade IDE that rivals VS Code's capabilities while maintaining the religious focus and AI integration that makes Kosher AI unique.
