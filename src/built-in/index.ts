import type { IComponentDefinition } from '@/types/component';

import PbColumn, { builderOptions as pbColumnOptions } from './PbColumn.vue';
import PbRow, { builderOptions as pbRowOptions } from './PbRow.vue';
import PbText, { builderOptions as pbTextOptions } from './PbText.vue';
import PbImage, { builderOptions as pbImageOptions } from './PbImage.vue';
import PbVideo, { builderOptions as pbVideoOptions } from './PbVideo.vue';
import PbSection, { builderOptions as pbSectionOptions } from './PbSection.vue';
import PbContainer, { builderOptions as pbContainerOptions } from './PbContainer.vue';

function withComponent(options: IComponentDefinition, component: any): IComponentDefinition {
  return { ...options, component };
}

export const builtInComponents: IComponentDefinition[] = [
  withComponent(pbColumnOptions, PbColumn),
  withComponent(pbRowOptions, PbRow),
  withComponent(pbTextOptions, PbText),
  withComponent(pbImageOptions, PbImage),
  withComponent(pbVideoOptions, PbVideo),
  withComponent(pbSectionOptions, PbSection),
  withComponent(pbContainerOptions, PbContainer),
];

export {
  PbColumn,
  PbRow,
  PbText,
  PbImage,
  PbVideo,
  PbSection,
  PbContainer,
};
