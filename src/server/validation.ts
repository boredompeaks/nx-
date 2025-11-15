import { Request, Response, NextFunction } from 'express';

// Validation error class
export class ValidationError extends Error {
  constructor(public field: string, public value: any, public reason: string) {
    super(`Validation failed for field '${field}': ${reason}`);
    this.name = 'ValidationError';
  }
}

// Validation rules interface
interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

interface ValidationSchema {
  [field: string]: ValidationRule;
}

// Input sanitizer
function sanitizeInput(value: any, type?: string): any {
  if (value === null || value === undefined) return value;
  
  switch (type) {
    case 'string':
      return String(value).trim();
    case 'number':
      const num = Number(value);
      return isNaN(num) ? value : num;
    case 'boolean':
      return Boolean(value);
    default:
      return value;
  }
}

// Validation function
function validateField(field: string, value: any, rule: ValidationRule): void {
  // Required validation
  if (rule.required && (value === null || value === undefined || value === '')) {
    throw new ValidationError(field, value, 'Field is required');
  }
  
  // Skip further validation if field is not required and empty
  if (!rule.required && (value === null || value === undefined || value === '')) {
    return;
  }
  
  // Type validation
  if (rule.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      throw new ValidationError(field, value, `Expected ${rule.type}, got ${actualType}`);
    }
  }
  
  // String validations
  if (rule.type === 'string' && typeof value === 'string') {
    if (rule.minLength && value.length < rule.minLength) {
      throw new ValidationError(field, value, `Minimum length is ${rule.minLength}`);
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      throw new ValidationError(field, value, `Maximum length is ${rule.maxLength}`);
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      throw new ValidationError(field, value, 'Value does not match required pattern');
    }
  }
  
  // Number validations
  if (rule.type === 'number' && typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      throw new ValidationError(field, value, `Minimum value is ${rule.min}`);
    }
    if (rule.max !== undefined && value > rule.max) {
      throw new ValidationError(field, value, `Maximum value is ${rule.max}`);
    }
  }
  
  // Enum validation
  if (rule.enum && !rule.enum.includes(value)) {
    throw new ValidationError(field, value, `Value must be one of: ${rule.enum.join(', ')}`);
  }
  
  // Custom validation
  if (rule.custom) {
    const result = rule.custom(value);
    if (result !== true) {
      throw new ValidationError(field, value, typeof result === 'string' ? result : 'Custom validation failed');
    }
  }
}

// Main validation middleware
export function validateInput(schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const errors: ValidationError[] = [];
      const sanitized: any = {};
      
      // Validate each field in the schema
      for (const [field, rule] of Object.entries(schema)) {
        try {
          let value = data[field];
          
          // Sanitize input
          value = sanitizeInput(value, rule.type);
          
          // Validate field
          validateField(field, value, rule);
          
          // Store sanitized value
          sanitized[field] = value;
        } catch (error) {
          if (error instanceof ValidationError) {
            errors.push(error);
          } else {
            errors.push(new ValidationError(field, data[field], 'Unknown validation error'));
          }
        }
      }
      
      // Check for unknown fields (security measure)
      const allowedFields = new Set(Object.keys(schema));
      const unknownFields = Object.keys(data).filter(field => !allowedFields.has(field));
      if (unknownFields.length > 0) {
        errors.push(new ValidationError('unknown_fields', unknownFields, `Unknown fields: ${unknownFields.join(', ')}`));
      }
      
      // If there are validation errors, return detailed error response
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Input validation failed',
          details: errors.map(err => ({
            field: err.field,
            value: err.value,
            reason: err.reason
          })),
          timestamp: new Date().toISOString()
        });
      }
      
      // Replace request data with sanitized version
      req[source] = sanitized;
      
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal validation error',
        message: 'An error occurred during input validation',
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Common validation schemas with proper literal types
export const chatValidation: ValidationSchema = {
  name: {
    type: 'string',
    required: false,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
    custom: (value: string) => {
      if (value && value.trim().length === 0) return 'Name cannot be empty or whitespace only';
      return true;
    }
  },
  is_group: {
    type: 'boolean',
    required: false
  }
};

export const messageValidation: ValidationSchema = {
  chat_id: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  },
  sender_id: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  },
  content: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 10000,
    custom: (value: string) => {
      if (value.trim().length === 0) return 'Message content cannot be empty or whitespace only';
      return true;
    }
  },
  content_type: {
    type: 'string',
    required: false,
    enum: ['text', 'image', 'file', 'system']
  }
  ,
  reply_to_id: {
    type: 'string',
    required: false,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  },
  media_url: {
    type: 'string',
    required: false,
    minLength: 1,
    maxLength: 1000
  },
  disappear_after: {
    type: 'number',
    required: false,
    min: 1,
    max: 86400
  },
  disappears_at: {
    type: 'string',
    required: false,
    minLength: 10,
    maxLength: 64
  },
  is_one_time_view: {
    type: 'boolean',
    required: false
  }
};

export const reactionValidation: ValidationSchema = {
  message_id: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  },
  user_id: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  },
  emoji: {
    type: 'string',
    required: true,
    pattern: /^(?:[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE0F}]|[\u{1F3FB}-\u{1F3FF}]){1,5}$/u,
    custom: (value: string) => {
      if (value.length > 10) return 'Emoji too long (max 5 characters)';
      return true;
    }
  }
};

export const readReceiptValidation: ValidationSchema = {
  message_id: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  },
  user_id: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  }
};

export const typingValidation: ValidationSchema = {
  chat_id: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  },
  user_id: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  },
  is_typing: {
    type: 'boolean',
    required: true
  }
};

export const presenceValidation: ValidationSchema = {
  user_id: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  },
  status: {
    type: 'string',
    required: true,
    enum: ['online', 'offline', 'away']
  }
};

export const searchValidation: ValidationSchema = {
  chat_id: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50
  },
  q: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
    custom: (value: string) => {
      if (value.trim().length === 0) return 'Search query cannot be empty or whitespace only';
      return true;
    }
  }
};
