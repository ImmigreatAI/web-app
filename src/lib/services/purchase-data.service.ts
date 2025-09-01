import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { UserPurchase, PurchaseData } from '@/lib/types';

export class PurchaseDataService {
  private serviceClient;

  constructor() {
    this.serviceClient = createServiceClient(); // For admin operations
  }

  private async getSupabaseClient() {
    return await createServerClient();
  }

  /**
   * Get all purchases for a user (including expired)
   */
  async getUserPurchases(clerkId: string): Promise<UserPurchase[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('clerk_id', clerkId)
        .order('purchased_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user purchases:', error);
      throw error;
    }
  }

  /**
   * Get only active (non-expired) purchases for a user
   */
  async getActivePurchases(clerkId: string): Promise<UserPurchase[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('clerk_id', clerkId)
        .eq('enrollment_status', 'completed')
        .gte('expires_at', new Date().toISOString())
        .order('purchased_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching active purchases:', error);
      throw error;
    }
  }

  /**
   * Get expired purchases for a user
   */
  async getExpiredPurchases(clerkId: string): Promise<UserPurchase[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('clerk_id', clerkId)
        .lt('expires_at', new Date().toISOString())
        .order('purchased_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching expired purchases:', error);
      throw error;
    }
  }

  /**
   * Get a specific purchase by ID (user must own it)
   */
  async getPurchaseById(clerkId: string, purchaseId: string): Promise<UserPurchase | null> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('id', purchaseId)
        .eq('clerk_id', clerkId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching purchase by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new purchase record (used after successful payment)
   */
  async createPurchase(purchaseData: {
    clerk_id: string;
    purchase_type: string;
    item_id: string;
    enrollment_id: string | null;
    purchase_data: PurchaseData;
    expires_at: string;
  }): Promise<UserPurchase> {
    try {
      const { data, error } = await this.serviceClient
        .from('user_purchases')
        .insert({
          ...purchaseData,
          enrollment_status: 'completed',
          purchased_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating purchase:', error);
      throw error;
    }
  }

  /**
   * Update purchase status (for queue system implementation)
   */
  async updatePurchaseStatus(
    purchaseId: string, 
    status: 'pending' | 'completed' | 'failed'
  ): Promise<UserPurchase> {
    try {
      const { data, error } = await this.serviceClient
        .from('user_purchases')
        .update({
          enrollment_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating purchase status:', error);
      throw error;
    }
  }

  /**
   * Get purchase statistics for a user
   */
  async getUserPurchaseStats(clerkId: string): Promise<{
    totalPurchases: number;
    activePurchases: number;
    expiredPurchases: number;
    totalSpent: number;
    averageOrderValue: number;
  }> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('purchase_data, expires_at')
        .eq('clerk_id', clerkId);

      if (error) {
        throw error;
      }

      const purchases = data || [];
      const now = new Date().toISOString();
      
      const totalPurchases = purchases.length;
      const activePurchases = purchases.filter(p => p.expires_at > now).length;
      const expiredPurchases = totalPurchases - activePurchases;
      
      const totalSpent = purchases.reduce((sum, purchase) => {
        return sum + (purchase.purchase_data?.amount_paid || 0);
      }, 0);
      
      const averageOrderValue = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

      return {
        totalPurchases,
        activePurchases,
        expiredPurchases,
        totalSpent,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      };
    } catch (error) {
      console.error('Error fetching purchase stats:', error);
      throw error;
    }
  }

  /**
   * Check if user has purchased specific item (course or bundle)
   */
  async hasPurchased(clerkId: string, itemId: string, itemType: 'course' | 'bundle'): Promise<boolean> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('clerk_id', clerkId)
        .eq('item_id', itemId)
        .eq('purchase_type', itemType)
        .eq('enrollment_status', 'completed')
        .gte('expires_at', new Date().toISOString())
        .limit(1);

      if (error) {
        throw error;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking purchase:', error);
      return false;
    }
  }

  /**
   * Get purchases expiring soon (within specified days)
   */
  async getPurchasesExpiringSoon(clerkId: string, daysAhead: number = 30): Promise<UserPurchase[]> {
    const supabase = await this.getSupabaseClient();
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('clerk_id', clerkId)
        .eq('enrollment_status', 'completed')
        .gte('expires_at', new Date().toISOString())
        .lte('expires_at', futureDate.toISOString())
        .order('expires_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching expiring purchases:', error);
      throw error;
    }
  }

  /**
   * Calculate expiry date based on validity months and purchase type
   */
  calculateExpiryDate(validityMonths: number, purchaseDate?: Date): string {
    const baseDate = purchaseDate || new Date();
    const expiryDate = new Date(baseDate);
    expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
    return expiryDate.toISOString();
  }
}