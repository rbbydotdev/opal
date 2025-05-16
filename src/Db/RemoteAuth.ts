import { ClientDb } from "@/Db/instance";
import { RemoteAuthRecord } from "@/Db/RemoteAuthRecord";
import { nanoid } from "nanoid";
export type RemoteAuthJType = {
  guid: string;
  type: string;
};
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
    return new RemoteAuthDAO({
      guid: nanoid(),
    } as unknown as RemoteAuthRecord);
  }
  save() {
    return ClientDb.remoteAuths.put(this);
  }
  toModel() {
    return new RemoteAuth(this);
  }
  hydrate() {
    return ClientDb.remoteAuths.get(this.guid).then((ra) => {
      if (!ra) throw new Error("RemoteAuth not found");
      Object.assign(this, ra);
      return this;
    });
  }
  static fromJSON(json: RemoteAuthJType) {
    return new RemoteAuthDAO({
      guid: json.guid,
      type: json.type,
    } as unknown as RemoteAuthRecord);
  }
  toJSON() {
    return {
      guid: this.guid,
      type: this.type,
    };
  }
}

export class RemoteAuth extends RemoteAuthDAO {
  constructor(arg: Partial<RemoteAuthRecord>) {
    super(arg as RemoteAuthRecord);
    Object.assign(this, arg);
  }
}

export class NullRemoteAuth extends RemoteAuthDAO {
  constructor() {
    super({
      guid: "",
      type: "",
      accessToken: "",
      tokenType: "",
      expiresIn: 0,
      refreshToken: "",
      scope: "",
      obtainedAt: 0,
      idToken: "",
    });
  }
}
