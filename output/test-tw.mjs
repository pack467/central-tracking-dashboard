import { compile } from '../frontend/node_modules/tailwindcss/dist/lib.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const compiler = await compile('@import "tailwindcss";', {
  loadStylesheet: (id, base) => {
    const p = resolve('frontend/node_modules/tailwindcss', id === 'tailwindcss' ? 'index.css' : id);
    return {
      content: readFileSync(p, 'utf8'),
      base: resolve('frontend/node_modules/tailwindcss')
    };
  }
});

const testClasses = [
  '@container',
  '@[520px]:grid-cols-2',
  '@min-[520px]:grid-cols-2',
  '@[340px]:grid-cols-2',
  '@max-[519px]:grid-cols-1',
  '@[520px]:flex-row',
  '@[520px]:items-stretch',
  '@[520px]:grid',
  '@[520px]:w-[148px]',
  '@[340px]:w-[132px]',
  'w-[120px]'
];

const out = compiler.build(testClasses);
console.log('COMPILED CSS:\n', out);
