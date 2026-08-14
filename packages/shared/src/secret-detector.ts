const SENSITIVE_KEYS = new Set<string>([
  'jwt_secret',
  'openai_api_key',
  'anthropic_api_key',
  'database_url',
  'mongodb_uri',
  'flare_private_key',
  'api_key',
  'api_secret',
  'access_key',
  'secret_key',
  'access_token',
  'private_key',
  'password',
  'db_password',
  'auth_token',
  'client_secret',
  'connection_string',
]);

const MASK = '<HIDDEN_BY_SENTINEL>';

export interface DetectionResult {
  masked: string;
  detected: string[];
  found: number;
  maskedCount: number;
}

export class SecretDetector {
  static detectSecrets(content: string): { keys: string[]; found: number } {
    const keys: string[] = [];
    for (const line of content.split('\n')) {
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trimEnd();
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        keys.push(key);
      }
    }
    return { keys, found: keys.length };
  }

  static maskContent(content: string): DetectionResult {
    const lines = content.split('\n');
    const result: string[] = [];
    const detected: string[] = [];
    let found = 0;
    let maskedCount = 0;

    for (const line of lines) {
      if (!line.includes('=')) {
        result.push(line);
        continue;
      }

      const trimmed = line.trimStart();
      if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
        result.push(line);
        continue;
      }

      const eqIdx = line.indexOf('=');
      const key = line.slice(0, eqIdx).trimEnd();
      const value = line.slice(eqIdx + 1);

      if (!/^[A-Za-z_]\w*$/.test(key) || !value) {
        result.push(line);
        continue;
      }

      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        found++;
        if (value === MASK) {
          result.push(line);
          continue;
        }
        maskedCount++;
        detected.push(key);
        result.push(key + '=' + MASK);
      } else {
        result.push(line);
      }
    }

    return { masked: result.join('\n'), detected, found, maskedCount };
  }
}
