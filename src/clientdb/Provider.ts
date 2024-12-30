import { ClientIndexedDb } from "@/clientdb";
import { Entity } from "dexie";

export class RemoteAuthDbRecord extends Entity<ClientIndexedDb> implements RemoteAuthRecord {
  guid!: string;
  type!: string;
  accessToken!: string; // The access token used to authenticate requests
  tokenType!: string; // Typically "Bearer"
  expiresIn!: number; // Time in seconds until the token expires
  refreshToken!: string; // Optional: The refresh token to obtain new access tokens
  scope!: string; // The scopes granted by the user
  obtainedAt!: number; // Timestamp when the token was obtained
  idToken!: string; // Optional: JWT token containing user identity information
}

export interface RemoteAuthRecord {
  guid: string;
  type: string;
  accessToken: string; // The access token used to authenticate requests
  tokenType: string; // Typically "Bearer"
  expiresIn: number; // Time in seconds until the token expires
  refreshToken: string; // Optional: The refresh token to obtain new access tokens
  scope: string; // The scopes granted by the user
  obtainedAt: number; // Timestamp when the token was obtained
  idToken: string; // Optional: JWT token containing user identity information
}
