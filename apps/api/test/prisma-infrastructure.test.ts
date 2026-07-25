import { describe, expect, it } from 'vitest';
import { PrismaModule } from '../src/common/prisma/prisma.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('prisma infrastructure', () => {
  it('exposes a Prisma service provider without eager database access', () => {
    const service = new PrismaService();

    expect(PrismaModule).toBeDefined();
    expect(service).toHaveProperty('$connect');
    expect(service).toHaveProperty('$disconnect');
    expect(typeof service.$transaction).toBe('function');
  });
});
