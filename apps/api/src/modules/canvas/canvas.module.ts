import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { CanvasController } from './canvas.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [CanvasController]
})
export class CanvasModule {}
