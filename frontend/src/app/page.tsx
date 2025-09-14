'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '../components/ChatInterface'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import styled from 'styled-components'

const PageContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #fafafa;
`

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
  margin-left: ${props => props.sidebarOpen ? '280px' : '0'};

  @media (max-width: 768px) {
    margin-left: 0;
  }
`

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 1rem;
`

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    // Initialize session on page load
    initializeSession()
  }, [])

  const initializeSession = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setSessionId(data.sessionId)
      }
    } catch (error) {
      console.error('Failed to initialize session:', error)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <PageContainer>
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        sessionId={sessionId}
        onNewSession={initializeSession}
      />
      
      <MainContent sidebarOpen={sidebarOpen}>
        <Header 
          onMenuClick={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
        
        <ContentArea>
          <ChatInterface sessionId={sessionId} />
        </ContentArea>
      </MainContent>
    </PageContainer>
  )
}