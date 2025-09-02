// src/app/api/bundles/route.ts - Fetch bundles with filters
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BundleDataService } from '@/lib/services/bundle-data.service';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';
import { BundleFilters } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters: BundleFilters = {
      bundle_type: searchParams.get('bundle_type') as any || undefined,
    };

    // Additional query parameters
    const searchTerm = searchParams.get('search') || undefined;
    const includeOwnership = searchParams.get('include_ownership') === 'true';
    const includeCourses = searchParams.get('include_courses') === 'true';

    // Create bundle service
    const bundleService = new BundleDataService();
    
    // Get bundles based on filters
    let bundles;
    if (searchTerm) {
      bundles = await bundleService.searchBundles(searchTerm);
    } else {
      bundles = await bundleService.getAllBundles(filters);
    }

    let processedBundles = bundles;

    // Include course details if requested
    if (includeCourses) {
      const bundlesWithCourses = await Promise.all(
        bundles.map(async (bundle) => {
          try {
            const bundleWithCourses = await bundleService.getBundleWithCourses(bundle.id);
            return bundleWithCourses;
          } catch (error) {
            console.error(`Error loading courses for bundle ${bundle.id}:`, error);
            return { ...bundle, courses: [] } as any;
          }
        })
      );
      processedBundles = bundlesWithCourses.filter(Boolean) as any[];
    }

    // Include ownership status if requested and user is authenticated
    if (includeOwnership && userId) {
      const purchaseService = new PurchaseTrackingService();
      
      // Check ownership for each bundle
      processedBundles = await Promise.all(
        processedBundles.map(async (bundle) => {
          try {
            // Check if user has active enrollment for this bundle
            const enrollments = await purchaseService.getUserActiveEnrollments(userId);
            const bundleEnrollment = enrollments.find(enrollment => 
              enrollment.enrollment_type === 'bundle' && enrollment.item_id === bundle.id
            );

            return {
              ...bundle,
              user_owns: !!bundleEnrollment,
              expires_at: bundleEnrollment?.expires_at || null,
              days_until_expiry: bundleEnrollment ? 
                Math.ceil((new Date(bundleEnrollment.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
                null,
            };
          } catch (error) {
            console.error(`Error checking ownership for bundle ${bundle.id}:`, error);
            return {
              ...bundle,
              user_owns: false,
              expires_at: null,
              days_until_expiry: null,
            };
          }
        })
      );
    }

    // Calculate savings for bundles with courses
    const enrichedBundles = processedBundles.map(bundle => {
      if (includeCourses && 'courses' in bundle && bundle.courses) {
        const bundleWithCourses = bundle as any; // Type assertion for bundle with courses
        const savings = bundleService.calculateBundleSavings(bundleWithCourses);
        return {
          ...bundle,
          calculated_savings: {
            total_individual_price: savings.totalIndividualPrice,
            bundle_price: savings.bundlePrice,
            savings_amount: savings.savings,
            savings_percentage: savings.savingsPercentage,
          },
        };
      }
      return bundle;
    });

    // Prepare response
    const response = {
      success: true,
      data: enrichedBundles,
      meta: {
        total: bundles.length,
        filters_applied: Object.keys(filters).filter(key => filters[key as keyof BundleFilters] !== undefined),
        search_term: searchTerm || null,
        includes_courses: includeCourses,
        includes_ownership: includeOwnership && !!userId,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching bundles:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch bundles',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}