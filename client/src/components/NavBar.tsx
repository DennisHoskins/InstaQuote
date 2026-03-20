import { Link } from 'react-router-dom';
import { Box, Button, Badge } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export default function NavBar() {
  const { itemCount } = useCart();
  const { isAdmin } = useAuth();

  return (
    <Box
      sx={{
        display: 'flex',
        alignSelf: 'flex-end',
        gap: 0.5,
      }}
    >
      <Button
        component={Link}
        to='/cart'
        variant="text"
        size="small"
        sx={{ px: 1, minWidth: 'auto' }}
      >
        <Badge badgeContent={itemCount} color="primary">
          <ShoppingCartIcon />
        </Badge>
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 1 }}>
          Shopping Cart
        </Box>
      </Button>

      <Button
        component={Link}
        to='/orders'
        variant="text"
        size="small"
        sx={{ px: 1, minWidth: 'auto' }}
      >
        <Badge badgeContent={0} color="primary">
          <HistoryIcon />
        </Badge>
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 1 }}>
          Order History
        </Box>
      </Button>

      {isAdmin && (
        <Button
          component={Link}
          to='/admin'
          variant="text"
          size="small"
          sx={{ px: 1, minWidth: 'auto' }}
        >
          <AdminPanelSettingsIcon />
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 1 }}>
            Admin
          </Box>
        </Button>
      )}
    </Box>

  );
}