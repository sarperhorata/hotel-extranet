import Joi from 'joi';

// Registration validation schema
export const registerSchema = Joi.object({
  tenantName: Joi.string()
    .min(2)
    .max(255)
    .required()
    .messages({
      'string.min': 'Tenant name must be at least 2 characters',
      'string.max': 'Tenant name cannot exceed 255 characters',
      'any.required': 'Tenant name is required'
    }),
  
  tenantSlug: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-z0-9-]+$/)
    .required()
    .messages({
      'string.min': 'Tenant slug must be at least 2 characters',
      'string.max': 'Tenant slug cannot exceed 100 characters',
      'string.pattern.base': 'Tenant slug can only contain lowercase letters, numbers, and hyphens',
      'any.required': 'Tenant slug is required'
    }),
  
  tenantEmail: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid tenant email',
      'any.required': 'Tenant email is required'
    }),
  
  tenantPhone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  tenantAddress: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Address cannot exceed 500 characters'
    }),
  
  tenantCity: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'City cannot exceed 100 characters'
    }),
  
  tenantCountry: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Country cannot exceed 100 characters'
    }),
  
  adminEmail: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid admin email',
      'any.required': 'Admin email is required'
    }),
  
  adminPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Admin password is required'
    }),
  
  adminFirstName: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'First name is required',
      'string.max': 'First name cannot exceed 100 characters',
      'any.required': 'First name is required'
    }),
  
  adminLastName: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Last name is required',
      'string.max': 'Last name cannot exceed 100 characters',
      'any.required': 'Last name is required'
    })
});

// Login validation schema
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Refresh token validation schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

// Profile update validation schema
export const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'First name cannot be empty',
      'string.max': 'First name cannot exceed 100 characters'
    }),
  
  lastName: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Last name cannot be empty',
      'string.max': 'Last name cannot exceed 100 characters'
    }),
  
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  avatarUrl: Joi.string()
    .uri()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Please provide a valid URL',
      'string.max': 'Avatar URL cannot exceed 500 characters'
    })
});

// Change password validation schema
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
}).custom((value, helpers) => {
  if (value.currentPassword === value.newPassword) {
    return helpers.error('any.invalid', { message: 'New password must be different from current password' });
  }
  return value;
});

// Validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    req.body = value;
    next();
  };
};
