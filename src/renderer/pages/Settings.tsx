import { useState } from 'react';
import { Database, Trash2, Sun, Moon, MonitorSmartphone, Save, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { toast } from '@renderer/stores/toastStore';
import { cn } from '@renderer/lib/cn';
import { usePersonsStore } from '@renderer/stores/personsStore';

const THEMES: Array<{ key: 'light' | 'dark' | 'system'; label: string; Icon: typeof Sun }> = [
  { key: 'light', label: 'Açık', Icon: Sun },
  { key: 'dark', label: 'Koyu', Icon: Moon },
  { key: 'system', label: 'Sistem', Icon: MonitorSmartphone },
];

export function Settings(): React.ReactElement {
  const settings = useSettingsStore();
  const reloadPersons = usePersonsStore((s) => s.load);
  const [savingsInput, setSavingsInput] = useState(
    () => Math.round(settings.savings_target_pct * 100).toString(),
  );
  const [saving, setSaving] = useState(false);

  async function setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    const res = await window.api.settings.set('theme', theme);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    await settings.load();
    toast('success', 'Tema güncellendi');
  }

  async function saveSavings(): Promise<void> {
    const pct = Number(savingsInput);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast('error', 'Tasarruf hedefi 0 ile 100 arasında olmalı');
      return;
    }
    setSaving(true);
    const value = (pct / 100).toString();
    const res = await window.api.settings.set('savings_target_pct', value);
    setSaving(false);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    await settings.load();
    toast('success', 'Tasarruf hedefi kaydedildi');
  }

  async function exportDb(): Promise<void> {
    const res = await window.api.backup.exportDb();
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    if (res.data.saved) toast('success', `Yedek kaydedildi: ${res.data.path}`);
  }

  async function restoreDb(): Promise<void> {
    const res = await window.api.backup.restore();
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    if (res.data.restored) toast('success', 'Geri yüklendi. Uygulama yeniden başlatılıyor…');
  }

  async function clearAll(): Promise<void> {
    const res = await window.api.backup.clearAllData();
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    if (res.data) {
      toast('success', 'Tüm veriler silindi. Varsayılan kişiler yeniden yüklendi.');
      // Yeniden yüklemeyi tetikle
      await reloadPersons();
      // Sayfayı sıfırlamak için window'u yeniden yükle
      setTimeout(() => window.location.reload(), 1000);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Tasarruf Hedefi</CardTitle>
          <CardDescription>
            Aylık gelirin yüzde kaçını tasarruf etmek istiyorsunuz? Dashboard'daki "Harcanabilir" hesabı
            buna göre yapılır.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="savings">Yüzde (%)</Label>
            <Input
              id="savings"
              type="number"
              min="0"
              max="100"
              step="1"
              value={savingsInput}
              onChange={(e) => setSavingsInput(e.target.value)}
              className="w-32"
            />
          </div>
          <Button onClick={saveSavings} disabled={saving}>
            <Save className="h-4 w-4" /> Kaydet
          </Button>
          <div className="text-sm text-muted-foreground">
            Mevcut: %{Math.round(settings.savings_target_pct * 100)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>Açık veya koyu görünüm. "Sistem" seçilirse macOS ayarına göre değişir.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {THEMES.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-md border p-4 transition-colors',
                  settings.theme === key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input hover:bg-accent',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Para Birimi</CardTitle>
          <CardDescription>
            Şu anda yalnızca Türk Lirası (₺) destekleniyor. Diğer birimler ileri sürümlerde eklenecek.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-9 w-32 items-center justify-center rounded-md border bg-muted/30 text-sm font-medium">
            TRY (₺)
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yedekleme & Veriler</CardTitle>
          <CardDescription>
            Veritabanı dosyası `~/Library/Application Support/MoneyFam/budget.db` adresinde tutulur.
            Otomatik yedekleme her Pazar 03:00'da çalışır ve son 8 yedek `~/Library/Application Support/MoneyFam/backups/`
            altında saklanır.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="outline" onClick={exportDb}>
            <Database className="h-4 w-4" /> Veritabanını Yedekle (.db olarak kaydet)
          </Button>
          <Button variant="outline" onClick={restoreDb}>
            <Upload className="h-4 w-4" /> Yedekten Geri Yükle…
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Tehlikeli Bölge</CardTitle>
          <CardDescription>
            Bu işlemler geri alınamaz. Devam etmeden önce yedek almanız önerilir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={clearAll}>
            <Trash2 className="h-4 w-4" /> Tüm Verileri Sil
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sürüm</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          MoneyFam 0.1.0 — macOS aile bütçe takip uygulaması
        </CardContent>
      </Card>
    </div>
  );
}
