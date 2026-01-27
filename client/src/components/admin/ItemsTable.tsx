import { useNavigate } from 'react-router-dom';
import Table from '../Table';
import type { Column } from '../Table';

export interface Item {
  item_code: string;
  description: string;
  category: string;
  destination: string;
  total_ws_price: number;
  inactive: boolean;
  is_catalog?: boolean;
}

interface ItemsTableProps {
  items: Item[];
}

const columns: Column[] = [
  { key: 'item_code', label: 'Item Code' },
  { key: 'sku', label: 'SKU' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category', mobileHide: true },
  { key: 'destination', label: 'Destination', mobileHide: true },
  { 
    key: 'total_ws_price', 
    label: 'Price', 
    align: 'right',
    format: (value) => `$${Number(value).toFixed(2)}`
  },
];

export default function ItemsTable({ items }: ItemsTableProps) {
  const navigate = useNavigate();

  return (
    <Table
      columns={columns}
      data={items}
      rowKey="item_code"
      onRowClick={(item) => navigate(`/item/${item.item_code}`)}
      emptyMessage="No items found"
    />
  );
}