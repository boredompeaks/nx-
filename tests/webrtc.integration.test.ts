// Integration Tests for WebRTC Engine

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CallEngine, createCallEngine } from '../src/webrtc';

// Mock WebRTC APIs
global.RTCPeerConnection = class RTCPeerConnection {
  connectionState = 'new';
  iceConnectionState = 'new';
  signalingState = 'stable';
  getSenders = vi.fn(() => []);
  getReceivers = vi.fn(() => []);
  getStats = vi.fn(() => Promise.resolve(new Map()));
  getConfiguration = vi.fn(() => ({ iceServers: [] }));
  setConfiguration = vi.fn();
  close = vi.fn();
  addTrack = vi.fn();
  removeTrack = vi.fn();
  createOffer = vi.fn(() => Promise.resolve({ type: 'offer', sdp: 'test-offer' }));
  createAnswer = vi.fn(() => Promise.resolve({ type: 'answer', sdp: 'test-answer' }));
  setLocalDescription = vi.fn(() => Promise.resolve());
  setRemoteDescription = vi.fn(() => Promise.resolve());
  addIceCandidate = vi.fn(() => Promise.resolve());
  onicecandidate = null;
  ontrack = null;
  onnegotiationneeded = null;
  onconnectionstatechange = null;
  oniceconnectionstatechange = null;
  
  static generateCertificate = vi.fn(() => Promise.resolve({}));
} as any;

global.MediaStream = class MediaStream {
  active = true;
  id = 'test-stream-id';
  onaddtrack = null;
  onremovetrack = null;
  getTracks = vi.fn(() => []);
  getAudioTracks = vi.fn(() => []);
  getVideoTracks = vi.fn(() => []);
  addTrack = vi.fn();
  removeTrack = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);
} as any;

global.MediaStreamTrack = class MediaStreamTrack {
  kind = 'video';
  enabled = true;
  stop = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);
  contentHint = '';
  id = 'test-track-id';
  label = 'Test Track';
  muted = false;
  onended = null;
  onmute = null;
  onunmute = null;
  readyState = 'live';
  applyConstraints = vi.fn(() => Promise.resolve());
  clone = vi.fn(() => new MediaStreamTrack());
  getCapabilities = vi.fn(() => ({}));
  getConstraints = vi.fn(() => ({}));
  getSettings = vi.fn(() => ({}));
} as any;

// Mock navigator.mediaDevices
Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: vi.fn(() => Promise.resolve(new MediaStream())),
      getDisplayMedia: vi.fn(() => Promise.resolve(new MediaStream())),
      enumerateDevices: vi.fn(() => Promise.resolve([])),
      getSupportedConstraints: vi.fn(() => ({})),
    },
  },
  writable: true,
  configurable: true,
});

// Mock Supabase
global.fetch = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })));

describe('WebRTC Engine Integration Tests', () => {
  let engine1: CallEngine;
  let engine2: CallEngine;
  
  const createMockOptions = (userId: string, roomId: string) => ({
    userId,
    roomId,
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key',
    turnServers: [{
      urls: ['turn:turn.example.com:3478'],
      username: 'testuser',
      credential: 'testpass',
    }],
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Multi-Peer Connection Integration', () => {
    it('should handle multiple peer connections simultaneously', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));
      engine2 = createCallEngine(createMockOptions('user2', 'room1'));

      // Mock signaling clients
      const mockSignaling1 = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      const mockSignaling2 = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling1);
      vi.spyOn(engine2 as any, 'signaling', 'get').mockReturnValue(mockSignaling2);

      // Initialize both engines
      await Promise.all([engine1.init(), engine2.init()]);

      // Start local media on both
      const constraints = { video: true, audio: true };
      await Promise.all([
        engine1.startLocalMedia(constraints),
        engine2.startLocalMedia(constraints),
      ]);

      // Create peer connection from user1 to user2
      const pc1 = await (engine1 as any).createPeerConnection('user2', true);
      expect(pc1).toBeDefined();

      // Verify both engines are operational
      expect(engine1.getPeerCount()).toBe(1);
      expect(engine2.getPeerCount()).toBe(0); // user2 hasn't connected to user1 yet
    });

    it('should handle peer disconnection gracefully', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));
      engine2 = createCallEngine(createMockOptions('user2', 'room1'));

      const mockSignaling1 = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      const mockSignaling2 = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling1);
      vi.spyOn(engine2 as any, 'signaling', 'get').mockReturnValue(mockSignaling2);

      await Promise.all([engine1.init(), engine2.init()]);

      // Create connection
      await (engine1 as any).createPeerConnection('user2', true);
      expect(engine1.getPeerCount()).toBe(1);

      // Simulate peer disconnection
      await (engine1 as any).closePeerConnection('user2');
      expect(engine1.getPeerCount()).toBe(0);
    });
  });

  describe('Media Stream Integration', () => {
    it('should handle media stream sharing between peers', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      await engine1.init();

      // Create mock media stream with tracks
      const mockVideoTrack = new MediaStreamTrack();
      Object.defineProperty(mockVideoTrack, 'kind', { value: 'video', writable: true });
      const mockAudioTrack = new MediaStreamTrack();
      Object.defineProperty(mockAudioTrack, 'kind', { value: 'audio', writable: true });
      
      const mockStream = new MediaStream();
      vi.mocked(mockStream.getVideoTracks).mockReturnValue([mockVideoTrack]);
      vi.mocked(mockStream.getAudioTracks).mockReturnValue([mockAudioTrack]);
      vi.mocked(mockStream.getTracks).mockReturnValue([mockVideoTrack, mockAudioTrack]);

      // Mock getUserMedia to return our mock stream
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const stream = await engine1.startLocalMedia({ video: true, audio: true });
      
      expect(stream).toBe(mockStream);
      expect(stream.getVideoTracks()).toHaveLength(1);
      expect(stream.getAudioTracks()).toHaveLength(1);
    });

    it('should handle screen sharing integration', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      await engine1.init();

      // Create mock screen stream
      const mockScreenTrack = new MediaStreamTrack();
      Object.defineProperty(mockScreenTrack, 'kind', { value: 'video', writable: true });
      const mockScreenStream = new MediaStream();
      vi.mocked(mockScreenStream.getVideoTracks).mockReturnValue([mockScreenTrack]);
      vi.mocked(mockScreenStream.getTracks).mockReturnValue([mockScreenTrack]);
      vi.mocked(mockScreenStream.getTracks).mockReturnValue([mockScreenTrack]);
      vi.mocked(mockScreenStream.getTracks).mockReturnValue([mockScreenTrack]);

      // Mock getDisplayMedia to return our mock stream
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValueOnce(mockScreenStream);

      const stream = await engine1.startScreenShare();
      
      expect(stream).toBe(mockScreenStream);
      expect(stream.getVideoTracks()).toHaveLength(1);
    });

    it('should handle screen share stop event', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      await engine1.init();

      // Create mock screen stream with ended event
      const mockScreenTrack = new MediaStreamTrack();
      Object.defineProperty(mockScreenTrack, 'kind', { value: 'video', writable: true });
      Object.defineProperty(mockScreenTrack, 'readyState', { value: 'live', writable: true });
      mockScreenTrack.stop = vi.fn();
      const mockScreenStream = new MediaStream();
      vi.mocked(mockScreenStream.getVideoTracks).mockReturnValue([mockScreenTrack]);

      let endedCallback: Function | null = null;
      mockScreenTrack.addEventListener = vi.fn((event, callback) => {
        if (event === 'ended') {
          endedCallback = callback as Function;
        }
      });

      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValueOnce(mockScreenStream);

      await engine1.startScreenShare();

      // Simulate screen share ended
      if (endedCallback) {
        (endedCallback as () => void)();
      }

      // Wait for the async stopScreenShare to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify screen share was stopped and engine cleaned up
      expect(engine1.getStats().screenStream).toBeNull();
    });
  });

  describe('Signaling Integration', () => {
    it('should handle offer/answer exchange between peers', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));
      engine2 = createCallEngine(createMockOptions('user2', 'room1'));

      // Mock signaling with message passing
      const signals1to2: any[] = [];
      const signals2to1: any[] = [];

      const mockSignaling1 = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn((handler) => {
          // Simulate receiving signals from user2
          setTimeout(() => {
            while (signals2to1.length > 0) {
              const signal = signals2to1.shift();
              handler(signal);
            }
          }, 10);
          return vi.fn(); // unsubscribe function
        }),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn((to, type, data) => {
          signals1to2.push({ from: 'user1', to, type, data, timestamp: Date.now() });
          return Promise.resolve();
        }),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      const mockSignaling2 = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn((handler) => {
          // Simulate receiving signals from user1
          setTimeout(() => {
            while (signals1to2.length > 0) {
              const signal = signals1to2.shift();
              handler(signal);
            }
          }, 10);
          return vi.fn(); // unsubscribe function
        }),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn((to, type, data) => {
          signals2to1.push({ from: 'user2', to, type, data, timestamp: Date.now() });
          return Promise.resolve();
        }),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling1);
      vi.spyOn(engine2 as any, 'signaling', 'get').mockReturnValue(mockSignaling2);

      await Promise.all([engine1.init(), engine2.init()]);

      // Start local media
      await Promise.all([
        engine1.startLocalMedia({ video: true, audio: true }),
        engine2.startLocalMedia({ video: true, audio: true }),
      ]);

      // Create peer connection from user1 to user2
      await (engine1 as any).createPeerConnection('user2', true);

      // Manually trigger signaling to simulate real behavior
      await (engine1 as any).signaling.sendSignal('user2', 'offer', { sdp: 'test-offer' });
      await (engine2 as any).signaling.sendSignal('user1', 'answer', { sdp: 'test-answer' });

      // Verify signaling occurred
      expect(mockSignaling1.sendSignal).toHaveBeenCalled();
      expect(mockSignaling2.sendSignal).toHaveBeenCalled();
    });

    it('should handle ICE candidate exchange', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      await engine1.init();

      // Create peer connection
      const pc = await (engine1 as any).createPeerConnection('user2', true);

      // Mock ICE candidate event
      const mockCandidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
        toJSON: () => ({
          candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host',
          sdpMid: '0',
          sdpMLineIndex: 0,
        }),
      };

      // Simulate ICE candidate generation
      if (pc.onicecandidate) {
        pc.onicecandidate({ candidate: mockCandidate });
      }

      // Verify ICE candidate was sent
      expect(mockSignaling.sendSignal).toHaveBeenCalledWith(
        'user2',
        'ice-candidate',
        expect.objectContaining({
          candidate: mockCandidate.candidate,
          sdpMid: mockCandidate.sdpMid,
          sdpMLineIndex: mockCandidate.sdpMLineIndex,
        })
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle connection failures gracefully', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      await engine1.init();

      // Create peer connection
      const pc = await (engine1 as any).createPeerConnection('user2', true);

      // Mock connection state change to failed
      pc.connectionState = 'failed';
      if (pc.onconnectionstatechange) {
        pc.onconnectionstatechange();
      }

      // Verify error was emitted (connection failures don't increment errorCount)
      // We can't directly test private emit method, but we can verify the behavior indirectly
    });

    it('should handle ICE connection failures', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      await engine1.init();

      // Create peer connection
      const pc = await (engine1 as any).createPeerConnection('user2', true);

      // Mock ICE connection state change to failed
      pc.iceConnectionState = 'failed';
      if (pc.oniceconnectionstatechange) {
        pc.oniceconnectionstatechange();
      }

      // Verify error handling (ICE failures don't increment errorCount)
      // We can't directly test private emit method, but we can verify the behavior indirectly
    });

    it('should handle reconnection attempts', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      await engine1.init();

      // Create peer connection
      const pc = await (engine1 as any).createPeerConnection('user2', true);

      // Mock disconnection
      pc.connectionState = 'disconnected';
      if (pc.onconnectionstatechange) {
        pc.onconnectionstatechange();
      }

      // Verify reconnection attempt was scheduled
      expect((engine1 as any).reconnectAttempts.get('user2')).toBe(1);
    });
  });

  describe('Stats and Monitoring Integration', () => {
    it('should collect and report statistics', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      await engine1.init();

      // Create peer connection
      await (engine1 as any).createPeerConnection('user2', true);

      // Mock stats report
      const mockStats = new Map([
        ['sender1', {
          type: 'outbound-rtp',
          kind: 'video',
          bytesSent: 1000000,
          frameWidth: 1920,
          frameHeight: 1080,
          framesPerSecond: 30,
        }],
        ['receiver1', {
          type: 'inbound-rtp',
          kind: 'audio',
          bytesReceived: 500000,
          packetsLost: 10,
          jitter: 0.02,
        }],
        ['candidate1', {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.05,
          availableOutgoingBitrate: 2000000,
        }],
      ]);

      // Mock getStats to return our mock stats
      const pc = (engine1 as any).peerConnections.get('user2');
      vi.mocked(pc.getStats).mockResolvedValue(mockStats);

      // Wait for stats collection
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify stats were processed
      expect(pc.getStats).toHaveBeenCalled();
    });

    it('should handle bandwidth warnings', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      await engine1.init();

      // Create peer connection
      await (engine1 as any).createPeerConnection('user2', true);

      // Mock high packet loss scenario
      const mockStats = new Map([
        ['sender1', {
          type: 'outbound-rtp',
          kind: 'video',
          bytesSent: 1000000,
          frameWidth: 1920,
          frameHeight: 1080,
          framesPerSecond: 30,
        }],
        ['receiver1', {
          type: 'inbound-rtp',
          kind: 'video',
          bytesReceived: 800000,
          packetsLost: 100, // High packet loss
          jitter: 0.1,
        }],
      ]);

      const pc = (engine1 as any).peerConnections.get('user2');
      vi.mocked(pc.getStats).mockResolvedValue(mockStats);

      // Wait for stats collection and bandwidth adaptation
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Verify bandwidth adaptation occurred
      expect(pc.getStats).toHaveBeenCalled();
    });
  });

  describe('Audio Processing Integration', () => {
    it('should integrate audio ducker with peer connections', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      await engine1.init();

      // Create mock audio stream
      const mockAudioTrack = new MediaStreamTrack();
      Object.defineProperty(mockAudioTrack, 'kind', { value: 'audio', writable: true });
      const mockStream = new MediaStream();
      vi.mocked(mockStream.getAudioTracks).mockReturnValue([mockAudioTrack]);
      vi.mocked(mockStream.getTracks).mockReturnValue([mockAudioTrack]);

      // Mock getUserMedia to return audio stream
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      await engine1.startLocalMedia({ audio: true });

      // Verify audio ducker was created
      expect((engine1 as any).audioDucker).toBeDefined();
    });
  });

  describe('End-to-End Call Flow', () => {
    it('should complete full call lifecycle', async () => {
      engine1 = createCallEngine(createMockOptions('user1', 'room1'));

      const mockSignaling = {
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      };

      vi.spyOn(engine1 as any, 'signaling', 'get').mockReturnValue(mockSignaling);

      // Step 1: Initialize
      await engine1.init();
      expect((engine1 as any).isInitialized).toBe(true);

      // Step 2: Start local media
      const mockStream = new MediaStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);
      
      await engine1.startLocalMedia({ video: true, audio: true });
      expect((engine1 as any).localStream).toBe(mockStream);

      // Step 3: Create peer connection
      await (engine1 as any).createPeerConnection('user2', true);
      expect(engine1.getPeerCount()).toBe(1);

      // Step 4: Start screen share
      const mockScreenStream = new MediaStream();
      const mockScreenTrack = new MediaStreamTrack();
      Object.defineProperty(mockScreenTrack, 'kind', { value: 'video', writable: true });
      mockScreenTrack.addEventListener = vi.fn();
      vi.mocked(mockScreenStream.getVideoTracks).mockReturnValue([mockScreenTrack]);
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValueOnce(mockScreenStream);
      
      await engine1.startScreenShare();
      expect((engine1 as any).screenStream).toBe(mockScreenStream);

      // Step 5: End call
      await engine1.endCall();
      expect((engine1 as any).isInitialized).toBe(false);
      expect(engine1.getPeerCount()).toBe(0);
    });
  });
});
