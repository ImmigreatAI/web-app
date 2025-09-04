// src/lib/stores/ui-store.ts - Updated for SSG with client-side filtering
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { CourseCategory, Course, Bundle } from '@/lib/types';

// ========================================
// SIMPLIFIED TYPES FOR CLIENT-SIDE FILTERING
// ========================================

interface ClientSideFilters {
  // Course Filters - Simplified for client-side
  courseFilters: {
    category?: CourseCategory;
    series?: string;
    tags?: string[];
    searchTerm: string;
  };
  
  // Bundle Filters - Simplified for client-side
  bundleFilters: {
    bundle_type?: string;
    category?: string; // Category based on contained courses
    searchTerm: string;
  };
}

interface PreloadedData {
  // Static data loaded from SSG
  courses: Course[];
  bundles: Bundle[];
  
  // Filter options computed from static data
  availableCategories: CourseCategory[];
  availableSeriesByCategory: Record<CourseCategory, string[]>;
  availableTagsByCategory: Record<CourseCategory, string[]>;
  availableBundleTypes: string[];
  
  // Loading state for initial data hydration
  isDataLoaded: boolean;
  dataLoadError: string | null;
}

interface UIState {
  // ========================================
  // DRAWER & MODAL STATES (Unchanged)
  // ========================================
  
  // Cart Drawer
  isCartDrawerOpen: boolean;
  cartDrawerAnimation: 'entering' | 'exiting' | 'idle';
  
  // Modals
  modals: {
    authModal: boolean;
    purchaseConfirmModal: boolean;
    coursePreviewModal: boolean;
    bundleDetailsModal: boolean;
    profileModal: boolean;
    helpModal: boolean;
  };
  
  // Modal Data
  modalData: {
    selectedCourseId?: string;
    selectedBundleId?: string;
    previewVideoUrl?: string;
    confirmationData?: any;
  };

  // ========================================
  // NAVIGATION & PAGE STATE (Unchanged)
  // ========================================
  
  // Current Page Context
  currentPage: 'home' | 'courses' | 'bundles' | 'course-detail' | 'bundle-detail' | 'my-purchases' | 'checkout' | 'other';
  previousPage: string | null;
  
  // Mobile Navigation
  isMobileMenuOpen: boolean;

  // ========================================
  // SIMPLIFIED CLIENT-SIDE FILTERING
  // ========================================
  
  // Pre-loaded static data for client-side operations
  preloadedData: PreloadedData;
  
  // Client-side filters (no API calls)
  courseFilters: ClientSideFilters['courseFilters'];
  bundleFilters: ClientSideFilters['bundleFilters'];
  
  // Active tabs
  activeCourseTab: 'courses' | 'bundles';
  activeCategoryTab: CourseCategory;
  
  // Filter panel state
  isFilterPanelOpen: boolean;
  isFilterPanelExpanded: boolean;

  // ========================================
  // USER-SPECIFIC LOADING STATES (Keep for authenticated operations)
  // ========================================
  
  // Loading states for user-specific operations only
  userOperationLoading: {
    cart: boolean;
    purchases: boolean;
    enrollments: boolean;
    profile: boolean;
  };
  
  // Global loading for user operations
  globalLoading: {
    message: string;
    isLoading: boolean;
  };
  
  // Error states
  errors: {
    global?: string;
    cart?: string;
    checkout?: string;
    userOperation?: string;
  };

  // ========================================
  // USER INTERFACE PREFERENCES (Unchanged)
  // ========================================
  
  // Theme & Display
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  
  // Accessibility
  reducedMotion: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  
  // Feature Flags
  features: {
    showBetaFeatures: boolean;
    enableAnimations: boolean;
    enableSounds: boolean;
  };

  // ========================================
  // ACTIONS - DRAWER & MODAL MANAGEMENT (Unchanged)
  // ========================================
  
  // Cart Drawer
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;
  
  // Modal Management
  openModal: (modalType: keyof UIState['modals'], data?: any) => void;
  closeModal: (modalType: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  setModalData: (data: Partial<UIState['modalData']>) => void;
  
  // Mobile Navigation
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;

  // ========================================
  // ACTIONS - SIMPLIFIED CLIENT-SIDE FILTERING
  // ========================================
  
  // Pre-loaded data management
  setPreloadedData: (data: Partial<PreloadedData>) => void;
  setDataLoaded: (loaded: boolean) => void;
  setDataLoadError: (error: string | null) => void;
  
  // Client-side filter actions (no API calls)
  setCourseFilter: <K extends keyof UIState['courseFilters']>(key: K, value: UIState['courseFilters'][K]) => void;
  resetCourseFilters: () => void;
  setCourseSearchTerm: (term: string) => void;
  
  setBundleFilter: <K extends keyof UIState['bundleFilters']>(key: K, value: UIState['bundleFilters'][K]) => void;
  resetBundleFilters: () => void;
  setBundleSearchTerm: (term: string) => void;
  
  // Tab Management
  setActiveCourseTab: (tab: 'courses' | 'bundles') => void;
  setActiveCategoryTab: (category: CourseCategory) => void;
  
  // Filter Panel
  toggleFilterPanel: () => void;
  setFilterPanelExpanded: (expanded: boolean) => void;

  // ========================================
  // ACTIONS - PAGE & LOADING MANAGEMENT (Simplified)
  // ========================================
  
  // Page Management
  setCurrentPage: (page: UIState['currentPage']) => void;
  goBack: () => void;
  
  // User operation loading states (no public page loading)
  setUserOperationLoading: (operation: keyof UIState['userOperationLoading'], loading: boolean) => void;
  setGlobalLoading: (loading: boolean, message?: string) => void;
  
  // Error Management
  setError: (errorType: keyof UIState['errors'], error: string | null) => void;
  clearErrors: () => void;
  clearError: (errorType: keyof UIState['errors']) => void;

  // ========================================
  // ACTIONS - PREFERENCES (Unchanged)
  // ========================================
  
  setTheme: (theme: UIState['theme']) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  setFontSize: (size: UIState['fontSize']) => void;
  toggleFeature: (feature: keyof UIState['features']) => void;
  setFeature: (feature: keyof UIState['features'], enabled: boolean) => void;

  // ========================================
  // UTILITIES - SIMPLIFIED FOR CLIENT-SIDE
  // ========================================
  
  // Client-side filtering utilities
  getFilteredCourses: () => Course[];
  getFilteredBundles: () => Bundle[];
  hasActiveFilters: (type: 'courses' | 'bundles') => boolean;
  getActiveFilterCount: (type: 'courses' | 'bundles') => number;
  isModalOpen: (modalType?: keyof UIState['modals']) => boolean;
  hasErrors: () => boolean;
  
  // Get available filter options for current data
  getAvailableSeriesForCategory: (category: CourseCategory) => string[];
  getAvailableTagsForCategory: (category: CourseCategory) => string[];
}

// ========================================
// INITIAL STATE
// ========================================

const initialCourseFilters: UIState['courseFilters'] = {
  category: undefined,
  series: undefined,
  tags: undefined,
  searchTerm: '',
};

const initialBundleFilters: UIState['bundleFilters'] = {
  bundle_type: undefined,
  category: undefined,
  searchTerm: '',
};

const initialPreloadedData: PreloadedData = {
  courses: [],
  bundles: [],
  availableCategories: [],
  availableSeriesByCategory: {} as Record<CourseCategory, string[]>,
  availableTagsByCategory: {} as Record<CourseCategory, string[]>,
  availableBundleTypes: [],
  isDataLoaded: false,
  dataLoadError: null,
};

// ========================================
// CLIENT-SIDE FILTERING UTILITIES
// ========================================

function filterCourses(
  courses: Course[],
  filters: UIState['courseFilters']
): Course[] {
  let filtered = [...courses];

  // Apply category filter
  if (filters.category) {
    filtered = filtered.filter(course => course.category === filters.category);
  }

  // Apply series filter
  if (filters.series) {
    filtered = filtered.filter(course => course.series === filters.series);
  }

  // Apply tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(course => {
      const courseTags = course.metadata?.tags || [];
      return filters.tags!.some(tag => courseTags.includes(tag));
    });
  }

  // Apply search filter
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const searchTerm = filters.searchTerm.toLowerCase().trim();
    filtered = filtered.filter(course => {
      const searchableText = [
        course.title,
        course.description,
        course.category,
        course.series,
        ...(course.metadata?.tags || [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }

  return filtered;
}

function filterBundles(
  bundles: Bundle[],
  filters: UIState['bundleFilters'],
  courses: Course[]
): Bundle[] {
  let filtered = [...bundles];

  // Apply bundle type filter
  if (filters.bundle_type) {
    filtered = filtered.filter(bundle => bundle.bundle_type === filters.bundle_type);
  }

  // Apply category filter (based on contained courses)
  if (filters.category) {
    const courseMap = new Map<string, Course>();
    courses.forEach(course => courseMap.set(course.id, course));

    filtered = filtered.filter(bundle => {
      return bundle.course_ids.some(courseId => {
        const course = courseMap.get(courseId);
        return course?.category === filters.category;
      });
    });
  }

  // Apply search filter
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const searchTerm = filters.searchTerm.toLowerCase().trim();
    const courseMap = new Map<string, Course>();
    courses.forEach(course => courseMap.set(course.id, course));

    filtered = filtered.filter(bundle => {
      const searchableText = [
        bundle.title,
        bundle.description,
        bundle.bundle_type,
        // Include course titles for search
        ...bundle.course_ids.map(courseId => courseMap.get(courseId)?.title).filter(Boolean)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }

  return filtered;
}

// ========================================
// UI STORE - UPDATED FOR SSG
// ========================================

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================
    // INITIAL STATE
    // ========================================
    
    // Drawer & Modal States (unchanged)
    isCartDrawerOpen: false,
    cartDrawerAnimation: 'idle',
    
    modals: {
      authModal: false,
      purchaseConfirmModal: false,
      coursePreviewModal: false,
      bundleDetailsModal: false,
      profileModal: false,
      helpModal: false,
    },
    
    modalData: {},
    
    // Navigation & Page State (unchanged)
    currentPage: 'home',
    previousPage: null,
    isMobileMenuOpen: false,
    
    // Simplified filtering state
    preloadedData: initialPreloadedData,
    courseFilters: initialCourseFilters,
    bundleFilters: initialBundleFilters,
    activeCourseTab: 'courses',
    activeCategoryTab: 'EB1A',
    isFilterPanelOpen: false,
    isFilterPanelExpanded: false,
    
    // User-specific loading states only
    userOperationLoading: {
      cart: false,
      purchases: false,
      enrollments: false,
      profile: false,
    },
    
    globalLoading: {
      message: '',
      isLoading: false,
    },
    
    errors: {},
    
    // User Interface Preferences (unchanged)
    theme: 'light',
    sidebarCollapsed: false,
    reducedMotion: false,
    fontSize: 'md',
    
    features: {
      showBetaFeatures: false,
      enableAnimations: true,
      enableSounds: false,
    },

    // ========================================
    // DRAWER & MODAL ACTIONS (Unchanged)
    // ========================================

    openCartDrawer: () => {
      set({ 
        isCartDrawerOpen: true, 
        cartDrawerAnimation: 'entering',
        isMobileMenuOpen: false,
      });
      
      setTimeout(() => {
        set({ cartDrawerAnimation: 'idle' });
      }, 300);
    },

    closeCartDrawer: () => {
      set({ cartDrawerAnimation: 'exiting' });
      
      setTimeout(() => {
        set({ 
          isCartDrawerOpen: false, 
          cartDrawerAnimation: 'idle' 
        });
      }, 300);
    },

    toggleCartDrawer: () => {
      const isOpen = get().isCartDrawerOpen;
      if (isOpen) {
        get().closeCartDrawer();
      } else {
        get().openCartDrawer();
      }
    },

    openModal: (modalType, data) => {
      set(state => ({
        modals: {
          ...state.modals,
          [modalType]: true,
        },
        modalData: data ? { ...state.modalData, ...data } : state.modalData,
        isMobileMenuOpen: false,
        isCartDrawerOpen: modalType === 'purchaseConfirmModal' ? false : state.isCartDrawerOpen,
      }));
    },

    closeModal: (modalType) => {
      set(state => ({
        modals: {
          ...state.modals,
          [modalType]: false,
        },
      }));
    },

    closeAllModals: () => {
      set({
        modals: {
          authModal: false,
          purchaseConfirmModal: false,
          coursePreviewModal: false,
          bundleDetailsModal: false,
          profileModal: false,
          helpModal: false,
        },
        modalData: {},
      });
    },

    setModalData: (data) => {
      set(state => ({
        modalData: { ...state.modalData, ...data },
      }));
    },

    toggleMobileMenu: () => {
      set(state => ({
        isMobileMenuOpen: !state.isMobileMenuOpen,
        isCartDrawerOpen: !state.isMobileMenuOpen ? false : state.isCartDrawerOpen,
      }));
    },

    closeMobileMenu: () => {
      set({ isMobileMenuOpen: false });
    },

    // ========================================
    // PRE-LOADED DATA ACTIONS
    // ========================================

    setPreloadedData: (data) => {
      set(state => ({
        preloadedData: {
          ...state.preloadedData,
          ...data,
        },
      }));
    },

    setDataLoaded: (loaded) => {
      set(state => ({
        preloadedData: {
          ...state.preloadedData,
          isDataLoaded: loaded,
        },
      }));
    },

    setDataLoadError: (error) => {
      set(state => ({
        preloadedData: {
          ...state.preloadedData,
          dataLoadError: error,
        },
      }));
    },

    // ========================================
    // CLIENT-SIDE FILTER ACTIONS (Simplified - No API calls)
    // ========================================

    setCourseFilter: (key, value) => {
      set(state => ({
        courseFilters: {
          ...state.courseFilters,
          [key]: value,
        },
      }));
    },

    resetCourseFilters: () => {
      set({ courseFilters: initialCourseFilters });
    },

    setCourseSearchTerm: (term) => {
      set(state => ({
        courseFilters: {
          ...state.courseFilters,
          searchTerm: term,
        },
      }));
    },

    setBundleFilter: (key, value) => {
      set(state => ({
        bundleFilters: {
          ...state.bundleFilters,
          [key]: value,
        },
      }));
    },

    resetBundleFilters: () => {
      set({ bundleFilters: initialBundleFilters });
    },

    setBundleSearchTerm: (term) => {
      set(state => ({
        bundleFilters: {
          ...state.bundleFilters,
          searchTerm: term,
        },
      }));
    },

    setActiveCourseTab: (tab) => {
      set({ activeCourseTab: tab });
    },

    setActiveCategoryTab: (category) => {
      set({ 
        activeCategoryTab: category,
        // Reset course filters when changing category
        courseFilters: {
          ...initialCourseFilters,
          category,
        },
      });
    },

    toggleFilterPanel: () => {
      set(state => ({
        isFilterPanelOpen: !state.isFilterPanelOpen,
      }));
    },

    setFilterPanelExpanded: (expanded) => {
      set({ isFilterPanelExpanded: expanded });
    },

    // ========================================
    // PAGE & LOADING ACTIONS (Simplified)
    // ========================================

    setCurrentPage: (page) => {
      set(state => ({
        previousPage: state.currentPage,
        currentPage: page,
        isMobileMenuOpen: false,
      }));
    },

    goBack: () => {
      const { previousPage } = get();
      if (previousPage) {
        set(state => ({
          currentPage: previousPage as UIState['currentPage'],
          previousPage: null,
        }));
      }
    },

    setUserOperationLoading: (operation, loading) => {
      set(state => ({
        userOperationLoading: {
          ...state.userOperationLoading,
          [operation]: loading,
        },
      }));
    },

    setGlobalLoading: (loading, message = '') => {
      set({
        globalLoading: {
          isLoading: loading,
          message,
        },
      });
    },

    setError: (errorType, error) => {
      set(state => ({
        errors: {
          ...state.errors,
          [errorType]: error,
        },
      }));
    },

    clearErrors: () => {
      set({ errors: {} });
    },

    clearError: (errorType) => {
      set(state => {
        const newErrors = { ...state.errors };
        delete newErrors[errorType];
        return { errors: newErrors };
      });
    },

    // ========================================
    // PREFERENCE ACTIONS (Unchanged)
    // ========================================

    setTheme: (theme) => {
      set({ theme });
      
      if (typeof document !== 'undefined') {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    },

    toggleSidebar: () => {
      set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
    },

    setSidebarCollapsed: (collapsed) => {
      set({ sidebarCollapsed: collapsed });
    },

    setReducedMotion: (reduced) => {
      set({ reducedMotion: reduced });
      
      if (typeof document !== 'undefined') {
        if (reduced) {
          document.documentElement.style.setProperty('--animation-duration', '0ms');
        } else {
          document.documentElement.style.removeProperty('--animation-duration');
        }
      }
    },

    setFontSize: (size) => {
      set({ fontSize: size });
      
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('text-sm', 'text-md', 'text-lg');
        document.documentElement.classList.add(`text-${size}`);
      }
    },

    toggleFeature: (feature) => {
      set(state => ({
        features: {
          ...state.features,
          [feature]: !state.features[feature],
        },
      }));
    },

    setFeature: (feature, enabled) => {
      set(state => ({
        features: {
          ...state.features,
          [feature]: enabled,
        },
      }));
    },

    // ========================================
    // CLIENT-SIDE FILTERING UTILITIES
    // ========================================

    getFilteredCourses: () => {
      const { preloadedData, courseFilters } = get();
      return filterCourses(preloadedData.courses, courseFilters);
    },

    getFilteredBundles: () => {
      const { preloadedData, bundleFilters } = get();
      return filterBundles(preloadedData.bundles, bundleFilters, preloadedData.courses);
    },

    hasActiveFilters: (type) => {
      const state = get();
      const filters = type === 'courses' ? state.courseFilters : state.bundleFilters;
      
      return Object.entries(filters).some(([key, value]) => {
        if (key === 'searchTerm') return value && value.length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null;
      });
    },

    getActiveFilterCount: (type) => {
      const state = get();
      const filters = type === 'courses' ? state.courseFilters : state.bundleFilters;
      
      return Object.entries(filters).filter(([key, value]) => {
        if (key === 'searchTerm') return value && value.length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null;
      }).length;
    },

    isModalOpen: (modalType) => {
      const state = get();
      if (modalType) {
        return state.modals[modalType];
      }
      return Object.values(state.modals).some(Boolean);
    },

    hasErrors: () => {
      const errors = get().errors;
      return Object.values(errors).some(error => error !== null && error !== undefined);
    },

    getAvailableSeriesForCategory: (category) => {
      const { preloadedData } = get();
      return preloadedData.availableSeriesByCategory[category] || [];
    },

    getAvailableTagsForCategory: (category) => {
      const { preloadedData } = get();
      return preloadedData.availableTagsByCategory[category] || [];
    },
  }))
);

// ========================================
// CONVENIENCE HOOKS (Updated)
// ========================================

export const useCartDrawer = () => {
  const store = useUIStore();
  return {
    isOpen: store.isCartDrawerOpen,
    animation: store.cartDrawerAnimation,
    open: store.openCartDrawer,
    close: store.closeCartDrawer,
    toggle: store.toggleCartDrawer,
  };
};

export const useModalState = () => {
  const store = useUIStore();
  return {
    modals: store.modals,
    modalData: store.modalData,
    openModal: store.openModal,
    closeModal: store.closeModal,
    closeAllModals: store.closeAllModals,
    setModalData: store.setModalData,
    isModalOpen: store.isModalOpen,
  };
};

// Updated for client-side filtering
export const useFilters = (type: 'courses' | 'bundles') => {
  const store = useUIStore();
  
  if (type === 'courses') {
    return {
      filters: store.courseFilters,
      setFilter: store.setCourseFilter,
      resetFilters: store.resetCourseFilters,
      setSearchTerm: store.setCourseSearchTerm,
      hasActiveFilters: store.hasActiveFilters('courses'),
      activeFilterCount: store.getActiveFilterCount('courses'),
      filteredData: store.getFilteredCourses(), // Pre-filtered data
      availableSeries: store.getAvailableSeriesForCategory(store.activeCategoryTab),
      availableTags: store.getAvailableTagsForCategory(store.activeCategoryTab),
    };
  } else {
    return {
      filters: store.bundleFilters,
      setFilter: store.setBundleFilter,
      resetFilters: store.resetBundleFilters,
      setSearchTerm: store.setBundleSearchTerm,
      hasActiveFilters: store.hasActiveFilters('bundles'),
      activeFilterCount: store.getActiveFilterCount('bundles'),
      filteredData: store.getFilteredBundles(), // Pre-filtered data
      availableBundleTypes: store.preloadedData.availableBundleTypes,
    };
  }
};

export const usePageState = () => {
  const store = useUIStore();
  return {
    currentPage: store.currentPage,
    previousPage: store.previousPage,
    setCurrentPage: store.setCurrentPage,
    goBack: store.goBack,
    userOperationLoading: store.userOperationLoading, // Simplified loading
    setUserOperationLoading: store.setUserOperationLoading,
    globalLoading: store.globalLoading,
    setGlobalLoading: store.setGlobalLoading,
  };
};

export const useErrorState = () => {
  const store = useUIStore();
  return {
    errors: store.errors,
    setError: store.setError,
    clearError: store.clearError,
    clearErrors: store.clearErrors,
    hasErrors: store.hasErrors,
  };
};

export const usePreferences = () => {
  const store = useUIStore();
  return {
    theme: store.theme,
    setTheme: store.setTheme,
    sidebarCollapsed: store.sidebarCollapsed,
    toggleSidebar: store.toggleSidebar,
    setSidebarCollapsed: store.setSidebarCollapsed,
    reducedMotion: store.reducedMotion,
    setReducedMotion: store.setReducedMotion,
    fontSize: store.fontSize,
    setFontSize: store.setFontSize,
    features: store.features,
    toggleFeature: store.toggleFeature,
    setFeature: store.setFeature,
  };
};

// New hook for pre-loaded data management
export const usePreloadedData = () => {
  const store = useUIStore();
  return {
    data: store.preloadedData,
    setData: store.setPreloadedData,
    setLoaded: store.setDataLoaded,
    setError: store.setDataLoadError,
    isLoaded: store.preloadedData.isDataLoaded,
    hasError: !!store.preloadedData.dataLoadError,
  };
};