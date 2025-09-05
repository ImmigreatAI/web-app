import { BundleSSGService } from '@/lib/services/bundle-ssg.service';

// Auto-rebuild every hour
export const revalidate = 3600;

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function BundlePage({ params }: PageProps) {
  const { slug } = params;
  
  // Get bundle data using SSG service
  const bundle = await BundleSSGService.getBundleBySlug(slug);
  
  if (!bundle) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Bundle Not Found</h1>
        <p>Could not find bundle with slug: {slug}</p>
      </div>
    );
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Bundle: {bundle.title}</h1>
      <p>Slug: {slug}</p>
      <p>Type: {bundle.bundle_type}</p>
      <p>Courses included: {bundle.courses?.length || 0}</p>
      <p>Last updated: {new Date().toISOString()}</p>
      
      <div className="mt-8">
        <h2 className="text-xl mb-4">Bundle Data:</h2>
        <pre className="bg-gray-100 p-4 overflow-auto text-sm">
          {JSON.stringify(bundle, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// Generate static params for all bundles
export async function generateStaticParams() {
  const bundles = await BundleSSGService.getAllBundles();
  
  return bundles.map((bundle) => ({
    slug: bundle.slug,
  }));
}