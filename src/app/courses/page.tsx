import { CourseSSGService } from '@/lib/services/course-ssg.service';

// Auto-rebuild every hour
export const revalidate = 3600;

export default async function CoursesPage() {
  // Get courses data using SSG service
  const courses = await CourseSSGService.getAllCourses();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Courses</h1>
      <p>Total courses: {courses.length}</p>
      <p>Last updated: {new Date().toISOString()}</p>
      
      <div className="mt-8">
        <h2 className="text-xl mb-4">Course Data:</h2>
        <pre className="bg-gray-100 p-4 overflow-auto text-sm">
          {JSON.stringify(courses, null, 2)}
        </pre>
      </div>
    </div>
  );
}
