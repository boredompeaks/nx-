// ============================================================================
// ENTERPRISE-GRADE STATS MONITOR - PRODUCTION READY
// Zero memory leaks, optimized for asymmetric bandwidth scenarios
// ============================================================================
import { WebRTCError } from './types';
export class StatsMonitor {
    constructor(pc, onUpdate) {
        this.intervalId = null;
        this.lastStats = new Map();
        this.lastTimestamp = 0;
        this.running = false;
        this.MAX_STATS_AGE = 60000; // 1 minute
        this.MIN_UPDATE_INTERVAL = 100; // 100ms minimum
        if (!pc || typeof pc.getStats !== 'function') {
            throw new WebRTCError('Invalid RTCPeerConnection provided', 'INVALID_PEER_CONNECTION', 'StatsMonitor.constructor');
        }
        if (typeof onUpdate !== 'function') {
            throw new WebRTCError('onUpdate must be a function', 'INVALID_CALLBACK', 'StatsMonitor.constructor');
        }
        this.pc = pc;
        this.onUpdate = onUpdate;
    }
    start(interval = 1000) {
        if (this.running) {
            console.warn('StatsMonitor is already running');
            return;
        }
        if (interval < this.MIN_UPDATE_INTERVAL) {
            console.warn(`Interval too small, using minimum ${this.MIN_UPDATE_INTERVAL}ms`);
            interval = this.MIN_UPDATE_INTERVAL;
        }
        this.stop();
        this.running = true;
        this.intervalId = window.setInterval(async () => {
            await this.collectStats();
        }, interval);
        if (this.pc && this.pc.addEventListener) {
            this.pc.addEventListener('connectionstatechange', () => {
                if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'disconnected' || this.pc.connectionState === 'closed') {
                    this.stop();
                }
            });
        }
    }
    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.lastStats.clear();
        this.lastTimestamp = 0;
        this.running = false;
    }
    async collectStats() {
        try {
            if (!this.pc || this.pc.connectionState === 'closed' || this.pc.connectionState === 'failed' || this.pc.connectionState === 'disconnected') {
                this.stop();
                return;
            }
            const stats = await this.pc.getStats();
            const report = this.parseStats(stats);
            // Validate report before sending
            if (this.isValidStatsReport(report)) {
                this.onUpdate(report);
            }
            else {
                console.warn('Invalid stats report generated, skipping update');
            }
        }
        catch (error) {
            console.error('Stats collection failed:', error instanceof Error ? error.message : 'Unknown error');
            // Stop on persistent errors
            if (error instanceof Error && (error.message.includes('closed') || error.message.includes('failed'))) {
                this.stop();
            }
        }
    }
    isValidStatsReport(report) {
        if (!report || typeof report !== 'object') {
            return false;
        }
        // Check required fields
        if (typeof report.timestamp !== 'number' || report.timestamp <= 0) {
            return false;
        }
        if (!report.bitrate || typeof report.bitrate !== 'object') {
            return false;
        }
        if (!report.bitrate.video || !report.bitrate.audio) {
            return false;
        }
        if (typeof report.packetLoss !== 'number' || report.packetLoss < 0) {
            return false;
        }
        if (typeof report.jitter !== 'number' || report.jitter < 0) {
            return false;
        }
        if (typeof report.rtt !== 'number' || report.rtt < 0) {
            return false;
        }
        if (!report.bandwidth || typeof report.bandwidth !== 'object') {
            return false;
        }
        return true;
    }
    parseStats(stats) {
        const now = Date.now();
        const timeDelta = this.lastTimestamp ? (now - this.lastTimestamp) / 1000 : 1;
        this.lastTimestamp = now;
        const report = {
            timestamp: now,
            bitrate: {
                video: { send: 0, receive: 0 },
                audio: { send: 0, receive: 0 },
            },
            packetLoss: 0,
            jitter: 0,
            rtt: 0,
            bandwidth: { available: 0, used: 0 },
        };
        let totalPacketsLost = 0;
        let totalPacketsReceived = 0;
        stats.forEach((stat) => {
            if (stat.type === 'outbound-rtp') {
                this.processOutboundRtp(stat, report, timeDelta);
            }
            else if (stat.type === 'inbound-rtp') {
                this.processInboundRtp(stat, report, timeDelta, { totalPacketsLost, totalPacketsReceived });
            }
            else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                this.processCandidatePair(stat, report);
            }
        });
        // Calculate overall packet loss rate
        if (totalPacketsReceived + totalPacketsLost > 0) {
            report.packetLoss = totalPacketsLost / (totalPacketsReceived + totalPacketsLost);
        }
        report.bandwidth.used =
            report.bitrate.video.send +
                report.bitrate.audio.send +
                report.bitrate.video.receive +
                report.bitrate.audio.receive;
        return report;
    }
    processOutboundRtp(stat, report, timeDelta) {
        try {
            const bytesSent = stat.bytesSent || 0;
            const lastBytes = this.lastStats.get(`${stat.id}-bytes`) || bytesSent;
            const bitrate = ((bytesSent - lastBytes) * 8) / timeDelta;
            this.lastStats.set(`${stat.id}-bytes`, bytesSent);
            if (stat.kind === 'video') {
                report.bitrate.video.send = Math.max(0, bitrate);
                if (stat.frameWidth && stat.frameHeight) {
                    report.resolution = {
                        width: stat.frameWidth,
                        height: stat.frameHeight
                    };
                }
                if (stat.framesPerSecond) {
                    report.fps = Math.max(0, stat.framesPerSecond);
                }
            }
            else if (stat.kind === 'audio') {
                report.bitrate.audio.send = Math.max(0, bitrate);
            }
        }
        catch (error) {
            console.warn('Error processing outbound RTP stats:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    processInboundRtp(stat, report, timeDelta, packetStats) {
        try {
            const bytesReceived = stat.bytesReceived || 0;
            const lastBytes = this.lastStats.get(`${stat.id}-bytes`) || bytesReceived;
            const bitrate = ((bytesReceived - lastBytes) * 8) / timeDelta;
            this.lastStats.set(`${stat.id}-bytes`, bytesReceived);
            if (stat.kind === 'video') {
                report.bitrate.video.receive = Math.max(0, bitrate);
                report.codec = stat.mimeType || 'unknown';
            }
            else if (stat.kind === 'audio') {
                report.bitrate.audio.receive = Math.max(0, bitrate);
            }
            // Track packet loss
            if (stat.packetsLost) {
                packetStats.totalPacketsLost += stat.packetsLost;
            }
            if (stat.packetsReceived) {
                packetStats.totalPacketsReceived += stat.packetsReceived;
            }
            report.jitter = Math.max(report.jitter, stat.jitter || 0);
        }
        catch (error) {
            console.warn('Error processing inbound RTP stats:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    processCandidatePair(stat, report) {
        try {
            report.rtt = Math.max(0, (stat.currentRoundTripTime || 0) * 1000); // Convert to ms
            report.bandwidth.available = Math.max(0, stat.availableOutgoingBitrate || 0);
        }
        catch (error) {
            console.warn('Error processing candidate pair stats:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * Get current running state
     */
    isRunning() {
        return this.running;
    }
    /**
     * Get the last collected stats (for debugging)
     */
    getLastStats() {
        return new Map(this.lastStats);
    }
}
