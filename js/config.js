/**
 * VettedPulse Central Configuration
 * WARNING: Must match backend TIERS constant in Code.gs
 */

const CONFIG = {
    // ============================================
    // APPS SCRIPT CONFIGURATION
    // ============================================
    
    /**
     * Your Google Apps Script Web App URL
     * Format: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
     * @type {string}
     */
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx2E9yvMDYyelEpcc_di2Z2ORjcJdDwQlrlcEVX95aXNxNhsIgcUqm3kdb3aPwuRdWC/exec',
    
    /**
     * Site URL (auto-detected)
     * @type {string}
     */
    SITE_URL: window.location.origin,
    
    // ============================================
    // EXTERNAL SERVICES
    // ============================================
    
    SERVICES: {
        /**
         * IP detection service (returns real IP, not proxy IP)
         */
        IPIFY_URL: 'https://api.ipify.org?format=json',
        
        /**
         * Timeout in milliseconds for external service calls
         */
        IPIFY_TIMEOUT: 3000,
        
        /**
         * CORS proxy (leave empty unless needed)
         */
        CORS_PROXY: ''
    },
    
    // ============================================
    // TIER SYSTEM CONFIGURATION
    // MUST MATCH BACKEND EXACTLY
    // ============================================
    
    TIERS: {
        NEWBIE: {
            name: 'Newbie',
            color: '#808080',
            maxAffiliates: 2000,
            perAffiliateClickLimit: 5,
            monthlyFee: 0,
            commissionMultiplier: 1.0,
            salesRequiredForUpgrade: 10,
            priority: 1,
            features: [
                '5 clicks/day',
                'Basic products',
                'Standard commission',
                'Email support'
            ]
        },
        ACTIVE: {
            name: 'Active',
            color: '#FFD700',
            maxAffiliates: 400,
            perAffiliateClickLimit: 50,
            monthlyFee: 29,
            commissionMultiplier: 1.15,
            salesRequiredForUpgrade: 50,
            priority: 2,
            features: [
                '50 clicks/day',
                'All products',
                '15% higher commission',
                'Priority support',
                'Advanced analytics'
            ]
        },
        PRO: {
            name: 'Pro',
            color: '#FFF44F',
            maxAffiliates: 90,
            perAffiliateClickLimit: 200,
            monthlyFee: 99,
            commissionMultiplier: 1.25,
            salesRequiredForUpgrade: 200,
            priority: 3,
            features: [
                '200 clicks/day',
                'Early access to products',
                '25% higher commission',
                'VIP support',
                'Real-time analytics',
                'Custom affiliate links'
            ]
        },
        ELITE: {
            name: 'Elite',
            color: '#28A745',
            maxAffiliates: 10,
            perAffiliateClickLimit: 500,
            monthlyFee: 299,
            commissionMultiplier: 1.5,
            salesRequiredForUpgrade: null, // Max tier
            priority: 4,
            features: [
                '500 clicks/day',
                'Exclusive products',
                '50% higher commission',
                'Dedicated account manager',
                'API access',
                'Custom reporting'
            ]
        }
    },
    
    // ============================================
    // SYSTEM CAPACITY LIMITS
    // ============================================
    
    CAPACITY: {
        /**
         * Maximum daily clicks across all affiliates
         */
        totalDailyClicks: 5000,
        
        /**
         * Maximum daily sales across all affiliates
         */
        totalDailySales: 500,
        
        /**
         * Maximum concurrent users
         */
        concurrentSessions: 25,
        
        /**
         * Warning thresholds (percentage)
         */
        clickQuotaWarning: 4000,  // 80% of 5000
        saleQuotaWarning: 400,     // 80% of 500
        sessionWarning: 20,         // 80% of 25
        
        /**
         * Maximum total affiliates (sum of all tiers)
         */
        maxAffiliatesTotal: 2500
    },
    
    // ============================================
    // SECURITY SETTINGS
    // ============================================
    
    SECURITY: {
        /**
         * Maximum login attempts per 15 minutes
         */
        maxLoginAttempts: 5,
        
        /**
         * Lockout duration in minutes after max attempts
         */
        loginLockoutMinutes: 15,
        
        /**
         * Session duration in hours
         */
        sessionHours: 24,
        
        /**
         * Password requirements
         */
        passwordMinLength: 8,
        passwordRequireSpecial: true,
        passwordRequireNumber: true,
        passwordRequireUpper: true,
        
        /**
         * Rate limiting window (15 minutes in milliseconds)
         */
        rateLimitWindow: 15 * 60 * 1000,
        
        /**
         * Token refresh interval in minutes
         */
        tokenRefreshMinutes: 60,
        
        /**
         * Maximum request size in bytes (10KB)
         */
        maxRequestSize: 1024 * 10
    },
    
    // ============================================
    // QUOTA WARNINGS
    // ============================================
    
    QUOTA_WARNING: {
        /**
         * Warn when email quota drops below this number
         */
        EMAIL_REMAINING: 5,
        
        /**
         * Redirect page when quota exceeded
         */
        REDIRECT_PAGE: '/waitlist.html?reason=email-quota',
        
        /**
         * Enable manual verification fallback
         */
        MANUAL_VERIFICATION: true
    },
    
    // ============================================
    // SYSTEM STATUS MONITORING
    // ============================================
    
    SYSTEM_CHECK: {
        /**
         * Check interval in milliseconds (1 minute)
         */
        INTERVAL: 60000,
        
        /**
         * Offline page URL
         */
        OFFLINE_PAGE: '/system-offline.html',
        
        /**
         * Sheet cells for system status (Z1, Z2, Z3)
         */
        STATUS_CELL: 'Affiliates!Z1',
        REASON_CELL: 'Affiliates!Z2',
        ETA_CELL: 'Affiliates!Z3'
    },
    
    // ============================================
    // PULSE SCORE FORMULA
    // ============================================
    
    PULSE_SCORE: {
        commissionWeight: 0.7,
        conversionWeight: 10,
        refundPenalty: 20
    },
    
    // ============================================
    // FEATURE FLAGS
    // ============================================
    
    FEATURES: {
        waitlistEnabled: true,
        tieredAccess: true,
        capacityMonitoring: true,
        fraudDetection: true,
        auditLogging: true,
        autoArchive: true,
        manualVerification: true,
        realIpTracking: true
    },
    
    // ============================================
    // ARCHIVE CONFIGURATION
    // ============================================
    
    ARCHIVE: {
        /**
         * Archive click logs when > 30,000 rows
         */
        clickLogThreshold: 30000,
        
        /**
         * Archive sales logs when > 20,000 rows
         */
        salesLogThreshold: 20000,
        
        /**
         * Keep 3 months in main sheet
         */
        keepMonths: 3
    },
    
    // ============================================
    // API ENDPOINTS
    // ============================================
    
    ENDPOINTS: {
        // Auth
        signup: 'signup',
        login: 'login',
        verify: 'verify',
        validateSession: 'validateSession',
        logout: 'logout',
        
        // Dashboard
        getDashboard: 'getDashboard',
        getProducts: 'getProducts',
        getLeaderboard: 'getLeaderboard',
        
        // Capacity
        getCapacity: 'getCapacity',
        getTierStatus: 'getTierStatus',
        getSystemStatus: 'getSystemStatus',
        
        // Tracking
        click: 'click',
        sale: 'sale',
        redirect: 'redirect',
        
        // Waitlist
        joinWaitlist: 'joinWaitlist'
    },
    
    // ============================================
    // CACHE KEYS
    // ============================================
    
    CACHE_KEYS: {
        loginAttempts: 'login_attempts_',
        sessionData: 'session_',
        tierCounts: 'tier_counts',
        capacityStats: 'capacity_stats',
        leaderboard: 'leaderboard',
        systemStatus: 'system_status'
    },
    
    // ============================================
    // DEBUG MODE
    // ============================================
    
    /**
     * Enable debug logging (disable in production)
     * @type {boolean}
     */
    DEBUG: false
};

// ============================================
// VALIDATE CONFIGURATION
// ============================================

(function validateConfig() {
    // Check if APPS_SCRIPT_URL is set
    if (CONFIG.APPS_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
        console.warn(
            '%c⚠️ VettedPulse Configuration Warning\n' +
            '%cPlease update CONFIG.APPS_SCRIPT_URL in js/config.js with your actual Apps Script URL',
            'color: #FFD700; font-size: 14px; font-weight: bold;',
            'color: #FF4136; font-size: 12px;'
        );
    }
    
    // Validate tier totals
    const totalAffiliates = Object.values(CONFIG.TIERS)
        .reduce((sum, tier) => sum + tier.maxAffiliates, 0);
    
    if (totalAffiliates !== CONFIG.CAPACITY.maxAffiliatesTotal) {
        console.error(
            'Tier total mismatch:',
            totalAffiliates,
            'vs',
            CONFIG.CAPACITY.maxAffiliatesTotal
        );
    }
    
    // Check if running on localhost (CORS considerations)
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
        console.info('Running in development mode on localhost');
    }
})();

// ============================================
// HELPER FUNCTIONS
// ============================================

CONFIG.getTierByName = function(tierName) {
    return this.TIERS[tierName] || this.TIERS.NEWBIE;
};

CONFIG.getTierColor = function(tierName) {
    return this.getTierByName(tierName).color;
};

CONFIG.getTierLimit = function(tierName) {
    return this.getTierByName(tierName).perAffiliateClickLimit;
};

CONFIG.getTierMultiplier = function(tierName) {
    return this.getTierByName(tierName).commissionMultiplier;
};

CONFIG.isValidTier = function(tierName) {
    return tierName in this.TIERS;
};

CONFIG.getNextTier = function(currentTier) {
    const tiers = ['NEWBIE', 'ACTIVE', 'PRO', 'ELITE'];
    const index = tiers.indexOf(currentTier);
    return index >= 0 && index < tiers.length - 1 ? tiers[index + 1] : null;
};

CONFIG.getTierProgress = function(currentTier, currentSales) {
    const tier = this.TIERS[currentTier];
    if (!tier || !tier.salesRequiredForUpgrade) return 100;
    return Math.min(100, (currentSales / tier.salesRequiredForUpgrade) * 100);
};

// ============================================
// FREEZE CONFIGURATION
// ============================================

Object.freeze(CONFIG);

// ============================================
// EXPORT
// ============================================

window.CONFIG = CONFIG;

// Debug output
if (CONFIG.DEBUG) {
    console.log('VettedPulse Config loaded:', CONFIG);
    console.log('Tier totals:', Object.values(CONFIG.TIERS)
        .map(t => `${t.name}: ${t.maxAffiliates}`)
        .join(', '));
}