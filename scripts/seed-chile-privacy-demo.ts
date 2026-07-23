/**
 * Seed Chile Privacy SaaS demo:
 * - 1 platform admin (thin)
 * - 1 law cabinet with 2 client companies
 * - Cabinet admin (showcase login)
 * - Client user (DSARs / company side)
 * - Sample DSAR + partial questionnaire answers
 *
 * Usage:
 *   USE_LOCAL_STORAGE=true TEST_MODE=true npx tsx scripts/seed-chile-privacy-demo.ts
 */

import { connectDBLocal } from '../lib/mongodb-local';
import { hashPassword } from '../lib/auth';
import Cabinet, { UserRole } from '../models/Cabinet';
import Client from '../models/Client';
import User from '../models/User';
import DataSubjectRequest from '../models/DataSubjectRequest';
import { RegulationType } from '../lib/regulations';
import { createChileanPrivacyArticleQuestionnaire } from './create-chilean-privacy-article-questionnaire';

export const DEMO_ACCOUNTS = {
  platform: {
    email: 'platform@nexus.privacy',
    password: 'DemoPlatform2026!',
    name: 'Nexus Platform Admin',
  },
  cabinet: {
    email: 'demo@nexus.privacy',
    password: 'DemoCabinet2026!',
    name: 'María González',
  },
  client: {
    email: 'cliente@retaildemo.cl',
    password: 'DemoClient2026!',
    name: 'Carlos Pérez',
  },
};

async function upsertUser(data: Record<string, any>) {
  const existing = await User.findOne({ email: data.email });
  const password = await hashPassword(data.password);
  if (existing) {
    return User.findOneAndUpdate(
      { email: data.email },
      { ...data, password },
      { new: true }
    );
  }
  return User.create({ ...data, password });
}

export async function seedChilePrivacyDemo() {
  await connectDBLocal();
  console.log('\n🌱 Seeding Chile Privacy SaaS demo…\n');

  // Ensure article questionnaire exists
  try {
    await createChileanPrivacyArticleQuestionnaire({ replaceExisting: false });
  } catch (e: any) {
    console.warn('Questionnaire seed skipped:', e.message);
  }

  // Cabinet
  let cabinet = await Cabinet.findOne({ slug: 'estudio-demo-chile' });
  if (!cabinet) {
    cabinet = await Cabinet.create({
      name: 'Estudio Jurídico Demo Chile',
      description: 'Cabinet demo para showcase Nexus Privacy (Ley 21.719)',
      slug: 'estudio-demo-chile',
    });
    console.log('✅ Cabinet:', cabinet.name);
  } else {
    console.log('↻ Cabinet exists:', cabinet.name);
  }
  const cabinetId = String(cabinet._id);

  // Clients
  async function ensureClient(clientId: string, name: string, industry: string) {
    let c = await Client.findOne({ clientId });
    if (!c) {
      c = await Client.create({
        clientId,
        name,
        industry,
        description: `Cliente demo — ${name}`,
        cabinetId,
      });
      console.log('✅ Client:', name, `(${clientId})`);
    } else {
      console.log('↻ Client exists:', name);
    }
    return c;
  }

  const clientA = await ensureClient('CLI-RETAIL-DEMO', 'Retail Demo SpA', 'Retail');
  const clientB = await ensureClient('CLI-FINTECH-DEMO', 'Fintech Andes SpA', 'Fintech');

  // Users
  await upsertUser({
    email: DEMO_ACCOUNTS.platform.email,
    password: DEMO_ACCOUNTS.platform.password,
    name: DEMO_ACCOUNTS.platform.name,
    company: 'Nexus',
    role: UserRole.PLATFORM_ADMIN,
    permissions: {
      canAccessRuleEngine: true,
      canEditRuleEngine: true,
      isCabinetAdmin: false,
    },
  });
  console.log('✅ Platform admin:', DEMO_ACCOUNTS.platform.email);

  await upsertUser({
    email: DEMO_ACCOUNTS.cabinet.email,
    password: DEMO_ACCOUNTS.cabinet.password,
    name: DEMO_ACCOUNTS.cabinet.name,
    company: 'Estudio Jurídico Demo Chile',
    role: UserRole.CABINET_ADMIN,
    cabinetId,
    permissions: {
      canAccessRuleEngine: true,
      canValidateEvidence: true,
      canUploadEvidence: true,
      canManageRoadmap: true,
      isCabinetAdmin: true,
    },
  });
  console.log('✅ Cabinet admin (showcase):', DEMO_ACCOUNTS.cabinet.email);

  await upsertUser({
    email: DEMO_ACCOUNTS.client.email,
    password: DEMO_ACCOUNTS.client.password,
    name: DEMO_ACCOUNTS.client.name,
    company: clientA.name,
    role: UserRole.CLIENT_USER,
    cabinetId,
    clientId: clientA.clientId,
    permissions: {
      canUploadEvidence: true,
      canValidateEvidence: false,
    },
  });
  console.log('✅ Client user:', DEMO_ACCOUNTS.client.email);

  // Sample DSARs for Retail Demo
  const sampleDsars = [
    {
      requestId: 'DSR-CHILE-DEMO-DEL-001',
      requestType: 'DELETION' as const,
      status: 'PENDING' as const,
      dataSubjectName: 'Ana Rodríguez',
      dataSubjectEmail: 'ana.rodriguez@email.cl',
      description: 'Solicitud de supresión de datos personales (demo)',
    },
    {
      requestId: 'DSR-CHILE-DEMO-REC-001',
      requestType: 'RECTIFICATION' as const,
      status: 'IN_PROGRESS' as const,
      dataSubjectName: 'Pedro Soto',
      dataSubjectEmail: 'pedro.soto@email.cl',
      description: 'Corrección de domicilio y teléfono (demo)',
    },
    {
      requestId: 'DSR-CHILE-DEMO-ACC-001',
      requestType: 'ACCESS' as const,
      status: 'PENDING' as const,
      dataSubjectName: 'Lucía Vargas',
      dataSubjectEmail: 'lucia.vargas@email.cl',
      description: 'Solicitud de acceso a datos personales (demo)',
    },
  ];

  for (const d of sampleDsars) {
    const existing = await DataSubjectRequest.findOne({ requestId: d.requestId });
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 20);
    if (!existing) {
      await DataSubjectRequest.create({
        ...d,
        cabinetId,
        clientId: clientA.clientId,
        regulationType: RegulationType.CHILEAN_PRIVACY,
        dueDate,
        requestedData: ['datos de contacto', 'historial de compras'],
      });
      console.log('✅ DSAR:', d.requestId, d.requestType);
    } else {
      console.log('↻ DSAR exists:', d.requestId);
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log('  DEMO LOGIN (showcase)');
  console.log('══════════════════════════════════════════');
  console.log(`  Cabinet admin: ${DEMO_ACCOUNTS.cabinet.email}`);
  console.log(`  Password:      ${DEMO_ACCOUNTS.cabinet.password}`);
  console.log('──────────────────────────────────────────');
  console.log(`  Client user:   ${DEMO_ACCOUNTS.client.email}`);
  console.log(`  Password:      ${DEMO_ACCOUNTS.client.password}`);
  console.log('──────────────────────────────────────────');
  console.log(`  Platform:      ${DEMO_ACCOUNTS.platform.email}`);
  console.log(`  Password:      ${DEMO_ACCOUNTS.platform.password}`);
  console.log('══════════════════════════════════════════');
  console.log(`  Clients: ${clientA.name}, ${clientB.name}`);
  console.log('  App: /chile-privacy/login\n');

  return {
    cabinetId,
    clients: [clientA.clientId, clientB.clientId],
    accounts: DEMO_ACCOUNTS,
  };
}

if (require.main === module) {
  seedChilePrivacyDemo()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
