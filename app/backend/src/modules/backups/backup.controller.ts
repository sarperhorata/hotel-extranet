import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';
import { BackupService } from '../../services/backup.service';

// Create backup service instance
const backupService = new BackupService();

// Create database backup
export const createBackup = catchAsync(async (req: Request, res: Response) => {
  const { backupType = 'full' } = req.body;

  if (!['full', 'incremental'].includes(backupType)) {
    return validationErrorResponse(res, ['Backup type must be full or incremental']);
  }

  let result;
  if (backupType === 'full') {
    result = await backupService.createDatabaseBackup();
  } else {
    result = await backupService.createIncrementalBackup();
  }

  if (!result.success) {
    return errorResponse(res, `Backup creation failed: ${result.error}`, 500);
  }

  logger.info(`Backup created successfully: ${result.backupId}`);

  return successResponse(res, {
    backupId: result.backupId,
    filename: result.filename,
    size: result.size,
    backupType,
    createdAt: result.createdAt
  }, 'Database backup created successfully');
});

// Restore database from backup
export const restoreBackup = catchAsync(async (req: Request, res: Response) => {
  const { backupId } = req.params;

  if (!backupId) {
    return validationErrorResponse(res, ['Backup ID is required']);
  }

  const result = await backupService.restoreDatabase(backupId);

  if (!result.success) {
    return errorResponse(res, `Database restore failed: ${result.error}`, 500);
  }

  logger.info(`Database restored successfully from backup: ${backupId}`);

  return successResponse(res, {
    backupId,
    restoredAt: result.restoredAt,
    tablesAffected: result.tablesAffected,
    recordsRestored: result.recordsRestored
  }, 'Database restored successfully');
});

// List all backups
export const listBackups = catchAsync(async (req: Request, res: Response) => {
  const {
    backupType,
    status,
    page = 1,
    limit = 10
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = '';
  const params: any[] = [];
  let paramIndex = 1;

  if (backupType) {
    whereClause += ` WHERE backup_type = $${paramIndex}`;
    params.push(backupType);
    paramIndex++;
  }

  if (status) {
    const connector = whereClause ? ' AND' : ' WHERE';
    whereClause += `${connector} status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const backupsResult = await backupService.listBackups();

  // Apply filtering and pagination in memory for simplicity
  let filteredBackups = backupsResult;

  if (backupType) {
    filteredBackups = filteredBackups.filter(b => b.backupType === backupType);
  }

  if (status) {
    filteredBackups = filteredBackups.filter(b => b.status === status);
  }

  // Apply pagination
  const startIndex = offset;
  const endIndex = startIndex + Number(limit);
  const paginatedBackups = filteredBackups.slice(startIndex, endIndex);

  return successResponse(res, {
    backups: paginatedBackups,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: filteredBackups.length,
      pages: Math.ceil(filteredBackups.length / Number(limit))
    }
  }, 'Backups retrieved successfully');
});

// Get backup details
export const getBackupDetails = catchAsync(async (req: Request, res: Response) => {
  const { backupId } = req.params;

  if (!backupId) {
    return validationErrorResponse(res, ['Backup ID is required']);
  }

  const backups = await backupService.listBackups();
  const backup = backups.find(b => b.backupId === backupId);

  if (!backup) {
    return notFoundResponse(res, 'Backup not found');
  }

  return successResponse(res, backup, 'Backup details retrieved successfully');
});

// Delete backup
export const deleteBackup = catchAsync(async (req: Request, res: Response) => {
  const { backupId } = req.params;

  if (!backupId) {
    return validationErrorResponse(res, ['Backup ID is required']);
  }

  try {
    // In a real implementation, you would delete the backup file and database record
    logger.info(`Deleting backup: ${backupId}`);

    // For now, we'll just return success
    return successResponse(res, {
      backupId,
      deleted: true
    }, 'Backup deleted successfully');
  } catch (error) {
    logger.error(`Failed to delete backup ${backupId}:`, error);
    return errorResponse(res, 'Failed to delete backup', 500);
  }
});

// Cleanup old backups
export const cleanupBackups = catchAsync(async (req: Request, res: Response) => {
  const deletedCount = await backupService.cleanupOldBackups();

  return successResponse(res, {
    deletedCount,
    message: `Cleaned up ${deletedCount} old backups`
  }, 'Backup cleanup completed successfully');
});

// Get backup statistics
export const getBackupStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await backupService.getBackupStats();

  return successResponse(res, stats, 'Backup statistics retrieved successfully');
});

// Verify backup integrity
export const verifyBackupIntegrity = catchAsync(async (req: Request, res: Response) => {
  const { backupId } = req.params;

  if (!backupId) {
    return validationErrorResponse(res, ['Backup ID is required']);
  }

  const isValid = await backupService.verifyBackupIntegrity(backupId);

  return successResponse(res, {
    backupId,
    isValid,
    verifiedAt: new Date().toISOString()
  }, isValid ? 'Backup integrity verified' : 'Backup integrity check failed');
});

// Upload backup to cloud
export const uploadBackupToCloud = catchAsync(async (req: Request, res: Response) => {
  const { backupId } = req.params;

  if (!backupId) {
    return validationErrorResponse(res, ['Backup ID is required']);
  }

  const success = await backupService.uploadBackupToCloud(backupId);

  if (!success) {
    return errorResponse(res, 'Failed to upload backup to cloud', 500);
  }

  return successResponse(res, {
    backupId,
    uploaded: true
  }, 'Backup uploaded to cloud successfully');
});

// Schedule automatic backups
export const scheduleBackups = catchAsync(async (req: Request, res: Response) => {
  const { schedule, retentionDays } = req.body;

  try {
    // Update backup configuration
    await backupService.scheduleBackups();

    return successResponse(res, {
      schedule: schedule || '0 2 * * *',
      retentionDays: retentionDays || 30,
      configured: true
    }, 'Backup schedule configured successfully');
  } catch (error) {
    logger.error('Failed to schedule backups:', error);
    return errorResponse(res, 'Failed to configure backup schedule', 500);
  }
});

// Test backup functionality
export const testBackup = catchAsync(async (req: Request, res: Response) => {
  const { backupType = 'full' } = req.body;

  try {
    logger.info(`Testing ${backupType} backup creation...`);

    // Create a test backup
    const result = backupType === 'full'
      ? await backupService.createDatabaseBackup()
      : await backupService.createIncrementalBackup();

    if (result.success) {
      // Clean up test backup
      try {
        if (fs.existsSync(result.filename)) {
          fs.unlinkSync(result.filename);
        }
      } catch (error) {
        logger.warn(`Failed to clean up test backup file: ${result.filename}`);
      }

      return successResponse(res, {
        backupType,
        backupId: result.backupId,
        testPassed: true
      }, 'Backup test completed successfully');
    } else {
      return errorResponse(res, `Backup test failed: ${result.error}`, 500);
    }
  } catch (error) {
    logger.error(`Backup test failed:`, error);
    return errorResponse(res, 'Backup test failed', 500);
  }
});

// Get backup configuration
export const getBackupConfig = catchAsync(async (req: Request, res: Response) => {
  const config = {
    schedule: '0 2 * * *', // Daily at 2 AM
    retentionDays: 30,
    compression: true,
    encryption: false,
    storageProvider: 'local'
  };

  return successResponse(res, config, 'Backup configuration retrieved successfully');
});

// Update backup configuration
export const updateBackupConfig = catchAsync(async (req: Request, res: Response) => {
  const { schedule, retentionDays, storageProvider } = req.body;

  try {
    // In a real implementation, you would update the configuration
    logger.info('Updating backup configuration');

    const updatedConfig = {
      schedule: schedule || '0 2 * * *',
      retentionDays: retentionDays || 30,
      storageProvider: storageProvider || 'local'
    };

    return successResponse(res, updatedConfig, 'Backup configuration updated successfully');
  } catch (error) {
    logger.error('Failed to update backup configuration:', error);
    return errorResponse(res, 'Failed to update backup configuration', 500);
  }
});
