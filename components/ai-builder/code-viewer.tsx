'use client'

import { useState, useRef, useEffect } from 'react'
import { Copy, Check, Code, ChevronDown, ChevronUp, Download, Pencil, Eye } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeViewerProps {
  code: string
  language?: string
  filename?: string
  /** Called when user edits the code. If not provided, code is read-only. */
  onCodeChange?: (newCode: string) => void
}

export function CodeViewer({ code, language = 'mql5', filename, onCodeChange }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedCode, setEditedCode] = useState(code)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync editedCode when code prop changes (new AI response)
  useEffect(() => {
    setEditedCode(code)
  }, [code])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editing ? editedCode : code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([editing ? editedCode : code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `strategy.${language === 'mql5' ? 'mq5' : language}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleToggleEdit = () => {
    if (editing) {
      // Save edits
      if (editedCode !== code && onCodeChange) {
        onCodeChange(editedCode)
      }
      setEditing(false)
    } else {
      setEditing(true)
      // Focus textarea after render
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  const lines = code.split('\n')
  const displayCode = expanded || editing ? code : lines.slice(0, 20).join('\n')
  const hasMore = lines.length > 20

  const hasEdits = editedCode !== code

  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-secondary overflow-hidden">
      <div className="border-b border-foreground/[0.06] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-[#d4d4d8]" />
          <span className="text-[12px] font-medium text-[#d4d4d8] uppercase">{language}</span>
          {hasEdits && !editing && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">edited</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onCodeChange && (
            <button
              onClick={handleToggleEdit}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] transition-colors duration-150 ${
                editing
                  ? 'text-green-400 hover:text-green-300 bg-green-500/10'
                  : 'text-[#d4d4d8] hover:text-[#fafafa] hover:bg-foreground/[0.06]'
              }`}
            >
              {editing ? <><Check className="h-3 w-3" /> Save</> : <><Pencil className="h-3 w-3" /> Edit</>}
            </button>
          )}
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
        {editing ? (
          <textarea
            ref={textareaRef}
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            className="w-full bg-transparent text-[12px] leading-[20px] font-mono text-[#d4d4d8] p-4 focus:outline-none resize-none min-h-[300px]"
            style={{ tabSize: 4 }}
            spellCheck={false}
            rows={Math.max(20, editedCode.split('\n').length + 2)}
          />
        ) : (
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
            {expanded ? (editing ? editedCode : code) : displayCode}
          </SyntaxHighlighter>
        )}
      </div>

      {hasMore && !editing && (
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
