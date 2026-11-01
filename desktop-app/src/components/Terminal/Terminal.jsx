import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Square, X, Copy, Trash2, Download, Settings } from 'lucide-react';

const Terminal = ({ 
    isOpen, 
    onClose, 
    output = [], 
    onCommand,
    isRunning = false,
    workingDirectory = '',
    className = ''
}) => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [autoScroll, setAutoScroll] = useState(true);
    
    const terminalRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (autoScroll && terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [output, autoScroll]);

    // Focus input when terminal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || isRunning) return;

        const command = input.trim();
        setHistory(prev => [...prev, command]);
        setHistoryIndex(-1);
        setInput('');

        if (onCommand) {
            onCommand(command);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length > 0) {
                const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
                setHistoryIndex(newIndex);
                setInput(history[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex >= 0) {
                const newIndex = historyIndex + 1;
                if (newIndex >= history.length) {
                    setHistoryIndex(-1);
                    setInput('');
                } else {
                    setHistoryIndex(newIndex);
                    setInput(history[newIndex]);
                }
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            // Simple tab completion for common commands
            const suggestions = [
                'npm install',
                'npm run',
                'npm start',
                'npm test',
                'npm build',
                'yarn install',
                'yarn start',
                'yarn test',
                'yarn build',
                'git status',
                'git add',
                'git commit',
                'git push',
                'git pull',
                'ls',
                'cd',
                'mkdir',
                'touch',
                'rm',
                'cp',
                'mv'
            ];
            
            const matches = suggestions.filter(cmd => cmd.startsWith(input.toLowerCase()));
            if (matches.length === 1) {
                setInput(matches[0]);
            }
        } else if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            if (isRunning && onCommand) {
                onCommand('__INTERRUPT__');
            }
        }
    };

    const clearTerminal = () => {
        if (onCommand) {
            onCommand('__CLEAR__');
        }
    };

    const copyOutput = () => {
        const text = output.map(line => `${line.timestamp} ${line.message}`).join('\n');
        navigator.clipboard.writeText(text);
    };

    const downloadOutput = () => {
        const text = output.map(line => `${line.timestamp} ${line.message}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'terminal-output.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    const getPrompt = () => {
        const path = workingDirectory || '~';
        return `user@kosher-ai:${path}$ `;
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'error':
                return 'text-red-400';
            case 'warning':
                return 'text-yellow-400';
            case 'success':
                return 'text-green-400';
            case 'info':
                return 'text-blue-400';
            case 'command':
                return 'text-purple-400';
            default:
                return 'text-gray-300';
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`bg-gray-900 border border-gray-700 rounded-lg flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center gap-2">
                    <TerminalIcon size={16} className="text-green-400" />
                    <span className="text-sm font-medium text-white">Terminal</span>
                    {workingDirectory && (
                        <span className="text-xs text-gray-400">({workingDirectory})</span>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={copyOutput}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Copy output"
                    >
                        <Copy size={14} />
                    </button>
                    
                    <button
                        onClick={downloadOutput}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Download output"
                    >
                        <Download size={14} />
                    </button>
                    
                    <button
                        onClick={clearTerminal}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Clear terminal"
                    >
                        <Trash2 size={14} />
                    </button>
                    
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`p-1 ${autoScroll ? 'text-green-400' : 'text-gray-400'} hover:text-white`}
                        title="Toggle auto-scroll"
                    >
                        <Settings size={14} />
                    </button>
                    
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Close terminal"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Terminal Output */}
            <div 
                ref={terminalRef}
                className="flex-1 p-3 overflow-y-auto font-mono text-sm"
                style={{ minHeight: '200px', maxHeight: '400px' }}
            >
                {output.map((line, index) => (
                    <div key={index} className="mb-1">
                        <span className="text-gray-500 text-xs mr-2">
                            {line.timestamp}
                        </span>
                        <span className={getTypeColor(line.type)}>
                            {line.type === 'command' && getPrompt()}
                            {line.message}
                        </span>
                    </div>
                ))}
                
                {output.length === 0 && (
                    <div className="text-gray-500 text-sm">
                        <div className="mb-2">Welcome to Kosher AI Terminal!</div>
                        <div className="mb-2">Type commands to interact with your project.</div>
                        <div className="mb-2">Common commands:</div>
                        <div className="ml-2 space-y-1">
                            <div>• npm install - Install dependencies</div>
                            <div>• npm start - Start development server</div>
                            <div>• npm run build - Build project</div>
                            <div>• git status - Check git status</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="border-t border-gray-700 p-3">
                <div className="flex items-center gap-2">
                    <span className="text-green-400 font-mono text-sm">
                        {getPrompt()}
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isRunning}
                        placeholder={isRunning ? 'Command running...' : 'Type a command...'}
                        className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder-gray-500 disabled:opacity-50"
                    />
                    {isRunning && (
                        <div className="flex items-center gap-1 text-yellow-400">
                            <Square size={12} />
                            <span className="text-xs">Running</span>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

export default Terminal;
