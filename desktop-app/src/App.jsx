import React, { useState, useEffect, useRef } from 'react';

// Import constants

import { translations } from './constants/translations';
import { AVAILABLE_MODELS, getDefaultModel } from './constants/models';
import { getDefaultProtectionLevel } from './constants/protectionLevels';

// Import utilities
import { 
    generateChatTitle, 
    extractCode, 
    fileToBase64, 
    filterHebrewGodNames 
} from './utils/helpers';
import { shouldBlockContent, getProtectionLevel } from './constants/protectionLevels';
import { classifyQuery, getEducationalInstructions, shouldUseHebrewRabbi } from './constants/englishRabbi';
import { classifyHebrewQuery, getHebrewRabbiInstructions } from './constants/hebrewRabbis';
import { selectWebsiteTemplate, generateWebsiteInstructions } from './constants/websiteTemplates';
import { isDeveloper, getDeveloperInfo, getDeveloperInstructions } from './constants/devAuth';

// Import components
import SettingsModal from './components/modals/SettingsModal';
import ImageGeneratorModal from './components/modals/ImageGeneratorModal';
import WelcomeModal from './components/modals/WelcomeModal';

import NewInteractiveTour from './components/modals/NewInteractiveTour';
import EducationalGuide from './components/modals/EducationalGuide';
import DeveloperAccessModal from './components/modals/DeveloperAccessModal';
import EnhancedCanvasView from './components/EnhancedCanvasView';
import AdvancedCanvasView from './components/Canvas/AdvancedCanvasView';
import ChatSidebar from './components/ChatSidebar';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import ResponseReporter from './components/ResponseReporter';
import ReportManager from './components/ReportManager';
import AICodeEditor from './components/AICodeEditor';
import FileExplorer from './components/FileExplorer';
import AICodeAssistant from './components/AICodeAssistant';

// Import hooks
import { useResponseReporting } from './hooks/useResponseReporting';

// Import file system manager
import { fileSystem } from './utils/fileSystemManager';

// Helper function to detect website building requests
const detectWebsiteRequest = (input) => {
    const inputLower = input.toLowerCase();
    
    // English website building keywords
    const englishKeywords = [
        'build', 'create', 'make', 'design', 'develop', 'generate'
    ];
    
    const websiteWords = [
        'website', 'site', 'web', 'page', 'landing', 'portfolio', 'business'
    ];
    
    // Hebrew website building keywords
    const hebrewKeywords = [
        'בנה', 'צור', 'עשה', 'פתח', 'עצב', 'תכנן'
    ];
    
    const hebrewWebsiteWords = [
        'אתר', 'דף', 'פורטל', 'פלטפורמה', 'עמוד'
    ];
    
    // Check for English patterns
    const hasEnglishAction = englishKeywords.some(keyword => inputLower.includes(keyword));
    const hasEnglishTarget = websiteWords.some(word => inputLower.includes(word));
    
    // Check for Hebrew patterns
    const hasHebrewAction = hebrewKeywords.some(keyword => inputLower.includes(keyword));
    const hasHebrewTarget = hebrewWebsiteWords.some(word => inputLower.includes(word));
    
    // Check for HTML/CSS/JS mentions
    const hasTechTerms = inputLower.includes('html') || inputLower.includes('css') || 
                        inputLower.includes('javascript') || inputLower.includes('react') ||
                        inputLower.includes('bootstrap') || inputLower.includes('responsive');
    
    return (hasEnglishAction && hasEnglishTarget) || 
           (hasHebrewAction && hasHebrewTarget) || 
           hasTechTerms;
};

// Helper function to detect code generation requests
const detectCodeGenerationRequest = (input) => {
    const inputLower = input.toLowerCase();
    
    // Code generation keywords
    const codeGenerationKeywords = [
        'build', 'create', 'make', 'generate', 'write', 'code', 'develop',
        'design', 'implement', 'program', 'script', 'construct'
    ];
    
    // Code-related targets
    const codeTargets = [
        'website', 'site', 'page', 'app', 'application', 'component',
        'function', 'script', 'program', 'code', 'html', 'css', 'javascript',
        'react', 'vue', 'angular', 'node', 'express', 'api', 'server',
        'database', 'form', 'button', 'menu', 'navigation', 'layout',
        'dashboard', 'admin', 'landing', 'portfolio', 'blog', 'ecommerce',
        'calculator', 'game', 'animation', 'chart', 'graph', 'widget'
    ];
    
    // Specific code generation phrases
    const codeGenerationPhrases = [
        'build me', 'create me', 'make me', 'write me', 'generate me',
        'code for', 'script for', 'program for', 'build a', 'create a',
        'make a', 'write a', 'develop a', 'design a', 'implement a',
        'show me the code', 'give me the code', 'write the code',
        'build this', 'create this', 'make this', 'code this'
    ];
    
    // Check for generation phrases
    const hasGenerationPhrase = codeGenerationPhrases.some(phrase => 
        inputLower.includes(phrase)
    );
    
    // Check for action + target combinations
    const hasActionAndTarget = codeGenerationKeywords.some(action => 
        inputLower.includes(action)
    ) && codeTargets.some(target => 
        inputLower.includes(target)
    );
    
    // Check for imperative code requests
    const imperativePatterns = [
        /^(build|create|make|write|generate|code|develop|design|implement)/,
        /(build|create|make|write|generate|code|develop|design|implement) (me |a |an |the )/,
        /I (want|need|would like) (you to )?(build|create|make|write|generate|code|develop|design)/
    ];
    
    const hasImperativePattern = imperativePatterns.some(pattern => 
        pattern.test(inputLower)
    );
    
    return hasGenerationPhrase || hasActionAndTarget || hasImperativePattern;
};

// Helper function to detect if text looks like code
const looksLikeCode = (text) => {
    const codeIndicators = [
        '<!DOCTYPE', '<html', '<head>', '<body>', '<div', '<script>',
        'function ', 'const ', 'let ', 'var ', '=>', 'class ',
        'import ', 'export ', 'return ', 'console.', 'document.',
        'window.', 'addEventListener', 'querySelector', 'getElementById',
        '{', '}', ';', 'margin:', 'padding:', 'color:', 'background:',
        'font-family:', 'display:', 'position:', 'width:', 'height:',
        'if (', 'for (', 'while (', 'switch (', 'try {', 'catch (',
        '#!/bin/', 'def ', 'class ', 'import ', 'from ', 'print(',
        'public ', 'private ', 'protected ', 'static ', 'void ',
        '#include', 'using namespace', 'int main()', 'printf(',
        'SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'CREATE TABLE'
    ];
    
    const textTrimmed = text.trim();
    const codeIndicatorCount = codeIndicators.filter(indicator => 
        textTrimmed.includes(indicator)
    ).length;
    
    // If it has multiple code indicators and looks structured, it's probably code
    return codeIndicatorCount >= 2 || 
           textTrimmed.startsWith('<!DOCTYPE') || 
           textTrimmed.startsWith('<html') ||
           (textTrimmed.includes('{') && textTrimmed.includes('}') && textTrimmed.includes(';'));
};

// --- Main App Component ---
export default function App() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentChat, setCurrentChat] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [chatHistory, setChatHistory] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [isCanvasMode, setIsCanvasMode] = useState(false);
    const [canvasContent, setCanvasContent] = useState('');
    const [canvasHistory, setCanvasHistory] = useState([]);
    const [currentCanvasIndex, setCurrentCanvasIndex] = useState(-1);
    const [canvasAppendMode, setCanvasAppendMode] = useState(false);
    const [isCanvasFullScreen, setIsCanvasFullScreen] = useState(false);
    const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isImageGeneratorOpen, setIsImageGeneratorOpen] = useState(false);
    const [isEducationalGuideOpen, setIsEducationalGuideOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [selectedModel, setSelectedModel] = useState(getDefaultModel());
    const [uploadedFile, setUploadedFile] = useState(null);
    const [language, setLanguage] = useState('en');
    const [showWelcome, setShowWelcome] = useState(false);
    const [showTour, setShowTour] = useState(false);
    const [tourStep, setTourStep] = useState(1);
    const [showThinking, setShowThinking] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingContent, setThinkingContent] = useState('');
    const [showReporter, setShowReporter] = useState(false);
    const [reportingMessageId, setReportingMessageId] = useState(null);
    const [reportingMessageContent, setReportingMessageContent] = useState('');
    const [showReportManager, setShowReportManager] = useState(false);
    const [useAdvancedCanvas, setUseAdvancedCanvas] = useState(true); // New state for canvas type
    const [protectionLevel, setProtectionLevel] = useState(getDefaultProtectionLevel().id);
    const [isDeveloperMode, setIsDeveloperMode] = useState(false);
    const [, setDeveloperInfo] = useState(null);
    const [showDeveloperAccess, setShowDeveloperAccess] = useState(false);
    
    // AI File System states
    const [showAICodeEditor, setShowAICodeEditor] = useState(false);
    const [showFileExplorer, setShowFileExplorer] = useState(false);
    const [currentFile, setCurrentFile] = useState(null);
    const [aiAssistantVisible] = useState(true);
    const [showAICodeAssistant, setShowAICodeAssistant] = useState(false);
    const [, setProjectFiles] = useState([]);
    const [, setFileSystemReady] = useState(false);
    
    const userName = 'User';

    // Response reporting hook
    const { reports, reportingSettings, submitReport, shouldWarnUser, exportReports, deleteReport, updateSettings } = useResponseReporting();

    const chatEndRef = useRef(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    const t = translations[language];
    const isRTL = language === 'he';

    // Logo click handler - go home and optionally start tour
    const handleLogoClick = () => {
        // Create new chat (go to home)
        handleNewChat();
        
        // Exit canvas mode if active
        if (isCanvasMode) {
            setIsCanvasMode(false);
        }
        
        // Check if tour should be shown
        const hasSeenWelcome = localStorage.getItem('mench-ai-seen-welcome');
        const skipTour = localStorage.getItem('mench-ai-skip-tour');
        
        if (!hasSeenWelcome && !skipTour) {
            // Start tour for new users
            setShowTour(true);
            setTourStep(1);
        }
    };

    // --- Check for developer mode when API key or protection level changes ---
    useEffect(() => {
        const checkDeveloperMode = () => {
            if (isDeveloper(apiKey)) {
                setIsDeveloperMode(true);
                setDeveloperInfo(getDeveloperInfo(apiKey));
                console.log('🚀 Developer mode enabled');
            } else {
                setIsDeveloperMode(false);
                setDeveloperInfo(null);
            }
        };
        
        checkDeveloperMode();
    }, [apiKey, protectionLevel]);

    // --- Developer keyboard shortcut (Ctrl+Shift+D) ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                setShowDeveloperAccess(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // --- Handle developer code submission ---
    const handleDeveloperCodeSubmit = (devCode) => {
        if (isDeveloper(apiKey, devCode)) {
            setProtectionLevel('developer');
            setIsDeveloperMode(true);
            setDeveloperInfo(getDeveloperInfo(apiKey));
            localStorage.setItem('mench-ai-protection-level', 'developer');
            console.log('🚀 Developer mode activated via code');
        }
    };

    // --- Load data from localStorage on initial render ---
    useEffect(() => {
        try {
            const savedChatHistory = localStorage.getItem('gemini-chat-history');
            if (savedChatHistory) {
                setChatHistory(JSON.parse(savedChatHistory));
            }
            
            const savedCurrentChatId = localStorage.getItem('gemini-current-chat-id');
            if (savedCurrentChatId && savedChatHistory) {
                const parsedHistory = JSON.parse(savedChatHistory);
                if (parsedHistory[savedCurrentChatId]) {
                    setCurrentChatId(savedCurrentChatId);
                    setCurrentChat(parsedHistory[savedCurrentChatId].messages || []);
                }
            }
            
            const savedApiKey = localStorage.getItem('gemini-api-key');
            if (savedApiKey) {
                setApiKey(savedApiKey);
            }

            const savedLanguage = localStorage.getItem('mench-ai-language');
            if (savedLanguage) {
                setLanguage(savedLanguage);
            }

            const savedModel = localStorage.getItem('mench-ai-selected-model');
            if (savedModel && AVAILABLE_MODELS[savedModel]) {
                setSelectedModel(savedModel);
            }

            const savedShowThinking = localStorage.getItem('mench-ai-show-thinking');
            if (savedShowThinking === 'true') {
                setShowThinking(true);
            }

            const savedProtectionLevel = localStorage.getItem('mench-ai-protection-level');
            if (savedProtectionLevel) {
                setProtectionLevel(savedProtectionLevel);
            }

            const hasSeenWelcome = localStorage.getItem('mench-ai-seen-welcome');
            if (!hasSeenWelcome) {
                setShowWelcome(true);
            }

            const savedCanvasHistory = localStorage.getItem('mench-ai-canvas-history');
            if (savedCanvasHistory) {
                const parsedHistory = JSON.parse(savedCanvasHistory);
                setCanvasHistory(parsedHistory);
            }
            
            const savedCurrentIndex = localStorage.getItem('mench-ai-current-canvas-index');
            if (savedCurrentIndex && savedCanvasHistory) {
                const index = parseInt(savedCurrentIndex);
                const parsedHistory = JSON.parse(savedCanvasHistory);
                if (index >= 0 && index < parsedHistory.length) {
                    setCurrentCanvasIndex(index);
                    setCanvasContent(parsedHistory[index].content);
                }
            }

            const savedAppendMode = localStorage.getItem('mench-ai-canvas-append-mode');
            if (savedAppendMode === 'true') {
                setCanvasAppendMode(true);
            }
        } catch (error) {
            console.error("Failed to load data from local storage:", error);
        }
    }, []);

    // --- Save chat history to localStorage whenever it changes ---
    useEffect(() => {
        if (Object.keys(chatHistory).length > 0) {
            try {
                localStorage.setItem('gemini-chat-history', JSON.stringify(chatHistory));
            } catch (error) {
                console.error("Failed to save chat history to local storage:", error);
            }
        }
    }, [chatHistory]);

    // --- Save current chat to history when it changes ---
    useEffect(() => {
        if (currentChatId && currentChat.length > 0) {
            try {
                setChatHistory(prev => ({
                    ...prev,
                    [currentChatId]: {
                        ...prev[currentChatId],
                        messages: currentChat,
                        lastUpdated: new Date().toISOString()
                    }
                }));
                localStorage.setItem('gemini-current-chat-id', currentChatId);
            } catch (error) {
                console.error("Failed to save current chat:", error);
            }
        }
    }, [currentChat, currentChatId]);

    // --- Auto-resize textarea ---
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    // --- Scroll to bottom of chat ---
    useEffect(() => {
        if (!isCanvasMode) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [currentChat, isCanvasMode]);

    const handleCanvasToggle = () => { 
        const newMode = !isCanvasMode; 
        if (newMode) {
            // When entering canvas mode, create new canvas if none exists
            if (currentCanvasIndex < 0) {
                console.log('Entering canvas mode - creating new canvas for direct coding');
                const starterContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Project</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f0f0f0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Canvas</h1>
        <p>Start coding here! This is your workspace for creating amazing projects.</p>
        <p>Use the chat sidebar to ask questions about your code.</p>
    </div>
</body>
</html>`;
                createNewCanvas(starterContent);
            } else {
                console.log('Entering canvas mode - using existing canvas');
            }
        } else {
            console.log('Exiting canvas mode');
        }
        setIsCanvasMode(newMode); 
    };
    
    const handleNewChat = () => { 
        const newChatId = Date.now().toString();
        setCurrentChatId(newChatId);
        setCurrentChat([]); 
        setIsCanvasMode(false); 
        // Reset canvas but keep history
        setCanvasContent('');
        setCurrentCanvasIndex(-1);
        setUploadedFile(null); 
        localStorage.setItem('gemini-current-chat-id', newChatId);
    };

    const handleSelectChat = (chatId) => {
        if (chatHistory[chatId]) {
            setCurrentChatId(chatId);
            setCurrentChat(chatHistory[chatId].messages || []);
            setIsCanvasMode(false);
            // Reset canvas but keep history
            setCanvasContent('');
            setCurrentCanvasIndex(-1);
            setUploadedFile(null);
            localStorage.setItem('gemini-current-chat-id', chatId);
        }
    };

    const handleDeleteChat = (chatId) => {
        setChatHistory(prev => {
            const newHistory = { ...prev };
            delete newHistory[chatId];
            return newHistory;
        });
        
        if (currentChatId === chatId) {
            handleNewChat();
        }
    };

    const filteredChats = Object.entries(chatHistory).filter(([_chatId, chat]) => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        const titleMatch = chat.title?.toLowerCase().includes(searchLower);
        const messageMatch = chat.messages?.some(msg => 
            msg.content?.toLowerCase().includes(searchLower)
        );
        return titleMatch || messageMatch;
    }).sort(([,a], [,b]) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadedFile(file);
        }
    };

    const handleSend = async (mode = 'normal') => {
        if (!input.trim() && !uploadedFile) return;
        if (!apiKey) { setIsSettingsOpen(true); return; }

        // Check if content should be blocked based on protection level
        const currentProtectionLevel = getProtectionLevel(protectionLevel);
        const blockCheck = shouldBlockContent(input, currentProtectionLevel);
        
        if (blockCheck.blocked) {
            // Add blocked message to chat
            const blockedMessage = {
                role: 'model',
                content: `${blockCheck.reason}\n\n${blockCheck.alternative}`,
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                blocked: true
            };
            
            const userMessage = { 
                role: 'user', 
                content: input, 
                file: uploadedFile ? uploadedFile.name : null,
                id: (Date.now() - 1).toString(),
                timestamp: new Date().toISOString()
            };
            
            setCurrentChat(prev => [...prev, userMessage, blockedMessage]);
            setInput('');
            setUploadedFile(null);
            return;
        }

        let currentInput = input;
        let modelToUse = selectedModel;

        if (mode === 'deep_research') {
            currentInput = `Provide a comprehensive, in-depth research report on the following topic: ${input}`;
            // Use Pro model for deep research if available
            modelToUse = 'gemini-2.5-pro';
        }

        // Create new chat if none exists
        if (!currentChatId) {
            const newChatId = Date.now().toString();
            setCurrentChatId(newChatId);
            localStorage.setItem('gemini-current-chat-id', newChatId);
        }

        const newUserMessage = { 
            role: 'user', 
            content: currentInput, 
            file: uploadedFile ? uploadedFile.name : null,
            id: Date.now().toString(),
            timestamp: new Date().toISOString()
        };
        const updatedChat = [...currentChat, newUserMessage];
        setCurrentChat(updatedChat);

        // Generate title for new chat (only for first message)
        if (updatedChat.length === 1 && apiKey) {
            generateChatTitle(currentInput, apiKey).then(title => {
                setChatHistory(prev => ({
                    ...prev,
                    [currentChatId || Date.now().toString()]: {
                        ...prev[currentChatId || Date.now().toString()],
                        title: title,
                        messages: updatedChat,
                        createdAt: new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                    }
                }));
            });
        }

        setInput('');
        setIsLoading(true);
        setIsThinking(true);
        setThinkingContent('');

        // Simulate thinking process if enabled
        if (showThinking) {
            const thinkingSteps = [
                'Analyzing your question...',
                'Considering religious context and appropriate response...',
                'Gathering relevant information...',
                'Formulating a comprehensive answer...',
                'Reviewing response for accuracy and appropriateness...'
            ];
            
            for (let i = 0; i < thinkingSteps.length; i++) {
                setTimeout(() => {
                    setThinkingContent(prev => prev + (prev ? '\n' : '') + `• ${thinkingSteps[i]}`);
                }, i * 800);
            }
        }

        try {
            const apiHistory = updatedChat.map(msg => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
            
            if (uploadedFile) {
                const base64Data = await fileToBase64(uploadedFile);
                const lastUserMessage = apiHistory[apiHistory.length - 1];
                lastUserMessage.parts.push({
                    inline_data: {
                        mime_type: uploadedFile.type,
                        data: base64Data
                    }
                });
                setUploadedFile(null);
            }

            // Determine appropriate persona system based on language and content
            const useHebrewRabbi = shouldUseHebrewRabbi(language, currentInput);
            let systemInstructions;
            
            // Check if this is a website building request
            const isWebsiteRequest = detectWebsiteRequest(currentInput);
            
            // DEVELOPER MODE: Use unrestricted instructions
            if (protectionLevel === 'developer' && isDeveloperMode) {
                systemInstructions = getDeveloperInstructions();
                console.log('🚀 Using developer mode instructions - UNRESTRICTED');
            } else if (useHebrewRabbi) {
                // Use Hebrew Rabbi persona system
                const queryClassification = classifyHebrewQuery(currentInput);
                systemInstructions = getHebrewRabbiInstructions(currentProtectionLevel, queryClassification);
                
                // Add website building instructions if needed
                if (isWebsiteRequest) {
                    const template = selectWebsiteTemplate(currentInput, 'he');
                    const websiteInstructions = generateWebsiteInstructions(currentInput, template);
                    systemInstructions += `\n\n${websiteInstructions}`;
                }
            } else {
                // Use English Rabbi persona system
                const queryClassification = classifyQuery(currentInput);
                systemInstructions = getEducationalInstructions(currentProtectionLevel, queryClassification);
                
                // Add website building instructions if needed
                if (isWebsiteRequest) {
                    const template = selectWebsiteTemplate(currentInput, 'en');
                    const websiteInstructions = generateWebsiteInstructions(currentInput, template);
                    systemInstructions += `\n\n${websiteInstructions}`;
                }
            }

            // Add canvas-specific instructions if in canvas mode
            if (isCanvasMode) {
                // Check if user is requesting code generation
                const isCodeRequest = detectCodeGenerationRequest(currentInput);
                
                if (isCodeRequest) {
                    systemInstructions += `\n\nCANVAS CODE GENERATION MODE:
- The user is requesting code to be written directly to their canvas
- Provide COMPLETE, working code that will be automatically placed in their canvas
- Write production-ready code with proper structure, styling, and functionality
- Include all necessary HTML, CSS, and JavaScript in a single file when possible
- Make the code professional, well-commented, and immediately usable
- Focus on creating exactly what the user requested
- The code will replace the current canvas content, so make it complete and self-contained`;
                } else {
                    systemInstructions += `\n\nCANVAS DISCUSSION MODE:
- You are helping the user discuss and improve code in their canvas
- Provide guidance, explanations, suggestions, and small code snippets
- Focus on helping the user understand concepts and fix issues
- Keep responses conversational and educational
- Reference their canvas content when providing advice`;
                }
            }

            const payload = {
                contents: apiHistory,
                system_instruction: { parts: [{ text: systemInstructions }] }
            };
            
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            const result = await response.json();
            if (!response.ok) {
                 const errorDetail = result.error?.message || `API call failed with status: ${response.status}`;
                 throw new Error(errorDetail);
            }
            
            let modelResponseText = "Sorry, I couldn't get a response. Please try again.";
            if (result.promptFeedback?.blockReason) { 
                modelResponseText = "This prompt was blocked by the safety filter. Please try a different topic."; 
            } else if (result.candidates?.[0]?.content?.parts?.[0]) { 
                modelResponseText = result.candidates[0].content.parts[0].text; 
            }
            
            // Post-process the model's response to filter Hebrew names of God
            modelResponseText = filterHebrewGodNames(modelResponseText);
            
            // Check for potential issues based on previous reports
            checkResponseForWarning(modelResponseText);
            
            const modelMessage = { 
                role: 'model', 
                content: modelResponseText,
                thinking: showThinking ? thinkingContent : null,
                id: Date.now().toString() + '_model',
                timestamp: new Date().toISOString()
            };
            setCurrentChat(prevChat => [...prevChat, modelMessage]);

            // Handle canvas updates in canvas mode
            if (isCanvasMode) {
                const isCodeRequest = detectCodeGenerationRequest(currentInput);
                
                if (isCodeRequest) {
                    // User requested code generation - extract and write to canvas
                    const codeToCanvas = extractCode(modelResponseText);
                    if (codeToCanvas.trim()) {
                        updateCanvasFromChat(codeToCanvas, true); // Force update for code requests
                    } else {
                        // If no code blocks found, treat entire response as code if it looks like code
                        if (looksLikeCode(modelResponseText)) {
                            updateCanvasFromChat(modelResponseText, true);
                        }
                    }
                } else if (currentCanvasIndex < 0) {
                    // No canvas exists and no specific code request - create empty canvas
                    const codeToCanvas = extractCode(modelResponseText);
                    if (codeToCanvas.trim()) {
                        updateCanvasFromChat(codeToCanvas);
                    }
                }
            }

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            const errorMessage = { 
                role: 'model', 
                content: `Sorry, an error occurred. **Details:** ${error.message}`,
                thinking: showThinking ? thinkingContent + '\n• Error occurred during processing' : null,
                timestamp: new Date().toISOString()
            };
            setCurrentChat(prevChat => [...prevChat, errorMessage]);
        } finally {
            setIsLoading(false);
            setIsThinking(false);
            setThinkingContent('');
        }
    };
    
    const handleGenerateImage = async (prompt) => {
        if (!prompt.trim() || !apiKey) {
            if (!apiKey) setIsSettingsOpen(true);
            return;
        }
        
        // Check if image generation is blocked at current protection level
        const currentProtectionLevel = getProtectionLevel(protectionLevel);
        if (currentProtectionLevel.settings.blockImages) {
            const blockedMessage = {
                role: 'model',
                content: 'Image generation is blocked at your current protection level. You can change this in Settings > Protection Level.',
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                blocked: true
            };
            setCurrentChat(prev => [...prev, blockedMessage]);
            setIsImageGeneratorOpen(false);
            return;
        }
        
        setIsImageLoading(true);
        try {
            const safePrompt = `A safe, appropriate image for a religious adult audience, with no explicit content, violence, or profanity, depicting: ${prompt}`;
            const payload = { instances: [{ prompt: safePrompt }], parameters: { "sampleCount": 1 } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            
            const result = await response.json();
            if (!response.ok) {
                 const errorDetail = result.error?.message || `Image generation failed with status: ${response.status}`;
                 throw new Error(errorDetail);
            }
            
            if (result.predictions?.[0]?.bytesBase64Encoded) {
                const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
                const imageMessage = { role: 'model', content: `Here is the image you requested for "${prompt}":\n\n![Generated Image](${imageUrl})` };
                setCurrentChat(prev => [...prev, imageMessage]);
                setIsImageGeneratorOpen(false);
            } else {
                if (result.error) { throw new Error(result.error.message); }
                throw new Error("No image data received from API. The response format might be unexpected.");
            }
        } catch (error) {
            console.error("Error generating image:", error);
            const errorMessage = { role: 'model', content: `Sorry, I couldn't generate the image. **Details:** ${error.message}` };
            setCurrentChat(prev => [...prev, errorMessage]);
        } finally {
            setIsImageLoading(false);
        }
    };

    const handleKeyPress = (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            handleSend(); 
        } 
    };

    // Tour functions
    const handleStartTour = () => {
        setShowWelcome(false);
        setShowTour(true);
        setTourStep(1);
    };

    const handleSkipTour = () => {
        setShowWelcome(false);
        setShowTour(false);
        localStorage.setItem('mench-ai-seen-welcome', 'true');
    };

    const handleDontShowAgain = () => {
        setShowWelcome(false);
        setShowTour(false);
        localStorage.setItem('mench-ai-seen-welcome', 'true');
        localStorage.setItem('mench-ai-skip-tour', 'true');
    };







    // --- Canvas Management Functions ---
    const createNewCanvas = (initialContent = '') => {
        const newCanvas = {
            id: Date.now().toString(),
            title: `Canvas ${canvasHistory.length + 1}`,
            content: initialContent,
            timestamp: Date.now(),
            createdAt: new Date().toISOString()
        };
        
        setCanvasHistory(prev => [...prev, newCanvas]);
        setCurrentCanvasIndex(canvasHistory.length);
        setCanvasContent(initialContent);
        
        // Save to localStorage
        const updatedHistory = [...canvasHistory, newCanvas];
        localStorage.setItem('mench-ai-canvas-history', JSON.stringify(updatedHistory));
        
        return newCanvas;
    };

    const loadCanvas = (index) => {
        if (index >= 0 && index < canvasHistory.length) {
            setCurrentCanvasIndex(index);
            setCanvasContent(canvasHistory[index].content);
            localStorage.setItem('mench-ai-current-canvas-index', index.toString());
        }
    };

    const deleteCanvas = (index) => {
        if (index >= 0 && index < canvasHistory.length) {
            const newHistory = canvasHistory.filter((_, i) => i !== index);
            setCanvasHistory(newHistory);
            
            // Adjust current index
            if (currentCanvasIndex === index) {
                setCurrentCanvasIndex(-1);
                setCanvasContent('');
            } else if (currentCanvasIndex > index) {
                setCurrentCanvasIndex(currentCanvasIndex - 1);
            }
            
            // Save to localStorage
            localStorage.setItem('mench-ai-canvas-history', JSON.stringify(newHistory));
        }
    };

    const updateCanvasFromChat = (codeContent, forceUpdate = false) => {
        // Only update canvas if user explicitly requests it or if no canvas exists
        if (!codeContent || !codeContent.trim()) {
            console.log('Skipping canvas update - no code content');
            return;
        }

        // Force update when user explicitly requests code generation
        if (forceUpdate || currentCanvasIndex < 0) {
            const fileExtension = detectFileType(codeContent);
            const fileName = generateFileName(fileExtension);
            
            if (forceUpdate && currentCanvasIndex >= 0) {
                // Replace current canvas content
                setCanvasContent(codeContent);
                
                // Update canvas history
                const updatedHistory = [...canvasHistory];
                updatedHistory[currentCanvasIndex] = {
                    ...updatedHistory[currentCanvasIndex],
                    content: codeContent,
                    timestamp: Date.now(),
                    fileName: fileName
                };
                setCanvasHistory(updatedHistory);
                localStorage.setItem('mench-ai-canvas-history', JSON.stringify(updatedHistory));
                console.log('Canvas content replaced with generated code');
            } else if (currentCanvasIndex < 0) {
                // Create new canvas

createNewCanvasWithFile(codeContent, fileName);
                console.log('Created new canvas with generated code');
            }
        } else {
            console.log('Canvas mode active - code should be written directly in canvas or requested explicitly');
        }
    };

    // Debug logging for canvas management (reduced)
    useEffect(() => {
        // Debug logging removed for cleaner console output
        // Canvas management is working correctly
    }, [canvasHistory.length, currentCanvasIndex, canvasAppendMode, isCanvasMode]);

    // --- Response Reporting Functions ---
    const handleReportResponse = (messageId, messageContent) => {
        setReportingMessageId(messageId);
        setReportingMessageContent(messageContent);
        setShowReporter(true);
    };

    const handleSubmitReport = async (report) => {
        try {
            await submitReport(report);
            
            // Add report flag to the message in chat history
            const updatedChat = currentChat.map(msg => {
                if (msg.id === report.messageId || msg.timestamp === report.messageId) {
                    return { ...msg, isReported: true };
                }
                return msg;
            });
            setCurrentChat(updatedChat);
            
            // Update chat history
            if (currentChatId && chatHistory[currentChatId]) {
                setChatHistory(prev => ({
                    ...prev,
                    [currentChatId]: {
                        ...prev[currentChatId],
                        messages: updatedChat
                    }
                }));
            }
            
            console.log('Report submitted successfully');
        } catch (error) {
            console.error('Error submitting report:', error);
        }
    };

    const handleCloseReporter = () => {
        setShowReporter(false);
        setReportingMessageId(null);
        setReportingMessageContent('');
    };

    // Check if response should trigger warning
    const checkResponseForWarning = (responseContent) => {
        if (shouldWarnUser(responseContent)) {
            console.log('Response flagged for potential issues based on previous reports');
            // Could show a warning or modify the response
        }
    };

    // --- Helper Functions for Auto File Creation ---
    const detectFileType = (code) => {
        const trimmedCode = code.trim().toLowerCase();
        
        // HTML detection
        if (trimmedCode.includes('<!doctype html') || 
            trimmedCode.includes('<html') || 
            trimmedCode.includes('<head>') || 
            trimmedCode.includes('<body>')) {
            return 'html';
        }
        
        // CSS detection
        if (trimmedCode.includes('{') && trimmedCode.includes('}') && 
            (trimmedCode.includes('color:') || trimmedCode.includes('background:') || 
             trimmedCode.includes('margin:') || trimmedCode.includes('padding:'))) {
            return 'css';
        }
        
        // JavaScript detection
        if (trimmedCode.includes('function') || trimmedCode.includes('=>') || 
            trimmedCode.includes('const ') || trimmedCode.includes('let ') || 
            trimmedCode.includes('var ') || trimmedCode.includes('console.log') ||
            trimmedCode.includes('document.') || trimmedCode.includes('window.')) {
            return 'js';
        }
        
        // Python detection
        if (trimmedCode.includes('def ') || trimmedCode.includes('import ') || 
            trimmedCode.includes('print(') || trimmedCode.includes('if __name__')) {
            return 'py';
        }
        
        // Default to HTML for mixed content
        return 'html';
    };

    const generateFileName = (extension) => {
        const timestamp = Date.now();
        const names = {
            'html': 'index',
            'css': 'style', 
            'js': 'script',
            'py': 'main'
        };
        return `${names[extension] || 'file'}-${timestamp}.${extension}`;
    };

    const createNewCanvasWithFile = (codeContent, fileName) => {
        const newCanvas = {
            id: Date.now().toString(),
            title: fileName,
            content: codeContent,
            fileName: fileName,
            timestamp: Date.now(),
            createdAt: new Date().toISOString(),
            autoGenerated: true
        };
        
        setCanvasHistory(prev => [...prev, newCanvas]);
        setCurrentCanvasIndex(canvasHistory.length);
        setCanvasContent(codeContent);
        
        // Save to localStorage
        const updatedHistory = [...canvasHistory, newCanvas];
        localStorage.setItem('mench-ai-canvas-history', JSON.stringify(updatedHistory));
        
        return newCanvas;
    };

    // --- Initialize file system ---
    useEffect(() => {
        const initFileSystem = async () => {
            try {
                await fileSystem.initialize();
                const stats = fileSystem.getFileStats();
                console.log('📁 File system initialized:', stats);
                setFileSystemReady(true);
                
                // Load existing project files
                const files = await fileSystem.listFiles();
                setProjectFiles(files);
            } catch (error) {
                console.error('❌ Error initializing file system:', error);
            }
        };
        
        initFileSystem();
    }, []);

    // --- File system handlers ---
    const handleFileSelect = async (file) => {
        try {
            setCurrentFile(file);
            console.log('📄 Selected file:', file.name);
        } catch (error) {
            console.error('❌ Error selecting file:', error);
        }
    };

    const handleFileCreate = async (fileName) => {
        try {
            const files = await fileSystem.listFiles();
            setProjectFiles(files);
            console.log('✅ File created:', fileName);
        } catch (error) {
            console.error('❌ Error creating file:', error);
        }
    };

    const handleFileDelete = async (filePath) => {
        try {
            const files = await fileSystem.listFiles();
            setProjectFiles(files);
            
            // Clear current file if it was deleted
            if (currentFile && currentFile.path === filePath) {
                setCurrentFile(null);
            }
            
            console.log('🗑️ File deleted:', filePath);
        } catch (error) {
            console.error('❌ Error deleting file:', error);
        }
    };

    // --- AI Code Assistant handlers ---
    const handleCodeInsert = (code) => {
        if (isCanvasMode && code) {
            // Insert code into canvas
            setCanvasContent(prev => prev + '\n' + code);
            console.log('📝 Code inserted into canvas');
        }
    };

    const handleCodeReplace = (oldCode, newCode) => {
        if (isCanvasMode && oldCode && newCode) {
            // Replace code in canvas
            setCanvasContent(prev => prev.replace(oldCode, newCode));
            console.log('🔄 Code replaced in canvas');
        }
    };

    const handleAICodeGenerated = (generatedCode) => {
        if (generatedCode) {
            // Handle AI-generated code
            if (isCanvasMode) {
                updateCanvasFromChat(generatedCode, true);
            }
            console.log('🤖 AI code generated');
        }
    };

    // --- Enhanced code generation detection for file system integration ---


    return (
        <div className={`flex h-screen bg-gray-900 text-gray-200 font-sans ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                apiKey={apiKey} 
                setApiKey={setApiKey}
                language={language}
                setLanguage={setLanguage}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                protectionLevel={protectionLevel}
                setProtectionLevel={setProtectionLevel}
                translations={translations}
            />
            
            <ImageGeneratorModal 
                isOpen={isImageGeneratorOpen} 
                onClose={() => setIsImageGeneratorOpen(false)} 
                generateImage={handleGenerateImage} 
                isLoading={isImageLoading} 
            />

            <WelcomeModal
                isOpen={showWelcome}
                onClose={() => setShowWelcome(false)}
                onStartTour={handleStartTour}
                onSkip={handleSkipTour}
                onDontShow={handleDontShowAgain}
                translations={translations}
                language={language}
            />

            <NewInteractiveTour
                isOpen={showTour}
                onClose={() => setShowTour(false)}
                onSkip={handleSkipTour}
                onDontShow={handleDontShowAgain}
                currentStep={tourStep}
                setCurrentStep={setTourStep}
                translations={translations}
                language={language}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onCloseSettings={() => setIsSettingsOpen(false)}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                onToggleCanvas={() => setIsCanvasMode(!isCanvasMode)}
                sidebarOpen={sidebarOpen}
                isSettingsOpen={isSettingsOpen}
            />

            <EducationalGuide
                isOpen={isEducationalGuideOpen}
                onClose={() => setIsEducationalGuideOpen(false)}
                language={language}
                translations={translations}
            />

            <DeveloperAccessModal
                isOpen={showDeveloperAccess}
                onClose={() => setShowDeveloperAccess(false)}
                onDeveloperCodeSubmit={handleDeveloperCodeSubmit}
            />

            <ResponseReporter
                isOpen={showReporter}
                onClose={handleCloseReporter}
                onSubmit={handleSubmitReport}
                messageId={reportingMessageId}
                messageContent={reportingMessageContent}
                t={t}
            />

            {showReportManager && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-200">
                                {t.reportManager || 'Report Manager'}
                            </h2>
                            <button
                                onClick={() => setShowReportManager(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                ×
                            </button>
                        </div>
                        <ReportManager
                            reports={reports}
                            onDeleteReport={deleteReport}
                            onExportReports={exportReports}
                            onUpdateSettings={updateSettings}
                            reportingSettings={reportingSettings}
                            t={t}
                        />
                    </div>
                </div>
            )}

            {/* AI Code Editor */}
            <AICodeEditor
                isOpen={showAICodeEditor}
                onClose={() => setShowAICodeEditor(false)}
                apiKey={apiKey}
                selectedModel={selectedModel}
                isDeveloperMode={isDeveloperMode}
                onCodeGenerated={handleAICodeGenerated}
            />

            {/* File Explorer */}
            <FileExplorer
                isOpen={showFileExplorer}
                onClose={() => setShowFileExplorer(false)}
                onFileSelect={handleFileSelect}
                onFileCreate={handleFileCreate}
                onFileDelete={handleFileDelete}
                currentFile={currentFile}
            />

            {/* AI Code Assistant */}
            {aiAssistantVisible && (
                <AICodeAssistant
                    isOpen={showAICodeAssistant}
                    onOpenChange={setShowAICodeAssistant}
                    apiKey={apiKey}
                    selectedModel={selectedModel}
                    isDeveloperMode={isDeveloperMode}
                    currentFile={currentFile}
                    onCodeInsert={handleCodeInsert}
                    onCodeReplace={handleCodeReplace}
                    onError={(error) => console.error('AI Assistant Error:', error)}
                />
            )}
            
            <Sidebar
                sidebarOpen={sidebarOpen}
                t={t}
                isRTL={isRTL}
                handleNewChat={handleNewChat}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredChats={filteredChats}
                currentChatId={currentChatId}
                handleSelectChat={handleSelectChat}
                handleDeleteChat={handleDeleteChat}
                setIsSettingsOpen={setIsSettingsOpen}
                apiKey={apiKey}
                onLogoClick={handleLogoClick}
                onShowFileExplorer={() => setShowFileExplorer(true)}
                onShowAICodeEditor={() => setShowAICodeEditor(true)}
                onShowAICodeAssistant={() => setShowAICodeAssistant(true)}
            />

            <div className="flex-1 flex flex-col max-h-screen">
                <Header
                    useAdvancedCanvas={useAdvancedCanvas}
                    setUseAdvancedCanvas={setUseAdvancedCanvas}
                    setSidebarOpen={setSidebarOpen}
                    sidebarOpen={sidebarOpen}
                    language={language}
                    setLanguage={setLanguage}
                    selectedModel={selectedModel}
                    t={t}
                    showThinking={showThinking}
                    setShowThinking={setShowThinking}
                    onShowReportManager={() => setShowReportManager(true)}
                    onShowEducationalGuide={() => setIsEducationalGuideOpen(true)}
                    isDeveloperMode={isDeveloperMode}
                    protectionLevel={protectionLevel}
                    onShowFileExplorer={() => setShowFileExplorer(true)}
                    onShowAICodeEditor={() => setShowAICodeEditor(true)}
                    onShowAICodeAssistant={() => setShowAICodeAssistant(true)}
                />

                <main className="flex-1 overflow-hidden">
                    {isCanvasMode ? (
                        <div className="flex h-full">
                            {/* Chat Sidebar for Canvas Mode */}
                            <ChatSidebar
                                currentChat={currentChat}
                                isLoading={isLoading}
                                isRTL={isRTL}
                                userName={userName}
                                t={t}
                                chatEndRef={chatEndRef}
                                isCollapsed={isChatSidebarCollapsed}
                                setIsCollapsed={setIsChatSidebarCollapsed}
                                input={input}
                                setInput={setInput}
                                handleKeyPress={handleKeyPress}
                                handleSend={handleSend}
                                textareaRef={textareaRef}
                                isThinking={isThinking}
                                thinkingContent={thinkingContent}
                                showThinking={showThinking}
                                onReportResponse={handleReportResponse}
                            />
                            
                            {/* Enhanced Canvas View */}
                            <div className="flex-1 relative">
                                {canvasContent || currentCanvasIndex >= 0 ? (
                                    <>
                                        {useAdvancedCanvas ? (
                                            <AdvancedCanvasView 
                                                content={canvasContent} 
                                                setContent={setCanvasContent}
                                                isFullScreen={isCanvasFullScreen}
                                                setIsFullScreen={setIsCanvasFullScreen}
                                                t={t}
                                                currentCanvas={canvasHistory[currentCanvasIndex]}
                                                onContentChange={(newContent) => {
                                                    setCanvasContent(newContent);
                                                    // Update canvas history when content changes
                                                    if (currentCanvasIndex >= 0 && currentCanvasIndex < canvasHistory.length) {
                                                        const updatedHistory = [...canvasHistory];
                                                        updatedHistory[currentCanvasIndex] = {
                                                            ...updatedHistory[currentCanvasIndex],
                                                            content: newContent,
                                                            timestamp: Date.now()
                                                        };
                                                        setCanvasHistory(updatedHistory);
                                                        localStorage.setItem('mench-ai-canvas-history', JSON.stringify(updatedHistory));
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <EnhancedCanvasView 
                                                content={canvasContent} 
                                                setContent={setCanvasContent}
                                                isFullScreen={isCanvasFullScreen}
                                                setIsFullScreen={setIsCanvasFullScreen}
                                                canvasHistory={canvasHistory}
                                                currentCanvasIndex={currentCanvasIndex}
                                                canvasAppendMode={canvasAppendMode}
                                                setCanvasAppendMode={setCanvasAppendMode}
                                                onCreateNewCanvas={createNewCanvas}
                                                onLoadCanvas={loadCanvas}
                                                onDeleteCanvas={deleteCanvas}
                                                t={t}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div className="h-full flex items-center justify-center bg-gray-900">
                                        <div className="text-center text-gray-400 space-y-4">
                                            <div className="text-6xl">⚡</div>
                                            <h3 className="text-xl font-semibold">Ready to Code!</h3>
                                            <p className="text-sm max-w-sm">
                                                This is your canvas - write your code directly here.<br/>
                                                Use the chat sidebar to ask questions and get help.
                                            </p>
                                            <button 
                                                onClick={() => createNewCanvas('')}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                            >
                                                Start Coding
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 md:p-6 h-full overflow-y-auto">
                            <div className="max-w-4xl mx-auto h-full">
                                <ChatArea
                                    isCanvasMode={isCanvasMode}
                                    currentChat={currentChat}
                                    isLoading={isLoading}
                                    isRTL={isRTL}
                                    userName={userName}
                                    t={t}
                                    chatEndRef={chatEndRef}
                                    isThinking={isThinking}
                                    thinkingContent={thinkingContent}
                                    showThinking={showThinking}
                                    onReportResponse={handleReportResponse}
                                />
                            </div>
                        </div>
                    )}
                </main>

                {/* Chat Input - Only show in normal chat mode */}
                {!isCanvasMode && (
                    <ChatInput
                        textareaRef={textareaRef}
                        input={input}
                        setInput={setInput}
                        handleKeyPress={handleKeyPress}
                        t={t}
                        isRTL={isRTL}
                        uploadedFile={uploadedFile}
                        setUploadedFile={setUploadedFile}
                        handleSend={handleSend}
                        isLoading={isLoading}
                        fileInputRef={fileInputRef}
                        handleFileChange={handleFileChange}
                        setIsImageGeneratorOpen={setIsImageGeneratorOpen}
                        handleCanvasToggle={handleCanvasToggle}
                        isCanvasMode={isCanvasMode}
                        protectionLevel={protectionLevel}
                    />
                )}
            </div>
        </div>
    );
}
