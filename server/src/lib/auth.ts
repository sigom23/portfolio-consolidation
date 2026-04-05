import { Issuer, Client, generators } from "openid-client";

let oidcClient: Client | null = null;

export async function getClient(): Promise<Client> {
  if (oidcClient) return oidcClient;

  const issuerUrl = process.env.POCKET_ID_URL;
  if (!issuerUrl) throw new Error("POCKET_ID_URL not configured");

  const issuer = await Issuer.discover(issuerUrl);

  oidcClient = new issuer.Client({
    client_id: process.env.CLIENT_ID!,
    client_secret: process.env.CLIENT_SECRET!,
    redirect_uris: [process.env.CALLBACK_URL!],
    response_types: ["code"],
  });

  return oidcClient;
}

export function getAuthorizationUrl(client: Client): { url: string; nonce: string; state: string } {
  const nonce = generators.nonce();
  const state = generators.state();

  const url = client.authorizationUrl({
    scope: "openid email profile",
    nonce,
    state,
  });

  return { url, nonce, state };
}

export async function handleCallback(
  client: Client,
  callbackUrl: string,
  params: { nonce: string; state: string }
) {
  const callbackParams = client.callbackParams(callbackUrl);

  const tokenSet = await client.callback(process.env.CALLBACK_URL!, callbackParams, {
    nonce: params.nonce,
    state: params.state,
  });

  const userinfo = await client.userinfo(tokenSet);

  return {
    sub: userinfo.sub,
    email: (userinfo.email as string) ?? null,
    name: (userinfo.name as string) ?? null,
  };
}
