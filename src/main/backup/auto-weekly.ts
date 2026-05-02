import { app } from 'electron';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { HOUR, msUntilNextSunday03 } from '../scheduling-helpers';

const KEEP_BACKUPS = 8;

export { msUntilNextSunday03 };

function backupsDir(): string {
  return join(app.getPath('userData'), 'backups');
}

function dbPath(): string {
  return join(app.getPath('userData'), 'budget.db');
}

function timestamp(d: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function performAutoBackup(): { saved: boolean; path?: string; error?: string } {
  try {
    const src = dbPath();
    if (!existsSync(src)) return { saved: false, error: 'budget.db bulunamadı' };
    const dir = backupsDir();
    mkdirSync(dir, { recursive: true });
    const dest = join(dir, `budget-${timestamp()}.db`);
    copyFileSync(src, dest);
    pruneOldBackups(dir);
    return { saved: true, path: dest };
  } catch (err) {
    return { saved: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function pruneOldBackups(dir: string): void {
  const entries = readdirSync(dir)
    .filter((f) => f.startsWith('budget-') && f.endsWith('.db'))
    .map((f) => ({ f, mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const overflow = entries.slice(KEEP_BACKUPS);
  for (const e of overflow) {
    try {
      unlinkSync(join(dir, e.f));
    } catch {
      /* ignore */
    }
  }
}

let timeoutHandle: NodeJS.Timeout | null = null;

export function startBackupScheduler(): void {
  // Sundays at 03:00 local. Also do an immediate backup once if no recent one exists.
  ensureRecentBackup();
  scheduleNext();
}

function scheduleNext(): void {
  if (timeoutHandle) clearTimeout(timeoutHandle);
  const ms = msUntilNextSunday03();
  timeoutHandle = setTimeout(() => {
    const r = performAutoBackup();
    if (r.saved) console.log(`[backup] auto-saved: ${r.path}`);
    else console.error(`[backup] failed: ${r.error}`);
    scheduleNext();
  }, ms);
  // Saatlik güvenlik: bilgisayar uyku modundan çıkarsa cron kayar — tetikle
  setTimeout(scheduleNext, HOUR * 24);
}

function ensureRecentBackup(): void {
  try {
    const dir = backupsDir();
    if (!existsSync(dir)) return performImmediate();
    const entries = readdirSync(dir).filter(
      (f) => f.startsWith('budget-') && f.endsWith('.db'),
    );
    if (entries.length === 0) return performImmediate();
    const newest = Math.max(
      ...entries.map((f) => statSync(join(dir, f)).mtimeMs),
    );
    if (Date.now() - newest > 8 * 24 * HOUR) performImmediate();
  } catch {
    /* ignore */
  }
}

function performImmediate(): void {
  const r = performAutoBackup();
  if (r.saved) console.log(`[backup] initial backup: ${r.path}`);
}

export function stopBackupScheduler(): void {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
}
