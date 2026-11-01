import React, { useState } from 'react';
import { Bot, User, MessageCircle, Minimize2, Maximize2, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { detectHebrewAndApplyRTL } from '../utils/helpers';
import { marked } from 'marked';
import ReportButton from './ReportButton';

const ChatSidebar = ({ 
    currentChat, 
    isLoading, 
    isRTL, 
    userName, 
    t, 
    chatEndRef, 
    isCollapsed, 
    setIsCollapsed,
    input,
    setInput,
    handleKeyPress,
    handleSend,
    textareaRef,
    isThinking,
    thinkingContent,
    showThinking,
    onReportResponse
}) => {
    const [expandedThinking, setExpandedThinking] = useState({});

    const toggleThinking = (index) => {
        setExpandedThinking(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };
    const renderContent = (content) => {
        const textInfo = detectHebrewAndApplyRTL(content);
        const htmlContent = marked(content);
        
        return (
            <div 
                dangerouslySetInnerHTML={{ __html: htmlContent }} 
                className={`prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-img:rounded-lg prose-img:max-w-full prose-pre:text-xs prose-code:text-xs ${
                    textInfo.isRTL ? 'text-right' : 'text-left'
                }`}
                style={{ direction: textInfo.isRTL ? 'rtl' : 'ltr' }}
            />
        );
    };

    return (
        <div className={`bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 ${
            isCollapsed ? 'w-12' : 'w-80'
        }`}>
            {/* Header */}
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <MessageCircle size={16} className="text-blue-400" />
                        <div>
                            <span className="text-sm font-medium text-gray-300">{t.chatView}</span>
                            <p className="text-xs text-gray-500">Discuss your canvas code</p>
                        </div>
                    </div>
                )}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400"
                >
                    {isCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
            </div>

            {!isCollapsed && (
                <>
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {currentChat.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm mt-8">
                                <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="mb-2">Generate code or get help</p>
                                <div className="text-xs space-y-1">
                                    <p>• Say "build me a website" to generate code</p>
                                    <p>• Ask questions about your canvas</p>
                                    <p>• Get explanations and tips</p>
                                    <p>• Debug issues together</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {currentChat.map((msg, index) => (
                                    <div key={index} className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                                            {msg.role === 'user' ? 
                                                <User size={12} /> : 
                                                <Bot size={12} className="text-blue-400" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {msg.role === 'user' ? userName : 'Gemini'}
                                            </p>
                                            
                                            {/* Thinking Process - Compact */}
                                            {msg.thinking && showThinking && (
                                                <div className="mb-2">
                                                    <button
                                                        onClick={() => toggleThinking(index)}
                                                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors mb-1"
                                                    >
                                                        <Brain size={10} />
                                                        <span className="text-xs">Thinking</span>
                                                        {expandedThinking[index] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                                    </button>
                                                    {expandedThinking[index] && (
                                                        <div className="bg-gray-700 rounded p-2 mb-2">
                                                            <div className="text-xs text-gray-300 whitespace-pre-line font-mono">
                                                                {msg.thinking}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-start gap-1">
                                                <div className="text-xs text-gray-300 break-words flex-1">
                                                    {renderContent(msg.content)}
                                                </div>
                                                
                                                {/* Report Button for bot messages */}
                                                {msg.role === 'model' && onReportResponse && (
                                                    <ReportButton 
                                                        messageId={msg.id || msg.timestamp}
                                                        messageContent={msg.content}
                                                        onReport={onReportResponse}
                                                        isReported={msg.isReported}
                                                        size="xs"
                                                        t={t}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                                            <Bot size={12} className="text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium mb-1">Gemini</p>
                                            
                                            {/* Thinking Process in Real-time - Compact */}
                                            {isThinking && showThinking && thinkingContent && (
                                                <div className="bg-gray-700 rounded p-2 mb-2">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <Brain size={10} className="text-purple-400" />
                                                        <span className="text-xs text-purple-400">Thinking...</span>
                                                    </div>
                                                    <div className="text-xs text-gray-300 whitespace-pre-line font-mono">
                                                        {thinkingContent}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Loading Indicator */}
                                            <div className="flex items-center gap-1">
                                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                <span className="text-xs text-gray-400 ml-1">
                                                    {isThinking ? 'Processing...' : 'Generating...'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </>
                        )}
                    </div>

                    {/* Compact Input */}
                    <div className="p-3 border-t border-gray-700">
                        <div className="bg-gray-700 rounded-lg p-2 flex items-center gap-2">
                            <textarea 
                                ref={textareaRef}
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                onKeyPress={handleKeyPress} 
                                placeholder="Ask questions or say 'build me...' to generate code"
                                className={`flex-1 bg-transparent focus:outline-none resize-none text-sm max-h-20 ${
                                    isRTL ? 'text-right' : 'text-left'
                                }`}
                                rows="1" 
                                dir={isRTL ? 'rtl' : 'ltr'}
                            />
                            <button 
                                onClick={() => handleSend()} 
                                className="bg-blue-600 p-1.5 rounded hover:bg-blue-700 disabled:bg-gray-600 text-white"
                                disabled={isLoading || !input.trim()}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="m22 2-7 20-4-9-9-4Z"/>
                                    <path d="M22 2 11 13"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChatSidebar;
