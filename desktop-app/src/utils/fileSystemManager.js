/**
 * AI-Powered File System Manager
 * Handles all file operations, region-based editing, auto-fixing, and learning capabilities
 */

import { analyzeCodePatterns } from './helpers.js';

const generateUniqueId = () => crypto.randomUUID();
const getFileExtension = (name) => {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot).toLowerCase() : '';
};

class FileSystemManager {
    constructor() {
        this.files = new Map();
        this.templates = new Map();
        this.knowledgeBase = new Map();
        this.projectStructure = [];
        this.currentProject = null;
        this.initialized = false;
        this.learningData = new Map();
        this.autoFixHistory = new Map();
        this.codeGenerationHistory = [];
    }

    /**
     * Initialize the file system manager
     */
    async initialize() {
        try {
            // Load existing data from localStorage
            await this.loadFromStorage();
            this.updateProjectStructure();
            
            // Initialize default templates
            this.initializeDefaultTemplates();
            
            // Initialize knowledge base
            this.initializeKnowledgeBase();
            
            this.initialized = true;
            console.log('FileSystemManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize FileSystemManager:', error);
            throw error;
        }
    }

    /**
     * Create a new file with content
     */
    async createFile(path, content = '', fileType = null) {
        try {
            const id = generateUniqueId();
            const fileName = path.split('/').pop();
            const extension = getFileExtension(fileName);
            const detectedType = fileType || this.detectLanguage(extension);
            
            const file = {
                id,
                path,
                name: fileName,
                extension,
                type: detectedType,
                content,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                size: content.length,
                regions: [],
                metadata: {
                    author: 'AI',
                    type: detectedType,
                    language: this.detectLanguage(extension),
                    dependencies: [],
                    exports: [],
                    imports: []
                }
            };

            // Analyze code structure if it's a code file
            if (this.isCodeFile(detectedType)) {
                file.metadata.patterns = analyzeCodePatterns(content);
            }

            this.files.set(id, file);
            this.updateProjectStructure();
            await this.saveToStorage();
            
            return file;
        } catch (error) {
            console.error('Failed to create file:', error);
            throw error;
        }
    }

    /**
     * Read file content
     */
    async readFile(fileId) {
        try {
            const file = this.files.get(fileId);
            if (!file) {
                throw new Error(`File not found: ${fileId}`);
            }
            return file;
        } catch (error) {
            console.error('Failed to read file:', error);
            throw error;
        }
    }

    /**
     * Update file content
     */
    async updateFile(fileId, newContent) {
        try {
            const file = this.files.get(fileId);
            if (!file) {
                throw new Error(`File not found: ${fileId}`);
            }

            // Store previous content for rollback
            const backup = { ...file };
            
            file.content = newContent;
            file.modifiedAt = new Date().toISOString();
            file.size = newContent.length;
            
            // Re-analyze code structure if it's a code file
            if (this.isCodeFile(file.type)) {
                file.metadata.patterns = analyzeCodePatterns(newContent);
            }

            this.files.set(fileId, file);
            await this.saveToStorage();
            
            return { file, backup };
        } catch (error) {
            console.error('Failed to update file:', error);
            throw error;
        }
    }

    /**
     * Delete a file
     */
    async deleteFile(fileId) {
        try {
            const file = this.files.get(fileId);
            if (!file) {
                throw new Error(`File not found: ${fileId}`);
            }

            this.files.delete(fileId);
            this.updateProjectStructure();
            await this.saveToStorage();
            
            return true;
        } catch (error) {
            console.error('Failed to delete file:', error);
            throw error;
        }
    }

    /**
     * Replace a specific region of code in a file
     */
    async replaceRegion(fileId, regionId, newCode) {
        try {
            const file = this.files.get(fileId);
            if (!file) {
                throw new Error(`File not found: ${fileId}`);
            }

            // Find the region to replace
            const region = file.regions.find(r => r.id === regionId);
            if (!region) {
                throw new Error(`Region not found: ${regionId}`);
            }

            // Store original content for rollback

file.content;
            
            // Replace the region
            const lines = file.content.split('\n');
            const newLines = [
                ...lines.slice(0, region.startLine),
                ...newCode.split('\n'),
                ...lines.slice(region.endLine + 1)
            ];
            
            const newContent = newLines.join('\n');
            
            // Update file
            await this.updateFile(fileId, newContent);
            
            // Run auto-fix if enabled
            const fixResult = await this.autoFix(fileId);
            
            return { success: true, fixResult };
        } catch (error) {
            console.error('Failed to replace region:', error);
            throw error;
        }
    }

    /**
     * AI-powered auto-fix for code errors
     */
    async autoFix(fileId) {
        try {
            const file = this.files.get(fileId);
            if (!file) {
                throw new Error(`File not found: ${fileId}`);
            }

            // Only auto-fix code files
            if (!this.isCodeFile(file.type)) {
                return { fixed: false, reason: 'Not a code file' };
            }

            // Analyze code for errors
            const errors = await this.analyzeCodeErrors(file);
            
            if (errors.length === 0) {
                return { fixed: false, reason: 'No errors found' };
            }

            // Attempt to fix errors
            const fixes = await this.generateFixes(file, errors);
            
            if (fixes.length > 0) {
                // Apply fixes
                let fixedContent = file.content;
                for (const fix of fixes) {
                    fixedContent = this.applyFix(fixedContent, fix);
                }
                
                // Update file with fixed content
                await this.updateFile(fileId, fixedContent);
                
                // Store learning data
                this.storeLearningData(fileId, errors, fixes);
                
                return { fixed: true, fixes };
            }

            return { fixed: false, reason: 'Could not generate fixes' };
        } catch (error) {
            console.error('Auto-fix failed:', error);
            return { fixed: false, error: error.message };
        }
    }

    /**
     * Generate code from AI prompt
     */
    async generateCode(prompt, fileType = 'javascript', template = null) {
        try {
            // Use template if provided
            let baseCode = '';
            if (template) {
                const templateData = this.templates.get(template);
                if (templateData) {
                    baseCode = templateData.content;
                }
            }

            // Generate code based on prompt and learning data
            const generatedCode = await this.generateCodeFromPrompt(prompt, fileType, baseCode);
            
            // Store generation history
            this.codeGenerationHistory.push({
                prompt,
                fileType,
                template,
                generatedCode,
                timestamp: new Date().toISOString()
            });

            return generatedCode;
        } catch (error) {
            console.error('Code generation failed:', error);
            throw error;
        }
    }

    /**
     * List all files
     */
    listFiles() {
        return Array.from(this.files.values()).map(file => ({
            id: file.id,
            name: file.name,
            path: file.path,
            type: file.type,
            size: file.size,
            modifiedAt: file.modifiedAt
        }));
    }

    /**
     * Get project structure
     */
    getProjectStructure() {
        return this.projectStructure;
    }

    /**
     * Initialize default templates
     */
    initializeDefaultTemplates() {
        const templates = [
            {
                id: 'react-component',
                name: 'React Component',
                type: 'javascript',
                content: `import React from 'react';

const ComponentName = () => {
    return (
        <div>
            <h1>Component Name</h1>
        </div>
    );
};

export default ComponentName;`
            },
            {
                id: 'html-page',
                name: 'HTML Page',
                type: 'html',
                content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>`
            },
            {
                id: 'css-file',
                name: 'CSS File',
                type: 'css',
                content: `/* CSS Styles */

body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
}`
            }
        ];

        templates.forEach(template => {
            this.templates.set(template.id, template);
        });
    }

    /**
     * Initialize knowledge base
     */
    initializeKnowledgeBase() {
        const knowledge = [
            {
                id: 'react-best-practices',
                category: 'react',
                title: 'React Best Practices',
                content: 'Use functional components, hooks, and proper state management'
            },
            {
                id: 'html-semantic',
                category: 'html',
                title: 'Semantic HTML',
                content: 'Use semantic HTML elements for better accessibility and SEO'
            },
            {
                id: 'css-responsive',
                category: 'css',
                title: 'Responsive Design',
                content: 'Use CSS Grid and Flexbox for responsive layouts'
            }
        ];

        knowledge.forEach(item => {
            this.knowledgeBase.set(item.id, item);
        });
    }

    /**
     * Helper methods
     */
    isCodeFile(type) {
        return ['javascript', 'typescript', 'html', 'css', 'python', 'java', 'cpp'].includes(type);
    }

    detectLanguage(extension) {
        const languages = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.html': 'html',
            '.css': 'css',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c'
        };
        return languages[extension] || 'text';
    }

    async analyzeCodeErrors(file) {
        // Simplified error analysis - in a real implementation,
        // this would use actual linting/parsing tools
        const errors = [];
        
        if (file.type === 'javascript') {
            // Check for common JS errors
            if (file.content.includes('console.log(')) {
                errors.push({
                    type: 'warning',
                    message: 'console.log statement found',
                    line: 1,
                    column: 1
                });
            }
        }
        
        return errors;
    }

    async generateFixes(file, errors) {
        // Simplified fix generation
        const fixes = [];
        
        for (const error of errors) {
            if (error.message.includes('console.log')) {
                fixes.push({
                    type: 'remove',
                    line: error.line,
                    description: 'Remove console.log statement'
                });
            }
        }
        
        return fixes;
    }

    applyFix(content, fix) {
        // Simplified fix application
        if (fix.type === 'remove' && fix.description.includes('console.log')) {
            return content.replace(/console\.log\(.*?\);?\n?/g, '');
        }
        return content;
    }

    async generateCodeFromPrompt(prompt, fileType, baseCode) {
        // Simplified code generation - in a real implementation,
        // this would use an AI API
        let generatedCode = baseCode;
        
        if (prompt.includes('button')) {
            generatedCode += '\n<button>Click me</button>';
        }
        
        if (prompt.includes('function')) {
            generatedCode += '\nfunction myFunction() {\n    // TODO: Implement function\n}';
        }
        
        return generatedCode;
    }

    storeLearningData(fileId, errors, fixes) {
        const learningEntry = {
            fileId,
            errors,
            fixes,
            timestamp: new Date().toISOString()
        };
        
        this.learningData.set(generateUniqueId(), learningEntry);
    }

    updateProjectStructure() {
        this.projectStructure = this.listFiles();
    }

    async loadFromStorage() {
        try {
            const filesData = localStorage.getItem('fileSystem_files');
            const templatesData = localStorage.getItem('fileSystem_templates');
            const knowledgeData = localStorage.getItem('fileSystem_knowledge');
            
            if (filesData) {
                this.files = new Map(JSON.parse(filesData));
            }
            if (templatesData) {
                this.templates = new Map(JSON.parse(templatesData));
            }
            if (knowledgeData) {
                this.knowledgeBase = new Map(JSON.parse(knowledgeData));
            }
        } catch (error) {
            console.error('Failed to load from storage:', error);
        }
    }

    async saveToStorage() {
        try {
            localStorage.setItem('fileSystem_files', JSON.stringify(Array.from(this.files.entries())));
            localStorage.setItem('fileSystem_templates', JSON.stringify(Array.from(this.templates.entries())));
            localStorage.setItem('fileSystem_knowledge', JSON.stringify(Array.from(this.knowledgeBase.entries())));
        } catch (error) {
            console.error('Failed to save to storage:', error);
        }
    }
}

// Create and export a singleton instance
export const fileSystemManager = new FileSystemManager();

// The newer file tools address browser-stored files by path and read text.
// Keep that API separate from the native directory/handle API used by the IDE.
const findFile = (path) => {
    const file = fileSystemManager.files.get(path) ||
        Array.from(fileSystemManager.files.values()).find(file => file.path === path);
    if (!file) throw new Error(`File not found: ${path}`);
    return file;
};

export const fileSystem = {
    initialize: () => fileSystemManager.initialize(),
    listFiles: () => fileSystemManager.listFiles(),
    createFile: (...args) => fileSystemManager.createFile(...args),
    readFile: async (path) => findFile(path).content,
    writeFile: (path, content) => fileSystemManager.updateFile(findFile(path).id, content),
    deleteFile: (path) => fileSystemManager.deleteFile(findFile(path).id),
    autoFixErrors: async (path) => {
        const result = await fileSystemManager.autoFix(findFile(path).id);
        return { success: result.fixed, fixes: result.fixes?.map(fix => fix.description) || [] };
    },
    replaceCodeRegion: async (path, search, replacement, { isRegex = false } = {}) => {
        const file = findFile(path);
        const content = isRegex
            ? file.content.replace(new RegExp(search, 'g'), replacement)
            : file.content.split(search).join(replacement);
        if (content === file.content) return false;
        await fileSystemManager.updateFile(file.id, content);
        return true;
    },
    getFileStats: () => {
        const files = fileSystemManager.listFiles();
        return {
            totalFiles: files.length,
            totalSize: files.reduce((size, file) => size + file.size, 0),
            fileTypes: files.reduce((types, file) => {
                types[file.type] = (types[file.type] || 0) + 1;
                return types;
            }, {})
        };
    },
    formatFileSize: (bytes) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
};

// Export the class for testing
export { FileSystemManager };

// Default export for backward compatibility
export default fileSystemManager;
