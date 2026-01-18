/**
 * Email Sending Utility
 * 
 * This Edge Function sends transactional emails via Resend.
 * 
 * Email types:
 * - order_confirmation: Sent to customer after successful payment
 * - new_order_farm: Sent to farm when they receive a new order
 * - new_order_admin: Sent to admin for every new order
 * - order_status_update: Sent to customer when order status changes
 * 
 * To deploy:
 * supabase functions deploy send-email
 * 
 * Required secrets:
 * - RESEND_API_KEY
 * 
 * Environment variables:
 * - EMAIL_FROM
 * - ADMIN_EMAIL
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Placeholder for Resend SDK
// import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "order_confirmation" | "new_order_farm" | "new_order_admin" | "order_status_update";
  order_id: string;
  // Additional fields based on type
  to?: string;
  status?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, order_id, to, status } = await req.json() as EmailRequest;

    // TODO: Implement email sending in Phase D
    //
    // 1. Initialize Resend client
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    //
    // 2. Fetch order data from Supabase
    // const supabase = createClient(...);
    // const { data: order } = await supabase
    //   .from('orders')
    //   .select(`
    //     *,
    //     farm:farms(name),
    //     items:order_items(*)
    //   `)
    //   .eq('id', order_id)
    //   .single();
    //
    // 3. Send appropriate email based on type
    // switch (type) {
    //   case "order_confirmation":
    //     await sendOrderConfirmation(resend, order);
    //     break;
    //   case "new_order_farm":
    //     await sendNewOrderFarm(resend, order);
    //     break;
    //   case "new_order_admin":
    //     await sendNewOrderAdmin(resend, order);
    //     break;
    //   case "order_status_update":
    //     await sendStatusUpdate(resend, order, status);
    //     break;
    // }

    // Placeholder response
    return new Response(
      JSON.stringify({ 
        message: "Email sending placeholder - implement in Phase D",
        type,
        order_id,
        to,
        status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 501,
      }
    );

  } catch (error) {
    console.error("Email error:", error);
    return new Response(
      JSON.stringify({ error: "Email sending failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// ============================================
// Email Templates (Placeholders)
// ============================================

/**
 * Order confirmation email to customer
 */
// async function sendOrderConfirmation(resend: Resend, order: Order) {
//   const html = `
//     <h1>Order Confirmed!</h1>
//     <p>Thank you for your order from ${order.farm.name}.</p>
//     <p>Order number: <strong>${order.order_number}</strong></p>
//     <h2>Order Summary</h2>
//     <ul>
//       ${order.items.map(item => `
//         <li>${item.name_snapshot} x ${item.quantity} - £${(item.price_snapshot * item.quantity / 100).toFixed(2)}</li>
//       `).join('')}
//     </ul>
//     <p><strong>Total: £${(order.total / 100).toFixed(2)}</strong></p>
//     <h2>Delivery Address</h2>
//     <p>${order.delivery_address}</p>
//     <p><a href="${APP_URL}/order/${order.id}">Track your order</a></p>
//   `;
//   
//   await resend.emails.send({
//     from: EMAIL_FROM,
//     to: order.customer_email,
//     subject: `Order Confirmed - ${order.order_number}`,
//     html,
//   });
// }

/**
 * New order notification to farm
 */
// async function sendNewOrderFarm(resend: Resend, order: Order) {
//   // Similar structure with farm-specific content
// }

/**
 * New order notification to admin
 */
// async function sendNewOrderAdmin(resend: Resend, order: Order) {
//   // Similar structure with admin-specific content
// }

/**
 * Order status update to customer
 */
// async function sendStatusUpdate(resend: Resend, order: Order, newStatus: string) {
//   // Status change notification
// }
