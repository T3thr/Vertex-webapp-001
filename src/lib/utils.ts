import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Encode Thai slug for URL usage
 * Handles Unicode characters properly
 */
export function encodeSlug(slug: string): string {
  return encodeURIComponent(slug.trim())
}

/**
 * Decode Thai slug from URL
 * Handles URL-encoded Unicode characters
 */
export function decodeSlug(encodedSlug: string): string {
  return decodeURIComponent(encodedSlug.trim())
}

/**
 * Create a safe URL path for novel details
 * @param slug The novel slug (can contain Thai characters)
 * @returns Safe URL path
 */
export function createNovelUrl(slug: string): string {
  return `/novels/${encodeSlug(slug)}`
}