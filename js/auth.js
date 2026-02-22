/**
 * VettedPulse Authentication Module
 * Handles signup, login, verification, and session management
 */
// ===== BAN NETFLIX URL =====
const originalFetch = window.fetch;
window.fetch = function(url, ...args) {
    if (typeof url === 'string' && url.includes('sparkling-boba')) {
        console.log('🚫 Blocked request to:', url);
        return Promise.reject('Blocked by VettedPulse');
    }
    return originalFetch.call(this, url, ...args);
};
// ===========================

// ===== DEBUG: Find what's loading config.json =====
console.log('🔍 All scripts on page:');
document.querySelectorAll('script').forEach(script => {
    if (script.src) {
        console.log('  📜 Script:', script.src);
    } else if (script.textContent.includes('config.json')) {
        console.log('  ⚠️ Inline script contains config.json:', script.textContent.substring(0, 100));
    }
});

// Monitor all network requests
const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
        if (entry.name.includes('config.json')) {
            console.log('🚨 config.json requested by:', entry.initiatorType, entry.name);
            console.trace('Trace:');
        }
    });
});
observer.observe({ entryTypes: ['resource'] });
// ===== DEBUG: Track all network requests =====
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('🌐 FETCH REQUEST:', args[0]);
    return originalFetch.apply(this, args);
};

console.log('🔍 DEBUG: Auth.js loaded');
console.log('🔍 Current origin:', window.location.origin);
console.log('🔍 APPS_SCRIPT_URL:', CONFIG?.APPS_SCRIPT_URL || 'CONFIG not loaded yet');

class Auth {
    constructor() {
        this.loginAttempts = new Map();
        this.pendingEmail = null;
        this.systemStatus = 'ONLINE';
        this.verificationTimer = null;
        
        this.init();
    }
    
    /**
     * Initialize authentication module
     */
    init() {
        // Check system status
        this.checkSystemStatus();
        
        // Check for existing session
        this.validateExistingSession();
        
        // Bind form handlers
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
            this.loadTierOptions();
        }
        
        const verificationForm = document.getElementById('verificationForm');
        if (verificationForm) {
            verificationForm.addEventListener('submit', (e) => this.handleVerification(e));
        }
        
        const resendLink = document.getElementById('resendCode');
        if (resendLink) {
            resendLink.addEventListener('click', (e) => this.resendVerification(e));
        }
        
        // Start periodic system status checks
        setInterval(() => this.checkSystemStatus(), CONFIG.SYSTEM_CHECK.INTERVAL);
        
        console.log('Auth module initialized');
    }
    
    // ============================================
    // SYSTEM STATUS
    // ============================================
    
    /**
     * Check system status (kill-switch)
     * @returns {Promise<boolean>} - True if system is online
     */
    async checkSystemStatus() {
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=${CONFIG.ENDPOINTS.getSystemStatus}&_=${Date.now()}`
            );
            const data = await response.json();
            
            this.systemStatus = data.status;
            
            if (data.status !== 'ONLINE') {
                this.showSystemOffline(data);
                return false;
            }
            
            return true;
        } catch (error) {
            console.warn('System status check failed:', error);
            return true; // Assume online if check fails
        }
    }
    
    /**
     * Show system offline message
     * @param {Object} data - System status data
     */
    showSystemOffline(data) {
        const alertContainer = document.getElementById('systemStatusAlert');
        if (!alertContainer) return;
        
        const eta = data.eta ? new Date(data.eta).toLocaleString() : 'unknown';
        
        alertContainer.innerHTML = `
            <div class="alert alert-error">
                <strong>🚨 System Offline</strong><br>
                ${data.reason || 'Scheduled maintenance'}<br>
                <small>Expected back: ${eta}</small>
                <br><small>Redirecting in 5 seconds...</small>
            </div>
        `;
        
        setTimeout(() => {
            window.location.href = CONFIG.SYSTEM_CHECK.OFFLINE_PAGE;
        }, 5000);
    }
    
    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    
    /**
     * Validate existing session
     * @returns {Promise<boolean>}
     */
    async validateExistingSession() {
        const token = localStorage.getItem('token');
        const affiliateId = localStorage.getItem('affiliateID');
        
        if (!token || !affiliateId) return false;
        
        // Check session age
        const sessionStart = localStorage.getItem('sessionStart');
        if (sessionStart) {
            const age = Date.now() - parseInt(sessionStart);
            if (age > CONFIG.SECURITY.sessionHours * 60 * 60 * 1000) {
                this.logout();
                return false;
            }
        }
        
        try {
            const response = await fetch(
                `${CONFIG.APPS_SCRIPT_URL}?action=${CONFIG.ENDPOINTS.validateSession}&token=${encodeURIComponent(token)}`
            );
            const data = await response.json();
            
            if (!data.valid) {
                this.logout();
                return false;
            }
            
            // Redirect to dashboard if on auth pages
            if (window.location.pathname.includes('login') || 
                window.location.pathname.includes('signup')) {
                window.location.href = '/dashboard/';
            }
            
            return true;
        } catch (error) {
            console.error('Session validation failed:', error);
            return false;
        }
    }
    
    /**
     * Logout user
     */
    async logout() {
        const token = localStorage.getItem('token');
        
        if (token) {
            try {
                await fetch(
                    `${CONFIG.APPS_SCRIPT_URL}?action=${CONFIG.ENDPOINTS.logout}&token=${encodeURIComponent(token)}`
                );
            } catch (error) {
                console.error('Logout API call failed:', error);
            }
        }
        
        localStorage.removeItem('token');
        localStorage.removeItem('affiliateID');
        localStorage.removeItem('sessionStart');
        localStorage.removeItem('tier');
        
        window.location.href = '/login.html';
    }
    
    // ============================================
    // RATE LIMITING
    // ============================================
    
    /**
     * Check rate limit for login attempts
     * @param {string} email - User email
     * @returns {boolean}
     */
    checkRateLimit(email) {
        const now = Date.now();
        const attempts = this.loginAttempts.get(email) || [];
        
        // Clean old attempts
        const recentAttempts = attempts.filter(
            timestamp => now - timestamp < CONFIG.SECURITY.rateLimitWindow
        );
        
        this.loginAttempts.set(email, recentAttempts);
        
        return recentAttempts.length < CONFIG.SECURITY.maxLoginAttempts;
    }
    
    /**
     * Record login attempt
     * @param {string} email - User email
     */
    recordLoginAttempt(email) {
        const attempts = this.loginAttempts.get(email) || [];
        attempts.push(Date.now());
        this.loginAttempts.set(email, attempts);
    }
    
    // ============================================
    // LOGIN
    // ============================================
    
    /**
     * Handle login form submission
     * @param {Event} e - Form submit event
     */
    async handleLogin(e) {
        e.preventDefault();
        
        // Check system status
        if (!await this.checkSystemStatus()) return;
        
        const email = Sanitizer.sanitizeEmail(document.getElementById('email').value);
        const password = document.getElementById('password').value;
        
        // Validate email
        if (!Validator.isEmail(email)) {
            this.showAlert('error', 'Please enter a valid email address');
            return;
        }
        
        // Rate limiting check
        if (!this.checkRateLimit(email)) {
            this.showAlert('error', `Too many login attempts. Please wait ${CONFIG.SECURITY.loginLockoutMinutes} minutes.`);
            return;
        }
        
        this.showAlert('info', 'Authenticating...');
        
        try {
            // Get real client data
            const clientData = await ClientData.getClientData();
            
            // Build URL with real IP
            const url = new URL(CONFIG.APPS_SCRIPT_URL);
            url.searchParams.append('action', CONFIG.ENDPOINTS.login);
            url.searchParams.append('email', email);
            url.searchParams.append('password', this.hashPassword(password));
            url.searchParams.append('ip', clientData.ip);
            url.searchParams.append('ua', clientData.ua);
            url.searchParams.append('_', Date.now());
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                // Clear rate limiting on success
                this.loginAttempts.delete(email);
                
                // Store session
                localStorage.setItem('token', data.token);
                localStorage.setItem('affiliateID', data.affiliateID);
                localStorage.setItem('tier', data.tier);
                localStorage.setItem('sessionStart', Date.now().toString());
                
                this.showAlert('success', 'Login successful! Redirecting...');
                
                setTimeout(() => {
                    window.location.href = '/dashboard/';
                }, 1500);
            } else {
                this.recordLoginAttempt(email);
                this.showAlert('error', data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('error', 'Network error. Please try again.');
        }
    }
    
    // ============================================
    // SIGNUP
    // ============================================
    
    /**
     * Load tier options into signup form
     */
    loadTierOptions() {
        const tierOptions = document.getElementById('tierOptions');
        if (!tierOptions) return;
        
        let html = '';
        
        Object.entries(CONFIG.TIERS).forEach(([key, tier]) => {
            html += `
                <label class="tier-option">
                    <input type="radio" name="tier" value="${key}" ${key === 'NEWBIE' ? 'checked' : ''}>
                    <span class="tier-name" style="color: ${tier.color}">${tier.name}</span>
                    <span class="tier-price">${tier.monthlyFee === 0 ? 'Free' : '$' + tier.monthlyFee + '/mo'}</span>
                    <span class="tier-spots">${tier.maxAffiliates} spots</span>
                </label>
            `;
        });
        
        tierOptions.innerHTML = html;
    }
    
    /**
     * Handle signup form submission
     * @param {Event} e - Form submit event
     */
    async handleSignup(e) {
        e.preventDefault();
        
        // Check system status
        if (!await this.checkSystemStatus()) return;
        
        const name = document.getElementById('name').value.trim();
        const email = Sanitizer.sanitizeEmail(document.getElementById('email').value);
        const password = document.getElementById('password').value;
        const selectedTier = document.querySelector('input[name="tier"]:checked')?.value || 'NEWBIE';
        
        // Validate inputs
        if (!Validator.isValidName(name)) {
            this.showAlert('error', 'Please enter a valid name (letters, spaces, hyphens only)');
            return;
        }
        
        if (!Validator.isEmail(email)) {
            this.showAlert('error', 'Please enter a valid email address');
            return;
        }
        
        const passwordCheck = Validator.isStrongPassword(password);
        if (!passwordCheck.valid) {
            this.showAlert('error', `Password too weak: ${passwordCheck.reason}`);
            return;
        }
        
        this.showAlert('info', 'Creating your account...');
        
        try {
            // Get real client data
            const clientData = await ClientData.getClientData();
            
            // Build URL
            const url = new URL(CONFIG.APPS_SCRIPT_URL);
            url.searchParams.append('action', CONFIG.ENDPOINTS.signup);
            url.searchParams.append('name', name);
            url.searchParams.append('email', email);
            url.searchParams.append('password', this.hashPassword(password));
            url.searchParams.append('requestedTier', selectedTier);
            url.searchParams.append('ip', clientData.ip);
            url.searchParams.append('ua', clientData.ua);
            url.searchParams.append('_', Date.now());
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('success', 'Account created! Check your email for verification code.');
                this.pendingEmail = email;
                
                // Hide signup form, show verification
                document.getElementById('signupForm').style.display = 'none';
                document.getElementById('verificationSection').style.display = 'block';
                
                // Start verification timer
                this.startVerificationTimer();
            } else {
                // Check if manual verification needed
                if (data.manualVerification) {
                    this.showManualVerification(data.message);
                } else if (data.tierFull) {
                    this.handleTierFull(data.availableTier);
                } else {
                    this.showAlert('error', data.message || 'Signup failed');
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showAlert('error', 'Network error. Please try again.');
        }
    }
    
    /**
     * Handle tier full scenario
     * @param {string} availableTier - Available tier
     */
    handleTierFull(availableTier) {
        if (availableTier) {
            this.showAlert('warning', 
                `Selected tier is full. ${availableTier} tier still available. ` +
                'Please select another tier.'
            );
        } else {
            this.showAlert('warning', 
                'All tiers are currently full. You will be redirected to the waitlist.'
            );
            
            setTimeout(() => {
                window.location.href = '/waitlist.html?reason=capacity';
            }, 3000);
        }
    }
    
    /**
     * Show manual verification notice
     * @param {string} message - Custom message
     */
    showManualVerification(message) {
        const notice = document.getElementById('manualVerificationNotice');
        const messageEl = document.getElementById('manualMessage');
        
        if (notice && messageEl) {
            messageEl.textContent = message || 
                'Due to high traffic, verification will be completed manually within 24 hours.';
            notice.style.display = 'block';
            
            // Hide signup form
            document.getElementById('signupForm').style.display = 'none';
        }
    }
    
    /**
     * Start verification timer (resend cooldown)
     */
    startVerificationTimer() {
        const resendLink = document.getElementById('resendCode');
        if (!resendLink) return;
        
        let seconds = 60;
        resendLink.style.pointerEvents = 'none';
        resendLink.style.opacity = '0.5';
        resendLink.textContent = `Resend (${seconds}s)`;
        
        this.verificationTimer = setInterval(() => {
            seconds--;
            resendLink.textContent = `Resend (${seconds}s)`;
            
            if (seconds <= 0) {
                clearInterval(this.verificationTimer);
                resendLink.style.pointerEvents = 'auto';
                resendLink.style.opacity = '1';
                resendLink.textContent = 'Resend';
            }
        }, 1000);
    }
    
    // ============================================
    // VERIFICATION
    // ============================================
    
    /**
     * Handle verification form submission
     * @param {Event} e - Form submit event
     */
    async handleVerification(e) {
        e.preventDefault();
        
        const code = document.getElementById('verificationCode').value;
        const email = this.pendingEmail;
        
        if (!Validator.isValidVerificationCode(code)) {
            this.showAlert('error', 'Please enter a valid 8-digit code');
            return;
        }
        
        this.showAlert('info', 'Verifying your account...');
        
        try {
            const clientData = await ClientData.getClientData();
            
            const url = new URL(CONFIG.APPS_SCRIPT_URL);
            url.searchParams.append('action', CONFIG.ENDPOINTS.verify);
            url.searchParams.append('email', email);
            url.searchParams.append('code', code);
            url.searchParams.append('ip', clientData.ip);
            url.searchParams.append('ua', clientData.ua);
            url.searchParams.append('_', Date.now());
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('success', 'Account verified! Redirecting to login...');
                this.pendingEmail = null;
                
                // Clear timer
                if (this.verificationTimer) {
                    clearInterval(this.verificationTimer);
                }
                
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                this.showAlert('error', data.message || 'Invalid verification code');
            }
        } catch (error) {
            console.error('Verification error:', error);
            this.showAlert('error', 'Network error. Please try again.');
        }
    }
    
    /**
     * Resend verification code
     * @param {Event} e - Click event
     */
    async resendVerification(e) {
        e.preventDefault();
        
        if (!this.pendingEmail) {
            this.showAlert('error', 'Session expired. Please sign up again.');
            return;
        }
        
        this.showAlert('info', 'Resending verification code...');
        
        try {
            const clientData = await ClientData.getClientData();
            
            const url = new URL(CONFIG.APPS_SCRIPT_URL);
            url.searchParams.append('action', 'resendVerification');
            url.searchParams.append('email', this.pendingEmail);
            url.searchParams.append('ip', clientData.ip);
            url.searchParams.append('ua', clientData.ua);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('success', 'Verification code resent!');
                this.startVerificationTimer();
            } else {
                this.showAlert('error', data.message || 'Failed to resend');
            }
        } catch (error) {
            console.error('Resend error:', error);
            this.showAlert('error', 'Network error. Please try again.');
        }
    }
    
    // ============================================
    // UTILITIES
    // ============================================
    
    /**
     * Simple hash for transmission (backend does real hashing)
     * @param {string} password - Raw password
     * @returns {string} - Hashed password
     */
    hashPassword(password) {
        // This is just for transmission - actual hashing in backend
        // DO NOT use for actual security
        return btoa(password);
    }
    
    /**
     * Show alert message
     * @param {string} type - success|error|info|warning
     * @param {string} message - Message to display
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
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                container.innerHTML = '';
            }, 5000);
        }
    }
}

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    window.auth = new Auth();
});

// ============================================
// EXPORT FOR GLOBAL USE
// ============================================

window.logout = () => {
    if (window.auth) {
        window.auth.logout();
    }
};
