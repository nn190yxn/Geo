import { Inject, Injectable, Optional } from '@nestjs/common';
import type { BrowserConnector } from './browser-connector';
import { createDefaultBrowserConnectors } from './supported-browser-connectors';

export const BROWSER_CONNECTORS = Symbol('BROWSER_CONNECTORS');

export class BrowserConnectorSelectionError extends Error {
  readonly code = 'browser_connector_not_registered';
  readonly platformCode: string;

  constructor(platformCode: string) {
    super(`No browser connector registered for ${platformCode}`);
    this.name = 'BrowserConnectorSelectionError';
    this.platformCode = platformCode;
  }
}

@Injectable()
export class BrowserConnectorRegistry {
  constructor(@Optional() @Inject(BROWSER_CONNECTORS) private readonly connectors: BrowserConnector[] = []) {}

  listConnectors(): BrowserConnector[] {
    return [...this.connectors];
  }

  selectConnector(platformCode: string): BrowserConnector | null {
    return this.connectors.find((connector) => connector.platformCode === platformCode) ?? null;
  }

  requireConnector(platformCode: string): BrowserConnector {
    const connector = this.selectConnector(platformCode);

    if (!connector) {
      throw new BrowserConnectorSelectionError(platformCode);
    }

    return connector;
  }
}

export { createDefaultBrowserConnectors };
