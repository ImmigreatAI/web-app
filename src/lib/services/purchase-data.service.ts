import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { UserPurchase, PurchaseItemsData, ProcessingStatus } from '@/lib/types';

export class PurchaseDataService {
  private serviceClient;

  constructor() {
    this.serviceClient = createServiceClient(); // For admin operations
  }

  private async getSupabaseClient() {
    return await createServerClient();
  }

  /**
   * Get all purchases for a user (including processing/failed)
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
   * Get only completed purchases for a user
   */
  async getCompletedPurchases(clerkId: string): Promise<UserPurchase[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('clerk_id', clerkId)
        .eq('processing_status', 'completed')
        .order('purchased_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching completed purchases:', error);
      throw error;
    }
  }

  /**
   * Get processing purchases for a user
   */
  async getProcessingPurchases(clerkId: string): Promise<UserPurchase[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('clerk_id', clerkId)
        .in('processing_status', ['pending', 'processing'])
        .order('purchased_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching processing purchases:', error);
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
    stripe_session_id: string;
    stripe_payment_intent_id?: string;
    stripe_customer_id?: string;
    purchase_type: string;
    amount_paid: number;
    currency: string;
    items_purchased: PurchaseItemsData;
    processing_status?: ProcessingStatus;
  }): Promise<UserPurchase> {
    try {
      const { data, error } = await this.serviceClient
        .from('user_purchases')
        .insert({
          ...purchaseData,
          processing_status: purchaseData.processing_status || 'pending',
          purchased_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          queue_metadata: {
            created_from: 'purchase_service',
            created_at: new Date().toISOString(),
          },
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
    status: ProcessingStatus,
    queueMetadata?: Record<string, any>
  ): Promise<UserPurchase> {
    try {
      const updateData: any = {
        processing_status: status,
        updated_at: new Date().toISOString(),
      };

      if (queueMetadata) {
        updateData.queue_metadata = queueMetadata;
      }

      if (status === 'processing') {
        updateData.processing_started_at = new Date().toISOString();
      } else if (['completed', 'failed', 'partial'].includes(status)) {
        updateData.processing_completed_at = new Date().toISOString();
      }

      const { data, error } = await this.serviceClient
        .from('user_purchases')
        .update(updateData)
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
    completedPurchases: number;
    processingPurchases: number;
    failedPurchases: number;
    totalSpent: number;
    averageOrderValue: number;
  }> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('amount_paid, processing_status')
        .eq('clerk_id', clerkId);

      if (error) {
        throw error;
      }

      const purchases = data || [];
      
      const totalPurchases = purchases.length;
      const completedPurchases = purchases.filter(p => p.processing_status === 'completed').length;
      const processingPurchases = purchases.filter(p => ['pending', 'processing'].includes(p.processing_status)).length;
      const failedPurchases = purchases.filter(p => p.processing_status === 'failed').length;
      
      const totalSpent = purchases
        .filter(p => p.processing_status === 'completed')
        .reduce((sum, purchase) => sum + purchase.amount_paid, 0);
      
      const averageOrderValue = completedPurchases > 0 ? totalSpent / completedPurchases : 0;

      return {
        totalPurchases,
        completedPurchases,
        processingPurchases,
        failedPurchases,
        totalSpent,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      };
    } catch (error) {
      console.error('Error fetching purchase stats:', error);
      throw error;
    }
  }

  /**
   * Check if user has completed purchase for specific item
   */
  async hasCompletedPurchase(clerkId: string, itemId: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('clerk_id', clerkId)
        .eq('processing_status', 'completed')
        .or(`items_purchased->'courses'@>?[{"course_id":"${itemId}"}],items_purchased->'bundles'@>?[{"bundle_id":"${itemId}"}]`)
        .limit(1);

      if (error) {
        throw error;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking completed purchase:', error);
      return false;
    }
  }

  /**
   * Get pending purchases for queue processing
   */
  async getPendingPurchases(): Promise<UserPurchase[]> {
    try {
      const { data, error } = await this.serviceClient
        .from('user_purchases')
        .select('*')
        .eq('processing_status', 'pending')
        .order('purchased_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending purchases:', error);
      throw error;
    }
  }
}