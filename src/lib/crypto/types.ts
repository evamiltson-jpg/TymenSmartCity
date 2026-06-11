export interface E2eCipherPayload {
  v: 1;
  iv: string;
  data: string;
}

export interface E2eGroupCipherPayload extends E2eCipherPayload {
  keys: Record<string, E2eCipherPayload>;
}

export type StoredPrivateKey = {
  userId: string;
  jwk: JsonWebKey;
  createdAt: string;
};

export type EncryptionKeyState = {
  ready: boolean;
  fingerprint: string | null;
  publicKeyJwk: JsonWebKey | null;
};
