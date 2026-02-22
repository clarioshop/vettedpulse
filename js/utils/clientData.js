/**
 * Client Data Capture Module
 * Fetches real client IP (not Google's proxy IP) for accurate tracking
 */

const ClientData = {
    // Cache IP to avoid repeated calls
    ipCache: null,
    ipPromise: null,
    lastFetch: 0,
    cacheTTL: 60000, // Cache IP for 1 minute
    
    // Cache for fingerprint
    fingerprintCache: null,
    
    // ============================================
    // IP DETECTION
    // ============================================
    
    /**
     * Get real client IP with caching
     * @returns {Promise<string>} - Client IP address
     */
    async getRealIP() {
        // Return cached if still valid
        if (this.ipCache && (Date.now() - this.lastFetch) < this.cacheTTL) {
            if (CONFIG.DEBUG) console.log('Using cached IP:', this.ipCache);
            return this.ipCache;
        }
        
        // If already fetching, return that promise
        if (this.ipPromise) {
            return this.ipPromise;
        }
        
        // Try multiple IP services in order
        this.ipPromise = this.fetchWithFallbacks();
        
        try {
            const ip = await this.ipPromise;
            this.ipCache = ip;
            this.lastFetch = Date.now();
            return ip;
        } finally {
            this.ipPromise = null;
        }
    },
    
    /**
     * Fetch IP from multiple services with fallbacks
     * @returns {Promise<string>} - Client IP address
     */
    async fetchWithFallbacks() {
        const services = [
            { 
                url: CONFIG.SERVICES.IPIFY_URL, 
                transform: (data) => {
                    if (typeof data === 'string') return data.trim();
                    return data.ip;
                }
            },
            { 
                url: 'https://api.ipify.org?format=json', 
                transform: (data) => data.ip 
            },
            { 
                url: 'https://api.myip.com', 
                transform: (data) => data.ip 
            },
            { 
                url: 'https://icanhazip.com', 
                transform: (data) => data.trim() 
            }
        ];
        
        for (const service of services) {
            try {
                const response = await this.fetchWithTimeout(service.url);
                const data = await response.text();
                let ip;
                
                try {
                    // Try parsing as JSON
                    const json = JSON.parse(data);
                    ip = service.transform(json);
                } catch {
                    // Plain text response
                    ip = data.trim();
                }
                
                // Validate IP format
                if (this.isValidIP(ip)) {
                    if (CONFIG.DEBUG) console.log('IP fetched from:', service.url);
                    return ip;
                }
            } catch (error) {
                if (CONFIG.DEBUG) console.warn('IP service failed:', service.url, error.message);
                continue;
            }
        }
        
        // Ultimate fallback - generate a local identifier
        if (CONFIG.DEBUG) console.warn('All IP services failed, using local fallback');
        return this.generateLocalIP();
    },
    
    /**
     * Generate local IP fallback (not real IP, but unique per session)
     * @returns {string} - Local identifier
     */
    generateLocalIP() {
        const sessionId = Math.random().toString(36).substring(2, 15);
        return `local-${sessionId}`;
    },
    
    /**
     * Fetch with timeout
     * @param {string} url - URL to fetch
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<Response>} - Fetch response
     */
    async fetchWithTimeout(url, timeout = CONFIG.SERVICES.IPIFY_TIMEOUT) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, { 
                signal: controller.signal,
                cache: 'no-cache',
                mode: 'cors'
            });
            clearTimeout(id);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    },
    
    /**
     * Validate IP address format
     * @param {string} ip - IP address to validate
     * @returns {boolean} - True if valid
     */
    isValidIP(ip) {
        if (!ip || typeof ip !== 'string') return false;
        
        // Remove any whitespace
        ip = ip.trim();
        
        // IPv4
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (ipv4Regex.test(ip)) return true;
        
        // IPv6 (simplified)
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        return ipv6Regex.test(ip);
    },
    
    // ============================================
    // FINGERPRINTING
    // ============================================
    
    /**
     * Get browser fingerprint for fraud detection
     * @returns {string} - Browser fingerprint
     */
    getFingerprint() {
        if (this.fingerprintCache) {
            return this.fingerprintCache;
        }
        
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.colorDepth,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 'unknown',
            navigator.deviceMemory || 'unknown',
            !!navigator.webdriver,
            !!window.chrome,
            navigator.platform,
            navigator.vendor || 'unknown'
        ];
        
        // Create a simple hash
        const fingerprint = components.join('||');
        this.fingerprintCache = this.hashString(fingerprint);
        
        return this.fingerprintCache;
    },
    
    /**
     * Simple string hash function
     * @param {string} str - String to hash
     * @returns {string} - Hashed string
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    },
    
    // ============================================
    // CLIENT DATA PACKET
    // ============================================
    
    /**
     * Get complete client data packet
     * @returns {Promise<Object>} - Client data object
     */
    async getClientData() {
        const [ip, ua, fingerprint] = await Promise.all([
            this.getRealIP(),
            Promise.resolve(navigator.userAgent),
            Promise.resolve(this.getFingerprint())
        ]);
        
        const data = {
            ip: ip,
            ua: ua,
            fingerprint: fingerprint,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            referrer: document.referrer || 'direct',
            screen: `${window.screen.width}x${window.screen.height}`,
            colorDepth: screen.colorDepth,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            platform: navigator.platform,
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            connection: navigator.connection ? {
                type: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
        
        if (CONFIG.DEBUG) {
            console.log('Client data captured:', data);
        }
        
        return data;
    },
    
    /**
     * Append client data to URL
     * @param {string} baseUrl - Base URL
     * @returns {Promise<string>} - URL with client data appended
     */
    async appendToUrl(baseUrl) {
        const data = await this.getClientData();
        
        try {
            const url = new URL(baseUrl, window.location.origin);
            url.searchParams.append('ip', data.ip);
            url.searchParams.append('ua', data.ua);
            url.searchParams.append('fp', data.fingerprint);
            url.searchParams.append('_', Date.now()); // Cache buster
            
            return url.toString();
        } catch (error) {
            console.error('Failed to append client data to URL:', error);
            
            // Fallback to string concatenation
            const separator = baseUrl.includes('?') ? '&' : '?';
            return `${baseUrl}${separator}ip=${encodeURIComponent(data.ip)}&ua=${encodeURIComponent(data.ua)}&_=${Date.now()}`;
        }
    },
    
    /**
     * Get minimal client data (just IP and UA)
     * @returns {Promise<Object>} - Minimal client data
     */
    async getMinimalData() {
        const [ip, ua] = await Promise.all([
            this.getRealIP(),
            Promise.resolve(navigator.userAgent)
        ]);
        
        return {
            ip: ip,
            ua: ua,
            timestamp: new Date().toISOString()
        };
    },
    
    // ============================================
    // UTILITIES
    // ============================================
    
    /**
     * Clear cache (useful for testing)
     */
    clearCache() {
        this.ipCache = null;
        this.fingerprintCache = null;
        this.lastFetch = 0;
        if (CONFIG.DEBUG) console.log('Client data cache cleared');
    },
    
    /**
     * Check if running in private/incognito mode
     * @returns {Promise<boolean>} - True if in private mode
     */
    async isPrivateMode() {
        return new Promise((resolve) => {
            const on = () => resolve(false); // Not private
            const off = () => resolve(true); // Private
            
            try {
                // Try to write to localStorage
                const testKey = '__test__';
                localStorage.setItem(testKey, '1');
                localStorage.removeItem(testKey);
                on();
            } catch (error) {
                off();
            }
        });
    },
    
    /**
     * Get connection info
     * @returns {Object} - Connection information
     */
    getConnectionInfo() {
        const conn = navigator.connection || 
                    navigator.mozConnection || 
                    navigator.webkitConnection;
        
        if (conn) {
            return {
                type: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt,
                saveData: conn.saveData
            };
        }
        
        return null;
    }
};

// ============================================
// FREEZE OBJECT
// ============================================

Object.freeze(ClientData);

// ============================================
// EXPORT FOR GLOBAL USE
// ============================================

window.ClientData = ClientData;

// ============================================
// SELF-TEST (only in debug mode)
// ============================================

if (CONFIG.DEBUG) {
    (async function testClientData() {
        console.log('Testing ClientData module...');
        try {
            const data = await ClientData.getMinimalData();
            console.log('ClientData test successful:', data);
        } catch (error) {
            console.error('ClientData test failed:', error);
        }
    })();
}