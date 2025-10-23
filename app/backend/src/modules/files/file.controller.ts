import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../../utils/logger';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  validationErrorResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';
import { FileUploadService } from '../../services/fileStorage.service';

const fileUploadService = new FileUploadService();

// Upload single file
export const uploadFile = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { folder = 'uploads', provider = 'local' } = req.body;

  if (!req.file) {
    return validationErrorResponse(res, ['File is required']);
  }

  const file: any = req.file;

  // Process file upload
  const result = await fileUploadService.processFile(file, provider, folder);

  if (!result.success) {
    return errorResponse(res, `File upload failed: ${result.error}`, 500);
  }

  // Save file record to database
  const fileResult = await query(`
    INSERT INTO files (
      tenant_id, original_name, filename, file_path, file_url, file_size,
      mime_type, provider, folder, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    ) RETURNING id, original_name, filename, file_url, file_size, mime_type, created_at
  `, [
    tenantId, file.originalname, result.filename, result.key,
    result.url, result.size, result.mimetype, provider, folder, true
  ]);

  const fileRecord = fileResult.rows[0];

  logger.info(`File uploaded for tenant ${tenantId}: ${fileRecord.filename}`);

  return successResponse(res, {
    id: fileRecord.id,
    originalName: fileRecord.original_name,
    filename: fileRecord.filename,
    url: fileRecord.file_url,
    size: fileRecord.file_size,
    mimeType: fileRecord.mime_type,
    provider,
    folder,
    createdAt: fileRecord.created_at
  }, 'File uploaded successfully');
});

// Upload multiple files
export const uploadFiles = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { folder = 'uploads', provider = 'local' } = req.body;

  if (!req.files || (req.files as any[]).length === 0) {
    return validationErrorResponse(res, ['Files are required']);
  }

  const files: any[] = req.files as any[];
  const uploadResults = [];

  for (const file of files) {
    try {
      // Process file upload
      const result = await fileUploadService.processFile(file, provider, folder);

      if (result.success) {
        // Save file record to database
        const fileResult = await query(`
          INSERT INTO files (
            tenant_id, original_name, filename, file_path, file_url, file_size,
            mime_type, provider, folder, is_active
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          ) RETURNING id, original_name, filename, file_url, file_size, mime_type, created_at
        `, [
          tenantId, file.originalname, result.filename, result.key,
          result.url, result.size, result.mimetype, provider, folder, true
        ]);

        const fileRecord = fileResult.rows[0];
        uploadResults.push({
          id: fileRecord.id,
          originalName: fileRecord.original_name,
          filename: fileRecord.filename,
          url: fileRecord.file_url,
          size: fileRecord.file_size,
          mimeType: fileRecord.mime_type,
          provider,
          folder,
          createdAt: fileRecord.created_at
        });
      } else {
        uploadResults.push({
          originalName: file.originalname,
          error: result.error
        });
      }
    } catch (error) {
      uploadResults.push({
        originalName: file.originalname,
        error: error.message
      });
    }
  }

  logger.info(`Multiple files uploaded for tenant ${tenantId}: ${uploadResults.length} files`);

  return successResponse(res, {
    files: uploadResults,
    totalFiles: files.length,
    successfulUploads: uploadResults.filter(r => r.id).length,
    failedUploads: uploadResults.filter(r => r.error).length
  }, 'Files upload completed');
});

// Get file details
export const getFile = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const fileId = req.params.id;

  const fileResult = await query(`
    SELECT 
      id, original_name, filename, file_path, file_url, file_size,
      mime_type, provider, folder, is_active, created_at, updated_at
    FROM files
    WHERE id = $1 AND tenant_id = $2
  `, [fileId, tenantId]);

  if (fileResult.rows.length === 0) {
    return notFoundResponse(res, 'File not found');
  }

  const file = fileResult.rows[0];

  return successResponse(res, {
    id: file.id,
    originalName: file.original_name,
    filename: file.filename,
    filePath: file.file_path,
    url: file.file_url,
    size: file.file_size,
    mimeType: file.mime_type,
    provider: file.provider,
    folder: file.folder,
    isActive: file.is_active,
    createdAt: file.created_at,
    updatedAt: file.updated_at
  }, 'File details retrieved successfully');
});

// List files
export const listFiles = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { 
    folder, 
    provider, 
    mimeType,
    page = 1, 
    limit = 10,
    search
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE f.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (folder) {
    whereClause += ` AND f.folder = $${paramIndex}`;
    params.push(folder);
    paramIndex++;
  }

  if (provider) {
    whereClause += ` AND f.provider = $${paramIndex}`;
    params.push(provider);
    paramIndex++;
  }

  if (mimeType) {
    whereClause += ` AND f.mime_type = $${paramIndex}`;
    params.push(mimeType);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (f.original_name ILIKE $${paramIndex} OR f.filename ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const filesResult = await query(`
    SELECT 
      f.id, f.original_name, f.filename, f.file_path, f.file_url, f.file_size,
      f.mime_type, f.provider, f.folder, f.is_active, f.created_at, f.updated_at
    FROM files f
    ${whereClause}
    ORDER BY f.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM files f
    ${whereClause}
  `, params);

  const files = filesResult.rows.map(row => ({
    id: row.id,
    originalName: row.original_name,
    filename: row.filename,
    filePath: row.file_path,
    url: row.file_url,
    size: row.file_size,
    mimeType: row.mime_type,
    provider: row.provider,
    folder: row.folder,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  return successResponse(res, {
    files,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: parseInt(countResult.rows[0].total),
      pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
    }
  }, 'Files retrieved successfully');
});

// Delete file
export const deleteFile = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const fileId = req.params.id;

  // Get file details
  const fileResult = await query(`
    SELECT file_path, provider, filename
    FROM files
    WHERE id = $1 AND tenant_id = $2
  `, [fileId, tenantId]);

  if (fileResult.rows.length === 0) {
    return notFoundResponse(res, 'File not found');
  }

  const file = fileResult.rows[0];

  // Delete file from storage
  const deleted = await fileUploadService.deleteFile(file.file_path, file.provider);

  if (!deleted) {
    logger.warn(`Failed to delete file from storage: ${file.file_path}`);
  }

  // Delete file record from database
  await query(`
    UPDATE files
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND tenant_id = $2
  `, [fileId, tenantId]);

  logger.info(`File deleted for tenant ${tenantId}: ${file.filename}`);

  return successResponse(res, {
    id: fileId,
    filename: file.filename,
    deletedAt: new Date().toISOString()
  }, 'File deleted successfully');
});

// Get file URL
export const getFileUrl = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const fileId = req.params.id;

  const fileResult = await query(`
    SELECT file_path, provider, file_url
    FROM files
    WHERE id = $1 AND tenant_id = $2 AND is_active = true
  `, [fileId, tenantId]);

  if (fileResult.rows.length === 0) {
    return notFoundResponse(res, 'File not found');
  }

  const file = fileResult.rows[0];

  // Get current file URL (in case of signed URLs)
  const url = await fileUploadService.getFileUrl(file.file_path, file.provider);

  return successResponse(res, {
    id: fileId,
    url,
    filePath: file.file_path,
    provider: file.provider
  }, 'File URL retrieved successfully');
});

// Get upload statistics
export const getUploadStats = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { startDate, endDate } = req.query;

  let whereClause = 'WHERE f.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (startDate) {
    whereClause += ` AND f.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND f.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_files,
      SUM(file_size) as total_size,
      COUNT(CASE WHEN provider = 'aws' THEN 1 END) as aws_files,
      COUNT(CASE WHEN provider = 'cloudinary' THEN 1 END) as cloudinary_files,
      COUNT(CASE WHEN provider = 'local' THEN 1 END) as local_files,
      COUNT(CASE WHEN mime_type LIKE 'image/%' THEN 1 END) as image_files,
      COUNT(CASE WHEN mime_type LIKE 'application/%' THEN 1 END) as document_files
    FROM files f
    ${whereClause}
  `, params);

  const stats = statsResult.rows[0];

  return successResponse(res, {
    totalFiles: parseInt(stats.total_files),
    totalSize: parseInt(stats.total_size || '0'),
    awsFiles: parseInt(stats.aws_files),
    cloudinaryFiles: parseInt(stats.cloudinary_files),
    localFiles: parseInt(stats.local_files),
    imageFiles: parseInt(stats.image_files),
    documentFiles: parseInt(stats.document_files),
    averageFileSize: stats.total_files > 0 ? parseInt(stats.total_size || '0') / parseInt(stats.total_files) : 0
  }, 'Upload statistics retrieved successfully');
});
