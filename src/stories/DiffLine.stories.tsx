import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { DiffLine } from '../components/DiffLine/DiffLine';
import { _added, _removed, _replaced, _yamlArrItemLine, _yamlArrPropLine, _yamlObjPropLine, _yamlPropLine } from '../utils';

export default {
  title: 'Components/DiffLine',
  component: DiffLine,
} as ComponentMeta<typeof DiffLine>;

const Template: ComponentStory<typeof DiffLine> = (args) => <DiffLine {...args} />;

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
  data: _yamlObjPropLine(1, 0, "type"), 
  display: "side-by-side",
  tags: ["collapsed"]
};

export const YamlCollapsedObjectWithChanges = Template.bind({});
YamlCollapsedObjectWithChanges.args = {
  data: _yamlObjPropLine(1, 0, "type", [1, 2, 0, 0]), 
  display: "side-by-side",
  tags: ["collapsed", "changed"]
};

export const YamlAddedObjectWithChanges = Template.bind({});
YamlAddedObjectWithChanges.args = {
  data: _yamlObjPropLine(1, 0, "type", [1, 0, 0, 0], _added("breaking")), 
  display: "side-by-side",
  tags: ["expanded", "changed"]
};

export const YamlEmptyObject = Template.bind({});
YamlEmptyObject.args = {
  data: _yamlObjPropLine(1, 0, "type"), 
  display: "side-by-side",
  tags: ["empty",  "expanded"]
};

export const YamlCollapsedArrayWithChanges = Template.bind({});
YamlCollapsedArrayWithChanges.args = {
  data: _yamlArrPropLine(1, 0, "type", [1, 2, 0, 0]), 
  display: "side-by-side",
  tags: ["collapsed", "changed"]
};

export const YamlExpandedArrayWithChanges = Template.bind({});
YamlExpandedArrayWithChanges.args = {
  data: _yamlArrPropLine(1, 0, "type", [1, 2, 0, 0]), 
  display: "side-by-side",
  tags: ["expanded", "changed"]
};

export const YamlEmptyArray = Template.bind({});
YamlEmptyArray.args = {
  data: _yamlArrPropLine(1, 0, "type"), 
  display: "side-by-side",
  tags: ["empty",  "expanded"]
};

export const YamlArrayItem = Template.bind({});
YamlArrayItem.args = {
  data: _yamlArrItemLine(1, 2, 40, 2), 
  display: "side-by-side"
};
