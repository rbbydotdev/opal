import LightningFS from "@isomorphic-git/lightning-fs";
import * as git from "isomorphic-git";
import http from "isomorphic-git/http/web";

type PushHelloWorldParams = {
  owner: string;
  repo: string;
  token: string;
  branch?: string; // default: 'main'
  gitCorsProxy?: string; // default: 'https://cors.isomorphic-git.org'
};

export async function pushHelloWorldToGitHubPages({
  owner,
  repo,
  token,
  branch = "main",
  gitCorsProxy = "https://cors.isomorphic-git.org",
}: PushHelloWorldParams): Promise<void> {
  // 1. Setup FS
  const fs = new LightningFS("fs");
  const pfs = fs.promises as typeof fs.promises;
  const dir = "/repo";

  // 2. Clone the repo
  await git.clone({
    fs: pfs,
    http,
    dir,
    gitCorsProxy,
    url: `https://github.com/${owner}/${repo}.git`,
    ref: branch,
    singleBranch: true,
    depth: 1,
    onAuth: () => ({ username: token, password: "" }),
  });

  // 3. Write hello world file
  await pfs.writeFile(`${dir}/index.html`, "<h1>Hello, world!</h1>");

  // 4. Stage the file
  await git.add({ fs: pfs, dir, filepath: "index.html" });

  // 5. Commit
  await git.commit({
    fs: pfs,
    dir,
    message: "Add hello world index.html",
    author: {
      name: "Your Name",
      email: "your-email@example.com",
    },
  });

  // 6. Push
  await git.push({
    fs: pfs,
    http,
    dir,
    gitCorsProxy,
    remote: "origin",
    ref: branch,
    onAuth: () => ({ username: token, password: "" }),
  });

  alert("Pushed hello world to GitHub Pages!");
}
