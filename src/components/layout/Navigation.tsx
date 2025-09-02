
// src/components/layout/Navigation.tsx - FIXED VERSION
'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser, useClerk, SignInButton, UserButton } from '@clerk/nextjs'
import { 
  GraduationCap, 
  LogOut,
  BookOpen,
  Package,
  Phone,
  Info,
  Menu,
  X,
  ShoppingCart,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useCartState } from '@/lib/stores/cart-store'
import { useStoreAuth } from '@/lib/stores'
import { CartDrawer } from './CartDrawer'

export function Navigation() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Cart state
  const { itemCount } = useCartState()

  // Sync authentication state with stores
  useStoreAuth(isSignedIn || false, user?.id)

  const handleLogout = async () => {
    await signOut()
    router.push('/')
    setIsProfileOpen(false)
    setIsMobileMenuOpen(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link 
              href="/" 
              className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent"
            >
              immigreat.ai
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              <Link href="/courses">
                <Button variant="ghost" className="text-gray-700 hover:text-amber-600 hover:bg-amber-50">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Courses
                </Button>
              </Link>
              <Link href="/bundles">
                <Button variant="ghost" className="text-gray-700 hover:text-amber-600 hover:bg-amber-50">
                  <Package className="h-4 w-4 mr-2" />
                  Bundles
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="ghost" className="text-gray-700 hover:text-amber-600 hover:bg-amber-50">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="ghost" className="text-gray-700 hover:text-amber-600 hover:bg-amber-50">
                  <Info className="h-4 w-4 mr-2" />
                  About
                </Button>
              </Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Cart Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-amber-500 text-white text-xs">
                    {itemCount}
                  </Badge>
                )}
              </Button>

              {/* Desktop Auth */}
              <div className="hidden sm:block">
                {!isLoaded ? (
                  <div className="h-10 w-24 bg-gray-200 animate-pulse rounded-full" />
                ) : isSignedIn ? (
                  <div className="relative" ref={profileRef}>
                    <Button
                      variant="ghost"
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center space-x-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.imageUrl} />
                        <AvatarFallback className="bg-amber-500 text-white">
                          {getInitials(user?.fullName || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    
                    {isProfileOpen && (
                      <div className="absolute right-0 top-12 w-72 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                        <div className="p-4 bg-amber-50">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user?.imageUrl} />
                              <AvatarFallback className="bg-amber-500 text-white">
                                {getInitials(user?.fullName || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{user?.fullName}</p>
                              <p className="text-sm text-gray-600">{user?.primaryEmailAddress?.emailAddress}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-2">
                          <Link href="/my-purchases" onClick={() => setIsProfileOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">
                              <GraduationCap className="mr-3 h-4 w-4" />
                              My Purchases
                            </Button>
                          </Link>
                          <hr className="my-2" />
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start text-red-600 hover:bg-red-50"
                            onClick={handleLogout}
                          >
                            <LogOut className="mr-3 h-4 w-4" />
                            Sign Out
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <SignInButton mode="modal">
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-6">
                      Sign In
                    </Button>
                  </SignInButton>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-gray-200 shadow-lg">
            <div className="px-4 py-4 space-y-2">
              {/* Navigation Links */}
              <Link href="/courses" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <BookOpen className="mr-3 h-4 w-4" />
                  Courses
                </Button>
              </Link>
              <Link href="/bundles" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <Package className="mr-3 h-4 w-4" />
                  Bundles
                </Button>
              </Link>
              <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <Phone className="mr-3 h-4 w-4" />
                  Contact
                </Button>
              </Link>
              <Link href="/about" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <Info className="mr-3 h-4 w-4" />
                  About
                </Button>
              </Link>
              
              <hr className="my-3" />
              
              {/* Mobile Auth Section */}
              {!isLoaded ? (
                <div className="p-3 bg-gray-100 rounded animate-pulse h-12"></div>
              ) : isSignedIn && user ? (
                <>
                  <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.imageUrl} />
                      <AvatarFallback className="bg-amber-500 text-white">
                        {getInitials(user.fullName || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-sm text-gray-600">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </div>
                  
                  <Link href="/my-purchases" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <GraduationCap className="mr-3 h-4 w-4" />
                      My Purchases
                    </Button>
                  </Link>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <SignInButton mode="modal">
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                    Sign In
                  </Button>
                </SignInButton>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}