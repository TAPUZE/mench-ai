import React, { useState } from 'react';
import { Flag, AlertTriangle, MessageSquare, X, Send, CheckCircle, XCircle } from 'lucide-react';

const ResponseReporter = ({ 
    messageId, 
    messageContent, 
    isOpen, 
    onClose, 
    onSubmit, 
    t = {} 
}) => {
    const [reportType, setReportType] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const reportTypes = [
        { id: 'inappropriate', label: t.inappropriate || 'Inappropriate Content', icon: AlertTriangle },
        { id: 'inaccurate', label: t.inaccurate || 'Inaccurate Information', icon: XCircle },
        { id: 'unhelpful', label: t.unhelpful || 'Unhelpful Response', icon: MessageSquare },
        { id: 'offensive', label: t.offensive || 'Offensive Language', icon: Flag },
        { id: 'religious', label: t.religiousIssue || 'Religious Sensitivity Issue', icon: AlertTriangle },
        { id: 'other', label: t.other || 'Other Issue', icon: Flag }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reportType || !feedback.trim()) return;

        setIsSubmitting(true);
        try {
            const report = {
                id: Date.now().toString(),
                messageId,
                messageContent,
                reportType,
                selectedText,
                feedback,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            await onSubmit(report);
            setIsSubmitted(true);
            
            // Auto-close after 2 seconds
            setTimeout(() => {
                onClose();
                setIsSubmitted(false);
                setReportType('');
                setSelectedText('');
                setFeedback('');
            }, 2000);
        } catch (error) {
            console.error('Error submitting report:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (selection.toString().trim()) {
            setSelectedText(selection.toString().trim());
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                        <Flag size={20} className="text-red-400" />
                        {t.reportResponse || 'Report Response'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {isSubmitted ? (
                    <div className="p-6 text-center">
                        <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-200 mb-2">
                            {t.reportSubmitted || 'Report Submitted'}
                        </h4>
                        <p className="text-gray-400 text-sm">
                            {t.thankYouFeedback || 'Thank you for your feedback. This helps us improve the AI\'s responses.'}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        {/* Report Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                {t.reportType || 'What type of issue are you reporting?'}
                            </label>
                            <div className="space-y-2">
                                {reportTypes.map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setReportType(type.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                            reportType === type.id
                                                ? 'border-red-500 bg-red-500/10 text-red-400'
                                                : 'border-gray-600 hover:border-gray-500 text-gray-300 hover:bg-gray-700'
                                        }`}
                                    >
                                        <type.icon size={16} />
                                        <span className="text-sm">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Selected Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                {t.specificText || 'Specific text (optional)'}
                            </label>
                            <div className="bg-gray-700 rounded-lg p-3 mb-2">
                                <p className="text-xs text-gray-400 mb-2">
                                    {t.selectTextInstruction || 'Select text from the message below to highlight specific problematic content:'}
                                </p>
                                <div 
                                    className="text-sm text-gray-300 max-h-32 overflow-y-auto p-2 border border-gray-600 rounded bg-gray-800 cursor-text"
                                    onMouseUp={handleTextSelection}
                                    dangerouslySetInnerHTML={{ __html: messageContent }}
                                />
                            </div>
                            {selectedText && (
                                <div className="bg-yellow-500/10 border border-yellow-500 rounded p-2">
                                    <p className="text-xs text-yellow-400 mb-1">
                                        {t.selectedText || 'Selected text:'}
                                    </p>
                                    <p className="text-sm text-gray-300">"{selectedText}"</p>
                                </div>
                            )}
                        </div>

                        {/* Feedback */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                {t.additionalFeedback || 'Additional feedback'} *
                            </label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder={t.feedbackPlaceholder || 'Please describe the issue and how the response could be improved...'}
                                rows={4}
                                required
                            />
                        </div>

                        {/* Privacy Notice */}
                        <div className="bg-blue-500/10 border border-blue-500 rounded p-3">
                            <p className="text-xs text-blue-400">
                                {t.privacyNotice || 'Your feedback will be used to improve the AI system. No personal information is collected beyond what you provide here.'}
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                            >
                                {t.cancel || 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                disabled={!reportType || !feedback.trim() || isSubmitting}
                                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        {t.submitting || 'Submitting...'}
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        {t.submitReport || 'Submit Report'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResponseReporter;
