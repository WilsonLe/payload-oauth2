import { PayloadRequest } from "payload";
import { OAuth2Plugin, defaultGetToken } from "../src";

////////////////////////////////////////////////////////////////////////////////
// Microsoft Entra Id OAuth
////////////////////////////////////////////////////////////////////////////////
const clientId = process.env.MICROSOFT_ENTRA_ID_CLIENT_ID;
const clientSecret = process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET;
const tenantId = process.env.MICROSOFT_ENTRA_ID_TENANT_ID;
const administratorGroupId =
  process.env.MICROSOFT_ENTRA_ID_ADMINISTRATOR_GROUP_ID;
const serverUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

const strategyName = "microsoft-entra-id";
const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
const authorizationUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
const microsoftGraphBaseUrl = "https://graph.microsoft.com/v1.0";

/**

Note: For Microsoft Entra ID, you need to xreate an app registration
  - Go to Azure Portal -> Microsoft Entra ID -> App Registrations -> New Registration
  - Fill in the name and select the supported account types
  - Add a "Web" redirect URI: http://localhost:3000/api/users/oauth/microsoft-entra-id/callback
  - When created, go to API Permissions -> Add a permission -> Microsoft Graph -> Delegated permissions -> Select the ones you need, e.g. email, openid, profile and offline_access -> Add permissions
  - Optional: If you do not want users to have to give consent to your app everytime they login: Click on Grant admin consent for {tenant} -> Yes
  - Optional: If you want groups to be part of your token(s), you can go to Token configuration -> Add groups claim -> Select the groups you want to add -> Save
  - Go to Certificates & secrets -> Client secrets -> New client secret -> Add a description -> Expires -> Add -> Copy the secret (it will only be shown once) -> And save the secret somewhere safe or add it to your .env file

You can read a little about registering apps here as well: https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app
 */

export const microsoftEntraIdOAuth = OAuth2Plugin({
  enabled:
    typeof clientId === "string" &&
    typeof clientSecret === "string" &&
    typeof tenantId === "string",
  strategyName,
  useEmailAsIdentity: true,
  serverURL: serverUrl,
  clientId: clientId || "",
  clientSecret: clientSecret || "",
  authorizePath: `/oauth/${strategyName}`,
  callbackPath: `/oauth/${strategyName}/callback`,
  authCollection: "users",
  tokenEndpoint: tokenEndpoint,
  scopes: ["openid", "email", "profile", "offline_access", "User.Read"],
  providerAuthorizationUrl: authorizationUrl,
  getUserInfo: async (accessToken: string, req: PayloadRequest) => {
    const userInfoResponse = await fetch(`${microsoftGraphBaseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    /*
     * The following is an example of how to check if the user is a member of a specific group.
     * You can use this to restrict login when not part of the group, or to restrict access in payload.
     */
    const groupsResponse = await fetch(`${microsoftGraphBaseUrl}/me/memberOf`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const groups =
      (await groupsResponse.json()) as MicrosoftGraphGroupsResponse;

    const groupIds = groups.value.map((group) => group.id);

    if (administratorGroupId && !groupIds.includes(administratorGroupId))
      throw new Error("You are not authorized to access this application.");

    const user = await userInfoResponse.json();
    return { email: user.mail, sub: user.id, name: user.displayName };
  },
  /**
   * This param is optional to demonstrate how to customize your own
   * `getToken` function (i.e. add hooks to run after getting the token)
   * Leave this blank should you wish to use the default getToken function
   */
  getToken: async (code: string, req: PayloadRequest) => {
    const redirectUri = `${serverUrl}/api/users/oauth/${strategyName}/callback`;
    const token = await defaultGetToken(
      tokenEndpoint,
      clientId || "",
      clientSecret || "",
      redirectUri,
      code,
    );

    if (req.user) {
      await req.payload.update({
        collection: "users",
        id: req.user.id,
        data: {},
      });
    }

    return token;
  },
  successRedirect: (req: PayloadRequest, accessToken?: string) => {
    return "/admin";
  },
  failureRedirect: (req, err) => {
    req.payload.logger.error(err);
    return "/admin/login";
  },
});

type MicrosoftGraphGroupsResponse = {
  value: MicrosoftGraphGroup[];
};

type MicrosoftGraphGroup = {
  id: string;
};
