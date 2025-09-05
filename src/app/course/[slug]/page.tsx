import { CourseSSGService } from '@/lib/services/course-ssg.service';

// Auto-rebuild every hour
export const revalidate = 3600;

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function CoursePage({ params }: PageProps) {
  const { slug } = params;
  
  // Get course data using SSG service
  const course = await CourseSSGService.getCourseBySlug(slug);
  
  if (!course) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Course Not Found</h1>
        <p>Could not find course with slug: {slug}</p>
      </div>
    );
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Course: {course.title}</h1>
      <p>Slug: {slug}</p>
      <p>Category: {course.category}</p>
      <p>Last updated: {new Date().toISOString()}</p>
      
      <div className="mt-8">
        <h2 className="text-xl mb-4">Course Data:</h2>
        <pre className="bg-gray-100 p-4 overflow-auto text-sm">
          {JSON.stringify(course, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// Generate static params for all courses
export async function generateStaticParams() {
  const courses = await CourseSSGService.getAllCourses();
  
  return courses.map((course) => ({
    slug: course.slug,
  }));
}
