# Mench-ai Architecture Documentation

## System Overview

Mench-ai is built as a sophisticated, multi-layered AI tutoring platform with a focus on content safety and values alignment. The architecture follows a microservices pattern with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   LLM Gateway   │    │   External LLM  │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (OpenAI API)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │ Content Filter  │
         │              │ System          │
         │              └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         └──────────────┤ Persona Router  │
                        │ & Topic Engine  │
                        └─────────────────┘
```

## Core Components

### 1. LLM Gateway Service

**Location**: `backend/src/services/llmGateway.js`

The central hub that manages all AI interactions. Responsible for:
- Request/response handling with external LLM
- Prompt engineering and persona injection
- Token management and rate limiting
- Error handling and fallback strategies

**Key Methods**:
- `generateResponse()` - Main response generation
- `buildSystemPrompt()` - Persona-specific prompt creation
- `buildUserMessage()` - Context-aware message formatting

### 2. Content Filtering System

**Location**: `backend/src/services/contentFilter.js`

Multi-layered filtering system ensuring Torah-compliant content:

#### Input Filtering
- Keyword-based detection of inappropriate content
- Divine name validation (enforces use of "אלוקים")
- Message length and spam pattern detection
- Academic subject classification

#### Output Filtering  
- Post-generation content validation
- Automatic divine name correction
- Persona-specific content validation
- Response length optimization

**Filter Categories**:
- **Forbidden Content**: Profanity, inappropriate language
- **Gray Area Topics**: Celebrity, entertainment, politics
- **Academic Subjects**: Math, science, coding, English
- **Religious Content**: Halacha, ethics, Torah topics

### 3. Persona Router System

**Location**: `backend/src/services/personaRouter.js`

Intelligent routing between academic and religious modes:

#### Academic Persona: Ultra-Orthodox University Professor
- **Specialties**: Math, Science, English, Computer Coding
- **Approach**: Secular knowledge within Torah framework
- **Style**: Concise, clear, professorial

#### Religious Personas: Council of Rabbinic Figures
Each persona modeled after renowned Torah leaders:

| Persona | Focus | Style | Trigger Keywords |
|---------|-------|-------|------------------|
| Rabbi Matisyahu Salomon | Mussar, Ethics | Authoritative, Cautious | ethics, character, mussar |
| Rabbi Dovid Feinstein | Halacha, Humility | Concise, Decisive | halacha, law, ruling |
| Rabbi Yisachar Frand | Homiletics, Stories | Eloquent, Engaging | story, lesson, meaning |
| Rabbi Shmuel Kamenetsky | Contemporary Issues | Direct, Traditional | modern, contemporary |
| Rabbi Avraham Pam | Education, Character | Gentle, Encouraging | education, kindness |
| Rabbi Paysach Krohn | Storytelling | Narrative, Inspirational | inspiration, life |
| Rabbi Aaron Schechter | Talmudic Analysis | Scholarly, Analytical | talmud, analysis |

### 4. Topic Redirection Engine

**Location**: `backend/src/services/topicRedirection.js`

Sophisticated system for handling gray-area topics using few-shot learning:

#### Redirection Categories
- **Celebrity/Sports**: Redirects to universal principles of excellence
- **Entertainment**: Focuses on timeless themes and Torah perspectives  
- **Social Media**: Emphasizes meaningful connections and time management
- **Politics**: Channels toward academic analysis skills
- **Relationships**: Guides toward character development

#### Few-Shot Learning Examples
```javascript
{
  input: "Tell me about Michael Jordan",
  output: "While the focus here is on academic studies, the dedication required to excel in any field, such as professional sports, is certainly something we can learn from. The Sages teach us, 'chochma bagoyim taamin'—that we can recognize and appreciate wisdom wherever it is found."
}
```

## Frontend Architecture

### Component Structure

```
src/
├── app/                 # Next.js App Router
│   ├── page.tsx        # Main page
│   ├── layout.tsx      # Root layout
│   └── globals.css     # Global styles
├── components/         # React Components
│   ├── ChatInterface/  # Main chat UI
│   ├── CodePreview/    # Live code preview
│   ├── Header/         # Navigation
│   └── Footer/         # Footer
├── hooks/              # Custom React hooks
│   ├── useChat.ts      # Chat management
│   ├── useCodePreview.ts # Code preview logic
│   └── usePersona.ts   # Persona selection
└── utils/              # Utilities
    ├── api.ts          # API client
    ├── codeExport.ts   # Code export functionality
    └── constants.ts    # App constants
```

### State Management

The frontend uses React hooks and context for state management:

- **Chat State**: Message history, current conversation
- **Persona State**: Selected persona, mode switching
- **Code State**: Generated code, preview status
- **UI State**: Loading states, error handling

## Data Flow

### 1. User Input Processing
```
User Input → Input Validation → Topic Analysis → Persona Selection
```

### 2. Response Generation
```
Persona + Message → LLM Gateway → Content Generation → Output Filtering → User
```

### 3. Code Preview Flow
```
Generated Code → Syntax Parsing → Live Preview → Export Option
```

## Security Architecture

### 1. Input Sanitization
- XSS prevention through React's built-in escaping
- SQL injection prevention (no direct DB queries)
- Content validation before LLM processing

### 2. Rate Limiting
- IP-based rate limiting (100 requests/15 minutes)
- Session-based throttling
- API key protection

### 3. Content Security Policy
```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
})
```

### 4. Environment Variables
- API keys stored in environment variables
- No sensitive data in client-side code
- Separate development/production configurations

## Performance Considerations

### Backend Optimizations
- **Caching**: Response caching for common queries
- **Connection Pooling**: Efficient API connection management
- **Compression**: Gzip compression for responses
- **Monitoring**: Winston logging for performance tracking

### Frontend Optimizations
- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components

## Scalability Design

### Horizontal Scaling
- Stateless backend design
- Session data in external store (Redis ready)
- Load balancer configuration included

### Vertical Scaling
- Efficient memory usage
- Optimized database queries
- Resource monitoring and alerting

## Monitoring and Logging

### Backend Logging
```javascript
logger.info('Chat request processed', {
  messageLength: message.length,
  persona: selectedPersona.name,
  responseTime: Date.now() - startTime
});
```

### Frontend Analytics
- User interaction tracking
- Performance metrics
- Error boundary reporting

## API Design

### RESTful Endpoints
- `POST /api/chat` - Main chat endpoint
- `GET /api/personas` - Available personas
- `POST /api/session` - Session management
- `GET /api/health` - Health checks

### Request/Response Format
Consistent JSON structure with metadata:
```json
{
  "response": "Content here",
  "metadata": {
    "persona": "persona_name",
    "mode": "academic|religious",
    "timestamp": "ISO_date",
    "sessionId": "uuid"
  }
}
```

## Error Handling

### Graceful Degradation
- Fallback responses for API failures
- Local error boundaries in React
- User-friendly error messages
- Automatic retry mechanisms

### Error Categories
- **Validation Errors**: 400 status with details
- **Content Filtered**: 400 with educational message
- **System Errors**: 500 with generic message
- **Rate Limit**: 429 with retry information

## Future Architecture Considerations

### Potential Enhancements
- **Microservices**: Split services for better scalability
- **Event Sourcing**: Track all user interactions
- **Real-time Features**: WebSocket for live chat
- **ML Pipeline**: Custom content classification models
- **Multi-language**: Support for Hebrew interface

### Integration Points
- **Authentication**: User account system
- **Analytics**: Advanced usage tracking
- **Content Management**: Admin interface for personas
- **API Gateway**: Centralized request routing

---

This architecture provides a robust, scalable foundation for the Mench-ai platform while maintaining strict adherence to content safety and values alignment.