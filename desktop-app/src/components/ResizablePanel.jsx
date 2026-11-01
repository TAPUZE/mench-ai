import React, { useState, useCallback, useEffect, useRef } from 'react';

const ResizablePanel = ({ 
    leftPanel, 
    rightPanel, 
    defaultLeftWidth = 300, 
    minLeftWidth = 200, 
    maxLeftWidth = 600,
    className = ""
}) => {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef(null);

    const handleMouseDown = useCallback((e) => {
        setIsResizing(true);
        e.preventDefault();
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isResizing || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newLeftWidth = e.clientX - containerRect.left;
        
        if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
            setLeftWidth(newLeftWidth);
        }
    }, [isResizing, minLeftWidth, maxLeftWidth]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    return (
        <div ref={containerRef} className={`flex h-full ${className}`}>
            {/* Left Panel */}
            <div style={{ width: leftWidth }} className="flex-shrink-0 overflow-hidden">
                {leftPanel}
            </div>
            
            {/* Resizer */}
            <div
                className={`w-1 bg-gray-600 hover:bg-gray-500 cursor-col-resize transition-colors ${
                    isResizing ? 'bg-blue-500' : ''
                }`}
                onMouseDown={handleMouseDown}
            />
            
            {/* Right Panel */}
            <div className="flex-1 overflow-hidden">
                {rightPanel}
            </div>
        </div>
    );
};

export default ResizablePanel;
