import { config } from '../config/env';
import { logger } from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

export interface StorageResult {
  success: boolean;
  url?: string;
  key?: string;
  filename?: string;
  size?: number;
  mimetype?: string;
  error?: string;
}

export abstract class FileStorageProvider {
  abstract uploadFile(file: FileUpload, folder?: string): Promise<StorageResult>;
  abstract deleteFile(key: string): Promise<boolean>;
  abstract getFileUrl(key: string): Promise<string>;
  abstract listFiles(prefix?: string): Promise<string[]>;
}

export class AWS S3Provider extends FileStorageProvider {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private bucket: string;

  constructor() {
    super();
    this.accessKeyId = config.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = config.AWS_SECRET_ACCESS_KEY || '';
    this.region = config.AWS_REGION || 'us-east-1';
    this.bucket = config.AWS_S3_BUCKET || '';
  }

  async uploadFile(file: FileUpload, folder: string = 'uploads'): Promise<StorageResult> {
    try {
      // Simulate AWS S3 upload (replace with actual AWS SDK implementation)
      const key = `${folder}/${Date.now()}_${file.filename}`;
      
      logger.info(`AWS S3 file uploaded: ${key}`);

      return {
        success: true,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
        key,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      logger.error(`AWS S3 upload failed for file ${file.originalname}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      // Simulate AWS S3 delete
      logger.info(`AWS S3 file deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error(`AWS S3 delete failed for key ${key}:`, error);
      return false;
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      // Simulate AWS S3 list
      logger.info(`AWS S3 listing files with prefix: ${prefix}`);
      return [];
    } catch (error) {
      logger.error(`AWS S3 list failed for prefix ${prefix}:`, error);
      return [];
    }
  }
}

export class CloudinaryProvider extends FileStorageProvider {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    super();
    this.cloudName = config.CLOUDINARY_CLOUD_NAME || '';
    this.apiKey = config.CLOUDINARY_API_KEY || '';
    this.apiSecret = config.CLOUDINARY_API_SECRET || '';
  }

  async uploadFile(file: FileUpload, folder: string = 'uploads'): Promise<StorageResult> {
    try {
      // Simulate Cloudinary upload
      const publicId = `${folder}/${Date.now()}_${file.filename}`;

      logger.info(`Cloudinary file uploaded: ${publicId}`);

      return {
        success: true,
        url: `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`,
        key: publicId,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      logger.error(`Cloudinary upload failed for file ${file.originalname}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      // Simulate Cloudinary delete
      logger.info(`Cloudinary file deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cloudinary delete failed for key ${key}:`, error);
      return false;
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${key}`;
  }

  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      // Simulate Cloudinary list
      logger.info(`Cloudinary listing files with prefix: ${prefix}`);
      return [];
    } catch (error) {
      logger.error(`Cloudinary list failed for prefix ${prefix}:`, error);
      return [];
    }
  }
}

export class LocalStorageProvider extends FileStorageProvider {
  private uploadPath: string;

  constructor() {
    super();
    this.uploadPath = config.UPLOAD_PATH || 'uploads/';
  }

  async uploadFile(file: FileUpload, folder: string = 'uploads'): Promise<StorageResult> {
    try {
      const uploadDir = path.join(this.uploadPath, folder);

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${Date.now()}_${file.filename}`;
      const filePath = path.join(uploadDir, filename);

      // Save file to local storage
      if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
      } else {
        fs.copyFileSync(file.path, filePath);
      }

      const url = `/uploads/${folder}/${filename}`;

      logger.info(`Local file uploaded: ${filePath}`);

      return {
        success: true,
        url,
        key: `${folder}/${filename}`,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      logger.error(`Local upload failed for file ${file.originalname}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadPath, key);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Local file deleted: ${filePath}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Local delete failed for key ${key}:`, error);
      return false;
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }

  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      const dirPath = path.join(this.uploadPath, prefix);

      if (!fs.existsSync(dirPath)) {
        return [];
      }

      const files = fs.readdirSync(dirPath);
      return files.map(file => path.join(prefix, file));
    } catch (error) {
      logger.error(`Local list failed for prefix ${prefix}:`, error);
      return [];
    }
  }
}

export class FileStorageFactory {
  static createProvider(providerType: 'aws' | 'cloudinary' | 'local'): FileStorageProvider {
    switch (providerType) {
      case 'aws':
        return new AWS S3Provider();
      case 'cloudinary':
        return new CloudinaryProvider();
      case 'local':
        return new LocalStorageProvider();
      default:
        throw new Error(`Unsupported file storage provider: ${providerType}`);
    }
  }
}

export class FileUploadService {
  private storage: multer.StorageEngine;
  private upload: multer.Multer;

  constructor() {
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = config.UPLOAD_PATH || 'uploads/';
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: config.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB
        files: 10 // Maximum 10 files
      },
      fileFilter: (req, file, cb) => {
        // Allow images and documents
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      }
    });
  }

  getUploadMiddleware() {
    return this.upload;
  }

  async processFile(file: FileUpload, provider: string = 'local', folder: string = 'uploads'): Promise<StorageResult> {
    const storageProvider = FileStorageFactory.createProvider(provider as any);
    return await storageProvider.uploadFile(file, folder);
  }

  async deleteFile(key: string, provider: string = 'local'): Promise<boolean> {
    const storageProvider = FileStorageFactory.createProvider(provider as any);
    return await storageProvider.deleteFile(key);
  }

  async getFileUrl(key: string, provider: string = 'local'): Promise<string> {
    const storageProvider = FileStorageFactory.createProvider(provider as any);
    return await storageProvider.getFileUrl(key);
  }

  async listFiles(prefix: string = '', provider: string = 'local'): Promise<string[]> {
    const storageProvider = FileStorageFactory.createProvider(provider as any);
    return await storageProvider.listFiles(prefix);
  }
}

export class LocalStorageProvider extends FileStorageProvider {
  private uploadPath: string;

  constructor() {
    super();
    this.uploadPath = config.UPLOAD_PATH || 'uploads/';
  }

  async uploadFile(file: FileUpload, folder: string = 'uploads'): Promise<StorageResult> {
    try {
      const uploadDir = path.join(this.uploadPath, folder);
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${Date.now()}_${file.filename}`;
      const filePath = path.join(uploadDir, filename);
      
      // Save file to local storage
      if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
      } else {
        fs.copyFileSync(file.path, filePath);
      }

      const url = `/uploads/${folder}/${filename}`;
      
      logger.info(`Local file uploaded: ${filePath}`);

      return {
        success: true,
        url,
        key: `${folder}/${filename}`,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      logger.error(`Local upload failed for file ${file.originalname}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadPath, key);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Local file deleted: ${filePath}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Local delete failed for key ${key}:`, error);
      return false;
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }

  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      const dirPath = path.join(this.uploadPath, prefix);
      
      if (!fs.existsSync(dirPath)) {
        return [];
      }

      const files = fs.readdirSync(dirPath);
      return files.map(file => path.join(prefix, file));
    } catch (error) {
      logger.error(`Local list failed for prefix ${prefix}:`, error);
      return [];
    }
  }
}

export class FileStorageFactory {
  static createProvider(providerType: 'aws' | 'cloudinary' | 'local'): FileStorageProvider {
    switch (providerType) {
      case 'aws':
        return new AWS S3Provider();
      case 'cloudinary':
        return new CloudinaryProvider();
      case 'local':
        return new LocalStorageProvider();
      default:
        throw new Error(`Unsupported file storage provider: ${providerType}`);
    }
  }
}

export class FileUploadService {
  private storage: multer.StorageEngine;
  private upload: multer.Multer;

  constructor() {
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = config.UPLOAD_PATH || 'uploads/';
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: config.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB
        files: 10 // Maximum 10 files
      },
      fileFilter: (req, file, cb) => {
        // Allow images and documents
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      }
    });
  }

  getUploadMiddleware() {
    return this.upload;
  }

  async processFile(file: FileUpload, provider: string = 'local', folder: string = 'uploads'): Promise<StorageResult> {
    const storageProvider = FileStorageFactory.createProvider(provider as any);
    return await storageProvider.uploadFile(file, folder);
  }

  async deleteFile(key: string, provider: string = 'local'): Promise<boolean> {
    const storageProvider = FileStorageFactory.createProvider(provider as any);
    return await storageProvider.deleteFile(key);
  }

  async getFileUrl(key: string, provider: string = 'local'): Promise<string> {
    const storageProvider = FileStorageFactory.createProvider(provider as any);
    return await storageProvider.getFileUrl(key);
  }

  async listFiles(prefix: string = '', provider: string = 'local'): Promise<string[]> {
    const storageProvider = FileStorageFactory.createProvider(provider as any);
    return await storageProvider.listFiles(prefix);
  }
}
