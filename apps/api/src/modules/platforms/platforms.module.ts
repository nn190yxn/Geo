import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { AI_PLATFORM_ADAPTERS, AIPlatformAdapterRegistry, createDefaultAIPlatformAdapters } from './adapters/ai-platform-adapter.registry';
import { BROWSER_CONNECTORS, BrowserConnectorRegistry, createDefaultBrowserConnectors } from './browser-connectors/browser-connector.registry';
import { PlatformsController } from './platforms.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [PlatformsController],
  providers: [
    {
      provide: AI_PLATFORM_ADAPTERS,
      useFactory: createDefaultAIPlatformAdapters
    },
    {
      provide: BROWSER_CONNECTORS,
      useFactory: createDefaultBrowserConnectors
    },
    BrowserConnectorRegistry,
    AIPlatformAdapterRegistry
  ],
  exports: [AI_PLATFORM_ADAPTERS, AIPlatformAdapterRegistry, BROWSER_CONNECTORS, BrowserConnectorRegistry]
})
export class PlatformsModule {}
