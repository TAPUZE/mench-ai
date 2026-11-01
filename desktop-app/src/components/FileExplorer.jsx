import React, { useState, useEffect } from 'react';
import { fileSystem } from '../utils/fileSystemManager';

const FileExplorer = ({ 
    isOpen, 
    onClose, 
    onFileSelect, 
    onFileCreate, 
    onFileDelete,
    currentFile = null
}) => {
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, date, size, type
    const [sortOrder, setSortOrder] = useState('asc');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [newFileType, setNewFileType] = useState('javascript');
    const [viewMode, setViewMode] = useState('list'); // list, grid

    // File type templates
    const fileTemplates = {
        javascript: `// JavaScript file
console.log('Hello, World!');
`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello, World!</h1>
</body>
</html>`,
        css: `/* CSS Stylesheet */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}`,
        json: `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}`,
        markdown: `# My Project

## Description
This is a markdown file.

## Features
- Feature 1
- Feature 2
- Feature 3

## Usage
\`\`\`javascript
console.log('Hello, World!');
\`\`\``,
        python: `# Python file
def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`,
        text: ''
    };

    // Load files on component mount
    useEffect(() => {
        if (isOpen) {
            loadFiles();
        }
    }, [isOpen]);

    // Load files from file system
    const loadFiles = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const fileList = await fileSystem.listFiles();
            setFiles(fileList);
        } catch (err) {
            setError('Failed to load files');
            console.error('Error loading files:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter and sort files
    const filteredAndSortedFiles = files
        .filter(file => 
            file.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'date':
                    aValue = new Date(a.modified);
                    bValue = new Date(b.modified);
                    break;
                case 'size':
                    aValue = a.size;
                    bValue = b.size;
                    break;
                case 'type':
                    aValue = a.type;
                    bValue = b.type;
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

    // Handle file creation
    const handleCreateFile = async () => {
        if (!newFileName.trim()) {
            alert('Please enter a file name');
            return;
        }

        try {
            const template = fileTemplates[newFileType] || '';
            const fileName = newFileName.includes('.') ? newFileName : `${newFileName}.${getFileExtension(newFileType)}`;
            
            await fileSystem.createFile(fileName, template);
            
            // Reload files
            await loadFiles();
            
            // Close modal
            setShowCreateModal(false);
            setNewFileName('');
            setNewFileType('javascript');
            
            // Notify parent component
            if (onFileCreate) {
                onFileCreate(fileName);
            }
        } catch (err) {
            alert(`Failed to create file: ${err.message}`);
        }
    };

    // Handle file deletion
    const handleDeleteFile = async (filePath, fileName) => {
        if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
            return;
        }

        try {
            await fileSystem.deleteFile(filePath);
            await loadFiles();
            
            if (onFileDelete) {
                onFileDelete(filePath);
            }
        } catch (err) {
            alert(`Failed to delete file: ${err.message}`);
        }
    };

    // Get file extension for file type
    const getFileExtension = (type) => {
        const extensions = {
            javascript: 'js',
            html: 'html',
            css: 'css',
            json: 'json',
            markdown: 'md',
            python: 'py',
            text: 'txt'
        };
        return extensions[type] || 'txt';
    };

    // Get file icon
    const getFileIcon = (fileName, _fileType) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const iconMap = {
            js: '📄',
            jsx: '⚛️',
            ts: '📘',
            tsx: '⚛️',
            html: '🌐',
            css: '🎨',
            json: '📋',
            md: '📝',
            txt: '📄',
            py: '🐍',
            java: '☕',
            cpp: '⚙️',
            c: '⚙️',
            php: '🐘',
            rb: '💎',
            go: '🐹',
            rs: '🦀',
            swift: '🦉',
            kt: '🟣',
            dart: '🎯',
            vue: '💚'
        };
        return iconMap[ext] || '📄';
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">File Explorer</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-2 border rounded-lg"
                            />

                            {/* Sort options */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-2 border rounded-lg"
                            >
                                <option value="name">Name</option>
                                <option value="date">Date</option>
                                <option value="size">Size</option>
                                <option value="type">Type</option>
                            </select>

                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                            >
                                {sortOrder === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            {/* View mode toggle */}
                            <button
                                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                                className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                            >
                                {viewMode === 'list' ? '⋯' : '☰'}
                            </button>

                            {/* Create file button */}
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                            >
                                + New File
                            </button>

                            {/* Refresh button */}
                            <button
                                onClick={loadFiles}
                                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* File list */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <p className="mt-2 text-gray-600">Loading files...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-600">
                            {error}
                        </div>
                    ) : filteredAndSortedFiles.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchQuery ? 'No files match your search' : 'No files found'}
                        </div>
                    ) : (
                        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
                            {filteredAndSortedFiles.map((file) => (
                                <div
                                    key={file.path}
                                    className={`
                                        ${viewMode === 'grid' 
                                            ? 'p-4 border rounded-lg hover:shadow-md cursor-pointer'
                                            : 'flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer'
                                        }
                                        ${currentFile?.path === file.path ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}
                                    `}
                                    onClick={() => onFileSelect && onFileSelect(file)}
                                >
                                    {viewMode === 'grid' ? (
                                        <div className="text-center">
                                            <div className="text-4xl mb-2">{getFileIcon(file.name, file.type)}</div>
                                            <div className="text-sm font-medium text-gray-800 truncate">{file.name}</div>
                                            <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center space-x-3">
                                                <span className="text-xl">{getFileIcon(file.name, file.type)}</span>
                                                <div>
                                                    <div className="font-medium text-gray-800">{file.name}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {formatFileSize(file.size)} • {formatDate(file.modified)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onFileSelect && onFileSelect(file);
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700 text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteFile(file.path, file.name);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Create file modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-6">
                                <h3 className="text-lg font-bold mb-4">Create New File</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            File Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newFileName}
                                            onChange={(e) => setNewFileName(e.target.value)}
                                            placeholder="Enter file name"
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            File Type
                                        </label>
                                        <select
                                            value={newFileType}
                                            onChange={(e) => setNewFileType(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="javascript">JavaScript (.js)</option>
                                            <option value="html">HTML (.html)</option>
                                            <option value="css">CSS (.css)</option>
                                            <option value="json">JSON (.json)</option>
                                            <option value="markdown">Markdown (.md)</option>
                                            <option value="python">Python (.py)</option>
                                            <option value="text">Text (.txt)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-2 mt-6">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateFile}
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                                    >
                                        Create File
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileExplorer;
