import React, { useState } from 'react';
import { X, Loader } from 'lucide-react';

const ImageGeneratorModal = ({ isOpen, onClose, generateImage, isLoading }) => {
    const [prompt, setPrompt] = useState('');
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-white">Generate Image</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>
                
                <div>
                    <label htmlFor="image-prompt" className="block text-sm font-medium text-gray-300 mb-2">
                        Prompt
                    </label>
                    <textarea 
                        id="image-prompt" 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        rows="3" 
                        placeholder="e.g., A beautiful sunset over Jerusalem" 
                    />
                </div>
                
                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={() => generateImage(prompt)} 
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-600 flex items-center gap-2" 
                        disabled={isLoading || !prompt.trim()}
                    >
                        {isLoading ? (
                            <>
                                <Loader size={20} className="animate-spin" /> 
                                Generating...
                            </>
                        ) : (
                            'Generate'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageGeneratorModal;
