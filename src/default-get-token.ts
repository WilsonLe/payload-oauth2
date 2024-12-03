export const defaultGetToken = async (
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string,
): Promise<string> => {
  const tokenResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  const tokenData = await tokenResponse.json();
  const accessToken = tokenData?.access_token;
  if (typeof accessToken !== "string")
    throw new Error(`No access token: ${tokenData}`);
  return accessToken;
};
