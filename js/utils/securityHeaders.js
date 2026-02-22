/**
 * Security Headers Configuration Module
 * Manages CSP, CSRF protection, and other security headers
 */

const SecurityHeaders = {
    // CSRF token storage
    csrfToken: null,
    csrfTokenExpiry: null,
    csrfTokenDuration: 3600000, // 1 hour in milliseconds
    
    // ============================================
    // CONTENT SECURITY POLICY
    // ============================================
    
    /**
     * Generate Content Security Policy header
     * @returns {Object} - CSP header object
     */
    getCSP: () => {
        return {
            'Content-Security-Policy': [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' https://api.ipify.org https://script.google.com https://apis.google.com https://fonts.googleapis.com",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "connect-src 'self' https://api.ipify.org https://script.google.com https://*.googleapis.com",
                "img-src 'self' data: https:",
                "frame-src 'self' https://script.google.com",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
                "block-all-mixed-content",
                "upgrade-insecure-requests"
            ].join('; ')
        };
    },
    
    /**
     * Get all security headers
     * @returns {Object} - All security headers
     */
    getHeaders: () => {
        return {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
            'Cache-Control': 'no-store, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...SecurityHeaders.getCSP()
        };
    },
    
    /**
     * Generate meta tags for HTML head
     * @returns {string} - HTML meta tags
     */
    getMetaTags: () => {
        const csp = SecurityHeaders.getCSP()['Content-Security-Policy'];
        
        return `
            <!-- Security Headers -->
            <meta http-equiv="Content-Security-Policy" content="${csp}">
            <meta http-equiv="X-Frame-Options" content="DENY">
            <meta http-equiv="X-Content-Type-Options" content="nosniff">
            <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
            <meta http-equiv="Cache-Control" content="no-store, max-age=0">
            <meta http-equiv="Pragma" content="no-cache">
            <meta http-equiv="Expires" content="0">
        `;
    },
    
    // ============================================
    // CSRF PROTECTION
    // ============================================
    
    /**
     * Generate cryptographically secure CSRF token
     * @returns {string} - CSRF token
     */
    generateCSRFToken: () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },
    
    /**
     * Get or create CSRF token
     * @returns {string} - CSRF token
     */
    getCSRFToken: () => {
        // Check if existing token is still valid
        if (SecurityHeaders.csrfToken && 
            SecurityHeaders.csrfTokenExpiry && 
            Date.now() < SecurityHeaders.csrfTokenExpiry) {
            return SecurityHeaders.csrfToken;
        }
        
        // Generate new token
        SecurityHeaders.csrfToken = SecurityHeaders.generateCSRFToken();
        SecurityHeaders.csrfTokenExpiry = Date.now() + SecurityHeaders.csrfTokenDuration;
        
        // Store in sessionStorage
        try {
            sessionStorage.setItem('csrf_token', SecurityHeaders.csrfToken);
            sessionStorage.setItem('csrf_token_expiry', SecurityHeaders.csrfTokenExpiry.toString());
        } catch (e) {
            console.warn('Could not store CSRF token in sessionStorage:', e);
        }
        
        return SecurityHeaders.csrfToken;
    },
    
    /**
     * Validate CSRF token
     * @param {string} token - Token to validate
     * @returns {boolean} - True if valid
     */
    validateCSRFToken: (token) => {
        if (!token) return false;
        
        // Check against stored token
        const stored = SecurityHeaders.csrfToken || sessionStorage.getItem('csrf_token');
        const expiry = SecurityHeaders.csrfTokenExpiry || sessionStorage.getItem('csrf_token_expiry');
        
        if (!stored || !expiry) return false;
        
        // Check expiry
        if (Date.now() > parseInt(expiry)) {
            // Clear expired token
            SecurityHeaders.clearCSRFToken();
            return false;
        }
        
        // Constant-time comparison to prevent timing attacks
        return SecurityHeaders.secureCompare(token, stored);
    },
    
    /**
     * Clear CSRF token
     */
    clearCSRFToken: () => {
        SecurityHeaders.csrfToken = null;
        SecurityHeaders.csrfTokenExpiry = null;
        try {
            sessionStorage.removeItem('csrf_token');
            sessionStorage.removeItem('csrf_token_expiry');
        } catch (e) {
            console.warn('Could not clear CSRF token from sessionStorage:', e);
        }
    },
    
    /**
     * Secure string comparison (constant-time)
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {boolean} - True if equal
     */
    secureCompare: (a, b) => {
        if (!a || !b) return false;
        if (a.length !== b.length) return false;
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    },
    
    // ============================================
    // FETCH WRAPPER WITH SECURITY
    // ============================================
    
    /**
     * Secure fetch wrapper with CSRF token
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} - Fetch response
     */
    async secureFetch(url, options = {}) {
        const csrfToken = SecurityHeaders.getCSRFToken();
        
        // Prepare headers
        const headers = {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': csrfToken,
            'X-Content-Type-Options': 'nosniff',
            ...options.headers
        };
        
        // Add content type for POST requests
        if (options.method === 'POST' || options.method === 'PUT') {
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        }
        
        // Prepare fetch options
        const fetchOptions = {
            ...options,
            headers,
            credentials: 'include',
            cache: 'no-store',
            mode: 'cors'
        };
        
        try {
            const response = await fetch(url, fetchOptions);
            
            // Check for CSRF token in response headers
            const responseCsrf = response.headers.get('X-CSRF-Token');
            if (responseCsrf) {
                // Update token if server sends new one
                SecurityHeaders.csrfToken = responseCsrf;
                SecurityHeaders.csrfTokenExpiry = Date.now() + SecurityHeaders.csrfTokenDuration;
            }
            
            return response;
        } catch (error) {
            console.error('Secure fetch failed:', error);
            throw error;
        }
    },
    
    /**
     * Apply security headers to response
     * @param {Response} response - Response object
     * @returns {Response} - Response with headers
     */
    applyToResponse: (response) => {
        const headers = SecurityHeaders.getHeaders();
        Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        return response;
    },
    
    // ============================================
    // COOKIE SECURITY
    // ============================================
    
    /**
     * Set secure cookie
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {number} days - Expiry in days
     */
    setSecureCookie: (name, value, days = 1) => {
        const expires = new Date();
        expires.setDate(expires.getDate() + days);
        
        const cookie = [
            `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
            `expires=${expires.toUTCString()}`,
            'path=/',
            'secure',
            'samesite=strict',
            'httponly' // Note: This only works for server-set cookies
        ].join('; ');
        
        document.cookie = cookie;
    },
    
    /**
     * Get cookie value
     * @param {string} name - Cookie name
     * @returns {string|null} - Cookie value
     */
    getCookie: (name) => {
        const cookies = document.cookie.split('; ');
        const cookie = cookies.find(c => c.startsWith(name + '='));
        
        if (!cookie) return null;
        
        return decodeURIComponent(cookie.split('=')[1]);
    },
    
    /**
     * Delete cookie
     * @param {string} name - Cookie name
     */
    deleteCookie: (name) => {
        document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=strict`;
    },
    
    // ============================================
    // HSTS PRELOAD
    // ============================================
    
    /**
     * Get HSTS header (for server configuration)
     * @param {number} maxAge - Max age in seconds
     * @returns {string} - HSTS header
     */
    getHSTSHeader: (maxAge = 31536000) => {
        return `Strict-Transport-Security: max-age=${maxAge}; includeSubDomains; preload`;
    },
    
    // ============================================
    // SECURITY AUDIT
    // ============================================
    
    /**
     * Check current page security
     * @returns {Object} - Security audit results
     */
    auditSecurity: () => {
        const results = {
            https: window.location.protocol === 'https:',
            cookies: {
                secure: document.cookie.includes('secure'),
                httpOnly: false, // Can't detect from JS
                sameSite: document.cookie.includes('samesite')
            },
            headers: {
                csp: false,
                xframe: false,
                xss: false
            },
            warnings: []
        };
        
        // Check for security headers in meta tags
        const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        const metaXFrame = document.querySelector('meta[http-equiv="X-Frame-Options"]');
        const metaXSS = document.querySelector('meta[http-equiv="X-XSS-Protection"]');
        
        results.headers.csp = !!metaCSP;
        results.headers.xframe = !!metaXFrame;
        results.headers.xss = !!metaXSS;
        
        // Generate warnings
        if (!results.https) {
            results.warnings.push('Site is not using HTTPS');
        }
        
        if (!results.headers.csp) {
            results.warnings.push('Content Security Policy not set');
        }
        
        if (!results.headers.xframe) {
            results.warnings.push('X-Frame-Options not set - vulnerable to clickjacking');
        }
        
        return results;
    },
    
    /**
     * Log security audit results
     */
    logSecurityAudit: () => {
        if (CONFIG.DEBUG) {
            const audit = SecurityHeaders.auditSecurity();
            console.group('🔒 Security Audit');
            console.log('HTTPS:', audit.https ? '✅' : '❌');
            console.log('CSP:', audit.headers.csp ? '✅' : '❌');
            console.log('X-Frame-Options:', audit.headers.xframe ? '✅' : '❌');
            console.log('X-XSS-Protection:', audit.headers.xss ? '✅' : '❌');
            
            if (audit.warnings.length > 0) {
                console.warn('Warnings:', audit.warnings);
            }
            console.groupEnd();
        }
    }
};

// ============================================
// INITIALIZE
// ============================================

// Run security audit on load
document.addEventListener('DOMContentLoaded', () => {
    SecurityHeaders.logSecurityAudit();
    
    // Initialize CSRF token
    SecurityHeaders.getCSRFToken();
});

// ============================================
// FREEZE OBJECT
// ============================================

Object.freeze(SecurityHeaders);

// ============================================
// EXPORT FOR GLOBAL USE
// ============================================

window.SecurityHeaders = SecurityHeaders;

// ============================================
// SELF-TEST
// ============================================

if (CONFIG.DEBUG) {
    // Test CSRF token generation
    const token1 = SecurityHeaders.generateCSRFToken();
    const token2 = SecurityHeaders.generateCSRFToken();
    
    console.log('CSRF Token test:', {
        token1,
        token2,
        unique: token1 !== token2,
        length: token1.length === 64
    });
    
    // Test secure comparison
    const compare1 = SecurityHeaders.secureCompare('abc123', 'abc123');
    const compare2 = SecurityHeaders.secureCompare('abc123', 'abc124');
    
    console.log('Secure compare test:', {
        equal: compare1 === true,
        notEqual: compare2 === false
    });
}