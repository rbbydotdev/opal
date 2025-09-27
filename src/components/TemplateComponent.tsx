import { Eta } from "eta/core";
export function TemplateComponent() {
  return <div>Template Component</div>;
}

const eta = new Eta({
  cache: false, // Disable cache for live editing
  autoEscape: false, // Allow HTML output
  debug: true,
});

async function testEta() {
  await eta.renderStringAsync("Hello <%= it.name %>!", { name: "World" }).then((result) => {
    console.log(result); // Should output: Hello World!
  });
}

testEta();

function RouteComponent() {
  return <div>Hello "/_app/templates"!</div>;
}
