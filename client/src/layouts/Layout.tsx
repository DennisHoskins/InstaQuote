import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Box, Typography, Button, Container } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LoadingSpinner from '../components/LoadingSpinner';

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

export default function Layout() {
  const { isLoading, isAuthenticated, isAdmin, login } = useAuth();

  const { data: syncData, isLoading: syncLoading } = useQuery({
    queryKey: ['prices-last-sync'],
    queryFn: api.getPricesLastSync,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || (isAuthenticated && syncLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
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

  const pricesStale = (() => {
    if (!syncData?.synced_at) return false;
    return Date.now() - new Date(syncData.synced_at).getTime() > STALE_THRESHOLD_MS;
  })();

  if (pricesStale && !isAdmin) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center' }}>
            <WarningAmberIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Pricing Temporarily Unavailable
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              We're unable to display current pricing at this time. Please check back shortly or contact us if this continues.
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Outlet />
    </Box>
  );
}