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
          numberPrefixParser: false,
          exclude: ['**/internal/**', 'internal/**'],
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
          to: '/docs/01-platform-overview',
          label: 'Platform Overview',
          position: 'left',
        },
        {
          to: '/docs/products/180-workspace/overview',
          label: '180 Workspace',
          position: 'left',
        },
        {
          to: '/docs/products/180-core/overview',
          label: '180 Core',
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
          title: '180 Platform',
          items: [
            {
              label: 'Platform Overview',
              to: '/docs/01-platform-overview',
            },
            {
              label: 'Product Vision & Purpose',
              to: '/docs/02-product-vision-and-purpose',
            },
            {
              label: 'The Sovereign Work Graph',
              to: '/docs/03-work-graph-architecture',
            },
            {
              label: 'Security & Multi-Tenancy',
              to: '/docs/06-security-and-trust',
            },
          ],
        },
        {
          title: 'Products Directory',
          items: [
            {
              label: '180 Workspace (Suite)',
              to: '/docs/products/180-workspace/overview',
            },
            {
              label: '180 Social Studio',
              to: '/docs/products/180-social-studio/overview',
            },
            {
              label: '180 Core (Auth & Pay)',
              to: '/docs/products/180-core/overview',
            },
            {
              label: '180 Traffic Director',
              to: '/docs/products/180-traffic-director/overview',
            },
          ],
        },
        {
          title: 'Developers & Identity',
          items: [
            {
              label: 'Universal Account & SSO',
              to: '/docs/04-universal-account-and-identity',
            },
            {
              label: 'Developer Ecosystem & SDKs',
              to: '/docs/05-global-developer-experience',
            },
            {
              label: '1-Click AI Master Prompt',
              to: '/docs/products/180-core/ai-master-prompt',
            },
            {
              label: 'Developer Portal Console',
              href: 'https://developers.180workspace.com',
            },
          ],
        },
        {
          title: '180 Ecosystem',
          items: [
            {
              label: 'Launch 180 Platform',
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
