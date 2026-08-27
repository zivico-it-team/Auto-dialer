import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const accounts = [
  {
    key: 'ADMIN',
    name: 'Talking Wave Administrator',
    email: process.env.INITIAL_ADMIN_EMAIL || 'admin@talkingwave.tech',
    role: 'ADMIN',
    password: process.env.INITIAL_ADMIN_PASSWORD,
  },
  {
    key: 'SUPERVISOR',
    name: 'Talking Wave Supervisor',
    email: process.env.INITIAL_SUPERVISOR_EMAIL || 'supervisor@talkingwave.tech',
    role: 'SUPERVISOR',
    password: process.env.INITIAL_SUPERVISOR_PASSWORD,
  },
  {
    key: 'QA',
    name: 'Talking Wave QA Auditor',
    email: process.env.INITIAL_QA_EMAIL || 'qa@talkingwave.tech',
    role: 'QA_AUDITOR',
    password: process.env.INITIAL_QA_PASSWORD,
  },
  {
    key: 'AGENT',
    name: 'Talking Wave Agent 101',
    email: process.env.INITIAL_AGENT_EMAIL || 'agent101@talkingwave.tech',
    role: 'AGENT',
    password: process.env.INITIAL_AGENT_PASSWORD,
    agentProfile: {
      sipUsername: process.env.INITIAL_AGENT_SIP_USERNAME || 'agent101',
      sipExtension: process.env.INITIAL_AGENT_SIP_EXTENSION || '101',
    },
  },
] as const;

async function bootstrap() {
  for (const account of accounts) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    if (existing) {
      console.log(`Bootstrap: ${account.role} user already exists (${account.email}).`);
      continue;
    }

    if (!account.password) {
      throw new Error(`Missing INITIAL_${account.key}_PASSWORD for ${account.email}.`);
    }

    const passwordHash = await bcrypt.hash(account.password, 12);
    await prisma.user.create({
      data: {
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
        status: 'ACTIVE',
        ...(account.agentProfile
          ? {
              agentProfile: {
                create: account.agentProfile,
              },
            }
          : {}),
      },
    });

    console.log(`Bootstrap: created ${account.role} user (${account.email}).`);
  }
}

bootstrap()
  .catch((error) => {
    console.error('Bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
