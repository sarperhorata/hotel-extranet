import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import {
  createBackup,
  restoreBackup,
  listBackups,
  getBackupDetails,
  deleteBackup,
  cleanupBackups,
  getBackupStats,
  verifyBackupIntegrity,
  uploadBackupToCloud,
  scheduleBackups,
  testBackup,
  getBackupConfig,
  updateBackupConfig
} from './backup.controller';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticateToken);
router.use(tenantMiddleware);

// Backup management routes
router.post('/create', authorize('admin'), createBackup);
router.post('/restore/:backupId', authorize('admin'), restoreBackup);
router.get('/', authorize('admin', 'hotel_manager'), listBackups);
router.get('/:backupId', authorize('admin', 'hotel_manager'), getBackupDetails);
router.delete('/:backupId', authorize('admin'), deleteBackup);

// Backup maintenance routes
router.post('/cleanup', authorize('admin'), cleanupBackups);
router.get('/stats', authorize('admin', 'hotel_manager'), getBackupStats);
router.post('/:backupId/verify', authorize('admin', 'hotel_manager'), verifyBackupIntegrity);
router.post('/:backupId/upload', authorize('admin'), uploadBackupToCloud);

// Backup configuration routes
router.post('/schedule', authorize('admin'), scheduleBackups);
router.post('/test', authorize('admin'), testBackup);
router.get('/config', authorize('admin', 'hotel_manager'), getBackupConfig);
router.put('/config', authorize('admin'), updateBackupConfig);

export default router;
