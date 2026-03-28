export default function Home() {
  return (
    <main className="h-screen flex">
      {/* Editor */}
      <div className="w-1/2 border-r p-6">
        <h1 className="text-xl font-semibold">Editor</h1>
      </div>

      {/* Preview */}
      <div className="w-1/2 p-6 bg-gray-50">
        <h1 className="text-xl font-semibold">Preview</h1>
      </div>
    </main>
  );
}