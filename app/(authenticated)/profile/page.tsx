'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Pencil, Plus, BookOpen, Mail, CreditCard, Lock, Eye, EyeOff, Save, Loader2, User, Shield, ChevronRight, ExternalLink, BarChart3, Clock, Gem, Copy, Check } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
  { id: 'plan', label: 'Plan & Billing' },
] as const

type Tab = (typeof TABS)[number]['id']

function getInitials(name: string | undefined | null): string {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function generateHeatmapData(): number[][] {
  const rows = 7
  const cols = 52
  const data: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      const rand = Math.random()
      if (rand < 0.6) row.push(0)
      else if (rand < 0.8) row.push(1)
      else if (rand < 0.9) row.push(2)
      else if (rand < 0.96) row.push(3)
      else row.push(4)
    }
    data.push(row)
  }
  return data
}

const HEATMAP_COLORS = [
  'bg-foreground/[0.02]',
  'bg-orange-500/20',
  'bg-orange-500/40',
  'bg-orange-500/70',
  'bg-orange-500',
]

export default function ProfilePage() {
  const { profile, session } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showActivity, setShowActivity] = useState(true)
  const [heatmapData] = useState(() => generateHeatmapData())

  // Account state
  const [name, setName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [hasChanged, setHasChanged] = useState(false)

  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Real stats
  const [strategyCount, setStrategyCount] = useState(0)
  const [deployedCount, setDeployedCount] = useState(0)

  useEffect(() => {
    const loadStats = async () => {
      if (!session?.access_token) return
      try {
        const [stratRes, deployRes] = await Promise.all([
          fetch('/api/strategies', { headers: { Authorization: `Bearer ${session.access_token}` } }),
          fetch('/api/deployments', { headers: { Authorization: `Bearer ${session.access_token}` } }),
        ])
        const stratData = await stratRes.json()
        const deployData = await deployRes.json()
        if (stratData.strategies) setStrategyCount(stratData.strategies.length)
        if (deployData.deployments) setDeployedCount(deployData.deployments.length)
      } catch { /* silent */ }
    }
    loadStats()
  }, [session?.access_token])

  // Copy user ID
  const [copiedId, setCopiedId] = useState(false)

  const fullName = profile?.full_name || 'User'
  const initials = getInitials(profile?.full_name)
  const username = `@${profile?.full_name?.toLowerCase().replace(/\s+/g, '-') || 'user'}`
  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'March 2025'

  const handleNameChange = (val: string) => {
    setName(val)
    setHasChanged(val !== profile?.full_name)
  }

  const handleSave = async () => {
    if (!session?.access_token || !hasChanged) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ full_name: name }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setHasChanged(false)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) return toast.error('Please fill in all password fields')
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match')
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters')

    setChangingPassword(true)
    try {
      if (currentPassword && profile?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPassword })
        if (signInError) { toast.error('Current password is incorrect'); setChangingPassword(false); return }
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated successfully')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(profile?.id || '')
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <PageTransition className="p-6 sm:p-8 lg:p-10 max-w-[1200px] space-y-6">
      {/* Cover Banner */}
      <div className="group h-[180px] rounded-xl overflow-hidden relative">
        {(profile as any)?.cover_url ? (
          <img src={(profile as any).cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-emerald-500/10" />
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <button onClick={() => router.push('/edit-profile')} className="flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 text-[13px] font-medium text-white hover:bg-white/20 transition-colors">
            <Camera className="h-4 w-4" />
            Replace Image
          </button>
        </div>
      </div>

      {/* Avatar + Profile Info */}
      <div className="relative -mt-[72px] ml-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="group relative h-32 w-32 shrink-0 rounded-full bg-card border-4 border-background flex items-center justify-center shadow-lg">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-[36px] font-bold text-foreground/60">{initials}</span>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer" onClick={() => router.push('/edit-profile')}>
            <Camera className="h-5 w-5 text-white" />
          </div>
        </div>

        <div className="flex flex-1 flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-1">
          <div className="space-y-1">
            <h1 className="text-[26px] font-bold text-foreground leading-tight">{fullName}</h1>
            <p className="text-[14px] text-foreground/50">{username}</p>
            {profile?.bio && (
              <p className="text-[13px] text-foreground/45 leading-relaxed max-w-md pt-1">{profile.bio}</p>
            )}
            <div className="flex items-center gap-3 pt-1 flex-wrap">
              <span className="flex items-center gap-1 text-[12px] text-foreground/30">
                <Clock size={11} /> Joined {joinDate}
              </span>
              {profile?.location && (
                <span className="text-[12px] text-foreground/30">
                  📍 {profile.location}
                </span>
              )}
              <span className="flex items-center gap-1 text-[12px] text-foreground/30">
                <BarChart3 size={11} /> {strategyCount} strategies
              </span>
              <span className="rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-foreground/50 capitalize">
                {profile?.plan || 'Free'}
              </span>
            </div>
            {/* Social links */}
            {profile?.social_links && Object.values(profile.social_links).some(v => v) && (
              <div className="flex items-center gap-3 pt-1.5">
                {(profile.social_links as any).twitter && (
                  <a href={`https://x.com/${(profile.social_links as any).twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-foreground/35 hover:text-foreground/60 transition-colors">𝕏 {(profile.social_links as any).twitter}</a>
                )}
                {(profile.social_links as any).linkedin && (
                  <a href={(profile.social_links as any).linkedin.startsWith('http') ? (profile.social_links as any).linkedin : `https://linkedin.com/in/${(profile.social_links as any).linkedin}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-foreground/35 hover:text-foreground/60 transition-colors">LinkedIn</a>
                )}
                {(profile.social_links as any).instagram && (
                  <a href={`https://instagram.com/${(profile.social_links as any).instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-foreground/35 hover:text-foreground/60 transition-colors">Instagram</a>
                )}
                {(profile.social_links as any).link && (
                  <a href={(profile.social_links as any).link} target="_blank" rel="noopener noreferrer" className="text-[12px] text-foreground/35 hover:text-foreground/60 transition-colors">🔗 Website</a>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => router.push('/edit-profile')}
            className="flex items-center gap-2 self-start sm:self-auto bg-white text-black rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-white/90 transition-colors shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-foreground/[0.06]">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-5 py-3 text-[13px] font-medium transition-colors relative',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-foreground/35 hover:text-foreground/60'
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickStat label="Strategies" value={String(strategyCount)} />
            <QuickStat label="Backtests" value="0" />
            <QuickStat label="Deployed" value={String(deployedCount)} />
            <QuickStat label="Credits" value={String(profile?.credits_balance ?? 0)} />
          </div>

          {/* Strategies Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-foreground">My Strategies</h2>
              <button
                onClick={() => router.push('/strategies')}
                className="flex items-center gap-1 text-[13px] text-foreground/40 hover:text-foreground/60 transition-colors font-medium"
              >
                View all <ChevronRight size={14} />
              </button>
            </div>

            <div className="rounded-xl border border-dashed border-foreground/[0.08] bg-card p-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-12 w-12 rounded-xl bg-foreground/[0.04] flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-foreground/30" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[15px] font-medium text-foreground">No strategies yet</p>
                <p className="text-[13px] text-foreground/35 max-w-sm">
                  Create your first trading strategy with the AI Builder.
                </p>
              </div>
              <button
                onClick={() => router.push('/ai-builder')}
                className="flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-[13px] font-medium hover:bg-white/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Start Creating
              </button>
            </div>
          </div>

          {/* Activity Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-foreground">Activity</h2>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-[12px] text-foreground/40">Show on profile</span>
                <button
                  role="switch"
                  aria-checked={showActivity}
                  onClick={() => setShowActivity(!showActivity)}
                  className={cn('relative h-5 w-9 rounded-full transition-colors', showActivity ? 'bg-orange-500' : 'bg-foreground/[0.1]')}
                >
                  <span className={cn('absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform', showActivity ? 'translate-x-4' : 'translate-x-0')} />
                </button>
              </label>
            </div>

            {showActivity && (
              <div className="rounded-xl border border-foreground/[0.06] bg-card p-5 space-y-3 overflow-x-auto">
                <div className="flex gap-0 ml-0 min-w-[700px]">
                  {MONTHS.map((month) => (
                    <span key={month} className="text-[10px] text-foreground/25" style={{ width: `${100 / 12}%` }}>{month}</span>
                  ))}
                </div>
                <div className="flex flex-col gap-[3px] min-w-[700px]">
                  {heatmapData.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex gap-[3px]">
                      {row.map((val, colIdx) => (
                        <div key={colIdx} className={cn('h-[11px] w-[11px] rounded-[2px]', HEATMAP_COLORS[val])} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-foreground/25 mr-1">Less</span>
                  {HEATMAP_COLORS.map((color, i) => (
                    <div key={i} className={cn('h-[11px] w-[11px] rounded-[2px]', color)} />
                  ))}
                  <span className="text-[10px] text-foreground/25 ml-1">More</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-6 max-w-xl">
          <div className="rounded-[18px] border border-foreground/[0.04] bg-card p-6 space-y-5">
            <h2 className="text-[15px] font-semibold text-foreground/80 flex items-center gap-2">
              <User size={16} className="text-foreground/30" />
              Account Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-xl border border-foreground/[0.06] bg-surface px-4 py-2.5 text-[13px] text-foreground/80 placeholder:text-foreground/15 focus:outline-none focus:border-foreground/[0.12] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">Email</label>
                <div className="flex items-center gap-2 rounded-xl border border-foreground/[0.04] bg-foreground/[0.02] px-4 py-2.5">
                  <Mail size={14} className="text-foreground/15" />
                  <span className="text-[13px] text-foreground/40">{profile?.email || 'Not set'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">User ID</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl border border-foreground/[0.04] bg-foreground/[0.02] px-4 py-2.5">
                    <span className="text-[12px] text-foreground/30 font-mono truncate block">{profile?.id || '—'}</span>
                  </div>
                  <button onClick={handleCopyId} className="p-2.5 rounded-xl border border-foreground/[0.06] text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors">
                    {copiedId ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {hasChanged && (
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            )}
          </div>

          {/* Danger zone */}
          <div className="rounded-[18px] border border-red-500/[0.1] bg-red-500/[0.02] p-6 space-y-4">
            <h2 className="text-[15px] font-semibold text-red-400/60">Danger Zone</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-foreground/50 font-medium">Delete Account</p>
                <p className="text-[12px] text-foreground/20 mt-0.5">Permanently delete your account and all data.</p>
              </div>
              <button className="rounded-xl border border-red-500/20 px-4 py-2 text-[12px] font-medium text-red-400/60 hover:bg-red-500/[0.06] transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6 max-w-xl">
          <div className="rounded-[18px] border border-foreground/[0.04] bg-card p-6 space-y-5">
            <h2 className="text-[15px] font-semibold text-foreground/80 flex items-center gap-2">
              <Lock size={16} className="text-foreground/30" />
              Change Password
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-foreground/[0.06] bg-surface px-4 pr-10 py-2.5 text-[13px] text-foreground/80 placeholder:text-foreground/15 focus:outline-none focus:border-foreground/[0.12] transition-colors"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/20 hover:text-foreground/50 transition-colors">
                    {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full rounded-xl border border-foreground/[0.06] bg-surface px-4 pr-10 py-2.5 text-[13px] text-foreground/80 placeholder:text-foreground/15 focus:outline-none focus:border-foreground/[0.12] transition-colors"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/20 hover:text-foreground/50 transition-colors">
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full rounded-xl border border-foreground/[0.06] bg-surface px-4 py-2.5 text-[13px] text-foreground/80 placeholder:text-foreground/15 focus:outline-none focus:border-foreground/[0.12] transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handlePasswordChange}
              disabled={changingPassword || !newPassword || !confirmPassword}
              className="flex items-center gap-2 rounded-xl bg-foreground/[0.06] px-5 py-2.5 text-[13px] font-semibold text-foreground/70 hover:bg-foreground/[0.1] transition-colors disabled:opacity-30"
            >
              {changingPassword ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              Update Password
            </button>
          </div>

          {/* Two-factor placeholder */}
          <div className="rounded-[18px] border border-foreground/[0.04] bg-card p-6 space-y-4">
            <h2 className="text-[15px] font-semibold text-foreground/80 flex items-center gap-2">
              <Lock size={16} className="text-foreground/30" />
              Two-Factor Authentication
            </h2>
            <p className="text-[13px] text-foreground/35 leading-relaxed">
              Add an extra layer of security to your account with 2FA.
            </p>
            <button className="flex items-center gap-2 rounded-xl border border-foreground/[0.08] px-4 py-2.5 text-[13px] font-medium text-foreground/60 hover:bg-foreground/[0.04] transition-colors">
              Enable 2FA
            </button>
          </div>
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="space-y-6 max-w-xl">
          {/* Current plan */}
          <div className="rounded-[18px] border border-foreground/[0.04] bg-card p-6 space-y-5">
            <h2 className="text-[15px] font-semibold text-foreground/80 flex items-center gap-2">
              <CreditCard size={16} className="text-foreground/30" />
              Current Plan
            </h2>

            <div className="flex items-center justify-between p-4 rounded-xl bg-foreground/[0.03] border border-foreground/[0.04]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-foreground/[0.06] flex items-center justify-center">
                  <Gem size={18} className="text-foreground/40" />
                </div>
                <div>
                  <p className="text-[15px] text-foreground font-semibold capitalize">{profile?.plan || 'Free'} Plan</p>
                  <p className="text-[12px] text-foreground/30 mt-0.5">$5 of usage credit per month</p>
                </div>
              </div>
              <Link
                href="/upgrade"
                className="rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors"
              >
                Upgrade
              </Link>
            </div>

            {/* Credits usage */}
            <div className="space-y-4">
              <h3 className="text-[13px] font-medium text-foreground/40">Credit Usage</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] text-foreground/50">Credits Balance</span>
                    <span className="text-[13px] text-foreground/70 font-bold tabular-nums">{profile?.credits_balance ?? 0}</span>
                  </div>
                  <div className="h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400" style={{ width: `${Math.min(((profile?.credits_balance ?? 0) / 10) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Billing history */}
          <div className="rounded-[18px] border border-foreground/[0.04] bg-card p-6 space-y-4">
            <h2 className="text-[15px] font-semibold text-foreground/80">Billing History</h2>
            <div className="rounded-xl border border-dashed border-foreground/[0.06] bg-foreground/[0.02] py-8 flex flex-col items-center text-center">
              <CreditCard size={24} className="text-foreground/15 mb-2" />
              <p className="text-[13px] text-foreground/30">No billing history</p>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  )
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-foreground/[0.04] bg-card p-4">
      <p className="text-[10px] text-foreground/25 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-[20px] font-bold text-foreground/60 tabular-nums mt-1">{value}</p>
    </div>
  )
}
