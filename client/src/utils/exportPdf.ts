import jsPDF from 'jspdf';

interface OrderItem {
  item_code: string;
  description?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface Order {
  order_number: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
  status: string;
  notes?: string;
  total_amount: number;
}

/**
 * Export a single order to PDF
 */
export function exportOrderPdf(order: Order, items: OrderItem[]): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const tableWidth = pageWidth - margin * 2;
  let y = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(order.order_number, margin, y);
  y += 15;

  // Status badge
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
  doc.text(`Status: ${statusText}`, margin, y);
  y += 10;

  // Order info
  doc.setFontSize(10);
  doc.text(`Order Date: ${new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`, margin, y);
  y += 6;

  if (order.user_name) {
    doc.text(`Customer: ${order.user_name}`, margin, y);
    y += 6;
  }

  if (order.user_email) {
    doc.text(`Email: ${order.user_email}`, margin, y);
    y += 6;
  }

  if (order.notes) {
    y += 4;
    doc.text(`Notes: ${order.notes}`, margin, y, { maxWidth: pageWidth - margin * 2 });
    y += 10;
  }

  y += 10;

  // Column widths
  const colWidths = {
    item: 45,
    desc: tableWidth - 45 - 25 - 35 - 35,
    qty: 25,
    price: 35,
    total: 35,
  };

  const colX = {
    item: margin,
    desc: margin + colWidths.item,
    qty: margin + colWidths.item + colWidths.desc,
    price: margin + colWidths.item + colWidths.desc + colWidths.qty,
    total: margin + colWidths.item + colWidths.desc + colWidths.qty + colWidths.price,
  };

  const rowHeight = 10;

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 6, tableWidth, rowHeight, 'F');
  
  // Header border
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y - 6, tableWidth, rowHeight, 'S');

  doc.text('Item Code', colX.item + 2, y);
  doc.text('Description', colX.desc + 2, y);
  doc.text('Qty', colX.qty + colWidths.qty - 2, y, { align: 'right' });
  doc.text('Price', colX.price + colWidths.price - 2, y, { align: 'right' });
  doc.text('Total', colX.total + colWidths.total - 2, y, { align: 'right' });
  
  y += rowHeight;

  // Table rows
  doc.setFont('helvetica', 'normal');
  
  items.forEach((item, index) => {
    // Check if we need a new page
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const rowY = y - 6;
    
    // Alternating row background
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, rowY, tableWidth, rowHeight, 'F');
    }
    
    // Row border
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin, rowY, tableWidth, rowHeight, 'S');

    doc.text(item.item_code, colX.item + 2, y);
    
    // Truncate description if too long
    const desc = item.description || '';
    const maxDescWidth = colWidths.desc - 4;
    let truncatedDesc = desc;
    while (doc.getTextWidth(truncatedDesc) > maxDescWidth && truncatedDesc.length > 0) {
      truncatedDesc = truncatedDesc.substring(0, truncatedDesc.length - 1);
    }
    if (truncatedDesc !== desc) {
      truncatedDesc = truncatedDesc.substring(0, truncatedDesc.length - 3) + '...';
    }
    doc.text(truncatedDesc, colX.desc + 2, y);
    
    doc.text(item.quantity.toString(), colX.qty + colWidths.qty - 2, y, { align: 'right' });
    doc.text(`$${item.unit_price.toFixed(2)}`, colX.price + colWidths.price - 2, y, { align: 'right' });
    doc.text(`$${item.line_total.toFixed(2)}`, colX.total + colWidths.total - 2, y, { align: 'right' });
    
    y += rowHeight;
  });

  // Total row
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', colX.price + colWidths.price - 2, y, { align: 'right' });
  doc.text(`$${order.total_amount.toFixed(2)}`, colX.total + colWidths.total - 2, y, { align: 'right' });

  // Save
  doc.save(`${order.order_number}.pdf`);
}