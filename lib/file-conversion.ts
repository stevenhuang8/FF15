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
 * Convert a single file to a data URL (base64)
 */
export async function convertFileToDataURL(file: File): Promise<FileDataPart> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        type: 'file',
        mediaType: file.type,
        url: reader.result as string,
      });
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsDataURL(file);
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
