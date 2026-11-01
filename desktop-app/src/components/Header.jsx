import React from 'react';
import { Menu, User, Languages, Cpu, Brain, Flag, Code, Layout, BookOpen, FileText, FolderOpen, Bot } from 'lucide-react';
import { AVAILABLE_MODELS } from '../constants/models';

const Header = ({ 
    setSidebarOpen, 
    sidebarOpen, 
    language, 
    setLanguage, 
    selectedModel, 
    t, 
    showThinking, 
    setShowThinking,
    onShowReportManager,
    onShowEducationalGuide,
    useAdvancedCanvas,
    setUseAdvancedCanvas,
    isDeveloperMode,
    protectionLevel,
    onShowFileExplorer,
    onShowAICodeEditor,
    onShowAICodeAssistant
}) => {
    return (
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                className="p-2 rounded-full hover:bg-gray-700"
                data-tour="chat-sidebar-toggle"
            >
                <Menu size={20} />
            </button>
            
            <div className="flex items-center gap-4">
                {/* Developer Mode Indicator */}
                {isDeveloperMode && protectionLevel === 'developer' && (
                    <div className="px-3 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-purple-600 rounded-md flex items-center gap-2 animate-pulse">
                        🚀 DEVELOPER MODE - UNRESTRICTED
                    </div>
                )}
                
                <div className="px-3 py-2 text-xs font-medium bg-gray-700 rounded-md flex items-center gap-2">
                    <Cpu size={14} />
                    {AVAILABLE_MODELS[selectedModel]?.name || selectedModel}
                </div>
                
                {/* Canvas Mode Toggle */}
                <button
                    onClick={() => setUseAdvancedCanvas(!useAdvancedCanvas)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                        useAdvancedCanvas 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                    title={useAdvancedCanvas ? 'Switch to Basic Canvas' : 'Switch to Advanced IDE'}
                    data-tour="canvas-toggle"
                >
                    {useAdvancedCanvas ? <Code size={16} /> : <Layout size={16} />}
                    {useAdvancedCanvas ? 'IDE' : 'Canvas'}
                </button>
                
                <button
                    onClick={() => {
                        setShowThinking(!showThinking);
                        localStorage.setItem('kosher-ai-show-thinking', (!showThinking).toString());
                    }}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                        showThinking 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                    title={showThinking ? 'Hide thinking process' : 'Show thinking process'}
                >
                    <Brain size={16} />
                    {language === 'en' ? 'Thinking' : 'חשיבה'}
                </button>
                
                <button
                    onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
                    className="px-3 py-2 text-sm font-medium bg-gray-700 rounded-md hover:bg-gray-600 flex items-center gap-2"
                >
                    <Languages size={16} />
                    {language === 'en' ? 'עברית' : 'English'}
                </button>
                
                {onShowReportManager && (
                    <button
                        onClick={onShowReportManager}
                        className="px-3 py-2 text-sm font-medium bg-gray-700 rounded-md hover:bg-gray-600 flex items-center gap-2"
                        title={t.reportManager || 'Report Manager'}
                    >
                        <Flag size={16} />
                        {t.reportManager || 'Reports'}
                    </button>
                )}
                
                {onShowEducationalGuide && (
                    <button
                        onClick={onShowEducationalGuide}
                        className="px-3 py-2 text-sm font-medium bg-gray-700 rounded-md hover:bg-gray-600 flex items-center gap-2"
                        title={t.educationalGuide || 'Educational Guide'}
                    >
                        <BookOpen size={16} />
                        {language === 'en' ? 'Guide' : 'מדריך'}
                    </button>
                )}
                
                {/* AI File System Features */}
                {onShowFileExplorer && (
                    <button
                        onClick={onShowFileExplorer}
                        className="px-3 py-2 text-sm font-medium bg-gray-700 rounded-md hover:bg-gray-600 flex items-center gap-2"
                        title={language === 'en' ? 'File Explorer' : 'סייר קבצים'}
                    >
                        <FolderOpen size={16} />
                        {language === 'en' ? 'Files' : 'קבצים'}
                    </button>
                )}
                
                {onShowAICodeEditor && (
                    <button
                        onClick={onShowAICodeEditor}
                        className="px-3 py-2 text-sm font-medium bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2"
                        title={language === 'en' ? 'AI Code Editor' : 'עורך קוד AI'}
                    >
                        <FileText size={16} />
                        {language === 'en' ? 'Code Editor' : 'עורך קוד'}
                    </button>
                )}
                
                {onShowAICodeAssistant && (
                    <button
                        onClick={onShowAICodeAssistant}
                        className="px-3 py-2 text-sm font-medium bg-purple-600 rounded-md hover:bg-purple-700 flex items-center gap-2"
                        title={language === 'en' ? 'AI Code Assistant' : 'עוזר קוד AI'}
                    >
                        <Bot size={16} />
                        {language === 'en' ? 'AI Assistant' : 'עוזר AI'}
                    </button>
                )}
                
                <button className="px-4 py-2 text-sm font-medium bg-blue-600 rounded-md hover:bg-blue-700">
                    {t.inviteFriend}
                </button>
                
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <User size={24} />
                </div>
            </div>
        </header>
    );
};

export default Header;
