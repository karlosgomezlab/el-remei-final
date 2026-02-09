export interface Product {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    image_url_2?: string;
    price: number;
    category: 'entrante' | 'primero' | 'segundo' | 'postre' | 'bebida' | 'cafe' | string;
    is_available: boolean;
    is_vegan?: boolean;
    is_gluten_free?: boolean;
    is_favorite?: boolean;
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
    dni?: string; // Documento Nacional de Identidad para VeriFactu y Crédito
    points?: number;
    loyalty_level?: string;
    total_spent?: number;
    verification_code?: string;
    last_reminder_sent?: string;
    created_at?: string;
}
