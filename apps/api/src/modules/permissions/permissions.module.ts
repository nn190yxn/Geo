import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsRepository } from './permissions.repository';
import { PERMISSIONS_REPOSITORY } from './permissions.repository.port';
import { PermissionsService } from './permissions.service';
import { PrismaPermissionsRepository } from './prisma-permissions.repository';

export const permissionsRepositoryProvider = {
  provide: PERMISSIONS_REPOSITORY,
  useFactory: (memoryRepository: PermissionsRepository, prismaRepository: PrismaPermissionsRepository) => {
    return process.env.GEO_REPOSITORY_DRIVER === 'prisma' ? prismaRepository : memoryRepository;
  },
  inject: [PermissionsRepository, PrismaPermissionsRepository]
};

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsRepository, PrismaPermissionsRepository, permissionsRepositoryProvider, PermissionsService],
  exports: [PERMISSIONS_REPOSITORY, PermissionsRepository, PrismaPermissionsRepository, PermissionsService]
})
export class PermissionsModule {}
