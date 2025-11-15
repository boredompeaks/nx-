// WebRTC Constants and Configuration

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

// Connection and timing constants
export const ICE_GATHERING_TIMEOUT = 5000;
export const RECONNECT_MAX_ATTEMPTS = 5;
export const RECONNECT_BASE_DELAY = 1000;
export const RECONNECT_MAX_DELAY = 30000;
export const STATS_INTERVAL = 1000;
export const TURN_PROBE_TIMEOUT = 3000;
export const PROBE_CACHE_DURATION = 300000; // 5 minutes
export const NEGOTIATION_TIMEOUT = 10000;
export const BITRATE_ADAPTATION_INTERVAL = 2000;

// Quality thresholds
export const PACKET_LOSS_THRESHOLD = 0.05; // 5%
export const RTT_THRESHOLD = 300; // ms
export const BANDWIDTH_SAFETY_MARGIN = 0.85; // Use 85% of available

// Security and validation constants
export const MAX_SIGNAL_SIZE = 65536; // 64KB max signal size
export const SIGNAL_RATE_LIMIT = 100; // Max signals per minute
export const MAX_PEERS_PER_ROOM = 50; // Maximum peers allowed
export const HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const PEER_TIMEOUT = 60000; // 60 seconds without heartbeat