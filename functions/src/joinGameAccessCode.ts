import * as bcrypt from "bcryptjs";

export async function verifyAccessCode(
  code: string,
  accessCodeHash: string | undefined,
  _legacyPlaintextAccessCode?: string
): Promise<boolean> {
  if (typeof accessCodeHash !== "string" || accessCodeHash.length === 0) {
    return false;
  }
  return bcrypt.compare(code, accessCodeHash);
}
