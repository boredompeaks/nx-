// WebRTC Statistics Monitoring and Reporting
import { STATS_INTERVAL } from './constants';
export class StatsMonitor {
    constructor(pc, onUpdate) {
        this.intervalId = null;
        this.lastStats = new Map();
        this.lastTimestamp = 0;
        this.isMonitoring = false;
        this.MIN_INTERVAL = 100; // Minimum 100ms between updates
        this.MAX_HISTORY_SIZE = 1000; // Maximum stats history entries
        if (!pc) {
            throw new Error('RTCPeerConnection is required');
        }
        if (pc.connectionState === 'closed') {
            throw new Error('Cannot monitor closed peer connection');
        }
        if (typeof onUpdate !== 'function') {
            throw new Error('Update callback must be a function');
        }
        this.pc = pc;
        this.onUpdate = onUpdate;
    }
    start(interval = STATS_INTERVAL) {
        if (this.isMonitoring) {
            console.warn('Stats monitor already running');
            return;
        }
        if (interval < this.MIN_INTERVAL) {
            console.warn(`Interval too small, using minimum ${this.MIN_INTERVAL}ms`);
            interval = this.MIN_INTERVAL;
        }
        this.stop(); // Ensure no duplicate intervals
        this.isMonitoring = true;
        this.intervalId = window.setInterval(async () => {
            await this.collectStats();
        }, interval);
        // Add connection state listener to auto-stop on connection failure
        if (this.pc && this.pc.addEventListener) {
            this.pc.addEventListener('connectionstatechange', () => {
                if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'closed') {
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
        this.isMonitoring = false;
        this.lastTimestamp = 0;
    }
    async collectStats() {
        // Check if peer connection is still valid
        if (!this.pc || this.pc.connectionState === 'closed' || this.pc.connectionState === 'failed') {
            console.warn('Peer connection invalid, stopping stats collection');
            this.stop();
            return;
        }
        try {
            const stats = await this.pc.getStats();
            const report = this.parseStats(stats);
            // Validate report before sending
            if (this.validateStatsReport(report)) {
                this.onUpdate(report);
            }
            else {
                console.warn('Invalid stats report generated');
            }
        }
        catch (error) {
            console.error('Stats collection failed:', error);
            // Stop monitoring on persistent errors
            if (error instanceof Error && (error.message.includes('closed') || error.message.includes('failed'))) {
                this.stop();
            }
        }
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
        try {
            stats.forEach((stat) => {
                this.processStatEntry(stat, report, timeDelta);
            });
            // Calculate total bandwidth usage
            report.bandwidth.used =
                report.bitrate.video.send +
                    report.bitrate.audio.send +
                    report.bitrate.video.receive +
                    report.bitrate.audio.receive;
            // Manage history size
            this.manageHistorySize();
        }
        catch (error) {
            console.error('Error parsing stats:', error);
        }
        return report;
    }
    processStatEntry(stat, report, timeDelta) {
        try {
            if (stat.type === 'outbound-rtp') {
                this.processOutboundRtp(stat, report, timeDelta);
            }
            else if (stat.type === 'inbound-rtp') {
                this.processInboundRtp(stat, report, timeDelta);
            }
            else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                this.processCandidatePair(stat, report);
            }
        }
        catch (error) {
            console.error('Error processing stat entry:', error);
        }
    }
    processOutboundRtp(stat, report, timeDelta) {
        const bytesSent = stat.bytesSent || 0;
        const lastBytes = this.lastStats.get(`${stat.id}-bytes`) || bytesSent;
        const bitrate = timeDelta > 0 ? ((bytesSent - lastBytes) * 8) / timeDelta : 0;
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
    processInboundRtp(stat, report, timeDelta) {
        const bytesReceived = stat.bytesReceived || 0;
        const lastBytes = this.lastStats.get(`${stat.id}-bytes`) || bytesReceived;
        const bitrate = timeDelta > 0 ? ((bytesReceived - lastBytes) * 8) / timeDelta : 0;
        this.lastStats.set(`${stat.id}-bytes`, bytesReceived);
        if (stat.kind === 'video') {
            report.bitrate.video.receive = Math.max(0, bitrate);
            if (stat.mimeType) {
                report.codec = stat.mimeType;
            }
        }
        else if (stat.kind === 'audio') {
            report.bitrate.audio.receive = Math.max(0, bitrate);
        }
        // Accumulate packet loss
        if (stat.packetsLost) {
            report.packetLoss += Math.max(0, stat.packetsLost);
        }
        // Track maximum jitter
        if (stat.jitter) {
            report.jitter = Math.max(report.jitter, Math.max(0, stat.jitter));
        }
    }
    processCandidatePair(stat, report) {
        if (stat.currentRoundTripTime) {
            report.rtt = Math.max(0, (stat.currentRoundTripTime || 0) * 1000); // Convert to ms
        }
        if (stat.availableOutgoingBitrate) {
            report.bandwidth.available = Math.max(0, stat.availableOutgoingBitrate);
        }
    }
    validateStatsReport(report) {
        try {
            // Basic validation
            if (!report || typeof report !== 'object') {
                return false;
            }
            if (typeof report.timestamp !== 'number' || report.timestamp <= 0) {
                return false;
            }
            // Validate bitrate structure
            if (!report.bitrate || typeof report.bitrate !== 'object') {
                return false;
            }
            const { video, audio } = report.bitrate;
            if (!video || !audio ||
                typeof video.send !== 'number' || typeof video.receive !== 'number' ||
                typeof audio.send !== 'number' || typeof audio.receive !== 'number') {
                return false;
            }
            // Validate other numeric fields
            const numericFields = ['packetLoss', 'jitter', 'rtt'];
            for (const field of numericFields) {
                if (typeof report[field] !== 'number' || report[field] < 0) {
                    return false;
                }
            }
            // Validate bandwidth
            if (!report.bandwidth || typeof report.bandwidth !== 'object') {
                return false;
            }
            const { available, used } = report.bandwidth;
            if (typeof available !== 'number' || typeof used !== 'number' || available < 0 || used < 0) {
                return false;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    manageHistorySize() {
        // Keep history size under control
        if (this.lastStats.size > this.MAX_HISTORY_SIZE) {
            const entriesToRemove = this.lastStats.size - this.MAX_HISTORY_SIZE;
            const keys = Array.from(this.lastStats.keys()).slice(0, entriesToRemove);
            keys.forEach(key => this.lastStats.delete(key));
        }
    }
    getLastReport() {
        // This would require storing the last report, but for now return null
        return null;
    }
    isRunning() {
        return this.isMonitoring;
    }
    getStatsHistory() {
        return new Map(this.lastStats);
    }
}
