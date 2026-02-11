export interface Product {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    price: number;
    category: 'primero' | 'segundo' | 'postre' | 'bebida' | string;
    is_available: boolean;
    is_chef_suggestion?: boolean;
    is_top_suggestion?: boolean;
    created_at?: string;
}

export interface OrderItem {
    id: string;
    name: string;
    qty: number;
    price: number;
    category: string;
    is_ready?: boolean;
    is_served?: boolean;
    status?: 'pending' | 'cooking' | 'ready' | string;
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
    payment_method?: 'cash' | 'card' | 'credit';
    items: OrderItem[];
    created_at?: string;
    updated_at?: string;
    drinks_served?: boolean;
}

export type TableStatus = 'available' | 'ordered' | 'paid';
