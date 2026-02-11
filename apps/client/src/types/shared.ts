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
    // Bloque E: Nuevos campos
    is_daily_special?: boolean;
    daily_special_price?: number;
    allergens?: string[];
    created_at?: string;
}

export interface Prize {
    id: string;
    name: string;
    description?: string;
    icon: string;
    probability: number;
    prize_type: 'free_item' | 'discount' | 'points_multiplier' | 'none';
    prize_value?: string;
    is_active: boolean;
}

export interface PrizeRedemption {
    id: string;
    customer_id: string;
    prize_id: string;
    order_id: string;
    is_redeemed: boolean;
    redeemed_at?: string;
    created_at?: string;
}

export interface HappyHourConfig {
    id: string;
    start_hour: number;
    end_hour: number;
    discount_percent: number;
    applies_to: string;
    is_active: boolean;
}

export interface KitchenConfig {
    category: string;
    avg_minutes: number;
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
