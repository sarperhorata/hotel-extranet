import { Router } from 'express';
import { 
  register, 
  login, 
  refreshToken, 
  logout, 
  getProfile, 
  updateProfile, 
  changePassword 
} from './auth.controller';
import { authenticateToken, authenticateRefreshToken } from '../../middlewares/auth';
import { rateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Public routes (with rate limiting)
router.post('/register', rateLimiter, register);
router.post('/login', rateLimiter, login);
router.post('/refresh', rateLimiter, authenticateRefreshToken, refreshToken);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

export default router;
