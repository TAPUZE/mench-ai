import './globals.css'
import { Inter } from 'next/font/google'
import { ReactNode } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Mench-ai - Kosher AI Academic Tutor',
  description: 'A world-class academic education in a kosher digital environment',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div id="app">
          {children}
        </div>
        <div id="modal-root"></div>
      </body>
    </html>
  )
}