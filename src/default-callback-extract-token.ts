import { PayloadRequest } from "payload";

export const defaultCallbackExtractToken = async (
  req: PayloadRequest,
): Promise<string> => {
  if (req.method === "POST") {
    // Handle form data from POST request (used by Apple OAuth)
    const contentType = req.headers.get("content-type");
    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const text = await (req as unknown as Request).text();
      const formData = new URLSearchParams(text);
      const code = formData.get("code");
      if (typeof code === "string") {
        return code;
      } else {
        throw new Error(`Code not found in POST form data: ${text}`);
      }
    } else if (contentType?.includes("application/json")) {
      if (typeof req.json === "function") {
        const body = await req.json();
        if (typeof body.code === "string") {
          return body.code;
        } else {
          throw new Error(
            `Code not found in POST request body: ${JSON.stringify(body)}`,
          );
        }
      }
    } else {
      throw new Error(
        `Unsupported content-type: ${contentType} received in POST callback endpoint`,
      );
    }
  } else if (req.method === "GET") {
    // Handle query parameters (used by Google OAuth)
    if (typeof req.query === "object" && typeof req.query.code === "string") {
      return req.query.code;
    } else {
      throw new Error(
        `Code not found in GET request query param: ${JSON.stringify(req.query)}`,
      );
    }
  }
  throw new Error("Authorization code not found in callback request");
};
