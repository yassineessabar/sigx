'use client'

import { Chat } from '@/lib/types'
import { Plus, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface ChatSidebarProps {
  chats: Chat[]
  onNewChat: () => void
}

function formatDate(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return ''
  }
}

export function ChatSidebar({ chats, onNewChat }: ChatSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r border-foreground/[0.08] bg-card">
      <div className="flex items-center justify-between border-b border-foreground/[0.08] p-3">
        <span className="text-[14px] font-medium text-[#fafafa]">Chats</span>
        <button
          onClick={onNewChat}
          className="rounded-lg p-1.5 text-[#d4d4d8] transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-[#fafafa]"
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-0.5">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-8 w-8 text-[rgba(161,161,170,0.5)] mb-2" />
            <p className="text-[12px] text-[#d4d4d8]">No chats yet</p>
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = pathname === `/ai-builder/${chat.id}`
            return (
              <Link
                key={chat.id}
                href={`/ai-builder/${chat.id}`}
                className={cn(
                  'block rounded-lg px-3 py-2 transition-colors duration-150',
                  isActive
                    ? 'bg-foreground/[0.06] text-[#fafafa]'
                    : 'text-[#d4d4d8] hover:bg-foreground/[0.04] hover:text-[#fafafa]'
                )}
              >
                <p className="truncate text-[14px]">{chat.title}</p>
                <p className="text-[11px] text-[rgba(161,161,170,0.8)] mt-0.5">
                  {formatDate(chat.updated_at)}
                </p>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
