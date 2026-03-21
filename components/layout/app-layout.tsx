'use client'

import { Sidebar } from './sidebar'
import { SidebarProvider, useSidebar } from '@/lib/sidebar-context'
import { Chat } from '@/lib/types'
import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { PanelLeft } from 'lucide-react'

interface AppLayoutProps {
  children: ReactNode
  chats?: Chat[]
  onNewChat?: () => void
  onDeleteChat?: (chatId: string) => void
}

function MainContent({ children }: { children: ReactNode }) {
  const { open, toggle } = useSidebar()
  const pathname = usePathname()
  // AI builder chat pages have their own sidebar toggle in the top bar
  const isAiBuilderChat = pathname.startsWith('/ai-builder/')
  return (
    <div className="flex flex-1 flex-col overflow-hidden relative">
      {!open && !isAiBuilderChat && (
        <button
          onClick={toggle}
          className="absolute top-3 left-3 z-20 rounded-lg p-2 text-foreground/40 hover:bg-foreground/[0.04] hover:text-foreground/70 transition-colors"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}

export function AppLayout({ children, chats, onNewChat, onDeleteChat }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar chats={chats} onNewChat={onNewChat} onDeleteChat={onDeleteChat} />
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  )
}
