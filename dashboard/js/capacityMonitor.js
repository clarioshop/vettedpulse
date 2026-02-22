/**
 * Real-time Capacity Monitoring System
 * Tracks system-wide and per-affiliate capacity usage
 */

class CapacityMonitor {
    constructor() {
        this.currentCapacity = null;
        this.listeners = [];
        this.warningThresholds = {
            clicks: 0.8, // 80%
            sales: 0.8,
            sessions: 0.8,
            tier: 0.9 // 90% for individual tiers
        };
        
        this.updateInterval = 60000; // Update every minute
        this.updateTimer = null;
        this.warningsShown = new Set();
        
        this.init();
    }
    
    /**
     * Initialize capacity monitor
     */
    init() {
        this.startMonitoring();
        console.log('CapacityMonitor initialized');
    }
    
    // ============================================
    // CAPACITY DATA
    // ============================================
    
    /**
     * Fetch current capacity from backend
     * @returns {Promise<Object>} - Capacity data
     */
    async fetchCapacity() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=${CONFIG.ENDPOINTS.getCapacity}&` +
                `token=${encodeURIComponent(token)}&` +
                `_=${Date.now()}`
            );
            
            const data = await response.json();
            
            if (data.success) {
                this.currentCapacity = data.capacity;
                this.notifyListeners();
                this.checkWarnings();
                return data.capacity;
            }
            
            return null;
        } catch (error) {
            console.error('Failed to fetch capacity:', error);
            return null;
        }
    }
    
    /**
     * Get current capacity (with cache)
     * @returns {Object|null} - Cached capacity data
     */
    getCurrentCapacity() {
        return this.currentCapacity;
    }
    
    /**
     * Get system status (online/offline/warning)
     * @returns {Object} - System status
     */
    getSystemStatus() {
        if (!this.currentCapacity) {
            return {
                status: 'unknown',
                color: 'gray',
                message: 'Loading system status...'
            };
        }
        
        const clickPercent = (this.currentCapacity.clicks.used / this.currentCapacity.clicks.limit) * 100;
        
        if (clickPercent > 95) {
            return {
                status: 'critical',
                color: 'red',
                message: '⚠️ System near capacity - New signups paused',
                percentage: clickPercent
            };
        } else if (clickPercent > 80) {
            return {
                status: 'warning',
                color: 'yellow',
                message: '⚡ High traffic - Performance may vary',
                percentage: clickPercent
            };
        } else {
            return {
                status: 'healthy',
                color: 'green',
                message: '✅ System operating normally',
                percentage: clickPercent
            };
        }
    }
    
    /**
     * Get remaining clicks for today (global)
     * @returns {number} - Remaining clicks
     */
    getRemainingClicks() {
        if (!this.currentCapacity) return CONFIG.CAPACITY.totalDailyClicks;
        return this.currentCapacity.clicks.remaining;
    }
    
    /**
     * Get remaining sales for today (global)
     * @returns {number} - Remaining sales
     */
    getRemainingSales() {
        if (!this.currentCapacity) return CONFIG.CAPACITY.totalDailySales;
        return this.currentCapacity.sales.remaining;
    }
    
    /**
     * Get tier capacity information
     * @param {string} tierName - Tier name
     * @returns {Object} - Tier capacity
     */
    getTierCapacity(tierName) {
        if (!this.currentCapacity || !this.currentCapacity.tiers[tierName]) {
            return { used: 0, limit: 0, available: 0, percentFull: 0 };
        }
        
        return this.currentCapacity.tiers[tierName];
    }
    
    /**
     * Check if new signups should be paused
     * @returns {boolean} - True if signups should pause
     */
    shouldPauseSignups() {
        if (!this.currentCapacity) return false;
        
        // Pause if any tier is 95% full
        for (const [tier, data] of Object.entries(this.currentCapacity.tiers)) {
            if (data.percentFull > 95) return true;
        }
        
        // Or if global click capacity is 90% used
        const clickPercent = (this.currentCapacity.clicks.used / this.currentCapacity.clicks.limit) * 100;
        return clickPercent > 90;
    }
    
    /**
     * Get recommended tier for new signup
     * @returns {string} - Recommended tier name
     */
    getRecommendedTier() {
        if (!this.currentCapacity) return 'NEWBIE';
        
        let bestTier = 'NEWBIE';
        let mostSpace = 0;
        
        for (const [tier, data] of Object.entries(this.currentCapacity.tiers)) {
            const space = data.available;
            if (space > mostSpace) {
                mostSpace = space;
                bestTier = tier;
            }
        }
        
        return bestTier;
    }
    
    // ============================================
    // WARNING SYSTEM
    // ============================================
    
    /**
     * Check for warning conditions
     */
    checkWarnings() {
        if (!this.currentCapacity) return;
        
        const warnings = [];
        
        // Check global click capacity
        const clickPercent = (this.currentCapacity.clicks.used / this.currentCapacity.clicks.limit) * 100;
        if (clickPercent > 80 && !this.warningsShown.has('clicks_80')) {
            warnings.push({
                type: 'clicks',
                severity: 'warning',
                message: `System at ${Math.round(clickPercent)}% of daily click capacity`,
                persistent: true
            });
            this.warningsShown.add('clicks_80');
        }
        
        if (clickPercent > 95 && !this.warningsShown.has('clicks_95')) {
            warnings.push({
                type: 'clicks',
                severity: 'critical',
                message: '⚠️ CRITICAL: System approaching maximum click capacity!',
                persistent: true
            });
            this.warningsShown.add('clicks_95');
        }
        
        // Check tier capacities
        for (const [tier, data] of Object.entries(this.currentCapacity.tiers)) {
            if (data.percentFull > 90 && !this.warningsShown.has(`tier_${tier}_90`)) {
                warnings.push({
                    type: 'tier',
                    tier: tier,
                    severity: 'warning',
                    message: `${tier} tier is ${Math.round(data.percentFull)}% full (${data.available} spots left)`,
                    persistent: false
                });
                this.warningsShown.add(`tier_${tier}_90`);
            }
            
            if (data.percentFull > 98 && !this.warningsShown.has(`tier_${tier}_98`)) {
                warnings.push({
                    type: 'tier',
                    tier: tier,
                    severity: 'critical',
                    message: `🔥 ${tier} tier nearly full! Only ${data.available} spots left!`,
                    persistent: true
                });
                this.warningsShown.add(`tier_${tier}_98`);
            }
        }
        
        // Display warnings
        if (warnings.length > 0) {
            this.displayWarnings(warnings);
        }
    }
    
    /**
     * Display warnings in UI
     * @param {Array} warnings - Warnings to display
     */
    displayWarnings(warnings) {
        const container = document.getElementById('capacityWarnings');
        if (!container) return;
        
        warnings.forEach(warning => {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${warning.severity === 'critical' ? 'error' : 'warning'} slide-in`;
            alertDiv.innerHTML = `
                <strong>${warning.message}</strong>
                ${warning.persistent ? '' : '<br><small>Click to dismiss</small>'}
            `;
            
            if (!warning.persistent) {
                alertDiv.style.cursor = 'pointer';
                alertDiv.onclick = () => alertDiv.remove();
            }
            
            container.appendChild(alertDiv);
            
            // Auto-remove non-persistent after 10 seconds
            if (!warning.persistent) {
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.remove();
                    }
                }, 10000);
            }
        });
    }
    
    /**
     * Reset warnings (call after major changes)
     */
    resetWarnings() {
        this.warningsShown.clear();
    }
    
    // ============================================
    // MONITORING CONTROL
    // ============================================
    
    /**
     * Start real-time monitoring
     */
    startMonitoring() {
        // Initial fetch
        this.fetchCapacity();
        
        // Set up periodic updates
        this.updateTimer = setInterval(() => {
            this.fetchCapacity();
        }, this.updateInterval);
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    /**
     * Force immediate update
     */
    async forceUpdate() {
        await this.fetchCapacity();
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    /**
     * Add listener for capacity updates
     * @param {Function} callback - Callback function
     */
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }
    
    /**
     * Notify all listeners of capacity update
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.currentCapacity);
            } catch (error) {
                console.error('Capacity listener error:', error);
            }
        });
    }
    
    // ============================================
    // UI UPDATES
    // ============================================
    
    /**
     * Update capacity display in UI
     */
    updateUIDisplay() {
        const status = this.getSystemStatus();
        
        // Update status indicator
        const statusBar = document.getElementById('systemStatus');
        if (statusBar) {
            statusBar.className = `system-status-bar status-${status.color}`;
            statusBar.innerHTML = `
                <span class="status-indicator ${status.color}"></span>
                <span>${status.message}</span>
            `;
        }
        
        // Update capacity bars
        if (this.currentCapacity) {
            // Click capacity bar
            const clickBar = document.getElementById('clickCapacityBar');
            if (clickBar) {
                const percent = (this.currentCapacity.clicks.used / this.currentCapacity.clicks.limit) * 100;
                clickBar.style.width = `${percent}%`;
                clickBar.className = `capacity-fill ${percent > 80 ? 'warning' : ''}`;
            }
            
            // Tier capacity displays
            for (const [tier, data] of Object.entries(this.currentCapacity.tiers)) {
                const tierBar = document.getElementById(`tierBar_${tier}`);
                if (tierBar) {
                    tierBar.style.width = `${data.percentFull}%`;
                }
                
                const tierCount = document.getElementById(`tierCount_${tier}`);
                if (tierCount) {
                    tierCount.textContent = `${data.used}/${data.limit}`;
                }
            }
        }
    }
    
    /**
     * Format capacity for display
     * @param {number} used - Used amount
     * @param {number} limit - Limit amount
     * @returns {string} - Formatted string
     */
    formatCapacity(used, limit) {
        const percent = Math.round((used / limit) * 100);
        return `${used}/${limit} (${percent}%)`;
    }
}

// ============================================
// EXPORT
// ============================================

window.CapacityMonitor = CapacityMonitor;