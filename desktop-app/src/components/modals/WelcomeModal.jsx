import React from 'react';
import { Bot, HelpCircle } from 'lucide-react';

const WelcomeModal = ({ isOpen, onClose: _onClose, onStartTour, onSkip, onDontShow, translations, language }) => {
    const t = translations[language];
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md mx-4">
                <div className="text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bot size={32} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-semibold text-white mb-2">{t.welcomeTitle}</h2>
                        <p className="text-gray-300">{t.welcomeMessage}</p>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onStartTour}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            <HelpCircle size={20} />
                            {t.startTour}
                        </button>
                        
                        <button
                            onClick={onSkip}
                            className="w-full bg-gray-700 text-white py-3 px-4 rounded-md hover:bg-gray-600"
                        >
                            {t.skipTour}
                        </button>
                        
                        <button
                            onClick={onDontShow}
                            className="text-sm text-gray-400 hover:text-white"
                        >
                            {t.dontShowAgain}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
