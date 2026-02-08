export interface Product {
    id: string;
    name: string;
    price: number;
    category: 'primero' | 'segundo' | 'postre' | 'bebida' | string;
    is_available: boolean;
    description?: string;
    image_url?: string;
    created_at?: string;
}

export interface OrderItem {
    id: string;
    name: string;
    qty: number;
    price: number;
    category: string;
    is_ready?: boolean;
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    credit_limit: number;
    current_debt: number;
    is_verified: boolean;
    verification_code?: string;
    last_reminder_sent?: string;
    created_at?: string;
}

export interface Order {
    id: string;
    table_number: number;
    status: 'pending' | 'cooking' | 'ready' | 'served';
    is_paid: boolean;
    total_amount: number;
    payment_intent_id?: string;
    customer_id?: string;
    payment_method?: 'cash' | 'card' | 'online' | 'credit';
    items: OrderItem[];
    created_at?: string;
    updated_at?: string;
    drinks_served?: boolean;
}

export type TableStatus = 'available' | 'ordered' | 'paid';
