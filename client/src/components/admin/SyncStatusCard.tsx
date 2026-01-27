import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import { GaugeContainer, GaugeReferenceArc, GaugeValueArc } from '@mui/x-charts/Gauge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface SyncStatusCardProps {
  title: string;
  successRate: number;
  averageSyncTime: number;
  lastSyncItemsCount: number;
  lastSyncDuration: number;
  lastSyncStatus: 'success' | 'failed';
  lastSyncTime: string;
  linkTo: string;
}

export default function SyncStatusCard({
  title,
  successRate,
  averageSyncTime,
  lastSyncItemsCount,
  lastSyncDuration,
  lastSyncStatus,
  lastSyncTime,
  linkTo,
}: SyncStatusCardProps) {
  const statusColor = lastSyncStatus === 'success' ? 'success.main' : 'error.main';
  const gaugeColor = successRate >= 90 ? '#2e7d32' : successRate >= 70 ? '#ed6c02' : '#d32f2f';

  return (
    <Link to={linkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
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
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={4}>
              <Box sx={{ 
                position: 'relative', 
                width: '100%', 
                height: 150,
                backgroundColor: '#f8f8f8',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <GaugeContainer
                  value={successRate}
                  valueMin={0}
                  valueMax={100}
                  startAngle={0}
                  endAngle={360}
                  width={150}
                  height={150}
                >
                  <GaugeReferenceArc />
                  <GaugeValueArc 
                    style={{
                      fill: gaugeColor,
                    }}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: '25px',
                      fontWeight: 'bold',
                      fill: 'currentColor',
                    }}
                  >
                    {successRate.toFixed(1)}%
                  </text>
                  <text
                    x="50%"
                    y="65%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: '11px',
                      fill: 'currentColor',
                      opacity: 0.6,
                    }}
                  >
                    30 days
                  </text>
                </GaugeContainer>
              </Box>
            </Grid>

            <Grid size={8}>
              <Box>
                <Typography variant="h5" color="text.secondary">
                  {title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  {lastSyncTime}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {lastSyncStatus === 'success' ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <ErrorIcon color="error" fontSize="small" />
                  )}
                  <Typography variant="body1" color={statusColor} fontWeight="medium">
                    {lastSyncStatus === 'success' ? 'Success' : 'Failed'} - {lastSyncItemsCount.toLocaleString()} items in {lastSyncDuration.toFixed(1)}s
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Average Sync Time
                </Typography>
                <Typography variant="h5">
                  {averageSyncTime.toFixed(1)}s
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Link>
  );
}