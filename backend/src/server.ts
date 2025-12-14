import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import rateLimit from 'express-rate-limit';

const PORT = env.port;

const app = express();

// Trust proxy - needed for rate limiting when behind a proxy (Next.js, nginx, etc.)
app.set('trust proxy', 1);

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes (time frame for which requests are counted)
	max: 100, // Limit each IP to 100 requests per `windowMs`
	standardHeaders: 'draft-7', // Setting headers according to the IETF draft
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	message:
		'Too many requests from this IP, please try again after 15 minutes',
});

app.use(
	helmet({
		crossOriginResourcePolicy: { policy: 'cross-origin' },
	})
);
app.use(
	cors({
		origin: 'http://localhost:3000',
		credentials: true,
	})
);
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

// Only apply rate limiter to protected API routes, not to /user or static/health endpoints
const apiV1 = express.Router();

// Routes without auth (for user creation during sign-in)

// Apply rate limiter and auth middleware to protected routes
apiV1.use(limiter);


app.use('/api/v1', apiV1);
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
	console.log(`🌐 Web server listening on http://localhost:${PORT}`);
});
