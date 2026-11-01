import React, { useState, useEffect, useCallback } from 'react';
import { Package, Check, X, AlertCircle, RefreshCw, ExternalLink, Search, Trash2 } from 'lucide-react';

import { fileSystemManager } from '../../utils/fileSystemManager';

const findFileInProject = (node, fileName) => {
        if (node.name === fileName) {
            return node;
        }
        if (node.children) {
            for (const child of node.children) {
                const result = findFileInProject(child, fileName);
                if (result) return result;
            }
        }
        return null;
    };

const DependencyManager = ({ 
    projectStructure, 
    onInstallDependency, 
    onRemoveDependency,
    onClose,
    isOpen 
}) => {
    const [dependencies, setDependencies] = useState([]);
    const [devDependencies, setDevDependencies] = useState([]);
    const [missingDependencies, setMissingDependencies] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [installingPackages, setInstallingPackages] = useState(new Set());
    const [removingPackages, setRemovingPackages] = useState(new Set());



    const loadPackageJson = useCallback(async () => {
        try {
            const packageJsonFile = findFileInProject(projectStructure, 'package.json');
            if (packageJsonFile) {
                const content = await fileSystemManager.readFile(packageJsonFile.path);
                const packageJson = JSON.parse(content);
                setDependencies(Object.entries(packageJson.dependencies || {}));
                setDevDependencies(Object.entries(packageJson.devDependencies || {}));
            }
        } catch (error) {
            console.error('Error loading package.json:', error);
        }
    }, [projectStructure]);



    const scanForMissingDependencies = useCallback(async () => {
        // This would scan JavaScript/TypeScript files for import statements
        // and check if they're in package.json
        const missing = [];
        // Implementation would go here
        setMissingDependencies(missing);
    }, []);

    // Load package.json if it exists
    useEffect(() => {
        if (projectStructure && isOpen) {
            loadPackageJson();
            scanForMissingDependencies();
        }
    }, [projectStructure, isOpen, loadPackageJson, scanForMissingDependencies]);

    const searchNpmPackages = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // In a real implementation, this would call the npm registry API
            // For now, we'll simulate with common packages
            const mockResults = [
                {
                    name: query,
                    version: '1.0.0',
                    description: `Package for ${query}`,
                    keywords: ['javascript', 'utility']
                },
                {
                    name: `${query}-utils`,
                    version: '2.1.0',
                    description: `Utility functions for ${query}`,
                    keywords: ['utility', 'helper']
                },
                {
                    name: `react-${query}`,
                    version: '3.0.0',
                    description: `React components for ${query}`,
                    keywords: ['react', 'components']
                }
            ];
            
            setSearchResults(mockResults);
        } catch (error) {
            console.error('Error searching packages:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleInstallPackage = async (packageName, version = 'latest', isDev = false) => {
        setInstallingPackages(prev => new Set(prev).add(packageName));
        
        try {
            // In a real implementation, this would run npm install
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate install time
            
            if (isDev) {
                setDevDependencies(prev => [...prev, [packageName, version]]);
            } else {
                setDependencies(prev => [...prev, [packageName, version]]);
            }
            
            // Remove from missing if it was there
            setMissingDependencies(prev => prev.filter(dep => dep.name !== packageName));
            
            // Call parent handler
            if (onInstallDependency) {
                onInstallDependency(packageName, version, isDev);
            }
        } catch (error) {
            console.error('Error installing package:', error);
        } finally {
            setInstallingPackages(prev => {
                const newSet = new Set(prev);
                newSet.delete(packageName);
                return newSet;
            });
        }
    };

    const handleRemovePackage = async (packageName, isDev = false) => {
        setRemovingPackages(prev => new Set(prev).add(packageName));
        
        try {
            // In a real implementation, this would run npm uninstall
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate uninstall time
            
            if (isDev) {
                setDevDependencies(prev => prev.filter(([name]) => name !== packageName));
            } else {
                setDependencies(prev => prev.filter(([name]) => name !== packageName));
            }
            
            // Call parent handler
            if (onRemoveDependency) {
                onRemoveDependency(packageName, isDev);
            }
        } catch (error) {
            console.error('Error removing package:', error);
        } finally {
            setRemovingPackages(prev => {
                const newSet = new Set(prev);
                newSet.delete(packageName);
                return newSet;
            });
        }
    };

    const PackageItem = ({ name, version, isDev, canRemove = true }) => {

installingPackages.has(name);
        const isRemoving = removingPackages.has(name);
        
        return (
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                    <Package size={16} className="text-blue-400" />
                    <div>
                        <div className="font-medium text-white">{name}</div>
                        <div className="text-sm text-gray-400">
                            {version} {isDev && '(dev)'}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.open(`https://npmjs.com/package/${name}`, '_blank')}
                        className="p-1 text-gray-400 hover:text-white"
                        title="View on npm"
                    >
                        <ExternalLink size={14} />
                    </button>
                    
                    {canRemove && (
                        <button
                            onClick={() => handleRemovePackage(name, isDev)}
                            disabled={isRemoving}
                            className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                            title="Remove package"
                        >
                            {isRemoving ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <Trash2 size={14} />
                            )}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const SearchResultItem = ({ pkg }) => {
        const isInstalling = installingPackages.has(pkg.name);
        const isInstalled = dependencies.some(([name]) => name === pkg.name) || 
                           devDependencies.some(([name]) => name === pkg.name);
        
        return (
            <div className="p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-white">{pkg.name}</div>
                    <div className="text-sm text-gray-400">v{pkg.version}</div>
                </div>
                
                <div className="text-sm text-gray-300 mb-3">{pkg.description}</div>
                
                <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                        {pkg.keywords?.slice(0, 3).map(keyword => (
                            <span key={keyword} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">
                                {keyword}
                            </span>
                        ))}
                    </div>
                    
                    <div className="flex gap-2">
                        {!isInstalled && (
                            <>
                                <button
                                    onClick={() => handleInstallPackage(pkg.name, pkg.version, true)}
                                    disabled={isInstalling}
                                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                                >
                                    {isInstalling ? (
                                        <RefreshCw size={12} className="animate-spin" />
                                    ) : (
                                        'Dev'
                                    )}
                                </button>
                                
                                <button
                                    onClick={() => handleInstallPackage(pkg.name, pkg.version, false)}
                                    disabled={isInstalling}
                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
                                >
                                    {isInstalling ? (
                                        <RefreshCw size={12} className="animate-spin" />
                                    ) : (
                                        'Install'
                                    )}
                                </button>
                            </>
                        )}
                        
                        {isInstalled && (
                            <div className="flex items-center gap-1 text-green-400">
                                <Check size={12} />
                                <span className="text-xs">Installed</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <Package size={20} className="text-blue-400" />
                        <h2 className="text-xl font-semibold text-white">Dependency Manager</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel - Current Dependencies */}
                    <div className="w-1/2 p-4 border-r border-gray-700 overflow-y-auto">
                        <h3 className="text-lg font-medium text-white mb-4">Installed Packages</h3>
                        
                        {/* Missing Dependencies Warning */}
                        {missingDependencies.length > 0 && (
                            <div className="mb-4 p-3 bg-yellow-900 border border-yellow-600 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle size={16} className="text-yellow-400" />
                                    <span className="text-yellow-400 font-medium">Missing Dependencies</span>
                                </div>
                                <div className="space-y-2">
                                    {missingDependencies.map(dep => (
                                        <div key={dep.name} className="flex items-center justify-between">
                                            <span className="text-yellow-300">{dep.name}</span>
                                            <button
                                                onClick={() => handleInstallPackage(dep.name)}
                                                className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-500"
                                            >
                                                Install
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Dependencies */}
                        <div className="space-y-2 mb-6">
                            <h4 className="text-sm font-medium text-gray-300">Dependencies</h4>
                            {dependencies.length > 0 ? (
                                dependencies.map(([name, version]) => (
                                    <PackageItem key={name} name={name} version={version} isDev={false} />
                                ))
                            ) : (
                                <div className="text-gray-400 text-sm">No dependencies installed</div>
                            )}
                        </div>

                        {/* Dev Dependencies */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-300">Dev Dependencies</h4>
                            {devDependencies.length > 0 ? (
                                devDependencies.map(([name, version]) => (
                                    <PackageItem key={name} name={name} version={version} isDev={true} />
                                ))
                            ) : (
                                <div className="text-gray-400 text-sm">No dev dependencies installed</div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Search and Install */}
                    <div className="w-1/2 p-4 overflow-y-auto">
                        <h3 className="text-lg font-medium text-white mb-4">Add Packages</h3>
                        
                        {/* Search */}
                        <div className="mb-4">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search npm packages..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        searchNpmPackages(e.target.value);
                                    }}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Search Results */}
                        <div className="space-y-3">
                            {isSearching ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw size={20} className="animate-spin text-blue-400" />
                                    <span className="ml-2 text-gray-400">Searching...</span>
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(pkg => (
                                    <SearchResultItem key={pkg.name} pkg={pkg} />
                                ))
                            ) : searchQuery ? (
                                <div className="text-center py-8 text-gray-400">
                                    No packages found for "{searchQuery}"
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    Start typing to search for packages
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DependencyManager;
