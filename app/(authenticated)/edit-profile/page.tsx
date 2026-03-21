'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, X, Plus, Loader2 } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function getInitials(name: string | undefined | null): string {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function EditProfilePage() {
  const { profile, session } = useAuth()
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [showEmail, setShowEmail] = useState(false)
  const [showActivity, setShowActivity] = useState(true)
  const [socials, setSocials] = useState({ instagram: '', linkedin: '', twitter: '', link: '' })

  // Image previews
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  const initials = getInitials(profile?.full_name)
  const email = profile?.email || ''

  // Load from profile on mount
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setBio(profile.bio || '')
      setLocation(profile.location || '')
      setShowEmail(profile.show_email ?? false)
      setShowActivity(profile.show_activity ?? true)
      setAvatarUrl(profile.avatar_url || null)
      setCoverUrl((profile as any).cover_url || null)
      if (profile.social_links) {
        setSocials({
          instagram: (profile.social_links as any).instagram || '',
          linkedin: (profile.social_links as any).linkedin || '',
          twitter: (profile.social_links as any).twitter || '',
          link: (profile.social_links as any).link || '',
        })
      }
    }
  }, [profile])

  // Upload image handler
  const handleImageUpload = async (file: File, type: 'avatar' | 'cover') => {
    if (!session?.access_token) return
    const setter = type === 'avatar' ? setUploadingAvatar : setUploadingCover

    setter(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      if (type === 'avatar') setAvatarUrl(data.url)
      else setCoverUrl(data.url)

      toast.success(`${type === 'avatar' ? 'Avatar' : 'Cover'} updated!`)
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setter(false)
    }
  }

  // Save all profile fields
  const handleSave = async () => {
    if (!session?.access_token) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          bio,
          location,
          social_links: socials,
          show_email: showEmail,
          show_activity: showActivity,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Profile saved!')
      router.push('/profile')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-foreground/[0.06] bg-surface px-4 py-2.5 text-[13px] text-foreground/80 placeholder:text-foreground/25 focus:outline-none focus:border-foreground/[0.12] transition-colors'

  return (
    <PageTransition className="p-6 sm:p-8 lg:p-10 max-w-[1000px] space-y-6">
      {/* Hidden file inputs */}
      <input ref={coverInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')} />
      <input ref={avatarInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'avatar')} />

      {/* Cover Banner */}
      <div
        className="group h-[180px] rounded-xl overflow-hidden relative cursor-pointer"
        onClick={() => coverInputRef.current?.click()}
      >
        {coverUrl ? (
          <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-emerald-500/10" />
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          {uploadingCover ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 text-[13px] font-medium text-white">
              <Camera className="h-4 w-4" />
              {coverUrl ? 'Replace cover' : 'Upload cover'}
            </div>
          )}
        </div>
      </div>

      {/* Avatar + Name Row */}
      <div className="relative -mt-16 ml-6 flex flex-col sm:flex-row sm:items-end gap-4">
        {/* Avatar */}
        <div
          className="group relative h-32 w-32 shrink-0 rounded-full bg-card border-4 border-background flex items-center justify-center shadow-lg cursor-pointer overflow-hidden"
          onClick={() => avatarInputRef.current?.click()}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover rounded-full" />
          ) : (
            <span className="text-[36px] font-bold text-foreground/60">{initials}</span>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
            {uploadingAvatar ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-1 justify-end gap-2 pb-1">
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-2 rounded-xl border border-foreground/[0.08] bg-foreground/[0.04] px-4 py-2.5 text-[13px] font-medium text-foreground/60 hover:bg-foreground/[0.08] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save changes
          </button>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-6 pt-2">
        {/* Full Name */}
        <div className="max-w-md">
          <label className="block text-[13px] font-medium text-foreground/60 mb-2">Full Name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className={inputClass} />
        </div>

        {/* Bio */}
        <div className="max-w-lg">
          <label className="block text-[13px] font-medium text-foreground/60 mb-2">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 220))} placeholder="Write a short bio about yourself..." maxLength={220} rows={3} className={cn(inputClass, 'resize-none')} />
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-[11px] text-foreground/25">Max 220 characters</span>
            <span className="text-[11px] text-foreground/25 tabular-nums">{bio.length}/220</span>
          </div>
        </div>

        {/* Location + Email toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[13px] font-medium text-foreground/60 mb-2">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. San Francisco, CA" className={inputClass} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer select-none py-2.5">
              <button
                role="switch"
                aria-checked={showEmail}
                onClick={() => setShowEmail(!showEmail)}
                className={cn('relative h-6 w-11 rounded-full transition-colors', showEmail ? 'bg-white' : 'bg-foreground/[0.12]')}
              >
                <span className={cn('absolute top-1 left-1 h-4 w-4 rounded-full transition-transform', showEmail ? 'translate-x-5 bg-black' : 'translate-x-0 bg-foreground/40')} />
              </button>
              <div>
                <p className="text-[13px] font-medium text-foreground/70">Display email</p>
                <p className="text-[11px] text-foreground/30">{email}</p>
              </div>
            </label>
          </div>
        </div>

        {/* Socials */}
        <div>
          <div className="mb-3">
            <h3 className="text-[14px] font-semibold text-foreground/70">Socials</h3>
            <p className="text-[12px] text-foreground/30">Add up to 6 social links</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-foreground/40 mb-1.5">Instagram</label>
              <input type="text" value={socials.instagram} onChange={(e) => setSocials({ ...socials, instagram: e.target.value })} placeholder="@username" className={inputClass} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-foreground/40 mb-1.5">LinkedIn</label>
              <input type="text" value={socials.linkedin} onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." className={inputClass} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-foreground/40 mb-1.5">X (Twitter)</label>
              <input type="text" value={socials.twitter} onChange={(e) => setSocials({ ...socials, twitter: e.target.value })} placeholder="@username" className={inputClass} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-foreground/40 mb-1.5">Website</label>
              <input type="text" value={socials.link} onChange={(e) => setSocials({ ...socials, link: e.target.value })} placeholder="https://yoursite.com" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Activity toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-foreground/[0.06] bg-card">
          <div>
            <p className="text-[14px] font-medium text-foreground/70">Show activity on profile</p>
            <p className="text-[12px] text-foreground/30 mt-0.5">Display your contribution heatmap publicly</p>
          </div>
          <button
            role="switch"
            aria-checked={showActivity}
            onClick={() => setShowActivity(!showActivity)}
            className={cn('relative h-6 w-11 rounded-full transition-colors shrink-0', showActivity ? 'bg-orange-500' : 'bg-foreground/[0.12]')}
          >
            <span className={cn('absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform', showActivity ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>

        {/* Save button (bottom) */}
        <div className="flex items-center gap-3 pt-4 border-t border-foreground/[0.06]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save changes
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-foreground/40 hover:text-foreground/60 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </PageTransition>
  )
}
