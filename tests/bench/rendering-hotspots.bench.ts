import { bench, describe } from 'vitest';
import { interpolateProps } from '@/core/tree';

const TEMPLATE_VARIABLES: Record<string, string> = {
  PAGE: 'Landing',
  LOCALE: 'fr-FR',
  USER_ROLE: 'editor',
  CTA: 'Get started',
  COMPANY: 'Improba',
  CITY: 'Lyon',
};

const RENDER_PROPS: Record<string, unknown> = Object.fromEntries(
  Array.from({ length: 160 }, (_, index) => {
    if (index % 8 === 0) {
      return [`meta_${index}`, index];
    }

    const template = [
      `${TEMPLATE_VARIABLES.COMPANY} - {{ PAGE }}`,
      `locale={{ LOCALE }}`,
      `role={{ USER_ROLE }}`,
      `cta={{ CTA }}`,
      `city={{ CITY }}`,
      `idx=${index}`,
    ].join(' | ');

    return [`text_${index}`, template];
  }),
);

describe('Rendering hotspot benchmarks', () => {
  bench('interpolateProps on template-heavy prop object', () => {
    const result = interpolateProps(RENDER_PROPS, TEMPLATE_VARIABLES);
    if (result.text_1 !== 'Improba - Landing | locale=fr-FR | role=editor | cta=Get started | city=Lyon | idx=1') {
      throw new Error('Unexpected interpolation result for text_1');
    }
  });
});
