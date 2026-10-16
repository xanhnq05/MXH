// Helper chuẩn hoá phân trang cursor-based.
// Cursor = base64(`${sortField}_${doc._id}`)  →  client gửi lại, server giải mã.
// sortField mac dinh la "createdAt", co the truyen field khac vi du "lastMessageAt".

export const encodeCursor = (doc, field = "createdAt") => {
  if (!doc) return null;
  return Buffer.from(`${doc[field].toISOString()}_${doc._id}`).toString(
    "base64"
  );
};

export const decodeCursor = (cursor, field = "createdAt") => {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [iso, id] = decoded.split("_");
    if (!iso || !id || isNaN(new Date(iso).getTime())) return null;
    return { [field]: new Date(iso), id };
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
  cursorField,
}) => {
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  // Neu sort theo field khac (vi du lastMessageAt), cursor cung phai
  // encode/decode field do de tranh mat record khi gia tri khac nhau.
  const sortEntries = Object.entries(sort);
  const primarySortField = sortEntries[0]?.[0] || "createdAt";
  const field = cursorField || primarySortField;

  const query = { ...filter };
  if (cursor) {
    const c = decodeCursor(cursor, field);
    if (c) {
      // field < c.field  HOẶC  (field === c.field VÀ _id < c.id)
      query.$or = [
        { [field]: { $lt: c[field] } },
        { [field]: c[field], _id: { $lt: c.id } },
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
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1], field) : null;

  return { items, nextCursor, hasMore };
};
