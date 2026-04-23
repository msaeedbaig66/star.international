import imageCompression from 'browser-image-compression';

interface CompressionOptions {
  maxSizeKB: number;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * High-Performance Image Compression Utility
 * Uses browser-image-compression (Web Workers) for lightning fast processing
 */
export async function compressImage(file: File, options: CompressionOptions = { maxSizeKB: 300 }): Promise<File> {
  const { maxSizeKB, maxWidth = 1280, maxHeight = 1280 } = options;
  
  // Skip if not an image
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Already tiny? return as is
  if (file.size <= maxSizeKB * 1024) {
    return file;
  }

  try {
    const compressionOptions = {
      maxSizeMB: maxSizeKB / 1024,
      maxWidthOrHeight: Math.max(maxWidth, maxHeight),
      useWebWorker: true,
      initialQuality: 0.8,
    };

    const compressedBlob = await imageCompression(file, compressionOptions);
    
    return new File([compressedBlob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('Fast compression failed, falling back to original:', error);
    return file;
  }
}
