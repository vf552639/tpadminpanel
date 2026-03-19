export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type SettingsKey =
  | 'dataforseo_login'
  | 'dataforseo_password'
  | 'check_frequency'
  | 'depth'
  | 'global_keywords'
  | 'notifications';

const PASSWORD_MASK = '********';

async function getSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('monitoring_settings')
    .select('key,value');

  if (error) throw error;

  const map: Record<string, string> = {};
  for (const row of data || []) {
    map[row.key] = row.value;
  }
  return map;
}

async function upsertSetting(key: SettingsKey, value: string) {
  const { error } = await supabase
    .from('monitoring_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      data: {
        dataforseo_login: settings.dataforseo_login || '',
        dataforseo_password: settings.dataforseo_password ? PASSWORD_MASK : '',
        check_frequency: settings.check_frequency || 'daily',
        depth: settings.depth ? Number(settings.depth) : 100,
        global_keywords: settings.global_keywords || '',
        notifications: settings.notifications === 'true',
      },
    });
  } catch (error) {
    console.error('Failed to load monitoring settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const dataforseo_login = String(body.dataforseo_login || '').trim();
    const dataforseo_password = String(body.dataforseo_password || '');
    const check_frequency = String(body.check_frequency || 'daily');
    const depth = Number(body.depth || 100);
    const global_keywords = String(body.global_keywords || '');
    const notifications = Boolean(body.notifications);

    await upsertSetting('dataforseo_login', dataforseo_login);
    await upsertSetting('check_frequency', check_frequency);
    await upsertSetting('depth', Number.isFinite(depth) ? String(depth) : '100');
    await upsertSetting('global_keywords', global_keywords);
    await upsertSetting('notifications', notifications ? 'true' : 'false');

    // Only update password when user explicitly provides a new one
    if (dataforseo_password && dataforseo_password !== PASSWORD_MASK) {
      await upsertSetting('dataforseo_password', dataforseo_password);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update monitoring settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

