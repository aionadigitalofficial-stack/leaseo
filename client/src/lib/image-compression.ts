import imageCompression from "browser-image-compression";

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export async function compressImage(
  file: File,
  options?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
  }
): Promise<CompressionResult> {
  const originalSize = file.size;

  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    preserveExif: true,
    ...options,
  };

  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    
    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio: Math.round((1 - compressedFile.size / originalSize) * 100),
    };
  } catch (error) {
    console.error("Image compression failed:", error);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
    };
  }
}

export async function compressImages(
  files: File[],
  options?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
  }
): Promise<CompressionResult[]> {
  const results = await Promise.all(
    files.map((file) => compressImage(file, options))
  );
  return results;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
