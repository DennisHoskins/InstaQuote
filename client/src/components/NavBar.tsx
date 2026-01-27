import { Box, Button, Badge } from '@mui/material';
import { Link } from 'react-router-dom';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

interface NavBarProps {
  cartItemCount?: number;
  orderCount?: number;
}

export default function NavBar({ cartItemCount = 0, orderCount = 0 }: NavBarProps) {

  return (
    <Box
      sx={{
        display: 'flex',
        alignSelf: 'flex-end',
        gap: 1,
      }}
    >
      <Button
        component={Link}
        to='/cart'
        variant="text"
        size="small"
        sx={{ px: 2 }}
        startIcon={
          <Badge badgeContent={cartItemCount} color="primary">
            <ShoppingCartIcon />
          </Badge>
        }
      >
        Shopping Cart
      </Button>

      <Button
        component={Link}
        to='/orders'
        variant="text"
        size="small"
        sx={{ px: 2 }}
        startIcon={
          <Badge badgeContent={orderCount} color="primary">
            <HistoryIcon />
          </Badge>
        }
      >
        Order History
      </Button>

      <Button
        component={Link}
        to='/admin'
        variant="text"
        size="small"
        sx={{ px: 2 }}
        startIcon={<AdminPanelSettingsIcon />}
      >
        Admin
      </Button>
    </Box>
  );
}