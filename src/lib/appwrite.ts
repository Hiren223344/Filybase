// Deprecated: Platform auth now uses FilyBase's own auth system.
// This file is kept as a stub to prevent import errors during migration.

export const account = {
  create: async () => { throw new Error("Appwrite auth removed. Use /api/platform/auth instead."); },
  createEmailPasswordSession: async () => { throw new Error("Appwrite auth removed. Use /api/platform/auth instead."); },
  get: async () => { throw new Error("Appwrite auth removed. Use /api/platform/auth instead."); },
  deleteSession: async () => { throw new Error("Appwrite auth removed. Use /api/platform/auth instead."); },
};
