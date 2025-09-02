// =====================================================
// src/components/layout/CartDrawer.tsx
// =====================================================
import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, ShoppingCart, Trash2, ArrowRight, Minus, Plus } from 'lucide-react'
import { useCartState, useCartActions } from '@/lib/stores/cart-store'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, summary, itemCount } = useCartState()
  const { removeItem } = useCartActions()
  const router = useRouter()
  const isEmpty = itemCount === 0

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleRemoveItem = async (itemId: string, itemType: 'course' | 'bundle') => {
    await removeItem(itemId, itemType)
  }

  const handleCheckout = () => {
    onClose()
    router.push('/checkout')
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 border-b border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
              {itemCount > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-amber-100 rounded-full"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {isEmpty ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <ShoppingCart className="w-12 h-12 text-amber-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-600 text-center mb-8">
              Start your learning journey by adding courses or bundles
            </p>
            <div className="space-y-3 w-full max-w-xs">
              <Link href="/courses" onClick={onClose}>
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-300">
                  Browse Courses
                </Button>
              </Link>
              <Link href="/bundles" onClick={onClose}>
                <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50">
                  View Bundles
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.map((item) => (
                <div 
                  key={`${item.type}-${item.id}`} 
                  className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 rounded-xl p-4 hover:from-amber-50 hover:to-orange-50 transition-colors duration-200"
                >
                  <div className="flex items-start space-x-4">
                    {item.thumbnail_url && (
                      <img 
                        src={item.thumbnail_url} 
                        alt={item.title}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                          {item.type === 'course' ? 'Course' : 'Bundle'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {item.validity_months} months
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          {item.price < item.original_price && (
                            <span className="text-sm text-gray-400 line-through mr-2">
                              ${item.original_price.toFixed(2)}
                            </span>
                          )}
                          <span className="text-lg font-bold text-amber-600">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveItem(item.id, item.type)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary & Actions */}
            {summary && (
              <div className="border-t border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/50 p-6">
                {/* BYOB Progress */}
                {itemCount < 10 && items.filter(i => i.type === 'course').length > 0 && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700 mb-2 font-medium">
                      {itemCount >= 5 
                        ? `Add ${10 - itemCount} more for 18% off!`
                        : `Add ${5 - itemCount} more for 13% off!`
                      }
                    </p>
                    <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${Math.min((itemCount / 10) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Price Summary */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${summary.subtotal.toFixed(2)}</span>
                  </div>
                  {summary.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>
                        BYOB Discount {summary.byob_tier === '10plus' ? '(18%)' : '(13%)'}
                      </span>
                      <span>-${summary.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-amber-200">
                    <span>Total</span>
                    <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      ${summary.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={handleCheckout}
                  >
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={onClose}
                  >
                    Continue Shopping
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
