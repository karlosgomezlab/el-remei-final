const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://rxlgfbmggzwzdkknldta.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bGdmYm1nZ3p3emRra25sZHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTgxMDksImV4cCI6MjA4NTc5NDEwOX0.YMSG4CU8q3j8uqRZ3hUKxP5GD8OSXvNiADLBEmAi5qk'
);

async function getCode() {
    const { data, error } = await supabase
        .from('customers')
        .select('verification_code')
        .eq('phone', '643782520')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('CODE:', data.verification_code);
    }
}

getCode();
