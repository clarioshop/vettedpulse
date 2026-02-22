/**
 * VettedPulse Main JavaScript
 * Handles landing page interactions, animations, and dynamic content
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    console.log('VettedPulse: Landing page loaded');
    
    // Initialize all modules
    initSmoothScroll();
    initStatsCounter();
    loadTierData();
    loadSystemStats();
    initMobileMenu();
    
    // ============================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ============================================
    
    function initSmoothScroll() {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Update URL without page jump
                    history.pushState(null, null, targetId);
                }
            });
        });
    }
    
    // ============================================
    // STATS COUNTER ANIMATION
    // ============================================
    
    function initStatsCounter() {
        const stats = document.querySelectorAll('.stat-number');
        if (stats.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateValue(entry.target, 0, parseInt(entry.target.textContent) || 0, 2000);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        stats.forEach(stat => observer.observe(stat));
    }
    
    function animateValue(element, start, end, duration) {
        if (isNaN(end) || end === 0) {
            element.textContent = '0';
            return;
        }
        
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            
            if (current >= end) {
                element.textContent = formatNumber(end);
                clearInterval(timer);
            } else {
                element.textContent = formatNumber(Math.floor(current));
            }
        }, 16);
    }
    
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    // ============================================
    // LOAD TIER DATA FROM CONFIG
    // ============================================
    
    function loadTierData() {
        const tierGrid = document.getElementById('tierGrid');
        if (!tierGrid) return;
        
        const tiers = CONFIG.TIERS;
        let html = '';
        
        Object.entries(tiers).forEach(([key, tier]) => {
            const spotsLeft = Math.floor(Math.random() * tier.maxAffiliates * 0.3); // Demo only
            const isHot = key === 'ELITE' && spotsLeft < 10;
            
            html += `
                <div class="tier-card" style="border-color: ${tier.color}">
                    <div class="tier-name" style="color: ${tier.color}">${tier.name}</div>
                    <div class="tier-capacity">${tier.maxAffiliates} spots available</div>
                    <div class="tier-price">${tier.monthlyFee === 0 ? 'Free' : '$' + tier.monthlyFee + '<span style="font-size: 1rem; color: var(--gray-500);">/mo</span>'}</div>
                    <ul class="tier-features">
                        ${tier.features.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                    <div class="tier-spots" style="color: ${isHot ? 'var(--alert-red)' : 'inherit'}">
                        ${isHot ? '🔥 ONLY ' + spotsLeft + ' SPOTS LEFT!' : spotsLeft + ' spots left'}
                    </div>
                </div>
            `;
        });
        
        tierGrid.innerHTML = html;
    }
    
    // ============================================
    // LOAD SYSTEM STATS FROM BACKEND
    // ============================================
    
    async function loadSystemStats() {
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=getCapacity&_=${Date.now()}`
            );
            const data = await response.json();
            
            if (data.success) {
                updateStatsDisplay(data.capacity);
                updateCapacityBadge(data.capacity);
            }
        } catch (error) {
            console.error('Failed to load system stats:', error);
            // Use fallback data
            updateStatsDisplay({
                clicks: { used: 3247, limit: 5000 },
                tiers: {
                    NEWBIE: { used: 1847, limit: 2000 },
                    ACTIVE: { used: 312, limit: 400 },
                    PRO: { used: 78, limit: 90 },
                    ELITE: { used: 7, limit: 10 }
                }
            });
        }
    }
    
    function updateStatsDisplay(capacity) {
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid) return;
        
        const totalAffiliates = Object.values(capacity.tiers)
            .reduce((sum, tier) => sum + tier.used, 0);
        
        const clickPercent = Math.round((capacity.clicks.used / capacity.clicks.limit) * 100);
        const monthlyCommissions = Math.round(capacity.clicks.used * 25); // Estimate
        
        statsGrid.innerHTML = `
            <div>
                <div class="stat-number">${totalAffiliates.toLocaleString()}</div>
                <div class="stat-label">Total Affiliates</div>
            </div>
            <div>
                <div class="stat-number">${capacity.clicks.used.toLocaleString()}</div>
                <div class="stat-label">Today's Clicks</div>
                <div style="font-size: 0.8rem; color: var(--gray-600);">${clickPercent}% of capacity</div>
            </div>
            <div>
                <div class="stat-number">$${(monthlyCommissions / 1000).toFixed(1)}K</div>
                <div class="stat-label">Monthly Commissions</div>
            </div>
            <div>
                <div class="stat-number">98%</div>
                <div class="stat-label">Payout Rate</div>
            </div>
        `;
    }
    
    function updateCapacityBadge(capacity) {
        const badge = document.getElementById('capacityBadge');
        if (!badge) return;
        
        const totalAffiliates = Object.values(capacity.tiers)
            .reduce((sum, tier) => sum + tier.used, 0);
        
        const remaining = CONFIG.CAPACITY.maxAffiliatesTotal - totalAffiliates;
        
        if (remaining < 100) {
            badge.innerHTML = `🔥 ONLY ${remaining} SPOTS LEFT!`;
            badge.style.background = 'rgba(255, 65, 54, 0.2)';
            badge.style.borderColor = 'var(--alert-red)';
            badge.style.color = 'var(--alert-red)';
            badge.style.animation = 'pulse 2s infinite';
        } else {
            badge.innerHTML = `⚡ ${remaining} Elite Spots Remaining`;
            badge.style.background = 'rgba(255, 215, 0, 0.1)';
            badge.style.borderColor = 'var(--heading-yellow)';
            badge.style.color = 'var(--heading-yellow)';
            badge.style.animation = 'none';
        }
    }
    
    // ============================================
    // MOBILE MENU HANDLING
    // ============================================
    
    function initMobileMenu() {
        const navbar = document.querySelector('.navbar');
        const navLinks = document.querySelector('.nav-links');
        
        if (!navbar || !navLinks) return;
        
        // Create mobile menu button
        const menuButton = document.createElement('button');
        menuButton.className = 'btn btn-outline mobile-menu-btn';
        menuButton.innerHTML = '☰';
        menuButton.style.display = 'none';
        menuButton.style.fontSize = '1.5rem';
        menuButton.style.padding = '0.5rem 1rem';
        
        navbar.querySelector('.container').appendChild(menuButton);
        
        // Check if mobile
        function checkMobile() {
            if (window.innerWidth <= 768) {
                menuButton.style.display = 'block';
                navLinks.style.display = 'none';
            } else {
                menuButton.style.display = 'none';
                navLinks.style.display = 'flex';
            }
        }
        
        checkMobile();
        
        menuButton.addEventListener('click', () => {
            if (navLinks.style.display === 'none') {
                navLinks.style.display = 'flex';
                navLinks.style.flexDirection = 'column';
                navLinks.style.width = '100%';
                navLinks.style.padding = '1rem 0';
                menuButton.innerHTML = '✕';
            } else {
                navLinks.style.display = 'none';
                menuButton.innerHTML = '☰';
            }
        });
        
        window.addEventListener('resize', checkMobile);
    }
    
    // ============================================
    // PARSE URL PARAMETERS
    // ============================================
    
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        
        for (const [key, value] of params) {
            result[key] = value;
        }
        
        return result;
    }
    
    // Check for referral parameter
    const urlParams = getUrlParams();
    if (urlParams.ref) {
        localStorage.setItem('referral', urlParams.ref);
        console.log('Referral code saved:', urlParams.ref);
    }
    
    // ============================================
    // ERROR HANDLING
    // ============================================
    
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error);
        
        // Show user-friendly message for critical errors
        if (e.filename.includes('main.js')) {
            const alertContainer = document.getElementById('alertContainer');
            if (alertContainer) {
                alertContainer.innerHTML = `
                    <div class="alert alert-error">
                        Something went wrong. Please refresh the page.
                    </div>
                `;
            }
        }
    });
    
    // ============================================
    // PERFORMANCE MARKERS
    // ============================================
    
    if (CONFIG.DEBUG) {
        performance.mark('main-loaded');
        console.log('Load time:', 
            performance.now().toFixed(0), 'ms');
    }
});

// ============================================
// UTILITY FUNCTIONS (GLOBAL)
// ============================================

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - success|error|info|warning
 */
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} slide-in`;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.maxWidth = '300px';
    toast.style.zIndex = '9999';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
window.copyToClipboard = async function(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy', 'error');
        return false;
    }
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency
 */
window.formatCurrency = function(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
window.formatNumber = function(num) {
    return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Debounce function for performance
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};