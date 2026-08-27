/**
 * File helper utilities for resolving file_id from owner records.
 *
 * CRM entities store `file_uri` (s3://...) but the frontend needs
 * `file_id` (numeric ID) to use the /api/files/<id>/stream endpoint.
 * This module provides a helper to fetch the FileRecord by owner.
 */

export interface FileRecord {
  id: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  bucket: string;
  object_key: string;
  owner_type: string;
  owner_id: number | null;
}

/**
 * Fetch the FileRecord for a given owner_type and owner_id.
 * Returns the first matching record, or null if none found.
 */
export async function fetchFileRecord(
  ownerType: string,
  ownerId: number
): Promise<FileRecord | null> {
  try {
    const res = await fetch(`/api/files?owner_type=${ownerType}&owner_id=${ownerId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const files = data.files || data;
    if (Array.isArray(files) && files.length > 0) {
      return files[0];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve file_id from a file_uri string (s3://bucket/key).
 * Returns null if the URI is not parseable.
 */
export function resolveFileIdFromFileUri(fileUri: string | null | undefined): string | null {
  if (!fileUri) return null;
  // file_uri format: s3://bucket/key
  const match = fileUri.match(/^s3:\/\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}
