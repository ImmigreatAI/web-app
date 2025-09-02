// src/lib/stores/ui-store.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { CourseCategory, CourseFilters, BundleFilters } from '@/lib/types';

// ========================================
// TYPES
// ========================================

interface UIState {
  // ========================================
  // DRAWER & MODAL STATES
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
  // NAVIGATION & PAGE STATE
  // ========================================
  
  // Current Page Context
  currentPage: 'home' | 'courses' | 'bundles' | 'course-detail' | 'bundle-detail' | 'my-purchases' | 'checkout' | 'other';
  previousPage: string | null;
  
  // Mobile Navigation
  isMobileMenuOpen: boolean;
  
  // Page Loading States
  pageLoading: {
    courses: boolean;
    bundles: boolean;
    purchases: boolean;
    enrollments: boolean;
  };

  // ========================================
  // FILTER STATES
  // ========================================
  
  // Course Filters
  courseFilters: CourseFilters & {
    searchTerm: string;
  };
  
  // Bundle Filters
  bundleFilters: BundleFilters & {
    searchTerm: string;
  };
  
  // Active Course Tab
  activeCourseTab: 'courses' | 'bundles';
  activeCategoryTab: CourseCategory;
  
  // Filter Panel State
  isFilterPanelOpen: boolean;
  isFilterPanelExpanded: boolean;

  // ========================================
  // LOADING & ERROR STATES
  // ========================================
  
  // Global Loading State
  globalLoading: {
    message: string;
    isLoading: boolean;
  };
  
  // Toast Notifications State
  toastQueue: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
    duration?: number;
  }>;
  
  // Error States
  errors: {
    global?: string;
    courses?: string;
    bundles?: string;
    cart?: string;
    checkout?: string;
  };

  // ========================================
  // USER INTERFACE PREFERENCES
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
  // ACTIONS - DRAWER & MODAL MANAGEMENT
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
  // ACTIONS - FILTER MANAGEMENT
  // ========================================
  
  // Course Filters
  setCourseFilter: <K extends keyof UIState['courseFilters']>(key: K, value: UIState['courseFilters'][K]) => void;
  resetCourseFilters: () => void;
  setCourseSearchTerm: (term: string) => void;
  
  // Bundle Filters
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
  // ACTIONS - PAGE & LOADING MANAGEMENT
  // ========================================
  
  // Page Management
  setCurrentPage: (page: UIState['currentPage']) => void;
  goBack: () => void;
  
  // Loading States
  setPageLoading: (page: keyof UIState['pageLoading'], loading: boolean) => void;
  setGlobalLoading: (loading: boolean, message?: string) => void;
  
  // Error Management
  setError: (errorType: keyof UIState['errors'], error: string | null) => void;
  clearErrors: () => void;
  clearError: (errorType: keyof UIState['errors']) => void;

  // ========================================
  // ACTIONS - PREFERENCES
  // ========================================
  
  // Theme & Display
  setTheme: (theme: UIState['theme']) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Accessibility
  setReducedMotion: (reduced: boolean) => void;
  setFontSize: (size: UIState['fontSize']) => void;
  
  // Features
  toggleFeature: (feature: keyof UIState['features']) => void;
  setFeature: (feature: keyof UIState['features'], enabled: boolean) => void;

  // ========================================
  // UTILITIES
  // ========================================
  
  // State Utilities
  hasActiveFilters: (type: 'courses' | 'bundles') => boolean;
  getActiveFilterCount: (type: 'courses' | 'bundles') => number;
  isModalOpen: (modalType?: keyof UIState['modals']) => boolean;
  hasErrors: () => boolean;
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
  searchTerm: '',
};

// ========================================
// UI STORE
// ========================================

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================
    // INITIAL STATE
    // ========================================
    
    // Drawer & Modal States
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
    
    // Navigation & Page State
    currentPage: 'home',
    previousPage: null,
    isMobileMenuOpen: false,
    
    pageLoading: {
      courses: false,
      bundles: false,
      purchases: false,
      enrollments: false,
    },
    
    // Filter States
    courseFilters: initialCourseFilters,
    bundleFilters: initialBundleFilters,
    activeCourseTab: 'courses',
    activeCategoryTab: 'EB1A',
    isFilterPanelOpen: false,
    isFilterPanelExpanded: false,
    
    // Loading & Error States
    globalLoading: {
      message: '',
      isLoading: false,
    },
    
    toastQueue: [],
    errors: {},
    
    // User Interface Preferences
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
    // DRAWER & MODAL ACTIONS
    // ========================================

    openCartDrawer: () => {
      set({ 
        isCartDrawerOpen: true, 
        cartDrawerAnimation: 'entering',
        // Close mobile menu if open
        isMobileMenuOpen: false,
      });
      
      // Reset animation state after transition
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
        // Close mobile menu if open
        isMobileMenuOpen: false,
        // Close cart drawer if open and opening a modal
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
      set(state => ({
        modals: {
          authModal: false,
          purchaseConfirmModal: false,
          coursePreviewModal: false,
          bundleDetailsModal: false,
          profileModal: false,
          helpModal: false,
        },
        modalData: {},
      }));
    },

    setModalData: (data) => {
      set(state => ({
        modalData: { ...state.modalData, ...data },
      }));
    },

    toggleMobileMenu: () => {
      set(state => ({
        isMobileMenuOpen: !state.isMobileMenuOpen,
        // Close cart drawer if opening mobile menu
        isCartDrawerOpen: !state.isMobileMenuOpen ? false : state.isCartDrawerOpen,
      }));
    },

    closeMobileMenu: () => {
      set({ isMobileMenuOpen: false });
    },

    // ========================================
    // FILTER ACTIONS
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
    // PAGE & LOADING ACTIONS
    // ========================================

    setCurrentPage: (page) => {
      set(state => ({
        previousPage: state.currentPage,
        currentPage: page,
        // Close mobile menu on page change
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

    setPageLoading: (page, loading) => {
      set(state => ({
        pageLoading: {
          ...state.pageLoading,
          [page]: loading,
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
    // PREFERENCE ACTIONS
    // ========================================

    setTheme: (theme) => {
      set({ theme });
      
      // Apply theme to document
      if (typeof document !== 'undefined') {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System preference
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
      
      // Apply reduced motion preference
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
      
      // Apply font size
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
    // UTILITIES
    // ========================================

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
  }))
);

// ========================================
// CONVENIENCE HOOKS
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
    };
  } else {
    return {
      filters: store.bundleFilters,
      setFilter: store.setBundleFilter,
      resetFilters: store.resetBundleFilters,
      setSearchTerm: store.setBundleSearchTerm,
      hasActiveFilters: store.hasActiveFilters('bundles'),
      activeFilterCount: store.getActiveFilterCount('bundles'),
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
    pageLoading: store.pageLoading,
    setPageLoading: store.setPageLoading,
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