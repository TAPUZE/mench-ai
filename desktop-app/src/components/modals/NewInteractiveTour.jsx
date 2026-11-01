import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const NewInteractiveTour = ({ 
    isOpen, 
    onClose, 
    onSkip, 
    onDontShow, 
    currentStep, 
    setCurrentStep,
    translations, 
    language,
    onOpenSettings,
    onCloseSettings,
    onToggleSidebar,
    onToggleCanvas,
    sidebarOpen,
    isSettingsOpen
}) => {

translations[language];
    const [highlightElement, setHighlightElement] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const [isWaitingForModal, setIsWaitingForModal] = useState(false);
    
    const tourSteps = [
        {
            id: 1,
            title: "Welcome to Kosher AI",
            content: "Welcome to your Orthodox Jewish AI learning assistant! This tour will show you all the amazing features designed to help you learn while maintaining our values.",
            target: null,
            action: null,
            position: "center"
        },
        {
            id: 2,
            title: "Chat Area - Your Learning Hub",
            content: "This is where you'll have conversations with our AI. Ask questions about Torah, math, science, history, or any subject you're studying!",
            target: "[data-tour='chat-area']",
            action: null,
            position: "center"
        },
        {
            id: 3,
            title: "Smart Persona System",
            content: "Our AI automatically chooses the right teacher for your question:\n• Math questions → Math Expert\n• Torah questions → Rabbi Persona\n• Science questions → Science Teacher\n• And much more!",
            target: "[data-tour='chat-input']",
            action: null,
            position: "top"
        },
        {
            id: 4,
            title: "Access Settings",
            content: "Click the Settings button to see our 3-level protection system.\n\nClick 'Next' to open the settings automatically!",
            target: "[data-tour='settings-button']",
            action: "click-settings",
            position: "bottom",
            interactive: false
        },
        {
            id: 5,
            title: "Protection System Overview",
            content: "🔒 Maximum Protection: Blocks sports/entertainment, disables images, pure Torah/academic focus\n\n⚖️ Standard Protection: Allows images, blocks sports/entertainment, balanced approach\n\n🔓 Open Protection: All topics with Orthodox perspective, maximum flexibility\n\nYou can change this anytime!",
            target: "[data-tour='protection-selector']",
            action: null,
            position: "left",
            requiresSettings: true
        },
        {
            id: 6,
            title: "Language Support",
            content: "🌐 Switch between English and Hebrew. The AI automatically adapts its teaching style based on your language choice.",
            target: "[data-tour='language-selector']",
            action: null,
            position: "left",
            requiresSettings: true
        },
        {
            id: 7,
            title: "Continue Tour",
            content: "Great! You've seen the main settings. Let's continue exploring other features.\n\nClick 'Next' to continue!",
            target: null,
            action: "close-settings",
            position: "center",
            requiresSettings: true
        },
        {
            id: 8,
            title: "Chat History",
            content: "Click here to access your previous conversations. All your learning sessions are saved and organized.",
            target: "[data-tour='chat-sidebar-toggle']",
            action: null,
            position: "right"
        },
        {
            id: 9,
            title: "Canvas Mode",
            content: "For coding and HTML projects, enable Canvas Mode to see live previews of your work!",
            target: "[data-tour='canvas-toggle']",
            action: null,
            position: "bottom"
        },
        {
            id: 10,
            title: "Image Generation",
            content: "Generate educational images to enhance your learning (available based on your protection level).",
            target: "[data-tour='image-button']",
            action: null,
            position: "top"
        },
        {
            id: 11,
            title: "File Uploads",
            content: "Upload documents, images, or files for the AI to analyze and help you understand.",
            target: "[data-tour='file-upload']",
            action: null,
            position: "top"
        },
        {
            id: 12,
            title: "Start Learning!",
            content: "You're all set! Try asking:\n• 'Help me with algebra'\n• 'Can I use my phone on Shabbat?'\n• 'Explain photosynthesis'\n• 'Tell me a Torah story'\n\nThe AI will automatically choose the perfect teacher for each question!",
            target: "[data-tour='chat-input']",
            action: null,
            position: "top"
        }
    ];

    const currentStepData = tourSteps[currentStep - 1];
    const totalSteps = tourSteps.length;

    // Find and highlight elements
    const findAndHighlightElement = useCallback((target) => {
        if (!target) {
            setHighlightElement(null);
            return true;
        }

        const element = document.querySelector(target);
        if (element) {
            setHighlightElement(element);
            
            // Calculate tooltip position
            const rect = element.getBoundingClientRect();
            let top, left;
            
            switch (currentStepData?.position) {
                case 'top':
                    top = rect.top - 10;
                    left = rect.left + rect.width / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + 10;
                    left = rect.left + rect.width / 2;
                    break;
                case 'left':
                    top = rect.top + rect.height / 2;
                    left = rect.left - 10;
                    break;
                case 'right':
                    top = rect.top + rect.height / 2;
                    left = rect.right + 10;
                    break;
                default:
                    top = window.innerHeight / 2;
                    left = window.innerWidth / 2;
            }
            
            setTooltipPosition({ top, left });
            return true;
        }
        return false;
    }, [currentStepData?.position]);

    // Element highlighting effect
    useEffect(() => {
        if (!isOpen) return;

        const target = currentStepData?.target;
        
        if (currentStepData?.requiresSettings) {
            // For settings steps, wait for modal to be open
            if (!isSettingsOpen) {
                setHighlightElement(null);
                return;
            }
            
            // Wait for modal content to render
            const timer = setTimeout(() => {
                if (!findAndHighlightElement(target)) {
                    // Retry a few times for modal content
                    let attempts = 0;
                    const retryInterval = setInterval(() => {
                        attempts++;
                        if (findAndHighlightElement(target) || attempts >= 5) {
                            clearInterval(retryInterval);
                        }
                    }, 300);
                    
                    setTimeout(() => clearInterval(retryInterval), 2000);
                }
            }, 500);
            
            return () => clearTimeout(timer);
        } else {
            // For regular steps
            findAndHighlightElement(target);
        }
    }, [currentStep, isOpen, currentStepData, isSettingsOpen, findAndHighlightElement]);

    // Auto-open settings for settings steps
    useEffect(() => {
        if (isOpen && currentStepData?.requiresSettings && !isSettingsOpen && !isWaitingForModal) {
            console.log('Tour: Opening settings for step', currentStep);
            onOpenSettings();
        }
    }, [isOpen, currentStepData, isSettingsOpen, onOpenSettings, currentStep, isWaitingForModal]);

    const handleAction = (action) => {
        switch (action) {
            case 'click-settings':
                setIsWaitingForModal(true);
                onOpenSettings();
                setTimeout(() => setIsWaitingForModal(false), 1000);
                break;
            case 'close-settings':
                if (onCloseSettings) {
                    onCloseSettings();
                }
                break;
            case 'click-sidebar':
                if (!sidebarOpen) onToggleSidebar();
                break;
            case 'click-canvas':
                onToggleCanvas();
                break;
        }
    };

    const nextStep = () => {
        const isLastStep = currentStep === totalSteps;
        
        // Handle current step action first
        if (currentStepData?.action) {
            handleAction(currentStepData.action);
            
            // Wait for action to complete before advancing
            const delay = currentStepData.action.includes('settings') ? 800 : 300;
            setTimeout(() => {
                if (isLastStep) {
                    onClose();
                } else {
                    setCurrentStep(currentStep + 1);
                }
            }, delay);
            return;
        }
        
        // Normal step progression
        if (isLastStep) {
            onClose();
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay with highlight */}
            <div className="fixed inset-0 z-40">
                <div className="absolute inset-0 bg-black bg-opacity-75"></div>
                
                {highlightElement && (
                    <div
                        className="absolute border-4 border-blue-400 rounded-lg shadow-2xl bg-transparent animate-pulse"
                        style={{
                            top: highlightElement.getBoundingClientRect().top - 8,
                            left: highlightElement.getBoundingClientRect().left - 8,
                            width: highlightElement.getBoundingClientRect().width + 16,
                            height: highlightElement.getBoundingClientRect().height + 16,
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 20px 4px rgba(59, 130, 246, 0.6)',
                            pointerEvents: 'none',
                            zIndex: 45
                        }}
                    />
                )}
            </div>

            {/* Tour tooltip */}
            <div 
                className={`fixed z-50 bg-gray-800 rounded-lg p-6 w-80 shadow-2xl border border-gray-600 transform ${
                    currentStepData?.position === 'center' ? 
                    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                    ''
                }`}
                style={currentStepData?.position !== 'center' ? {
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                    transform: currentStepData?.position === 'top' ? 'translate(-50%, -100%)' :
                              currentStepData?.position === 'bottom' ? 'translate(-50%, 0)' :
                              currentStepData?.position === 'left' ? 'translate(-100%, -50%)' :
                              currentStepData?.position === 'right' ? 'translate(0, -50%)' :
                              'none'
                } : {}}
            >
                {/* Arrow pointer */}
                {currentStepData?.position !== 'center' && (
                    <div 
                        className={`absolute w-3 h-3 bg-gray-800 border-gray-600 transform rotate-45 ${
                            currentStepData?.position === 'top' ? 'bottom-[-7px] left-1/2 -translate-x-1/2 border-b border-r' :
                            currentStepData?.position === 'bottom' ? 'top-[-7px] left-1/2 -translate-x-1/2 border-t border-l' :
                            currentStepData?.position === 'left' ? 'right-[-7px] top-1/2 -translate-y-1/2 border-t border-r' :
                            currentStepData?.position === 'right' ? 'left-[-7px] top-1/2 -translate-y-1/2 border-b border-l' :
                            ''
                        }`}
                    />
                )}

                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-white">{currentStepData?.title}</h3>
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="mb-6">
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {currentStepData?.content}
                    </p>
                    
                    {currentStepData?.requiresSettings && !isSettingsOpen && (
                        <div className="mt-3 p-2 bg-yellow-900 bg-opacity-50 rounded border border-yellow-400">
                            <p className="text-yellow-200 text-xs">
                                ⏳ Opening settings modal...
                            </p>
                        </div>
                    )}
                </div>

                {/* Progress indicator */}
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-gray-400">
                        Step {currentStep} of {totalSteps}
                    </span>
                    <div className="flex gap-1">
                        {Array.from({ length: totalSteps }, (_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                    i < currentStep ? 'bg-blue-500' : 'bg-gray-600'
                                }`}
                            />
                        ))}
                    </div>
                </div>
                
                {/* Navigation */}
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={onSkip}
                            className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                        >
                            Skip Tour
                        </button>
                        <button
                            onClick={onDontShow}
                            className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                        >
                            Don't Show Again
                        </button>
                    </div>
                    
                    <div className="flex gap-2">
                        {currentStep > 1 && (
                            <button
                                onClick={prevStep}
                                className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-700 text-white rounded-md hover:bg-gray-600"
                            >
                                <ChevronLeft size={14} />
                                Previous
                            </button>
                        )}
                        <button
                            onClick={nextStep}
                            disabled={isWaitingForModal}
                            className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md ${
                                isWaitingForModal 
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {isWaitingForModal ? 'Please wait...' :
                             currentStep === totalSteps ? 'Finish' : 'Next'}
                            {!isWaitingForModal && currentStep < totalSteps && <ChevronRight size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default NewInteractiveTour;
