import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { DiffBlock } from '../components/DiffBlock/DiffBlock';
import { _added, _arrLine, _block, _line, _removed, _replaced } from '../utils';

export default {
  title: 'Components/DiffBlock',
  component: DiffBlock,
} as ComponentMeta<typeof DiffBlock>;

const Template: ComponentStory<typeof DiffBlock> = (args) => <DiffBlock {...args} />;

let l = 1

export const ObjectBlock = Template.bind({});
ObjectBlock.args = {
  data: _block("object", l++, 0, "properies", [
    _block("object", l++, 2, "name", [
      _line(l++, 4, "$ref", '"#/$refs/NameType"'),
    ]),
    _block("object", l++, 2, "type", [
      _line(l++, 4, "nullable", "false"),
      _line(l++, 4, "type", "string")
    ]),
    _block("object", l++, 2, "bar", [
      _line(l++, 4, "type", "number", _added),
      _line(l++, 4, "title", "age", _added),
      _line(l++, 4, "maximum", 100, _added),
    ], _added),
    _block("object", l++, 2, "foo", [
      _line(l++, 4, "type", "number", _replaced("string")),
      _block("array", l++, 4, "enum", [
        _arrLine(l++, 6, 10),
        _arrLine(l++, 6, 20, _removed),
        _arrLine(l++, 6, 30),
        _arrLine(l++, 6, 40, _added),
      ]),
    ]),
  ]),
  display: "side-by-side"
};

l = 1

export const ArrayBlock = Template.bind({});
ArrayBlock.args = {
  data: _block("array", l++, 0, "required", [
    _arrLine(4, 2, "type"),
    _arrLine(5, 2, "bar", _added),
  ]),
  display: "side-by-side"
};
