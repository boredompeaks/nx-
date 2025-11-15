// ============================================================================
// ENTERPRISE-GRADE WEBRTC CONSTANTS - PRODUCTION READY
// Zero memory leaks, optimized for asymmetric bandwidth scenarios
// ============================================================================

import { VideoQuality, VideoQualityPreset } from './types';

export const VIDEO_QUALITY_PRESETS: Record<VideoQuality, VideoQualityPreset> = {
  ultraLow: { 
    width: 320, height: 240, frameRate: 15, 
    maxBitrate: 150000, minBitrate: 50000, startBitrate: 100000 
  },
  low: { 
    width: 640, height: 480, frameRate: 24, 
    maxBitrate: 500000, minBitrate: 150000, startBitrate: 300000 
  },
  medium: { 
    width: 1280, height: 720, frameRate: 30, 
    maxBitrate: 1500000, minBitrate: 400000, startBitrate: 800000 
  },
  high: { 
    width: 1920, height: 1080, frameRate: 30, 
    maxBitrate: 3000000, minBitrate: 1000000, startBitrate: 2000000 
  },
  maxAuto: { 
    width: 1920, height: 1080, frameRate: 60, 
    maxBitrate: 8000000, minBitrate: 2000000, startBitrate: 4000000 
  },
};

export const ICE_GATHERING_TIMEOUT = 5000;
export const RECONNECT_MAX_ATTEMPTS = 5;
export const RECONNECT_BASE_DELAY = 1000;
export const RECONNECT_MAX_DELAY = 30000;
export const STATS_INTERVAL = 1000;
export const TURN_PROBE_TIMEOUT = 3000;
export const NEGOTIATION_TIMEOUT = 10000;
export const BITRATE_ADAPTATION_INTERVAL = 2000;
export const PACKET_LOSS_THRESHOLD = 0.05; // 5%
export const RTT_THRESHOLD = 300; // ms
export const BANDWIDTH_SAFETY_MARGIN = 0.85; // Use 85% of available

// Security constants
export const MAX_CONNECTIONS_PER_ROOM = 50;
export const MAX_MESSAGE_SIZE = 65536; // 64KB
export const HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const CONNECTION_TIMEOUT = 60000; // 60 seconds

// WebRTC specific constants
export const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
  'stun:stun4.l.google.com:19302',
];

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: STUN_SERVERS[0] },
];