/**
 * File helper utilities for resolving file_id from owner records.
 *
 * CRM entities store `file_uri` (s3://...) but the frontend needs
 * `file_id` (numeric ID) to use the /api/files/<id>/stream endpoint.
 * This module provides a helper to fetch the FileRecord by owner.
 */

// Re-export FileRecord from file-upload to avoid duplicate interface
export type { FileRecord } from "../components/shared/file-upload";
import type { FileRecord } from "../components/shared/file-upload";

/**
 * Fetch the FileRecord for a given owner_type and owner_id.
 * Returns the first matching record, or null if none found.
 */
export async function fetchFileRecord(
  ownerType: string,
  ownerId: number,
): Promise<FileRecord | null> {
  try {
    const { api } = await import("@datavex/auth-middleware");
    const records = await api.get<FileRecord[]>(
      `/files?owner_type=${ownerType}&owner_id=${ownerId}`,
    );
    return records.length > 0 ? records[0] : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a file_id from a file_uri (s3://...) by looking up the FileRecord.
 * If file_id is already available, returns it directly.
 */
export async function resolveFileIdFromFileUri(
  fileUri: string | null | undefined,
): Promise<string | null> {
  if (!fileUri) return null;

  // If it's already a numeric ID, return as-is
  if (/^\d+$/.test(fileUri)) return fileUri;

  // Extract owner info from s3:// URIs if possible
  // s3://bucket/path — we need to look up by object_key
  try {
    const { api } = await import("@datavex/auth-middleware");
    const records = await api.get<FileRecord[]>(
      `/files?object_key=${encodeURIComponent(fileUri)}`,
    );
    return records.length > 0 ? String(records[0].id) : null;
  } catch {
    return null;
  }
}
