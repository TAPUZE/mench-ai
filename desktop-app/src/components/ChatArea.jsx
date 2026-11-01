import React, { useState } from 'react';
import { User, Bot, Brain, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { marked } from 'marked';
import { detectHebrewAndApplyRTL } from '../utils/helpers';
import ReportButton from './ReportButton';

const ChatArea = ({ 
    isCanvasMode: _isCanvasMode,
    currentChat, 
    isLoading, 
    isRTL, 
    userName, 
    t, 
    chatEndRef,
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

    const ThinkingIndicator = ({ content }) => (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <Brain size={16} className="text-purple-400" />
                <span className="text-sm font-medium text-purple-400">Thinking Process</span>
            </div>
            <div className="text-sm text-gray-300 whitespace-pre-line font-mono">
                {content}
            </div>
        </div>
    );

    const LoadingIndicator = () => (
        <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <div className="text-sm text-gray-300">
                {isThinking ? 'Processing your request...' : 'Generating response...'}
            </div>
        </div>
    );
    const renderContent = (content) => {
        const textInfo = detectHebrewAndApplyRTL(content);
        const htmlContent = marked(content);
        
        return (
            <div 
                dangerouslySetInnerHTML={{ __html: htmlContent }} 
                className={`prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-img:rounded-lg prose-img:max-w-md ${
                    textInfo.isRTL ? 'text-right' : 'text-left'
                }`}
                style={{ direction: textInfo.isRTL ? 'rtl' : 'ltr' }}
            />
        );
    };

    if (currentChat.length === 0) {
        return (
            <div className="text-center mt-20">
                <h2 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    {t.hello}, {userName}
                </h2>
                <p className="mt-4 text-gray-400 text-lg">{t.howCanIHelp}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8" data-tour="chat-area">
            {currentChat.map((msg, index) => (
                <div key={index} className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                        {msg.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-blue-400" />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <p className={`font-bold capitalize ${isRTL ? 'text-right' : 'text-left'}`}>
                                {msg.role === 'user' ? userName : 'Gemini'}
                            </p>
                            {msg.timestamp && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                        
                        {/* Thinking Process */}
                        {msg.thinking && showThinking && (
                            <div className="mb-4">
                                <button
                                    onClick={() => toggleThinking(index)}
                                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-2"
                                >
                                    <Brain size={14} />
                                    <span className="text-sm">Thinking Process</span>
                                    {expandedThinking[index] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {expandedThinking[index] && (
                                    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                                        <div className="text-sm text-gray-300 whitespace-pre-line font-mono">
                                            {msg.thinking}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Message Content */}
                        <div className="flex items-start gap-2">
                            <div className="flex-1">
                                {renderContent(msg.content)}
                            </div>
                            
                            {/* Report Button - Only for bot messages */}
                            {msg.role === 'model' && onReportResponse && (
                                <ReportButton 
                                    messageId={msg.id || msg.timestamp}
                                    messageContent={msg.content}
                                    onReport={onReportResponse}
                                    isReported={msg.isReported}
                                    size="sm"
                                    t={t}
                                />
                            )}
                        </div>
                    </div>
                </div>
            ))}
            
            {/* Loading State */}
            {isLoading && (
                <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot size={20} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <p className={`font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                            Gemini
                        </p>
                        
                        {/* Thinking Process in Real-time */}
                        {isThinking && showThinking && thinkingContent && (
                            <ThinkingIndicator content={thinkingContent} />
                        )}
                        
                        {/* Loading Indicator */}
                        <LoadingIndicator />
                    </div>
                </div>
            )}
            
            <div ref={chatEndRef} />
        </div>
    );
};

export default ChatArea;
