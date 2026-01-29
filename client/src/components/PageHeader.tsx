import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import NavBar from './NavBar';

interface PageHeaderProps {
  title: string | ReactNode;
  breadcrumbs?: Array<{ label: string; to: string }>;
  showNavBar?: boolean;
  rightAction?: ReactNode;
}

export default function PageHeader({ title, breadcrumbs = [], showNavBar = true, rightAction }: PageHeaderProps) {
  return (
    <Box
      sx={{ 
        width: '100%', 
        mb: 3, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
        {breadcrumbs.map((crumb, index) => (
          <Button 
            key={index}
            variant="outlined"
            component={Link}
            to={crumb.to}
          >
            {crumb.label}
          </Button>
        ))}
        <Typography 
          variant="h4"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {title}
        </Typography>
      </Box>
      {rightAction || (showNavBar && <NavBar />)}
    </Box>
  );
}