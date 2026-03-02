import { docs } from '@/.source/index';
import { loader } from 'fumadocs-core/source';

// fumadocs-mdx returns source.files as a function, but
// fumadocs-core@15.8+ expects source.files as an array.
// Resolve the function call to produce the expected format.
const mdxSource = docs.toFumadocsSource();
const files = (mdxSource as unknown as Record<string, unknown>).files;
const resolvedSource = typeof files === 'function' ? { files: files() } : mdxSource;

export const source = loader({
  baseUrl: '/docs',
  source: resolvedSource,
});
