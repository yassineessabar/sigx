'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Chat } from '@/lib/types'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, session } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [chats, setChats] = useState<Chat[]>([])

  const loadChats = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (data) setChats(data)
  }, [user])

  // Load chats on mount and when pathname changes (catches new chat creation)
  useEffect(() => {
    loadChats()
  }, [loadChats, pathname])

  const handleNewChat = () => {
    router.push('/ai-builder')
  }

  const handleDeleteChat = async (chatId: string) => {
    if (!session?.access_token) return
    try {
      const res = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to delete chat')
      setChats((prev) => prev.filter((c) => c.id !== chatId))
      // Navigate away if viewing the deleted chat
      if (pathname === `/ai-builder/${chatId}`) {
        router.push('/ai-builder')
      }
      toast.success('Chat deleted')
    } catch {
      toast.error('Failed to delete chat')
    }
  }

  return (
    <AppLayout chats={chats} onNewChat={handleNewChat} onDeleteChat={handleDeleteChat}>
      {children}
    </AppLayout>
  )
}
