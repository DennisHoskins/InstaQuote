import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    roles: string[];
    capabilities: Record<string, boolean>;
  };
}

const authUrl = `http://localhost:${process.env.PORT || 3001}/api/auth/verify`;

// Verify nonce and session
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'test') {
    req.user = {
      id: 1,
      username: 'TestUser',
      roles: ['administrator'],
      capabilities: { manage_options: true }
    };
    return next();
  }

  try {
    const nonce = req.headers['x-wp-nonce'] as string;

    if (!nonce) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get mock user ID from header
    const mockUserId = req.headers['x-mock-user-id'] as string;

    // Build verify URL with mock_user_id if present
    const verifyUrl = mockUserId 
      ? `${authUrl}?mock_user_id=${mockUserId}`
      : authUrl;

    // Call auth endpoint to verify session
    const response = await fetch(verifyUrl, {
      headers: {
        'Cookie': req.headers.cookie || '',
        'X-WP-Nonce': nonce,
      },
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const data = await response.json();
    
    if (!data.isAuthenticated) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Require admin role
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.roles.includes('administrator')) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}