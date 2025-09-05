// src/app/page.tsx (Updated)
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          Master Your Immigration Journey
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Expert-guided courses for EB1A, EB2-NIW and more. Get the knowledge and tools you need to succeed.
        </p>
        <div className="space-x-4">
          <Link 
            href="/courses" 
            className="bg-amber-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-amber-600 transition-colors"
          >
            Browse Courses
          </Link>
          <Link 
            href="/bundles" 
            className="bg-green-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-600 transition-colors"
          >
            View Bundles
          </Link>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-semibold mb-3 text-blue-600">EB1A Courses</h3>
          <p className="text-gray-600 mb-4">Extraordinary Ability petition courses</p>
          <Link href="/courses?tab=EB1A" className="text-blue-600 hover:underline font-medium">
            Explore EB1A →
          </Link>
        </div>
        
        <div className="text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-semibold mb-3 text-purple-600">EB2-NIW Courses</h3>
          <p className="text-gray-600 mb-4">National Interest Waiver courses</p>
          <Link href="/courses?tab=EB2-NIW" className="text-purple-600 hover:underline font-medium">
            Explore EB2-NIW →
          </Link>
        </div>
        
        <div className="text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-semibold mb-3 text-green-600">Course Bundles</h3>
          <p className="text-gray-600 mb-4">Complete learning paths with savings</p>
          <Link href="/bundles" className="text-green-600 hover:underline font-medium">
            View Bundles →
          </Link>
        </div>
      </div>

      {/* Test Links Section */}
      <div className="bg-gray-50 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-6">Test the Implementation</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-600">Course Routes</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/courses" className="text-blue-600 hover:underline">
                  📚 Main Course Hub
                </Link>
              </li>
              <li>
                <Link href="/courses?tab=EB1A" className="text-blue-600 hover:underline">
                  🎯 EB1A Tab Filter
                </Link>
              </li>
              <li>
                <Link href="/courses/eb1a" className="text-blue-600 hover:underline">
                  📂 EB1A Category Page
                </Link>
              </li>
              <li>
                <Link href="/courses/eb1a?tag=awards" className="text-blue-600 hover:underline">
                  🏷️ EB1A with Awards Tag
                </Link>
              </li>
              <li>
                <Link href="/courses/eb1a/fundamental" className="text-blue-600 hover:underline">
                  📖 EB1A Fundamental Series
                </Link>
              </li>
              <li className="text-sm text-gray-600">
                Individual course: /courses/eb1a/fundamental/[course-slug]
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-green-600">Bundle Routes</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/bundles" className="text-green-600 hover:underline">
                  📦 Main Bundle Hub
                </Link>
              </li>
              <li>
                <Link href="/bundles?type=curated" className="text-green-600 hover:underline">
                  ✨ Curated Bundles
                </Link>
              </li>
              <li>
                <Link href="/bundles?type=premium" className="text-green-600 hover:underline">
                  💎 Premium Bundles
                </Link>
              </li>
              <li>
                <Link href="/bundles?search=eb1a" className="text-green-600 hover:underline">
                  🔍 Bundle Search
                </Link>
              </li>
              <li className="text-sm text-gray-600">
                Individual bundle: /bundles/[bundle-slug]
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 rounded border-l-4 border-yellow-400">
          <h4 className="font-semibold text-yellow-800 mb-2">📝 Implementation Status</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>✅ All route structures implemented</li>
            <li>✅ API data fetching working</li>
            <li>✅ Query parameter handling</li>
            <li>✅ Search functionality</li>
            <li>✅ Category/tag filtering</li>
            <li>✅ Error handling & loading states</li>
            <li>✅ Debug information displayed</li>
            <li>⚠️ No styling applied (basic functionality only)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}