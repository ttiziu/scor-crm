/**
 * Rate limiter simple en memoria para proteger endpoints críticos.
 * Para producción con múltiples instancias, migrar a Redis.
 */

type RateLimitEntry = {
    count: number;
    firstAttempt: number;
};

const store = new Map<string, RateLimitEntry>();

// Configuración
const MAX_ATTEMPTS = 5; // Intentos permitidos
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos en milisegundos

// Limpieza periódica de entradas expiradas (cada 5 minutos)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now - entry.firstAttempt > WINDOW_MS) {
            store.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Extrae la IP del request de Next.js
 */
export function getClientIp(request: Request): string {
    // Headers comunes de proxies (Vercel, Cloudflare, nginx)
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp.trim();
    }
    // Fallback (en desarrollo local suele ser ::1 o 127.0.0.1)
    return "unknown";
}

/**
 * Verifica si una IP está bloqueada por rate limiting.
 * Retorna { blocked: true, retryAfter } si está bloqueada.
 */
export function isRateLimited(ip: string): { blocked: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry) {
        return { blocked: false };
    }

    // Si la ventana expiró, limpiar y permitir
    if (now - entry.firstAttempt > WINDOW_MS) {
        store.delete(ip);
        return { blocked: false };
    }

    // Si superó el límite, está bloqueado
    if (entry.count >= MAX_ATTEMPTS) {
        const retryAfter = Math.ceil((WINDOW_MS - (now - entry.firstAttempt)) / 1000);
        return { blocked: true, retryAfter };
    }

    return { blocked: false };
}

/**
 * Registra un intento fallido de login.
 * Llamar solo cuando las credenciales son inválidas.
 */
export function recordFailedAttempt(ip: string): void {
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now - entry.firstAttempt > WINDOW_MS) {
        // Nueva ventana
        store.set(ip, { count: 1, firstAttempt: now });
    } else {
        // Incrementar contador en ventana existente
        entry.count += 1;
    }
}

/**
 * Limpia los intentos fallidos de una IP.
 * Llamar cuando el login es exitoso.
 */
export function clearFailedAttempts(ip: string): void {
    store.delete(ip);
}
