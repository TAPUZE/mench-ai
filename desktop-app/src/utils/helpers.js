// --- Helper function to generate chat title using AI ---
export const generateChatTitle = async (firstMessage, apiKey) => {
    try {
        const titlePrompt = `Generate a short, descriptive title (2-4 words) for a conversation that starts with: "${firstMessage}". The title should be concise and capture the main topic. Respond with only the title, no additional text.`;
        
        const payload = {
            contents: [{ role: 'user', parts: [{ text: titlePrompt }] }]
        };
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });

        const result = await response.json();
        if (response.ok && result.candidates?.[0]?.content?.parts?.[0]) {
            return result.candidates[0].content.parts[0].text.trim().replace(/['"]/g, '');
        }
    } catch (error) {
        console.error("Error generating chat title:", error);
    }
    
    // Fallback to extracting first few words from the message
    const words = firstMessage.split(' ').slice(0, 3).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
};

// --- Helper function to extract code from markdown fences ---
export const extractCode = (content) => {
    const codeBlockRegex = /```(?:\w+\n)?([\s\S]+?)```/;
    const match = content.match(codeBlockRegex);
    return match ? match[1].trim() : content;
};

// --- Helper function to convert file to Base64 ---
export const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

// --- Helper function to detect Hebrew text and apply RTL ---
export const detectHebrewAndApplyRTL = (text) => {
    // Check if text contains Hebrew characters
    const hebrewRegex = /[\u0590-\u05FF\u200F\u200E]/;
    const hasHebrew = hebrewRegex.test(text);
    
    if (hasHebrew) {
        // Wrap Hebrew text in RTL div
        return {
            isRTL: true,
            content: text
        };
    }
    
    return {
        isRTL: false,
        content: text
    };
};

// --- Helper function to filter forbidden Hebrew names of God ---
export const filterHebrewGodNames = (text) => {
    // Replace various forms of the Hebrew name of God with respectful alternatives
    const replacements = [
        { pattern: /אלוהים/g, replacement: 'אלוקים' },
        { pattern: /יהוה/g, replacement: 'ה\'' },
        { pattern: /יהו"ה/g, replacement: 'ה\'' },
        { pattern: /יה"וה/g, replacement: 'ה\'' },
        { pattern: /אדני/g, replacement: 'אדנ-י' },
        { pattern: /אדו?נ?י/g, replacement: 'אדנ-י' },
        { pattern: /השם המפורש/g, replacement: 'השם' },
        { pattern: /שם המפורש/g, replacement: 'השם' },
        { pattern: /שם הויה/g, replacement: 'השם' },
        { pattern: /אהיה אשר אהיה/g, replacement: 'אהי-ה אשר אהי-ה' },
        { pattern: /אהיה/g, replacement: 'אהי-ה' },
        { pattern: /אלהים/g, replacement: 'אלוקים' }, // Alternative spelling
        { pattern: /אל(?:ו|ה)הי/g, replacement: 'אלוק-י' }, // Partial forms
        { pattern: /שדי/g, replacement: 'שד-י' }, // El Shaddai
        { pattern: /אל שדי/g, replacement: 'אל שד-י' },
        { pattern: /צבאות/g, replacement: 'צבא-ות' } // Sabaoth
    ];
    
    let filteredText = text;
    replacements.forEach(({ pattern, replacement }) => {
        filteredText = filteredText.replace(pattern, replacement);
    });
    
    return filteredText;
};

// --- Helper function to detect file type from content ---
export const detectFileType = (content) => {
    const contentLower = content.toLowerCase();
    
    // HTML detection
    if (contentLower.includes('<!doctype html') || contentLower.includes('<html')) {
        return 'html';
    }
    
    // CSS detection
    if (contentLower.includes('body {') || contentLower.includes('margin:') || contentLower.includes('padding:')) {
        return 'css';
    }
    
    // JavaScript detection
    if (contentLower.includes('function ') || contentLower.includes('const ') || contentLower.includes('let ') || contentLower.includes('var ')) {
        return 'javascript';
    }
    
    // Python detection
    if (contentLower.includes('def ') || contentLower.includes('import ') || contentLower.includes('print(')) {
        return 'python';
    }
    
    // JSON detection
    if (contentLower.trim().startsWith('{') && contentLower.trim().endsWith('}')) {
        return 'json';
    }
    
    // Default to text
    return 'text';
};

// --- Helper function to generate file name based on content ---
export const generateFileName = (fileType) => {
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
    const fileExtensions = {
        html: 'html',
        css: 'css',
        javascript: 'js',
        python: 'py',
        json: 'json',
        text: 'txt'
    };
    
    const extension = fileExtensions[fileType] || 'txt';
    return `generated_${timestamp}.${extension}`;
};

// --- Helper function to create new canvas with file ---
export const createNewCanvasWithFile = (content, fileName) => {
    const canvas = {
        id: Date.now().toString(),
        title: fileName || 'New File',
        content: content,
        fileName: fileName,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        fileType: detectFileType(content)
    };
    
    return canvas;
};

// --- Helper function to analyze code for common patterns ---
export const analyzeCodePatterns = (code) => {
    const patterns = {
        isReactComponent: /import React/i.test(code) || /export default function/i.test(code),
        isNodeJS: /require\(|module\.exports/i.test(code),
        isHTML: /<!DOCTYPE html|<html/i.test(code),
        isCSS: /\{[^}]*[a-zA-Z-]+\s*:\s*[^}]*\}/i.test(code),
        isJavaScript: /function\s+|const\s+|let\s+|var\s+/i.test(code),
        isPython: /def\s+|import\s+|print\(/i.test(code),
        isJSON: /^\s*[{[]/.test(code.trim()),
        hasComments: /\/\*[\s\S]*?\*\/|\/\/.*$/gm.test(code),
        hasErrorHandling: /try\s*\{|catch\s*\(/i.test(code),
        hasAsyncCode: /async\s+function|await\s+/i.test(code)
    };
    
    return patterns;
};

// --- Helper function to extract multiple code blocks ---
export const extractAllCodeBlocks = (content) => {
    const codeBlocks = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
        codeBlocks.push({
            language: match[1] || 'text',
            code: match[2].trim(),
            index: codeBlocks.length
        });
    }
    
    return codeBlocks;
};

// --- Helper function to format code for display ---
export const formatCodeForDisplay = (code, _language = 'javascript') => {
    // Basic formatting - in a real app, you'd use a proper formatter
    let formatted = code;
    
    // Remove extra whitespace
    formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Basic indentation fix
    const lines = formatted.split('\n');
    let indentLevel = 0;
    const indentSize = 2;
    
    const formattedLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        
        // Decrease indent for closing braces
        if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        
        const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed;
        
        // Increase indent for opening braces
        if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
            indentLevel++;
        }
        
        return indentedLine;
    });
    
    return formattedLines.join('\n');
};

// --- Helper function to validate code syntax ---
export const validateCodeSyntax = (code, language) => {
    const errors = [];
    
    switch (language) {
        case 'javascript': {
            // Check for common JS syntax issues
            if (code.includes('function(') && !code.includes('function (')) {
                errors.push({ type: 'style', message: 'Consider adding space after function keyword' });
            }
            
            // Check for missing semicolons
            const lines = code.split('\n');
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
                    if (trimmed.match(/^(var|let|const|return)\s/)) {
                        errors.push({ 
                            type: 'syntax', 
                            message: `Missing semicolon at line ${index + 1}`,
                            line: index + 1
                        });
                    }
                }
            });
            break;
            
        }
        case 'html': {
            // Check for common HTML issues
            if (!code.includes('<!DOCTYPE')) {
                errors.push({ type: 'warning', message: 'Missing DOCTYPE declaration' });
            }
            
            // Check for unclosed tags (basic)
            const openTags = (code.match(/<[^/][^>]*>/g) || []).length;
            const closeTags = (code.match(/<\/[^>]*>/g) || []).length;
            if (openTags > closeTags) {
                errors.push({ type: 'syntax', message: 'Possible unclosed HTML tags' });
            }
            break;
            
        }
        case 'css':
            // Check for CSS syntax issues
            if (code.includes('{') && !code.includes('}')) {
                errors.push({ type: 'syntax', message: 'Missing closing brace in CSS' });
            }
            break;
    }
    
    return errors;
};

// --- Helper function to suggest improvements ---
export const suggestCodeImprovements = (code, language) => {
    const suggestions = [];
    
    const patterns = analyzeCodePatterns(code);
    
    if (language === 'javascript') {
        if (!patterns.hasErrorHandling) {
            suggestions.push({
                type: 'improvement',
                message: 'Consider adding error handling with try/catch blocks',
                priority: 'medium'
            });
        }
        
        if (!patterns.hasComments) {
            suggestions.push({
                type: 'improvement',
                message: 'Add comments to explain complex logic',
                priority: 'low'
            });
        }
        
        if (code.includes('var ')) {
            suggestions.push({
                type: 'improvement',
                message: 'Consider using const/let instead of var',
                priority: 'medium'
            });
        }
    }
    
    if (language === 'html') {
        if (!code.includes('lang=')) {
            suggestions.push({
                type: 'improvement',
                message: 'Add lang attribute to html tag for accessibility',
                priority: 'medium'
            });
        }
        
        if (!code.includes('meta name="viewport"')) {
            suggestions.push({
                type: 'improvement',
                message: 'Add viewport meta tag for mobile responsiveness',
                priority: 'high'
            });
        }
    }
    
    return suggestions;
};

// --- Helper function to get code template ---
export const getCodeTemplate = (type) => {
    const templates = {
        'html-basic': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>`,
        'javascript-function': `function functionName() {
    // Your code here
    return result;
}`,
        'react-component': `import React from 'react';

const ComponentName = () => {
    return (
        <div>
            {/* Your JSX here */}
        </div>
    );
};

export default ComponentName;`,
        'css-basic': `/* CSS Styles */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}`,
        'python-basic': `#!/usr/bin/env python3
# -*- coding: utf-8 -*-

def main():
    """Main function"""
    print("Hello, World!")

if __name__ == "__main__":
    main()`,
        'json-package': `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}`
    };
    
    return templates[type] || '';
};
