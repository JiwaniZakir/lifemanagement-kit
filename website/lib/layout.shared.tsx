import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Aegis',
    },
    links: [
      {
        text: 'Docs',
        url: '/docs',
      },
      {
        text: 'GitHub',
        url: 'https://github.com/JiwaniZakir/lifemanagement-kit',
        external: true,
      },
    ],
  };
}
