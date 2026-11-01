import { useEffect, useCallback } from 'react';

// Keyboard shortcuts for the IDE
const useKeyboardShortcuts = ({
    onSave,
    onOpen,
    onRun,
    onToggleTerminal,
    onToggleDependencies,
    onToggleExplorer,
    onNewFile,
    onCloseFile,
    onFocusEditor,
    onTogglePreview,
    isEnabled = true
}) => {
    const handleKeyDown = useCallback((event) => {
        if (!isEnabled) return;

        const { ctrlKey, shiftKey, key, metaKey } = event;
        const isCtrlOrCmd = ctrlKey || metaKey;

        // Prevent default for handled shortcuts
        let preventDefault = false;

        // File operations
        if (isCtrlOrCmd && key === 's') {
            preventDefault = true;
            onSave?.();
        } else if (isCtrlOrCmd && key === 'o') {
            preventDefault = true;
            onOpen?.();
        } else if (isCtrlOrCmd && key === 'n') {
            preventDefault = true;
            onNewFile?.();
        } else if (isCtrlOrCmd && key === 'w') {
            preventDefault = true;
            onCloseFile?.();
        }
        
        // Execution
        else if (key === 'F5' || (isCtrlOrCmd && key === 'r')) {
            preventDefault = true;
            onRun?.();
        }
        
        // Panel toggles
        else if (isCtrlOrCmd && key === '`') {
            preventDefault = true;
            onToggleTerminal?.();
        } else if (isCtrlOrCmd && shiftKey && key === 'P') {
            preventDefault = true;
            onToggleDependencies?.();
        } else if (isCtrlOrCmd && shiftKey && key === 'E') {
            preventDefault = true;
            onToggleExplorer?.();
        }
        
        // View toggles
        else if (isCtrlOrCmd && shiftKey && key === 'V') {
            preventDefault = true;
            onTogglePreview?.();
        }
        
        // Editor focus
        else if (isCtrlOrCmd && key === '1') {
            preventDefault = true;
            onFocusEditor?.();
        }
        
        // Quick actions
        else if (key === 'F1') {
            preventDefault = true;
            showShortcutsHelp();
        }

        if (preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, [
        isEnabled,
        onSave,
        onOpen,
        onRun,
        onToggleTerminal,
        onToggleDependencies,
        onToggleExplorer,
        onNewFile,
        onCloseFile,
        onFocusEditor,
        onTogglePreview
    ]);

    const showShortcutsHelp = () => {
        const shortcuts = [
            { key: 'Ctrl+S', description: 'Save current file' },
            { key: 'Ctrl+O', description: 'Open folder' },
            { key: 'Ctrl+N', description: 'New file' },
            { key: 'Ctrl+W', description: 'Close file' },
            { key: 'F5 / Ctrl+R', description: 'Run project' },
            { key: 'Ctrl+`', description: 'Toggle terminal' },
            { key: 'Ctrl+Shift+P', description: 'Toggle dependencies' },
            { key: 'Ctrl+Shift+E', description: 'Toggle explorer' },
            { key: 'Ctrl+Shift+V', description: 'Toggle preview' },
            { key: 'Ctrl+1', description: 'Focus editor' },
            { key: 'F1', description: 'Show shortcuts help' }
        ];

        const helpText = shortcuts
            .map(shortcut => `${shortcut.key}: ${shortcut.description}`)
            .join('\n');

        alert(`Keyboard Shortcuts:\n\n${helpText}`);
    };

    useEffect(() => {
        if (isEnabled) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [handleKeyDown, isEnabled]);

    return { showShortcutsHelp };
};

export default useKeyboardShortcuts;
