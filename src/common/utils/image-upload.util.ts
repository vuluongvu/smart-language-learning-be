import { BadRequestException } from '@nestjs/common';

export type SupportedUploadedImageMime =
  'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

export interface UploadedImageInput {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

/**
 * Inspects image magic bytes to identify supported upload formats without
 * trusting the client-supplied MIME header.
 */
export function detectImageMimeType(
  buffer: Buffer,
): SupportedUploadedImageMime | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString('ascii');
    if (header === 'GIF87a' || header === 'GIF89a') {
      return 'image/gif';
    }
  }
  return null;
}

/**
 * Validates presence, byte limit, and magic-byte image type, then encodes the
 * uploaded buffer into an inline base64 data URL suitable for AI vision APIs.
 */
export function validateAndEncodeImageDataUrl(
  file: UploadedImageInput | undefined,
  maxBytes: number,
  maxLabel: string,
): string {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new BadRequestException('Image file is required');
  }
  if (file.buffer.length > maxBytes) {
    throw new BadRequestException(
      `Image file size must not exceed ${maxLabel}`,
    );
  }

  const detectedMime = detectImageMimeType(file.buffer);
  if (!detectedMime) {
    throw new BadRequestException(
      'Unsupported image format. Please upload a PNG, JPEG, WebP, or GIF file.',
    );
  }

  return `data:${detectedMime};base64,${file.buffer.toString('base64')}`;
}
