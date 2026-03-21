'use client'

import { useState } from 'react'
import { Copy, Check, Code, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeViewerProps {
  code: string
  language?: string
  filename?: string
}

export function CodeViewer({ code, language = 'mql5', filename }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `strategy.${language === 'mql5' ? 'mq5' : language}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const lines = code.split('\n')
  const displayCode = expanded ? code : lines.slice(0, 20).join('\n')
  const hasMore = lines.length > 20

  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-secondary overflow-hidden">
      <div className="border-b border-foreground/[0.06] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-[#d4d4d8]" />
          <span className="text-[12px] font-medium text-[#d4d4d8] uppercase">{language}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-[#d4d4d8] transition-colors duration-150 hover:text-[#fafafa] hover:bg-foreground/[0.06]"
          >
            <Download className="h-3 w-3" />
            .mq5
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-[#d4d4d8] transition-colors duration-150 hover:text-[#fafafa] hover:bg-foreground/[0.06]"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language="cpp"
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '12px',
            lineHeight: '20px',
          }}
          showLineNumbers
          lineNumberStyle={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', minWidth: '2.5em' }}
        >
          {displayCode}
        </SyntaxHighlighter>
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 border-t border-foreground/[0.06] py-2 text-[12px] text-[#d4d4d8] transition-colors duration-150 hover:text-[#fafafa]"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show all {lines.length} lines
            </>
          )}
        </button>
      )}
    </div>
  )
}
