'use client'

import { useState, useEffect } from 'react'
import styled from 'styled-components'

const SidebarContainer = styled.aside`
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100vh;
  background: white;
  border-right: 1px solid #e5e7eb;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  transform: translateX(${props => props.isOpen ? '0' : '-100%'});
  transition: transform 0.3s ease;
  z-index: 1000;
  overflow-y: auto;

  @media (max-width: 768px) {
    width: 100%;
  }
`

const SidebarHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`

const SidebarTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
`

const SidebarSubtitle = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
`

const SidebarContent = styled.div`
  padding: 1rem;
`

const Section = styled.div`
  margin-bottom: 2rem;
`

const SectionTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const PersonaList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const PersonaItem = styled.div`
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: ${props => props.active ? '#eff6ff' : 'white'};
  border-color: ${props => props.active ? '#3b82f6' : '#e5e7eb'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
`

const PersonaName = styled.div`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
`

const PersonaDescription = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
`

const PersonaBadge = styled.span`
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: ${props => props.mode === 'academic' ? '#dbeafe' : '#fef3c7'};
  color: ${props => props.mode === 'academic' ? '#1e40af' : '#92400e'};
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  margin-top: 0.5rem;
`

const ActionButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`

const SecondaryButton = styled(ActionButton)`
  background: #6b7280;

  &:hover {
    background: #4b5563;
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }

  @media (min-width: 769px) {
    display: none;
  }
`

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string | null
  onNewSession: () => void
}

export default function Sidebar({ isOpen, onClose, sessionId, onNewSession }: SidebarProps) {
  const [personas, setPersonas] = useState([])
  const [activePersona, setActivePersona] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchPersonas()
    }
  }, [isOpen])

  const fetchPersonas = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/personas`)
      if (response.ok) {
        const data = await response.json()
        setPersonas(data.personas || [])
      }
    } catch (error) {
      console.error('Failed to fetch personas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewSession = async () => {
    setLoading(true)
    try {
      await onNewSession()
      setActivePersona(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClearSession = async () => {
    if (!sessionId) return
    
    try {
      setLoading(true)
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/session/${sessionId}`, {
        method: 'DELETE'
      })
      await onNewSession()
      setActivePersona(null)
    } catch (error) {
      console.error('Failed to clear session:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <SidebarContainer isOpen={isOpen}>
      <CloseButton onClick={onClose} aria-label="Close sidebar">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </CloseButton>

      <SidebarHeader>
        <SidebarTitle>Digital Bais Medrash</SidebarTitle>
        <SidebarSubtitle>
          Excellence in secular academics within Torah values
        </SidebarSubtitle>
      </SidebarHeader>

      <SidebarContent>
        <Section>
          <SectionTitle>Session</SectionTitle>
          <ActionButton onClick={handleNewSession} disabled={loading}>
            {loading ? 'Starting...' : 'New Conversation'}
          </ActionButton>
          <SecondaryButton onClick={handleClearSession} disabled={loading || !sessionId}>
            Clear History
          </SecondaryButton>
        </Section>

        <Section>
          <SectionTitle>Available Tutors</SectionTitle>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Loading personas...
            </div>
          ) : (
            <PersonaList>
              {personas.map((persona, index) => (
                <PersonaItem
                  key={index}
                  active={activePersona === persona.name}
                  onClick={() => setActivePersona(persona.name)}
                >
                  <PersonaName>{persona.name}</PersonaName>
                  <PersonaDescription>{persona.description}</PersonaDescription>
                  <PersonaBadge mode={persona.mode}>
                    {persona.mode}
                  </PersonaBadge>
                </PersonaItem>
              ))}
            </PersonaList>
          )}
        </Section>

        <Section>
          <SectionTitle>About</SectionTitle>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
            <p style={{ marginBottom: '0.75rem' }}>
              Mench-ai provides world-class academic tutoring while maintaining the highest standards of Torah values.
            </p>
            <p>
              All interactions are filtered through our Kosher AI architecture to ensure a safe and appropriate learning environment.
            </p>
          </div>
        </Section>
      </SidebarContent>
    </SidebarContainer>
  )
}