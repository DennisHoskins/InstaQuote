import pool from '../db/connection.js';

export async function startSync(userName: string, syncType: string): Promise<number> {
  const result = await pool.query(
    `INSERT INTO sync_log (started_at, user_name, status, sync_type)
     VALUES ($1, $2, 'running', $3)
     RETURNING id`,
    [new Date(), userName, syncType]
  );
  return result.rows[0].id;
}

export async function completeSync(syncId: number, startedAt: Date, itemsSynced: number): Promise<void> {
  const completedAt = new Date();
  const duration = (completedAt.getTime() - startedAt.getTime()) / 1000;
  await pool.query(
    `UPDATE sync_log
     SET completed_at = $1, duration_seconds = $2, items_synced = $3, status = 'success'
     WHERE id = $4`,
    [completedAt, duration, itemsSynced, syncId]
  );
}

export async function failSync(syncId: number, startedAt: Date, errorMessage: string): Promise<void> {
  const completedAt = new Date();
  const duration = (completedAt.getTime() - startedAt.getTime()) / 1000;
  await pool.query(
    `UPDATE sync_log
     SET completed_at = $1, duration_seconds = $2, status = 'failed', error_message = $3
     WHERE id = $4`,
    [completedAt, duration, errorMessage, syncId]
  );
}