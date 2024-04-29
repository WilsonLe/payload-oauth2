import { buildConfig } from 'payload/config'
import path from 'path'
import Users from './collections/Users'
import Examples from './collections/Examples'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { samplePlugin } from '../../src/index'
import sharp from 'sharp'
import { NextResponse } from 'next/server'
import { OAuth2Client} from 'google-auth-library';
import jwt from 'jsonwebtoken'

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'super-secret',
  admin: {
    user: Users.slug,
  },
  editor: lexicalEditor({}),
  collections: [Examples, Users],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  plugins: [samplePlugin({ enabled: true })],
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  endpoints:[
    {
      method: 'get',
      path: '/oauth/users/google/authorize',
      handler: async (req) => {
        const clientId = process.env.CLIENT_ID;
        const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_URL}/api/oauth/users/google/callback`);
        const scope = encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid');
        const responseType = 'code';
        const accessType = 'offline'; // Can be 'online' or 'offline'; offline provides a refresh token

        const authorizeUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&access_type=${accessType}`;

        return NextResponse.redirect(authorizeUrl);
      }
    },
    {
      method: 'get',
      path: '/oauth/users/google/callback',
      handler: async (req) => {
        const { code } = req.query;
        if (typeof code !== 'string') {
          return NextResponse.json({ error: 'Code not provided' }, { status: 400 });
        }

        const tokenEndpoint = 'https://oauth2.googleapis.com/token';
        const clientId = process.env.CLIENT_ID || "";
        const clientSecret = process.env.CLIENT_SECRET || "";
        const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/oauth/users/google/callback`;

        try {
          const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
            }).toString(),
          });

          const data = await response.json();

          if (data.error) {
            console.error('Failed to retrieve access token:', data);
            return NextResponse.json({ error: 'Failed to retrieve access token' }, { status: 401 });
          }

          // Here, you might want to handle the tokens, e.g., store them, use them to fetch user info, etc.
          console.log('Access Token:', data.access_token);

          // Access token retrieved, now fetch user info
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${data.access_token}`
            }
          });

          const userInfo = await userInfoResponse.json();

          if (userInfo.error) {
            console.error('Failed to retrieve user information:', userInfo);
            return NextResponse.json({ error: 'Failed to retrieve user information' }, { status: 401 });
          }

          // Log user info for demonstration; remove or secure logging for production!
          console.log('User Info:', userInfo);

          // Redirect or handle authentication session setup here:
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/admin`); // Redirect to a profile page or dashboard
        } catch (error) {
          console.error('Error during token exchange:', error);
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
      }
    }
  ]
})
