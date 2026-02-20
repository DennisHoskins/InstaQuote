import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    display_name: string;
    roles: string[];
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // Skip auth in test environment
  if (process.env.NODE_ENV === 'test') {
    req.user = {
      id: 1,
      username: 'TestUser',
      email: 'test@example.com',
      display_name: 'Test User',
      roles: ['administrator'],
    };
    return next();
  }

  // Verify API key
  const apiKey = req.headers['x-instaquote-key'] as string;
  if (!apiKey || apiKey !== process.env.INSTAQUOTE_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Decode user data
  const userHeader = req.headers['x-instaquote-user'] as string;
  if (!userHeader) {
    return res.status(401).json({ error: 'User data required' });
  }

  try {
    const userData = JSON.parse(Buffer.from(userHeader, 'base64').toString('utf-8'));
    req.user = userData;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid user data' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.roles.includes('administrator')) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}