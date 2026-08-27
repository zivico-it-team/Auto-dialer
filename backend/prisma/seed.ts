import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records if any
  await prisma.auditLog.deleteMany();
  await prisma.callback.deleteMany();
  await prisma.call.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.agentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@callcenter.io',
      passwordHash,
      role: 'ADMIN',
      phone: '+15550000001',
      status: 'ACTIVE',
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      name: 'Sarah Connor (Supervisor)',
      email: 'supervisor@callcenter.io',
      passwordHash,
      role: 'SUPERVISOR',
      phone: '+15550000002',
      status: 'ACTIVE',
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'agent1@callcenter.io',
      passwordHash,
      role: 'AGENT',
      phone: '+15550000101',
      status: 'ACTIVE',
      agentProfile: {
        create: {
          sipExtension: '101',
          sipUsername: 'agent1',
          status: 'AVAILABLE',
        },
      },
    },
    include: { agentProfile: true },
  });

  const agent2 = await prisma.user.create({
    data: {
      name: 'Emma Watson',
      email: 'agent2@callcenter.io',
      passwordHash,
      role: 'AGENT',
      phone: '+15550000102',
      status: 'ACTIVE',
      agentProfile: {
        create: {
          sipExtension: '102',
          sipUsername: 'agent2',
          status: 'AVAILABLE',
        },
      },
    },
    include: { agentProfile: true },
  });

  const agent3 = await prisma.user.create({
    data: {
      name: 'David Miller',
      email: 'agent3@callcenter.io',
      passwordHash,
      role: 'AGENT',
      phone: '+15550000103',
      status: 'ACTIVE',
      agentProfile: {
        create: {
          sipExtension: '103',
          sipUsername: 'agent3',
          status: 'OFFLINE',
        },
      },
    },
    include: { agentProfile: true },
  });

  const qaAuditor = await prisma.user.create({
    data: {
      name: 'Priya Sharma (QA Auditor)',
      email: 'qa@callcenter.io',
      passwordHash,
      role: 'QA_AUDITOR',
      phone: '+15550000003',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Users & Agents created.');

  // 3. Create Campaigns
  const campaign1 = await prisma.campaign.create({
    data: {
      name: 'Outbound Sales Outreach 2026',
      description: 'High-priority consented lead qualification for enterprise software solutions.',
      status: 'READY',
      maxConcurrentCalls: 3,
      retryLimit: 3,
      retryDelaySeconds: 1800,
      callingStartTime: '09:00',
      callingEndTime: '18:00',
      timezone: 'UTC',
      recordCalls: true,
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      name: 'Customer Renewal & Feedback',
      description: 'Automated follow-up on subscription renewals and customer experience.',
      status: 'READY',
      maxConcurrentCalls: 2,
      retryLimit: 2,
      retryDelaySeconds: 3600,
      callingStartTime: '09:00',
      callingEndTime: '17:30',
      timezone: 'UTC',
      recordCalls: true,
    },
  });

  console.log('✅ Campaigns created.');

  // 4. Create Sample Leads
  const sampleLeads = [
    { name: 'Michael Scott', phone: '+12025550143', email: 'michael@dunder.com', notes: 'Interested in enterprise bundle' },
    { name: 'Jim Halpert', phone: '+12025550189', email: 'jim@dunder.com', notes: 'Requested pricing sheet' },
    { name: 'Pam Beesly', phone: '+12025550176', email: 'pam@dunder.com', notes: 'Design department contact' },
    { name: 'Dwight Schrute', phone: '+12025550192', email: 'dwight@beetfarm.com', notes: 'Direct phone' },
    { name: 'Angela Martin', phone: '+12025550111', email: 'angela@accounting.org', notes: 'Prefers afternoon calls' },
    { name: 'Stanley Hudson', phone: '+12025550125', email: 'stanley@crosswords.com', notes: 'Retiring soon' },
    { name: 'Phyllis Vance', phone: '+12025550134', email: 'phyllis@refrigeration.com', notes: 'B2B referral lead' },
    { name: 'Oscar Martinez', phone: '+12025550148', email: 'oscar@finance.org', notes: 'Tax specialist' },
    { name: 'Kevin Malone', phone: '+12025550159', email: 'kevin@chili.net', notes: 'Requested call back' },
    { name: 'Toby Flenderson', phone: '+12025550162', email: 'toby@hr.org', notes: 'Corporate compliance contact' },
    { name: 'Kelly Kapoor', phone: '+12025550171', email: 'kelly@customer.com', notes: 'E-commerce inquiry' },
    { name: 'Ryan Howard', phone: '+12025550183', email: 'ryan@wupfh.com', notes: 'Startup lead' },
    { name: 'Andy Bernard', phone: '+12025550199', email: 'andy@cornell.edu', notes: 'Acapella club coordinator' },
    { name: 'Meredith Palmer', phone: '+12025550105', email: 'meredith@supplies.com', notes: 'Purchasing manager' },
    { name: 'Creed Bratton', phone: '+12025550118', email: 'creed@quality.com', notes: 'QA contact' },
  ];

  for (let i = 0; i < sampleLeads.length; i++) {
    const l = sampleLeads[i];
    await prisma.lead.create({
      data: {
        campaignId: i % 2 === 0 ? campaign1.id : campaign2.id,
        name: l.name,
        phone: l.phone,
        email: l.email,
        notes: l.notes,
        status: 'NEW',
        attempts: 0,
      },
    });
  }

  console.log(`✅ ${sampleLeads.length} Sample Leads created.`);

  // 5. Create System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'company_name', value: 'Talking Wave' },
      { key: 'telephony_trunk', value: 'SIP/trunk_provider_primary' },
      { key: 'recording_retention_days', value: '90' },
      { key: 'max_daily_calls_per_agent', value: '250' },
    ],
  });

  console.log('✅ System Settings seeded.');
  console.log('\n=========================================');
  console.log('🎉 Seeding completed successfully!');
  console.log('Login credentials:');
  console.log('Admin:       admin@callcenter.io / Password123!');
  console.log('Supervisor:  supervisor@callcenter.io / Password123!');
  console.log('Agent 101:   agent1@callcenter.io / Password123!');
  console.log('Agent 102:   agent2@callcenter.io / Password123!');
  console.log('=========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
