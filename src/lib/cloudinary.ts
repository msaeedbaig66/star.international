/**
 * Cloudinary Utility for Allpanga
 * Handles unsigned uploads to Cloudinary to save Supabase storage/bandwidth
 */
import { uploadFileAction } from '@/lib/actions/upload'
import { compressImage } from '@/lib/image-compression'
import { toast } from 'sonner'

/**
 * Handles professional uploads to Cloudinary via Server Actions with Automatic Compression
 */
export async function uploadToCloudinary(file: File, category: string = 'others'): Promise<string> {
 // Determine compression limit based on category
 let maxSizeKB = 300 // Default fallback
 let label = "Optimizing Image..."

 if (['avatars', 'profile_cover', 'communities', 'hero', 'blog_cover'].includes(category)) {
 maxSizeKB = 1024 // 1 MB for high-visibility profile/brand assets
 label = "Optimizing Profile/Cover..."
 } else if (['blogs', 'blog_content'].includes(category)) {
 maxSizeKB = 500 // 500 KB for blog content
 label = "Optimizing Blog Content..."
 } else if (['listings', 'chats', 'community_posts', 'others'].includes(category)) {
 maxSizeKB = 250 // 250 KB for marketplace items and chats
 label = category === 'others' ? 'Uploading file...' : 'Optimizing asset...'
 }

 const sizeLabel = maxSizeKB >= 1024 ? (maxSizeKB/1024).toFixed(1) + 'MB' : maxSizeKB + 'KB'
 const toastId = toast.loading(label, {
 description: `We are compressing your image to ${sizeLabel} for faster sharing...`
 })

 try {
 // ── Client-Side Compression ──
 const compressedFile = await compressImage(file, { maxSizeKB })
 
 const formData = new FormData()
 formData.append('file', compressedFile)
 formData.append('category', category)

 const result = await uploadFileAction(formData)

 if (result.error) {
 console.error('Server upload error:', result.error)
 throw new Error(result.error)
 }

 if (!result.data?.url) {
 throw new Error('Upload succeeded but no URL was returned')
 }

 toast.dismiss(toastId)
 return result.data.url
 } catch (error: any) {
 toast.error('Upload failed', { id: toastId, description: error.message })
 console.error('Upload exception:', error)
 // Map common errors to user-friendly messages
 if (error.message?.includes('Missing required parameter')) {
 throw new Error('Cloudinary configuration error. Please contact support.')
 }
 throw new Error(error.message || 'Network error or server-side upload failure')
 }
}

/**
 * Generates an optimized Cloudinary URL
 * @param url The original secure_url from Cloudinary
 * @param width Optional width
 * @param height Optional height
 */
export function getOptimizedImageUrl(url: string | null | undefined, width?: number, height?: number) {
 if (!url) return '';
 if (!url.includes('cloudinary.com')) return url;

 // Split URL to insert transformations
 // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567/public_id.jpg
 const parts = url.split('/upload/');
 if (parts.length !== 2) return url;

 let transformations = 'f_auto,q_auto'; // Best format and quality automatically
 if (width && height) {
 transformations += `,w_${width},h_${height},c_fill`;
 } else if (width) {
 transformations += `,w_${width}`;
 } else if (height) {
 transformations += `,h_${height}`;
 }

 return `${parts[0]}/upload/${transformations}/${parts[1]}`;
}
