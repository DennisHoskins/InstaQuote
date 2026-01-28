import { Link } from 'react-router-dom';
import { Card, CardContent, Typography, Box } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AutorenewIcon from '@mui/icons-material/Autorenew';

interface DropboxSyncCardProps {
  title: string;
  syncType: string;
  lastSync: {
    itemsCount: number;
    duration: number;
    status: string;
    timestamp: string;
  } | null;
  lastSyncTime: string;
  totalRuns: number;
}

export default function DropboxSyncCard({
  title,
  syncType,
  lastSync,
  lastSyncTime,
  totalRuns,
}: DropboxSyncCardProps) {
  const statusColor = lastSync?.status === 'success' ? 'success.main' : 'error.main';

  return (
    <Link to={`/admin/sync-log/${syncType.replace('_', '-')}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card
        variant="outlined"
        sx={{
          height: '100%',
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
        <CardContent>
          <Typography variant="h5" color="text.secondary">
            {title}
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            {lastSyncTime}
          </Typography>

          {lastSync && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {lastSync.status === 'success' ? (
                <>
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography variant="body2" color={statusColor}>
                    {lastSync.itemsCount.toLocaleString()} / {lastSync.duration.toFixed(1)}s
                  </Typography>
                </>
              ) : lastSync.status === 'running' ? (
                <>
                  <AutorenewIcon color="info" fontSize="small" />
                  <Typography variant="body2" color="info.main">Running...</Typography>
                </>
              ) : (
                <ErrorIcon color="error" fontSize="small" />
              )}
            </Box>
          )}

          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Total Runs: {totalRuns.toLocaleString()}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Link>
  );
}