'use client'

import { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import CodePreview from './CodePreview'

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  gap: 1rem;
`

const WelcomeSection = styled.div`
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
`

const WelcomeTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 1rem 0;
  
  .hebrew {
    color: #2563eb;
    font-size: 1.75rem;
  }
`

const WelcomeSubtitle = styled.p`
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0 0 2rem 0;
  line-height: 1.6;
`

const SubjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
`

const SubjectCard = styled.button`
  padding: 1rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;

  &:hover {
    background: #e2e8f0;
    border-color: #cbd5e0;
    transform: translateY(-2px);
  }

  .icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    display: block;
  }

  .title {
    font-weight: 600;
    color: #2d3748;
    font-size: 0.875rem;
  }
`

const ChatMessages = styled.div`
  flex: 1;
  overflow: hidden;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
`

const ChatInputSection = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
`

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  metadata?: any
}

interface ChatInterfaceProps {
  sessionId: string | null
}

export default function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCodePreview, setShowCodePreview] = useState(false)
  const [codeContent, setCodeContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !sessionId) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId,
          context: {
            previousMessages: messages.slice(-3), // Last 3 messages for context
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
        metadata: data.metadata
      }

      setMessages(prev => [...prev, assistantMessage])

      // Check if response contains code
      if (containsCode(data.response)) {
        const extractedCode = extractCode(data.response)
        if (extractedCode) {
          setCodeContent(extractedCode)
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubjectClick = (subject: string) => {
    const prompts = {
      math: 'I need help with mathematics. Can you explain a concept or help me solve a problem?',
      science: 'I have a science question. Can you help me understand a scientific concept?',
      english: 'I need assistance with English language arts, writing, or literature.',
      coding: 'I want to learn programming. Can you teach me how to code?'
    }
    
    handleSendMessage(prompts[subject as keyof typeof prompts] || `Help me with ${subject}`)
  }

  const containsCode = (text: string): boolean => {
    return /```[\s\S]*```/.test(text) || 
           /<html|<div|<script|function |class |const |let |var /.test(text)
  }

  const extractCode = (text: string): string => {
    const codeBlockMatch = text.match(/```(?:html|css|javascript|js)?\n?([\s\S]*?)```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }
    
    // Simple heuristic for HTML content
    if (text.includes('<html') || text.includes('<!DOCTYPE')) {
      return text
    }
    
    return ''
  }

  const hasMessages = messages.length > 0

  return (
    <ChatContainer>
      {!hasMessages && (
        <WelcomeSection>
          <WelcomeTitle>
            Welcome to Mench-ai <span className="hebrew">מענטש</span>
          </WelcomeTitle>
          <WelcomeSubtitle>
            Your kosher AI academic tutor, providing world-class education within Torah values
          </WelcomeSubtitle>
          
          <SubjectGrid>
            <SubjectCard onClick={() => handleSubjectClick('math')}>
              <span className="icon">📊</span>
              <div className="title">Mathematics</div>
            </SubjectCard>
            <SubjectCard onClick={() => handleSubjectClick('science')}>
              <span className="icon">🔬</span>
              <div className="title">Science</div>
            </SubjectCard>
            <SubjectCard onClick={() => handleSubjectClick('english')}>
              <span className="icon">📚</span>
              <div className="title">English</div>
            </SubjectCard>
            <SubjectCard onClick={() => handleSubjectClick('coding')}>
              <span className="icon">💻</span>
              <div className="title">Coding</div>
            </SubjectCard>
          </SubjectGrid>
        </WelcomeSection>
      )}

      {hasMessages && (
        <ChatMessages>
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
            onShowCode={(code) => {
              setCodeContent(code)
              setShowCodePreview(true)
            }}
          />
          <div ref={messagesEndRef} />
        </ChatMessages>
      )}

      <ChatInputSection>
        <MessageInput 
          onSendMessage={handleSendMessage}
          disabled={isLoading || !sessionId}
          placeholder={
            !sessionId 
              ? 'Initializing session...' 
              : 'Ask me anything about Math, Science, English, or Coding...'
          }
        />
      </ChatInputSection>

      {showCodePreview && (
        <CodePreview
          code={codeContent}
          onClose={() => setShowCodePreview(false)}
        />
      )}
    </ChatContainer>
  )
}