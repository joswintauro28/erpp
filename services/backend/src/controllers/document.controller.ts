import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MultiTenantRequest } from '../middleware/tenant.middleware';
import {
  storageMetrics,
  storageLogs,
  addStorageLog,
  setStorageProvider,
  logObjectPut,
  logObjectDelete,
  updateStorageTotals,
  StorageProviderType
} from '../services/storage.service';

const prisma = new PrismaClient();

// GET /api/documents
export const getDocumentsData = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    const documents = await prisma.document.findMany({
      where: { organizationId },
      include: {
        versions: {
          orderBy: { version: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Compute active totals
    const totalFiles = documents.length;
    const storageUsedBytes = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

    // Update in-memory metrics
    updateStorageTotals(totalFiles, storageUsedBytes);

    res.json({
      documents,
      storageMetrics,
      storageLogs
    });
  } catch (error) {
    console.error('Get documents data error:', error);
    res.status(500).json({ error: 'Internal server error fetching document database' });
  }
};

// POST /api/documents (Upload / Ingest)
export const uploadDocument = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;
    const { name, fileType, fileSize, notes } = req.body;

    if (!name || !fileType || !fileSize) {
      return res.status(400).json({ error: 'Missing parameters name, fileType, or fileSize.' });
    }

    const activeProvider = storageMetrics.activeProvider;
    const userEmail = req.user?.email || 'System User';

    // Check if document already exists
    const existingDoc = await prisma.document.findUnique({
      where: {
        organizationId_name: { organizationId, name }
      }
    });

    let document;

    if (!existingDoc) {
      // Create new document (v1)
      const mockUrl = `https://mock-storage.kaasvex.io/${organizationId}/${name}`;

      document = await prisma.document.create({
        data: {
          organizationId,
          name,
          fileType,
          fileSize,
          url: mockUrl,
          storageProvider: activeProvider,
          currentVersion: 1,
          versions: {
            create: {
              version: 1,
              url: mockUrl,
              fileSize,
              updatedBy: userEmail,
              notes: notes || 'Initial upload'
            }
          }
        },
        include: {
          versions: true
        }
      });

      logObjectPut(name, fileSize, 1);
    } else {
      // Increment version and update main document pointer
      const newVersion = existingDoc.currentVersion + 1;
      const mockUrl = `https://mock-storage.kaasvex.io/${organizationId}/${name}?v=${newVersion}`;

      document = await prisma.$transaction(async (tx) => {
        // A. Add version entry
        await tx.documentVersion.create({
          data: {
            documentId: existingDoc.id,
            version: newVersion,
            url: mockUrl,
            fileSize,
            updatedBy: userEmail,
            notes: notes || `Version ${newVersion} overwrite`
          }
        });

        // B. Update core pointer
        const doc = await tx.document.update({
          where: { id: existingDoc.id },
          data: {
            fileSize,
            url: mockUrl,
            storageProvider: activeProvider,
            currentVersion: newVersion,
            ocrStatus: 'PENDING', // reset OCR status on new upload version
            ocrMetadata: null
          },
          include: {
            versions: {
              orderBy: { version: 'desc' }
            }
          }
        });

        return doc;
      });

      logObjectPut(name, fileSize, newVersion);
    }

    res.status(201).json({
      message: 'Document successfully uploaded and versioned.',
      document
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Internal server error processing file ingress' });
  }
};

// POST /api/documents/change-provider
export const changeProvider = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { provider } = req.body;
    const validProviders: StorageProviderType[] = ['AWS_S3', 'CLOUDFLARE_R2', 'MINIO'];

    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid storage provider selector.' });
    }

    setStorageProvider(provider);
    res.json({ message: `Active cloud storage provider toggled to ${provider}.` });
  } catch (error) {
    console.error('Change provider error:', error);
    res.status(500).json({ error: 'Internal server error changing cloud storage provider' });
  }
};

// POST /api/documents/:id/ocr
export const runOcrProcessing = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: { id, organizationId: req.tenant.id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found in workspace context.' });
    }

    // Mark as processing
    await prisma.document.update({
      where: { id },
      data: { ocrStatus: 'PROCESSING' }
    });

    const docId = document.id;
    const docName = document.name;

    // Simulate OCR delay (e.g. 800ms)
    setTimeout(async () => {
      try {
        // High fidelity mock extraction payload
        const vendors = ['Amazon Web Services', 'Microsoft Azure', 'GitHub Inc', 'Slack Technologies', 'Zoom Communications', 'Starbucks India', 'Dharampal Tea Depot'];
        const randomVendor = vendors[Math.floor(Math.random() * vendors.length)];

        const subtotal = Math.round(Math.random() * 25000 + 1500);
        const taxAmount = Math.round(subtotal * 0.18); // 18% standard GST
        const total = subtotal + taxAmount;

        const ocrData = {
          vendorName: randomVendor,
          invoiceNumber: `INV-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
          invoiceDate: new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000).toISOString().split('T')[0],
          subtotal,
          taxAmount,
          total,
          currency: 'INR',
          description: `Cloud hosting / business subscriptions from ${randomVendor}.`
        };

        await prisma.document.update({
          where: { id: docId },
          data: {
            ocrStatus: 'COMPLETED',
            ocrMetadata: JSON.stringify(ocrData)
          }
        });

        const provider = storageMetrics.activeProvider;
        addStorageLog(`[${provider}] OCR Engine extracted metadata for key="${docName}". Status: COMPLETED.`);
      } catch (err) {
        console.error('Background OCR process failed:', err);
      }
    }, 800);

    res.json({ message: 'OCR analysis worker started.' });
  } catch (error) {
    console.error('Run OCR error:', error);
    res.status(500).json({ error: 'Internal server error initiating OCR pipeline' });
  }
};

// DELETE /api/documents/:id
export const deleteDocument = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: { id, organizationId: req.tenant.id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Delete document (cascade deletes document versions due to onDelete: Cascade setup in DB)
    await prisma.document.delete({
      where: { id }
    });

    logObjectDelete(document.name);

    res.json({ message: 'Document and its entire version branches purged from storage.' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error deleting file' });
  }
};
