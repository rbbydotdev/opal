import ProviderAuth from "@/oauthprovider";

class Client {}

class Agent {
  client = Client;
  constructor() {
    console.log("Agent constructor");
  }
}

class GithubAgent extends Agent {
  // ProviderAuth = new ProviderAuth();

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
