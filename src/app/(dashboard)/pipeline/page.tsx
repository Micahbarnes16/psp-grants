export default function PipelinePage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Pipeline</h2>
        <p className="mt-1 text-sm text-gray-500">
          Grants being researched or prepared for application.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-sm text-gray-400">Your pipeline is empty.</p>
      </div>
    </div>
  );
}
