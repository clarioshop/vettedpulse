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
     */
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyDlH_OImYEXglrECSBJg0amfb-03t--quYs1lqeQle-czdfAJGYw2MWegj_qsY_Xmj/exec',
    
    /**
     * Site URL (auto-detected)
     */
    SITE_URL: window.location.origin,
    
    // ============================================
    // EXTERNAL SERVICES
    // ============================================
    
    SERVICES: {
        IPIFY_URL: 'https://api.ipify.org?format=json',
        IPIFY_TIMEOUT: 3000,
        CORS_PROXY: '' // Leave empty - we fixed CORS in backend
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
            salesRequiredForUpgrade: null,
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
        totalDailyClicks: 5000,
        totalDailySales: 500,
        concurrentSessions: 25,
        clickQuotaWarning: 4000,
        saleQuotaWarning: 400,
        sessionWarning: 20,
        maxAffiliatesTotal: 2500
    },
    
    // ============================================
    // SECURITY SETTINGS
    // ============================================
    
    SECURITY: {
        maxLoginAttempts: 5,
        loginLockoutMinutes: 15,
        sessionHours: 24,
        passwordMinLength: 8,
        passwordRequireSpecial: true,
        passwordRequireNumber: true,
        passwordRequireUpper: true,
        rateLimitWindow: 15 * 60 * 1000,
        tokenRefreshMinutes: 60,
        maxRequestSize: 1024 * 10
    },
    
    // ============================================
    // QUOTA WARNINGS
    // ============================================
    
    QUOTA_WARNING: {
        EMAIL_REMAINING: 5,
        REDIRECT_PAGE: '/waitlist.html?reason=email-quota',
        MANUAL_VERIFICATION: true
    },
    
    // ============================================
    // SYSTEM STATUS MONITORING
    // ============================================
    
    SYSTEM_CHECK: {
        INTERVAL: 60000,
        OFFLINE_PAGE: '/system-offline.html',
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
        clickLogThreshold: 30000,
        salesLogThreshold: 20000,
        keepMonths: 3
    },
    
    // ============================================
    // API ENDPOINTS
    // ============================================
    
    ENDPOINTS: {
        signup: 'signup',
        login: 'login',
        verify: 'verify',
        validateSession: 'validateSession',
        logout: 'logout',
        getDashboard: 'getDashboard',
        getProducts: 'getProducts',
        getLeaderboard: 'getLeaderboard',
        getCapacity: 'getCapacity',
        getTierStatus: 'getTierStatus',
        getSystemStatus: 'getSystemStatus',
        click: 'click',
        sale: 'sale',
        redirect: 'redirect',
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
    
    DEBUG: false
};

// ============================================
// VALIDATE CONFIGURATION
// ============================================

(function validateConfig() {
    // Check if APPS_SCRIPT_URL is set (but not the placeholder)
    if (CONFIG.APPS_SCRIPT_URL.includes('YOUR_SCRIPT_ID') || 
        CONFIG.APPS_SCRIPT_URL.includes('xxxxxxxxx')) {
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
            '❌ Tier total mismatch:',
            totalAffiliates,
            'vs',
            CONFIG.CAPACITY.maxAffiliatesTotal
        );
    } else {
        console.log('✅ Tier configuration valid');
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

// Single startup log
console.log('✅ VettedPulse Config loaded');
