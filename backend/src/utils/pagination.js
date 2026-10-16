// Helper chuẩn hoá phân trang cursor-based (dùng cho message, newsfeed).
// Cursor = `${createdAt.toISOString()}_${_id}`  →  client gửi lại, server giải mã.

export const encodeCursor = (doc) => {
  if (!doc) return null;
  return Buffer.from(`${doc.createdAt.toISOString()}_${doc._id}`).toString(
    "base64"
  );
};

export const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [iso, id] = decoded.split("_");
    if (!iso || !id || isNaN(new Date(iso).getTime())) return null;
    return { createdAt: new Date(iso), id };
  } catch {
    return null;
  }
};

export const paginate = async ({
  model,
  filter = {},
  cursor,
  limit = 20,
  sort = { createdAt: -1, _id: -1 },
  populate = [],
}) => {
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const query = { ...filter };
  if (cursor) {
    const c = decodeCursor(cursor);
    if (c) {
      // createdAt < c.createdAt  HOẶC  (createdAt === c.createdAt VÀ _id < c.id)
      query.$or = [
        { createdAt: { $lt: c.createdAt } },
        { createdAt: c.createdAt, _id: { $lt: c.id } },
      ];
    }
  }

  let q = model.find(query).sort(sort).limit(safeLimit + 1);
  for (const p of populate) {
    if (typeof q.populate === "function") q = q.populate(p);
  }
  const docs = typeof q.exec === "function" ? await q.exec() : (q.docs || []);

  const hasMore = docs.length > safeLimit;
  const items = hasMore ? docs.slice(0, safeLimit) : docs;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;

  return { items, nextCursor, hasMore };
};
