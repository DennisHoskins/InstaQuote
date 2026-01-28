import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/admin';
import { Container, Typography, Box, Button, Grid, CircularProgress, Alert } from '@mui/material';
import SyncStatusCard from '../../components/admin/SyncStatusCard';
import MetalsPriceCard from '../../components/admin/MetalsPriceCard';
import OrdersStatsCard from '../../components/admin/OrdersStatsCard';
import ImagesStatsCard from '../../components/admin/ImagesStatsCard';
import SkusStatsCard from '../../components/admin/SkusStatsCard';
import DropboxSyncCard from '../../components/admin/DropboxSyncCard';

export default function Admin() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.getDashboard(),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load dashboard data</Alert>
      </Container>
    );
  }

  const { syncStats, itemsStats, imagesStats, metalsData, skuStats } = data;

  const getRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relativeTime = '';
    if (diffDays > 0) relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    else if (diffHours > 0) relativeTime = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    else if (diffMins > 0) relativeTime = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    else relativeTime = 'Just now';

    return `${relativeTime}`;
  };

  const ordersData = {
    totalOrders: 0,
    totalRevenue: 0,
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          width: '100%',
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button component={Link} to="/" variant="outlined">
            Home
          </Button>
          <Typography variant="h4">Admin Dashboard</Typography>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <OrdersStatsCard
            totalOrders={ordersData.totalOrders}
            totalRevenue={ordersData.totalRevenue}
            linkTo="/admin/orders"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <SkusStatsCard
            totalSkus={skuStats.totalSkus}
            totalItems={itemsStats.totalItems}
            skusWithImages={skuStats.skusWithImages}
            coveragePercent={skuStats.coveragePercent}
            linkTo="/admin/skus"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <ImagesStatsCard
            totalImages={imagesStats.totalImages}
            webImages={imagesStats.webImages}
            linkedWebImages={imagesStats.linkedWebImages}
            webImagesPercent={imagesStats.webImagesPercent}
            linkTo="/admin/images"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <SyncStatusCard
                title="Access Data Sync"
                successRate={syncStats.access.successRate}
                averageSyncTime={syncStats.access.averageSyncTime}
                totalRuns={syncStats.access.totalRuns}  // Add this
                lastSyncItemsCount={syncStats.access.lastSync?.itemsCount || 0}
                lastSyncDuration={syncStats.access.lastSync?.duration || 0}
                lastSyncStatus={syncStats.access.lastSync?.status === 'success' ? 'success' : 'failed'}
                lastSyncTime={syncStats.access.lastSync ? getRelativeTime(syncStats.access.lastSync.timestamp) : 'Never'}
                linkTo="/admin/sync-log/access"
              />
            </Grid>

            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid size={4}>
                  <DropboxSyncCard
                    title="Crawl Dropbox"
                    syncType="dropbox_crawl"
                    lastSync={syncStats.dropbox_crawl.lastSync}
                    lastSyncTime={syncStats.dropbox_crawl.lastSync ? getRelativeTime(syncStats.dropbox_crawl.lastSync.timestamp) : 'Never'}
                    totalRuns={syncStats.dropbox_crawl.totalRuns}
                  />
                </Grid>

                <Grid size={4}>
                  <DropboxSyncCard
                    title="Match SKUs"
                    syncType="sku_mapping"
                    lastSync={syncStats.sku_mapping.lastSync}
                    lastSyncTime={syncStats.sku_mapping.lastSync ? getRelativeTime(syncStats.sku_mapping.lastSync.timestamp) : 'Never'}
                    totalRuns={syncStats.sku_mapping.totalRuns}
                  />
                </Grid>

                <Grid size={4}>
                  <DropboxSyncCard
                    title="Create Links"
                    syncType="dropbox_links"
                    lastSync={syncStats.dropbox_links.lastSync}
                    lastSyncTime={syncStats.dropbox_links.lastSync ? getRelativeTime(syncStats.dropbox_links.lastSync.timestamp) : 'Never'}
                    totalRuns={syncStats.dropbox_links.totalRuns}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <MetalsPriceCard 
            currentGoldPrice={metalsData.current.gold}
            currentSilverPrice={metalsData.current.silver}
            goldData={metalsData.history.map((h: any) => h.gold)}
            silverData={metalsData.history.map((h: any) => h.silver)}
            lastSyncTime={metalsData.lastSync ? getRelativeTime(metalsData.lastSync) : 'Never'}
            linkTo="/admin/metals" 
          />
        </Grid>
      </Grid>
    </Container>
  );
}