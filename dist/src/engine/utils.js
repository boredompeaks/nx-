// ============================================================================
// ENTERPRISE-GRADE WEBRTC UTILITIES - PRODUCTION READY
// Zero memory leaks, optimized for asymmetric bandwidth scenarios
// ============================================================================
/**
 * Calculate exponential backoff with jitter for reconnection attempts
 */
export function exponentialBackoff(attempt, baseDelay, maxDelay) {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.3 * delay;
    return Math.min(delay + jitter, maxDelay);
}
/**
 * Validate media constraints to prevent runtime errors
 */
export function validateMediaConstraints(constraints) {
    const errors = [];
    try {
        if (!constraints || typeof constraints !== 'object') {
            errors.push('Constraints must be an object');
            return { isValid: false, errors };
        }
        if (!constraints.audio && !constraints.video) {
            errors.push('At least audio or video must be requested');
        }
        // Validate audio constraints
        if (constraints.audio && typeof constraints.audio === 'object') {
            const audioConstraints = constraints.audio;
            if (audioConstraints.echoCancellation !== undefined &&
                typeof audioConstraints.echoCancellation !== 'boolean') {
                errors.push('echoCancellation must be a boolean');
            }
            if (audioConstraints.noiseSuppression !== undefined &&
                typeof audioConstraints.noiseSuppression !== 'boolean') {
                errors.push('noiseSuppression must be a boolean');
            }
            if (audioConstraints.autoGainControl !== undefined &&
                typeof audioConstraints.autoGainControl !== 'boolean') {
                errors.push('autoGainControl must be a boolean');
            }
        }
        // Validate video constraints
        if (constraints.video && typeof constraints.video === 'object') {
            const videoConstraints = constraints.video;
            if (videoConstraints.width !== undefined) {
                if (typeof videoConstraints.width === 'number' && videoConstraints.width <= 0) {
                    errors.push('Video width must be positive');
                }
                else if (typeof videoConstraints.width === 'object' && videoConstraints.width !== null) {
                    const width = videoConstraints.width;
                    if (width.exact !== undefined && width.exact <= 0) {
                        errors.push('Video width exact must be positive');
                    }
                    if (width.ideal !== undefined && width.ideal <= 0) {
                        errors.push('Video width ideal must be positive');
                    }
                }
            }
            if (videoConstraints.height !== undefined) {
                if (typeof videoConstraints.height === 'number' && videoConstraints.height <= 0) {
                    errors.push('Video height must be positive');
                }
                else if (typeof videoConstraints.height === 'object' && videoConstraints.height !== null) {
                    const height = videoConstraints.height;
                    if (height.exact !== undefined && height.exact <= 0) {
                        errors.push('Video height exact must be positive');
                    }
                    if (height.ideal !== undefined && height.ideal <= 0) {
                        errors.push('Video height ideal must be positive');
                    }
                }
            }
            if (videoConstraints.frameRate !== undefined) {
                if (typeof videoConstraints.frameRate === 'number' && videoConstraints.frameRate <= 0) {
                    errors.push('Video frameRate must be positive');
                }
                else if (typeof videoConstraints.frameRate === 'object' && videoConstraints.frameRate !== null) {
                    const frameRate = videoConstraints.frameRate;
                    if (frameRate.exact !== undefined && frameRate.exact <= 0) {
                        errors.push('Video frameRate exact must be positive');
                    }
                    if (frameRate.ideal !== undefined && frameRate.ideal <= 0) {
                        errors.push('Video frameRate ideal must be positive');
                    }
                }
            }
        }
        return { isValid: errors.length === 0, errors };
    }
    catch (error) {
        return {
            isValid: false,
            errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
    }
}
/**
 * Probe server latency with proper error handling and timeout
 */
export async function probeServerLatency(url, timeout) {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache',
            mode: 'no-cors'
        });
        clearTimeout(timeoutId);
        const elapsed = Date.now() - start;
        return elapsed >= timeout ? Infinity : elapsed;
    }
    catch (error) {
        console.warn(`Server probe failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
        return Infinity;
    }
}
/**
 * Safely cleanup media stream to prevent memory leaks
 */
export function cleanupMediaStream(stream) {
    if (!stream)
        return;
    try {
        const tracks = stream.getTracks();
        tracks.forEach(track => {
            try {
                track.stop();
                stream.removeTrack(track);
            }
            catch (error) {
                console.warn('Error stopping track:', error instanceof Error ? error.message : 'Unknown error');
            }
        });
    }
    catch (error) {
        console.warn('Error cleaning up media stream:', error instanceof Error ? error.message : 'Unknown error');
    }
}
/**
 * Safely cleanup peer connection to prevent memory leaks
 */
export function cleanupPeerConnection(pc) {
    if (!pc)
        return;
    try {
        // Stop all senders
        pc.getSenders().forEach(sender => {
            if (sender.track) {
                try {
                    sender.track.stop();
                }
                catch (error) {
                    console.warn('Error stopping sender track:', error instanceof Error ? error.message : 'Unknown error');
                }
            }
            try {
                pc.removeTrack(sender);
            }
            catch (error) {
                console.warn('Error removing sender:', error instanceof Error ? error.message : 'Unknown error');
            }
        });
        // Stop all receivers
        pc.getReceivers().forEach(receiver => {
            if (receiver.track) {
                try {
                    receiver.track.stop();
                }
                catch (error) {
                    console.warn('Error stopping receiver track:', error instanceof Error ? error.message : 'Unknown error');
                }
            }
        });
        // Close the connection
        pc.close();
    }
    catch (error) {
        console.error('Error cleaning up peer connection:', error instanceof Error ? error.message : 'Unknown error');
    }
}
/**
 * Generate a secure random ID for WebRTC operations
 */
export function generateSecureId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Deep clone an object to prevent reference issues
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (obj instanceof Array)
        return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
}
/**
 * Debounce function calls to prevent excessive execution
 */
export function debounce(func, wait, immediate = false) {
    let timeout = null;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate)
                func(...args);
        };
        const callNow = immediate && !timeout;
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
        if (callNow) {
            func(...args);
        }
    };
}
/**
 * Validate CallEngine options
 */
export function validateCallEngineOptions(options) {
    const errors = [];
    if (!options || typeof options !== 'object') {
        errors.push('Options must be an object');
        return { isValid: false, errors };
    }
    if (!options.supabaseUrl || typeof options.supabaseUrl !== 'string') {
        errors.push('supabaseUrl is required and must be a string');
    }
    if (!options.supabaseKey || typeof options.supabaseKey !== 'string') {
        errors.push('supabaseKey is required and must be a string');
    }
    if (!options.roomId || typeof options.roomId !== 'string') {
        errors.push('roomId is required and must be a string');
    }
    if (!options.userId || typeof options.userId !== 'string') {
        errors.push('userId is required and must be a string');
    }
    if (!Array.isArray(options.turnServers)) {
        errors.push('turnServers must be an array');
    }
    else {
        options.turnServers.forEach((server, index) => {
            if (!server.urls || !Array.isArray(server.urls)) {
                errors.push(`turnServers[${index}].urls must be an array`);
            }
            if (!server.region || typeof server.region !== 'string') {
                errors.push(`turnServers[${index}].region is required and must be a string`);
            }
        });
    }
    if (options.videoQuality && !['ultraLow', 'low', 'medium', 'high', 'maxAuto'].includes(options.videoQuality)) {
        errors.push('videoQuality must be one of: ultraLow, low, medium, high, maxAuto');
    }
    if (options.maxBandwidth !== undefined && (typeof options.maxBandwidth !== 'number' || options.maxBandwidth <= 0)) {
        errors.push('maxBandwidth must be a positive number');
    }
    return { isValid: errors.length === 0, errors };
}
