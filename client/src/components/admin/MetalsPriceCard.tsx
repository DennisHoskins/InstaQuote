import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import { LineChart } from '@mui/x-charts/LineChart';

interface MetalsPriceCardProps {
  currentGoldPrice: number;
  currentSilverPrice: number;
  goldData: number[];
  silverData: number[];
  lastSyncTime: string;
  linkTo: string;
}

export default function MetalsPriceCard({ 
  currentGoldPrice,
  currentSilverPrice,
  goldData,
  silverData,
  lastSyncTime,
  linkTo 
}: MetalsPriceCardProps) {
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
          <Typography variant="h5" color="text.secondary" gutterBottom sx={{ mt: 0.75, display: 'block' }}>
            Metals Prices
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -1, mb: 2 }}>
            {lastSyncTime}
          </Typography>

          <Box sx={{ backgroundColor: '#f8f8f8', borderRadius: 1, p: 2 }}>
            <LineChart
              xAxis={[{ data: goldData.map((_, i) => i), scaleType: 'point' }]}
              series={[
                {
                  data: goldData,
                  label: 'Gold',
                  color: '#FFD700',
                },
                {
                  data: silverData,
                  label: 'Silver',
                  color: '#C0C0C0',
                },
              ]}
              height={140}
            />
          </Box>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Gold
                </Typography>
                <Typography variant="h5" sx={{ color: '#FFD700' }}>
                  ${currentGoldPrice.toLocaleString()}
                </Typography>
              </Box>
            </Grid>
            
            <Grid size={6}>
              <Box sx={{ textAlign: 'center', borderLeft: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Silver
                </Typography>
                <Typography variant="h5" sx={{ color: '#C0C0C0' }}>
                  ${currentSilverPrice.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Link>
  );
}