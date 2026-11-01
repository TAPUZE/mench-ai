import React, { useState, useEffect } from 'react';
import { X, Cpu, Shield } from 'lucide-react';
import { AVAILABLE_MODELS } from '../../constants/models';
import { PROTECTION_LEVELS } from '../../constants/protectionLevels';
import { isDeveloper } from '../../constants/devAuth';

const SettingsModal = ({ 
    isOpen, 
    onClose, 
    apiKey, 
    setApiKey, 
    language, 
    setLanguage, 
    selectedModel, 
    setSelectedModel, 
    protectionLevel,
    setProtectionLevel,
    translations 
}) => {
    const t = translations[language];
    const [localApiKey, setLocalApiKey] = useState(apiKey);
    const [localLanguage, setLocalLanguage] = useState(language);
    const [localModel, setLocalModel] = useState(selectedModel);
    const [localProtectionLevel, setLocalProtectionLevel] = useState(protectionLevel);
    const [isDevUser, setIsDevUser] = useState(false);
    
    useEffect(() => { 
        setLocalApiKey(apiKey); 
        setLocalLanguage(language);
        setLocalModel(selectedModel);
        setLocalProtectionLevel(protectionLevel);
        setIsDevUser(isDeveloper(apiKey));
    }, [apiKey, language, selectedModel, protectionLevel]);
    
    if (!isOpen) return null;
    
    const handleSave = () => {
        setApiKey(localApiKey);
        setLanguage(localLanguage);
        setSelectedModel(localModel);
        setProtectionLevel(localProtectionLevel);
        localStorage.setItem('gemini-api-key', localApiKey);
        localStorage.setItem('kosher-ai-language', localLanguage);
        localStorage.setItem('kosher-ai-selected-model', localModel);
        localStorage.setItem('kosher-ai-protection-level', localProtectionLevel);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-white">{t.settings}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <label htmlFor="language" className="block text-sm font-medium text-gray-300 mb-2">
                            {t.language}
                        </label>
                        <select
                            id="language"
                            value={localLanguage}
                            onChange={(e) => setLocalLanguage(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-tour="language-selector"
                        >
                            <option value="en">English</option>
                            <option value="he">עברית</option>
                        </select>
                    </div>
                    
                    <div>
                        <label htmlFor="protection-level" className="block text-sm font-medium text-gray-300 mb-2">
                            <Shield size={16} className="inline mr-2" />
                            {t.protectionLevel}
                        </label>
                        <p className="text-xs text-gray-500 mb-2">{t.protectionLevelDescription}</p>
                        <select
                            id="protection-level"
                            value={localProtectionLevel}
                            onChange={(e) => setLocalProtectionLevel(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-tour="protection-selector"
                        >
                            {Object.entries(PROTECTION_LEVELS).map(([key, level]) => {
                                // Only show developer mode for authorized developers
                                if (level.devOnly && !isDevUser) {
                                    return null;
                                }
                                
                                return (
                                    <option key={key} value={key.toLowerCase()}>
                                        {level.icon} {language === 'he' ? level.nameHe : level.name} - {language === 'he' ? level.descriptionHe : level.description}
                                    </option>
                                );
                            })}
                        </select>
                        
                        {isDevUser && (
                            <div className="mt-2 p-2 bg-yellow-900 border border-yellow-600 rounded text-yellow-200 text-xs">
                                🚀 Developer access detected - UNRESTRICTED mode available
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-2">
                            <Cpu size={16} className="inline mr-2" />
                            {t.model}
                        </label>
                        <p className="text-xs text-gray-500 mb-2">{t.modelDescription}</p>
                        <select
                            id="model"
                            value={localModel}
                            onChange={(e) => setLocalModel(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {Object.entries(AVAILABLE_MODELS).map(([key, model]) => (
                                <option key={key} value={key}>
                                    {model.name} - {model.description}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label htmlFor="api-key" className="block text-sm font-medium text-gray-300 mb-2">
                            {t.apiKey}
                        </label>
                        <p className="text-xs text-gray-500 mb-2">{t.apiKeyDescription}</p>
                        <input
                            type="password"
                            id="api-key"
                            value={localApiKey}
                            onChange={(e) => setLocalApiKey(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your API key here"
                        />
                    </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                    >
                        {t.save}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
