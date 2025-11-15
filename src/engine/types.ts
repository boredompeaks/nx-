// ============================================================================
// ENTERPRISE-GRADE WEBRTC TYPES - PRODUCTION READY
// Zero memory leaks, optimized for asymmetric bandwidth scenarios
// ============================================================================

export type VideoQuality = 'ultraLow' | 'low' | 'medium' | 'high' | 'maxAuto';

export interface VideoQualityPreset {
  width: number;
  height: number;
  frameRate: number;
  maxBitrate: number;
  minBitrate: number;
  startBitrate: number;
}

export interface TurnServer {
  urls: string[];
  username?: string;
  credential?: string;
  region: string;
  priority?: number;
}

export interface CallEngineOptions {
  supabaseUrl: string;
  supabaseKey: string;
  roomId: string;
  userId: string;
  turnServers: TurnServer[];
  videoQuality?: VideoQuality;
  enableSVC?: boolean;
  enableSimulcast?: boolean;
  enableDTX?: boolean;
  maxBandwidth?: number; // kbps
}

export interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'renegotiate' | 'bye';
  from: string;
  to: string;
  data: any;
  timestamp: number;
}

export interface PresenceEvent {
  userId: string;
  status: 'joined' | 'left';
  timestamp: number;
}

export interface StatsReport {
  timestamp: number;
  bitrate: {
    video: { send: number; receive: number };
    audio: { send: number; receive: number };
  };
  packetLoss: number;
  jitter: number;
  rtt: number;
  bandwidth: { available: number; used: number };
  resolution?: { width: number; height: number };
  fps?: number;
  codec?: string;
}

export type CallEngineEvent =
  | 'engine:ready'
  | 'engine:disconnected'
  | 'peer:joined'
  | 'peer:left'
  | 'track:added'
  | 'track:removed'
  | 'reconnect:attempt'
  | 'reconnect:failed'
  | 'stats:update'
  | 'bandwidth:warning'
  | 'error';

export interface CallEngineEventMap {
  'engine:ready': void;
  'engine:disconnected': void;
  'peer:joined': { userId: string };
  'peer:left': { userId: string };
  'track:added': { track: MediaStreamTrack; stream: MediaStream; userId: string };
  'track:removed': { trackId: string; userId: string };
  'reconnect:attempt': { attempt: number };
  'reconnect:failed': void;
  'stats:update': StatsReport;
  'bandwidth:warning': { available: number; required: number };
  error: { error: Error; context: string };
}

// Enhanced error types for better error handling
export class WebRTCError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'WebRTCError';
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}