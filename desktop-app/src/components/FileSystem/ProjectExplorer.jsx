import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, FileText, Trash2, Edit3, Download, RefreshCw, Search, MoreVertical, Code, Image, FileType, Archive, X, Check, AlertCircle, FolderPlus, FilePlus } from 'lucide-react';

const filterStructure = (structure, query) => {
        if (!structure) return null;

        const filtered = { ...structure };
        const queryLower = query.toLowerCase();

        if (structure.type === 'file') {
            return structure.name.toLowerCase().includes(queryLower) ? structure : null;
        }

        if (structure.children) {
            filtered.children = structure.children
                .map(child => filterStructure(child, query))
                .filter(Boolean);
        }

        // Include directory if it matches or has matching children
        const nameMatches = structure.name.toLowerCase().includes(queryLower);
        const hasMatchingChildren = filtered.children?.length > 0;

        return nameMatches || hasMatchingChildren ? filtered : null;
    };

const getAllPaths = (structure, paths = []) => {
        if (structure.type === 'directory') {
            paths.push(structure.path);
            if (structure.children) {
                structure.children.forEach(child => getAllPaths(child, paths));
            }
        }
        return paths;
    };

const ProjectExplorer = ({ 
    projectStructure, 
    onFileSelect, 
    onFileCreate, 
    onFileDelete, 
    onFileRename,
    onDirectoryCreate,
    onDirectoryDelete,
    selectedFile,
    fileSystemManager,
    onStructureUpdate
}) => {
    const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
    const [contextMenu, setContextMenu] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredStructure, setFilteredStructure] = useState(projectStructure);
    const [isLoading, setIsLoading] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [error, setError] = useState(null);

    // Update filtered structure when search query changes
    useEffect(() => {
        if (searchQuery.trim()) {
            const filtered = filterStructure(projectStructure, searchQuery);
            setFilteredStructure(filtered);
            // Auto-expand all folders when searching
            if (filtered) {
                const allPaths = getAllPaths(filtered);
                setExpandedFolders(new Set(allPaths));
            }
        } else {
            setFilteredStructure(projectStructure);
        }
    }, [searchQuery, projectStructure]);

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);





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
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            item
        });
    };

    const handleContextMenuAction = async (action, item) => {
        setContextMenu(null);
        setError(null);
        
        try {
            setIsLoading(true);
            
            switch (action) {
                case 'create-file':
                    setEditingItem({ type: 'file', parent: item });
                    setNewItemName('');
                    break;
                case 'create-folder':
                    setEditingItem({ type: 'directory', parent: item });
                    setNewItemName('');
                    break;
                case 'delete':
                    await handleDelete(item);
                    break;
                case 'rename':
                    setEditingItem({ type: 'rename', item });
                    setNewItemName(item.name);
                    break;
                case 'download':
                    await downloadFile(item);
                    break;
                case 'refresh':
                    await refreshProject();
                    break;
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (item) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${item.name}"? This action cannot be undone.`
        );
        
        if (confirmed) {
            try {
                await fileSystemManager.deleteEntry(item.path);
                
                if (item.type === 'file') {
                    onFileDelete?.(item.path);
                } else {
                    onDirectoryDelete?.(item.path);
                }
                
                await refreshProject();
            } catch (error) {
                setError(`Failed to delete ${item.name}: ${error.message}`);
            }
        }
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
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                setError(`Failed to download ${item.name}: ${error.message}`);
            }
        }
    };

    const refreshProject = async () => {
        try {
            if (fileSystemManager.currentDirectory) {
                const newStructure = await fileSystemManager.loadDirectoryStructure(
                    fileSystemManager.currentDirectory
                );
                onStructureUpdate?.(newStructure);
            }
        } catch (error) {
            setError(`Failed to refresh project: ${error.message}`);
        }
    };

    const handleCreateItem = async () => {
        if (!newItemName.trim() || !editingItem) return;
        
        try {
            setIsLoading(true);
            const parentPath = editingItem.parent?.path || '';
            
            if (editingItem.type === 'file') {
                const newFile = await fileSystemManager.createFile(newItemName, '', parentPath);
                onFileCreate?.(newFile.path, newFile);
            } else if (editingItem.type === 'directory') {
                const newDir = await fileSystemManager.createDirectory(newItemName, parentPath);
                onDirectoryCreate?.(newDir.path, newDir);
            }
            
            await refreshProject();
            setEditingItem(null);
            setNewItemName('');
        } catch (error) {
            setError(`Failed to create ${editingItem.type}: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRenameItem = async () => {
        if (!newItemName.trim() || !editingItem.item) return;
        
        try {
            setIsLoading(true);
            const newItem = await fileSystemManager.renameEntry(editingItem.item.path, newItemName);
            onFileRename?.(editingItem.item.path, newItem.path);
            await refreshProject();
            setEditingItem(null);
            setNewItemName('');
        } catch (error) {
            setError(`Failed to rename ${editingItem.item.name}: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const cancelEditing = () => {
        setEditingItem(null);
        setNewItemName('');
    };

    const getFileIcon = (item) => {
        if (item.type === 'directory') {
            const isExpanded = expandedFolders.has(item.path);
            return isExpanded ? 
                <FolderOpen size={16} className="text-blue-400" /> : 
                <Folder size={16} className="text-blue-400" />;
        }
        
        const ext = item.extension?.toLowerCase();
        switch (ext) {
            case '.js':
            case '.jsx':
            case '.ts':
            case '.tsx':
                return <Code size={16} className="text-yellow-400" />;
            case '.html':
            case '.htm':
                return <Code size={16} className="text-orange-400" />;
            case '.css':
            case '.scss':
            case '.sass':
            case '.less':
                return <Code size={16} className="text-blue-400" />;
            case '.json':
                return <FileType size={16} className="text-green-400" />;
            case '.md':
            case '.txt':
                return <FileText size={16} className="text-gray-400" />;
            case '.png':
            case '.jpg':
            case '.jpeg':
            case '.gif':
            case '.svg':
            case '.webp':
                return <Image size={16} className="text-purple-400" />;
            case '.zip':
            case '.rar':
            case '.7z':
            case '.tar':
            case '.gz':
                return <Archive size={16} className="text-red-400" />;
            default:
                return <FileText size={16} className="text-gray-400" />;
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const renderFileTree = (structure, level = 0) => {
        if (!structure) return null;

        const { name, type, path, children, size } = structure;
        const isExpanded = expandedFolders.has(path);
        const isSelected = selectedFile === path;

        return (
            <div key={path}>
                <div 
                    className={`flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer select-none group ${
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
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                        {getFileIcon(structure)}
                        <span className="text-sm text-gray-200 truncate" title={name}>
                            {name}
                        </span>
                        {type === 'file' && size !== undefined && (
                            <span className="text-xs text-gray-500 ml-1">
                                ({formatFileSize(size)})
                            </span>
                        )}
                    </div>
                    
                    {/* Context menu trigger */}
                    <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e, structure);
                        }}
                    >
                        <MoreVertical size={12} className="text-gray-400" />
                    </button>
                </div>
                
                {type === 'directory' && isExpanded && children && (
                    <div>
                        {children.map(child => renderFileTree(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const renderCreateForm = () => {
        if (!editingItem) return null;

        const isRename = editingItem.type === 'rename';
        const title = isRename ? 'Rename' : `Create ${editingItem.type}`;
        const placeholder = isRename ? 'Enter new name...' : `Enter ${editingItem.type} name...`;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg p-4 w-80 border border-gray-600">
                    <h3 className="text-lg font-medium text-gray-200 mb-4">{title}</h3>
                    
                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                isRename ? handleRenameItem() : handleCreateItem();
                            } else if (e.key === 'Escape') {
                                cancelEditing();
                            }
                        }}
                    />
                    
                    <div className="flex items-center justify-end gap-2 mt-4">
                        <button
                            onClick={cancelEditing}
                            className="px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={isRename ? handleRenameItem : handleCreateItem}
                            disabled={!newItemName.trim() || isLoading}
                            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded flex items-center gap-1"
                        >
                            {isLoading ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <Check size={14} />
                            )}
                            {isRename ? 'Rename' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col">
                {/* Header */}
                <div className="p-3 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-200">Explorer</h3>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setEditingItem({ type: 'file', parent: projectStructure })}
                                className="p-1 hover:bg-gray-700 rounded"
                                title="New File"
                            >
                                <FilePlus size={14} className="text-gray-400" />
                            </button>
                            <button
                                onClick={() => setEditingItem({ type: 'directory', parent: projectStructure })}
                                className="p-1 hover:bg-gray-700 rounded"
                                title="New Folder"
                            >
                                <FolderPlus size={14} className="text-gray-400" />
                            </button>
                            <button
                                onClick={refreshProject}
                                className="p-1 hover:bg-gray-700 rounded"
                                title="Refresh"
                                disabled={isLoading}
                            >
                                <RefreshCw size={14} className={`text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
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
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-2 bg-red-900 border-b border-red-700 flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                        <span className="text-sm text-red-200 flex-1">{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-200"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

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
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50 min-w-40"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.item.type === 'directory' && (
                        <>
                            <button
                                onClick={() => handleContextMenuAction('create-file', contextMenu.item)}
                                className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                            >
                                <FilePlus size={14} />
                                New File
                            </button>
                            <button
                                onClick={() => handleContextMenuAction('create-folder', contextMenu.item)}
                                className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                            >
                                <FolderPlus size={14} />
                                New Folder
                            </button>
                            <hr className="border-gray-600 my-1" />
                        </>
                    )}
                    
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
                    
                    {contextMenu.item.type === 'file' && (
                        <>
                            <hr className="border-gray-600 my-1" />
                            <button
                                onClick={() => handleContextMenuAction('download', contextMenu.item)}
                                className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                            >
                                <Download size={14} />
                                Download
                            </button>
                        </>
                    )}
                    
                    <hr className="border-gray-600 my-1" />
                    <button
                        onClick={() => handleContextMenuAction('refresh', contextMenu.item)}
                        className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                </div>
            )}

            {/* Create/Rename Modal */}
            {renderCreateForm()}
        </>
    );
};

export default ProjectExplorer;
