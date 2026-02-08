/**
 * Download data as a CSV file
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Escape a value for CSV (wrap in quotes if needed)
 */
export function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export orders list to CSV
 */
export function exportOrdersListCsv(
  orders: Array<{
    order_number: string;
    user_name?: string;
    user_email?: string;
    created_at: string;
    item_count: number;
    total_amount: number;
    status: string;
  }>,
  includeCustomerInfo: boolean = false
): void {
  const headers = includeCustomerInfo
    ? ['Order Number', 'Customer', 'Email', 'Date', 'Items', 'Total', 'Status']
    : ['Order Number', 'Date', 'Items', 'Total', 'Status'];

  const rows = orders.map((order) => {
    const baseRow = [
      order.order_number,
      new Date(order.created_at).toLocaleDateString(),
      order.item_count.toString(),
      `$${Number(order.total_amount).toFixed(2)}`,
      order.status,
    ];

    if (includeCustomerInfo) {
      return [
        order.order_number,
        escapeCsvValue(order.user_name || ''),
        order.user_email || '',
        new Date(order.created_at).toLocaleDateString(),
        order.item_count.toString(),
        `$${Number(order.total_amount).toFixed(2)}`,
        order.status,
      ];
    }

    return baseRow;
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(','))
  ].join('\n');

  const filename = `orders-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCsv(filename, csvContent);
}