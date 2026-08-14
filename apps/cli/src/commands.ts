import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync, spawn } from 'node:child_process';
import * as readline from 'node:readline';
import { SentinelClient } from '@sentinel/sdk';
import {
  makeSecretReference,
  parseEnvContent,
  serializeEnvContent,
  PROTECTED_FILE_PATTERNS,
  parseSecretReference,
  vaultGet,
} from '@sentinel/shared';
import {
  loadConfig,
  saveConfig,
  loadProjectConfig,
  saveProjectConfig,
  saveSessionState,
  loadSessionState,
  clearSessionState,
  vaultSet,
  initVault,
  openVaultAuthorized,
} from '@sentinel/shared';

export async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function getClient(): SentinelClient {
  const config = loadConfig();
  return new SentinelClient({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    accessToken: config.accessToken,
  });
}

function gitSafe(args: string): string | null {
  try {
    const out = execSync(`git ${args}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
      timeout: 3000,
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function detectProjectName(): string {
  const remote = gitSafe('config --get remote.origin.url');
  if (remote) {
    const match = remote.match(/([^\/]+?)(?:\.git)?$/);
    if (match?.[1]) return match[1];
  }
  const topLevel = gitSafe('rev-parse --show-toplevel');
  if (topLevel) return path.basename(topLevel);
  return path.basename(process.cwd());
}

export function detectAgentName(): string {
  const env = process.env;
  if (env.CLAUDE_CODE) return 'Claude Code';
  if (env.CURSOR_TRACE_ID || env.CURSOR_TRACING) return 'Cursor';
  if (env.GITHUB_COPILOT_AGENT) return 'GitHub Copilot';
  if (env.CODEX || env.CODEX_API_KEY) return 'Codex';
  if (env.WARP_IS_LOCAL_SHELL) return 'Warp';
  if (env.TERM_PROGRAM === 'Cursor') return 'Cursor';
  if (env.TERM_PROGRAM === 'vscode') return 'VS Code';
  if (env.TERM_PROGRAM === 'iTerm.app') return 'iTerm';
  const gitUser = gitSafe('config --get user.name');
  const identity = [gitUser || os.userInfo().username, os.hostname()]
    .filter(Boolean)
    .join('@');
  return identity || 'cli-agent';
}

export async function loginCommand(options: {
  email?: string;
  password?: string;
  apiUrl?: string;
}): Promise<void> {
  const config = loadConfig();
  if (options.apiUrl) config.apiUrl = options.apiUrl;

  const email = options.email ?? (await prompt('Email: '));
  const password = options.password ?? (await prompt('Password: '));

  const client = new SentinelClient({ apiUrl: config.apiUrl });
  const result = await client.login(email, password);

  config.accessToken = result.accessToken;

  const keys = await client.apiKeys.list();
  if (keys.length === 0 || !config.apiKey) {
    const key = await client.apiKeys.create('CLI Runtime Key');
    config.apiKey = key.key;
    console.log(`API key created: ${key.key.slice(0, 12)}...`);
  }

  saveConfig(config);
  console.log(`Logged in as ${result.user.email}`);
}

export async function registerCommand(options: {
  email?: string;
  password?: string;
  apiUrl?: string;
}): Promise<void> {
  const config = loadConfig();
  if (options.apiUrl) config.apiUrl = options.apiUrl;

  const email = options.email ?? (await prompt('Email: '));
  const password = options.password ?? (await prompt('Password: '));
  const org = (await prompt('Organization name: ')) || 'My Org';
  const firstName = (await prompt('First name: ')) || 'First';
  const lastName = (await prompt('Last name: ')) || 'Last';

  const client = new SentinelClient({ apiUrl: config.apiUrl });
  const result = await client.register({
    organizationName: org,
    email,
    password,
    firstName,
    lastName,
  });

  config.accessToken = result.accessToken;

  const keys = await client.apiKeys.list();
  if (keys.length === 0 || !config.apiKey) {
    const key = await client.apiKeys.create('CLI Runtime Key');
    config.apiKey = key.key;
    console.log(`API key created: ${key.key.slice(0, 12)}...`);
  }

  saveConfig(config);
  console.log(`Registered and logged in as ${result.user.email}`);
}

export async function initCommand(): Promise<void> {
  const client = getClient();
  const projects = await client.projects.list();

  let projectId: string;
  if (projects.length === 0) {
    const detected = detectProjectName();
    const name = (await prompt(`Project name [${detected}]: `)) || detected;
    const project = await client.projects.create({ name });
    projectId = project.id;
    console.log(`Created project: ${project.name} (${project.id})`);
  } else {
    console.log('Existing projects:');
    projects.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} (${p.id})`));
    const choice = await prompt('Select project number (or enter new name): ');
    const num = parseInt(choice, 10);
    if (!isNaN(num) && num > 0 && num <= projects.length) {
      projectId = projects[num - 1].id;
    } else {
      const project = await client.projects.create({ name: choice || detectProjectName() });
      projectId = project.id;
    }
  }

  const agents = await client.agents.list(projectId);
  let agentId: string;
  if (agents.length === 0) {
    const agent = await client.agents.create({
      projectId,
      name: detectAgentName(),
      provider: 'local',
      agentType: 'cli',
      capabilities: [
        { name: 'READ_FILE', mode: 'approval_required' },
        { name: 'READ_SECRET', mode: 'approval_required' },
        { name: 'EXEC_TERMINAL', mode: 'approval_required' },
        { name: 'WRITE_FILE', mode: 'allow' },
      ],
    });
    agentId = agent.id;
    console.log(`Registered agent: ${agent.name}`);
  } else {
    agentId = agents[0].id;
  }

  saveProjectConfig({
    projectId,
    agentId,
    protectedPatterns: [...PROTECTED_FILE_PATTERNS],
    defaultPolicies: true,
  });

  console.log('Sentinel initialized in .sentinel/config.json');
}

export async function protectCommand(): Promise<void> {
  const projectConfig = loadProjectConfig();
  if (!projectConfig) {
    console.error('Run sentinel init first');
    process.exit(1);
  }

  const client = getClient();

  // Get orgId and FCE authorization for vault access
  const profile = await client.getProfile();
  if (!profile?.organization?.id) {
    console.error('No organization found — run sentinel login first');
    process.exit(1);
  }
  const orgId = profile.organization.id;

  let nonce;
  try {
    nonce = await client.runtime.getVaultNonce();
  } catch (err) {
    console.error(`Vault authorization unavailable: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
  if (!nonce?.orgNonce || !nonce?.teeAuth) {
    console.error('Backend did not return vault authorization');
    process.exit(1);
  }

  // Open vault with FCE authorization
  let dek = openVaultAuthorized(
    orgId,
    nonce.orgNonce,
    nonce.teeAuth,
    nonce.previousOrgNonce ?? undefined,
  );
  if (!dek) {
    initVault(orgId, nonce.orgNonce);
    dek = openVaultAuthorized(
      orgId,
      nonce.orgNonce,
      nonce.teeAuth,
      nonce.previousOrgNonce ?? undefined,
    );
  }
  if (!dek) {
    console.error('Failed to open vault with FCE authorization');
    process.exit(1);
  }

  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    console.log('No .env file found — creating template with secret references');
    const template = 'OPENAI_API_KEY=sentinel://secret/openai\nDATABASE_URL=sentinel://secret/database\n';
    fs.writeFileSync(envPath, template);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const entries = parseEnvContent(content);
  let protectedCount = 0;

  for (const entry of entries) {
    if (entry.isReference) continue;
    if (!/password|secret|key|token|api|url/i.test(entry.key)) continue;

    const secretName = entry.key.toLowerCase().replace(/[^a-z0-9]/g, '_');
    vaultSet(secretName, entry.value, dek);
    entry.value = makeSecretReference(secretName);
    entry.isReference = true;
    protectedCount++;

    await client.secrets.register({
      projectId: projectConfig.projectId,
      name: secretName,
      envKey: entry.key,
      secretType: 'api_key',
    });
  }

  fs.writeFileSync(envPath, serializeEnvContent(entries));
  console.log(`Protected ${protectedCount} secrets with sentinel:// references`);
  console.log('Plaintext values stored in encrypted local vault (~/.sentinel/vault.enc)');
}

export async function runCommand(command: string): Promise<void> {
  const projectConfig = loadProjectConfig();
  if (!projectConfig) {
    console.error('Run sentinel init first');
    process.exit(1);
  }

  const client = getClient();

  // Get orgId and FCE authorization for vault access
  const profile = await client.getProfile();
  if (!profile?.organization?.id) {
    console.error('No organization found — run sentinel login first');
    process.exit(1);
  }
  const orgId = profile.organization.id;

  let nonce;
  try {
    nonce = await client.runtime.getVaultNonce();
  } catch (err) {
    console.error(`Vault authorization unavailable: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
  if (!nonce?.orgNonce || !nonce?.teeAuth) {
    console.error('Backend did not return vault authorization');
    process.exit(1);
  }

  // Open vault with FCE authorization
  let dek = openVaultAuthorized(
    orgId,
    nonce.orgNonce,
    nonce.teeAuth,
    nonce.previousOrgNonce ?? undefined,
  );
  if (!dek) {
    initVault(orgId, nonce.orgNonce);
    dek = openVaultAuthorized(
      orgId,
      nonce.orgNonce,
      nonce.teeAuth,
      nonce.previousOrgNonce ?? undefined,
    );
  }
  if (!dek) {
    console.error('Failed to open vault with FCE authorization');
    process.exit(1);
  }

  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('No .env file found — run sentinel protect first');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const entries = parseEnvContent(content);

  // Build env with resolved secrets
  const resolvedEnv = { ...process.env };
  let resolvedCount = 0;
  for (const entry of entries) {
    if (!entry.isReference) continue;
    const secretName = parseSecretReference(entry.value);
    if (!secretName) continue;
    const value = vaultGet(secretName, dek);
    if (value !== null) {
      resolvedEnv[entry.key] = value;
      resolvedCount++;
    }
  }

  if (resolvedCount === 0) {
    console.log('No sentinel:// references found to resolve');
  } else {
    console.log(`Resolved ${resolvedCount} secret(s) from vault`);
  }

  // Spawn the command with resolved env
  const [cmd, ...args] = command.split(' ');
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    env: resolvedEnv,
    shell: true,
  });

  child.on('error', (err) => {
    console.error(`Failed to start command: ${err.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

export async function sessionStartCommand(): Promise<void> {
  const projectConfig = loadProjectConfig();
  if (!projectConfig?.agentId) {
    console.error('Run sentinel init first');
    process.exit(1);
  }

  const client = getClient();
  const session = await client.sessions.start({
    projectId: projectConfig.projectId,
    agentId: projectConfig.agentId,
  });

  saveSessionState({
    sessionId: session.id,
    projectId: projectConfig.projectId,
    agentId: projectConfig.agentId,
    startedAt: new Date().toISOString(),
  });

  console.log(`Session started: ${session.id}`);
  console.log('Run: pnpm --filter @sentinel/runtime dev');
}

export async function sessionStopCommand(): Promise<void> {
  const state = loadSessionState();
  if (!state) {
    console.log('No active session');
    return;
  }

  const client = getClient();
  await client.sessions.end(state.sessionId);
  clearSessionState();
  console.log('Session ended');
}

export async function statusCommand(): Promise<void> {
  const config = loadConfig();
  const session = loadSessionState();
  const project = loadProjectConfig();

  console.log('Sentinel Status');
  console.log('─'.repeat(40));
  console.log(`API URL:    ${config.apiUrl}`);
  console.log(`API Key:    ${config.apiKey ? 'configured' : 'missing'}`);
  console.log(`Project:    ${project?.projectId ?? 'not initialized'}`);
  console.log(`Session:    ${session?.sessionId ?? 'none'}`);

  try {
    const client = getClient();
    const health = await client.health.check();
    console.log(`Backend:    ${health.status}`);
    const flare = await client.flare.status();
    console.log(`Flare:      ${flare.online ? 'online' : 'offline (queue mode)'}`);
  } catch {
    console.log('Backend:    unreachable');
  }
}

export async function auditCommand(): Promise<void> {
  const client = getClient();
  const result = await client.audit.search({ limit: '10' });
  console.log(`Recent audit entries (${result.total} total):`);
  for (const entry of result.items) {
    console.log(
      `  [${entry.timestamp}] ${entry.action} ${entry.resource} → ${entry.decision}`,
    );
    if (entry.flareTxHash) console.log(`    Flare: ${entry.flareTxHash}`);
  }
}

export async function approveCommand(id: string): Promise<void> {
  const client = getClient();
  const approval = await client.approvals.approve(id);
  console.log(`Approved: ${approval.action} on ${approval.resource}`);
}

export async function doctorCommand(): Promise<void> {
  let ok = true;
  const config = loadConfig();

  if (!config.apiKey) {
    console.log('✗ API key not configured');
    ok = false;
  } else {
    console.log('✓ API key configured');
  }

  try {
    const client = getClient();
    await client.health.check();
    console.log('✓ Backend reachable');
  } catch {
    console.log('✗ Backend unreachable');
    ok = false;
  }

  if (loadProjectConfig()) {
    console.log('✓ Project initialized');
  } else {
    console.log('✗ Project not initialized (run sentinel init)');
    ok = false;
  }

  if (loadSessionState()) {
    console.log('✓ Active session');
  } else {
    console.log('○ No active session');
  }

  console.log(ok ? '\nAll checks passed' : '\nSome checks failed');
  process.exit(ok ? 0 : 1);
}

export async function policyListCommand(): Promise<void> {
  const client = getClient();
  const project = loadProjectConfig();
  const policies = await client.policies.list(project?.projectId);
  if (policies.length === 0) {
    console.log('No policies found');
    return;
  }
  for (const p of policies) {
    console.log(`${p.name} v${p.version} (${p.enabled ? 'enabled' : 'disabled'})`);
    console.log(`  type: ${p.type} | category: ${p.category}`);
    const t = p.target;
    const targets = [t.secretName && `secret:${t.secretName}`, t.actionName && `action:${t.actionName}`, t.resourcePattern && `resource:${t.resourcePattern}`, t.environmentName && `env:${t.environmentName}`].filter(Boolean);
    if (targets.length) console.log(`  target: ${targets.join(', ')}`);
    const c = p.conditions;
    const conds = [c.allowedAgents?.length && `agents: ${c.allowedAgents.join(',')}`, c.deniedAgents?.length && `deny agents: ${c.deniedAgents.join(',')}`, c.allowedEnvironments?.length && `envs: ${c.allowedEnvironments.join(',')}`, c.deniedEnvironments?.length && `deny envs: ${c.deniedEnvironments.join(',')}`].filter(Boolean);
    if (conds.length) console.log(`  conditions: ${conds.join(' | ')}`);
    console.log(`  controls: ${p.controls.allowed ? 'allow' : 'deny'}${p.controls.approvalRequired ? ' +approval' : ''}${p.controls.auditRequired ? ' +audit' : ''}${p.controls.flareVerificationRequired ? ' +flare' : ''}`);
  }
}
