import type {
  Agent,
  ApiResponse,
  Approval,
  AuditLog,
  AuthTokens,
  DangerousAuthPayload,
  EvaluateRequest,
  EvaluateResponse,
  PaginatedResponse,
  Policy,
  Project,
  SecretMetadata,
  Session,
  User,
  Organization,
} from '@sentinel/types';
import { SentinelWebSocket } from './websocket';

export interface SentinelClientConfig {
  apiUrl: string;
  apiKey?: string;
  accessToken?: string;
}

export class SentinelClient {
  private readonly apiUrl: string;
  private apiKey?: string;
  private accessToken?: string;
  readonly ws = new SentinelWebSocket();

  constructor(config: SentinelClientConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  connectWebSocket(): void {
    if (this.accessToken) {
      this.ws.connect(this.apiUrl, this.accessToken);
    }
  }

  async register(payload: {
    organizationName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthTokens & { user: User; organization: Organization }> {
    const response = await this.request<
      AuthTokens & { user: User; organization: Organization }
    >('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
    this.accessToken = response.accessToken;
    return response;
  }

  async login(
    email: string,
    password: string,
  ): Promise<AuthTokens & { user: User; organization: Organization | null }> {
    const response = await this.request<
      AuthTokens & { user: User; organization: Organization | null }
    >('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    this.accessToken = response.accessToken;
    return response;
  }

  async getProfile(): Promise<{ user: User; organization: Organization | null }> {
    return this.request('/auth/profile');
  }

  readonly projects = {
    list: (): Promise<Project[]> => this.request('/projects'),
    get: (id: string): Promise<Project> => this.request(`/projects/${id}`),
    create: (payload: {
      name: string;
      runtimeType?: string;
      environment?: string;
    }): Promise<Project> =>
      this.request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<Project>): Promise<Project> =>
      this.request(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    archive: (id: string): Promise<Project> =>
      this.request(`/projects/${id}`, { method: 'DELETE' }),
  };

  readonly agents = {
    list: (projectId?: string): Promise<Agent[]> =>
      this.request(`/agents${projectId ? `?projectId=${projectId}` : ''}`),
    get: (id: string): Promise<Agent> => this.request(`/agents/${id}`),
    create: (payload: {
      projectId: string;
      name: string;
      provider?: string;
      agentType?: string;
      capabilities?: { name: string; mode: string }[];
    }): Promise<Agent> =>
      this.request('/agents', { method: 'POST', body: JSON.stringify(payload) }),
    heartbeat: (id: string): Promise<Agent> =>
      this.request(`/agents/${id}/heartbeat`, { method: 'POST' }),
  };

  readonly sessions = {
    start: async (payload: {
      projectId: string;
      agentId: string;
    }): Promise<Session> => {
      return this.request<Session>('/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    end: async (sessionId: string): Promise<Session> => {
      return this.request<Session>(`/sessions/${sessionId}/end`, {
        method: 'POST',
      });
    },
    list: (): Promise<Session[]> => this.request('/sessions'),
    get: (id: string): Promise<Session> => this.request(`/sessions/${id}`),
  };

  readonly policies = {
    list: (projectId?: string): Promise<Policy[]> =>
      this.request(`/policies${projectId ? `?projectId=${projectId}` : ''}`),
    get: (id: string): Promise<Policy> => this.request(`/policies/${id}`),
    create: (payload: {
      name: string;
      projectId?: string;
      target: Policy['target'];
      conditions: Policy['conditions'];
      controls: Policy['controls'];
    }): Promise<Policy> =>
      this.request('/policies', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<Policy>): Promise<Policy> =>
      this.request(`/policies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  };

  readonly runtime = {
    evaluate: async (payload: EvaluateRequest): Promise<EvaluateResponse> => {
      return this.request<EvaluateResponse>('/runtime/evaluate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getPolicies: (projectId?: string): Promise<Policy[]> =>
      this.request(
        `/runtime/policies${projectId ? `?projectId=${projectId}` : ''}`,
      ),
    getVaultNonce: (): Promise<{ orgNonce: string; previousOrgNonce: string | null; teeAuth: { authorized: boolean; authorizationId: number; timestamp: number; operation: string; orgId: string; secretName: string; instructionId: string; signature: string; publicKey: string } }> =>
      this.request('/runtime/vault-nonce'),
    authorizeDangerous: (payload: {
      operationId: string;
      operationType: string;
      resource: string;
      requestHash: string;
    }): Promise<DangerousAuthPayload> =>
      this.request('/runtime/authorize-dangerous', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };

  readonly approvals = {
    list: (status?: string): Promise<Approval[]> =>
      this.request(`/approvals${status ? `?status=${status}` : ''}`),
    get: (id: string): Promise<Approval> => this.request(`/approvals/${id}`),
    approve: (id: string): Promise<Approval> =>
      this.request(`/approvals/${id}/approve`, { method: 'POST' }),
    reject: (id: string): Promise<Approval> =>
      this.request(`/approvals/${id}/reject`, { method: 'POST' }),
  };

  readonly audit = {
    search: (params?: Record<string, string>): Promise<PaginatedResponse<AuditLog>> => {
      const qs = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/audit${qs}`);
    },
    get: (id: string): Promise<AuditLog> => this.request(`/audit/${id}`),
    verify: (auditId: string): Promise<{ verified: boolean; hash: string }> =>
      this.request('/audit/verify', {
        method: 'POST',
        body: JSON.stringify({ auditId }),
      }),
  };

  readonly secrets = {
    list: (projectId?: string): Promise<SecretMetadata[]> =>
      this.request(`/secrets${projectId ? `?projectId=${projectId}` : ''}`),
    register: (payload: {
      projectId: string;
      name: string;
      secretType?: string;
      envKey?: string;
    }): Promise<SecretMetadata> =>
      this.request('/secrets', { method: 'POST', body: JSON.stringify(payload) }),
    requestAccess: (payload: {
      projectId: string;
      secretName: string;
    }): Promise<{ token: string; reference: string; expiresAt: string }> =>
      this.request('/secrets/request', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };

  readonly apiKeys = {
    list: (): Promise<{ id: string; name: string; keyPrefix: string }[]> =>
      this.request('/api-keys'),
    create: (name: string): Promise<{ id: string; key: string; name: string }> =>
      this.request('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    revoke: (id: string): Promise<{ id: string; revoked: boolean }> =>
      this.request(`/api-keys/${id}`, { method: 'DELETE' }),
  };

  readonly flare = {
    status: (): Promise<{ online: boolean; network: string; chainId: number }> =>
      this.request('/flare/status'),
    verify: (hash: string): Promise<{ hash: string; onChain: boolean }> =>
      this.request(`/flare/verify/${hash}`),
  };

  readonly health = {
    check: (): Promise<{ status: string }> =>
      this.request('/health', { skipAuth: true }),
  };

  private async request<T>(
    path: string,
    options: RequestInit & { skipAuth?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (!options.skipAuth) {
      if (this.accessToken) {
        headers.Authorization = `Bearer ${this.accessToken}`;
      } else if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
    }

    const response = await fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers,
    });

    const json = (await response.json()) as ApiResponse<T> & {
      success: boolean;
      error?: { code: string; message: string };
    };

    if (!response.ok || !json.success) {
      throw new Error(json.error?.message ?? `Request failed: ${response.status}`);
    }

    return json.data;
  }
}
