export const SandboxWorkerAPI = {
  async dothing() {
    const randMs = Math.floor(Math.random() * 10) * 1000; // 1 to 10 seconds
    await new Promise((rs) => setTimeout(rs, randMs));
    return randMs;
  },
};
export type SandboxWorkerAPIType = typeof SandboxWorkerAPI;
