import { Router, Request, Response } from 'express';

const router = Router();

const MOCK_USERS = [
  {
    id: 1,
    username: 'Administrator',
    email: 'admin@destinationjewelry.com',
    roles: ['administrator'],
    capabilities: {
      manage_options: true,
      edit_posts: true,
    }
  },
  {
    id: 2,
    username: 'Mitchell Ousley',
    email: 'mitchellousley@gmail.com',
    roles: ['customer'],
    capabilities: {}
  },
  {
    id: 3,
    username: 'Dennis Hoskins',
    email: 'dennis.r.hoskins@gmail.com',
    roles: ['customer'],
    capabilities: {}
  }
];

// Get user and nonce - called on app load (no auth required)
router.get('/user', async (req, res) => {
  try {
    // Return mock authenticated user for WordPress integration
    res.json({
      isAuthenticated: true,
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        roles: ['administrator'],
        capabilities: { manage_options: true }
      },
      nonce: 'mock-nonce'
    });
  } catch (error) {
    console.error('Auth user error:', error);
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

    // Check if mock_user_id is provided in query
    const mockUserId = req.query.mock_user_id ? parseInt(req.query.mock_user_id as string) : null;
    
    // If no mock user selected, return not authenticated
    if (!mockUserId) {
      return res.status(401).json({ 
        isAuthenticated: false,
        user: null
      });
    }

    // Find the mock user
    const user = MOCK_USERS.find(u => u.id === mockUserId);
    
    if (!user) {
      return res.status(401).json({ 
        isAuthenticated: false,
        user: null
      });
    }

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