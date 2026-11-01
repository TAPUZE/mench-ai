import React, { useState } from 'react';
import { Flag, CheckCircle } from 'lucide-react';

const ReportButton = ({ 
    messageId, 
    messageContent, 
    onReport, 
    isReported = false,
    size = 'sm',
    className = '',
    t = {} 
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [justReported, setJustReported] = useState(false);

    const handleClick = () => {
        if (isReported) return;
        
        onReport(messageId, messageContent);
        setJustReported(true);
        setTimeout(() => setJustReported(false), 2000);
    };

    const sizeClasses = {
        xs: 'p-1',
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-2.5'
    };

    const iconSizes = {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16
    };

    const getButtonClasses = () => {
        const baseClasses = `rounded-md transition-all duration-200 ${sizeClasses[size]} ${className}`;
        
        if (isReported) {
            return `${baseClasses} text-red-400 bg-red-500/10 cursor-not-allowed`;
        }
        
        if (justReported) {
            return `${baseClasses} text-green-400 bg-green-500/10`;
        }
        
        return `${baseClasses} text-gray-400 hover:text-red-400 hover:bg-red-500/10`;
    };

    const getIcon = () => {
        if (justReported) {
            return <CheckCircle size={iconSizes[size]} />;
        }
        
        if (isReported) {
            return <Flag size={iconSizes[size]} className="fill-current" />;
        }
        
        return <Flag size={iconSizes[size]} />;
    };

    const getTooltip = () => {
        if (justReported) {
            return t.reportSubmitted || 'Report submitted';
        }
        
        if (isReported) {
            return t.alreadyReported || 'Already reported';
        }
        
        return t.reportResponse || 'Report this response';
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                disabled={isReported}
                className={getButtonClasses()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                title={getTooltip()}
            >
                {getIcon()}
            </button>
            
            {/* Tooltip */}
            {isHovered && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                    {getTooltip()}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
            )}
        </div>
    );
};

export default ReportButton;
