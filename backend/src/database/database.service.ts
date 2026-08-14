import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit(): void {
    this.connection.on('connected', () => {
      this.logger.log('MongoDB connected');
    });

    this.connection.on('error', (error: Error) => {
      this.logger.error(`MongoDB connection error: ${error.message}`);
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('MongoDB disconnected');
    });
  }

  isConnected(): boolean {
    return this.connection.readyState === 1;
  }

  getStatus(): 'connected' | 'disconnected' | 'connecting' {
    switch (this.connection.readyState) {
      case 1:
        return 'connected';
      case 2:
        return 'connecting';
      default:
        return 'disconnected';
    }
  }
}
