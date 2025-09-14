# Mench-ai Workspace

This is the complete workspace for the Mench-ai project - a Blueprint for a Kosher AI Academic Tutor.

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TAPUZE/mench-ai.git
   cd mench-ai
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables:**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   
   # Frontend
   cp frontend/.env.example frontend/.env.local
   # Edit frontend/.env.local with your configuration
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

## Project Structure

```
mench-ai/
├── backend/              # Node.js/Express backend with LLM Gateway
│   ├── src/
│   │   ├── services/     # Core services (LLM, filtering, personas)
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Express middleware
│   │   └── utils/        # Utilities and helpers
│   └── package.json
├── frontend/             # Next.js React frontend
│   ├── src/
│   │   ├── app/          # Next.js 13+ app directory
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   └── utils/        # Frontend utilities
│   └── package.json
├── config/               # Configuration files
├── docs/                 # Documentation
└── package.json          # Root package.json with workspace scripts
```

## Features

### 🔒 Kosher AI Architecture
- **Bi-directional Content Filtering**: Input validation and output screening
- **Topic Steering and Redirection**: Sophisticated redirection for gray-area topics
- **Robust Guardrails**: Multi-layered safety system maintaining Torah values

### 🎓 Dual-Mode AI System
- **Academic Tutor**: Ultra-Orthodox University Professor persona
- **Religious Tutor**: Council of Rabbinic Personas for religious guidance

### 💻 Interactive Features
- **Live Code Preview**: Real-time rendering of HTML/CSS/JavaScript
- **Code Export**: Save work directly to local computer
- **Natural Conversation**: Clean, minimalist interface

## Technology Stack

### Backend
- **Runtime**: Node.js with Express
- **AI Integration**: OpenAI GPT-4 (configurable)
- **Content Filtering**: Custom NLP and rule-based systems
- **Security**: Helmet, CORS, rate limiting

### Frontend
- **Framework**: Next.js 14 with React 18
- **Styling**: Styled Components + CSS modules
- **Animations**: Framer Motion
- **Type Safety**: TypeScript

## Development

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
npm run test
```

## Environment Variables

### Backend (.env)
```
LLM_API_KEY=your_openai_api_key
LLM_MODEL=gpt-4-turbo-preview
PORT=3001
NODE_ENV=development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue on GitHub or contact the development team.

---

**Mench-ai** - Bringing excellence in secular academics within a Torah-aligned environment.