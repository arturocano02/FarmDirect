/**
 * Email Service
 * Uses Resend for production, falls back to email_outbox table in dev
 */

import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Farmlink <noreply@farmlink.uk>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateName?: string;
  metadata?: Record<string, unknown>;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  queued?: boolean;
}

/**
 * Send an email using Resend or queue it in email_outbox
 */
export async function sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
  if (process.env.NODE_ENV === "development") {
    console.log("[email] Sending email:", {
      to: payload.to,
      subject: payload.subject,
      templateName: payload.templateName,
    });
  }

  // If Resend API key is set, send via Resend
  if (RESEND_API_KEY) {
    return sendViaResend(payload);
  }

  // Otherwise, queue in email_outbox table
  console.warn("[email] RESEND_API_KEY not set - queueing email in database");
  return queueEmail(payload);
}

/**
 * Send email via Resend API
 */
async function sendViaResend(payload: EmailPayload): Promise<SendEmailResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Resend error: ${response.status}`);
    }

    const data = await response.json();

    if (process.env.NODE_ENV === "development") {
      console.log("[email] Sent via Resend:", data.id);
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[email] Resend error:", message);
    
    // Fall back to queuing
    return queueEmail(payload, message);
  }
}

/**
 * Queue email in email_outbox table for later inspection/sending
 */
async function queueEmail(
  payload: EmailPayload,
  errorMessage?: string
): Promise<SendEmailResult> {
  // Use service role to insert into email_outbox
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[email] Cannot queue email - missing Supabase credentials");
    return {
      success: false,
      error: "Missing Supabase credentials for email queue",
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase.from("email_outbox").insert({
    to_email: payload.to,
    from_email: EMAIL_FROM,
    subject: payload.subject,
    html_body: payload.html,
    text_body: payload.text || null,
    template_name: payload.templateName || null,
    metadata: payload.metadata || {},
    status: errorMessage ? "failed" : "pending",
    error_message: errorMessage || null,
  });

  if (error) {
    console.error("[email] Failed to queue email:", error);
    return {
      success: false,
      error: `Failed to queue: ${error.message}`,
    };
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[email] Queued in email_outbox:", {
      to: payload.to,
      subject: payload.subject,
    });
  }

  return {
    success: true,
    queued: true,
  };
}

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmationEmail(order: {
  order_number: string;
  customer_email: string;
  customer_name?: string;
  farm_name: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
}): Promise<SendEmailResult> {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">£${(item.price / 100).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2d5a27; margin-bottom: 5px;">🌿 Farmlink</h1>
    <p style="color: #666;">Premium Meat, Straight from the Farm</p>
  </div>
  
  <div style="background: #f8f5f0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="margin-top: 0; color: #2d5a27;">Order Confirmed!</h2>
    <p>Hi${order.customer_name ? ` ${order.customer_name}` : ""},</p>
    <p>Thank you for your order. We've received your order and it's being prepared by <strong>${order.farm_name}</strong>.</p>
    <p style="font-size: 18px; font-weight: bold;">Order Number: ${order.order_number}</p>
  </div>
  
  <h3 style="border-bottom: 2px solid #2d5a27; padding-bottom: 10px;">Order Details</h3>
  
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background: #f5f5f5;">
        <th style="padding: 10px; text-align: left;">Item</th>
        <th style="padding: 10px; text-align: center;">Qty</th>
        <th style="padding: 10px; text-align: right;">Price</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="padding: 8px; text-align: right;">Subtotal:</td>
        <td style="padding: 8px; text-align: right;">£${(order.subtotal / 100).toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 8px; text-align: right;">Delivery:</td>
        <td style="padding: 8px; text-align: right;">£${(order.delivery_fee / 100).toFixed(2)}</td>
      </tr>
      <tr style="font-weight: bold; font-size: 16px;">
        <td colspan="2" style="padding: 8px; text-align: right; border-top: 2px solid #333;">Total:</td>
        <td style="padding: 8px; text-align: right; border-top: 2px solid #333;">£${(order.total / 100).toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
  
  <div style="background: #f8f5f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <h4 style="margin-top: 0;">Delivery Address</h4>
    <p style="margin-bottom: 0; white-space: pre-line;">${order.delivery_address}</p>
  </div>
  
  <p>You can track your order status at any time by visiting your <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders" style="color: #2d5a27;">orders page</a>.</p>
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
  
  <p style="color: #666; font-size: 12px; text-align: center;">
    Questions? Contact us at support@farmlink.uk<br>
    Farmlink - Premium Meat from Local Farms
  </p>
</body>
</html>`;

  const text = `
Order Confirmed! - ${order.order_number}

Hi${order.customer_name ? ` ${order.customer_name}` : ""},

Thank you for your order from ${order.farm_name}.

Order Number: ${order.order_number}

Items:
${order.items.map((item) => `- ${item.name} x${item.quantity}: £${(item.price / 100).toFixed(2)}`).join("\n")}

Subtotal: £${(order.subtotal / 100).toFixed(2)}
Delivery: £${(order.delivery_fee / 100).toFixed(2)}
Total: £${(order.total / 100).toFixed(2)}

Delivery Address:
${order.delivery_address}

Track your order: ${process.env.NEXT_PUBLIC_APP_URL}/orders

Questions? Contact support@farmlink.uk
`;

  return sendEmail({
    to: order.customer_email,
    subject: `Order Confirmed - ${order.order_number}`,
    html,
    text,
    templateName: "order_confirmation",
    metadata: { order_number: order.order_number },
  });
}

/**
 * Send new order notification to farm
 */
export async function sendNewOrderFarmEmail(order: {
  order_number: string;
  farm_email: string;
  farm_name: string;
  customer_name?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  delivery_address: string;
  delivery_notes?: string;
}): Promise<SendEmailResult> {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<li>${item.name} x ${item.quantity} - £${(item.price / 100).toFixed(2)}</li>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2d5a27; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="margin: 0;">📦 New Order Received!</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px;">Order ${order.order_number}</p>
  </div>
  
  <p>Hi ${order.farm_name} team,</p>
  <p>Great news! You've received a new order${order.customer_name ? ` from ${order.customer_name}` : ""}.</p>
  
  <h3>Order Items:</h3>
  <ul>${itemsHtml}</ul>
  
  <p><strong>Total: £${(order.total / 100).toFixed(2)}</strong></p>
  
  <h3>Delivery Address:</h3>
  <p style="white-space: pre-line;">${order.delivery_address}</p>
  
  ${order.delivery_notes ? `<h3>Delivery Notes:</h3><p>${order.delivery_notes}</p>` : ""}
  
  <p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/farm-portal/orders" 
       style="display: inline-block; background: #2d5a27; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      View Order in Farm Portal
    </a>
  </p>
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
  
  <p style="color: #666; font-size: 12px;">
    This is an automated notification from Farmlink.
  </p>
</body>
</html>`;

  return sendEmail({
    to: order.farm_email,
    subject: `New Order ${order.order_number} - Action Required`,
    html,
    templateName: "new_order_farm",
    metadata: { order_number: order.order_number },
  });
}

/**
 * Send new order notification to admin
 */
export async function sendNewOrderAdminEmail(order: {
  order_number: string;
  farm_name: string;
  customer_email: string;
  total: number;
}): Promise<SendEmailResult | null> {
  if (!ADMIN_EMAIL) {
    if (process.env.NODE_ENV === "development") {
      console.log("[email] No ADMIN_EMAIL set, skipping admin notification");
    }
    return null;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order - Admin Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1>🔔 New Order Alert</h1>
  
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Order Number:</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${order.order_number}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Farm:</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${order.farm_name}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Customer:</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${order.customer_email}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total:</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">£${(order.total / 100).toFixed(2)}</td>
    </tr>
  </table>
  
  <p style="margin-top: 20px;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/orders" 
       style="display: inline-block; background: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      View in Admin Dashboard
    </a>
  </p>
</body>
</html>`;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Farmlink] New Order ${order.order_number}`,
    html,
    templateName: "new_order_admin",
    metadata: { order_number: order.order_number },
  });
}

/**
 * Get admin email (for testing)
 */
export function getAdminEmail(): string | undefined {
  return ADMIN_EMAIL;
}
