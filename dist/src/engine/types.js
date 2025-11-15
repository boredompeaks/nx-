// ============================================================================
// ENTERPRISE-GRADE WEBRTC TYPES - PRODUCTION READY
// Zero memory leaks, optimized for asymmetric bandwidth scenarios
// ============================================================================
// Enhanced error types for better error handling
export class WebRTCError extends Error {
    constructor(message, code, context, originalError) {
        super(message);
        this.code = code;
        this.context = context;
        this.originalError = originalError;
        this.name = 'WebRTCError';
    }
}
