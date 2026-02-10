import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
} from '@mui/material';

export interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: (value: any, row: any) => React.ReactNode;
  mobileHide?: boolean;
}

interface TableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  rowKey?: string;
}

export default function Table({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data found',
  rowKey = 'id',
}: TableProps) {
  if (data.length === 0) {
    return (
      <TableContainer component={Paper} variant="outlined">
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      </TableContainer>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <MuiTable sx={{ margin: '0 !important' }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align || 'left'}
                sx={{
                  display: column.mobileHide
                    ? { xs: 'none', md: 'table-cell' }
                    : 'table-cell',
                  padding: '16px !important',
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row[rowKey]}
              hover
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
              }}
            >
              {columns.map((column) => {
                const value = row[column.key];
                const formattedValue = column.format
                  ? column.format(value, row)
                  : value;

                return (
                  <TableCell
                    key={column.key}
                    align={column.align || 'left'}
                    sx={{
                      display: column.mobileHide
                        ? { xs: 'none', md: 'table-cell' }
                        : 'table-cell',
                      padding: '16px !important',
                    }}
                  >
                    {formattedValue}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </MuiTable>
    </TableContainer>
  );
}