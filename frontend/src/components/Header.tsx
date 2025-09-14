'use client'

import { useState } from 'react'
import styled from 'styled-components'

const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
`

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const MenuButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f3f4f6;
  }

  svg {
    width: 24px;
    height: 24px;
    color: #374151;
  }
`

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const LogoText = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  
  .hebrew {
    color: #2563eb;
    font-size: 1.25rem;
  }
`

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #166534;
`

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
`

interface HeaderProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

export default function Header({ onMenuClick, sidebarOpen }: HeaderProps) {
  return (
    <HeaderContainer>
      <LeftSection>
        <MenuButton onClick={onMenuClick} aria-label="Toggle sidebar">
          {sidebarOpen ? (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </MenuButton>
        
        <Logo>
          <LogoText>
            Mench-ai <span className="hebrew">מענטש</span>
          </LogoText>
        </Logo>
      </LeftSection>

      <StatusIndicator>
        <StatusDot />
        <span>Kosher AI Active</span>
      </StatusIndicator>
    </HeaderContainer>
  )
}