# Mench-ai Development Setup Guide

This guide will help you set up the Mench-ai workspace for development.

## Prerequisites

- **Node.js 18+** and **npm 8+**
- **Git** for version control
- **OpenAI API Key** (or compatible LLM API)
- **VS Code** (recommended) with recommended extensions

## Quick Setup

### 1. Clone and Install
```bash
git clone https://github.com/TAPUZE/mench-ai.git
cd mench-ai
npm run setup
```

### 2. Configure Environment
Edit the created environment files:

**Backend** (`backend/.env`):
```env
LLM_API_KEY=your_openai_api_key_here
LLM_MODEL=gpt-4-turbo-preview
PORT=3001
NODE_ENV=development
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_CODE_PREVIEW=true
```

### 3. Start Development
```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 3000) servers.

## Development Workflow

### Backend Development
```bash
cd backend
npm run dev    # Start with nodemon
npm test       # Run tests
npm run lint   # Check code style
```

### Frontend Development  
```bash
cd frontend
npm run dev    # Start Next.js dev server
npm run build  # Build for production
npm test       # Run tests
```

### Full Stack Development
```bash
npm run dev    # Start both servers
npm run test   # Run all tests
npm run build  # Build everything
```

## Project Structure Deep Dive

### Backend (`/backend`)
- **`src/services/`** - Core business logic
  - `llmGateway.js` - LLM integration and request handling
  - `contentFilter.js` - Input/output validation and filtering
  - `personaRouter.js` - AI persona selection and management
  - `topicRedirection.js` - Gray-area topic handling
- **`src/routes/`** - API endpoints
- **`src/middleware/`** - Express middleware
- **`src/utils/`** - Utilities and helpers

### Frontend (`/frontend`)
- **`src/app/`** - Next.js 13+ app directory
- **`src/components/`** - React components
  - `ChatInterface/` - Main chat UI
  - `CodePreview/` - Live code preview system
  - `PersonaSelector/` - Persona switching UI
- **`src/hooks/`** - Custom React hooks
- **`src/utils/`** - Frontend utilities

## API Documentation

### Chat Endpoint
```http
POST /api/chat
Content-Type: application/json

{
  "message": "Explain calculus",
  "sessionId": "uuid",
  "context": {
    "subject": "mathematics"
  }
}
```

### Response Format
```json
{
  "response": "Calculus is the mathematical study...",
  "metadata": {
    "persona": "Ultra-Orthodox University Professor",
    "mode": "academic",
    "wasRedirected": false,
    "sessionId": "uuid",
    "timestamp": "2025-09-15T10:30:00Z"
  }
}
```

## Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test contentFilter     # Test specific module
```

### Frontend Tests
```bash
cd frontend  
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm run test:coverage      # With coverage
```

## Code Quality

### Linting
```bash
npm run lint              # Lint everything
npm run lint:fix          # Auto-fix issues
```

### Pre-commit Hooks
The project uses Husky for pre-commit hooks:
- Lint check
- Test run
- Type checking

## Environment Variables Reference

### Backend Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_API_KEY` | OpenAI API key | Required |
| `LLM_MODEL` | Model to use | `gpt-4-turbo-preview` |
| `PORT` | Server port | `3001` |
| `LOG_LEVEL` | Logging level | `info` |

### Frontend Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend URL | `http://localhost:3001` |
| `NEXT_PUBLIC_ENABLE_CODE_PREVIEW` | Enable code preview | `true` |
| `NEXT_PUBLIC_MAX_MESSAGE_LENGTH` | Max message length | `4000` |

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Docker
```bash
npm run docker:build
npm run docker:up
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 3001
npx kill-port 3001
```

**Dependencies issues:**
```bash
npm run clean    # Clean all node_modules
npm run reset    # Clean and reinstall
```

**TypeScript errors:**
```bash
cd frontend
npx tsc --noEmit    # Type check only
```

### Health Checks
```bash
npm run check:health    # Check backend health
curl http://localhost:3001/api/health
```

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes
4. **Test** thoroughly: `npm run test`
5. **Commit** with clear messages
6. **Push** and create a **Pull Request**

### Commit Messages
Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes  
- `docs:` Documentation
- `style:` Code style
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

## VS Code Setup

Recommended extensions:
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/TAPUZE/mench-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TAPUZE/mench-ai/discussions)
- **Documentation**: `/docs` folder

---

Happy coding! 🚀