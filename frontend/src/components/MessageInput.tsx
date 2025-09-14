'use client'

import { useState } from 'react'
import styled from 'styled-components'

const InputContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
`

const InputWrapper = styled.div`
  flex: 1;
  position: relative;
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 60px;
  max-height: 200px;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #2563eb;
  }

  &:disabled {
    background-color: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #9ca3af;
  }
`

const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 24px;
    height: 24px;
  }
`

const CharacterCount = styled.div`
  position: absolute;
  bottom: -1.5rem;
  right: 0;
  font-size: 0.75rem;
  color: #6b7280;
`

interface MessageInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message..." 
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const maxLength = 4000

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setMessage(value)
    }
  }

  const isOverLimit = message.length >= maxLength * 0.9
  const canSend = message.trim().length > 0 && !disabled

  return (
    <form onSubmit={handleSubmit}>
      <InputContainer>
        <InputWrapper>
          <TextArea
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
          />
          <CharacterCount style={{ color: isOverLimit ? '#ef4444' : '#6b7280' }}>
            {message.length}/{maxLength}
          </CharacterCount>
        </InputWrapper>
        
        <SendButton 
          type="submit" 
          disabled={!canSend}
          aria-label="Send message"
        >
          <svg 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
            />
          </svg>
        </SendButton>
      </InputContainer>
    </form>
  )
}