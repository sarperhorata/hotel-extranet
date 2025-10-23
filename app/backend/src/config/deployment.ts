import { config } from './env';

export interface DeploymentConfig {
  platform: 'render' | 'railway' | 'heroku' | 'local';
  environment: 'development' | 'staging' | 'production';
  database: {
    url: string;
    ssl: boolean;
    poolSize: number;
  };
  redis: {
    url: string;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
  };
  email: {
    provider: string;
    apiKey: string;
    fromEmail: string;
  };
  storage: {
    provider: 'aws' | 'cloudinary' | 'local';
    config: any;
  };
  monitoring: {
    uptimeRobot: {
      apiKey: string;
      enabled: boolean;
    };
    sentry: {
      dsn: string;
      enabled: boolean;
    };
  };
  security: {
    cors: {
      origin: string[];
      credentials: boolean;
    };
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
}

export const getDeploymentConfig = (): DeploymentConfig => {
  const environment = config.NODE_ENV as 'development' | 'staging' | 'production';
  
  return {
    platform: (config.DEPLOYMENT_PLATFORM as any) || 'local',
    environment,
    database: {
      url: config.DATABASE_URL,
      ssl: environment === 'production',
      poolSize: environment === 'production' ? 20 : 5
    },
    redis: {
      url: config.REDIS_URL || `redis://${config.REDIS_HOST}:${config.REDIS_PORT}/${config.REDIS_DB}`,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100
    },
    email: {
      provider: 'resend',
      apiKey: config.RESEND_API_KEY || '',
      fromEmail: config.FROM_EMAIL || 'noreply@hotel-extranet.com'
    },
    storage: {
      provider: (config.STORAGE_PROVIDER as any) || 'local',
      config: {
        aws: {
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
          region: config.AWS_REGION,
          bucket: config.AWS_S3_BUCKET
        },
        cloudinary: {
          cloudName: config.CLOUDINARY_CLOUD_NAME,
          apiKey: config.CLOUDINARY_API_KEY,
          apiSecret: config.CLOUDINARY_API_SECRET
        }
      }
    },
    monitoring: {
      uptimeRobot: {
        apiKey: config.UPTIMEROBOT_API_KEY || '',
        enabled: !!config.UPTIMEROBOT_API_KEY
      },
      sentry: {
        dsn: config.SENTRY_DSN || '',
        enabled: !!config.SENTRY_DSN
      }
    },
    security: {
      cors: {
        origin: environment === 'production' 
          ? [config.FRONTEND_URL || 'https://hotel-extranet.netlify.app']
          : ['http://localhost:3000', 'http://localhost:5173'],
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: environment === 'production' ? 100 : 1000
      }
    }
  };
};

export const getRenderConfig = () => {
  return {
    name: 'hotel-extranet-backend',
    env: 'node',
    plan: 'starter',
    buildCommand: 'npm install && npm run build',
    startCommand: 'npm start',
    envVars: [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'PORT', value: '10000' },
      { key: 'DATABASE_URL', value: 'postgresql://user:pass@host:port/db' },
      { key: 'REDIS_URL', value: 'redis://host:port' },
      { key: 'JWT_SECRET', value: 'your-jwt-secret' },
      { key: 'JWT_REFRESH_SECRET', value: 'your-refresh-secret' },
      { key: 'RESEND_API_KEY', value: 'your-resend-key' },
      { key: 'AWS_ACCESS_KEY_ID', value: 'your-aws-key' },
      { key: 'AWS_SECRET_ACCESS_KEY', value: 'your-aws-secret' },
      { key: 'UPTIMEROBOT_API_KEY', value: 'your-uptimerobot-key' }
    ]
  };
};

export const getRailwayConfig = () => {
  return {
    name: 'hotel-extranet-backend',
    source: {
      repo: 'your-repo/hotel-extranet',
      branch: 'main'
    },
    build: {
      builder: 'nixpacks',
      buildCommand: 'npm install && npm run build'
    },
    deploy: {
      startCommand: 'npm start',
      healthcheckPath: '/api/v1/monitoring/health'
    },
    variables: {
      NODE_ENV: 'production',
      PORT: '10000',
      DATABASE_URL: 'postgresql://user:pass@host:port/db',
      REDIS_URL: 'redis://host:port',
      JWT_SECRET: 'your-jwt-secret',
      JWT_REFRESH_SECRET: 'your-refresh-secret'
    }
  };
};

export const getHerokuConfig = () => {
  return {
    name: 'hotel-extranet-backend',
    stack: 'heroku-22',
    buildpacks: [
      'heroku/nodejs'
    ],
    config: {
      NODE_ENV: 'production',
      NPM_CONFIG_PRODUCTION: 'true',
      NODE_MODULES_CACHE: 'true'
    },
    addons: [
      { plan: 'heroku-postgresql:mini' },
      { plan: 'heroku-redis:mini' }
    ],
    formation: {
      web: { quantity: 1, size: 'basic' }
    }
  };
};

export const getNetlifyConfig = () => {
  return {
    name: 'hotel-extranet-frontend',
    build: {
      command: 'npm run build',
      publish: 'dist',
      functions: 'netlify/functions'
    },
    redirects: [
      { from: '/api/*', to: '/.netlify/functions/:splat', status: 200 }
    ],
    headers: [
      { for: '/*', values: { 'X-Frame-Options': 'DENY' } },
      { for: '/*', values: { 'X-XSS-Protection': '1; mode=block' } },
      { for: '/*', values: { 'X-Content-Type-Options': 'nosniff' } }
    ],
    environment: {
      NODE_ENV: 'production',
      VITE_API_URL: 'https://your-backend-url.com/api/v1'
    }
  };
};

export const getVercelConfig = () => {
  return {
    name: 'hotel-extranet-frontend',
    framework: 'vite',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install',
    devCommand: 'npm run dev',
    env: {
      NODE_ENV: 'production',
      VITE_API_URL: 'https://your-backend-url.com/api/v1'
    }
  };
};

export const getDockerConfig = () => {
  return {
    backend: {
      image: 'node:18-alpine',
      workingDir: '/app',
      copy: [
        'package*.json ./',
        'src ./src',
        'tsconfig.json ./',
        'jest.config.js ./'
      ],
      run: [
        'npm ci --only=production',
        'npm run build'
      ],
      expose: [5000],
      cmd: ['npm', 'start']
    },
    frontend: {
      image: 'node:18-alpine',
      workingDir: '/app',
      copy: [
        'package*.json ./',
        'src ./src',
        'index.html ./',
        'vite.config.ts ./'
      ],
      run: [
        'npm ci',
        'npm run build'
      ],
      expose: [3000],
      cmd: ['npm', 'run', 'preview']
    },
    nginx: {
      image: 'nginx:alpine',
      copy: [
        'nginx.conf /etc/nginx/nginx.conf'
      ],
      expose: [80, 443],
      dependsOn: ['backend', 'frontend']
    }
  };
};

export const getEnvironmentVariables = () => {
  return {
    required: [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ],
    optional: [
      'REDIS_URL',
      'RESEND_API_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'UPTIMEROBOT_API_KEY',
      'SENTRY_DSN',
      'STRIPE_SECRET_KEY',
      'PAYPAL_CLIENT_ID',
      'ADYEN_API_KEY'
    ],
    development: [
      'LOG_LEVEL',
      'UPLOAD_PATH',
      'CORS_ORIGIN'
    ],
    production: [
      'SSL_CERT_PATH',
      'SSL_KEY_PATH',
      'DOMAIN',
      'CDN_URL'
    ]
  };
};
