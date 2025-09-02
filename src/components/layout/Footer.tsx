// src/components/layout/Footer.tsx
import React from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-white to-amber-50 border-t border-amber-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link 
              href="/" 
              className="inline-block text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent font-[family-name:var(--font-pacifico)] mb-4"
            >
              immigreat.ai
            </Link>
            <p className="text-gray-600 text-sm">
              Expert-guided immigration courses for your American dream.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/courses" className="text-gray-600 hover:text-amber-600 text-sm transition-colors">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/bundles" className="text-gray-600 hover:text-amber-600 text-sm transition-colors">
                  Bundles
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-amber-600 text-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-amber-600 text-sm transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-gray-600 hover:text-amber-600 text-sm transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-amber-600 text-sm transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-amber-600 text-sm transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-amber-600 text-sm transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Stay Updated</h4>
            <p className="text-gray-600 text-sm mb-3">Get immigration insights delivered to your inbox</p>
            <div className="space-y-2">
              <Input 
                type="email" 
                placeholder="Your email" 
                className="border-amber-200 focus:border-amber-400 focus:ring-amber-400"
              />
              <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-amber-200">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} Immigreat.ai. All rights reserved.
            </p>
            <p className="text-gray-600 text-sm">
              Made with <span className="text-red-500">❤️</span> for immigrants
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}