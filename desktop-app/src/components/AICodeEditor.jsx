import React, { useState, useEffect, useRef } from 'react';
import { fileSystem } from '../utils/fileSystemManager';
import { extractCode } from '../utils/helpers';

const AICodeEditor = ({ 
    isOpen, 
    onClose, 
    apiKey, 
    selectedModel, 
    isDeveloperMode,
    onCodeGenerated 
}) => {
    const [files, setFiles] = useState([]);
    const [activeFile, setActiveFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [, setIsLoading] = useState(false);
    const [errors, setErrors] = useState([]);
    const [projectStats, setProjectStats] = useState(null);
    const [aiInstructions, setAiInstructions] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [autoFixEnabled, setAutoFixEnabled] = useState(true);
    const [learningMode, setLearningMode] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [isReplaceMode, setIsReplaceMode] = useState(false);
    
    const editorRef = useRef(null);
    const operations = useRef(null);


    // Load project files and stats
    useEffect(() => {
        if (isOpen) {
            operations.current.loadProject();
        }
    }, [isOpen]);

    // Auto-save file content
    useEffect(() => {
        if (activeFile && fileContent !== '') {
            const timer = setTimeout(() => {
                operations.current.saveFile();
            }, 2000); // Auto-save after 2 seconds of inactivity

            return () => clearTimeout(timer);
        }
    }, [fileContent, activeFile]);

    // Load project data
    const loadProject = async () => {
        try {
            setIsLoading(true);
            const projectFiles = await fileSystem.listFiles();
            const stats = fileSystem.getFileStats();
            
            setFiles(projectFiles);
            setProjectStats(stats);
            
            // Load the first file if available
            if (projectFiles.length > 0) {
                loadFile(projectFiles[0]);
            }
        } catch (error) {
            console.error('Error loading project:', error);
            setErrors([{ message: 'Failed to load project files', type: 'error' }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Load file content
    const loadFile = async (file) => {
        try {
            const content = await fileSystem.readFile(file.path);
            setActiveFile(file);
            setFileContent(content);
            setErrors([]);
        } catch (error) {
            console.error('Error loading file:', error);
            setErrors([{ message: `Failed to load file: ${file.name}`, type: 'error' }]);
        }
    };

    // Save file content
    const saveFile = async () => {
        if (!activeFile) return;

        try {
            await fileSystem.writeFile(activeFile.path, fileContent);
            
            // Auto-fix errors if enabled
            if (autoFixEnabled) {
                await autoFixErrors();
            }
            
            // Update file list
            const updatedFiles = await fileSystem.listFiles();
            setFiles(updatedFiles);
            
            console.log(`✅ File saved: ${activeFile.name}`);
        } catch (error) {
            console.error('Error saving file:', error);
            setErrors([{ message: `Failed to save file: ${activeFile.name}`, type: 'error' }]);
        }
    };

    operations.current={loadProject,saveFile};

    // Create new file
    const createNewFile = async () => {
        const fileName = prompt('Enter file name:');
        if (!fileName) return;

        try {
            const newFile = await fileSystem.createFile(fileName, '');
            const updatedFiles = await fileSystem.listFiles();
            setFiles(updatedFiles);
            
            // Load the new file
            loadFile({
                name: fileName,
                path: newFile.path,
                type: newFile.metadata.type
            });
        } catch (error) {
            console.error('Error creating file:', error);
            setErrors([{ message: `Failed to create file: ${fileName}`, type: 'error' }]);
        }
    };

    // Delete file
    const deleteFile = async (filePath) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            await fileSystem.deleteFile(filePath);
            const updatedFiles = await fileSystem.listFiles();
            setFiles(updatedFiles);
            
            // Clear active file if it was deleted
            if (activeFile && activeFile.path === filePath) {
                setActiveFile(null);
                setFileContent('');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            setErrors([{ message: 'Failed to delete file', type: 'error' }]);
        }
    };

    // Auto-fix errors in current file
    const autoFixErrors = async () => {
        if (!activeFile) return;

        try {
            const result = await fileSystem.autoFixErrors(activeFile.path);
            
            if (result.success && result.fixes) {
                setErrors([{ 
                    message: `Auto-fixed ${result.fixes.length} errors: ${result.fixes.join(', ')}`, 
                    type: 'success' 
                }]);
                
                // Reload file content to show fixes
                const updatedContent = await fileSystem.readFile(activeFile.path);
                setFileContent(updatedContent);
            }
        } catch (error) {
            console.error('Error auto-fixing:', error);
            setErrors([{ message: 'Auto-fix failed', type: 'error' }]);
        }
    };

    // Process AI instructions
    const processAIInstructions = async () => {
        if (!aiInstructions.trim() || !apiKey) return;

        setIsProcessing(true);
        setProcessingStatus('Processing AI instructions...');

        try {
            // Create AI prompt for code generation/editing
            const prompt = `
You are an AI code editor assistant. The user has requested: "${aiInstructions}"

Current file: ${activeFile ? activeFile.name : 'No file selected'}
Current content: ${fileContent || 'No content'}

Please provide the requested code changes. If creating new code, provide complete, working code.
If editing existing code, provide the modified version.

Focus on:
1. Clean, readable code
2. Best practices for the language
3. Error handling where appropriate
4. Comments for complex logic

Respond with only the code, no additional explanations.
`;

            const payload = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            };

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (response.ok && result.candidates?.[0]?.content?.parts?.[0]) {
                const aiResponse = result.candidates[0].content.parts[0].text;
                const generatedCode = extractCode(aiResponse) || aiResponse;
                
                if (activeFile) {
                    // Update existing file
                    setFileContent(generatedCode);
                    setProcessingStatus('Code updated successfully');
                } else {
                    // Create new file
                    const fileName = prompt('Enter file name for generated code:');
                    if (fileName) {
                        await createNewFileWithContent(fileName, generatedCode);
                        setProcessingStatus('New file created successfully');
                    }
                }
                
                if (onCodeGenerated) {
                    onCodeGenerated(generatedCode);
                }
            } else {
                throw new Error('Failed to generate code');
            }
        } catch (error) {
            console.error('Error processing AI instructions:', error);
            setErrors([{ message: 'Failed to process AI instructions', type: 'error' }]);
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
            setAiInstructions('');
        }
    };

    // Create new file with content
    const createNewFileWithContent = async (fileName, content) => {
        try {
            const newFile = await fileSystem.createFile(fileName, content);
            const updatedFiles = await fileSystem.listFiles();
            setFiles(updatedFiles);
            
            // Load the new file
            loadFile({
                name: fileName,
                path: newFile.path,
                type: newFile.metadata.type
            });
        } catch (error) {
            console.error('Error creating file with content:', error);
            setErrors([{ message: `Failed to create file: ${fileName}`, type: 'error' }]);
        }
    };

    // Find and replace in current file
    const findAndReplace = async () => {
        if (!activeFile || !searchQuery) return;

        try {
            const success = await fileSystem.replaceCodeRegion(
                activeFile.path, 
                searchQuery, 
                replaceQuery, 
                { isRegex: false }
            );

            if (success) {
                // Reload file content
                const updatedContent = await fileSystem.readFile(activeFile.path);
                setFileContent(updatedContent);
                setErrors([{ message: 'Replace operation completed', type: 'success' }]);
            } else {
                setErrors([{ message: 'Search pattern not found', type: 'warning' }]);
            }
        } catch (error) {
            console.error('Error in find and replace:', error);
            setErrors([{ message: 'Find and replace failed', type: 'error' }]);
        }
    };

    // Get file type icon
    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const iconMap = {
            'js': '📄',
            'jsx': '⚛️',
            'ts': '📘',
            'tsx': '⚛️',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'md': '📝',
            'py': '🐍',
            'java': '☕',
            'cpp': '⚙️',
            'c': '⚙️',
            'php': '🐘',
            'rb': '💎',
            'go': '🐹',
            'rs': '🦀',
            'swift': '🦉',
            'kt': '🟣',
            'dart': '🎯',
            'vue': '💚'
        };
        return iconMap[ext] || '📄';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">AI Code Editor</h2>
                    <div className="flex items-center space-x-2">
                        {isDeveloperMode && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                🚀 Dev Mode
                            </span>
                        )}
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 flex">
                    {/* Sidebar */}
                    <div className="w-64 bg-gray-50 border-r flex flex-col">
                        {/* Project stats */}
                        {projectStats && (
                            <div className="p-4 border-b">
                                <h3 className="font-semibold text-gray-700 mb-2">Project</h3>
                                <div className="text-sm text-gray-600">
                                    <div>Files: {projectStats.totalFiles}</div>
                                    <div>Size: {fileSystem.formatFileSize(projectStats.totalSize)}</div>
                                </div>
                            </div>
                        )}

                        {/* File list */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-gray-700">Files</h3>
                                    <button
                                        onClick={createNewFile}
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                        title="Create new file"
                                    >
                                        + New
                                    </button>
                                </div>
                                
                                {files.map((file) => (
                                    <div
                                        key={file.path}
                                        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-200 ${
                                            activeFile?.path === file.path ? 'bg-blue-100' : ''
                                        }`}
                                        onClick={() => loadFile(file)}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <span>{getFileIcon(file.name)}</span>
                                            <span className="text-sm text-gray-700">{file.name}</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteFile(file.path);
                                            }}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                            title="Delete file"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="p-4 border-t">
                            <div className="space-y-2">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={autoFixEnabled}
                                        onChange={(e) => setAutoFixEnabled(e.target.checked)}
                                        className="rounded"
                                    />
                                    <span className="text-sm">Auto-fix errors</span>
                                </label>
                                
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={learningMode}
                                        onChange={(e) => setLearningMode(e.target.checked)}
                                        className="rounded"
                                    />
                                    <span className="text-sm">Learning mode</span>
                                </label>
                                
                                <button
                                    onClick={autoFixErrors}
                                    disabled={!activeFile}
                                    className="w-full bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 disabled:opacity-50"
                                >
                                    Fix Errors
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Editor area */}
                    <div className="flex-1 flex flex-col">
                        {/* Editor toolbar */}
                        <div className="p-4 border-b bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    {activeFile && (
                                        <span className="text-sm text-gray-600">
                                            {getFileIcon(activeFile.name)} {activeFile.name}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setIsReplaceMode(!isReplaceMode)}
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        {isReplaceMode ? 'Hide' : 'Show'} Find & Replace
                                    </button>
                                </div>
                                
                                <button
                                    onClick={saveFile}
                                    disabled={!activeFile}
                                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>

                            {/* Find & Replace */}
                            {isReplaceMode && (
                                <div className="mt-4 p-3 bg-white rounded border">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Find..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="flex-1 px-3 py-1 border rounded"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Replace with..."
                                            value={replaceQuery}
                                            onChange={(e) => setReplaceQuery(e.target.value)}
                                            className="flex-1 px-3 py-1 border rounded"
                                        />
                                        <button
                                            onClick={findAndReplace}
                                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                                        >
                                            Replace
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Code editor */}
                        <div className="flex-1 flex flex-col">
                            <textarea
                                ref={editorRef}
                                value={fileContent}
                                onChange={(e) => setFileContent(e.target.value)}
                                placeholder={activeFile ? "Edit your code here..." : "Select a file to edit or create a new one"}
                                className="flex-1 p-4 font-mono text-sm border-none resize-none focus:outline-none"
                                style={{ minHeight: '400px' }}
                            />
                        </div>

                        {/* AI Instructions */}
                        <div className="p-4 border-t bg-gray-50">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    placeholder="Tell the AI what to do with your code..."
                                    value={aiInstructions}
                                    onChange={(e) => setAiInstructions(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            processAIInstructions();
                                        }
                                    }}
                                    className="flex-1 px-3 py-2 border rounded"
                                    disabled={isProcessing}
                                />
                                <button
                                    onClick={processAIInstructions}
                                    disabled={!aiInstructions.trim() || isProcessing}
                                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
                                >
                                    {isProcessing ? 'Processing...' : '🤖 AI'}
                                </button>
                            </div>
                            
                            {processingStatus && (
                                <div className="mt-2 text-sm text-green-600">
                                    {processingStatus}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error messages */}
                {errors.length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                        {errors.map((error, index) => (
                            <div
                                key={index}
                                className={`p-2 rounded mb-2 text-sm ${
                                    error.type === 'error' ? 'bg-red-100 text-red-700' :
                                    error.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                }`}
                            >
                                {error.message}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AICodeEditor;
