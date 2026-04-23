'use server'

import { createClient } from '@/lib/supabase/server'
import { cloudinary } from '@/lib/cloudinary-server'
import { MAX_FILE_SIZE_MB } from '@/lib/constants'

export type UploadResult = {
  url: string
  public_id: string
}

export async function uploadFileAction(formData: FormData): Promise<{ data?: UploadResult; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized: You must be logged in to upload files.' }
    }

    const file = formData.get('file') as File | null
    const category = formData.get('category') as string || 'others'

    if (!file) {
      return { error: 'No file provided for upload.' }
    }

    // Basic size validation
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024
    if (file.size > maxBytes) {
      return { error: `File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.` }
    }

    // Convert to buffer for Cloudinary stream
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Professional Upload to Cloudinary using a Promise-based wrapper
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `allpanga/${category}/${user.id}`,
          resource_type: 'auto', // Support non-image files if needed
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      uploadStream.end(buffer)
    })

    return {
      data: {
        url: result.secure_url,
        public_id: result.public_id,
      }
    }
  } catch (error: any) {
    console.error('Server Action Upload Error:', error)
    return { error: error.message || 'An unexpected error occurred during the upload process.' }
  }
}
