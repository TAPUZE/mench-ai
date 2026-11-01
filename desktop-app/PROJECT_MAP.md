# Kosher AI Project Map
**Created:** July 8, 2025  
**Last Updated:** July 8, 2025

## 🎯 Project Overview
**Kosher AI** is a sophisticated React-based AI chat application specifically designed for Orthodox Jewish communities. It integrates Google's Gemini AI with religious sensitivity, content filtering, and comprehensive response management.

## 🏗️ Architecture Overview

### Core Technology Stack
- **Frontend**: React 18.2.0 with Vite build system
- **Styling**: Tailwind CSS 3.3.6 with PostCSS
- **AI Integration**: Google Gemini API (2.5 Flash, 2.5 Pro, 2.0 Flash Experimental)
- **State Management**: React useState/useEffect with localStorage persistence
- **Markdown**: Marked.js for rich text rendering
- **Icons**: Lucide React icons

### Key Features
1. **Religious-Aware AI**: Contextual personas (Rabbi, Religious Mathematician, Religious Developer, etc.)
2. **Dual-Mode Interface**: Chat mode and Canvas mode for code editing
3. **Multi-Language Support**: Hebrew (RTL) and English
4. **Response Reporting System**: User feedback and content moderation
5. **Canvas Management**: Code editing with history and persistence
6. **Safety Instructions**: Comprehensive content filtering and religious guidelines

## 📁 Project Structure

```
Kosher AI/
├── 📄 Configuration Files
│   ├── package.json - Dependencies and scripts
│   ├── index.html - Main HTML entry point
│   ├── vite.config.js - Vite configuration
│   ├── tailwind.config.js - Tailwind CSS configuration
│   └── postcss.config.js - PostCSS configuration
│
├── 📚 Documentation
│   ├── PROJECT_MAP.md - This comprehensive project map
│   ├── CANVAS_MANAGEMENT_SUMMARY.md - Canvas system documentation
│   ├── RESPONSE_REPORTING_SYSTEM.md - Reporting system documentation
│   ├── CANVAS_TEST.md - Canvas testing procedures
│   ├── test-cases.md - AI response test cases
│   └── test-interface.html - Manual testing interface
│
├── 🎨 Source Code (src/)
│   ├── main.jsx - React app entry point
│   ├── App.jsx - Main application component (844 lines)
│   ├── index.css - Global styles (Tailwind imports)
│   │
│   ├── 📂 constants/
│   │   ├── models.js - AI model configurations
│   │   ├── safetyInstruction.js - Religious AI safety guidelines (90 lines)
│   │   └── translations.js - English/Hebrew translations (293 lines)
│   │
│   ├── 📂 utils/
│   │   └── helpers.js - Utility functions (94 lines)
│   │
│   ├── 📂 hooks/
│   │   └── useResponseReporting.js - Response reporting logic (232 lines)
│   │
│   └── 📂 components/
│       ├── 🎯 Core UI Components
│       │   ├── Header.jsx - Top navigation bar
│       │   ├── Sidebar.jsx - Left navigation panel
│       │   ├── ChatArea.jsx - Main chat display
│       │   ├── ChatInput.jsx - Message input interface
│       │   └── ChatSidebar.jsx - Chat sidebar for canvas mode
│       │
│       ├── 🎨 Canvas System
│       │   ├── EnhancedCanvasView.jsx - Advanced code editor (1053 lines)
│       │   ├── CanvasManager.jsx - Canvas management interface
│       │   ├── CanvasView.jsx - Basic canvas view
│       │   ├── ProjectManager.jsx - Project management tools
│       │   └── ResizablePanel.jsx - Resizable UI panels
│       │
│       ├── 🚩 Reporting System
│       │   ├── ResponseReporter.jsx - Report submission modal
│       │   ├── ReportButton.jsx - Inline report button
│       │   └── ReportManager.jsx - Admin report management
│       │
│       └── 📂 modals/
│           ├── SettingsModal.jsx - Settings configuration
│           ├── ImageGeneratorModal.jsx - AI image generation
│           ├── WelcomeModal.jsx - First-time user welcome
│           └── TourModal.jsx - Feature tour guide
│
└── 🧪 External Files
    ├── kosherai - Additional project files
    └── test-interface.html - Manual testing interface
```

## 🔧 Core Components Deep Dive

### 1. App.jsx (Main Application)
**Purpose**: Central application orchestration and state management
**Key Features**:
- Chat history management with localStorage persistence
- Canvas mode switching and management
- AI API integration with Google Gemini
- Multi-language support (Hebrew RTL/English)
- Response reporting integration
- File upload and image generation
- Tour and welcome system

**State Management**:
- `currentChat`: Active conversation messages
- `chatHistory`: All conversation history
- `canvasContent`: Active canvas code content
- `canvasHistory`: Saved canvas versions
- `apiKey`: User's Gemini API key
- `selectedModel`: Active AI model
- `language`: Interface language (en/he)

### 2. EnhancedCanvasView.jsx (Code Editor)
**Purpose**: Advanced code editing and preview system
**Key Features**:
- Multi-language syntax highlighting
- Live HTML preview with responsive modes
- File management system
- Search and replace functionality
- Code formatting and auto-completion
- Theme support (light/dark/monokai)
- Export and import capabilities

**Supported Languages**: HTML, JavaScript, CSS, JSON, Text

### 3. Response Reporting System
**Components**: ResponseReporter.jsx, ReportButton.jsx, ReportManager.jsx
**Purpose**: User feedback and content moderation
**Key Features**:
- Categorized report types (inappropriate, inaccurate, offensive, etc.)
- Text selection for specific feedback
- Report analytics and pattern detection
- Export functionality for analysis
- Privacy-focused local storage

### 4. Religious Safety System
**File**: constants/safetyInstruction.js
**Purpose**: Ensures AI responses maintain religious sensitivity
**Key Features**:
- Subject-specific religious personas
- Hebrew sacred name filtering
- Content restrictions (sports, entertainment, profanity)
- Dvar Torah alternatives to inappropriate requests
- Orthodox Jewish theological perspective

## 🎯 Key Functionality

### AI Integration
- **Models**: Gemini 2.5 Flash (default), 2.5 Pro, 2.0 Flash Experimental
- **API**: Google Generative Language API
- **Safety**: Comprehensive religious content filtering
- **Personas**: Context-aware religious expert responses

### Canvas Management
- **Mode Switching**: Seamless chat-to-canvas transitions
- **History**: Persistent canvas version history
- **Append/Replace**: User-controlled content update modes
- **Export**: Download code in various formats

### Multi-Language Support
- **Languages**: English, Hebrew (עברית)
- **RTL Support**: Proper right-to-left text rendering
- **Context-Aware**: Hebrew triggers Orthodox Rabbi persona
- **Comprehensive**: 293 lines of translations

### Data Persistence
- **localStorage Keys**:
  - `gemini-chat-history`: Chat conversation history
  - `gemini-current-chat-id`: Active chat identifier
  - `gemini-api-key`: User's API key
  - `kosher-ai-language`: Interface language preference
  - `kosher-ai-selected-model`: Selected AI model
  - `kosher-ai-canvas-history`: Canvas version history
  - `kosher-ai-reports`: User submitted reports
  - `kosher-ai-reporting-settings`: Reporting preferences

## 🔍 Testing Framework

### Manual Testing
- **test-interface.html**: Comprehensive testing interface
- **test-cases.md**: 124 test scenarios covering all personas
- **Categories**: Mathematics, Science, Programming, Religious, History, Literature

### Test Coverage
- Religious persona verification
- Content filtering validation
- Multi-language functionality
- Canvas system operations
- Response reporting workflow

## 🚀 Development Workflow

### Scripts (package.json)
- `npm run dev`: Development server (Vite)
- `npm run build`: Production build
- `npm run lint`: ESLint code quality check
- `npm run preview`: Preview production build

### Hot Reload
- Vite-powered development server
- Instant updates on file changes
- Port 3000 with host binding

## 🔒 Security & Privacy

### API Security
- Client-side API key storage only
- No server-side key transmission
- Local storage encryption ready

### Content Safety
- Comprehensive content filtering
- Religious sensitivity validation
- User feedback integration
- Pattern-based problem detection

### Privacy Protection
- Local-first data storage
- Optional server report submission
- GDPR-compliant data handling
- Clear privacy notices

## 🎨 UI/UX Design

### Design System
- **Colors**: Dark theme (gray-900 background, blue accents)
- **Typography**: System fonts with Hebrew support
- **Layout**: Responsive sidebar + main content
- **Interactions**: Smooth transitions and hover effects

### Accessibility
- RTL language support
- Keyboard navigation
- Screen reader compatibility
- High contrast modes

## 📊 Current Status

### ✅ Completed Features
- Core chat functionality
- Canvas management system
- Response reporting system
- Multi-language support
- Religious safety instructions
- Local storage persistence
- Testing framework

### 🔄 In Progress
- User experience optimization
- Performance improvements
- Additional canvas features

### 🎯 Future Enhancements
- Server-side report processing
- Advanced AI model integration
- Community features
- Mobile app development

## 🔧 Development Notes

### Recent Updates
- Canvas management system implemented
- Response reporting system integrated
- Enhanced safety instructions
- Comprehensive testing framework

### Known Issues
- None currently identified
- Comprehensive testing needed

### Performance Considerations
- localStorage size management
- Canvas content optimization
- API rate limiting
- Memory usage monitoring

## 📝 Maintenance Guidelines

### Code Quality
- ESLint configuration active
- Component-based architecture
- Comprehensive documentation
- Test-driven development

### Updates Required
- Regular dependency updates
- Security patch management
- Feature enhancement integration
- User feedback incorporation

---

**This project map serves as the central reference for all development activities. Update this file whenever significant changes are made to the project structure or functionality.**

**For specific implementation details, refer to the individual component files and documentation files listed in this map.**
