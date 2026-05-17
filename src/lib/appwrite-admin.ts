import { Client, Databases, Users } from 'node-appwrite';

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '69ff1325002b662d7d07')
    .setKey(process.env.APPWRITE_API_KEY || '');

export const databasesAdmin = new Databases(client);
export const usersAdmin = new Users(client);
export { client as clientAdmin };
