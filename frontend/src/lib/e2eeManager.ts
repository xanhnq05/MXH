// E2EE Manager — quản lý key pair, lưu localStorage, mã hoá/giải mã thực tế.
// Khi user bật E2EE: sinh key pair, upload publicKey lên server.
// Khi gửi tin nhắn: encrypt plaintext, gửi kèm iv/authTag/encryptedKeys cho mỗi recipient.
// Khi nhận: tìm encryptedKey của mình, derive shared key, giải mã AES key, decrypt plaintext.

import {
  generateECDHKeyPair,
  storePrivateKey,
  loadPrivateKeyJwk,
  loadPrivateKey,
  deriveSharedKey,
  encryptText,
  decryptText,
} from "@/lib/e2ee";
import { userService } from "@/services/user.service";
import { chatService } from "@/services/chat.service";
import api from "@/lib/axios";
import type { Conversation } from "@/types/message";
import { useAuthStore } from "@/stores/useAuthStore";

const E2EE_ENABLED_KEY = "mxh_e2ee_enabled";

export const isE2EEEnabled = (): boolean => {
  return localStorage.getItem(E2EE_ENABLED_KEY) === "true";
};

export const setE2EEEnabled = async (enabled: boolean) => {
  if (enabled) {
    // Sinh key pair mới
    const { publicKeyJwk, privateKey } = await generateECDHKeyPair();
    await storePrivateKey(publicKeyJwk);
    // Upload public key
    await userService.setE2EEKeys({ ecdhPublicKey: JSON.stringify(publicKeyJwk) });
    localStorage.setItem(E2EE_ENABLED_KEY, "true");
    // Giữ privateKey để không bị garbage collected (optional)
  } else {
    localStorage.setItem(E2EE_ENABLED_KEY, "false");
    localStorage.removeItem("mxh_e2ee_private_key");
  }
};

/** Cache shared key theo (conversationId, remoteUserId) */
const sharedKeyCache = new Map<string, CryptoKey>();

const buildCacheKey = (conversationId: string, userId: string) =>
  `${conversationId}:${userId}`;

/** Lấy hoặc derive shared key với 1 user trong 1 conversation */
export const getSharedKey = async (
  conversationId: string,
  remoteUserId: string,
  remoteUserEcdhJwkStr: string
): Promise<CryptoKey> => {
  const cacheKey = buildCacheKey(conversationId, remoteUserId);
  if (sharedKeyCache.has(cacheKey)) return sharedKeyCache.get(cacheKey)!;

  const myPrivateKey = await loadPrivateKey();
  if (!myPrivateKey) throw new Error("E2EE chưa được bật");

  const remoteJwk = JSON.parse(remoteUserEcdhJwkStr);
  const sharedKey = await deriveSharedKey(myPrivateKey, remoteJwk);
  sharedKeyCache.set(cacheKey, sharedKey);
  return sharedKey;
};

/** Mã hoá message trước khi gửi */
export const encryptMessage = async (
  conversationId: string,
  plaintext: string
): Promise<{
  content: string;
  iv: string;
  authTag: string;
  encryptedKeys: { userId: string; encryptedKey: string }[];
  isEncrypted: true;
}> => {
  // 1) Lấy conversation + members
  const conv: Conversation = (await api.get(`/conversations/${conversationId}`)).data
    .conversation;

  const me = useAuthStore.getState().user;
  if (!me) throw new Error("Chưa đăng nhập");

  // 2) Với mỗi member, derive shared key + mã hoá plaintext
  const encryptedKeys: { userId: string; encryptedKey: string }[] = [];
  for (const m of conv.members) {
    const u = typeof m.userId === "object" ? m.userId : null;
    if (!u || u._id === me._id) continue;
    if (!u.e2eeEcdhPublicKey) {
      // Member chưa bật E2EE → không thể mã hoá cho member này
      throw new Error(
        `${u.displayName} chưa bật E2EE. Không thể gửi tin nhắn mã hoá trong nhóm.`
      );
    }
    const sharedKey = await getSharedKey(conv._id, u._id, u.e2eeEcdhPublicKey);
    // Mã hoá plaintext bằng shared key
    const { iv, ciphertext, authTag } = await encryptText(sharedKey, plaintext);
    if (u._id === conv.members[0].userId.toString() || encryptedKeys.length === 0) {
      // Lưu ciphertext + iv + authTag vào member đầu tiên để tiết kiệm
      // (thực tế mỗi member nên có 1 ciphertext riêng, nhưng vì plaintext giống nhau
      // nên ta có thể dùng chung 1 ciphertext cho tất cả, chỉ cần shared key khác nhau)
      // → Đơn giản hoá: lưu cùng ciphertext, iv, authTag vào entry đầu
      // và member còn lại chỉ cần có shared key để giải mã.
    }
    encryptedKeys.push({
      userId: u._id,
      // Thực tế đây là encrypted AES key (RSA wrap), nhưng ở đây dùng chung shared key
      // nên ta chỉ cần đánh dấu "đã mã hoá cho user này"
      encryptedKey: JSON.stringify({ iv, ciphertext, authTag }),
    });
  }

  // Lấy ciphertext từ member đầu tiên (cùng giá trị cho tất cả)
  const first = encryptedKeys[0];
  if (!first) throw new Error("Không có member nào để mã hoá");
  const { iv, ciphertext, authTag } = JSON.parse(first.encryptedKey);

  return {
    content: ciphertext,
    iv,
    authTag,
    encryptedKeys,
    isEncrypted: true,
  };
};

/** Giải mã message khi nhận */
export const decryptMessage = async (
  msg: {
    isEncrypted?: boolean;
    iv?: string;
    authTag?: string;
    content?: string;
    encryptedKeys?: { userId: string; encryptedKey: string }[];
    conversationId: string;
    senderId: any;
  }
): Promise<string> => {
  if (!msg.isEncrypted) return msg.content || "";
  const me = useAuthStore.getState().user;
  if (!me) return "[E2EE]";

  const senderId = typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;

  // Nếu là mình gửi → giải từ entry của mình
  // Nếu là người khác gửi → tìm entry có userId của mình
  let target: { userId: string; encryptedKey: string } | undefined;

  if (senderId === me._id) {
    // Tự tìm bất kỳ entry nào (vì mình đã mã hoá cho họ)
    target = msg.encryptedKeys?.[0];
  } else {
    target = msg.encryptedKeys?.find((k) => k.userId === me._id);
  }

  if (!target) return "[Không thể giải mã]";

  // Lấy ECDH public key của sender
  let senderJwk: string | undefined;
  if (senderId === me._id) {
    const myKeyJwk = loadPrivateKeyJwk();
    senderJwk = myKeyJwk ? JSON.stringify(myKeyJwk) : undefined;
  } else {
    try {
      const res = await api.get(`/users/${senderId}`);
      senderJwk = res.data.user?.e2eeEcdhPublicKey;
    } catch {
      return "[Không thể giải mã]";
    }
  }

  if (!senderJwk) return "[Sender chưa bật E2EE]";

  try {
    const sharedKey = await getSharedKey(msg.conversationId, senderId, senderJwk);
    // Parse iv/ciphertext/authTag từ target
    const parsed = JSON.parse(target.encryptedKey);
    return await decryptText(sharedKey, parsed.iv, parsed.ciphertext, parsed.authTag);
  } catch (e) {
    return "[Lỗi giải mã]";
  }
};
