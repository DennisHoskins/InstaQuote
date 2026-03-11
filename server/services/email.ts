import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    host: 'mail.smtp2go.com',
    port: 2525,
    auth: {
      user: process.env.SMTP2GO_USERNAME,
      pass: process.env.SMTP2GO_PASSWORD,
    },
  });
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? 'sales@destinationjewelry.com';
const FULFILLMENT_EMAIL = process.env.FULFILLMENT_EMAIL ?? 'sales@destinationjewelry.com';
  const ALERT_EMAIL = 'dennis.r.hoskins@gmail.com';

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: {
    item_code: string;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  totalAmount: number;
  notes?: string;
}

export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.item_code}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description ?? ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.unit_price.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.line_total.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Confirmation</h2>
      <p>Hi ${data.customerName},</p>
      <p>Thank you for your order. Here is your order summary:</p>
      <p><strong>Order Number:</strong> ${data.orderNumber}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px; text-align: left;">Item Code</th>
            <th style="padding: 8px; text-align: left;">Description</th>
            <th style="padding: 8px; text-align: center;">Qty</th>
            <th style="padding: 8px; text-align: right;">Unit Price</th>
            <th style="padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="padding: 8px; text-align: right;"><strong>Order Total:</strong></td>
            <td style="padding: 8px; text-align: right;"><strong>$${data.totalAmount.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
      ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
      <p>We'll be in touch shortly.</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: EMAIL_FROM,
    to: data.customerEmail,
    subject: `Order Confirmation - ${data.orderNumber}`,
    html,
  });
}

export async function sendOrderNotification(data: OrderEmailData): Promise<void> {
  try {
    const itemRows = data.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.item_code}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description ?? ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.unit_price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.line_total.toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Order Received</h2>
        <p><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</p>
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Item Code</th>
              <th style="padding: 8px; text-align: left;">Description</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Unit Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="padding: 8px; text-align: right;"><strong>Order Total:</strong></td>
              <td style="padding: 8px; text-align: right;"><strong>$${data.totalAmount.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
      </div>
    `;

    await getTransporter().sendMail({
      from: EMAIL_FROM,
      to: FULFILLMENT_EMAIL,
      replyTo: data.customerEmail,
      subject: `New Order - ${data.orderNumber} from ${data.customerName}`,
      html,
    });
  } catch (error) {
    console.error('Failed to send order notification email:', error);
  }
}

export async function sendErrorAlert(subject: string, message: string): Promise<void> {
  try {
    await getTransporter().sendMail({
      from: EMAIL_FROM,
      to: ALERT_EMAIL,
      subject: `[InstaQuote Alert] ${subject}`,
      html: `<pre style="font-family: monospace;">${message}</pre>`,
    });
  } catch (error) {
    console.error('Failed to send error alert email:', error);
  }
}