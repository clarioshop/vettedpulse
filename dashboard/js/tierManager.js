/**
 * Tier Management System
 * Handles affiliate tier logic, limits, and progression
 */

class TierManager {
    constructor() {
        this.currentAffiliateId = localStorage.getItem('affiliateID');
        this.cache = new Map();
        this.cacheTTL = 300000; // 5 minutes
        this.updateCallbacks = [];
        
        this.init();
    }
    
    /**
     * Initialize tier manager
     */
    init() {
        console.log('TierManager initialized');
    }
    
    // ============================================
    // TIER DATA
    // ============================================
    
    /**
     * Get affiliate's current tier from backend
     * @param {string} affiliateId - Affiliate ID (optional)
     * @returns {Promise<Object>} - Tier status object
     */
    async getCurrentTier(affiliateId = this.currentAffiliateId) {
        if (!affiliateId) return null;
        
        // Check cache first
        const cacheKey = `tier_${affiliateId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=${CONFIG.ENDPOINTS.getTierStatus}&` +
                `affiliateId=${encodeURIComponent(affiliateId)}&` +
                `token=${encodeURIComponent(token)}&` +
                `_=${Date.now()}`
            );
            
            const data = await response.json();
            
            if (data.success) {
                const tierData = {
                    tier: data.currentTier,
                    tierInfo: CONFIG.TIERS[data.currentTier] || CONFIG.TIERS.NEWBIE,
                    clicksToday: data.clicksToday || 0,
                    clicksLimit: data.clicksLimit || 0,
                    clicksRemaining: data.clicksRemaining || 0,
                    salesToday: data.salesToday || 0,
                    totalSales: data.totalSales || 0,
                    tierProgress: data.progressToNext || 0,
                    nextTier: data.nextTier,
                    commissionMultiplier: data.commissionMultiplier || 1.0,
                    upgradeAvailable: data.upgradeAvailable || false
                };
                
                // Cache the result
                this.setCached(cacheKey, tierData);
                
                // Notify listeners
                this.notifyListeners(tierData);
                
                return tierData;
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get tier status:', error);
            return null;
        }
    }
    
    /**
     * Check if action is allowed based on tier limits
     * @param {string} action - Action to check ('click' or 'sale')
     * @param {string} affiliateId - Affiliate ID
     * @returns {Promise<Object>} - Permission result
     */
    async isActionAllowed(action, affiliateId = this.currentAffiliateId) {
        const tier = await this.getCurrentTier(affiliateId);
        if (!tier) {
            return { allowed: false, reason: 'Unable to verify tier' };
        }
        
        switch(action) {
            case 'click':
                if (tier.clicksRemaining <= 0) {
                    return {
                        allowed: false,
                        reason: 'Daily click limit reached',
                        current: tier.clicksToday,
                        limit: tier.clicksLimit,
                        remaining: 0
                    };
                }
                return {
                    allowed: true,
                    remaining: tier.clicksRemaining,
                    current: tier.clicksToday,
                    limit: tier.clicksLimit
                };
                
            case 'sale':
                return { allowed: true }; // Sales always allowed
                
            default:
                return { allowed: true };
        }
    }
    
    /**
     * Get remaining clicks for today
     * @param {string} affiliateId - Affiliate ID
     * @returns {Promise<number>} - Remaining clicks
     */
    async getRemainingClicks(affiliateId = this.currentAffiliateId) {
        const result = await this.isActionAllowed('click', affiliateId);
        return result.remaining || 0;
    }
    
    /**
     * Check if affiliate can upgrade tier
     * @param {string} affiliateId - Affiliate ID
     * @returns {Promise<Object>} - Upgrade eligibility
     */
    async canUpgrade(affiliateId = this.currentAffiliateId) {
        const tier = await this.getCurrentTier(affiliateId);
        if (!tier || !tier.nextTier) {
            return { canUpgrade: false, reason: 'Already at max tier' };
        }
        
        const nextTierConfig = CONFIG.TIERS[tier.nextTier];
        const required = tier.tierInfo.salesRequiredForUpgrade;
        
        if (tier.totalSales >= required) {
            // Check if next tier has capacity
            const capacity = await this.checkTierCapacity(tier.nextTier);
            if (capacity.available > 0) {
                return {
                    canUpgrade: true,
                    currentTier: tier.tier,
                    nextTier: tier.nextTier,
                    required: required,
                    current: tier.totalSales
                };
            } else {
                return {
                    canUpgrade: false,
                    reason: `${tier.nextTier} tier is currently full`,
                    waitlist: true
                };
            }
        }
        
        return {
            canUpgrade: false,
            reason: `Need ${required - tier.totalSales} more sales`,
            required: required,
            current: tier.totalSales,
            remaining: required - tier.totalSales
        };
    }
    
    /**
     * Request tier upgrade
     * @param {string} affiliateId - Affiliate ID
     * @returns {Promise<Object>} - Upgrade result
     */
    async requestUpgrade(affiliateId = this.currentAffiliateId) {
        const canUpgrade = await this.canUpgrade(affiliateId);
        
        if (!canUpgrade.canUpgrade) {
            return { success: false, message: canUpgrade.reason };
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=upgradeTier&` +
                `affiliateId=${encodeURIComponent(affiliateId)}&` +
                `token=${encodeURIComponent(token)}&` +
                `_=${Date.now()}`
            );
            
            const data = await response.json();
            
            if (data.success) {
                // Clear cache
                this.clearCache();
                
                return {
                    success: true,
                    newTier: data.newTier,
                    message: `Congratulations! You've been upgraded to ${data.newTier}`
                };
            }
            
            return { success: false, message: data.message || 'Upgrade failed' };
        } catch (error) {
            console.error('Upgrade request failed:', error);
            return { success: false, message: 'Network error' };
        }
    }
    
    // ============================================
    // TIER CAPACITY
    // ============================================
    
    /**
     * Check capacity for a specific tier
     * @param {string} tierName - Tier name
     * @returns {Promise<Object>} - Capacity info
     */
    async checkTierCapacity(tierName) {
        const cacheKey = `capacity_${tierName}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=getCapacity&_=${Date.now()}`
            );
            const data = await response.json();
            
            if (data.success && data.capacity.tiers[tierName]) {
                const capacity = data.capacity.tiers[tierName];
                this.setCached(cacheKey, capacity, 60000); // 1 minute cache
                return capacity;
            }
            
            return { used: 0, limit: 0, available: 0 };
        } catch (error) {
            console.error('Failed to check tier capacity:', error);
            return { used: 0, limit: 0, available: 0 };
        }
    }
    
    /**
     * Get all tier capacities
     * @returns {Promise<Object>} - All tier capacities
     */
    async getAllTierCapacities() {
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=getCapacity&_=${Date.now()}`
            );
            const data = await response.json();
            
            if (data.success) {
                return data.capacity.tiers;
            }
            
            return {};
        } catch (error) {
            console.error('Failed to get tier capacities:', error);
            return {};
        }
    }
    
    /**
     * Get available tier for new signup
     * @returns {Promise<Object>} - Available tier info
     */
    async getAvailableTier() {
        const capacities = await this.getAllTierCapacities();
        
        for (const [tierName, capacity] of Object.entries(capacities)) {
            if (capacity.available > 0) {
                return {
                    tier: tierName,
                    info: CONFIG.TIERS[tierName],
                    capacity: capacity
                };
            }
        }
        
        return null;
    }
    
    // ============================================
    // PROGRESS CALCULATION
    // ============================================
    
    /**
     * Calculate progress to next tier
     * @param {number} currentSales - Current sales
     * @param {string} currentTier - Current tier
     * @returns {number} - Progress percentage
     */
    calculateProgress(currentSales, currentTier) {
        const tier = CONFIG.TIERS[currentTier];
        if (!tier || !tier.salesRequiredForUpgrade) return 100;
        
        return Math.min(100, (currentSales / tier.salesRequiredForUpgrade) * 100);
    }
    
    /**
     * Get next tier name
     * @param {string} currentTier - Current tier
     * @returns {string|null} - Next tier name
     */
    getNextTier(currentTier) {
        const tierOrder = ['NEWBIE', 'ACTIVE', 'PRO', 'ELITE'];
        const currentIndex = tierOrder.indexOf(currentTier);
        
        if (currentIndex >= 0 && currentIndex < tierOrder.length - 1) {
            return tierOrder[currentIndex + 1];
        }
        
        return null;
    }
    
    /**
     * Get tier badge HTML
     * @param {string} tier - Tier name
     * @returns {string} - HTML badge
     */
    getTierBadge(tier) {
        const tierInfo = CONFIG.TIERS[tier] || CONFIG.TIERS.NEWBIE;
        return `<span class="tier-badge tier-${tier.toLowerCase()}">${tierInfo.name}</span>`;
    }
    
    /**
     * Get tier color
     * @param {string} tier - Tier name
     * @returns {string} - Color code
     */
    getTierColor(tier) {
        const colors = {
            'NEWBIE': '#808080',
            'ACTIVE': '#FFD700',
            'PRO': '#FFF44F',
            'ELITE': '#28A745'
        };
        return colors[tier] || '#FFFFFF';
    }
    
    // ============================================
    // CACHE MANAGEMENT
    // ============================================
    
    /**
     * Get cached value
     * @param {string} key - Cache key
     * @returns {any|null} - Cached value
     */
    getCached(key) {
        if (this.cache.has(key)) {
            const { value, expiry } = this.cache.get(key);
            if (Date.now() < expiry) {
                return value;
            }
            this.cache.delete(key);
        }
        return null;
    }
    
    /**
     * Set cached value
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in ms
     */
    setCached(key, value, ttl = this.cacheTTL) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    /**
     * Add listener for tier updates
     * @param {Function} callback - Callback function
     */
    addListener(callback) {
        if (typeof callback === 'function') {
            this.updateCallbacks.push(callback);
        }
    }
    
    /**
     * Notify all listeners of tier update
     * @param {Object} tierData - Updated tier data
     */
    notifyListeners(tierData) {
        this.updateCallbacks.forEach(callback => {
            try {
                callback(tierData);
            } catch (error) {
                console.error('Tier listener error:', error);
            }
        });
    }
    
    // ============================================
    // UI UPDATES
    // ============================================
    
    /**
     * Update sidebar tier info
     */
    async updateSidebarInfo() {
        const tier = await this.getCurrentTier();
        if (!tier) return;
        
        const tierInfo = document.getElementById('tierInfo');
        if (!tierInfo) return;
        
        const progress = Math.round(tier.tierProgress);
        const nextTierText = tier.nextTier ? `→ ${tier.nextTier}` : 'Max Level';
        
        tierInfo.innerHTML = `
            <div class="tier-name" style="color: ${this.getTierColor(tier.tier)}">
                ${tier.tier}
            </div>
            <div class="tier-progress">
                ${progress}% to ${nextTierText}
            </div>
            <div class="capacity-used">
                ${tier.clicksToday}/${tier.clicksLimit} clicks today
            </div>
        `;
    }
}

// ============================================
// EXPORT
// ============================================

window.TierManager = TierManager;