/**
 * Utilidades para el cumplimiento de la normativa VeriFactu (Hacienda España)
 */

export const VERIFACTU_CONFIG = {
    CIF_RESTAURANTE: 'B12345678', // TODO: Cambiar por el CIF real del restaurante
    NOMBRE_RESTAURANTE: 'EL REMEI RESTAURANTE',
    BASE_URL_AEAT: 'https://www2.agenciatributaria.gob.es/wlpl/VERIFACTU/Consulta',
};

/**
 * Genera el hash encadenado SHA-256 para un registro de facturación.
 */
export async function generateVeriFactuHash(currentData: any, previousHash: string = '') {
    const dataString = JSON.stringify(currentData) + previousHash;
    const msgUint8 = new TextEncoder().encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Genera la URL legal de VeriFactu para el Código QR.
 * Basado en la especificación de la AEAT.
 */
export function generateVeriFactuQRUrl(order: {
    id: string;
    fecha_registro: string;
    total_amount: number;
    hash_actual: string;
}) {
    const params = new URLSearchParams({
        id_emi: VERIFACTU_CONFIG.CIF_RESTAURANTE,
        num_serie: `REMEI-${new Date(order.fecha_registro).getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`,
        fecha_exp: new Date(order.fecha_registro).toLocaleDateString('es-ES').replace(/\//g, '-'),
        cuota_tot: (order.total_amount * 0.10).toFixed(2), // IVA 10% simplificado
        imp_tot: order.total_amount.toFixed(2),
        hash: order.hash_actual.slice(0, 8).toUpperCase()
    });

    return `${VERIFACTU_CONFIG.BASE_URL_AEAT}?${params.toString()}`;
}
