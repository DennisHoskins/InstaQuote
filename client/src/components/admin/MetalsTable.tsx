import Table from '../Table';
import type { Column } from '../Table';

export interface MetalPrice {
  id?: number;
  gold: number;
  silver: number;
  date: string;
  gold_price?: number;
  ss_price?: number;
  synced_at?: string;
}

interface MetalsTableProps {
  prices: MetalPrice[];
}

const columns: Column[] = [
  { 
    key: 'date', 
    label: 'Date',
    format: (value, row) => {
      // Handle both 'date' and 'synced_at' field names
      const dateValue = value || row.synced_at;
      return new Date(dateValue).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  },
  { 
    key: 'gold', 
    label: 'Gold Price',
    align: 'right',
    format: (value, row) => {
      // Handle both 'gold' and 'gold_price' field names
      const goldValue = value || row.gold_price;
      return `$${goldValue.toLocaleString()}`;
    }
  },
  { 
    key: 'silver', 
    label: 'Silver Price',
    align: 'right',
    format: (value, row) => {
      // Handle both 'silver' and 'ss_price' field names
      const silverValue = value || row.ss_price;
      return `$${silverValue.toFixed(2)}`;
    }
  },
];

export default function MetalsTable({ prices }: MetalsTableProps) {
  return (
    <Table 
      columns={columns} 
      data={prices} 
      emptyMessage="No price history available" 
    />
  );
}