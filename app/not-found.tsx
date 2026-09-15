import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-6 text-center">
      <h2 className="text-2xl font-bold mb-4">ទំព័រនេះមិនមានទេ (404)</h2>
      <p className="text-slate-500 mb-8">យើងមិនអាចស្វែងរកទំព័រដែលអ្នកកំពុងស្វែងរកបានទេ។</p>
      <Link 
        href="/" 
        className="px-8 py-3 bg-[#094C72] text-white rounded-2xl font-bold hover:bg-[#073652] transition-all"
      >
        ត្រឡប់ទៅទំព័រដើម
      </Link>
    </div>
  );
}
