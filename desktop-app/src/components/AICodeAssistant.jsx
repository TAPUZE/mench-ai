import React, { useState, useEffect, useRef } from 'react';
import { fileSystem } from '../utils/fileSystemManager';


const AICodeAssistant = ({ 
    isOpen,
    onOpenChange: setIsOpen,
    apiKey, 
    selectedModel, 
    isDeveloperMode,
    currentFile,
    onCodeInsert,
    onCodeReplace,
    onError
}) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [assistantMode, setAssistantMode] = useState('general'); // general, debug, optimize, explain
    const [selectedCode] = useState('');
    const [codeContext, setCodeContext] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Quick action suggestions based on current context
    const quickActions = [
        { id: 'explain', label: 'Explain this code', icon: '🔍' },
        { id: 'optimize', label: 'Optimize this code', icon: '⚡' },
        { id: 'debug', label: 'Find bugs', icon: '🐛' },
        { id: 'test', label: 'Write tests', icon: '🧪' },
        { id: 'document', label: 'Add documentation', icon: '📝' },
        { id: 'refactor', label: 'Refactor code', icon: '🔧' },
        { id: 'security', label: 'Security check', icon: '🔒' },
        { id: 'performance', label: 'Performance tips', icon: '🚀' }
    ];

    // Initialize with welcome message
    useEffect(() => {
        setMessages(previous => previous.length ? previous : [{
                role: 'assistant',
                content: `👋 Hi! I'm your AI Code Assistant. I can help you with:

• **Code Generation**: Write new code from scratch
• **Code Explanation**: Understand complex code
• **Bug Fixing**: Find and fix errors
• **Code Optimization**: Improve performance
• **Testing**: Write unit tests
• **Documentation**: Add comments and docs
• **Refactoring**: Improve code structure

Just describe what you need, or select some code and use the quick actions!`,
                timestamp: new Date().toISOString()
            }]);
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Ignore a file read that finishes after the user changes files.
    useEffect(() => {
        let active=true;
        if(!currentFile){setCodeContext('');return;}
        fileSystem.readFile(currentFile.path).then(content=>{if(active)setCodeContext(content);}).catch(error=>console.error('Error loading file context:',error));
        return ()=>{active=false;};
    }, [currentFile]);

    // Send message to AI
    const sendMessage = async (message = inputMessage, mode = assistantMode) => {
        if (!message.trim() || !apiKey) return;

        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const aiPrompt = buildAIPrompt(message, mode);
            
            const payload = {
                contents: [{ role: 'user', parts: [{ text: aiPrompt }] }]
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
                
                const assistantMessage = {
                    role: 'assistant',
                    content: aiResponse,
                    timestamp: new Date().toISOString(),
                    mode: mode
                };

                setMessages(prev => [...prev, assistantMessage]);
                
                // Extract code suggestions
                const codeBlocks = extractCodeBlocks(aiResponse);
                if (codeBlocks.length > 0) {
                    setSuggestions(codeBlocks);
                    setShowSuggestions(true);
                }
            } else {
                throw new Error('Failed to get AI response');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = {
                role: 'assistant',
                content: `❌ Sorry, I encountered an error: ${error.message}`,
                timestamp: new Date().toISOString(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
            
            if (onError) {
                onError(error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Build AI prompt based on mode and context
    const buildAIPrompt = (message, mode) => {
        let prompt = '';
        
        // Add context
        if (currentFile && codeContext) {
            prompt += `Current file: ${currentFile.name}\n`;
            prompt += `File type: ${currentFile.type}\n`;
            prompt += `File content:\n\`\`\`\n${codeContext}\n\`\`\`\n\n`;
        }
        
        if (selectedCode) {
            prompt += `Selected code:\n\`\`\`\n${selectedCode}\n\`\`\`\n\n`;
        }

        // Add mode-specific instructions
        switch (mode) {
            case 'debug':
                prompt += `You are a debugging expert. Help find and fix bugs in the code. Focus on:\n- Syntax errors\n- Logic errors\n- Runtime errors\n- Edge cases\n- Best practices\n\n`;
                break;
            case 'optimize':
                prompt += `You are a performance optimization expert. Help improve code efficiency. Focus on:\n- Performance bottlenecks\n- Memory usage\n- Algorithm improvements\n- Code structure\n- Best practices\n\n`;
                break;
            case 'explain':
                prompt += `You are a code explanation expert. Help explain how code works. Focus on:\n- Step-by-step explanation\n- Purpose of each part\n- How it fits together\n- Key concepts\n- Examples\n\n`;
                break;
            default:
                prompt += `You are a helpful coding assistant. Provide clear, accurate, and practical help.\n\n`;
        }

        prompt += `User request: ${message}\n\n`;
        prompt += `Please provide a helpful response. If you provide code, make sure it's complete and working.`;

        return prompt;
    };

    // Extract code blocks from AI response
    const extractCodeBlocks = (text) => {
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
        const blocks = [];
        let match;
        
        while ((match = codeBlockRegex.exec(text)) !== null) {
            blocks.push({
                language: match[1] || 'text',
                code: match[2].trim(),
                id: blocks.length
            });
        }
        
        return blocks;
    };

    // Handle quick actions
    const handleQuickAction = (actionId) => {
        const actions = {
            explain: `Explain this code in detail: ${selectedCode || 'the current file'}`,
            optimize: `How can I optimize this code for better performance? ${selectedCode || 'Check the current file'}`,
            debug: `Help me find and fix bugs in this code: ${selectedCode || 'the current file'}`,
            test: `Write unit tests for this code: ${selectedCode || 'the current file'}`,
            document: `Add proper documentation and comments to this code: ${selectedCode || 'the current file'}`,
            refactor: `Refactor this code to make it cleaner and more maintainable: ${selectedCode || 'the current file'}`,
            security: `Review this code for security vulnerabilities: ${selectedCode || 'the current file'}`,
            performance: `Give me performance improvement suggestions for this code: ${selectedCode || 'the current file'}`
        };

        const message = actions[actionId];
        if (message) {
            sendMessage(message, actionId === 'explain' ? 'explain' : actionId === 'optimize' ? 'optimize' : 'debug');
        }
    };

    // Insert code at cursor position
    const insertCode = (code) => {
        if (onCodeInsert) {
            onCodeInsert(code);
        }
    };

    // Replace selected code
    const replaceCode = (newCode) => {
        if (onCodeReplace) {
            onCodeReplace(selectedCode, newCode);
        }
    };

    // Copy code to clipboard
    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        // Could add toast notification here
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 bg-purple-500 text-white p-3 rounded-full shadow-lg hover:bg-purple-600 z-40"
                title="Open AI Code Assistant"
            >
                🤖
            </button>
        );
    }

    return (
        <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border z-40 transition-all duration-300 ${
            isMinimized ? 'w-80 h-12' : 'w-96 h-96'
        }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-purple-50">
                <div className="flex items-center space-x-2">
                    <span className="text-xl">🤖</span>
                    <span className="font-medium text-gray-800">AI Assistant</span>
                    {isDeveloperMode && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            Dev
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        {isMinimized ? '⬆️' : '⬇️'}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Mode selector */}
                    <div className="p-2 border-b bg-gray-50">
                        <select
                            value={assistantMode}
                            onChange={(e) => setAssistantMode(e.target.value)}
                            className="w-full text-sm px-2 py-1 border rounded"
                        >
                            <option value="general">General Help</option>
                            <option value="debug">Debug Mode</option>
                            <option value="optimize">Optimize Mode</option>
                            <option value="explain">Explain Mode</option>
                        </select>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 h-64">
                        {messages.map((message, index) => (
                            <div key={index} className={`mb-3 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                                <div className={`inline-block max-w-xs p-2 rounded-lg text-sm ${
                                    message.role === 'user' 
                                        ? 'bg-blue-500 text-white' 
                                        : message.isError 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {message.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                                <span className="ml-2 text-sm text-gray-600">Thinking...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick actions */}
                    <div className="p-2 border-t bg-gray-50">
                        <div className="flex flex-wrap gap-1">
                            {quickActions.slice(0, 4).map(action => (
                                <button
                                    key={action.id}
                                    onClick={() => handleQuickAction(action.id)}
                                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                                    title={action.label}
                                >
                                    {action.icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-2 border-t">
                        <div className="flex space-x-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        sendMessage();
                                    }
                                }}
                                placeholder="Ask me anything about your code..."
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!inputMessage.trim() || isLoading}
                                className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Code suggestions overlay */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-96 overflow-y-auto">
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-800">Code Suggestions</h3>
                                <button
                                    onClick={() => setShowSuggestions(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            {suggestions.map((suggestion, index) => (
                                <div key={index} className="mb-4 p-3 border rounded">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-600">
                                            {suggestion.language}
                                        </span>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => copyCode(suggestion.code)}
                                                className="text-sm bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                                            >
                                                Copy
                                            </button>
                                            <button
                                                onClick={() => insertCode(suggestion.code)}
                                                className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                            >
                                                Insert
                                            </button>
                                            {selectedCode && (
                                                <button
                                                    onClick={() => replaceCode(suggestion.code)}
                                                    className="text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                                                >
                                                    Replace
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <pre className="bg-gray-50 p-2 rounded text-sm overflow-x-auto">
                                        <code>{suggestion.code}</code>
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AICodeAssistant;
