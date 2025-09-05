import { BundleSSGService } from '@/lib/services/bundle-ssg.service';

// Auto-rebuild every hour
export const revalidate = 3600;

export default async function BundlesPage() {
  // Get bundles data using SSG service
  const bundles = await BundleSSGService.getAllBundles();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Bundles</h1>
      <p>Total bundles: {bundles.length}</p>
      <p>Last updated: {new Date().toISOString()}</p>
      
      <div className="mt-8">
        <h2 className="text-xl mb-4">Bundle Data:</h2>
        <pre className="bg-gray-100 p-4 overflow-auto text-sm">
          {JSON.stringify(bundles, null, 2)}
        </pre>
      </div>
    </div>
  );
}
