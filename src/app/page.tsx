import { ClientPage } from "@/app/page-client";
import fs from "fs";
const md = fs.readFileSync(process.cwd() + "/src/app/kitchen-sink.md", "utf-8");
export default function Home() {
  return <ClientPage md={md} />;
}
