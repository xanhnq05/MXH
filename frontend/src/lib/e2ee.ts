// E2EE helper — End-to-End encryption dùng ECDH (P-256) + AES-256-GCM.
// Mỗi user sinh 1 ECDH key pair; public key upload lên server.
// Khi gửi tin nhắn: tạo AES key ngẫu nhiên → mã hoá plaintext →
// mã hoá AES key bằng shared secret với từng recipient → gửi kèm.

/** Tạo ECDH key pair. Trả về {publicKey (JWK), privateKey (CryptoKey)} */
export const generateECDHKeyPair = async (): Promise<{
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
}> => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { publicKeyJwk, privateKey: keyPair.privateKey };
};

const importECDH = async (jwk: JsonWebKey, isPrivate = false): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    isPrivate ? ["deriveKey", "deriveBits"] : []
  );
};

/** Tính shared AES key từ private key (của mình) + public key (của người khác) */
export const deriveSharedKey = async (
  myPrivateKey: CryptoKey,
  theirPublicJwk: JsonWebKey
): Promise<CryptoKey> => {
  const theirPub = await importECDH(theirPublicJwk, false);
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPub },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

/** AES-GCM encrypt */
export const encryptAESGCM = async (
  key: CryptoKey,
  data: Uint8Array
): Promise<{ iv: string; ciphertext: string; authTag: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource
  );
  const cipherArr = new Uint8Array(cipherBuffer);
  // AES-GCM trong WebCrypto: 16 byte cuối là authTag
  const ciphertext = cipherArr.slice(0, cipherArr.length - 16);
  const authTag = cipherArr.slice(cipherArr.length - 16);
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...ciphertext)),
    authTag: btoa(String.fromCharCode(...authTag)),
  };
};

/** AES-GCM decrypt */
export const decryptAESGCM = async (
  key: CryptoKey,
  iv: string,
  ciphertext: string,
  authTag: string
): Promise<Uint8Array> => {
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const tagBytes = Uint8Array.from(atob(authTag), (c) => c.charCodeAt(0));
  const combined = new Uint8Array(cipherBytes.length + tagBytes.length);
  combined.set(cipherBytes, 0);
  combined.set(tagBytes, cipherBytes.length);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes as BufferSource },
    key,
    combined as BufferSource
  );
  return new Uint8Array(decrypted);
};

/** Text → encrypted blob */
export const encryptText = async (
  key: CryptoKey,
  text: string
) => {
  const data = new TextEncoder().encode(text);
  return encryptAESGCM(key, data);
};

/** Decrypt blob → text */
export const decryptText = async (
  key: CryptoKey,
  iv: string,
  ciphertext: string,
  authTag: string
): Promise<string> => {
  const bytes = await decryptAESGCM(key, iv, ciphertext, authTag);
  return new TextDecoder().decode(bytes);
};

/** Lưu / lấy private key từ localStorage (mã hoá bằng passcode nếu có) */
const PRIVATE_KEY_STORAGE = "mxh_e2ee_private_key";

export const storePrivateKey = async (jwk: JsonWebKey) => {
  localStorage.setItem(PRIVATE_KEY_STORAGE, JSON.stringify(jwk));
};

export const loadPrivateKeyJwk = (): JsonWebKey | null => {
  const raw = localStorage.getItem(PRIVATE_KEY_STORAGE);
  return raw ? JSON.parse(raw) : null;
};

export const loadPrivateKey = async (): Promise<CryptoKey | null> => {
  const jwk = loadPrivateKeyJwk();
  if (!jwk) return null;
  return importECDH(jwk, true);
};
