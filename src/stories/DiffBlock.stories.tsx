import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { DiffBlock } from '../components/DiffBlock/DiffBlock';
import { _added, _removed, _replaced, _yamlArrItemLine, _yamlItemBlock, _yamlPropBlock, _yamlPropLine} from '../utils';

export default {
  title: 'Components/DiffBlock',
  component: DiffBlock,
} as ComponentMeta<typeof DiffBlock>;

const Template: ComponentStory<typeof DiffBlock> = (args) => <DiffBlock {...args} />;

let l = 1

export const ObjectBlock = Template.bind({});
ObjectBlock.args = {
  data: _yamlPropBlock("object", l++, 0, "properies", [
    _yamlPropBlock("object", l++, 2, "name", [
      _yamlPropLine(l++, 4, "$ref", '"#/$refs/NameType"', _removed("breaking")),
    ], _removed("breaking")),
    _yamlPropBlock("object", l++, 2, "type", [
      _yamlPropLine(l++, 4, "nullable", "false", _added("non-breaking")),
      _yamlPropLine(l++, 4, "type", "string", _added("non-breaking"))
    ], _added("non-breaking")),
    _yamlPropBlock("object", l++, 2, "bar", [
      _yamlPropLine(l++, 4, "type", "number", _added("non-breaking")),
      _yamlPropLine(l++, 4, "title", "age", _removed("breaking")),
      _yamlPropLine(l++, 4, "maximum", 100, _replaced(50, "breaking")),
    ]),
    _yamlPropBlock("object", l++, 2, "foo", [
      _yamlPropLine(l++, 4, "type", "number", _replaced("string")),
      _yamlPropBlock("array", l++, 4, "enum", [
        _yamlArrItemLine(l++, 6, 10, 1, _removed("breaking")),
        _yamlArrItemLine(l++, 6, 20, 1, _removed("breaking")),
        _yamlArrItemLine(l++, 6, 30),
        _yamlArrItemLine(l++, 6, 40, 1, _added("non-breaking")),
      ]),
    ]),
  ]),
  display: "side-by-side"
};

l = 1

export const ArrayBlock = Template.bind({});
ArrayBlock.args = {
  data: _yamlPropBlock("array", l++, 0, "items", [
    _yamlItemBlock("array", l++, 2, [
      _yamlArrItemLine(l++, 4, "type", 1),
      _yamlArrItemLine(l++, 4, "bar", 1, _added("non-breaking")),
    ]),
    _yamlItemBlock("array", l++, 2, [
      _yamlPropLine(l++, 4, "type", "number"),
      _yamlPropLine(l++, 4, "bar", "foo", _added("non-breaking")),
    ]),
    _yamlArrItemLine(4, 2, "type"),
    _yamlArrItemLine(5, 2, "bar", 1, _added("non-breaking")),
  ]),
  display: "side-by-side"
};
