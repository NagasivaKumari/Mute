import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { SecretsModule } from '../secrets/secrets.module';

@Module({
  imports: [SecretsModule],
  controllers: [FilesController],
})
export class FilesModule {}
