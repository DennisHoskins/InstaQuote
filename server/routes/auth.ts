import { Router, Request, Response } from 'express';

const router = Router();

// Get user and nonce - called on app load (no auth required)
router.get('/user', async (req: Request, res: Response) => {
  try {
    // Mock authentication - in production, verify WordPress session cookie
    const isAuthenticated = true;
    
    if (!isAuthenticated) {
      return res.status(401).json({ 
        isAuthenticated: false,
        user: null,
        nonce: null
      });
    }

    // Mock user data - in production, get from WordPress
    const user = {
      id: 1,
      username: 'Dennis',
      email: 'dennis@example.com',
      roles: ['administrator'],
      capabilities: {
        manage_options: true,
        edit_posts: true,
      }
    };

    // Generate nonce - in production, get from WordPress
    const nonce = 'wp_rest_' + Date.now();

    res.json({
      isAuthenticated: true,
      user,
      nonce
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify session and nonce - called by middleware (no auth required)
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const nonce = req.headers['x-wp-nonce'] as string;

    if (!nonce || !nonce.startsWith('wp_rest_')) {
      return res.status(401).json({ 
        isAuthenticated: false,
        user: null
      });
    }

    // Mock verification - in production, verify with WordPress
    const isAuthenticated = true;
    
    if (!isAuthenticated) {
      return res.status(401).json({ 
        isAuthenticated: false,
        user: null
      });
    }

    // Mock user data - in production, get from WordPress
    const user = {
      id: 1,
      username: 'Dennis',
      roles: ['administrator'],
      capabilities: {
        manage_options: true,
        edit_posts: true,
      }
    };

    res.json({
      isAuthenticated: true,
      user
    });
  } catch (error) {
    console.error('Auth verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;