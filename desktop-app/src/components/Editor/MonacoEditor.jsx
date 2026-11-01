import React, { useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';

const MonacoEditor = ({ 
    value, 
    onChange, 
    language = 'javascript',
    theme: _theme = 'vs-dark',
    options = {},
    onMount,
    onError: _onError,
    height = '100%',
    width = '100%'
}) => {
    const editorRef = useRef(null);
    const [, setIsEditorReady] = useState(false);

    const defaultOptions = {
        automaticLayout: true,
        fontSize: 14,
        lineNumbers: 'on',
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        insertSpaces: true,
        formatOnPaste: true,
        formatOnType: true,
        autoIndent: 'full',
        bracketPairColorization: { enabled: true },
        guides: {
            bracketPairs: true,
            indentation: true
        },
        suggest: {
            enableExtendedSuggestions: true,
            showKeywords: true,
            showSnippets: true
        },
        quickSuggestions: {
            other: true,
            comments: true,
            strings: true
        },
        parameterHints: { enabled: true },
        hover: { enabled: true },
        contextmenu: true,
        mouseWheelZoom: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: true,
        smoothScrolling: true,
        ...options
    };

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        setIsEditorReady(true);

        // Configure custom theme
        monaco.editor.defineTheme('kosher-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                { token: 'keyword', foreground: '569CD6' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'function', foreground: 'DCDCAA' },
                { token: 'variable', foreground: '9CDCFE' },
                { token: 'type', foreground: '4EC9B0' },
                { token: 'class', foreground: '4EC9B0' },
                { token: 'operator', foreground: 'D4D4D4' },
                { token: 'delimiter', foreground: 'D4D4D4' }
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editorLineNumber.foreground': '#858585',
                'editorLineNumber.activeForeground': '#c6c6c6',
                'editor.selectionBackground': '#264f78',
                'editor.inactiveSelectionBackground': '#3a3d41',
                'editor.selectionHighlightBackground': '#add6ff26',
                'editor.wordHighlightBackground': '#575757b8',
                'editor.wordHighlightStrongBackground': '#004972b8',
                'editor.findMatchBackground': '#515c6a',
                'editor.findMatchHighlightBackground': '#ea5c0055',
                'editor.hoverHighlightBackground': '#264f7840',
                'editorCursor.foreground': '#aeafad',
                'editorWhitespace.foreground': '#404040',
                'editorIndentGuide.background': '#404040',
                'editorIndentGuide.activeBackground': '#707070',
                'editorGroupHeader.tabsBackground': '#252526',
                'tab.activeBackground': '#1e1e1e',
                'tab.inactiveBackground': '#2d2d30',
                'tab.border': '#252526',
                'panel.background': '#1e1e1e',
                'sideBar.background': '#252526',
                'activityBar.background': '#333333'
            }
        });

        // Apply custom theme
        monaco.editor.setTheme('kosher-dark');

        // Setup language-specific features
        setupLanguageFeatures(monaco, language);

        // Setup keyboard shortcuts
        setupKeyboardShortcuts(editor, monaco);

        // Setup content assistance
        setupContentAssistance(editor, monaco);

        onMount?.(editor, monaco);
    };

    const setupLanguageFeatures = (monaco, language) => {
        // Enhanced completion provider
        monaco.languages.registerCompletionItemProvider(language, {
            triggerCharacters: ['.', '(', '"', "'", '<', '/', ' '],
            provideCompletionItems: (model, position) => {
                const textUntilPosition = model.getValueInRange({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                });

                const suggestions = getLanguageSpecificSuggestions(language, textUntilPosition, position);
                return { suggestions };
            }
        });

        // Enhanced hover provider
        monaco.languages.registerHoverProvider(language, {
            provideHover: (model, position) => {
                const word = model.getWordAtPosition(position);
                if (word) {
                    const hoverInfo = getHoverInfo(language, word.word);
                    if (hoverInfo) {
                        return {
                            range: new monaco.Range(
                                position.lineNumber, 
                                word.startColumn, 
                                position.lineNumber, 
                                word.endColumn
                            ),
                            contents: [{ value: hoverInfo }]
                        };
                    }
                }
                return null;
            }
        });

        // Code actions provider
        monaco.languages.registerCodeActionProvider(language, {
            provideCodeActions: (model, range, context) => {
                const actions = [];
                
                // Quick fixes based on language
                const quickFixes = getQuickFixes(language, model, range, context);
                actions.push(...quickFixes);

                return {
                    actions,
                    dispose: () => {}
                };
            }
        });

        // Signature help provider
        monaco.languages.registerSignatureHelpProvider(language, {
            signatureHelpTriggerCharacters: ['(', ','],
            provideSignatureHelp: (model, position) => {
                return getSignatureHelp(language, model, position);
            }
        });
    };

    const setupKeyboardShortcuts = (editor, monaco) => {
        // Format document
        editor.addAction({
            id: 'format-document',
            label: 'Format Document',
            keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
            run: () => {
                editor.getAction('editor.action.formatDocument').run();
            }
        });

        // Save file
        editor.addAction({
            id: 'save-file',
            label: 'Save File',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: () => {
                // Trigger save callback
                onChange?.(editor.getValue());
            }
        });

        // Quick command palette
        editor.addAction({
            id: 'command-palette',
            label: 'Command Palette',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP],
            run: () => {
                editor.trigger('', 'editor.action.quickCommand', '');
            }
        });

        // Toggle comment
        editor.addAction({
            id: 'toggle-comment',
            label: 'Toggle Comment',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash],
            run: () => {
                editor.getAction('editor.action.commentLine').run();
            }
        });
    };

    const setupContentAssistance = (editor, _monaco) => {
        // Auto-save functionality
        let saveTimeout;
        editor.onDidChangeModelContent(() => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                onChange?.(editor.getValue());
            }, 1000); // Auto-save after 1 second of inactivity
        });

        // Bracket matching
        editor.onDidChangeCursorPosition(() => {
            const position = editor.getPosition();
            const model = editor.getModel();
            const lineContent = model.getLineContent(position.lineNumber);
            const character = lineContent.charAt(position.column - 1);
            
            // Highlight matching brackets
            if (['(', ')', '[', ']', '{', '}'].includes(character)) {
                editor.trigger('', 'editor.action.jumpToBracket', '');
            }
        });
    };

    const getLanguageSpecificSuggestions = (language, _textUntilPosition, _position) => {
        const suggestions = [];
        const monaco = window.monaco;

        switch (language) {
            case 'javascript':
            case 'typescript':
                suggestions.push(
                    // Console methods
                    {
                        label: 'console.log',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'console.log(${1:value});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Outputs a message to the console'
                    },
                    {
                        label: 'console.error',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'console.error(${1:error});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Outputs an error message to the console'
                    },
                    // Function declaration
                    {
                        label: 'function',
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: 'function ${1:name}(${2:params}) {\n\t${0}\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Function declaration'
                    },
                    // Arrow function
                    {
                        label: 'arrow function',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '(${1:params}) => {\n\t${0}\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Arrow function'
                    },
                    // Array methods
                    {
                        label: 'forEach',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'forEach((${1:item}) => {\n\t${0}\n});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Executes a function for each array element'
                    },
                    {
                        label: 'map',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'map((${1:item}) => {\n\treturn ${0};\n});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Creates a new array with results of calling a function'
                    },
                    {
                        label: 'filter',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'filter((${1:item}) => ${0});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Creates a new array with elements that pass a test'
                    },
                    {
                        label: 'reduce',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'reduce((${1:acc}, ${2:item}) => {\n\treturn ${0};\n}, ${3:initial});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Reduces array to a single value'
                    }
                );
                break;

            case 'html':
                suggestions.push(
                    {
                        label: 'div',
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: '<div>${0}</div>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Generic container element'
                    },
                    {
                        label: 'span',
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: '<span>${0}</span>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Inline container element'
                    },
                    {
                        label: 'a',
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: '<a href="${1:url}">${0}</a>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Hyperlink element'
                    },
                    {
                        label: 'img',
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: '<img src="${1:url}" alt="${2:description}">',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Image element'
                    },
                    {
                        label: 'button',
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: '<button onclick="${1:function}">${0}</button>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Button element'
                    }
                );
                break;

            case 'css':
                suggestions.push(
                    {
                        label: 'display: flex',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Flexbox layout'
                    },
                    {
                        label: 'display: grid',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'display: grid;\ngrid-template-columns: ${1:repeat(auto-fit, minmax(300px, 1fr))};\ngap: ${2:1rem};',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'CSS Grid layout'
                    },
                    {
                        label: 'transition',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'transition: ${1:all} ${2:0.3s} ${3:ease};',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'CSS transition'
                    }
                );
                break;
        }

        return suggestions;
    };

    const getHoverInfo = (language, word) => {
        const hoverMaps = {
            javascript: {
                'console': '**Console Object** - Provides access to the browser\'s debugging console',
                'document': '**Document Object** - Represents the HTML document',
                'window': '**Window Object** - Represents the browser window',
                'setTimeout': '**setTimeout()** - Executes a function after a specified delay',
                'setInterval': '**setInterval()** - Repeatedly executes a function at specified intervals',
                'addEventListener': '**addEventListener()** - Attaches an event listener to an element'
            },
            html: {
                'div': '**div element** - Generic container for flow content',
                'span': '**span element** - Generic inline container',
                'img': '**img element** - Embeds an image',
                'a': '**a element** - Creates hyperlinks',
                'button': '**button element** - Represents a clickable button'
            },
            css: {
                'display': '**display property** - Sets the display behavior of an element',
                'position': '**position property** - Sets how an element is positioned',
                'margin': '**margin property** - Sets the outer margin of an element',
                'padding': '**padding property** - Sets the inner padding of an element',
                'flex': '**flex property** - Defines flexible length on flex items'
            }
        };

        return hoverMaps[language]?.[word] || null;
    };

    const getQuickFixes = (language, model, range, _context) => {
        const actions = [];
        
        // Add common quick fixes based on language
        if (language === 'javascript') {
            actions.push({
                title: 'Add console.log',
                kind: 'quickfix',
                edit: {
                    edits: [{
                        resource: model.uri,
                        edit: {
                            range: range,
                            text: `console.log('${model.getValueInRange(range)}');`
                        }
                    }]
                }
            });
        }

        return actions;
    };

    const getSignatureHelp = (language, model, position) => {
        // Basic signature help implementation
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1);
        
        if (beforeCursor.includes('console.log(')) {
            return {
                value: {
                    signatures: [{
                        label: 'console.log(data: any, ...optionalParams: any[]): void',
                        documentation: 'Outputs a message to the console',
                        parameters: [{
                            label: 'data',
                            documentation: 'The data to output'
                        }]
                    }],
                    activeSignature: 0,
                    activeParameter: 0
                },
                dispose: () => {}
            };
        }

        return null;
    };

    return (
        <Editor
            height={height}
            width={width}
            language={language}
            value={value}
            theme="kosher-dark"
            options={defaultOptions}
            onMount={handleEditorDidMount}
            onChange={onChange}
            loading={
                <div className="flex items-center justify-center h-full bg-gray-800 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading Editor...</span>
                </div>
            }
        />
    );
};

export default MonacoEditor;
