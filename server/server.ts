import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
app.use(cors());

// Body parser
app.use(express.json());

// Routes
app.use('/api/search', searchRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/destinations', destinationsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/sync', adminSyncRouter);
app.use('/api/admin/sync-log', adminSyncLogRouter);
app.use('/api/admin/items', adminItemsRouter);
app.use('/api/admin/images', adminImagesRouter);
app.use('/api/admin/skus', adminSkusRouter);
app.use('/api/admin/sku-images', adminSkuImagesRouter);
app.use('/api/admin/metals', adminMetalsRouter);

// Don't start server if we're testing
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;