'use client'

import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'
import { toast } from 'sonner'
import { User, Mail, CreditCard, Save, Loader2, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { PageTransition } from '@/components/ui/page-transition'

export default function SettingsPage() {
  const { profile, session } = useAuth()
  const [name, setName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [hasChanged, setHasChanged] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ full_name: name }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      setHasChanged(false)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setChangingPassword(true)
    try {
      // Verify current password by re-signing in
      if (currentPassword && profile?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: currentPassword,
        })
        if (signInError) {
          toast.error('Current password is incorrect')
          setChangingPassword(false)
          return
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <PageTransition className="p-6 space-y-8 max-w-2xl">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.04em] text-foreground">Settings</h1>
        <p className="text-[13px] text-foreground/20 mt-1 font-medium">
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile section */}
      <div className="rounded-[18px] border border-foreground/[0.04] bg-foreground/[0.012] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-foreground/80 flex items-center gap-2">
          <User size={16} className="text-foreground/30" />
          Profile
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-xl border border-foreground/[0.06] bg-card px-4 py-2.5 text-[13px] text-foreground/80 placeholder:text-foreground/15 focus:outline-none focus:border-foreground/[0.12] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">
              Email
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-foreground/[0.04] bg-foreground/[0.02] px-4 py-2.5">
              <Mail size={14} className="text-foreground/15" />
              <span className="text-[13px] text-foreground/40">{profile?.email || 'Not set'}</span>
            </div>
          </div>
        </div>

        {hasChanged && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        )}
      </div>

      {/* Security section */}
      <div className="rounded-[18px] border border-foreground/[0.04] bg-foreground/[0.012] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-foreground/80 flex items-center gap-2">
          <Lock size={16} className="text-foreground/30" />
          Security
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-foreground/[0.06] bg-card px-4 pr-10 py-2.5 text-[13px] text-foreground/80 placeholder:text-foreground/15 focus:outline-none focus:border-foreground/[0.12] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/20 hover:text-foreground/50 transition-colors"
              >
                {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full rounded-xl border border-foreground/[0.06] bg-card px-4 pr-10 py-2.5 text-[13px] text-foreground/80 placeholder:text-foreground/15 focus:outline-none focus:border-foreground/[0.12] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/20 hover:text-foreground/50 transition-colors"
              >
                {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-foreground/30 uppercase tracking-[0.08em] mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full rounded-xl border border-foreground/[0.06] bg-card px-4 py-2.5 text-[13px] text-foreground/80 placeholder:text-foreground/15 focus:outline-none focus:border-foreground/[0.12] transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handlePasswordChange}
          disabled={changingPassword || !newPassword || !confirmPassword}
          className="flex items-center gap-2 rounded-xl bg-foreground/[0.06] px-5 py-2.5 text-[13px] font-semibold text-foreground/70 hover:bg-foreground/[0.1] transition-colors disabled:opacity-30"
        >
          {changingPassword ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          Update Password
        </button>
      </div>

      {/* Plan section */}
      <div className="rounded-[18px] border border-foreground/[0.04] bg-foreground/[0.012] p-6 space-y-4">
        <h2 className="text-[15px] font-semibold text-foreground/80 flex items-center gap-2">
          <CreditCard size={16} className="text-foreground/30" />
          Plan
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-foreground/70 font-medium capitalize">{profile?.plan || 'Free'} Plan</p>
            <p className="text-[12px] text-foreground/20 mt-0.5">$5 of usage credit per month</p>
          </div>
          <Link
            href="/upgrade"
            className="rounded-xl border border-foreground/[0.08] px-4 py-2 text-[12px] font-medium text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
          >
            Upgrade Plan
          </Link>
        </div>
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
    </PageTransition>
  )
}
