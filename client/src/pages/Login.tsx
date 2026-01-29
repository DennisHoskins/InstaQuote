import { useNavigate } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const MOCK_USERS = [
  {
    id: 1,
    username: 'Administrator',
    email: 'admin@destinationjewelry.com',
    roles: ['administrator'],
  },
  {
    id: 2,
    username: 'Mitchell Ousley',
    email: 'mitchellousley@gmail.com',
    roles: ['customer'],
  },
  {
    id: 3,
    username: 'Dennis Hoskins',
    email: 'dennis.r.hoskins@gmail.com',
    roles: ['customer'],
  },
];

export default function Login() {
  const navigate = useNavigate();

  const handleUserSelect = (userId: number) => {
    // Store selected user in localStorage
    localStorage.setItem('mock_user_id', userId.toString());
    
    // Redirect to home
    navigate('/');
    
    // Reload to trigger auth refresh
    window.location.reload();
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Typography variant="h3" component="h1">
          InstaQuote Login
        </Typography>

        <Typography variant="body1" color="text.secondary">
          Select a user to continue
        </Typography>

        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MOCK_USERS.map((user) => (
            <Paper
              key={user.id}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: 2,
                },
              }}
            >
              <Button
                fullWidth
                onClick={() => handleUserSelect(user.id)}
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textTransform: 'none',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {user.roles.includes('administrator') ? (
                    <AdminPanelSettingsIcon color="primary" />
                  ) : (
                    <PersonIcon color="action" />
                  )}
                  <Typography variant="h6">{user.username}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
                {user.roles.includes('administrator') && (
                  <Typography variant="caption" color="primary" sx={{ mt: 0.5 }}>
                    Administrator
                  </Typography>
                )}
              </Button>
            </Paper>
          ))}
        </Box>
      </Box>
    </Container>
  );
}