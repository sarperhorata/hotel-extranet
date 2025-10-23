import { Router } from 'express';
import { 
  searchAvailability,
  getSearchSuggestions,
  getPopularDestinations,
  getSearchFilters
} from './search.controller';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Search routes
router.post('/availability', searchAvailability);
router.get('/suggestions', getSearchSuggestions);
router.get('/destinations', getPopularDestinations);
router.get('/filters', getSearchFilters);

export default router;
