import Table from './Table';
import type { Column } from './Table';

export interface Order {
  id: string;
  order_number: string;
  customer: string;
  date: string;
  total: number;
  status: string;
}

interface OrdersTableProps {
  orders: Order[];
}

const columns: Column[] = [
  { key: 'order_number', label: 'Order Number' },
  { key: 'customer', label: 'Customer' },
  { key: 'date', label: 'Date', mobileHide: true },
  { 
    key: 'total', 
    label: 'Total', 
    align: 'right',
    format: (value) => `$${Number(value).toFixed(2)}`
  },
  { key: 'status', label: 'Status' },
];

export default function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <Table
      columns={columns}
      data={orders}
      emptyMessage="No orders found"
    />
  );
}