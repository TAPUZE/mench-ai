import React from 'react';
import { X } from 'lucide-react';

const TourModal = ({ 
    isOpen, 
    onClose, 
    onSkip, 
    onDontShow, 
    currentStep, 
    totalSteps, 
    stepContent, 
    onNext, 
    onPrev, 
    translations, 
    language 
}) => {
    const t = translations[language];
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">{t.welcomeTitle}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                
                <div className="mb-6">
                    <p className="text-gray-300 mb-4">{stepContent}</p>
                    <div className="flex justify-between text-sm text-gray-400">
                        <span>Step {currentStep} of {totalSteps}</span>
                        <div className="flex gap-2">
                            {Array.from({ length: totalSteps }, (_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${
                                        i < currentStep ? 'bg-blue-500' : 'bg-gray-600'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-between">
                    <div className="flex gap-2">
                        <button
                            onClick={onSkip}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                        >
                            {t.skipTour}
                        </button>
                        <button
                            onClick={onDontShow}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                        >
                            {t.dontShowAgain}
                        </button>
                    </div>
                    
                    <div className="flex gap-2">
                        {currentStep > 1 && (
                            <button
                                onClick={onPrev}
                                className="px-4 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-600"
                            >
                                Previous
                            </button>
                        )}
                        <button
                            onClick={currentStep === totalSteps ? onClose : onNext}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            {currentStep === totalSteps ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TourModal;
