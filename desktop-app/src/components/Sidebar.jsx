import React from 'react';
import { Plus, Search, Settings, Trash2, FolderOpen, FileText, Bot } from 'lucide-react';

const Sidebar = ({ 
    sidebarOpen, 
    t, 
    isRTL, 
    handleNewChat, 
    searchQuery, 
    setSearchQuery, 
    filteredChats, 
    currentChatId, 
    handleSelectChat, 
    handleDeleteChat, 
    setIsSettingsOpen, 
    apiKey,
    onLogoClick,
    onShowFileExplorer,
    onShowAICodeEditor,
    onShowAICodeAssistant
}) => {
    return (
        <div className={`bg-gray-800 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
            <div className="p-4 flex-shrink-0">
                <button 
                    onClick={onLogoClick}
                    className="text-left w-full hover:bg-gray-700 rounded-md p-2 transition-colors"
                    title="Click to return home and start tour"
                >
                    <h1 className="text-xl font-semibold">{t.title}</h1>
                    <p className="text-sm text-gray-400">{t.subtitle}</p>
                </button>
            </div>
            
            <div className="p-2 flex-shrink-0">
                <button onClick={handleNewChat} className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-700">
                    <span>{t.newChat}</span>
                    <Plus size={18} />
                </button>
            </div>
            
            {/* AI File System Navigation */}
            <div className="p-2 flex-shrink-0 border-b border-gray-700">
                <p className="text-xs text-gray-500 px-2 mb-2">AI Code Tools</p>
                <div className="space-y-1">
                    {onShowFileExplorer && (
                        <button 
                            onClick={onShowFileExplorer}
                            className="w-full flex items-center p-2 rounded-md hover:bg-gray-700 text-sm"
                            title="Browse and manage files"
                        >
                            <FolderOpen size={16} className={`${isRTL ? 'ml-3' : 'mr-3'}`} />
                            <span>File Explorer</span>
                        </button>
                    )}
                    {onShowAICodeEditor && (
                        <button 
                            onClick={onShowAICodeEditor}
                            className="w-full flex items-center p-2 rounded-md hover:bg-gray-700 text-sm"
                            title="AI-powered code editor"
                        >
                            <FileText size={16} className={`${isRTL ? 'ml-3' : 'mr-3'}`} />
                            <span>Code Editor</span>
                        </button>
                    )}
                    {onShowAICodeAssistant && (
                        <button 
                            onClick={onShowAICodeAssistant}
                            className="w-full flex items-center p-2 rounded-md hover:bg-gray-700 text-sm"
                            title="AI coding assistant"
                        >
                            <Bot size={16} className={`${isRTL ? 'ml-3' : 'mr-3'}`} />
                            <span>AI Assistant</span>
                        </button>
                    )}
                </div>
            </div>
            
            <div className="p-2 flex-shrink-0">
                <div className="relative">
                    <Search size={16} className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400`} />
                    <input
                        type="text"
                        placeholder={t.searchChats}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                </div>
            </div>

            <div className="flex-grow p-2 overflow-y-auto">
                <p className="text-xs text-gray-500 px-2 mb-2">{t.recent}</p>
                <div className="space-y-1">
                    {filteredChats.map(([chatId, chat]) => (
                        <div key={chatId} className="group relative">
                            <button
                                onClick={() => handleSelectChat(chatId)}
                                className={`w-full text-left p-2 rounded-md hover:bg-gray-700 text-sm truncate ${
                                    currentChatId === chatId ? 'bg-gray-700' : ''
                                }`}
                                title={chat.title || t.untitledChat}
                            >
                                {chat.title || t.untitledChat}
                            </button>
                            <button
                                onClick={() => handleDeleteChat(chatId)}
                                className={`absolute ${isRTL ? 'left-2' : 'right-2'} top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded`}
                                title={t.deleteChat}
                            >
                                <Trash2 size={12} className="text-gray-400 hover:text-red-400" />
                            </button>
                        </div>
                    ))}
                    {filteredChats.length === 0 && searchQuery && (
                        <p className="text-xs text-gray-500 px-2 py-4">{t.noChatsFound}</p>
                    )}
                </div>
            </div>
            
            <div className="p-4 flex-shrink-0">
                <button 
                    onClick={() => setIsSettingsOpen(true)} 
                    className="w-full flex items-center p-2 rounded-md hover:bg-gray-700 relative"
                    data-tour="settings-button"
                >
                    <Settings size={18} className={`${isRTL ? 'ml-3' : 'mr-3'}`} />
                    <span>{t.settings}</span>
                    {!apiKey && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500" title={t.apiKeyMissing}></span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
