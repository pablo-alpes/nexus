import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import crypto from 'crypto';

const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'dora-evidence';

let containerClient: ContainerClient | null = null;

function getContainerClient(): ContainerClient {
  if (containerClient) return containerClient;

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  containerClient = blobServiceClient.getContainerClient(containerName);
  return containerClient;
}

export function isAzureStorageConfigured(): boolean {
  return !!process.env.AZURE_STORAGE_CONNECTION_STRING;
}

export async function ensureContainerExists() {
  const client = getContainerClient();
  const exists = await client.exists();
  if (!exists) {
    await client.create({
      access: 'private',
    });
  }
}

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
  const client = getContainerClient();

  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);

  const encrypted = Buffer.concat([
    iv,
    cipher.update(file),
    cipher.final(),
  ]);

  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  const cabinet = metadata?.cabinetId || 'shared';
  const company = metadata?.clientId || 'shared';
  const article = (metadata?.article || 'general').replace(/\s+/g, '_');
  const blobName = `evidence/${cabinet}/${company}/${article}/${timestamp}-${randomId}-${fileName}`;

  const blockBlobClient = client.getBlockBlobClient(blobName);

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
  const client = getContainerClient();
  const blockBlobClient = client.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download(0);

  if (!downloadResponse.readableStreamBody) {
    throw new Error('Failed to download file');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of downloadResponse.readableStreamBody) {
    chunks.push(chunk);
  }

  const encrypted = Buffer.concat(chunks);

  const encryptionKey = getEncryptionKey();
  const iv = encrypted.slice(0, 16);
  const encryptedData = encrypted.slice(16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted;
}

export async function deleteEvidence(blobName: string): Promise<void> {
  const client = getContainerClient();
  const blockBlobClient = client.getBlockBlobClient(blobName);
  await blockBlobClient.delete();
}

export async function getEvidenceMetadata(blobName: string) {
  const client = getContainerClient();
  const blockBlobClient = client.getBlockBlobClient(blobName);
  const properties = await blockBlobClient.getProperties();
  return {
    contentType: properties.contentType,
    metadata: properties.metadata,
    size: properties.contentLength,
    lastModified: properties.lastModified,
  };
}
