import React, { useState, useEffect, useRef } from 'react';
import { Eye, Pencil, Copy, Download, Play, Maximize2, Minimize2, RefreshCw, ExternalLink, Code, Monitor, Smartphone, Tablet, FileText, Folder, Plus, Search, ZoomIn, ZoomOut, RotateCcw, RotateCw, Type, Palette } from 'lucide-react';
import ProjectManager from './ProjectManager';
import ResizablePanel from './ResizablePanel';
import CanvasManager from './CanvasManager';

const EnhancedCanvasView = ({ 
    content, 
    setContent, 
    isFullScreen, 
    setIsFullScreen,
    canvasHistory = [],
    currentCanvasIndex = -1,
    canvasAppendMode = false,
    setCanvasAppendMode = () => {},
    onCreateNewCanvas = () => {},
    onLoadCanvas = () => {},
    onDeleteCanvas = () => {},
    t = {}
}) => {
    const [view, setView] = useState('edit');
    const [isHtml, setIsHtml] = useState(false);
    const [language, setLanguage] = useState('html');
    const [previewMode, setPreviewMode] = useState('desktop');
    const [showConsole, setShowConsole] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState([]);
    const [showFileManager, setShowFileManager] = useState(false);
    const [fontSize, setFontSize] = useState(14);
    const [lineNumbers, setLineNumbers] = useState(true);
    const [wordWrap, setWordWrap] = useState(false);
    const [theme, setTheme] = useState('light');

    const [currentFile, setCurrentFile] = useState('main.html');
    const [files, setFiles] = useState({ 'main.html': content });
    const [searchTerm, setSearchTerm] = useState('');
    const [replaceMode, setReplaceMode] = useState(false);
    const [replaceTerm, setReplaceTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const textareaRef = useRef(null);
    const iframeRef = useRef(null),latestContent = useRef(content),shortcutActions = useRef(null);
    latestContent.current=content;
    
    useEffect(() => { 
        // Enhanced HTML detection - more comprehensive patterns
        const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
        const hasDoctype = content.includes('<!DOCTYPE') || content.includes('<!doctype');
        const hasHtmlStructure = content.includes('<html') || content.includes('<HTML');
        const hasCommonTags = /<(div|p|span|h[1-6]|a|img|button|input|form|table|ul|ol|li|nav|header|footer|main|section|article|aside|figure|video|audio|canvas|svg|style|script|link|meta|title|head|body)[\s>]/i.test(content);
        const hasHtmlEntities = /&[a-zA-Z0-9]+;/.test(content);
        const hasStyleAttribute = /style\s*=\s*["'][^"']*["']/i.test(content);
        const hasClassAttribute = /class\s*=\s*["'][^"']*["']/i.test(content);
        const hasIdAttribute = /id\s*=\s*["'][^"']*["']/i.test(content);
        
        // Check if content looks like HTML (even if it's just text that could be rendered)
        const hasHtml = hasHtmlTags || hasDoctype || hasHtmlStructure || hasCommonTags || hasHtmlEntities || hasStyleAttribute || hasClassAttribute || hasIdAttribute;
        
        // JavaScript detection
        const hasJs = /function|const|let|var|=>|\(\)|console\.log|document\.|window\.|alert\(|setTimeout|setInterval|addEventListener|querySelector|getElementById/i.test(content);
        
        // CSS detection
        const hasCss = /\{[^}]*\}/.test(content) && !hasHtml && /[a-z-]+\s*:\s*[^;]+;/i.test(content);
        
        // JSON detection
        const hasJson = content.trim().startsWith('{') && content.trim().endsWith('}') && !hasHtml;
        
        console.log('Enhanced content analysis:', { 
            hasHtml, hasJs, hasCss, hasJson, 
            contentLength: content.length,
            hasHtmlTags, hasDoctype, hasHtmlStructure, hasCommonTags,
            hasHtmlEntities, hasStyleAttribute, hasClassAttribute, hasIdAttribute
        });
        
        setIsHtml(hasHtml);
        
        // Set language based on content
        if (hasHtml) setLanguage('html');
        else if (hasJs) setLanguage('javascript');
        else if (hasCss) setLanguage('css');
        else if (hasJson) setLanguage('json');
        else setLanguage('text');
        
        // Update current file content
        if (files[currentFile] !== content) {
            setFiles(prev => ({ ...prev, [currentFile]: content }));
        }
    }, [content, currentFile, files]);

    // Sync content with current file and canvas management
    useEffect(() => {
        // React to file-cache changes; typing is synchronized in the other direction.
        if (files[currentFile] && files[currentFile] !== latestContent.current) {
            setContent(files[currentFile]);
        }
    }, [currentFile, files, setContent]);
    
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        // Save file functionality
                        break;
                    case 'f':
                        e.preventDefault();
                        // Focus search
                        break;
                    case 'n':
                        e.preventDefault();
                        if (e.shiftKey) {
                            shortcutActions.current.createNewFile();
                        }
                        break;
                    case '=':
                        e.preventDefault();
                        increaseFontSize();
                        break;
                    case '-':
                        e.preventDefault();
                        decreaseFontSize();
                        break;
                    case 'Enter':
                        if (e.shiftKey) {
                            e.preventDefault();
                            setView(view === 'edit' ? 'preview' : 'edit');
                        }
                        break;
                    default:
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [view]);

    // Theme support
    const themes = {
        light: {
            bg: 'bg-gray-50',
            text: 'text-gray-900',
            editor: 'bg-white text-gray-900',
            border: 'border-gray-200'
        },
        dark: {
            bg: 'bg-gray-900',
            text: 'text-gray-100',
            editor: 'bg-gray-800 text-gray-200',
            border: 'border-gray-700'
        },
        monokai: {
            bg: 'bg-gray-900',
            text: 'text-green-400',
            editor: 'bg-black text-green-400',
            border: 'border-green-800'
        }
    };

    const currentTheme = themes[theme] || themes.dark;

    // File Management Functions
    const createNewFile = () => {
        const fileName = prompt('Enter file name:');
        if (fileName && !files[fileName]) {
            setFiles(prev => ({ ...prev, [fileName]: '' }));
            setCurrentFile(fileName);
        }
    };

    shortcutActions.current={createNewFile};

    const deleteFile = (fileName) => {
        if (Object.keys(files).length > 1) {
            const newFiles = { ...files };
            delete newFiles[fileName];
            setFiles(newFiles);
            if (currentFile === fileName) {
                setCurrentFile(Object.keys(newFiles)[0]);
            }
        }
    };



    // Advanced Editor Functions
    const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 24));
    const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 8));
    
    const formatCode = () => {
        if (language === 'html') {
            // Simple HTML formatting
            const formatted = content
                .replace(/></g, '>\n<')
                .replace(/^\s*\n/gm, '')
                .split('\n')
                .map((line, _index) => {
                    const indent = '  '.repeat(Math.max(0, line.match(/</g)?.length - line.match(/>/g)?.length || 0));
                    return indent + line.trim();
                })
                .join('\n');
            setContent(formatted);
        }
    };

    const search = (term) => {
        if (!term) return;
        const textarea = textareaRef.current;
        if (textarea) {
            const text = textarea.value;
            const index = text.toLowerCase().indexOf(term.toLowerCase());
            if (index !== -1) {
                textarea.focus();
                textarea.setSelectionRange(index, index + term.length);
            }
        }
    };

    const replaceAll = (searchTerm, replaceTerm) => {
        const newContent = content.replace(new RegExp(searchTerm, 'g'), replaceTerm);
        setContent(newContent);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(content);
            // You could add a toast notification here
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const downloadCode = () => {
        const extension = language === 'html' ? 'html' : 
                         language === 'javascript' ? 'js' : 
                         language === 'css' ? 'css' : 'txt';
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `code.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const runCode = () => {
        if (language === 'javascript') {
            try {
                // Simple JavaScript execution for demo
                const result = eval(content);
                setConsoleOutput(prev => [...prev, { type: 'log', content: String(result) }]);
                setShowConsole(true);
            } catch (error) {
                setConsoleOutput(prev => [...prev, { type: 'error', content: error.message }]);
                setShowConsole(true);
            }
        }
    };

    const refreshPreview = () => {
        if (iframeRef.current) {
            iframeRef.current.setAttribute('src', iframeRef.current.src);
        }
    };

    const openInNewTab = () => {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const getPreviewWidth = () => {
        switch (previewMode) {
            case 'mobile': return '375px';
            case 'tablet': return '768px';
            case 'desktop': return '100%';
            default: return '100%';
        }
    };

    const getPreviewHeight = () => {
        switch (previewMode) {
            case 'mobile': return '667px';
            case 'tablet': return '1024px';
            case 'desktop': return '100%';
            default: return '100%';
        }
    };

    // AI Code Suggestions
    const generateCodeSuggestions = async (_currentCode, _cursorPosition) => {
        // This would integrate with the AI to generate code suggestions
        // For now, we'll provide basic suggestions based on language
        const suggestions = [];
        
        if (language === 'html') {
            suggestions.push(
                '<div class="container">',
                '<p>',
                '<img src="" alt="">',
                '<a href="">',
                '<button onclick="">',
                '<input type="text" placeholder="">'
            );
        } else if (language === 'javascript') {
            suggestions.push(
                'function () {',
                'const variable = ',
                'if (condition) {',
                'for (let i = 0; i < length; i++) {',
                'document.getElementById("").addEventListener("click", function() {',
                'console.log("");'
            );
        } else if (language === 'css') {
            suggestions.push(
                'display: flex;',
                'margin: 0 auto;',
                'padding: 10px;',
                'background-color: #ffffff;',
                'border-radius: 8px;',
                'box-shadow: 0 2px 4px rgba(0,0,0,0.1);'
            );
        }
        
        return suggestions;
    };

    const handleAutoComplete = async (e) => {
        if (e.ctrlKey && e.key === ' ') {
            e.preventDefault();
            const cursorPosition = e.target.selectionStart;
            const suggestions = await generateCodeSuggestions(content, cursorPosition);
            setSuggestions(suggestions);
            setShowSuggestions(true);
            setSuggestionIndex(0);
        }
    };

    const applySuggestion = (suggestion) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = content.substring(0, start) + suggestion + content.substring(end);
            setContent(newContent);
            setShowSuggestions(false);
            
            // Focus back to textarea
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + suggestion.length;
            }, 0);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Project Manager */}
            <ProjectManager
                files={files}
                setFiles={setFiles}
                currentFile={currentFile}
                setCurrentFile={setCurrentFile}
                onProjectChange={(projectId, project) => {
                    // Handle project changes
                    console.log('Project changed:', projectId, project);
                }}
            />
            
            {/* Enhanced Toolbar */}
            <div className={`flex items-center justify-between p-4 border-b ${currentTheme.border}`}>
                <div className="flex items-center gap-4">
                    <h2 className={`text-lg font-semibold flex items-center gap-2 ${currentTheme.text}`}>
                        <Code size={20} />
                        Canvas - {language.toUpperCase()}
                    </h2>
                    
                    {/* Canvas Manager */}
                    <CanvasManager
                        canvasHistory={canvasHistory}
                        currentCanvasIndex={currentCanvasIndex}
                        canvasAppendMode={canvasAppendMode}
                        setCanvasAppendMode={setCanvasAppendMode}
                        onCreateNew={onCreateNewCanvas}
                        onLoadCanvas={onLoadCanvas}
                        onDeleteCanvas={onDeleteCanvas}
                        t={t}
                    />
                    
                    {/* File Manager Toggle */}
                    <button
                        onClick={() => setShowFileManager(!showFileManager)}
                        className={`p-2 rounded-md ${
                            showFileManager ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                        title="File Manager"
                    >
                        <Folder size={16} />
                    </button>
                    
                    {/* View Toggle - Always show if there's meaningful content */}
                    {(isHtml || content.trim().length > 0) && (
                        <div className="flex items-center gap-1 rounded-lg bg-gray-800 p-1">
                            <button 
                                onClick={() => setView('edit')} 
                                className={`px-3 py-1 text-sm rounded-md flex items-center gap-2 ${
                                    view === 'edit' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                            >
                                <Pencil size={14} /> Edit
                            </button>
                            <button 
                                onClick={() => setView('preview')} 
                                className={`px-3 py-1 text-sm rounded-md flex items-center gap-2 ${
                                    view === 'preview' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                                title={isHtml ? 'HTML Preview' : 'Text Preview'}
                            >
                                <Eye size={14} /> Preview
                            </button>
                        </div>
                    )}
                    
                    {/* Device Preview Mode - Show when in preview mode */}
                    {view === 'preview' && content.trim().length > 0 && (
                        <div className="flex items-center gap-1 rounded-lg bg-gray-800 p-1">
                            <button 
                                onClick={() => setPreviewMode('mobile')} 
                                className={`p-2 rounded-md ${
                                    previewMode === 'mobile' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                                title="Mobile View"
                            >
                                <Smartphone size={14} />
                            </button>
                            <button 
                                onClick={() => setPreviewMode('tablet')} 
                                className={`p-2 rounded-md ${
                                    previewMode === 'tablet' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                                title="Tablet View"
                            >
                                <Tablet size={14} />
                            </button>
                            <button 
                                onClick={() => setPreviewMode('desktop')} 
                                className={`p-2 rounded-md ${
                                    previewMode === 'desktop' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                                title="Desktop View"
                            >
                                <Monitor size={14} />
                            </button>
                        </div>
                    )}
                    
                    {/* Editor Tools */}
                    {view === 'edit' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={decreaseFontSize}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                                title="Decrease Font Size"
                            >
                                <ZoomOut size={14} />
                            </button>
                            <span className="text-xs text-gray-400 px-2">{fontSize}px</span>
                            <button
                                onClick={increaseFontSize}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                                title="Increase Font Size"
                            >
                                <ZoomIn size={14} />
                            </button>
                            <button
                                onClick={() => setLineNumbers(!lineNumbers)}
                                className={`p-1 rounded ${
                                    lineNumbers ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                                title="Toggle Line Numbers"
                            >
                                <Type size={14} />
                            </button>
                            <button
                                onClick={() => setWordWrap(!wordWrap)}
                                className={`p-1 rounded ${
                                    wordWrap ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                                title="Toggle Word Wrap"
                            >
                                <RotateCw size={14} />
                            </button>
                            <button
                                onClick={formatCode}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                                title="Format Code"
                            >
                                <Palette size={14} />
                            </button>
                            <select
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                className="text-xs bg-gray-800 text-gray-200 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Theme"
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="monokai">Monokai</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Search */}
                    {view === 'edit' && (
                        <div className="flex items-center gap-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="text-sm bg-gray-800 text-gray-200 border border-gray-600 rounded px-3 py-1 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onKeyPress={(e) => e.key === 'Enter' && search(searchTerm)}
                                />
                                <button
                                    onClick={() => search(searchTerm)}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    <Search size={12} />
                                </button>
                            </div>
                            {replaceMode && (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        placeholder="Replace with..."
                                        value={replaceTerm}
                                        onChange={(e) => setReplaceTerm(e.target.value)}
                                        className="text-sm bg-gray-800 text-gray-200 border border-gray-600 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={() => replaceAll(searchTerm, replaceTerm)}
                                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                                    >
                                        Replace All
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => setReplaceMode(!replaceMode)}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                                title="Toggle Replace Mode"
                            >
                                <RotateCcw size={14} />
                            </button>
                        </div>
                    )}
                    
                    <button 
                        onClick={copyToClipboard}
                        className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md flex items-center gap-2"
                        title="Copy Code"
                    >
                        <Copy size={14} />
                        Copy
                    </button>
                    
                    <button 
                        onClick={downloadCode}
                        className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md flex items-center gap-2"
                        title="Download Code"
                    >
                        <Download size={14} />
                        Download
                    </button>
                    
                    {language === 'javascript' && (
                        <button 
                            onClick={runCode}
                            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded-md flex items-center gap-2"
                            title="Run Code"
                        >
                            <Play size={14} />
                            Run
                        </button>
                    )}
                    
                    {view === 'preview' && content.trim().length > 0 && (
                        <>
                            <button 
                                onClick={refreshPreview}
                                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md flex items-center gap-2"
                                title="Refresh Preview"
                            >
                                <RefreshCw size={14} />
                            </button>
                            
                            {isHtml && (
                                <button 
                                    onClick={openInNewTab}
                                    className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md flex items-center gap-2"
                                    title="Open in New Tab"
                                >
                                    <ExternalLink size={14} />
                                </button>
                            )}
                        </>
                    )}
                    
                    {setIsFullScreen && (
                        <button 
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md flex items-center gap-2"
                            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                        >
                            {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    )}
                </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 flex">
                {showFileManager ? (
                    <ResizablePanel
                        leftPanel={
                            <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col">
                                <div className="p-3 border-b border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-gray-300">Files</h3>
                                        <button
                                            onClick={createNewFile}
                                            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                                            title="New File"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2">
                                    {Object.keys(files).map(fileName => (
                                        <div
                                            key={fileName}
                                            className={`flex items-center justify-between p-2 rounded cursor-pointer group ${
                                                currentFile === fileName ? 'bg-gray-700' : 'hover:bg-gray-700'
                                            }`}
                                            onClick={() => setCurrentFile(fileName)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText size={14} className="text-gray-400" />
                                                <span className="text-sm text-gray-300">{fileName}</span>
                                            </div>
                                            {Object.keys(files).length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteFile(fileName);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 rounded"
                                                    title="Delete File"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        }
                        rightPanel={
                            <div className="flex-1 flex flex-col">
                                {view === 'preview' && content.trim().length > 0 ? (
                                    <div className="flex-1 p-4 bg-gray-800 flex items-center justify-center overflow-auto">
                                        <div 
                                            className="bg-white rounded-lg shadow-lg overflow-auto max-h-full"
                                            style={{ 
                                                width: getPreviewWidth(), 
                                                height: getPreviewHeight(),
                                                maxWidth: '100%',
                                                maxHeight: '100%'
                                            }}
                                        >
                                            {isHtml ? (
                                                <iframe 
                                                    ref={iframeRef}
                                                    srcDoc={content} 
                                                    title="Canvas Preview" 
                                                    className="w-full h-full border-0" 
                                                    sandbox="allow-scripts allow-forms allow-modals" 
                                                />
                                            ) : (
                                                <div className="w-full h-full p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap overflow-auto">
                                                    {content}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 p-4">
                                        {/* File Tab */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText size={14} className="text-gray-400" />
                                            <span className="text-sm text-gray-300">{currentFile}</span>
                                        </div>
                                        
                                        <div className="h-full relative overflow-hidden">
                                            {/* Enhanced Editor */}
                                            <div className="flex h-full">
                                                {/* Line Numbers */}
                                                {lineNumbers && (
                                                    <div className="bg-gray-850 text-gray-500 text-right pr-2 py-4 font-mono text-sm select-none border-r border-gray-600 overflow-y-auto">
                                                        {content.split('\n').map((_, index) => (
                                                            <div key={index} className="leading-6 min-h-6">
                                                                {index + 1}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {/* Code Editor */}
                                                <div className="flex-1 relative">
                                                    <textarea 
                                                        ref={textareaRef}
                                                        value={content} 
                                                        onChange={(e) => {
                                                            setContent(e.target.value);
                                                            // Update current file
                                                            setFiles(prev => ({ ...prev, [currentFile]: e.target.value }));
                                                        }} 
                                                        className="w-full h-full bg-gray-800 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono resize-none p-4 overflow-auto"
                                                        placeholder="Generate code and switch to Canvas mode to see it here."
                                                        spellCheck={false}
                                                        style={{ 
                                                            fontSize: `${fontSize}px`,
                                                            lineHeight: '1.5',
                                                            tabSize: '2',
                                                            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                            wordWrap: wordWrap ? 'break-word' : 'normal',
                                                            minHeight: '100%'
                                                        }}
                                                        onKeyDown={(e) => {
                                                            // Tab support
                                                            if (e.key === 'Tab') {
                                                                e.preventDefault();
                                                                const start = e.target.selectionStart;
                                                                const end = e.target.selectionEnd;
                                                                const newValue = content.substring(0, start) + '  ' + content.substring(end);
                                                                setContent(newValue);
                                                                setFiles(prev => ({ ...prev, [currentFile]: newValue }));
                                                                setTimeout(() => {
                                                                    e.target.selectionStart = e.target.selectionEnd = start + 2;
                                                                }, 0);
                                                            }
                                                            // Auto-complete
                                                            handleAutoComplete(e);
                                                        }}
                                                    />
                                                    
                                                    {/* Code Suggestions Dropdown */}
                                                    {showSuggestions && suggestions.length > 0 && (
                                                        <div className="absolute bg-gray-800 border border-gray-600 rounded shadow-lg z-10 max-h-48 overflow-y-auto"
                                                             style={{ 
                                                                 top: '100px', 
                                                                 left: '50px',
                                                                 minWidth: '200px'
                                                             }}
                                                        >
                                                            {suggestions.map((suggestion, index) => (
                                                                <div
                                                                    key={index}
                                                                    onClick={() => applySuggestion(suggestion)}
                                                                    className={`px-3 py-2 cursor-pointer text-sm font-mono ${
                                                                        index === suggestionIndex 
                                                                            ? 'bg-blue-600 text-white' 
                                                                            : 'text-gray-200 hover:bg-gray-700'
                                                                    }`}
                                                                >
                                                                    {suggestion}
                                                                </div>
                                                            ))}
                                                            <div className="px-3 py-1 text-xs text-gray-400 border-t border-gray-600">
                                                                Press Ctrl+Space for suggestions
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Status Bar */}
                                            <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded flex items-center gap-3 z-10">
                                                <span>{content.split('\n').length} lines</span>
                                                <span>{content.length} chars</span>
                                                <span>Language: {language}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Empty State */}
                                {view === 'preview' && content.trim().length === 0 && (
                                    <div className="flex-1 flex items-center justify-center bg-gray-800 text-gray-400">
                                        <div className="text-center">
                                            <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                            <p className="text-lg mb-2">No content to preview</p>
                                            <p className="text-sm">Generate some code or switch to Edit mode to get started</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        }
                        defaultLeftWidth={250}
                        minLeftWidth={200}
                        maxLeftWidth={400}
                    />
                ) : (
                    <div className="flex-1 flex flex-col">
                        {view === 'preview' && content.trim().length > 0 ? (
                            <div className="flex-1 p-4 bg-gray-800 flex items-center justify-center overflow-auto">
                                <div 
                                    className="bg-white rounded-lg shadow-lg overflow-auto max-h-full"
                                    style={{ 
                                        width: getPreviewWidth(), 
                                        height: getPreviewHeight(),
                                        maxWidth: '100%',
                                        maxHeight: '100%'
                                    }}
                                >
                                    {isHtml ? (
                                        <iframe 
                                            ref={iframeRef}
                                            srcDoc={content} 
                                            title="Canvas Preview" 
                                            className="w-full h-full border-0" 
                                            sandbox="allow-scripts allow-forms allow-modals" 
                                        />
                                    ) : (
                                        <div className="w-full h-full p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap overflow-auto">
                                            {content}
                                        </div>
                                    )}
                                    
                                    {/* Empty State */}
                                    {view === 'preview' && content.trim().length === 0 && (
                                        <div className="flex-1 flex items-center justify-center bg-gray-800 text-gray-400">
                                            <div className="text-center">
                                                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                                <p className="text-lg mb-2">No content to preview</p>
                                                <p className="text-sm">Generate some code or switch to Edit mode to get started</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 p-4">
                                {/* File Tab */}
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText size={14} className="text-gray-400" />
                                    <span className="text-sm text-gray-300">{currentFile}</span>
                                </div>
                                
                                <div className="h-full relative overflow-hidden">
                                    {/* Enhanced Editor */}
                                    <div className="flex h-full">
                                        {/* Line Numbers */}
                                        {lineNumbers && (
                                            <div className="bg-gray-850 text-gray-500 text-right pr-2 py-4 font-mono text-sm select-none border-r border-gray-600 overflow-y-auto">
                                                {content.split('\n').map((_, index) => (
                                                    <div key={index} className="leading-6 min-h-6">
                                                        {index + 1}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Code Editor */}
                                        <div className="flex-1 relative">
                                            <textarea 
                                                ref={textareaRef}
                                                value={content} 
                                                onChange={(e) => {
                                                    setContent(e.target.value);
                                                    // Update current file
                                                    setFiles(prev => ({ ...prev, [currentFile]: e.target.value }));
                                                }} 
                                                className="w-full h-full bg-gray-800 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono resize-none p-4 overflow-auto"
                                                placeholder="Generate code and switch to Canvas mode to see it here."
                                                spellCheck={false}
                                                style={{ 
                                                    fontSize: `${fontSize}px`,
                                                    lineHeight: '1.5',
                                                    tabSize: '2',
                                                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                    wordWrap: wordWrap ? 'break-word' : 'normal',
                                                    minHeight: '100%'
                                                }}
                                                onKeyDown={(e) => {
                                                    // Tab support
                                                    if (e.key === 'Tab') {
                                                        e.preventDefault();
                                                        const start = e.target.selectionStart;
                                                        const end = e.target.selectionEnd;
                                                        const newValue = content.substring(0, start) + '  ' + content.substring(end);
                                                        setContent(newValue);
                                                        setFiles(prev => ({ ...prev, [currentFile]: newValue }));
                                                        setTimeout(() => {
                                                            e.target.selectionStart = e.target.selectionEnd = start + 2;
                                                        }, 0);
                                                    }
                                                    // Auto-complete
                                                    handleAutoComplete(e);
                                                }}
                                            />
                                            
                                            {/* Code Suggestions Dropdown */}
                                            {showSuggestions && suggestions.length > 0 && (
                                                <div className="absolute bg-gray-800 border border-gray-600 rounded shadow-lg z-10 max-h-48 overflow-y-auto"
                                                     style={{ 
                                                         top: '100px', 
                                                         left: '50px',
                                                         minWidth: '200px'
                                                     }}
                                                >
                                                    {suggestions.map((suggestion, index) => (
                                                        <div
                                                            key={index}
                                                            onClick={() => applySuggestion(suggestion)}
                                                            className={`px-3 py-2 cursor-pointer text-sm font-mono ${
                                                                index === suggestionIndex 
                                                                    ? 'bg-blue-600 text-white' 
                                                                    : 'text-gray-200 hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {suggestion}
                                                        </div>
                                                    ))}
                                                    <div className="px-3 py-1 text-xs text-gray-400 border-t border-gray-600">
                                                        Press Ctrl+Space for suggestions
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Status Bar */}
                                    <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded flex items-center gap-3 z-10">
                                        <span>{content.split('\n').length} lines</span>
                                        <span>{content.length} chars</span>
                                        <span>Language: {language}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Console Output */}
            {showConsole && (
                <div className="border-t border-gray-700 bg-gray-800 p-4 max-h-32 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-300">Console Output</span>
                        <button 
                            onClick={() => setShowConsole(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            <Minimize2 size={14} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {consoleOutput.map((output, index) => (
                            <div key={index} className={`text-xs font-mono p-2 rounded ${
                                output.type === 'error' ? 'bg-red-900 text-red-200' : 'bg-gray-700 text-gray-200'
                            }`}>
                                {output.content}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* AI Code Suggestions */}
            {showSuggestions && (
                <div className="absolute bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
                    <div className="flex flex-col">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className={`p-2 text-sm cursor-pointer ${
                                    index === suggestionIndex ? 'bg-blue-500 text-white' : 'text-gray-900'
                                }`}
                                onClick={() => applySuggestion(suggestion)}
                                onMouseEnter={() => setSuggestionIndex(index)}
                            >
                                {suggestion}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedCanvasView;
