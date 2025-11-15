// WebRTC Utility Functions
import { MAX_SIGNAL_SIZE } from './constants';
/**
 * Calculate exponential backoff with jitter for reconnection attempts
 */
export function exponentialBackoff(attempt, baseDelay, maxDelay) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, maxDelay);
    const jitter = Math.random() * 0.1 * cappedDelay; // Reduced jitter to 10%
    const finalDelay = cappedDelay + jitter;
    // Ensure we never exceed maxDelay by capping again after jitter
    return Math.min(Math.floor(finalDelay), Math.floor(maxDelay * 0.9)); // 90% of maxDelay to ensure we stay under
}
/**
 * Validate media constraints for getUserMedia
 */
export function validateMediaConstraints(constraints) {
    try {
        if (!constraints || (!constraints.audio && !constraints.video)) {
            return false;
        }
        // Validate audio constraints
        if (constraints.audio && typeof constraints.audio === 'object') {
            const audioConstraints = constraints.audio;
            if (audioConstraints.sampleRate && typeof audioConstraints.sampleRate !== 'number') {
                return false;
            }
        }
        // Validate video constraints
        if (constraints.video && typeof constraints.video === 'object') {
            const videoConstraints = constraints.video;
            if (videoConstraints.width && typeof videoConstraints.width !== 'number' &&
                typeof videoConstraints.width !== 'object') {
                return false;
            }
            if (videoConstraints.height && typeof videoConstraints.height !== 'number' &&
                typeof videoConstraints.height !== 'object') {
                return false;
            }
        }
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Probe server latency for TURN server selection
 */
export async function probeServerLatency(url, timeout) {
    if (!url || !timeout || timeout <= 0) {
        return Infinity;
    }
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
        // If request took longer than or very close to timeout, consider it failed
        return elapsed >= timeout * 0.8 ? Infinity : elapsed; // 80% threshold
    }
    catch {
        return Infinity;
    }
}
/**
 * Safely cleanup MediaStream to prevent memory leaks
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
                console.warn('Error stopping track:', error);
            }
        });
    }
    catch (error) {
        console.warn('Error cleaning up media stream:', error);
    }
}
/**
 * Safely cleanup RTCPeerConnection to prevent memory leaks
 */
export function cleanupPeerConnection(pc) {
    if (!pc)
        return;
    try {
        // Stop all senders
        const senders = pc.getSenders();
        senders.forEach(sender => {
            if (sender.track) {
                try {
                    sender.track.stop();
                }
                catch (error) {
                    console.warn('Error stopping sender track:', error);
                }
            }
            try {
                pc.removeTrack(sender);
            }
            catch (error) {
                console.warn('Error removing sender:', error);
            }
        });
        // Stop all receivers
        const receivers = pc.getReceivers();
        receivers.forEach(receiver => {
            if (receiver.track) {
                try {
                    receiver.track.stop();
                }
                catch (error) {
                    console.warn('Error stopping receiver track:', error);
                }
            }
        });
        // Close the connection
        pc.close();
    }
    catch (error) {
        console.error('Error cleaning up peer connection:', error);
    }
}
/**
 * Validate signal message size and content
 */
export function validateSignalMessage(message) {
    try {
        if (!message || typeof message !== 'object') {
            return false;
        }
        // Check message size
        const messageSize = JSON.stringify(message).length;
        if (messageSize > MAX_SIGNAL_SIZE) {
            console.warn('Signal message too large:', messageSize);
            return false;
        }
        // Validate required fields
        if (!message.type || !message.from || !message.to) {
            return false;
        }
        // Validate message type
        const validTypes = ['offer', 'answer', 'ice-candidate', 'renegotiate', 'bye'];
        if (!validTypes.includes(message.type)) {
            return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Generate cryptographically secure random ID
 */
export function generateSecureId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
    }
    else {
        // Fallback to Math.random (less secure)
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
/**
 * Debounce function calls to prevent excessive execution
 */
export function debounce(func, wait) {
    let timeout = null;
    return (...args) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
            timeout = null;
        }, wait);
    };
}
/**
 * Throttle function calls to limit execution rate
 */
export function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
