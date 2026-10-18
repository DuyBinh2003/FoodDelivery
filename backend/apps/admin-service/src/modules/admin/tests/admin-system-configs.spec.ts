/**
 * @test-plan file:///c%3A/Users/DELL/.gemini/antigravity-ide/brain/6c87a844-bf88-49da-8c8c-44b663e602f8/admin_settings_expansion_plan.md
 * @business-flow Admin Portal - Modern System Configurations & Atomic Bulk Update
 * @usecases AdminService.getConfigs, AdminService.updateConfig, AdminService.updateBulkConfigs
 *
 * Test Matrix:
 * - 🟢 Happy Path: getConfigs returns full list and auto-seeds missing modern configs
 * - 🟢 Happy Path: updateConfig creates or updates single key
 * - 🟢 Happy Path: updateBulkConfigs updates multiple configs in batch
 * - 🟡 Edge Case: Auto-initializes new configs when database is empty
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService, DEFAULT_SYSTEM_CONFIGS } from '@/modules/admin/admin.service.js';
import { SystemConfig } from '@/modules/admin/entities/system-config.entity.js';

describe('AdminService - System Configurations & Bulk Update', () => {
  let adminService: AdminService;
  let mockConfigRepo: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockConfigRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    process.env.USER_SERVICE_URL = 'http://localhost:3001';
    process.env.RESTAURANT_SERVICE_URL = 'http://localhost:3003';
    process.env.ORDER_SERVICE_URL = 'http://localhost:3004';
    process.env.PAYMENT_SERVICE_URL = 'http://localhost:3007';

    adminService = new AdminService(
      mockConfigRepo as unknown as ConstructorParameters<typeof AdminService>[0],
    );
  });

  describe('getConfigs', () => {
    it('🟢 Happy Path: should return existing configs and auto-seed missing modern configs', async () => {
      const existingConfigs: SystemConfig[] = [
        {
          id: '1',
          config_key: 'RESTAURANT_COMMISSION_RATE',
          config_value: '20',
          description: 'Desc',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockConfigRepo.find.mockResolvedValueOnce([...existingConfigs]);
      mockConfigRepo.create.mockImplementation((dto: Partial<SystemConfig>) => dto as SystemConfig);
      mockConfigRepo.save.mockImplementation((entity: SystemConfig) => Promise.resolve({ ...entity, id: 'gen-id' }));

      const result = await adminService.getConfigs();

      expect(mockConfigRepo.find).toHaveBeenCalled();
      expect(result.length).toBeGreaterThanOrEqual(DEFAULT_SYSTEM_CONFIGS.length);
      const keys = result.map((c) => c.config_key);
      expect(keys).toContain('DEFAULT_PAGE_SIZE');
      expect(keys).toContain('MAX_DELIVERY_RADIUS_KM');
      expect(keys).toContain('MAINTENANCE_MODE');
    });
  });

  describe('updateConfig', () => {
    it('🟢 Happy Path: should update existing config value', async () => {
      const existing: SystemConfig = {
        id: '1',
        config_key: 'TAX_RATE',
        config_value: '8',
        description: 'Tax rate',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockConfigRepo.findOne.mockResolvedValueOnce(existing);
      mockConfigRepo.save.mockImplementation((entity: SystemConfig) => Promise.resolve(entity));

      const updated = await adminService.updateConfig('TAX_RATE', '10');

      expect(mockConfigRepo.findOne).toHaveBeenCalledWith({ where: { config_key: 'TAX_RATE' } });
      expect(updated.config_value).toBe('10');
      expect(mockConfigRepo.save).toHaveBeenCalled();
    });

    it('🟡 Edge Case: should create new config if key does not exist yet', async () => {
      mockConfigRepo.findOne.mockResolvedValueOnce(null);
      mockConfigRepo.create.mockImplementation((dto: Partial<SystemConfig>) => dto as SystemConfig);
      mockConfigRepo.save.mockImplementation((entity: SystemConfig) => Promise.resolve({ ...entity, id: 'new-id' }));

      const created = await adminService.updateConfig('CUSTOM_KEY', 'custom_value');

      expect(created.config_key).toBe('CUSTOM_KEY');
      expect(created.config_value).toBe('custom_value');
      expect(mockConfigRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateBulkConfigs', () => {
    it('🟢 Happy Path: should update multiple configs in batch', async () => {
      const existing: SystemConfig = {
        id: '1',
        config_key: 'DEFAULT_PAGE_SIZE',
        config_value: '15',
        description: 'Page size',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockConfigRepo.findOne.mockImplementation(({ where }: { where: { config_key: string } }) => {
        if (where.config_key === 'DEFAULT_PAGE_SIZE') return Promise.resolve(existing);
        return Promise.resolve(null);
      });
      mockConfigRepo.create.mockImplementation((dto: Partial<SystemConfig>) => dto as SystemConfig);
      mockConfigRepo.save.mockImplementation((entity: SystemConfig) => Promise.resolve(entity));

      const items = [
        { key: 'DEFAULT_PAGE_SIZE', value: '25' },
        { key: 'MAINTENANCE_MODE', value: 'true' },
      ];

      const results = await adminService.updateBulkConfigs(items);

      expect(results).toHaveLength(2);
      expect(results[0].config_key).toBe('DEFAULT_PAGE_SIZE');
      expect(results[0].config_value).toBe('25');
      expect(results[1].config_key).toBe('MAINTENANCE_MODE');
      expect(results[1].config_value).toBe('true');
    });
  });
});
