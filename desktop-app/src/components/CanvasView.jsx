import React, { useState, useEffect } from 'react';
import { Eye, Pencil, Copy, Download, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

const CanvasView = ({ content, setContent, isFullScreen, setIsFullScreen }) => {
    const [view, setView] = useState('edit');
    const [isHtml, setIsHtml] = useState(false);

    useEffect(() => {
        const hasHtml = /<[a-z][\s\S]*>/i.test(content);
        setIsHtml(hasHtml);
        
        if (!hasHtml) {
            setView('edit');
        }
    }, [content]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(content);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    const downloadFile = () => {
        const element = document.createElement('a');
        const file = new Blob([content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = 'code.txt';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const openInNewTab = () => {
        if (isHtml) {
            const newWindow = window.open('', '_blank');
            newWindow.document.write(content);
            newWindow.document.close();
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setView('edit')}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            view === 'edit'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        <Pencil size={16} />
                        <span>Edit</span>
                    </button>
                    {isHtml && (
                        <button
                            onClick={() => setView('preview')}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                view === 'preview'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <Eye size={16} />
                            <span>Preview</span>
                        </button>
                    )}
                </div>
                
                <div className="flex items-center space-x-2">
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Copy size={16} />
                        <span>Copy</span>
                    </button>
                    <button
                        onClick={downloadFile}
                        className="flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Download size={16} />
                        <span>Download</span>
                    </button>
                    {isHtml && (
                        <button
                            onClick={openInNewTab}
                            className="flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ExternalLink size={16} />
                            <span>Open</span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        <span>{isFullScreen ? 'Exit' : 'Full'}</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex">
                {view === 'edit' ? (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="flex-1 p-4 font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-none outline-none resize-none"
                        placeholder="Start typing your code here..."
                        spellCheck={false}
                    />
                ) : (
                    <div className="flex-1 bg-white">
                        <iframe
                            srcDoc={content}
                            className="w-full h-full border-none"
                            title="Preview"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CanvasView;
