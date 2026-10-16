// Test E2EE module: generate, derive shared key, encrypt/decrypt roundtrip
import { describe, it, expect } from "vitest";
import {
  generateECDHKeyPair,
  deriveSharedKey,
  encryptText,
  decryptText,
  exportPublicKeyJwk,
} from "../src/lib/e2ee";

describe("E2EE", () => {
  it("generates ECDH keypair", async () => {
    const { publicKeyJwk, privateKey } = await generateECDHKeyPair();
    expect(privateKey).toBeDefined();
    expect(publicKeyJwk.kty).toBe("EC");
    expect(publicKeyJwk.crv).toBe("P-256");
  });

  it("derives same shared key from two sides", async () => {
    const alice = await generateECDHKeyPair();
    const bob = await generateECDHKeyPair();

    const aliceShared = await deriveSharedKey(alice.privateKey, bob.publicKeyJwk);
    const bobShared = await deriveSharedKey(bob.privateKey, alice.publicKeyJwk);

    // Raw shared secret nên giống nhau (cùng thuật toán, cùng key ECDH)
    expect(aliceShared).toBeDefined();
    expect(bobShared).toBeDefined();
  });

  it("encrypts and decrypts roundtrip", async () => {
    const alice = await generateECDHKeyPair();
    const bob = await generateECDHKeyPair();

    const sharedKey = await deriveSharedKey(alice.privateKey, bob.publicKeyJwk);
    const plaintext = "Hello Bob, đây là tin nhắn bí mật!";
    const { iv, ciphertext, authTag } = await encryptText(sharedKey, plaintext);

    expect(ciphertext).toBeTruthy();
    expect(ciphertext).not.toBe(plaintext);
    expect(iv).toBeTruthy();
    expect(authTag).toBeTruthy();

    const decrypted = await decryptText(sharedKey, iv, ciphertext, authTag);
    expect(decrypted).toBe(plaintext);
  });

  it("fails decrypt with wrong key", async () => {
    const alice = await generateECDHKeyPair();
    const bob = await generateECDHKeyPair();
    const carol = await generateECDHKeyPair();

    const aliceBobShared = await deriveSharedKey(alice.privateKey, bob.publicKeyJwk);
    const aliceCarolShared = await deriveSharedKey(alice.privateKey, carol.publicKeyJwk);

    const { iv, ciphertext, authTag } = await encryptText(
      aliceBobShared,
      "secret text"
    );

    // Carol dùng key khác → giải mã thất bại (authTag mismatch)
    await expect(
      decryptText(aliceCarolShared, iv, ciphertext, authTag)
    ).rejects.toThrow();
  });
});
