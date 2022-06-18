import React, { CSSProperties } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react'

import openApiBefore from "./samples/openApi.before"
import asyncApiBefore from "./samples/asyncApi.before"
import jsonSchemaBefore from "./samples/jsonSchema.before"
import { ApiViewer } from '../components/ApiViewer';
import { defaultThemes } from '../theme';

export default {
  title: 'ApiViewer',
  component: ApiViewer,
  argTypes: {
    format: {
      options: ['json', 'yaml'],
      control: { type: 'radio' },
    }
  },
} as ComponentMeta<typeof ApiViewer>;

const Template: ComponentStory<typeof ApiViewer> = (args) => 
  <div style={defaultThemes.default as CSSProperties} >
    <ApiViewer {...args} />
  </div>

export const OpenApi3 = Template.bind({});
OpenApi3.args = {
  data: openApiBefore,
  format: "yaml",
  navigation: true,
}

export const AsyncApi = Template.bind({});
AsyncApi.args = {
  data: asyncApiBefore,
  format: "yaml",
  navigation: true
}

export const JsonSchema = Template.bind({});
JsonSchema.args = {
  data: jsonSchemaBefore,
  format: "yaml",
  navigation: true
}
