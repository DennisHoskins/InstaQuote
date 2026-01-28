import { Component } from 'react';
import type { ReactNode } from 'react';
import { Container, Typography, Button, Box } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            p: 3,
          }}
        >
          <Container maxWidth="sm">
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom color="error">
                Something went wrong
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                An unexpected error occurred. Please try reloading the page.
              </Typography>
              {this.state.error && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    display: 'block', 
                    mb: 4,
                    color: 'text.secondary',
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                  }}
                >
                  {this.state.error.message}
                </Typography>
              )}
              <Button variant="contained" size="large" onClick={this.handleReload}>
                Reload Page
              </Button>
            </Box>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }

}