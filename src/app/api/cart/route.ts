import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { CartService } from '@/lib/services/cart.service';

export async function GET() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const cartService = new CartService();
  const cart = await cartService.getUserCart(userId!);
  
  return NextResponse.json({
    success: true,
    data: cart || { items: [], summary: null },
  });
}

export async function POST(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const cartService = new CartService();
  const updatedCart = await cartService.updateUserCart(userId!, body.cart_data);
  
  return NextResponse.json({
    success: true,
    data: updatedCart,
  });
}

export async function DELETE() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const cartService = new CartService();
  await cartService.clearUserCart(userId!);
  
  return NextResponse.json({
    success: true,
    message: 'Cart cleared',
  });
}