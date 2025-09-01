// src/app/api/cart/route.ts
export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cartService = new CartService();
    const cart = await cartService.getUserCart(userId);
    
    return NextResponse.json(cart || { cart_data: { items: [] } });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}