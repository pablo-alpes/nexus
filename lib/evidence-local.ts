/**
 * Local evidence upload fallback when Azure Blob is not configured.
 * Stores files under data/evidence-local/ and still creates Evidence records.
 * Production Azure path remains in uploadEvidence().
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export async function uploadEvidenceLocal(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  metadata?: Record<string, string>
): Promise<{ blobName: string; url: string }> {
  const root = path.join(process.cwd(), 'data', 'evidence-local');
  const cabinet = metadata?.cabinetId || 'no-cabinet';
  const client = metadata?.clientId || 'no-client';
  const article = (metadata?.article || 'general').replace(/\s+/g, '_');
  const dir = path.join(root, cabinet, client, article);
  fs.mkdirSync(dir, { recursive: true });

  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blobName = `${cabinet}/${client}/${article}/${Date.now()}-${hash}-${safeName}`;
  const fullPath = path.join(root, blobName);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);

  return {
    blobName,
    url: `file://${fullPath}`,
  };
}
