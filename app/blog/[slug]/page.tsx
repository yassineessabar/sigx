import { notFound } from 'next/navigation'
import Link from 'next/link'
import { posts, categoryColors } from '../posts'
import type { Metadata } from 'next'

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = posts.find((p) => p.slug === slug)
  if (!post) return { title: 'Not Found — SIGX' }
  return {
    title: `${post.title} — SIGX Blog`,
    description: post.excerpt,
  }
}

function renderMarkdown(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-[20px] font-bold text-foreground/85 tracking-[-0.02em] mt-10 mb-4">{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-[16px] font-semibold text-foreground/75 mt-6 mb-3">{line.slice(4)}</h3>)
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-foreground/[0.10] pl-4 my-4 text-[14px] text-foreground/50 italic leading-[1.7]">
          {line.slice(2)}
        </blockquote>
      )
    } else if (line.startsWith('- **') || line.startsWith('- ')) {
      // Collect consecutive list items
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-2 my-4 pl-5">
          {items.map((item, j) => (
            <li key={j} className="list-disc text-[14px] text-foreground/55 leading-[1.7] font-medium">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    } else if (line.match(/^\d+\. /)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-2 my-4 pl-5">
          {items.map((item, j) => (
            <li key={j} className="list-decimal text-[14px] text-foreground/55 leading-[1.7] font-medium">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      )
      continue
    } else if (line.trim() === '') {
      // skip empty lines
    } else {
      elements.push(
        <p key={i} className="text-[14px] text-foreground/55 leading-[1.8] font-medium my-4">
          {renderInline(line)}
        </p>
      )
    }
    i++
  }

  return <>{elements}</>
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** patterns
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-foreground/70 font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = posts.find((p) => p.slug === slug)

  if (!post) notFound()

  return (
    <div className="dark min-h-screen bg-background" style={{ colorScheme: 'dark' }}>
      <header className="border-b border-foreground/[0.06]">
        <div className="mx-auto max-w-[720px] px-6 py-5 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-[22px] w-[22px] rounded-[6px] bg-white flex items-center justify-center">
              <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.03em] text-foreground/90">SIGX</span>
          </Link>
          <Link href="/blog" className="text-[12px] text-foreground/40 hover:text-foreground/70 transition-colors font-medium">
            All Posts
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-6 py-12">
        {/* Back link */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-[12px] text-foreground/35 hover:text-foreground/60 font-medium transition-colors mb-8">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back to Blog
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-5">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${categoryColors[post.category] || 'text-foreground/40 bg-foreground/[0.04] border-foreground/[0.08]'}`}>
            {post.category}
          </span>
          <span className="text-[12px] text-foreground/30 font-medium">{post.date}</span>
          <span className="text-[12px] text-foreground/25 font-medium">{post.readTime} read</span>
        </div>

        {/* Title */}
        <h1 className="text-[28px] sm:text-[32px] font-bold text-foreground tracking-[-0.03em] leading-[1.15] mb-6">
          {post.title}
        </h1>

        {/* Excerpt */}
        <p className="text-[15px] text-foreground/45 leading-[1.7] font-medium mb-10 pb-8 border-b border-foreground/[0.06]">
          {post.excerpt}
        </p>

        {/* Content */}
        <article>
          {renderMarkdown(post.content)}
        </article>

        {/* Bottom CTA */}
        <div className="mt-16 pt-8 border-t border-foreground/[0.06]">
          <div className="rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] p-8 text-center">
            <h3 className="text-[18px] font-bold text-foreground/80 tracking-[-0.02em] mb-2">
              Ready to build your first strategy?
            </h3>
            <p className="text-[13px] text-foreground/40 font-medium mb-5">
              Describe your trading idea and get a real MT5 backtest in under a minute.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors"
            >
              Get Started Free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-foreground/[0.06] mt-16">
        <div className="mx-auto max-w-[720px] px-6 py-6 flex items-center justify-between">
          <p className="text-[11px] text-foreground/30 font-medium">&copy; {new Date().getFullYear()} SIGX. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors font-medium">Privacy</Link>
            <Link href="/terms" className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors font-medium">Terms</Link>
            <Link href="/disclaimer" className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors font-medium">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
