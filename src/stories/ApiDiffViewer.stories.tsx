import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { ApiDiffViewer } from '../components/ApiDiffViewer/ApiDiffViewer';
import openApiBefore from "./samples/openApi.before"
import openApiAfter from "./samples/openApi.after"
import asyncApiBefore from "./samples/asyncApi.before"
import asyncApiAfter from "./samples/asyncApi.after"

export default {
  title: 'ApiDiffViewer/JsonSchema',
  component: ApiDiffViewer,
} as ComponentMeta<typeof ApiDiffViewer>;

const Template: ComponentStory<typeof ApiDiffViewer> = (args) => <ApiDiffViewer {...args} />;

export const OpenApi3 = Template.bind({});
OpenApi3.args = {
  before: openApiBefore,
  after: openApiAfter,
  display: "side-by-side",
  rules: "OpenApi3",
  format: "yaml"
}

export const AsyncApi = Template.bind({});
AsyncApi.args = {
  before: asyncApiBefore,
  after: asyncApiAfter,
  display: "side-by-side",
  rules: "AsyncApi2",
  format: "yaml"
}
