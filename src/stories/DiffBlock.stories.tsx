import React, { CSSProperties } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { DiffBlock, DiffBlockProps } from '../components/DiffBlock';
import { _added, _removed, _replaced, _yamlArrLine, _yamlPropBlock, _yamlPropLine } from './helpers';
import { DiffContext } from '../helpers/diff.context';
import { defaultThemes } from '../theme';

type DiffBlockStoryProps = DiffBlockProps & {
  display: "inline" | "side-by-side"
}

export default {
  title: 'Components/DiffBlock',
  component: DiffBlock,
  argTypes: {
    display: {
      options: ['inline', 'side-by-side'],
      control: { type: 'radio' },
    }
  },
} as ComponentMeta<typeof DiffBlock>;

const Template: ComponentStory<any> = ({data, display }: DiffBlockStoryProps) => 
  <DiffContext.Provider value={{ display, theme: defaultThemes.default }}>
    <div style={defaultThemes.default as CSSProperties} >
      <DiffBlock data={data} />
    </div>
  </DiffContext.Provider  >

let l = 1

export const ObjectBlock = Template.bind({});
ObjectBlock.args = {
  data: _yamlPropBlock(l++, 0, "object", "properies", [
    _yamlPropBlock(l++, 2, "object", "name", [
      _yamlPropLine(l++, 4, "$ref", '"#/$refs/NameType"', _removed("breaking")),
    ], _removed("breaking")),
    _yamlPropBlock(l++, 2, "object", "type", [
      _yamlPropLine(l++, 4, "nullable", "false", _added("non-breaking")),
      _yamlPropLine(l++, 4, "type", "string", _added("non-breaking"))
    ], _added("non-breaking")),
    _yamlPropBlock(l++, 2, "object", "bar", [
      _yamlPropLine(l++, 4, "type", "number", _added("non-breaking")),
      _yamlPropLine(l++, 4, "title", "age", _removed("breaking")),
      _yamlPropLine(l++, 4, "maximum", 100, _replaced(50, "breaking")),
    ]),
    _yamlPropBlock(l++, 2, "object", "foo", [
      _yamlPropLine(l++, 4, "type", "number", _replaced("string")),
      _yamlPropBlock(l++, 4, "array", "enum", [
        _yamlArrLine(l++, 6, 10, _removed("breaking")),
        _yamlArrLine(l++, 6, 20, _removed("breaking")),
        _yamlArrLine(l++, 6, 30),
        _yamlArrLine(l++, 6, 40, _added("non-breaking")),
      ]),
    ]),
  ]),
  display: "side-by-side"
};

l = 1

export const ArrayBlock = Template.bind({});
ArrayBlock.args = {
  data: _yamlPropBlock(l++, 0, "array", "items", [
    _yamlPropBlock(l, 2, "array", "", [
      _yamlArrLine(l++, 2, "type", undefined, 1),
      _yamlArrLine(l++, 4, "bar", _added("non-breaking")),
    ]),
    _yamlPropBlock(l, 2, "array", "", [
      _yamlPropLine(l++, 2, "type", "number", undefined, 1),
      _yamlPropLine(l++, 4, "bar", "foo", _added("non-breaking")),
    ]),
    _yamlArrLine(l++, 2, "type"),
    _yamlArrLine(l++, 2, "bar", _added("non-breaking")),
  ]),
  display: "side-by-side"
};
