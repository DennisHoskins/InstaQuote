import { Box } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';

interface FileTypePieChartProps {
  fileTypeBreakdown: Array<{ type: string; count: number; percent: number }>;
  size?: number;
}

export default function FileTypePieChart({ 
  fileTypeBreakdown, 
  size = 160 
}: FileTypePieChartProps) {
  const pieData = fileTypeBreakdown.map((item, index) => ({
    id: index,
    value: item.count,
    label: item.type.toUpperCase().replace('.', ''),
  }));

  const innerRadius = size * 0.15;
  const outerRadius = size * 0.375;

  return (
    <Box sx={{ 
      width: '100%', 
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <PieChart
        series={[
          {
            data: pieData,
            innerRadius,
            outerRadius,
          },
        ]}
        height={size}
        width={size}
        sx={{
          '& .MuiChartsLegend-mark': {
            width: '8px !important',
            height: '15px !important',
          },
          '& .MuiChartsLegend-label': {
            fontSize: '10px !important',
          },
          '& .MuiChartsLegend-series': {
            gap: '8px !important',
          },
          '& .MuiChartsLegend-root': {
            gap: '4px !important',
          },
          '& .MuiChartsLegend-column': {
            gap: '4px !important',
          },
        }}
      />
    </Box>
  );
}