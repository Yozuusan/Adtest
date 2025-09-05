import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Routes
import oauthRoutes from './routes/oauth';
import variantsRoutes from './routes/variants';
import analyticsRoutes from './routes/analytics';
import mappingRoutes from './routes/mapping';
import installRoutes from './routes/install';
import debugRoutes from './routes/debug';
import debugFrontendRoutes from './routes/debug-frontend';
import userShopsRoutes from './routes/user-shops';
import productsRoutes from './routes/products';
import brandRoutes from './routes/brand';
import adlignVariantsRoutes from './routes/adlign-variants';
import aiVariantsRoutes from './routes/ai-variants';
import snippetRoutes from './routes/snippet';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/oauth', oauthRoutes);
app.use('/variants', variantsRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/mapping', mappingRoutes);
app.use('/install', installRoutes);
app.use('/debug', debugRoutes);
app.use('/debug-frontend', debugFrontendRoutes);
app.use('/user-shops', userShopsRoutes);
app.use('/products', productsRoutes);
app.use('/brand', brandRoutes);
app.use('/adlign-variants', adlignVariantsRoutes);
app.use('/ai-variants', aiVariantsRoutes);
app.use('/snippet', snippetRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Adlign Backend running on port ${PORT}`);
});
