import { Card, CardContent, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

interface OrdersStatsCardProps {
  totalOrders: number;
  totalRevenue: number;
  linkTo: string;
}

export default function OrdersStatsCard({
  totalOrders,
  totalRevenue,
  linkTo,
}: OrdersStatsCardProps) {
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
            Orders
          </Typography>

          <Typography variant="h3" sx={{ mb: 2 }}>
            {totalOrders.toLocaleString()}
          </Typography>

          <Typography variant="h6" sx={{ mt: -1 }} color="success.main">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total Revenue
          </Typography>
        </CardContent>
      </Card>
    </Link>
  );
}