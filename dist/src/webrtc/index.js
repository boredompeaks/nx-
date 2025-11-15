// WebRTC Module - Enterprise-Grade Video/Voice Calling Engine
import { CallEngine } from './CallEngine';
export { CallEngine } from './CallEngine';
export { SignalingClient } from './SignalingClient';
export { TurnSelector } from './TurnSelector';
export { AudioDucker } from './AudioDucker';
export { StatsMonitor } from './StatsMonitor';
export { VIDEO_QUALITY_PRESETS, ICE_GATHERING_TIMEOUT, RECONNECT_MAX_ATTEMPTS, RECONNECT_BASE_DELAY, RECONNECT_MAX_DELAY, STATS_INTERVAL, TURN_PROBE_TIMEOUT, NEGOTIATION_TIMEOUT, BITRATE_ADAPTATION_INTERVAL, PACKET_LOSS_THRESHOLD, RTT_THRESHOLD, BANDWIDTH_SAFETY_MARGIN, MAX_PEERS_PER_ROOM, HEARTBEAT_INTERVAL, PEER_TIMEOUT, MAX_SIGNAL_SIZE, SIGNAL_RATE_LIMIT, } from './constants';
export { exponentialBackoff, validateMediaConstraints, probeServerLatency, cleanupMediaStream, cleanupPeerConnection, validateSignalMessage, generateSecureId, debounce, throttle, } from './utils';
// Version information
export const WEBRTC_ENGINE_VERSION = '1.0.0';
export const WEBRTC_ENGINE_BUILD = 'enterprise';
// Utility function to create a CallEngine instance with validation
export function createCallEngine(options) {
    try {
        return new CallEngine(options);
    }
    catch (error) {
        console.error('Failed to create CallEngine:', error);
        throw error;
    }
}
// Utility function to validate WebRTC support
export function isWebRTCSupported() {
    return (typeof RTCPeerConnection !== 'undefined' &&
        typeof MediaStream !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices !== 'undefined' &&
        typeof navigator.mediaDevices.getUserMedia !== 'undefined');
}
// Utility function to get WebRTC capabilities
export function getWebRTCCapabilities() {
    return {
        supported: isWebRTCSupported(),
        features: {
            peerConnection: typeof RTCPeerConnection !== 'undefined',
            mediaStream: typeof MediaStream !== 'undefined',
            getUserMedia: typeof navigator?.mediaDevices?.getUserMedia !== 'undefined',
            screenShare: typeof navigator?.mediaDevices?.getDisplayMedia !== 'undefined',
            audioContext: typeof AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined',
        },
    };
}
