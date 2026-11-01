import React from 'react';
import { Send, X, Paperclip, Sparkles, BrainCircuit, LayoutTemplate } from 'lucide-react';
import { getProtectionLevel } from '../constants/protectionLevels';

const ChatInput = ({ 
    textareaRef, 
    input, 
    setInput, 
    handleKeyPress, 
    t, 
    isRTL, 
    uploadedFile, 
    setUploadedFile, 
    handleSend, 
    isLoading, 
    fileInputRef, 
    handleFileChange, 
    setIsImageGeneratorOpen, 
    handleCanvasToggle, 
    isCanvasMode,
    protectionLevel 
}) => {
    const currentProtectionLevel = getProtectionLevel(protectionLevel);
    const canGenerateImages = !currentProtectionLevel.settings.blockImages;
    return (
        <footer className="p-4 md:p-6 flex-shrink-0" data-tour="chat-input">
            <div className="max-w-4xl mx-auto">
                <div className="bg-gray-800 rounded-2xl p-4 flex items-start gap-4 focus-within:ring-2 focus-within:ring-blue-500">
                   <textarea 
                       ref={textareaRef} 
                       value={input} 
                       onChange={(e) => setInput(e.target.value)} 
                       onKeyPress={handleKeyPress} 
                       placeholder={t.enterPrompt} 
                       className={`flex-1 bg-transparent focus:outline-none resize-none max-h-48 ${isRTL ? 'text-right' : 'text-left'}`}
                       rows="1" 
                       dir={isRTL ? 'rtl' : 'ltr'}
                   />
                   {uploadedFile && (
                       <div className="bg-gray-700 text-xs text-gray-300 rounded-full px-3 py-1 flex items-center gap-2">
                           <span>{uploadedFile.name}</span>
                           <button onClick={() => setUploadedFile(null)} className="hover:text-white">
                               <X size={14} />
                           </button>
                       </div>
                   )}
                    <button 
                        onClick={() => handleSend()} 
                        className="bg-blue-600 p-3 rounded-full hover:bg-blue-700 disabled:bg-gray-600 self-end" 
                        disabled={isLoading || (!input.trim() && !uploadedFile)}
                    >
                        <Send size={20} />
                    </button>
                </div>
                
                <div className="flex items-center justify-center flex-wrap gap-4 mt-3">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    
                    <button 
                        onClick={() => fileInputRef.current.click()} 
                        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-700"
                        data-tour="file-upload"
                    >
                        <Paperclip size={16} /><span>{t.addFile}</span>
                    </button>
                    
                    {canGenerateImages && (
                        <button 
                            onClick={() => setIsImageGeneratorOpen(true)} 
                            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-700"
                            data-tour="image-button"
                        >
                            <Sparkles size={16} /><span>{t.generateImage}</span>
                        </button>
                    )}
                    
                    <button 
                        onClick={() => handleSend('deep_research')} 
                        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-700"
                        title="Uses Gemini 2.5 Pro for comprehensive analysis"
                    >
                        <BrainCircuit size={16} /><span>{t.deepResearch}</span>
                    </button>
                    
                    <button 
                        onClick={handleCanvasToggle} 
                        className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-700 ${isCanvasMode ? 'bg-gray-700 text-blue-400' : ''}`}
                        title={isCanvasMode ? "Switch to chat mode" : "Switch to canvas mode - write code directly"}
                    >
                        <LayoutTemplate size={16} />
                        <span>{isCanvasMode ? t.chatView : 'Code Canvas'}</span>
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default ChatInput;
