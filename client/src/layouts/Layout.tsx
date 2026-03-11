import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, Button } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Layout() {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh' 
      }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh',
        gap: 2
      }}>
        <LockOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
        <Typography variant="h6">Please log in to continue</Typography>
        <Button variant="contained" onClick={login}>Log In</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Outlet />
    </Box>
  );
}