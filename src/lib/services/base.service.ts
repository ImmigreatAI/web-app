import { getServiceClient } from '@/lib/supabase/server';

export abstract class BaseService {
  protected supabase;

  constructor() {
    this.supabase = getServiceClient();
  }
}