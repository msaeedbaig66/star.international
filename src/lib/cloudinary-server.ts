import { v2 as cloudinary } from 'cloudinary'

// Ensure this only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('Cloudinary server-side library used on the client!')
}

// Server-only credentials
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (!cloudName || !apiKey || !apiSecret) {
  console.error('Cloudinary configuration missing:', {
    hasCloudName: !!cloudName,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
  })
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
})

/**
 * Extracts the public ID from a Cloudinary URL.
 * URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567/folder/public_id.jpg
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!url || !url.includes('cloudinary.com')) return null

  try {
    const parts = url.split('/')
    const uploadIndex = parts.indexOf('upload')
    if (uploadIndex === -1) return null

    // The public ID is after the version (v1234567) or directly after 'upload'
    // We need to remove the file extension as well.
    let publicIdWithExtension = parts.slice(uploadIndex + 1).join('/')
    
    // Remove version prefix if present (e.g. v1234567/)
    if (publicIdWithExtension.match(/^v\d+\//)) {
      publicIdWithExtension = publicIdWithExtension.replace(/^v\d+\//, '')
    }

    // Remove file extension
    const lastDotIndex = publicIdWithExtension.lastIndexOf('.')
    if (lastDotIndex === -1) return publicIdWithExtension
    
    return publicIdWithExtension.substring(0, lastDotIndex)
  } catch (e) {
    console.error('Failed to extract public ID from URL:', url, e)
    return null
  }
}

/**
 * Deletes an image from Cloudinary by its URL.
 */
export async function deleteImageByUrl(url: string) {
  const publicId = extractPublicIdFromUrl(url)
  if (!publicId) return null

  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result
  } catch (error) {
    console.error('Cloudinary destroy error:', error)
    throw error
  }
}

/**
 * Deletes multiple images from Cloudinary by their URLs.
 */
export async function deleteImagesByUrls(urls: string[]) {
  if (!urls || urls.length === 0) return []
  
  return Promise.all(urls.map(url => deleteImageByUrl(url).catch(err => {
    console.error(`Failed to delete image: ${url}`, err)
    return null
  })))
}

export { cloudinary }
