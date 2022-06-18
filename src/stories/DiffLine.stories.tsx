import React, { CSSProperties } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { DiffLine, DiffLineProps } from '../components/DiffLine';
import { _added, _removed, _replaced, _yamlArrLine, _yamlPropBlock, _yamlPropLine } from './helpers';
import { DiffContext } from '../helpers/diff.context';
import { defaultThemes } from '../theme';

type DiffLineStoryProps = DiffLineProps & {
  display: "inline" | "side-by-side"
}

export default {
  title: 'Components/DiffLine',
  component: DiffLine,
  argTypes: {
    display: {
      options: ['inline', 'side-by-side'],
      control: { type: 'radio' },
    }
  },
} as ComponentMeta<typeof DiffLine>;

const Template: ComponentStory<any> = ({ display, ...args}: DiffLineStoryProps) => 
  <DiffContext.Provider value={{ treeview: "expanded", display, theme: defaultThemes.default, themeType: "default" }}>
    <div style={defaultThemes.default as CSSProperties} >
      <DiffLine {...args}/>
    </div>
  </DiffContext.Provider  >

export const YamlReplaceProperty = Template.bind({});
YamlReplaceProperty.args = {
  data: _yamlPropLine(1, 0, "type", "string", _replaced("object", "breaking")), 
  display: "side-by-side",
};

export const YamlAddProperty = Template.bind({});
YamlAddProperty.args = {
  data: _yamlPropLine(1, 0, "type", "string", _added("non-breaking")), 
  display: "side-by-side"
};

export const YamlDeleteProperty = Template.bind({});
YamlDeleteProperty.args = {
  data: _yamlPropLine(1, 0, "type", "object", _removed("breaking")), 
  display: "side-by-side"
};

export const YamlCollapsedObject = Template.bind({});
YamlCollapsedObject.args = {
  data: _yamlPropBlock(1, 0, "object", "type"), 
  display: "side-by-side",
  tags: ["collapsed"]
};

export const YamlCollapsedObjectWithChanges = Template.bind({});
YamlCollapsedObjectWithChanges.args = {
  data: _yamlPropBlock(1, 0, "object", "type", [], undefined, [1,2,0,0]), 
  display: "side-by-side",
  tags: ["collapsed", "changed"]
};

export const YamlAddedObjectWithChanges = Template.bind({});
YamlAddedObjectWithChanges.args = {
  data: _yamlPropBlock(1, 0, "object", "type", [], _added("breaking"), [1,2,0,0]), 
  display: "side-by-side",
  tags: ["expanded", "changed"]
};

export const YamlEmptyObject = Template.bind({});
YamlEmptyObject.args = {
  data: _yamlPropBlock(1, 0, "object", "type"), 
  display: "side-by-side",
  tags: ["empty",  "expanded"]
};

export const YamlCollapsedArrayWithChanges = Template.bind({});
YamlCollapsedArrayWithChanges.args = {
  data: _yamlPropBlock(1, 0, "array", "type", [], undefined, [0,0,0,1]), 
  display: "side-by-side",
  tags: ["collapsed", "changed"]
};

export const YamlExpandedArrayWithChanges = Template.bind({});
YamlExpandedArrayWithChanges.args = {
  data: _yamlPropBlock(1, 0, "array", "type", [], undefined, [0,0,2,1]), 
  display: "side-by-side",
  tags: ["expanded", "changed"]
};

export const YamlEmptyArray = Template.bind({});
YamlEmptyArray.args = {
  data: _yamlPropBlock(1, 0, "array",  "type"), 
  display: "side-by-side",
  tags: ["empty",  "expanded"]
};

export const YamlArrayItem = Template.bind({});
YamlArrayItem.args = {
  data: _yamlArrLine(1, 2, 40, undefined, 1), 
  display: "side-by-side"
};
