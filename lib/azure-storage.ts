import { BlobServiceClient } from '@azure/storage-blob';
import crypto from 'crypto';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'dora-evidence';

if (!connectionString) {
  throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Ensure container exists
export async function ensureContainerExists() {
  const exists = await containerClient.exists();
  if (!exists) {
    await containerClient.create({
      access: 'private',
    });
  }
}

// Encryption key from environment
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  return crypto.createHash('sha256').update(key).digest();
}

export async function uploadEvidence(
  file: Buffer,
  fileName: string,
  mimeType: string,
  metadata?: Record<string, string>
): Promise<{ blobName: string; url: string }> {
  await ensureContainerExists();

  // Encrypt file before upload
  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  
  const encrypted = Buffer.concat([
    iv,
    cipher.update(file),
    cipher.final()
  ]);

  // Generate unique blob name
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  const blobName = `evidence/${timestamp}-${randomId}-${fileName}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(encrypted, encrypted.length, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
    },
    metadata: {
      ...metadata,
      originalFileName: fileName,
      encrypted: 'true',
      uploadedAt: new Date().toISOString(),
    },
  });

  return {
    blobName,
    url: blockBlobClient.url,
  };
}

export async function downloadEvidence(blobName: string): Promise<Buffer> {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download(0);
  
  if (!downloadResponse.readableStreamBody) {
    throw new Error('Failed to download file');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of downloadResponse.readableStreamBody) {
    chunks.push(chunk);
  }
  
  const encrypted = Buffer.concat(chunks);
  
  // Decrypt file
  const encryptionKey = getEncryptionKey();
  const iv = encrypted.slice(0, 16);
  const encryptedData = encrypted.slice(16);
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ]);

  return decrypted;
}

export async function deleteEvidence(blobName: string): Promise<void> {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.delete();
}

export async function getEvidenceMetadata(blobName: string) {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const properties = await blockBlobClient.getProperties();
  return {
    contentType: properties.contentType,
    metadata: properties.metadata,
    size: properties.contentLength,
    lastModified: properties.lastModified,
  };
}

