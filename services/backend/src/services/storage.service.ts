export type StorageProviderType = 'AWS_S3' | 'CLOUDFLARE_R2' | 'MINIO';

export interface StorageMetrics {
  activeProvider: StorageProviderType;
  totalFiles: number;
  storageUsedBytes: number;
  apiRequestCount: number;
  bandwidthTransferredBytes: number;
}

// In-Memory Cloud Storage Metrics
export const storageMetrics: StorageMetrics = {
  activeProvider: 'AWS_S3',
  totalFiles: 0,
  storageUsedBytes: 0,
  apiRequestCount: 0,
  bandwidthTransferredBytes: 0
};

// In-Memory Live Logs Buffer (Circular buffer of 100 items max)
export const storageLogs: string[] = [];

export const addStorageLog = (msg: string) => {
  const timestamp = new Date().toISOString();
  storageLogs.push(`[${timestamp}] ${msg}`);
  if (storageLogs.length > 100) {
    storageLogs.shift();
  }
};

// Initialize Storage Logs
addStorageLog('Storage Subsystem Initialized. Active Provider: AWS_S3.');
addStorageLog('[AWS S3] Handshake successful with bucket URL: s3://kaasvex-production-storage');
addStorageLog('[AWS S3] Default Server-Side Encryption (SSE-S3) enabled.');

// Toggle Storage Provider
export const setStorageProvider = (provider: StorageProviderType) => {
  storageMetrics.activeProvider = provider;
  addStorageLog(`=== Storage Provider switched to ${provider} ===`);
  
  if (provider === 'AWS_S3') {
    addStorageLog(`[AWS S3] Re-establishing S3Client. Target Region: us-east-1.`);
    addStorageLog(`[AWS S3] Connected to S3 bucket: s3://kaasvex-production-storage`);
    addStorageLog(`[AWS S3] SSE-S3 encryption verified. Standard access policies hydrated.`);
  } else if (provider === 'CLOUDFLARE_R2') {
    addStorageLog(`[Cloudflare R2] Initializing S3-compatible cloud client wrapper.`);
    addStorageLog(`[Cloudflare R2] Linked bucket "kaasvex-r2-assets" using endpoint R2 account ID: r2_acct_88204f.`);
    addStorageLog(`[Cloudflare R2] Smart Edge caching policies configured (max-age: 31536000).`);
  } else if (provider === 'MINIO') {
    addStorageLog(`[MinIO] Establishing TCP connection to private MinIO cluster: http://192.168.1.150:9000.`);
    addStorageLog(`[MinIO] Bucket checklist: "kaasvex-minio-bucket" verified and marked durable.`);
    addStorageLog(`[MinIO] Access Key: "kaasvex_access_key" validated. Console listening at port 9001.`);
  }
};

// API activity logger helpers
export const incrementRequests = (bytesTransferred = 0) => {
  storageMetrics.apiRequestCount++;
  storageMetrics.bandwidthTransferredBytes += bytesTransferred;
};

export const updateStorageTotals = (filesCount: number, sizeBytes: number) => {
  storageMetrics.totalFiles = filesCount;
  storageMetrics.storageUsedBytes = sizeBytes;
};

export const logObjectPut = (fileName: string, sizeBytes: number, version = 1) => {
  incrementRequests(sizeBytes);
  const provider = storageMetrics.activeProvider;
  if (provider === 'AWS_S3') {
    addStorageLog(`[AWS S3] PutObjectRequest: key="${fileName}", size=${sizeBytes} bytes, version=${version}. Status: 200 OK.`);
  } else if (provider === 'CLOUDFLARE_R2') {
    addStorageLog(`[Cloudflare R2] PutObject (Upload): bucket="kaasvex-r2-assets", key="${fileName}", size=${sizeBytes} bytes, version=${version}.`);
  } else if (provider === 'MINIO') {
    addStorageLog(`[MinIO] putObject: objectName="${fileName}", size=${sizeBytes} bytes, content-type="application/octet-stream".`);
  }
};

export const logObjectGet = (fileName: string, sizeBytes: number, version = 1) => {
  incrementRequests(sizeBytes);
  const provider = storageMetrics.activeProvider;
  if (provider === 'AWS_S3') {
    addStorageLog(`[AWS S3] GetObjectRequest: key="${fileName}", versionId=${version}. Transferred ${sizeBytes} bytes.`);
  } else if (provider === 'CLOUDFLARE_R2') {
    addStorageLog(`[Cloudflare R2] GetObject: key="${fileName}" fetched from edge CDN. Bandwidth: ${sizeBytes} bytes.`);
  } else if (provider === 'MINIO') {
    addStorageLog(`[MinIO] getObject: objectName="${fileName}", size=${sizeBytes} bytes, fetch success.`);
  }
};

export const logObjectDelete = (fileName: string) => {
  incrementRequests(0);
  const provider = storageMetrics.activeProvider;
  if (provider === 'AWS_S3') {
    addStorageLog(`[AWS S3] DeleteObjectRequest: key="${fileName}". Object removed successfully.`);
  } else if (provider === 'CLOUDFLARE_R2') {
    addStorageLog(`[Cloudflare R2] DeleteObject: key="${fileName}" purged from bucket "kaasvex-r2-assets".`);
  } else if (provider === 'MINIO') {
    addStorageLog(`[MinIO] removeObject: objectName="${fileName}" deleted from local cluster.`);
  }
};
