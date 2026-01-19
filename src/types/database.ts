/**
 * Supabase Database Types
 * This file defines TypeScript types for our Supabase schema.
 * These will be auto-generated in production using `supabase gen types typescript`
 */

export type UserRole = "customer" | "farm" | "admin";

export type FarmStatus = "pending" | "approved" | "suspended";

export type OrderStatus =
  | "processing"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "exception";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type EmailStatus = "pending" | "sent" | "failed";

export interface Profile {
  id: string;
  role: UserRole;
  name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  story: string | null;
  short_description: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  address: string | null;
  postcode: string | null;
  postcode_rules: string[] | null;
  badges: string[] | null;
  delivery_days: string[] | null;
  cutoff_time: string | null;
  min_order_value: number | null;
  delivery_fee: number | null;
  contact_email: string | null;
  receive_order_emails: boolean | null;
  status: FarmStatus;
  created_at: string;
  updated_at: string;
}

export interface FarmPayout {
  farm_id: string;
  payout_method: string;
  account_holder_name: string | null;
  sort_code: string | null;
  account_number_last4: string | null;
  bank_name: string | null;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  farm_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  unit_label: string;
  weight_label: string | null;
  stock_qty: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAddressJson {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_user_id: string;
  farm_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  delivery_address_json: DeliveryAddressJson | null;
  delivery_notes: string | null;
  delivery_window: string | null;
  customer_email_snapshot: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  unit_snapshot: string;
  weight_snapshot: string | null;
  created_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  actor_user_id: string | null;
  actor_role: UserRole;
  status_from: OrderStatus | null;
  status_to: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface InternalNote {
  id: string;
  order_id: string;
  author_user_id: string;
  note: string;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface EmailOutbox {
  id: string;
  to_email: string;
  from_email: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  template_name: string | null;
  metadata: Record<string, unknown>;
  status: EmailStatus;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

// Database schema type (for Supabase client)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      farms: {
        Row: Farm;
        Insert: Omit<Farm, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Farm, "id" | "created_at">>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Product, "id" | "created_at">>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Order, "id" | "created_at">>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, "id" | "created_at">;
        Update: Partial<Omit<OrderItem, "id" | "created_at">>;
      };
      order_events: {
        Row: OrderEvent;
        Insert: Omit<OrderEvent, "id" | "created_at">;
        Update: Partial<Omit<OrderEvent, "id" | "created_at">>;
      };
      internal_notes: {
        Row: InternalNote;
        Insert: Omit<InternalNote, "id" | "created_at">;
        Update: Partial<Omit<InternalNote, "id" | "created_at">>;
      };
      addresses: {
        Row: Address;
        Insert: Omit<Address, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Address, "id" | "created_at">>;
      };
      email_outbox: {
        Row: EmailOutbox;
        Insert: Omit<EmailOutbox, "id" | "created_at">;
        Update: Partial<Omit<EmailOutbox, "id" | "created_at">>;
      };
    };
    Enums: {
      user_role: UserRole;
      farm_status: FarmStatus;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
    };
  };
}
