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
          <Link href="/courses/eb1a" className="text-blue-600 hover:underline font-medium">
            Explore EB1A →
          </Link>
        </div>
        
        <div className="text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-semibold mb-3 text-purple-600">EB2-NIW Courses</h3>
          <p className="text-gray-600 mb-4">National Interest Waiver courses</p>
          <Link href="/courses/eb2-niw" className="text-purple-600 hover:underline font-medium">
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
    </div>
  );
}