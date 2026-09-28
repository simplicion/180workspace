import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: '180 Documentation',
  tagline: 'Enterprise Architecture, Work Graph Specifications & Engineering Blueprints',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://docs.180workspace.com',
  baseUrl: '/',

  organizationName: '180workspace',
  projectName: '180-docs',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo-white.svg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '180 Documentation',
      logo: {
        alt: '180 Documentation Logo',
        src: 'img/logo-dark.svg',
        srcDark: 'img/logo-white.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/docs/platform/platform-overview',
          label: 'Architecture',
          position: 'left',
        },
        {
          to: '/docs/API_DOCUMENTATION',
          label: 'API Reference',
          position: 'left',
        },
        {
          href: 'https://180workspace.com/whitepapers',
          label: 'White Papers',
          position: 'left',
        },
        {
          href: 'https://developers.180workspace.com',
          label: 'Developer Portal ↗',
          position: 'left',
        },
        {
          to: '/blog',
          label: 'Changelog',
          position: 'left',
        },
        {
          href: 'https://app.180workspace.com',
          label: '180 Platform ↗',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Core Architecture',
          items: [
            {
              label: 'Platform Overview',
              to: '/docs/platform/platform-overview',
            },
            {
              label: 'System Architecture',
              to: '/docs/SYSTEM_ARCHITECTURE',
            },
            {
              label: 'Database Schema & Multitenancy',
              to: '/docs/DATABASE_SCHEMA',
            },
            {
              label: 'Security & RBAC',
              to: '/docs/AUTHENTICATION_AND_SECURITY',
            },
          ],
        },
        {
          title: 'Engineering & Guides',
          items: [
            {
              label: 'Developer Onboarding',
              to: '/docs/developer-onboarding',
            },
            {
              label: 'Local Development Runbook',
              to: '/docs/getting-started/local-development',
            },
            {
              label: 'Git & PR Workflow',
              to: '/docs/getting-started/git-pr-workflow',
            },
            {
              label: 'API Reference',
              to: '/docs/API_DOCUMENTATION',
            },
          ],
        },
        {
          title: 'Ecosystem & Work Graph',
          items: [
            {
              label: 'Business Logic & Work Graph',
              to: '/docs/BUSINESS_LOGIC',
            },
            {
              label: 'State Management & Sockets',
              to: '/docs/STATE_MANAGEMENT',
            },
            {
              label: 'Performance Analysis',
              to: '/docs/PERFORMANCE_ANALYSIS',
            },
            {
              label: 'Folder Structure',
              to: '/docs/FOLDER_STRUCTURE',
            },
          ],
        },
        {
          title: '180workspace Platform',
          items: [
            {
              label: 'Launch Platform App',
              href: 'https://app.180workspace.com',
            },
            {
              label: 'Developer Portal',
              href: 'https://developers.180workspace.com',
            },
            {
              label: 'Changelog & Updates',
              to: '/blog',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} 180workspace. All rights reserved. Enterprise Work Graph Platform.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
