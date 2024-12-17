import { Editor } from "@/components/Editor/Editor";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <div className="w-screen h-screen border-4 border-black">{children}</div>;
};
export default function Home() {
  return (
    <Layout>
      <Editor markdown={"# Hello World\n\n## Hello World\n\n### Hello World\n\nHello World"} />
    </Layout>
  );
}
