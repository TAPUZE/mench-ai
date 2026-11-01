import React, { useState } from 'react';
import { Plus, Trash2, FileText, Clock, MoreVertical, Copy, Download, Settings, ToggleLeft, ToggleRight } from 'lucide-react';

const CanvasManager = ({ 
    canvasHistory, 
    currentCanvasIndex, 
    canvasAppendMode, 
    setCanvasAppendMode,
    onCreateNew, 
    onLoadCanvas, 
    onDeleteCanvas,
    t 
}) => {
    const [showManager, setShowManager] = useState(false);
    const [showDropdown, setShowDropdown] = useState(null);

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleDateString() + ' ' + 
               new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getCurrentCanvasTitle = () => {
        if (currentCanvasIndex >= 0 && currentCanvasIndex < canvasHistory.length) {
            return canvasHistory[currentCanvasIndex].title;
        }
        return 'New Canvas';
    };

    return (
        <div className="relative">
            {/* Canvas Manager Toggle */}
            <button
                onClick={() => setShowManager(!showManager)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-300 transition-colors"
                title="Canvas Manager"
            >
                <FileText size={16} />
                <span>{getCurrentCanvasTitle()}</span>
                <span className="text-xs text-gray-500">
                    ({canvasHistory.length} saved)
                </span>
            </button>

            {/* Canvas Manager Panel */}
            {showManager && (
                <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 min-w-80 max-w-96">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-300">
                                {t.canvasManager || 'Canvas Manager'}
                            </h3>
                            <button
                                onClick={() => setShowManager(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                ×
                            </button>
                        </div>
                        
                        {/* Controls */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={onCreateNew}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                            >
                                <Plus size={14} />
                                {t.newCanvas || 'New Canvas'}
                            </button>
                            
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">
                                    {canvasAppendMode ? (t.appendMode || 'Append Mode') : (t.replaceMode || 'Replace Mode')}
                                </span>
                                <button
                                    onClick={() => setCanvasAppendMode(!canvasAppendMode)}
                                    className={`transition-colors ${
                                        canvasAppendMode ? 'text-blue-400' : 'text-gray-500'
                                    }`}
                                    title={canvasAppendMode ? 'Append new code to current canvas' : 'Create new canvas for each code block'}
                                >
                                    {canvasAppendMode ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Canvas List */}
                    <div className="max-h-64 overflow-y-auto">
                        {canvasHistory.length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-sm">
                                {t.noCanvases || 'No saved canvases yet. Create your first one!'}
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {canvasHistory.map((canvas, index) => (
                                    <div
                                        key={canvas.id}
                                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                                            currentCanvasIndex === index 
                                                ? 'bg-blue-600 text-white' 
                                                : 'hover:bg-gray-700 text-gray-300'
                                        }`}
                                        onClick={() => onLoadCanvas(index)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <FileText size={14} />
                                                <span className="text-sm font-medium truncate">
                                                    {canvas.title}
                                                </span>
                                                {currentCanvasIndex === index && (                                                <span className="text-xs bg-blue-500 px-2 py-1 rounded">
                                                    {t.currentCanvas || 'Current'}
                                                </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-xs opacity-75">
                                                <Clock size={12} />
                                                <span>{formatTimestamp(canvas.timestamp)}</span>
                                                <span>•</span>
                                                <span>{canvas.content.split('\n').length} lines</span>
                                            </div>
                                        </div>
                                        
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDropdown(showDropdown === index ? null : index);
                                                }}
                                                className="p-1 hover:bg-gray-600 rounded transition-colors"
                                            >
                                                <MoreVertical size={14} />
                                            </button>
                                            
                                            {showDropdown === index && (
                                                <div className="absolute right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded shadow-lg z-10 min-w-32">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(canvas.content);
                                                            setShowDropdown(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors"
                                                    >
                                                        <Copy size={12} />
                                                        Copy
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const blob = new Blob([canvas.content], { type: 'text/plain' });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `${canvas.title.replace(/\s+/g, '_')}.txt`;
                                                            a.click();
                                                            URL.revokeObjectURL(url);
                                                            setShowDropdown(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors"
                                                    >
                                                        <Download size={12} />
                                                        Download
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newTitle = prompt('Enter new title:', canvas.title);
                                                            if (newTitle && newTitle.trim()) {
                                                                // Update canvas title logic would go here
                                                            }
                                                            setShowDropdown(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors"
                                                    >
                                                        <Settings size={12} />
                                                        Rename
                                                    </button>
                                                    <div className="border-t border-gray-600 my-1"></div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('Are you sure you want to delete this canvas?')) {
                                                                onDeleteCanvas(index);
                                                            }
                                                            setShowDropdown(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-600 transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-gray-700 text-xs text-gray-400">
                        <div className="flex items-center justify-between">
                            <span>{canvasHistory.length} canvas{canvasHistory.length !== 1 ? 'es' : ''} saved</span>
                            <span>
                                Mode: {canvasAppendMode ? 'Append' : 'Replace'}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CanvasManager;
