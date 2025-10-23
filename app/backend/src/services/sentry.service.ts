import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  serverName?: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  beforeSend?: (event: Sentry.Event, hint: Sentry.EventHint) => Promise<Sentry.Event | null>;
  beforeBreadcrumb?: (breadcrumb: Sentry.Breadcrumb) => Sentry.Breadcrumb | null;
}

export class SentryService {
  private config: SentryConfig;

  constructor() {
    this.config = {
      dsn: config.SENTRY_DSN || '',
      environment: config.NODE_ENV || 'development',
      release: config.SENTRY_RELEASE || process.env.npm_package_version || '1.0.0',
      serverName: config.SENTRY_SERVER_NAME || 'hotel-extranet-backend',
      tracesSampleRate: parseFloat(config.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      profilesSampleRate: parseFloat(config.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      beforeSend: this.beforeSend.bind(this),
      beforeBreadcrumb: this.beforeBreadcrumb.bind(this)
    };
  }

  initialize(): void {
    if (!this.config.dsn) {
      logger.warn('Sentry DSN not configured, error tracking disabled');
      return;
    }

    try {
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        serverName: this.config.serverName,
        tracesSampleRate: this.config.tracesSampleRate,
        profilesSampleRate: this.config.profilesSampleRate,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Console(),
          new Sentry.Integrations.OnUncaughtException(),
          new Sentry.Integrations.OnUnhandledRejection(),
          new ProfilingIntegration()
        ],
        beforeSend: this.config.beforeSend,
        beforeBreadcrumb: this.config.beforeBreadcrumb,
        // Capture console logs as breadcrumbs
        captureConsole: true,
        // Performance monitoring
        enableTracing: true,
        // Error context
        attachStacktrace: true,
        // Max breadcrumbs
        maxBreadcrumbs: 100,
        // Request timeout
        transportOptions: {
          timeout: 5000
        }
      });

      // Set user context for error tracking
      Sentry.setUser({
        id: 'system',
        environment: this.config.environment
      });

      logger.info('Sentry error tracking initialized', {
        dsn: this.config.dsn.substring(0, 20) + '...',
        environment: this.config.environment,
        tracesSampleRate: this.config.tracesSampleRate
      });
    } catch (error) {
      logger.error('Failed to initialize Sentry:', error);
    }
  }

  captureException(error: Error, context?: any): void {
    if (!this.config.dsn) return;

    try {
      Sentry.withScope((scope) => {
        if (context) {
          scope.setContext('additional_info', context);
        }

        // Set error level based on error type
        if (error.message.includes('database') || error.message.includes('connection')) {
          scope.setLevel('error');
        } else if (error.message.includes('validation') || error.message.includes('unauthorized')) {
          scope.setLevel('warning');
        } else {
          scope.setLevel('error');
        }

        // Add tags for better error categorization
        scope.setTag('error_type', error.name);
        scope.setTag('error_source', context?.source || 'unknown');

        if (context?.userId) {
          scope.setUser({ id: context.userId });
        }

        if (context?.tenantId) {
          scope.setTag('tenant_id', context.tenantId);
        }

        Sentry.captureException(error);
      });
    } catch (sentryError) {
      logger.error('Failed to capture Sentry exception:', sentryError);
    }
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: any): void {
    if (!this.config.dsn) return;

    try {
      Sentry.withScope((scope) => {
        if (context) {
          scope.setContext('additional_info', context);
        }

        scope.setLevel(level);
        scope.setTag('message_type', 'custom');

        if (context?.userId) {
          scope.setUser({ id: context.userId });
        }

        if (context?.tenantId) {
          scope.setTag('tenant_id', context.tenantId);
        }

        Sentry.captureMessage(message);
      });
    } catch (sentryError) {
      logger.error('Failed to capture Sentry message:', sentryError);
    }
  }

  addBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel, data?: any): void {
    if (!this.config.dsn) return;

    try {
      Sentry.addBreadcrumb({
        message,
        category: category || 'custom',
        level: level || 'info',
        data: data || {},
        timestamp: Date.now() / 1000
      });
    } catch (sentryError) {
      logger.error('Failed to add Sentry breadcrumb:', sentryError);
    }
  }

  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!this.config.dsn) return;

    try {
      Sentry.setUser(user);
    } catch (sentryError) {
      logger.error('Failed to set Sentry user:', sentryError);
    }
  }

  setTag(key: string, value: string): void {
    if (!this.config.dsn) return;

    try {
      Sentry.setTag(key, value);
    } catch (sentryError) {
      logger.error('Failed to set Sentry tag:', sentryError);
    }
  }

  setContext(key: string, context: any): void {
    if (!this.config.dsn) return;

    try {
      Sentry.setContext(key, context);
    } catch (sentryError) {
      logger.error('Failed to set Sentry context:', sentryError);
    }
  }

  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.config.dsn) return true;

    try {
      await Sentry.flush(timeout);
      return true;
    } catch (error) {
      logger.error('Failed to flush Sentry events:', error);
      return false;
    }
  }

  private beforeSend(event: Sentry.Event, hint: Sentry.EventHint): Promise<Sentry.Event | null> {
    // Filter out sensitive information
    if (event.exception) {
      event.exception.values = event.exception.values?.map(exception => {
        if (exception.stacktrace?.frames) {
          exception.stacktrace.frames = exception.stacktrace.frames.map(frame => {
            // Remove sensitive data from stack frames
            if (frame.vars) {
              delete frame.vars;
            }
            return frame;
          });
        }
        return exception;
      });
    }

    // Filter out known non-critical errors
    if (event.exception?.values?.[0]?.value) {
      const errorMessage = event.exception.values[0].value.toLowerCase();

      // Don't report client-side errors
      if (errorMessage.includes('network error') && errorMessage.includes('fetch')) {
        return Promise.resolve(null);
      }

      // Don't report validation errors unless they're server-side
      if (errorMessage.includes('validation') && !errorMessage.includes('database')) {
        return Promise.resolve(null);
      }
    }

    // Add additional context
    event.tags = {
      ...event.tags,
      environment: this.config.environment,
      server_name: this.config.serverName
    };

    return Promise.resolve(event);
  }

  private beforeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'http' && breadcrumb.level === 'info') {
      // Only keep error HTTP requests
      return null;
    }

    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      // Reduce console noise
      return null;
    }

    return breadcrumb;
  }

  // Middleware for Express error handling
  getErrorHandler() {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Handle all errors in production
        return process.env.NODE_ENV === 'production';
      }
    });
  }

  // Middleware for request tracing
  getRequestHandler() {
    return Sentry.Handlers.requestHandler({
      ip: true,
      user: ['id', 'email'],
      tags: ['tenant_id']
    });
  }

  // Middleware for tracing
  getTracingHandler() {
    return Sentry.Handlers.tracingHandler();
  }
}

// Create singleton instance
export const sentryService = new SentryService();
