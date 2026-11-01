import React, { useState, useEffect } from 'react';
import { FolderOpen, Download, Upload, Folder, Plus, Trash2 } from 'lucide-react';

const ProjectManager = ({ 
    files, 
    setFiles, 
    currentFile: _currentFile,
    setCurrentFile, 
    onProjectChange 
}) => {
    const [projects, setProjects] = useState({});
    const [currentProject, setCurrentProject] = useState('default');
    const [showProjectManager, setShowProjectManager] = useState(false);

    // Load projects from localStorage
    useEffect(() => {
        const savedProjects = localStorage.getItem('kosher-ai-projects');
        if (savedProjects) {
            try {
                const parsed = JSON.parse(savedProjects);
                setProjects(parsed);
                
                // Set current project if it exists
                const savedCurrentProject = localStorage.getItem('kosher-ai-current-project');
                if (savedCurrentProject && parsed[savedCurrentProject]) {
                    setCurrentProject(savedCurrentProject);
                    setFiles(parsed[savedCurrentProject].files || { 'main.html': '' });
                }
            } catch (error) {
                console.error('Failed to load projects:', error);
            }
        } else {
            // Initialize with default project
            const defaultProject = {
                name: 'Default Project',
                files: { 'main.html': '' },
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };
            setProjects({ default: defaultProject });
        }
    }, [setFiles]);

    // Save projects to localStorage
    useEffect(() => {
        if (Object.keys(projects).length > 0) {
            localStorage.setItem('kosher-ai-projects', JSON.stringify(projects));
            localStorage.setItem('kosher-ai-current-project', currentProject);
        }
    }, [projects, currentProject]);

    // Update current project when files change
    useEffect(() => {
        if (!currentProject) return;
        setProjects(previous => {
            const project=previous[currentProject];
            if(!project||project.files===files)return previous;
            return {...previous,[currentProject]:{...project,files,lastModified:new Date().toISOString()}};
        });
    }, [files, currentProject]);

    const createNewProject = () => {
        const name = prompt('Enter project name:');
        if (name) {
            const projectId = Date.now().toString();
            const newProject = {
                name,
                files: { 'main.html': '' },
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };
            setProjects(prev => ({ ...prev, [projectId]: newProject }));
            setCurrentProject(projectId);
            setFiles(newProject.files);
            setCurrentFile('main.html');
            onProjectChange?.(projectId, newProject);
        }
    };

    const deleteProject = (projectId) => {
        if (Object.keys(projects).length > 1) {
            const confirmed = window.confirm('Are you sure you want to delete this project?');
            if (confirmed) {
                const newProjects = { ...projects };
                delete newProjects[projectId];
                setProjects(newProjects);
                
                if (currentProject === projectId) {
                    const firstProjectId = Object.keys(newProjects)[0];
                    setCurrentProject(firstProjectId);
                    setFiles(newProjects[firstProjectId].files);
                    setCurrentFile(Object.keys(newProjects[firstProjectId].files)[0]);
                }
            }
        }
    };

    const switchProject = (projectId) => {
        if (projects[projectId]) {
            setCurrentProject(projectId);
            setFiles(projects[projectId].files);
            setCurrentFile(Object.keys(projects[projectId].files)[0]);
            onProjectChange?.(projectId, projects[projectId]);
        }
    };

    const exportProject = () => {
        if (projects[currentProject]) {
            const project = projects[currentProject];
            const dataStr = JSON.stringify(project, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `${project.name.replace(/\s+/g, '_')}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        }
    };

    const importProject = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const project = JSON.parse(e.target.result);
                    const projectId = Date.now().toString();
                    setProjects(prev => ({ ...prev, [projectId]: project }));
                    setCurrentProject(projectId);
                    setFiles(project.files);
                    setCurrentFile(Object.keys(project.files)[0]);
                    onProjectChange?.(projectId, project);
                } catch (error) {
                    alert('Invalid project file');
                }
            };
            reader.readAsText(file);
        }
    };

    const getCurrentProjectName = () => {
        return projects[currentProject]?.name || 'Default Project';
    };

    return (
        <div className="border-b border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowProjectManager(!showProjectManager)}
                        className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-1 rounded transition-colors"
                    >
                        <FolderOpen size={16} />
                        <span className="text-sm font-medium">{getCurrentProjectName()}</span>
                    </button>
                    
                    {showProjectManager && (
                        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 min-w-64">
                            <div className="p-3 border-b border-gray-700">
                                <h3 className="text-sm font-medium text-gray-300 mb-2">Projects</h3>
                                <div className="space-y-1">
                                    {Object.entries(projects).map(([projectId, project]) => (
                                        <div
                                            key={projectId}
                                            className={`flex items-center justify-between p-2 rounded cursor-pointer group ${
                                                currentProject === projectId ? 'bg-gray-700' : 'hover:bg-gray-700'
                                            }`}
                                            onClick={() => switchProject(projectId)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Folder size={14} className="text-gray-400" />
                                                <span className="text-sm text-gray-300">{project.name}</span>
                                            </div>
                                            {Object.keys(projects).length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteProject(projectId);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 rounded"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={createNewProject}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                >
                                    <Plus size={14} />
                                    New Project
                                </button>
                                <button
                                    onClick={exportProject}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                >
                                    <Download size={14} />
                                    Export Project
                                </button>
                                <label className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors cursor-pointer">
                                    <Upload size={14} />
                                    Import Project
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={importProject}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                        {Object.keys(files).length} files
                    </span>
                    <span className="text-xs text-gray-400">
                        Modified: {new Date(projects[currentProject]?.lastModified || Date.now()).toLocaleTimeString()}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProjectManager;
