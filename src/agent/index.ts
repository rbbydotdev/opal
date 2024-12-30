import RemoteAuth from "@/oauthprovider";

class Client {}

class Agent {
  client = Client;
  constructor() {
    console.log("Agent constructor");
  }
}

class GithubAgent extends Agent {
  // RemoteAuth = new RemoteAuth();

  constructor() {
    super();
    console.log("GithubAgent constructor");
  }
}

class LocalAgent extends Agent {
  constructor() {
    super();
    console.log("LocalAgent constructor");
  }
}
