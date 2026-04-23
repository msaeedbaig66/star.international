import { v2 as cloudinary } from 'cloudinary'

// Ensure this only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('Cloudinary server-side library used on the client!')
}

// Server-only credentials: check for both prefixed and non-prefixed variants for resilience.
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

export { cloudinary }
