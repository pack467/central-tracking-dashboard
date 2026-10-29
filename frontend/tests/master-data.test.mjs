import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEED_MASTER_CLIENTS,
  SEED_MASTER_PROJECTS,
  SEED_MASTER_SYSTEMS,
} from '../app/lib/masterDataSeeds.ts';
import {
  mockAdapter,
  resetMasterDataStore,
} from '../app/services/mock-adapter.ts';

test('1. Master Data Seeds integrity', () => {
  assert.equal(SEED_MASTER_CLIENTS.length, 8, 'Must seed exactly 8 existing clients');
  assert.ok(SEED_MASTER_CLIENTS.some(c => c.id === 'tritronik'), 'Tritronik must be present in seed');
  assert.ok(SEED_MASTER_CLIENTS.some(c => c.id === 'bni'), 'BNI must be present in seed');
  assert.ok(SEED_MASTER_CLIENTS.every(c => c.id && c.name && c.code), 'All clients must have id, name, and code');
  assert.ok(SEED_MASTER_PROJECTS.every(p => p.id && p.clientId && p.name && p.code), 'All projects must have id, clientId, name, and code');
  assert.ok(SEED_MASTER_SYSTEMS.every(s => s.id && s.clientId && s.projectId && s.name), 'All systems must have id, clientId, projectId, and name');
});

test('2. Client CRUD & Unique Code Validation', async () => {
  resetMasterDataStore();

  // List
  const clients = await mockAdapter.listMasterClients();
  assert.ok(clients.length >= 8);

  // Duplicate code check (case-insensitive)
  await assert.rejects(
    async () => {
      await mockAdapter.createMasterClient({
        name: 'Duplicate Org',
        code: 'BNI', // existing in seed
        tier: 'Standard',
        picName: 'John',
        picEmail: 'john@example.com',
      });
    },
    /Kode "BNI" sudah digunakan/,
    'Must reject duplicate client code'
  );

  // Successful create
  const newClient = await mockAdapter.createMasterClient({
    name: 'Bank Mandiri Taspen',
    shortName: 'Bank Mantap',
    code: 'MNTAP',
    tier: 'Enterprise',
    picName: 'Budi Santoso',
    picEmail: 'budi@mantap.co.id',
  });
  assert.equal(newClient.code, 'MNTAP');
  assert.equal(newClient.status, 'active');
  assert.match(newClient.id, /^organization-/);

  // Update
  const updated = await mockAdapter.updateMasterClient(newClient.id, {
    name: 'Bank Mandiri Taspen Baru',
    picPhone: '+62812345678',
  });
  assert.equal(updated.name, 'Bank Mandiri Taspen Baru');
  assert.equal(updated.picPhone, '+62812345678');

  // Archive
  const archived = await mockAdapter.setMasterClientStatus(newClient.id, 'archived');
  assert.equal(archived.status, 'archived');

  // Restore
  const restored = await mockAdapter.setMasterClientStatus(newClient.id, 'active');
  assert.equal(restored.status, 'active');
});

test('3. Last Active Client Archive Guard', async () => {
  resetMasterDataStore();
  const all = await mockAdapter.listMasterClients();
  // Deactivate all except one
  for (let i = 1; i < all.length; i++) {
    await mockAdapter.setMasterClientStatus(all[i].id, 'archived');
  }

  // Attempting to archive the last active client must fail
  await assert.rejects(
    async () => {
      await mockAdapter.setMasterClientStatus(all[0].id, 'archived');
    },
    /Organisasi aktif terakhir tidak dapat/,
    'Must prevent archiving last active client'
  );
});

test('4. Project CRUD & Per-Client Code Uniqueness', async () => {
  resetMasterDataStore();

  // Successful create
  const projectA = await mockAdapter.createMasterProject({
    clientId: 'bni',
    name: 'BNI Direct Clearing',
    code: 'BNDIR',
    detail: 'Clearing settlement engine',
  });
  assert.equal(projectA.code, 'BNDIR');
  assert.equal(projectA.status, 'active');
  assert.match(projectA.id, /^project-/);

  // Duplicate code under SAME client must fail
  await assert.rejects(
    async () => {
      await mockAdapter.createMasterProject({
        clientId: 'bni',
        name: 'Another Direct Clearing',
        code: 'BNDIR',
        detail: 'Another detail',
      });
    },
    /Kode "BNDIR" sudah digunakan/,
    'Must reject duplicate project code within the same client'
  );

  // SAME code under DIFFERENT client is allowed
  const projectB = await mockAdapter.createMasterProject({
    clientId: 'mandiri',
    name: 'Mandiri Direct Clearing',
    code: 'BNDIR',
    detail: 'Mandiri engine',
  });
  assert.equal(projectB.code, 'BNDIR');
  assert.equal(projectB.clientId, 'mandiri');

  // Archive project
  const archived = await mockAdapter.setMasterProjectStatus(projectA.id, 'archived');
  assert.equal(archived.status, 'archived');

  // Restore project
  const restored = await mockAdapter.setMasterProjectStatus(projectA.id, 'active');
  assert.equal(restored.status, 'active');
});

test('5. System CRUD & Status Transitions', async () => {
  resetMasterDataStore();

  const system = await mockAdapter.createMasterSystem({
    clientId: 'bni',
    projectId: 'proj-bni-bni-mobile',
    name: 'Auth Gateway Cluster',
    status: 'active',
  });
  assert.equal(system.name, 'Auth Gateway Cluster');
  assert.equal(system.status, 'active');

  // Environment and Criticality are deprecated: a write that still carries them does not store them
  const updated = await mockAdapter.updateMasterSystem(system.id, {
    name: 'Auth Gateway Cluster 2',
    criticality: 'high',
    environment: 'DRC',
  });
  assert.equal(updated.name, 'Auth Gateway Cluster 2');
  assert.equal(updated.criticality, 'medium', 'legacy view falls back to its default, the value is not stored');
  assert.equal(updated.environment, 'Production');

  // Legacy maintenance maps to the active administrative state in v2
  const maintenance = await mockAdapter.setMasterSystemStatus(system.id, 'maintenance');
  assert.equal(maintenance.status, 'active');
});
