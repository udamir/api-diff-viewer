import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react'

import { ApiDiffViewer } from '../components/ApiDiffViewer'
import openApiBefore from "./samples/openApi.before"
import openApiAfter from "./samples/openApi.after"
import asyncApiBefore from "./samples/asyncApi.before"
import asyncApiAfter from "./samples/asyncApi.after"
import jsonSchemaBefore from "./samples/jsonSchema.before"
import jsonSchemaAfter from "./samples/jsonSchema.after"

export default {
  title: 'ApiDiffViewer',
  component: ApiDiffViewer,
  argTypes: {
    filters: {
      options: ['breaking', 'non-breaking', 'annotation', "unclassified"],
      control: { type: 'multi-select' },
    },
    onLoading: {
      table: {
        disable: true,
      }
    },
    onReady: {
      table: {
        disable: true,
      }
    },
  },
} as ComponentMeta<typeof ApiDiffViewer>;

const Template: ComponentStory<typeof ApiDiffViewer> = (args) => <ApiDiffViewer {...args} />;

export const OpenApi3 = Template.bind({});
OpenApi3.args = {
  before: openApiBefore,
  after: openApiAfter,
  display: "side-by-side",
  format: "yaml",
  navigation: true,
  height: "100vh"
}

export const AsyncApi = Template.bind({});
AsyncApi.args = {
  before: asyncApiBefore,
  after: asyncApiAfter,
  display: "side-by-side",
  format: "yaml",
  navigation: true
}

export const JsonSchema = Template.bind({});
JsonSchema.args = {
  before: jsonSchemaBefore,
  after: jsonSchemaAfter,
  display: "side-by-side",
  format: "yaml",
  navigation: true
}
