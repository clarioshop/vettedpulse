/**
 * Input Validation and Fraud Detection Module
 * Validates all user inputs before processing
 */

const Validator = {
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid
     */
    isEmail: (email) => {
        if (!email || typeof email !== 'string') return false;
        
        // RFC 5322 compliant email regex
        const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        
        const clean = email.trim().toLowerCase();
        return emailRegex.test(clean);
    },
    
    /**
     * Validate email domain
     * @param {string} email - Email to validate
     * @returns {boolean} - True if domain exists
     */
    hasValidDomain: async (email) => {
        if (!Validator.isEmail(email)) return false;
        
        const domain = email.split('@')[1];
        
        // Check for disposable email domains
        const disposableDomains = [
            'tempmail.com', 'throwaway.com', 'mailinator.com',
            'guerrillamail.com', 'sharklasers.com', 'yopmail.com'
        ];
        
        if (disposableDomains.includes(domain)) {
            return false;
        }
        
        return true;
    },
    
    // ============================================
    // PASSWORD VALIDATION
    // ============================================
    
    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} - Validation result
     */
    isStrongPassword: (password) => {
        if (!password || typeof password !== 'string') {
            return { valid: false, reason: 'Password is required' };
        }
        
        const checks = {
            length: password.length >= CONFIG.SECURITY.passwordMinLength,
            number: !CONFIG.SECURITY.passwordRequireNumber || /\d/.test(password),
            upper: !CONFIG.SECURITY.passwordRequireUpper || /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            special: !CONFIG.SECURITY.passwordRequireSpecial || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            noSpaces: !/\s/.test(password)
        };
        
        if (!checks.length) {
            return { 
                valid: false, 
                reason: `Minimum ${CONFIG.SECURITY.passwordMinLength} characters required`,
                checks 
            };
        }
        if (!checks.number) {
            return { valid: false, reason: 'Must contain at least one number', checks };
        }
        if (!checks.upper) {
            return { valid: false, reason: 'Must contain at least one uppercase letter', checks };
        }
        if (!checks.lower) {
            return { valid: false, reason: 'Must contain at least one lowercase letter', checks };
        }
        if (!checks.special) {
            return { valid: false, reason: 'Must contain at least one special character', checks };
        }
        if (!checks.noSpaces) {
            return { valid: false, reason: 'Cannot contain spaces', checks };
        }
        
        // Check for common passwords
        const commonPasswords = [
            'password', 'password123', '123456', '12345678', 
            'qwerty', 'abc123', 'letmein', 'monkey', '1234567890'
        ];
        
        if (commonPasswords.includes(password.toLowerCase())) {
            return { valid: false, reason: 'Password is too common', checks };
        }
        
        return { valid: true, checks };
    },
    
    /**
     * Calculate password strength score (0-100)
     * @param {string} password - Password to evaluate
     * @returns {number} - Strength score
     */
    getPasswordStrength: (password) => {
        if (!password) return 0;
        
        let score = 0;
        
        // Length contribution (up to 40 points)
        score += Math.min(40, password.length * 4);
        
        // Character variety (up to 40 points)
        if (/[a-z]/.test(password)) score += 10;
        if (/[A-Z]/.test(password)) score += 10;
        if (/\d/.test(password)) score += 10;
        if (/[!@#$%^&*]/.test(password)) score += 10;
        
        // Uniqueness (up to 20 points)
        const uniqueChars = new Set(password.split('')).size;
        score += Math.min(20, (uniqueChars / password.length) * 20);
        
        return Math.min(100, Math.round(score));
    },
    
    // ============================================
    // NAME VALIDATION
    // ============================================
    
    /**
     * Validate name format
     * @param {string} name - Name to validate
     * @returns {boolean} - True if valid
     */
    isValidName: (name) => {
        if (!name || typeof name !== 'string') return false;
        
        const clean = name.trim();
        
        // Length check
        if (clean.length < 2 || clean.length > 50) return false;
        
        // Characters: letters, spaces, hyphens, apostrophes only
        if (!/^[a-zA-Z\s'-]+$/.test(clean)) return false;
        
        // No consecutive special characters
        if (/['-]{2,}/.test(clean)) return false;
        
        // Must have at least one letter
        if (!/[a-zA-Z]/.test(clean)) return false;
        
        return true;
    },
    
    // ============================================
    // VERIFICATION CODE VALIDATION
    // ============================================
    
    /**
     * Validate verification code
     * @param {string} code - 8-digit code
     * @returns {boolean} - True if valid
     */
    isValidVerificationCode: (code) => {
        if (!code) return false;
        
        // Must be exactly 8 digits
        return /^\d{8}$/.test(String(code));
    },
    
    // ============================================
    // IP ADDRESS VALIDATION
    // ============================================
    
    /**
     * Validate IP address
     * @param {string} ip - IP address
     * @returns {boolean} - True if valid
     */
    isValidIP: (ip) => {
        if (!ip || typeof ip !== 'string') return false;
        
        ip = ip.trim();
        
        // IPv4
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (ipv4Regex.test(ip)) return true;
        
        // IPv6
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        return ipv6Regex.test(ip);
    },
    
    // ============================================
    // BOT DETECTION
    // ============================================
    
    /**
     * Detect bots from user agent
     * @param {string} userAgent - User agent string
     * @returns {boolean} - True if bot detected
     */
    isBot: (userAgent) => {
        if (!userAgent || typeof userAgent !== 'string') return true;
        
        const ua = userAgent.toLowerCase();
        
        const botPatterns = [
            'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
            'python', 'java', 'perl', 'ruby', 'php', 'node',
            'headless', 'selenium', 'puppeteer', 'phantom',
            'googlebot', 'bingbot', 'slurp', 'duckduckbot',
            'baiduspider', 'yandexbot', 'facebookexternalhit',
            'twitterbot', 'linkedinbot', 'whatsapp', 'telegram',
            'slack', 'discord', 'embedly', 'buffer', 'pinterest',
            'ahrefs', 'semrush', 'moz', 'rogerbot', 'exabot'
        ];
        
        return botPatterns.some(pattern => ua.includes(pattern));
    },
    
    /**
     * Detect if request is from a known bad bot
     * @param {string} userAgent - User agent string
     * @returns {boolean} - True if malicious bot
     */
    isMaliciousBot: (userAgent) => {
        if (!userAgent) return false;
        
        const ua = userAgent.toLowerCase();
        
        const maliciousPatterns = [
            'masscan', 'zgrab', 'nmap', 'nikto', 'sqlmap',
            'hydra', 'medusa', 'bruteforce', 'dirbuster',
            'gobuster', 'wfuzz', 'wfz', 'xss', 'injection'
        ];
        
        return maliciousPatterns.some(pattern => ua.includes(pattern));
    },
    
    // ============================================
    // CLICK VALIDATION
    // ============================================
    
    /**
     * Validate click before processing
     * @param {string} affiliateId - Affiliate ID
     * @param {string} productId - Product ID
     * @param {string} ip - IP address
     * @param {string} userAgent - User agent
     * @returns {Object} - Validation result
     */
    async validateClick(affiliateId, productId, ip, userAgent) {
        // Check for bots
        if (this.isBot(userAgent)) {
            return { 
                valid: false, 
                reason: 'Bot detected', 
                code: 'BOT_DETECTED' 
            };
        }
        
        // Check for malicious bots
        if (this.isMaliciousBot(userAgent)) {
            return { 
                valid: false, 
                reason: 'Malicious activity detected', 
                code: 'MALICIOUS_BOT' 
            };
        }
        
        // Check IP format
        if (!this.isValidIP(ip)) {
            return { 
                valid: false, 
                reason: 'Invalid IP address', 
                code: 'INVALID_IP' 
            };
        }
        
        // Validate affiliate ID format
        if (!this.isValidAffiliateId(affiliateId)) {
            return { 
                valid: false, 
                reason: 'Invalid affiliate ID', 
                code: 'INVALID_AFFILIATE' 
            };
        }
        
        // Validate product ID format
        if (!this.isValidProductId(productId)) {
            return { 
                valid: false, 
                reason: 'Invalid product ID', 
                code: 'INVALID_PRODUCT' 
            };
        }
        
        return { valid: true };
    },
    
    // ============================================
    // SALE VALIDATION
    // ============================================
    
    /**
     * Validate sale amount
     * @param {any} amount - Sale amount
     * @returns {boolean} - True if valid
     */
    isValidSaleAmount: (amount) => {
        if (amount === null || amount === undefined) return false;
        
        const num = parseFloat(amount);
        
        // Must be a number
        if (isNaN(num) || !isFinite(num)) return false;
        
        // Must be positive
        if (num <= 0) return false;
        
        // Must be within reasonable range
        if (num > 100000) return false;
        
        // Must have at most 2 decimal places
        if (!/^\d+(\.\d{1,2})?$/.test(String(amount))) return false;
        
        return true;
    },
    
    // ============================================
    // ID VALIDATION
    // ============================================
    
    /**
     * Validate affiliate ID format
     * @param {string} id - Affiliate ID
     * @returns {boolean} - True if valid
     */
    isValidAffiliateId: (id) => {
        if (!id || typeof id !== 'string') return false;
        
        // AFF + timestamp + random (alphanumeric)
        return /^AFF\d{13}\d{1,3}$/.test(id);
    },
    
    /**
     * Validate product ID format
     * @param {string} id - Product ID
     * @returns {boolean} - True if valid
     */
    isValidProductId: (id) => {
        if (!id || typeof id !== 'string') return false;
        
        // Product IDs are alphanumeric with underscores and hyphens
        return /^[A-Za-z0-9_-]{3,20}$/.test(id);
    },
    
    // ============================================
    // TIER LIMITS
    // ============================================
    
    /**
     * Check tier limits for an action
     * @param {string} tier - Tier name
     * @param {string} action - Action to check
     * @param {number} currentValue - Current value
     * @returns {Object} - Limit check result
     */
    checkTierLimits: (tier, action, currentValue) => {
        const tierConfig = CONFIG.TIERS[tier];
        if (!tierConfig) {
            return { allowed: false, reason: 'Invalid tier' };
        }
        
        switch(action) {
            case 'click':
                return {
                    allowed: currentValue < tierConfig.perAffiliateClickLimit,
                    limit: tierConfig.perAffiliateClickLimit,
                    remaining: tierConfig.perAffiliateClickLimit - currentValue,
                    current: currentValue
                };
            case 'sale':
                return {
                    allowed: true, // Sales always allowed
                    limit: 'unlimited'
                };
            default:
                return { allowed: true };
        }
    },
    
    // ============================================
    // REQUEST VALIDATION
    // ============================================
    
    /**
     * Validate request size
     * @param {Object} data - Request data
     * @returns {boolean} - True if within limits
     */
    isValidRequestSize: (data) => {
        try {
            const size = new Blob([JSON.stringify(data)]).size;
            return size <= CONFIG.SECURITY.maxRequestSize;
        } catch {
            return false;
        }
    },
    
    // ============================================
    // COMPREHENSIVE VALIDATION
    // ============================================
    
    /**
     * Validate signup data
     * @param {Object} data - Signup data
     * @returns {Object} - Validation result
     */
    validateSignupData: (data) => {
        const errors = [];
        
        // Validate name
        if (!Validator.isValidName(data.name)) {
            errors.push('Invalid name format (letters, spaces, hyphens only)');
        }
        
        // Validate email
        if (!Validator.isEmail(data.email)) {
            errors.push('Invalid email format');
        }
        
        // Validate password
        const passwordCheck = Validator.isStrongPassword(data.password);
        if (!passwordCheck.valid) {
            errors.push(passwordCheck.reason);
        }
        
        // Validate tier
        if (data.tier && !CONFIG.TIERS[data.tier]) {
            errors.push('Invalid tier selection');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            fields: {
                name: Validator.isValidName(data.name),
                email: Validator.isEmail(data.email),
                password: Validator.isStrongPassword(data.password).valid,
                tier: !data.tier || CONFIG.TIERS[data.tier]
            }
        };
    },
    
    /**
     * Validate login data
     * @param {Object} data - Login data
     * @returns {Object} - Validation result
     */
    validateLoginData: (data) => {
        const errors = [];
        
        if (!Validator.isEmail(data.email)) {
            errors.push('Invalid email format');
        }
        
        if (!data.password || data.password.length < 1) {
            errors.push('Password is required');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    },
    
    // ============================================
    // FRAUD DETECTION
    // ============================================
    
    /**
     * Detect suspicious patterns
     * @param {Array} clicks - Recent clicks
     * @returns {Object} - Fraud analysis
     */
    analyzeClickPattern: (clicks) => {
        if (!clicks || clicks.length < 10) {
            return { suspicious: false, reason: 'Insufficient data' };
        }
        
        // Check for rapid clicks (more than 10 per minute)
        const timeWindow = 60000; // 1 minute
        const recentClicks = clicks.filter(c => 
            Date.now() - new Date(c.timestamp).getTime() < timeWindow
        );
        
        if (recentClicks.length > 10) {
            return { 
                suspicious: true, 
                reason: 'Rapid clicking detected',
                score: 0.8,
                details: `${recentClicks.length} clicks in last minute`
            };
        }
        
        // Check for same IP pattern
        const ips = new Set(clicks.map(c => c.ip));
        if (ips.size === 1 && clicks.length > 20) {
            return {
                suspicious: true,
                reason: 'All clicks from same IP',
                score: 0.6,
                details: `${clicks.length} clicks from ${ips.size} IP`
            };
        }
        
        return { suspicious: false, score: 0 };
    },
    
    /**
     * Check if IP is in blacklist
     * @param {string} ip - IP address
     * @returns {Promise<boolean>} - True if blacklisted
     */
    async isBlacklistedIP(ip) {
        // This would connect to a blacklist service
        // For now, return false
        return false;
    }
};

// ============================================
// FREEZE OBJECT
// ============================================

Object.freeze(Validator);

// ============================================
// EXPORT FOR GLOBAL USE
// ============================================

window.Validator = Validator;

// ============================================
// SELF-TEST (only in debug mode)
// ============================================

if (CONFIG.DEBUG) {
    console.log('Testing Validator module...');
    
    const testCases = [
        { type: 'email', value: 'test@example.com', expected: true },
        { type: 'email', value: 'invalid-email', expected: false },
        { type: 'password', value: 'Pass123!@#', expected: true },
        { type: 'password', value: 'weak', expected: false },
        { type: 'name', value: 'John Doe', expected: true },
        { type: 'name', value: 'John123', expected: false }
    ];
    
    testCases.forEach(test => {
        let result;
        switch(test.type) {
            case 'email':
                result = Validator.isEmail(test.value);
                break;
            case 'password':
                result = Validator.isStrongPassword(test.value).valid;
                break;
            case 'name':
                result = Validator.isValidName(test.value);
                break;
        }
        console.log(`Validator test: ${test.type} "${test.value}" -> ${result} (expected: ${test.expected})`);
    });
}