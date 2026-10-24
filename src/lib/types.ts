export type UUID = string;

export interface PaymentMethod {
  id: UUID;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: UUID;
  name: string;
  description: string | null;
  category: string;
  unit_price: number;
  unit_cost: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

export interface PriceHistory {
  id: UUID;
  product_id: UUID;
  unit_price: number;
  unit_cost: number;
  changed_at: string;
}

export interface Customer {
  id: UUID;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export type OrderStatus = 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado';

export interface Order {
  id: UUID;
  number: number;
  customer_id: UUID | null;
  created_at: string;
  delivery_at: string | null;
  status: OrderStatus;
  discount: number;
  notes: string | null;
  sale_id: UUID | null;
}

export interface OrderItem {
  id: UUID;
  order_id: UUID;
  product_id: UUID;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

export interface Payment {
  id: UUID;
  order_id: UUID;
  amount: number;
  method_id: UUID | null;
  paid_at: string;
  notes: string | null;
}

export interface Sale {
  id: UUID;
  number: number;
  customer_id: UUID | null;
  order_id: UUID | null;
  method_id: UUID | null;
  created_at: string;
  discount: number;
  notes: string | null;
  is_voided: boolean;
  voided_at: string | null;
}

export interface SaleItem {
  id: UUID;
  sale_id: UUID;
  product_id: UUID;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

export interface SaleWithDetails extends Sale {
  customer?: Customer | null;
  order?: Order | null;
  payment_method?: PaymentMethod | null;
  items: SaleItem[];
}

export interface OrderWithDetails extends Order {
  customer?: Customer | null;
  items: OrderItem[];
  payments: Payment[];
}

export interface CartItem {
  product_id: UUID;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}
