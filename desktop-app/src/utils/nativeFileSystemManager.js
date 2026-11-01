// File System Manager for advanced canvas operations
// Provides real file system access using the File System Access API

export class FileSystemManager {
    constructor() {
        this.currentDirectory = null;
        this.fileHandles = new Map();
        this.directoryHandles = new Map();
        this.supportedFormats = [
            '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md', 
            '.txt', '.py', '.java', '.cpp', '.c', '.php', '.rb', '.go', 
            '.rs', '.swift', '.kt', '.scala', '.sh', '.bat', '.yml', '.yaml',
            '.xml', '.sql', '.r', '.m', '.pl', '.lua', '.dart', '.vue'
        ];
        this.binaryFormats = [
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.zip', '.rar', '.7z', '.tar', '.gz', '.mp4', '.mp3', '.wav'
        ];
    }

    // Check if File System Access API is supported
    isSupported() {
        return 'showDirectoryPicker' in window;
    }

    // Open a directory and load its structure
    async openDirectory() {
        if (!this.isSupported()) {
            throw new Error('File System Access API is not supported in this browser. Please use Chrome 86+ or Edge 86+.');
        }

        try {
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            
            this.currentDirectory = dirHandle;
            const structure = await this.loadDirectoryStructure(dirHandle);
            
            // Store directory handle for future reference
            this.directoryHandles.set('root', dirHandle);
            
            return structure;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Directory selection was cancelled');
            }
            console.error('Failed to open directory:', error);
            throw new Error(`Failed to open directory: ${error.message}`);
        }
    }

    // Load directory structure recursively
    async loadDirectoryStructure(dirHandle, path = '', maxDepth = 10, currentDepth = 0) {
        if (currentDepth > maxDepth) {
            console.warn(`Maximum depth reached for ${path}`);
            return null;
        }

        const structure = {
            name: dirHandle.name,
            type: 'directory',
            path: path || dirHandle.name,
            children: [],
            handle: dirHandle,
            size: 0,
            lastModified: null
        };

        try {
            const entries = [];
            for await (const [name, handle] of dirHandle.entries()) {
                // Skip hidden files and common ignore patterns
                if (this.shouldIgnoreFile(name)) {
                    continue;
                }

                const currentPath = path ? `${path}/${name}` : name;
                entries.push({ name, handle, path: currentPath });
            }

            // Sort entries: directories first, then files
            entries.sort((a, b) => {
                if (a.handle.kind !== b.handle.kind) {
                    return a.handle.kind === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            for (const entry of entries) {
                const { name, handle, path: currentPath } = entry;
                
                if (handle.kind === 'directory') {
                    const childStructure = await this.loadDirectoryStructure(
                        handle, 
                        currentPath, 
                        maxDepth, 
                        currentDepth + 1
                    );
                    if (childStructure) {
                        structure.children.push(childStructure);
                    }
                } else {
                    const fileInfo = await this.getFileInfo(handle);
                    structure.children.push({
                        name,
                        type: 'file',
                        path: currentPath,
                        handle,
                        size: fileInfo.size,
                        lastModified: fileInfo.lastModified,
                        extension: this.getFileExtension(name),
                        isSupported: this.isFileSupported(name),
                        isBinary: this.isBinaryFile(name)
                    });
                }
            }

            // Store directory handle for future reference
            this.directoryHandles.set(structure.path, dirHandle);
            
            return structure;
        } catch (error) {
            console.error(`Failed to load directory structure for ${path}:`, error);
            return structure;
        }
    }

    // Get file information
    async getFileInfo(fileHandle) {
        try {
            const file = await fileHandle.getFile();
            return {
                size: file.size,
                lastModified: file.lastModified,
                type: file.type
            };
        } catch (error) {
            console.error('Failed to get file info:', error);
            return {
                size: 0,
                lastModified: null,
                type: 'unknown'
            };
        }
    }

    // Read file content
    async readFile(fileHandle, _encoding = 'utf-8') {
        try {
            const file = await fileHandle.getFile();
            
            if (this.isBinaryFile(file.name)) {
                return await file.arrayBuffer();
            }
            
            const content = await file.text();
            this.fileHandles.set(fileHandle.name, fileHandle);
            return content;
        } catch (error) {
            console.error('Failed to read file:', error);
            throw new Error(`Failed to read file: ${error.message}`);
        }
    }

    // Write file content
    async writeFile(fileHandle, content) {
        try {
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            
            this.fileHandles.set(fileHandle.name, fileHandle);
            return true;
        } catch (error) {
            console.error('Failed to write file:', error);
            throw new Error(`Failed to write file: ${error.message}`);
        }
    }

    // Create new file
    async createFile(fileName, content = '', parentPath = '') {
        try {
            const dirHandle = parentPath ? 
                this.directoryHandles.get(parentPath) : 
                this.currentDirectory;
            
            if (!dirHandle) {
                throw new Error('No directory handle available');
            }

            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            await this.writeFile(fileHandle, content);
            
            return {
                name: fileName,
                type: 'file',
                path: parentPath ? `${parentPath}/${fileName}` : fileName,
                handle: fileHandle,
                size: content.length,
                lastModified: Date.now(),
                extension: this.getFileExtension(fileName),
                isSupported: this.isFileSupported(fileName),
                isBinary: this.isBinaryFile(fileName)
            };
        } catch (error) {
            console.error('Failed to create file:', error);
            throw new Error(`Failed to create file: ${error.message}`);
        }
    }

    // Create new directory
    async createDirectory(dirName, parentPath = '') {
        try {
            const parentHandle = parentPath ? 
                this.directoryHandles.get(parentPath) : 
                this.currentDirectory;
            
            if (!parentHandle) {
                throw new Error('No parent directory handle available');
            }

            const dirHandle = await parentHandle.getDirectoryHandle(dirName, { create: true });
            const newPath = parentPath ? `${parentPath}/${dirName}` : dirName;
            
            this.directoryHandles.set(newPath, dirHandle);
            
            return {
                name: dirName,
                type: 'directory',
                path: newPath,
                handle: dirHandle,
                children: [],
                size: 0,
                lastModified: Date.now()
            };
        } catch (error) {
            console.error('Failed to create directory:', error);
            throw new Error(`Failed to create directory: ${error.message}`);
        }
    }

    // Delete file or directory
    async deleteEntry(path) {
        try {
            const pathParts = path.split('/');
            const name = pathParts.pop();
            const parentPath = pathParts.join('/');
            
            const parentHandle = parentPath ? 
                this.directoryHandles.get(parentPath) : 
                this.currentDirectory;
            
            if (!parentHandle) {
                throw new Error('No parent directory handle available');
            }

            await parentHandle.removeEntry(name, { recursive: true });
            
            // Clean up handles
            this.fileHandles.delete(name);
            this.directoryHandles.delete(path);
            
            return true;
        } catch (error) {
            console.error('Failed to delete entry:', error);
            throw new Error(`Failed to delete entry: ${error.message}`);
        }
    }

    // Rename file or directory
    async renameEntry(oldPath, newName) {
        try {
            // Note: File System Access API doesn't support direct renaming
            // We need to create a new file and delete the old one
            const pathParts = oldPath.split('/');
            const oldName = pathParts.pop();
            const parentPath = pathParts.join('/');
            
            const parentHandle = parentPath ? 
                this.directoryHandles.get(parentPath) : 
                this.currentDirectory;
            
            if (!parentHandle) {
                throw new Error('No parent directory handle available');
            }

            const oldHandle = await parentHandle.getFileHandle(oldName);
            const content = await this.readFile(oldHandle);
            
            // Create new file with new name
            const newHandle = await parentHandle.getFileHandle(newName, { create: true });
            await this.writeFile(newHandle, content);
            
            // Delete old file
            await parentHandle.removeEntry(oldName);
            
            // Update handles
            this.fileHandles.delete(oldName);
            this.fileHandles.set(newName, newHandle);
            
            return {
                name: newName,
                type: 'file',
                path: parentPath ? `${parentPath}/${newName}` : newName,
                handle: newHandle,
                size: content.length,
                lastModified: Date.now(),
                extension: this.getFileExtension(newName),
                isSupported: this.isFileSupported(newName),
                isBinary: this.isBinaryFile(newName)
            };
        } catch (error) {
            console.error('Failed to rename entry:', error);
            throw new Error(`Failed to rename entry: ${error.message}`);
        }
    }

    // Search for files in the project
    async searchFiles(query, structure = null) {
        if (!structure && !this.currentDirectory) {
            throw new Error('No project structure available');
        }

        const searchStructure = structure || await this.loadDirectoryStructure(this.currentDirectory);
        const results = [];

        const searchRecursive = (node) => {
            if (node.type === 'file') {
                if (node.name.toLowerCase().includes(query.toLowerCase())) {
                    results.push(node);
                }
            } else if (node.children) {
                node.children.forEach(searchRecursive);
            }
        };

        searchRecursive(searchStructure);
        return results;
    }

    // Get file extension
    getFileExtension(fileName) {
        const lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.slice(lastDot).toLowerCase() : '';
    }

    // Check if file is supported for editing
    isFileSupported(fileName) {
        const ext = this.getFileExtension(fileName);
        return this.supportedFormats.includes(ext);
    }

    // Check if file is binary
    isBinaryFile(fileName) {
        const ext = this.getFileExtension(fileName);
        return this.binaryFormats.includes(ext);
    }

    // Check if file should be ignored
    shouldIgnoreFile(fileName) {
        const ignorePatterns = [
            /^\./, // Hidden files
            /^node_modules$/,
            /^\.git$/,
            /^\.vscode$/,
            /^\.idea$/,
            /^dist$/,
            /^build$/,
            /^coverage$/,
            /^\.next$/,
            /^\.nuxt$/,
            /^\.cache$/,
            /^\.parcel-cache$/,
            /^\.DS_Store$/,
            /^Thumbs\.db$/,
            /^\.env$/,
            /^\.env\.local$/,
            /^\.env\.production$/,
            /^\.env\.development$/
        ];

        return ignorePatterns.some(pattern => pattern.test(fileName));
    }

    // Export project as ZIP
    async exportProject(projectName = 'project') {
        if (!this.currentDirectory) {
            throw new Error('No project loaded');
        }

        try {
            // Import JSZip dynamically
            const JSZip = (await import('jszip')).default;
            const { saveAs } = await import('file-saver');
            
            const zip = new JSZip();
            const structure = await this.loadDirectoryStructure(this.currentDirectory);
            
            const addToZip = async (node, folder) => {
                if (node.type === 'file' && node.isSupported) {
                    const content = await this.readFile(node.handle);
                    folder.file(node.name, content);
                } else if (node.type === 'directory' && node.children) {
                    const subFolder = folder.folder(node.name);
                    for (const child of node.children) {
                        await addToZip(child, subFolder);
                    }
                }
            };

            if (structure.children) {
                for (const child of structure.children) {
                    await addToZip(child, zip);
                }
            }

            const blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, `${projectName}.zip`);
            
            return true;
        } catch (error) {
            console.error('Failed to export project:', error);
            throw new Error(`Failed to export project: ${error.message}`);
        }
    }

    // Get project statistics
    async getProjectStats(structure = null) {
        if (!structure && !this.currentDirectory) {
            throw new Error('No project structure available');
        }

        const searchStructure = structure || await this.loadDirectoryStructure(this.currentDirectory);
        const stats = {
            totalFiles: 0,
            totalDirectories: 0,
            totalSize: 0,
            fileTypes: {},
            largestFile: null,
            lastModified: null
        };

        const calculateStats = (node) => {
            if (node.type === 'file') {
                stats.totalFiles++;
                stats.totalSize += node.size || 0;
                
                const ext = node.extension || 'no extension';
                stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
                
                if (!stats.largestFile || (node.size || 0) > (stats.largestFile.size || 0)) {
                    stats.largestFile = node;
                }
                
                if (!stats.lastModified || (node.lastModified || 0) > (stats.lastModified || 0)) {
                    stats.lastModified = node.lastModified;
                }
            } else if (node.type === 'directory') {
                stats.totalDirectories++;
                if (node.children) {
                    node.children.forEach(calculateStats);
                }
            }
        };

        calculateStats(searchStructure);
        return stats;
    }

    // Clear all handles and reset state
    clear() {
        this.currentDirectory = null;
        this.fileHandles.clear();
        this.directoryHandles.clear();
    }
}

// Create singleton instance
export const fileSystemManager = new FileSystemManager();
export default fileSystemManager;
