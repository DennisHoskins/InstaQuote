import { Link } from 'react-router-dom';
import { Card, CardContent, Typography, Box } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AutorenewIcon from '@mui/icons-material/Autorenew';

interface SyncCardProps {
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

export default function SyncCard({
  title,
  syncType,
  lastSync,
  lastSyncTime,
  totalRuns,
}: SyncCardProps) {
  return (
    <Link to={`/admin/sync-log/${syncType.replace('_', '-')}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card
        variant="outlined"
        sx={{
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>

            <Box sx={{ flexShrink: 0 }}>
              {lastSync?.status === 'success' ? (
                <CheckCircleIcon color="success" />
              ) : lastSync?.status === 'running' ? (
                <AutorenewIcon color="info" />
              ) : lastSync?.status === 'failed' ? (
                <ErrorIcon color="error" />
              ) : (
                <AutorenewIcon color="disabled" />
              )}
            </Box>

            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body1" fontWeight={600}>
                  {title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {lastSyncTime}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  {lastSync?.status === 'success' && (
                    <Typography variant="body2" color="success.main">
                      {lastSync.itemsCount.toLocaleString()} / {lastSync.duration.toFixed(1)}s
                    </Typography>
                  )}
                  {lastSync?.status === 'running' && (
                    <Typography variant="body2" color="info.main">Running...</Typography>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Total Runs: {totalRuns.toLocaleString()}
                </Typography>
              </Box>
            </Box>

          </Box>
        </CardContent>
      </Card>
    </Link>
  );
}