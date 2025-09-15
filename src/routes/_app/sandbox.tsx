import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/sandbox")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <GridVsFlex />
    </div>
  );
}

const GridVsFlex: React.FC = () => {
  return (
    <div className="p-8 space-y-12 bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen">
      <h1 className="text-3xl font-extrabold text-center text-blue-700">CSS Grid vs Flexbox Column Stretching</h1>

      {/* GRID EXAMPLE */}
      <section>
        <h2 className="text-xl font-bold text-green-700 mb-4 text-center">🎨 CSS Grid (shared column widths)</h2>
        <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto border-2 border-green-500">
          <div className="bg-pink-300 p-4 text-center">Short</div>
          <div className="bg-purple-300 p-4 text-center">Short</div>
          <div className="bg-yellow-300 p-4 text-center">LooooooooooooooooooooooooooooongTextWithoutSpaces</div>
          <div className="bg-teal-300 p-4 text-center">Short</div>
        </div>
        <p className="text-sm text-gray-700 mt-2 text-center">
          👉 Grid synchronizes column widths across rows. The extra-wide item in
          <b> column 1</b> makes column 1 stretch in <b>all rows</b>.
        </p>
      </section>

      {/* FLEXBOX EXAMPLE */}
      <section>
        <h2 className="text-xl font-bold text-red-700 mb-4 text-center">🎨 Flexbox (independent rows)</h2>
        <div className="flex flex-wrap max-w-xl mx-auto gap-4 border-2 border-red-500">
          <div className="flex-1 basis-1/2 bg-pink-300 p-4 text-center">Short</div>
          <div className="flex-1 basis-1/2 bg-purple-300 p-4 text-center">Short</div>
          <div className="flex-1 basis-1/2 bg-yellow-300 p-4 text-center">
            LooooooooooooooooooooooooooooongTextWithoutSpaces
          </div>
          <div className="flex-1 basis-1/2 bg-teal-300 p-4 text-center">Short</div>
        </div>
        <p className="text-sm text-gray-700 mt-2 text-center">
          👉 Flex lays out each row independently. The wide item in row 2 makes only that row stretch, but leaves row 1
          intact.
        </p>
      </section>
    </div>
  );
};

export default GridVsFlex;
