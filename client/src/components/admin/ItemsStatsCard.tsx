import { Link } from 'react-router-dom';
import { Card, CardContent, Typography, LinearProgress } from '@mui/material';

interface ItemsStatsCardProps {
  totalItems: number;
  totalSKUs: number;
  itemsWithImages: number;
  linkTo: string;
}

export default function ItemsStatsCard({
  totalItems,
  itemsWithImages,
  linkTo,
}: ItemsStatsCardProps) {
  const coveragePercent = totalItems > 0 ? (itemsWithImages / totalItems) * 100 : 0;
  const progressColor = coveragePercent >= 80 ? 'success' : coveragePercent >= 50 ? 'warning' : 'error';

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
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Inventory Items
          </Typography>

          <Typography variant="h3" sx={{ mb: 2 }}>
            {totalItems.toLocaleString()}
          </Typography>
          <Typography variant="h3" sx={{ mb: 2 }}>
          </Typography>

          <LinearProgress 
            variant="determinate" 
            value={coveragePercent} 
            color={progressColor}
            sx={{ height: 8, borderRadius: 1, mb: 2 }}
          />

          <Typography variant="caption" color="text.secondary" display="block">
            {itemsWithImages.toLocaleString()} items with images / {coveragePercent.toFixed(1)}%
          </Typography>
        </CardContent>
      </Card>
    </Link>
  );
}