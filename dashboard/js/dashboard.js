/**
 * Main Dashboard Module
 * Handles all dashboard functionality, data loading, and UI updates
 */

class Dashboard {
    constructor() {
        this.token = localStorage.getItem('token');
        this.affiliateId = localStorage.getItem('affiliateID');
        this.tierManager = new TierManager();
        this.capacityMonitor = new CapacityMonitor();
        
        this.init();
    }
    
    /**
     * Initialize dashboard
     */
    async init() {
        // Validate session first
        if (!await this.validateSession()) {
            return;
        }
        
        // Initialize components
        await this.loadInitialData();
        this.setupEventListeners();
        this.startRealTimeUpdates();
        this.updateUI();
        
        console.log('Dashboard initialized');
    }
    
    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    
    /**
     * Validate current session
     * @returns {Promise<boolean>} - True if valid
     */
    async validateSession() {
        if (!this.token || !this.affiliateId) {
            this.redirectToLogin();
            return false;
        }
        
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=${CONFIG.ENDPOINTS.validateSession}&` +
                `token=${encodeURIComponent(this.token)}&_=${Date.now()}`
            );
            
            const data = await response.json();
            
            if (!data.valid) {
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Session validation failed:', error);
            return false;
        }
    }
    
    /**
     * Redirect to login page
     */
    redirectToLogin() {
        window.location.href = '/login.html';
    }
    
    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('affiliateID');
        localStorage.removeItem('sessionStart');
        localStorage.removeItem('tier');
        this.redirectToLogin();
    }
    
    // ============================================
    // DATA LOADING
    // ============================================
    
    /**
     * Load initial dashboard data
     */
    async loadInitialData() {
        const path = window.location.pathname;
        
        if (path.includes('/dashboard/')) {
            if (path.endsWith('products.html')) {
                await this.loadProducts();
            } else if (path.endsWith('leaderboard.html')) {
                await this.loadLeaderboard();
            } else if (path.endsWith('settings.html')) {
                await this.loadSettings();
            } else {
                await this.loadOverview();
            }
        }
        
        // Always load tier info
        await this.tierManager.updateSidebarInfo();
    }
    
    /**
     * Load overview dashboard data
     */
    async loadOverview() {
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=${CONFIG.ENDPOINTS.getDashboard}&` +
                `token=${encodeURIComponent(this.token)}&_=${Date.now()}`
            );
            
            const data = await response.json();
            
            if (data.success) {
                this.updateOverviewStats(data);
                await this.loadRecentActivity();
            } else {
                this.showError('Failed to load dashboard data');
            }
        } catch (error) {
            console.error('Error loading overview:', error);
            this.showError('Network error loading dashboard');
        }
    }
    
    /**
     * Load products page data
     */
    async loadProducts() {
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=${CONFIG.ENDPOINTS.getProducts}&` +
                `token=${encodeURIComponent(this.token)}&_=${Date.now()}`
            );
            
            const data = await response.json();
            
            if (data.success) {
                this.renderProducts(data.products);
            } else {
                this.showError('Failed to load products');
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Network error loading products');
        }
    }
    
    /**
     * Load leaderboard data
     */
    async loadLeaderboard() {
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=${CONFIG.ENDPOINTS.getLeaderboard}&` +
                `token=${encodeURIComponent(this.token)}&_=${Date.now()}`
            );
            
            const data = await response.json();
            
            if (data.success) {
                this.renderLeaderboard(data.leaderboard, data.totalAffiliates);
            } else {
                this.showError('Failed to load leaderboard');
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.showError('Network error loading leaderboard');
        }
    }
    
    /**
     * Load settings page data
     */
    async loadSettings() {
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=${CONFIG.ENDPOINTS.getDashboard}&` +
                `token=${encodeURIComponent(this.token)}&_=${Date.now()}`
            );
            
            const data = await response.json();
            
            if (data.success) {
                this.populateSettings(data);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError('Failed to load settings');
        }
    }
    
    /**
     * Load recent activity
     */
    async loadRecentActivity() {
        // This would fetch from backend - for now use placeholder
        const activityList = document.getElementById('recentActivity');
        if (!activityList) return;
        
        // Simulate activity data
        const activities = [
            { type: 'click', product: 'Advanced Marketing Guide', time: '2 hours ago', icon: '🔗' },
            { type: 'sale', product: 'SEO Mastery', amount: 49, time: '1 day ago', icon: '💰' },
            { type: 'click', product: 'Social Media Toolkit', time: '1 day ago', icon: '🔗' },
            { type: 'upgrade', from: 'Newbie', to: 'Active', time: '3 days ago', icon: '⬆️' }
        ];
        
        activityList.innerHTML = activities.map(a => `
            <div class="activity-item">
                <div class="activity-icon">${a.icon}</div>
                <div>
                    ${a.type === 'click' ? `Clicked: ${a.product}` : ''}
                    ${a.type === 'sale' ? `Sale: $${a.amount} commission - ${a.product}` : ''}
                    ${a.type === 'upgrade' ? `Upgraded from ${a.from} to ${a.to}` : ''}
                </div>
                <div style="margin-left: auto; color: var(--gray-500); font-size: 0.875rem;">
                    ${a.time}
                </div>
            </div>
        `).join('');
    }
    
    // ============================================
    // UI UPDATES
    // ============================================
    
    /**
     * Update overview statistics
     * @param {Object} data - Dashboard data
     */
    updateOverviewStats(data) {
        document.getElementById('totalClicks').textContent = data.totalClicks || 0;
        document.getElementById('totalSales').textContent = data.totalSales || 0;
        document.getElementById('commissionRate').textContent = (data.commissionTier || 0) + '%';
        document.getElementById('lifetimeCommission').textContent = '$' + (data.lifetimeCommission || 0);
        
        document.getElementById('clicksToday').textContent = data.clicksToday || 0;
        document.getElementById('clicksRemaining').textContent = data.clicksRemaining || 0;
        document.getElementById('salesToday').textContent = data.salesToday || 0;
        document.getElementById('conversionRate').textContent = (data.conversionRate || 0) + '%';
        
        // Update tier display
        document.getElementById('currentTier').textContent = data.level || 'Newbie';
        document.getElementById('nextTier').textContent = data.nextTier ? `→ ${data.nextTier}` : '';
        document.getElementById('tierProgress').style.width = `${data.tierProgress || 0}%`;
        document.getElementById('currentSales').textContent = data.totalSales || 0;
        document.getElementById('nextRequirement').textContent = 
            data.nextTier ? `${data.nextTier} (${data.totalSales}/${data.tierInfo?.salesRequiredForUpgrade || 0})` : 'Max Level';
        
        // Update click capacity bar
        const clickPercent = (data.clicksToday / (data.tierInfo?.perAffiliateClickLimit || 1)) * 100;
        document.getElementById('clickCapacityBar').style.width = `${Math.min(100, clickPercent)}%`;
    }
    
    /**
     * Render products grid
     * @param {Array} products - Products to render
     */
    renderProducts(products) {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        if (!products || products.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No products available</p>';
            return;
        }
        
        container.innerHTML = products.map(product => {
            const affiliateLink = `${CONFIG.SITE_URL}/click?id=${this.affiliateId}&prod=${product.productID}`;
            
            return `
                <div class="product-card">
                    <h3>${Sanitizer.escapeHtml(product.name)}</h3>
                    <p class="text-muted">${Sanitizer.escapeHtml(product.description || '')}</p>
                    <div class="product-commission">
                        $${product.yourCommission || product.baseCommission} commission
                        ${product.multiplier > 1 ? `<span class="product-multiplier">${product.multiplier}x</span>` : ''}
                    </div>
                    <div class="product-link-container">
                        <input type="text" class="product-link" value="${affiliateLink}" readonly>
                        <button class="copy-btn" onclick="copyToClipboard('${affiliateLink}', this)">Copy</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Render leaderboard
     * @param {Array} leaderboard - Leaderboard data
     * @param {number} total - Total affiliates
     */
    renderLeaderboard(leaderboard, total) {
        const tbody = document.getElementById('leaderboardBody');
        if (!tbody) return;
        
        if (!leaderboard || leaderboard.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-muted text-center">No data available</td></tr>';
            return;
        }
        
        // Update stats
        const yourEntry = leaderboard.find(e => e.isCurrentUser);
        document.getElementById('yourRank').textContent = yourEntry ? `#${yourEntry.rank}` : '-';
        document.getElementById('yourPulseScore').textContent = yourEntry ? yourEntry.pulseScore : '-';
        document.getElementById('totalAffiliates').textContent = total || leaderboard.length;
        document.getElementById('topPerformer').textContent = leaderboard[0]?.affiliateID || '-';
        
        tbody.innerHTML = leaderboard.map((entry, index) => {
            const rank = index + 1;
            let rankClass = '';
            let rankDisplay = `#${rank}`;
            
            if (rank === 1) {
                rankClass = 'rank-1';
                rankDisplay = '<span class="medal">🥇</span> #1';
            } else if (rank === 2) {
                rankClass = 'rank-2';
                rankDisplay = '<span class="medal">🥈</span> #2';
            } else if (rank === 3) {
                rankClass = 'rank-3';
                rankDisplay = '<span class="medal">🥉</span> #3';
            }
            
            return `
                <tr class="${entry.isCurrentUser ? 'current-user-row' : ''} ${rankClass}">
                    <td>${rankDisplay}</td>
                    <td>${Sanitizer.escapeHtml(entry.affiliateID)}</td>
                    <td><span class="tier-badge tier-${entry.level.toLowerCase()}">${entry.level}</span></td>
                    <td>${entry.totalSales}</td>
                    <td>$${entry.totalCommission}</td>
                    <td class="pulse-score">${entry.pulseScore}</td>
                </tr>
            `;
        }).join('');
        
        // Add filter functionality
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterLeaderboard(e.target.dataset.tier);
            });
        });
    }
    
    /**
     * Filter leaderboard by tier
     * @param {string} tier - Tier to filter by
     */
    filterLeaderboard(tier) {
        const rows = document.querySelectorAll('#leaderboardBody tr');
        
        rows.forEach(row => {
            if (tier === 'all') {
                row.style.display = '';
            } else {
                const tierCell = row.querySelector('td:nth-child(3) span');
                if (tierCell && tierCell.textContent === tier) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    }
    
    /**
     * Populate settings form
     * @param {Object} data - User data
     */
    populateSettings(data) {
        document.getElementById('affiliateID').textContent = this.affiliateId;
        document.getElementById('updateName').value = data.name || '';
        document.getElementById('updateEmail').value = data.email || '';
        document.getElementById('currentTier').textContent = data.level || 'Newbie';
        document.getElementById('commissionMultiplier').textContent = 
            (CONFIG.TIERS[data.level]?.commissionMultiplier || 1.0) + 'x';
        document.getElementById('clickLimit').textContent = 
            CONFIG.TIERS[data.level]?.perAffiliateClickLimit || 5;
        document.getElementById('memberSince').textContent = 
            data.joinedDate ? new Date(data.joinedDate).toLocaleDateString() : '-';
        
        // Referral link
        const referralLink = `${CONFIG.SITE_URL}/signup.html?ref=${this.affiliateId}`;
        document.getElementById('referralLink').textContent = referralLink;
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Profile update form
        const updateForm = document.getElementById('updateProfileForm');
        if (updateForm) {
            updateForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }
        
        // Password change form
        const passwordForm = document.getElementById('changePasswordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }
    }
    
    /**
     * Handle profile update
     * @param {Event} e - Form submit event
     */
    async handleProfileUpdate(e) {
        e.preventDefault();
        
        const name = document.getElementById('updateName').value;
        const email = document.getElementById('updateEmail').value;
        
        // Validate
        if (!Validator.isValidName(name)) {
            this.showError('Please enter a valid name');
            return;
        }
        
        if (!Validator.isEmail(email)) {
            this.showError('Please enter a valid email');
            return;
        }
        
        this.showAlert('info', 'Updating profile...');
        
        // Simulate update (implement actual API call)
        setTimeout(() => {
            this.showAlert('success', 'Profile updated successfully!');
        }, 1000);
    }
    
    /**
     * Handle password change
     * @param {Event} e - Form submit event
     */
    async handlePasswordChange(e) {
        e.preventDefault();
        
        const current = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        
        // Validate
        if (newPass !== confirm) {
            this.showError('New passwords do not match');
            return;
        }
        
        const passwordCheck = Validator.isStrongPassword(newPass);
        if (!passwordCheck.valid) {
            this.showError(passwordCheck.reason);
            return;
        }
        
        this.showAlert('info', 'Changing password...');
        
        // Simulate change (implement actual API call)
        setTimeout(() => {
            this.showAlert('success', 'Password changed successfully!');
            document.getElementById('changePasswordForm').reset();
        }, 1000);
    }
    
    // ============================================
    // UTILITIES
    // ============================================
    
    /**
     * Update UI elements
     */
    updateUI() {
        // Set current date
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }
    
    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        // Update every minute
        setInterval(async () => {
            if (window.location.pathname.includes('/dashboard/')) {
                await this.tierManager.updateSidebarInfo();
            }
        }, 60000);
    }
    
    /**
     * Show alert message
     * @param {string} type - Alert type
     * @param {string} message - Message
     */
    showAlert(type, message) {
        const container = document.getElementById('alertContainer');
        if (!container) return;
        
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-error' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';
        
        container.innerHTML = `
            <div class="alert ${alertClass} slide-in">
                ${Sanitizer.escapeHtml(message)}
            </div>
        `;
        
        if (type === 'success') {
            setTimeout(() => {
                container.innerHTML = '';
            }, 5000);
        }
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showAlert('error', message);
    }
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

/**
 * Copy to clipboard
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - Button element
 */
window.copyToClipboard = async (text, button) => {
    try {
        await navigator.clipboard.writeText(text);
        
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    }
};

/**
 * Copy affiliate ID
 */
window.copyAffiliateID = () => {
    const id = document.getElementById('affiliateID')?.textContent;
    if (id) {
        navigator.clipboard.writeText(id);
        alert('Affiliate ID copied!');
    }
};

/**
 * Copy referral link
 */
window.copyReferralLink = () => {
    const link = document.getElementById('referralLink')?.textContent;
    if (link) {
        navigator.clipboard.writeText(link);
        alert('Referral link copied!');
    }
};

/**
 * Export data
 */
window.exportData = () => {
    alert('Data export feature coming soon!');
};

/**
 * Confirm account deactivation
 */
window.confirmDeactivate = () => {
    if (confirm('Are you sure you want to deactivate your account? This action can be undone within 30 days.')) {
        alert('Account deactivation requested. Check your email for confirmation.');
    }
};

/**
 * Logout
 */
window.logout = () => {
    if (window.dashboard) {
        window.dashboard.logout();
    }
};

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});