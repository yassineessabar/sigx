import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null // 'avatar' or 'cover'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!type || !['avatar', 'cover'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "avatar" or "cover"' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, WebP, or GIF.' }, { status: 400 })
    }

    // Max sizes: avatar 5MB, cover 10MB
    const maxSize = type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File too large. Max ${type === 'avatar' ? '5' : '10'}MB.` }, { status: 400 })
    }

    const bucket = type === 'avatar' ? 'avatars' : 'covers'
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}-${Date.now()}.${ext}`

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName)
    const publicUrl = urlData.publicUrl

    // Update profile with new URL
    const profileField = type === 'avatar' ? 'avatar_url' : 'cover_url'
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ [profileField]: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl, type })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
