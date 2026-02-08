export interface Product {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    price: number;
    category: 'primero' | 'segundo' | 'postre' | 'bebida' | string;
    is_available: boolean;
    created_at?: string;
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
