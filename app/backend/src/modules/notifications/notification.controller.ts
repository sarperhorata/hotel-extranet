import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../../utils/logger';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  validationErrorResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';
import { EmailService } from '../../services/email.service';

// Send booking confirmation email
export const sendBookingConfirmation = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { bookingId } = req.body;

  if (!bookingId) {
    return validationErrorResponse(res, ['Booking ID is required']);
  }

  // Get booking details
  const bookingResult = await query(`
    SELECT 
      b.id, b.booking_reference, b.check_in_date, b.check_out_date,
      b.adults, b.children, b.total_nights, b.total_amount, b.currency,
      b.special_requests, b.guest_info,
      p.name as property_name, p.address as property_address,
      p.phone as property_phone, p.email as property_email,
      r.name as room_type,
      p.policies->>'cancellation' as cancellation_policy
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN rooms r ON b.room_id = r.id
    WHERE b.id = $1 AND b.tenant_id = $2
  `, [bookingId, tenantId]);

  if (bookingResult.rows.length === 0) {
    return notFoundResponse(res, 'Booking not found');
  }

  const booking = bookingResult.rows[0];
  const guestInfo = booking.guest_info || {};

  const emailData = {
    guestName: guestInfo.firstName ? `${guestInfo.firstName} ${guestInfo.lastName || ''}`.trim() : 'Guest',
    bookingReference: booking.booking_reference,
    propertyName: booking.property_name,
    roomType: booking.room_type,
    checkInDate: new Date(booking.check_in_date).toLocaleDateString(),
    checkOutDate: new Date(booking.check_out_date).toLocaleDateString(),
    totalNights: booking.total_nights,
    adults: booking.adults,
    children: booking.children || 0,
    totalAmount: parseFloat(booking.total_amount),
    currency: booking.currency,
    propertyAddress: booking.property_address,
    propertyPhone: booking.property_phone,
    propertyEmail: booking.property_email,
    cancellationPolicy: booking.cancellation_policy || 'Please contact the property for cancellation policy.',
    specialRequests: booking.special_requests
  };

  const emailService = new EmailService();
  const success = await emailService.sendBookingConfirmation(emailData);

  if (success) {
    // Update booking to mark email as sent
    await query(`
      UPDATE bookings 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [bookingId]);

    logger.info(`Booking confirmation email sent for booking: ${booking.booking_reference}`);
    return successResponse(res, { bookingId, emailSent: true }, 'Booking confirmation email sent successfully');
  } else {
    return errorResponse(res, 'Failed to send booking confirmation email', 500);
  }
});

// Send password reset email
export const sendPasswordReset = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return validationErrorResponse(res, ['Email is required']);
  }

  // Get user details
  const userResult = await query(`
    SELECT u.id, u.email, u.first_name, u.last_name, t.name as tenant_name
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.email = $1 AND u.is_active = true
  `, [email]);

  if (userResult.rows.length === 0) {
    return notFoundResponse(res, 'User not found');
  }

  const user = userResult.rows[0];
  const userName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email;

  // Generate reset token (in real implementation, use proper token generation)
  const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString(); // 24 hours

  // Store reset token in database
  await query(`
    UPDATE users 
    SET password_reset_token = $1, password_reset_expires_at = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [resetToken, new Date(Date.now() + 24 * 60 * 60 * 1000), user.id]);

  const emailData = {
    userName,
    resetLink,
    expiryTime
  };

  const emailService = new EmailService();
  const success = await emailService.sendPasswordReset(emailData);

  if (success) {
    logger.info(`Password reset email sent to: ${email}`);
    return successResponse(res, { email, resetTokenSent: true }, 'Password reset email sent successfully');
  } else {
    return errorResponse(res, 'Failed to send password reset email', 500);
  }
});

// Send welcome email to new user
export const sendWelcomeEmail = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { userId } = req.body;

  if (!userId) {
    return validationErrorResponse(res, ['User ID is required']);
  }

  // Get user and tenant details
  const userResult = await query(`
    SELECT u.id, u.email, u.first_name, u.last_name, t.name as tenant_name, t.email as tenant_email
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = $1 AND u.tenant_id = $2
  `, [userId, tenantId]);

  if (userResult.rows.length === 0) {
    return notFoundResponse(res, 'User not found');
  }

  const user = userResult.rows[0];
  const userName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email;

  const emailData = {
    userName,
    tenantName: user.tenant_name,
    loginUrl: `${process.env.FRONTEND_URL}/login`,
    supportEmail: user.tenant_email || process.env.FROM_EMAIL
  };

  const emailService = new EmailService();
  const success = await emailService.sendWelcomeEmail(emailData);

  if (success) {
    logger.info(`Welcome email sent to: ${user.email}`);
    return successResponse(res, { userId, emailSent: true }, 'Welcome email sent successfully');
  } else {
    return errorResponse(res, 'Failed to send welcome email', 500);
  }
});

// Send test email
export const sendTestEmail = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return validationErrorResponse(res, ['Email is required']);
  }

  const emailService = new EmailService();
  const success = await emailService.sendTestEmail(email);

  if (success) {
    logger.info(`Test email sent to: ${email}`);
    return successResponse(res, { email, emailSent: true }, 'Test email sent successfully');
  } else {
    return errorResponse(res, 'Failed to send test email', 500);
  }
});

// Get notification settings
export const getNotificationSettings = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;

  const settingsResult = await query(`
    SELECT 
      email_notifications_enabled,
      booking_confirmation_email,
      password_reset_email,
      welcome_email,
      from_email,
      from_name
    FROM tenants
    WHERE id = $1
  `, [tenantId]);

  if (settingsResult.rows.length === 0) {
    return notFoundResponse(res, 'Tenant not found');
  }

  const settings = settingsResult.rows[0];

  return successResponse(res, {
    emailNotificationsEnabled: settings.email_notifications_enabled,
    bookingConfirmationEmail: settings.booking_confirmation_email,
    passwordResetEmail: settings.password_reset_email,
    welcomeEmail: settings.welcome_email,
    fromEmail: settings.from_email,
    fromName: settings.from_name
  }, 'Notification settings retrieved successfully');
});

// Update notification settings
export const updateNotificationSettings = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    emailNotificationsEnabled,
    bookingConfirmationEmail,
    passwordResetEmail,
    welcomeEmail,
    fromEmail,
    fromName
  } = req.body;

  await query(`
    UPDATE tenants
    SET 
      email_notifications_enabled = COALESCE($1, email_notifications_enabled),
      booking_confirmation_email = COALESCE($2, booking_confirmation_email),
      password_reset_email = COALESCE($3, password_reset_email),
      welcome_email = COALESCE($4, welcome_email),
      from_email = COALESCE($5, from_email),
      from_name = COALESCE($6, from_name),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
  `, [
    emailNotificationsEnabled,
    bookingConfirmationEmail,
    passwordResetEmail,
    welcomeEmail,
    fromEmail,
    fromName,
    tenantId
  ]);

  logger.info(`Notification settings updated for tenant: ${tenantId}`);

  return successResponse(res, {
    emailNotificationsEnabled,
    bookingConfirmationEmail,
    passwordResetEmail,
    welcomeEmail,
    fromEmail,
    fromName
  }, 'Notification settings updated successfully');
});