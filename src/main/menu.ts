import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';

const ROUTES = [
  { idx: 1, path: '/dashboard', label: 'Dashboard' },
  { idx: 2, path: '/income', label: 'Gelir' },
  { idx: 3, path: '/bills', label: 'Faturalar' },
  { idx: 4, path: '/expenses', label: 'Harcamalar' },
  { idx: 5, path: '/debts', label: 'Borçlar' },
  { idx: 6, path: '/people', label: 'Kişiler' },
  { idx: 7, path: '/reports', label: 'Raporlar' },
];

function send(win: BrowserWindow, channel: string, payload?: unknown): void {
  if (!win.isDestroyed()) win.webContents.send(channel, payload);
}

export function buildAppMenu(win: BrowserWindow): void {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Ayarlar…',
                accelerator: 'CmdOrCtrl+,',
                click: () => send(win, 'app:nav', '/settings'),
              },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ] as MenuItemConstructorOptions[])
      : []),
    {
      label: 'Dosya',
      submenu: [
        {
          label: 'Yeni Kayıt',
          accelerator: 'CmdOrCtrl+N',
          click: () => send(win, 'app:new'),
        },
        {
          label: 'Dışa Aktar…',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            send(win, 'app:nav', '/reports');
            send(win, 'app:export');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Düzen',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        ...ROUTES.map<MenuItemConstructorOptions>((r) => ({
          label: r.label,
          accelerator: `CmdOrCtrl+${r.idx}`,
          click: () => send(win, 'app:nav', r.path),
        })),
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
    { role: 'windowMenu' },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
