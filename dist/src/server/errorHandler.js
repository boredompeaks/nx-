// Custom error types
export class AppError extends Error {
    constructor(statusCode, message, isOperational = true, code) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.isOperational = isOperational;
        this.code = code;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
export class NotFoundError extends AppError {
    constructor(resource, id) {
        super(404, `${resource} ${id ? `with id ${id} ` : ''}not found`, true, 'NOT_FOUND');
    }
}
export class BadRequestError extends AppError {
    constructor(message, code) {
        super(400, message, true, code || 'BAD_REQUEST');
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', code) {
        super(401, message, true, code || 'UNAUTHORIZED');
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', code) {
        super(403, message, true, code || 'FORBIDDEN');
    }
}
export class ConflictError extends AppError {
    constructor(message, code) {
        super(409, message, true, code || 'CONFLICT');
    }
}
export class InternalServerError extends AppError {
    constructor(message = 'Internal server error', code) {
        super(500, message, true, code || 'INTERNAL_ERROR');
    }
}
// Error logging utility
function logError(error, req) {
    const timestamp = new Date().toISOString();
    const requestInfo = {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp
    };
    if (error instanceof AppError && error.isOperational) {
        console.warn(`[${timestamp}] Operational error:`, {
            ...requestInfo,
            error: {
                message: error.message,
                statusCode: error.statusCode,
                code: error.code
            }
        });
    }
    else {
        console.error(`[${timestamp}] Programming error:`, {
            ...requestInfo,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            }
        });
    }
}
// Global error handler middleware
export function errorHandler(error, req, res, _next) {
    // Log the error
    logError(error, req);
    // Handle different error types
    if (error instanceof AppError) {
        // Operational errors - send to client
        res.status(error.statusCode).json({
            error: {
                message: error.message,
                code: error.code,
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
    else if (error.name === 'ValidationError') {
        // Validation errors (from our validation middleware)
        res.status(400).json({
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
    else if (error.name === 'SyntaxError' && 'body' in error) {
        // JSON parsing errors
        res.status(400).json({
            error: {
                message: 'Invalid JSON in request body',
                code: 'INVALID_JSON',
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
    else {
        // Programming errors - don't expose details to client
        res.status(500).json({
            error: {
                message: 'An unexpected error occurred',
                code: 'INTERNAL_ERROR',
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
}
// Async error wrapper to catch errors in async route handlers
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Request timeout middleware
export function requestTimeout(timeoutMs = 30000) {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: {
                        message: 'Request timeout',
                        code: 'REQUEST_TIMEOUT',
                        timestamp: new Date().toISOString(),
                        path: req.path
                    }
                });
            }
        }, timeoutMs);
        res.on('finish', () => clearTimeout(timeout));
        res.on('close', () => clearTimeout(timeout));
        next();
    };
}
// Rate limiting error
export class RateLimitError extends AppError {
    constructor(retryAfter) {
        super(429, 'Too many requests', true, 'RATE_LIMIT');
        if (retryAfter) {
            this.message += `. Retry after ${retryAfter} seconds`;
        }
    }
}
// Database connection error
export class DatabaseError extends AppError {
    constructor(message = 'Database operation failed') {
        super(503, message, true, 'DATABASE_ERROR');
    }
}
// External service error
export class ExternalServiceError extends AppError {
    constructor(service, message) {
        super(503, message || `${service} service unavailable`, true, 'EXTERNAL_SERVICE_ERROR');
    }
}
