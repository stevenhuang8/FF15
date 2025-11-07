/**
 * File Conversion Utilities
 *
 * Functions to convert files to formats suitable for AI SDK multimodal messages
 */

export interface FileDataPart {
  type: 'file';
  mediaType: string;
  url: string;
}

/**
 * Compress an image file to reduce size before uploading
 * Resizes large images and compresses quality to fit within Vercel's body size limits
 *
 * @param file - The image file to compress
 * @param maxWidth - Maximum width (default: 1920px for high quality)
 * @param maxHeight - Maximum height (default: 1920px for high quality)
 * @param quality - JPEG/WebP quality (0-1, default: 0.85)
 * @returns Promise<File> - Compressed image file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.85
): Promise<File> {
  // Skip compression for GIFs (to preserve animation) and very small files
  if (file.type === 'image/gif' || file.size < 100 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions (preserve aspect ratio)
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;

          if (width > height) {
            width = maxWidth;
            height = Math.round(maxWidth / aspectRatio);
          } else {
            height = maxHeight;
            width = Math.round(maxHeight * aspectRatio);
          }
        }

        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Create new file from compressed blob
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.(png|webp)$/i, '.jpg'), // Convert to JPEG for better compression
              { type: 'image/jpeg', lastModified: Date.now() }
            );

            console.log('🗜️ Image compressed:', {
              original: formatFileSize(file.size),
              compressed: formatFileSize(compressedFile.size),
              reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`,
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${file.name}`));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert a single file to a data URL (base64)
 * Now includes automatic compression to prevent Vercel 413 errors
 */
export async function convertFileToDataURL(file: File): Promise<FileDataPart> {
  // Compress image first to reduce payload size
  const compressedFile = await compressImage(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataURL = reader.result as string;

      // Check final base64 size (warn if approaching Vercel limits)
      const sizeInMB = (dataURL.length * 0.75) / (1024 * 1024); // base64 to bytes conversion
      if (sizeInMB > 3) {
        console.warn(`⚠️ Large image detected: ${sizeInMB.toFixed(2)}MB after compression`);
      }

      resolve({
        type: 'file',
        mediaType: compressedFile.type,
        url: dataURL,
      });
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${compressedFile.name}`));
    };

    reader.readAsDataURL(compressedFile);
  });
}

/**
 * Convert multiple files to data URLs
 */
export async function convertFilesToDataURLs(files: File[]): Promise<FileDataPart[]> {
  return Promise.all(files.map(file => convertFileToDataURL(file)));
}

/**
 * Validate file for upload
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): FileValidationResult {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported: JPEG, PNG, WebP, GIF, HEIC. Got: ${file.type}`,
    };
  }

  // Check file size (OpenAI limit: 20MB)
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than 20MB. Got: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateImageFiles(files: File[]): FileValidationResult {
  // Check file count (OpenAI limit: 10 images per request)
  const maxFiles = 10;
  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `Maximum ${maxFiles} images per message. Got: ${files.length}`,
    };
  }

  // Validate each file
  for (const file of files) {
    const result = validateImageFile(file);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Get preview URL for a file (same as data URL but type-safe)
 */
export async function getFilePreviewURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error(`Failed to create preview for: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is HEIC/HEIF format (Apple's image format)
 */
export function isHEICFile(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  );
}

/**
 * Convert HEIC/HEIF image to JPEG for OpenAI Vision API compatibility
 * Uses lazy-loaded heic2any library (only loaded when HEIC detected)
 *
 * @param file - The HEIC file to convert
 * @returns Promise<File> - Converted JPEG file
 * @throws Error if conversion fails
 */
export async function convertHEICToJPEG(file: File): Promise<File> {
  // Return immediately if not HEIC
  if (!isHEICFile(file)) {
    return file;
  }

  try {
    console.log('🔄 Converting HEIC to JPEG:', file.name);

    // Lazy load heic2any (only when needed - ~500KB bundle)
    const heic2any = (await import('heic2any')).default;

    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9, // High quality for AI vision analysis
    });

    // Convert Blob to File
    const convertedFile = new File(
      [convertedBlob as Blob],
      file.name.replace(/\.(heic|heif)$/i, '.jpg'),
      { type: 'image/jpeg', lastModified: Date.now() }
    );

    console.log('✅ HEIC converted:', {
      original: formatFileSize(file.size),
      converted: formatFileSize(convertedFile.size),
    });

    return convertedFile;
  } catch (error) {
    console.error('❌ HEIC conversion failed:', error);
    throw new Error(
      `Failed to convert HEIC image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
