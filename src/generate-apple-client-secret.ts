import { SignJWT, importPKCS8 } from "jose";

/**
 * Utilities for generating an Apple OAuth2 client secret JWT.
 *
 * - AppleClientSecretParams: Interface describing the required parameters for generating the client secret.
 * - generateAppleClientSecret: Asynchronously generates a signed JWT to be used as the Apple OAuth2 client secret.
 *
 * Usage:
 *   const jwt = await generateAppleClientSecret({
 *     teamId: "...",
 *     clientId: "...",
 *     keyId: "...",
 *     privateKey: "...",
 *     exp: 1234567890, // optional, seconds since epoch
 *   });
 */

export interface AppleClientSecretParams {
  /**
   * Your Apple Developer Team ID.
   */
  teamId: string;
  /**
   * Your Apple Service Client ID (the identifier for your app/service).
   */
  clientId: string;
  /**
   * The Key ID from your Apple Developer account.
   */
  keyId: string;
  /**
   * The contents of your Apple private key (.p8 file).
   */
  authKeyContent: string;
  /**
   * Optional expiration time (in seconds since epoch). Defaults to 6 months from now.
   */
  exp?: number;
}

/**
 * Generate a signed JWT to use as the Apple OAuth2 client secret.
 *
 * @param params - AppleClientSecretParams object containing required Apple OAuth credentials.
 * @returns Promise<string> - The signed JWT client secret.
 * @throws Error if any required parameter is missing.
 */
export async function generateAppleClientSecret({
  teamId,
  clientId,
  keyId,
  authKeyContent,
  exp,
}: AppleClientSecretParams) {
  if (!teamId || !clientId || !keyId || !authKeyContent) {
    throw new Error(
      "Missing required parameters: teamId, clientId, keyId, privateKey",
    );
  }
  const _authKeyContent = authKeyContent.replace(/\\n/g, "\n").trim();
  const now = Math.floor(Date.now() / 1000);
  const alg = "ES256";
  const expiresAt = exp ?? now + 86400 * 180; // default 6 months

  if (expiresAt - now > 60 * 60 * 24 * 180) {
    throw new Error("exp may not exceed 180 days from iat per Apple policy");
  }
  const cryptoKey = await importPKCS8(_authKeyContent.trim(), alg);
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg, kid: keyId, typ: "JWT" })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(cryptoKey);
  return jwt;
}
