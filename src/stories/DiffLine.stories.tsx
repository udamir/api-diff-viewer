import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { DiffLine } from '../components/DiffLine/DiffLine';
import { _added, _line, _removed, _replaced } from '../utils';

export default {
  title: 'Components/DiffLine',
  component: DiffLine,
  args: {
    line: 1,
    indent: 0,
  },
  argTypes: {
    line: {
      name: "data.line",
      type: { name: 'number', required: true },
      defaultValue: 1,
      table: {
        category: 'data',
      },
    },
    indent: {
      name: "data.indent",
      type: { name: 'number', required: true },
      defaultValue: 0,
      table: {
        category: 'data',
      },
    }
  },
} as ComponentMeta<typeof DiffLine>;

const Template: ComponentStory<typeof DiffLine> = ({ data, display, ...rest }) => <DiffLine data={{ ...data, ...rest }} display={display} />;

export const Replaced = Template.bind({});
Replaced.args = {
  data: _line(1, 0, "type", "string", _replaced("object")),
  display: "side-by-side"
};

export const Added = Template.bind({});
Added.args = {
  data: _line(1, 0, "type", "string", _added),
  display: "side-by-side"
};

export const Removed = Template.bind({});
Removed.args = {
  data: _line(1, 0, "type", "string", _removed),
  display: "side-by-side"
};

