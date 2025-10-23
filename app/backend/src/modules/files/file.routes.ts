import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import { FileUploadService } from '../../services/fileStorage.service';
import {
  uploadFile,
  uploadFiles,
  getFile,
  listFiles,
  deleteFile,
  getFileUrl,
  getUploadStats
} from './file.controller';

const router = Router();
const fileUploadService = new FileUploadService();

// Apply authentication and tenant middleware
router.use(authenticateToken);
router.use(tenantMiddleware);

// File upload routes
router.post('/upload', authorize('admin', 'hotel_manager'), fileUploadService.getUploadMiddleware().single('file'), uploadFile);
router.post('/upload-multiple', authorize('admin', 'hotel_manager'), fileUploadService.getUploadMiddleware().array('files', 10), uploadFiles);

// File management routes
router.get('/:id', authorize('admin', 'hotel_manager', 'staff'), getFile);
router.get('/', authorize('admin', 'hotel_manager', 'staff'), listFiles);
router.delete('/:id', authorize('admin', 'hotel_manager'), deleteFile);
router.get('/:id/url', authorize('admin', 'hotel_manager', 'staff'), getFileUrl);

// Statistics route
router.get('/stats/upload', authorize('admin', 'hotel_manager'), getUploadStats);

export default router;
