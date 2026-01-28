import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import searchRouter from './routes/search.js';
import catalogRouter from './routes/catalog.js';
import destinationsRouter from './routes/destinations.js';
import itemsRouter from './routes/items.js';
import adminRouter from './routes/admin/admin.js';
import adminSyncRouter from './routes/admin/sync.js';
import adminSyncLogRouter from './routes/admin/sync-log.js';
import adminItemsRouter from './routes/admin/items.js';
import adminImagesRouter from './routes/admin/images.js';
import adminSkusRouter from './routes/admin/skus.js';
import adminSkuImagesRouter from './routes/admin/sku-images.js';
import adminMetalsRouter from './routes/admin/metals.js';

dotenv.config();

const app: Express = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Body parser
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);

app.use('/api/search', requireAuth, searchRouter);
app.use('/api/catalog', requireAuth, catalogRouter);
app.use('/api/destinations', requireAuth, destinationsRouter);
app.use('/api/items', requireAuth, itemsRouter);

app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
app.use('/api/admin/sync', requireAuth, requireAdmin, adminSyncRouter);
app.use('/api/admin/sync-log', requireAuth, requireAdmin, adminSyncLogRouter);
app.use('/api/admin/items', requireAuth, requireAdmin, adminItemsRouter);
app.use('/api/admin/images', requireAuth, requireAdmin, adminImagesRouter);
app.use('/api/admin/skus', requireAuth, requireAdmin, adminSkusRouter);
app.use('/api/admin/sku-images', requireAuth, requireAdmin, adminSkuImagesRouter);
app.use('/api/admin/metals', requireAuth, requireAdmin, adminMetalsRouter);

// Don't start server if we're testing
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;