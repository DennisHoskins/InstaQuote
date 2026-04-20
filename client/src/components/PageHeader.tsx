import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import NavBar from './NavBar';

interface PageHeaderProps {
  title: string | ReactNode;
  breadcrumbs?: Array<{ label: string; to?: string; onClick?: () => void }>;
  showNavBar?: boolean;
  rightAction?: ReactNode;
}

export default function PageHeader({ title, breadcrumbs = [], showNavBar = true, rightAction }: PageHeaderProps) {
  return (
    <Box
      sx={{ 
        width: '100%', 
        mb: 3, 
        borderBottom: '1px solid #ddd',
        pb: 2,
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          {breadcrumbs.map((crumb, index) => (
            crumb.to ? (
              <Button 
                key={index}
                variant="outlined"
                component={Link}
                to={crumb.to}
              >
                {crumb.label}
              </Button>
            ) : (
              <Button 
                key={index}
                variant="outlined"
                onClick={crumb.onClick}
              >
                {crumb.label}
              </Button>
            )
          ))}
          <Typography 
            variant="h4"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              m: 0,
              lineHeight: 1,
              paddingBottom: '0 !important',
              fontSize: { xs: '1.25rem', sm: '2.125rem' },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {title}
          </Typography>
        </Box>
        {rightAction || (showNavBar && <NavBar />)}
      </Box>
      <Typography 
        variant="h4"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          m: 0,
          mt: 2,
          lineHeight: 1,
          paddingBottom: '0 !important',
          fontSize: '1.25rem',
          display: { xs: 'block', sm: 'none' },
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}