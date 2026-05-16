import { ENTITY, FIELD, PERMISSIONS, Entity } from '@connectingmatrix/orm/orm';

export type UserActivityLogRow = {
  id: string;
  user_id: string;
  actor_user_id: string;
  organization_id?: string | null;
  event: string;
  actor: string;
  subject: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

@ENTITY({ table: 'user_activity_logs', label: 'UserActivityLog', store: 'supabase', primaryKey: 'id' })
@PERMISSIONS({ read: 'USER_ACTIVITY_LOG_READ', list: 'USER_ACTIVITY_LOG_LIST', create: 'USER_ACTIVITY_LOG_CREATE' })
export class UserActivityLogEntity extends Entity<UserActivityLogRow> {
  @FIELD({ type: 'string', required: true, index: true }) public declare id: string | null;

  @FIELD({ type: 'string', required: true, index: true }) public declare user_id: string | null;

  @FIELD({ type: 'string', required: true, index: true }) public declare actor_user_id: string | null;

  @FIELD({ type: 'string', index: true }) public declare organization_id: string | null;

  @FIELD({ type: 'string', required: true, index: true }) public declare event: string | null;

  @FIELD({ type: 'string', required: true }) public declare actor: string | null;

  @FIELD({ type: 'string', required: true }) public declare subject: string | null;

  @FIELD({ type: 'object', default: {} }) public declare metadata: Record<string, unknown> | null;

  @FIELD({ type: 'string' }) public declare created_at: string | null;
}
