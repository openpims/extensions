import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'OpenPIMS',
    description: 'Centralized consent management for digital self-determination',
    version: '2.0.0',
    permissions: [
      'storage',
      'tabs',
      'webNavigation',
      'declarativeNetRequest',
      'declarativeNetRequestWithHostAccess',
      'alarms'
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'OpenPIMS',
      default_icon: {
        '16': 'icon-16.png',
        '32': 'icon-32.png',
        '48': 'icon-48.png',
        '128': 'icon-128.png'
      }
    },
    icons: {
      '16': 'icon-16.png',
      '32': 'icon-32.png',
      '48': 'icon-48.png',
      '128': 'icon-128.png'
    }
  },

  // Browser-specific overrides
  browser: {
    firefox: {
      manifest: {
        // Firefox-specific permissions (MV2)
        permissions: [
          'storage',
          'tabs',
          'webNavigation',
          'declarativeNetRequest',
          '<all_urls>',
          'alarms'
        ]
      }
    },
    safari: {
      manifest: {
        // Safari doesn't support all permissions
        permissions: [
          'storage',
          'tabs',
          'webNavigation',
          'declarativeNetRequest',
          'alarms',
          '<all_urls>'
        ],
        // iOS Safari requires non-persistent background (MV2)
        background: {
          scripts: ['background.js'],
          persistent: false
        }
      }
    }
  },

  runner: {
    disabled: false,
    startUrls: ['https://openpims.de', 'https://example.com']
  }
});