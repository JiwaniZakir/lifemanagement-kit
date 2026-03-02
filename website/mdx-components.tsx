import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Callout } from '@/components/docs/callout';
import { Steps, Step } from '@/components/docs/steps';
import { CardGrid, FeatureCard } from '@/components/docs/card-grid';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Callout,
    Steps,
    Step,
    CardGrid,
    FeatureCard,
    ...components,
  };
}
