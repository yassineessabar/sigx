'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface SidebarContextType {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  open: true,
  setOpen: () => {},
  toggle: () => {},
})

export const useSidebar = () => useContext(SidebarContext)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('sigx-sidebar-open')
    return stored === null ? true : stored === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sigx-sidebar-open', String(open))
  }, [open])

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value)
  }, [])

  const toggle = useCallback(() => {
    setOpenState((prev) => !prev)
  }, [])

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}
