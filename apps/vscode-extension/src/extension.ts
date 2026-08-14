import * as vscode from 'vscode';
import { SentinelClient } from '@sentinel/sdk';
import { loadConfig, loadSessionState, loadProjectConfig } from '@sentinel/shared';

let client: SentinelClient | null = null;
let statusBarItem: vscode.StatusBarItem;
let pendingApprovals: Map<string, vscode.Disposable> = new Map();

function getClient(): SentinelClient {
  if (!client) {
    const config = loadConfig();
    client = new SentinelClient({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      accessToken: config.accessToken,
    });
    if (config.accessToken) {
      client.connectWebSocket();
      client.ws.on('approval:created', handleApprovalCreated);
    }
  }
  return client;
}

function updateStatusBar(): void {
  const session = loadSessionState();
  if (session) {
    statusBarItem.text = '$(shield) Sentinel: Active';
    statusBarItem.backgroundColor = undefined;
    statusBarItem.tooltip = `Session ${session.sessionId.slice(0, 8)}...`;
  } else {
    statusBarItem.text = '$(shield) Sentinel: Inactive';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.tooltip = 'No active session';
  }
}

async function handleApprovalCreated(payload: unknown): Promise<void> {
  const event = payload as {
    approvalId: string;
    action: string;
    resource: string;
    agentId: string;
  };

  const choice = await vscode.window.showWarningMessage(
    `Sentinel — Approval Required\nAction: ${event.action}\nTarget: ${event.resource}`,
    { modal: true },
    'Approve Once',
    'Reject',
    'Open Dashboard',
  );

  const api = getClient();
  if (choice === 'Approve Once') {
    await api.approvals.approve(event.approvalId);
    vscode.window.showInformationMessage('Request approved');
  } else if (choice === 'Reject') {
    await api.approvals.reject(event.approvalId);
    vscode.window.showInformationMessage('Request rejected');
  } else if (choice === 'Open Dashboard') {
    vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000/approvals'));
  }
}

export function activate(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'sentinel.status';
  statusBarItem.show();
  updateStatusBar();

  context.subscriptions.push(
    statusBarItem,
    vscode.commands.registerCommand('sentinel.login', async () => {
      const email = await vscode.window.showInputBox({ prompt: 'Email' });
      const password = await vscode.window.showInputBox({ prompt: 'Password', password: true });
      if (!email || !password) return;
      try {
        const config = loadConfig();
        const c = new SentinelClient({ apiUrl: config.apiUrl });
        const result = await c.login(email, password);
        config.accessToken = result.accessToken;
        const { saveConfig } = await import('@sentinel/shared');
        saveConfig(config);
        client = null;
        vscode.window.showInformationMessage(`Logged in as ${result.user.email}`);
      } catch (err) {
        vscode.window.showErrorMessage(`Login failed: ${err}`);
      }
    }),

    vscode.commands.registerCommand('sentinel.startSession', async () => {
      const project = loadProjectConfig();
      if (!project?.agentId) {
        vscode.window.showErrorMessage('Run sentinel init in project directory first');
        return;
      }
      try {
        const session = await getClient().sessions.start({
          projectId: project.projectId,
          agentId: project.agentId,
        });
        const { saveSessionState } = await import('@sentinel/shared');
        saveSessionState({
          sessionId: session.id,
          projectId: project.projectId,
          agentId: project.agentId,
          startedAt: new Date().toISOString(),
        });
        updateStatusBar();
        vscode.window.showInformationMessage(`Session started: ${session.id.slice(0, 8)}...`);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to start session: ${err}`);
      }
    }),

    vscode.commands.registerCommand('sentinel.stopSession', async () => {
      const state = loadSessionState();
      if (!state) return;
      await getClient().sessions.end(state.sessionId);
      const { clearSessionState } = await import('@sentinel/shared');
      clearSessionState();
      updateStatusBar();
      vscode.window.showInformationMessage('Session stopped');
    }),

    vscode.commands.registerCommand('sentinel.openDashboard', () => {
      vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000'));
    }),

    vscode.commands.registerCommand('sentinel.viewApprovals', async () => {
      try {
        const approvals = await getClient().approvals.list('pending');
        if (approvals.length === 0) {
          vscode.window.showInformationMessage('No pending approvals');
          return;
        }
        const items = approvals.map((a) => ({
          label: `${a.action} → ${a.resource}`,
          description: a.status,
          approval: a,
        }));
        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Pending approvals',
        });
        if (!selected) return;
        const action = await vscode.window.showQuickPick(['Approve', 'Reject'], {
          placeHolder: 'Decision',
        });
        if (action === 'Approve') {
          await getClient().approvals.approve(selected.approval.id);
        } else if (action === 'Reject') {
          await getClient().approvals.reject(selected.approval.id);
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to load approvals: ${err}`);
      }
    }),

    vscode.commands.registerCommand('sentinel.status', () => {
      const session = loadSessionState();
      const project = loadProjectConfig();
      vscode.window.showInformationMessage(
        session
          ? `Active session: ${session.sessionId}\nProject: ${project?.projectId ?? 'unknown'}`
          : 'No active session. Use Sentinel: Start Session',
      );
    }),

    vscode.commands.registerCommand('sentinel.doctor', async () => {
      try {
        const health = await getClient().health.check();
        const flare = await getClient().flare.status();
        vscode.window.showInformationMessage(
          `Backend: ${health.status}\nFlare: ${flare.online ? 'online' : 'offline'}`,
        );
      } catch {
        vscode.window.showErrorMessage('Backend unreachable');
      }
    }),
  );

  setInterval(updateStatusBar, 5000);
}

export function deactivate(): void {
  client?.ws.disconnect();
  pendingApprovals.forEach((d) => d.dispose());
}
