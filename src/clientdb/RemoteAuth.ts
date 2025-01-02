export class RemoteAuthRecord {
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
export class RemoteAuthDAO implements RemoteAuthRecord {
  guid!: string;
  type!: string;
  accessToken!: string;
  tokenType!: string;
  expiresIn!: number;
  refreshToken!: string;
  scope!: string;
  obtainedAt!: number;
  idToken!: string;
  constructor(remoteAuth: RemoteAuthRecord) {
    Object.assign(this, remoteAuth);
  }
  static new() {
    return new RemoteAuthDAO({} as any);
  }
  save() {}
  toModel() {
    return new RemoteAuth(this);
  }
}

export class RemoteAuth implements RemoteAuthRecord {
  guid!: string;
  type!: string;
  accessToken!: string;
  tokenType!: string;
  expiresIn!: number;
  refreshToken!: string;
  scope!: string;
  obtainedAt!: number;
  idToken!: string;
  constructor(ra: RemoteAuthRecord) {
    Object.assign(this, ra);
  }
}
