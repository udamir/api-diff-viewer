import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { ApiDiffViewer } from '../components/ApiDiffViewer/ApiDiffViewer';
import before from "./samples/openApi.before"
import after from "./samples/openApi.after"

export default {
  title: 'ApiDiffViewer/JsonSchema',
  component: ApiDiffViewer,
} as ComponentMeta<typeof ApiDiffViewer>;

const Template: ComponentStory<typeof ApiDiffViewer> = (args) => <ApiDiffViewer {...args} />;

export const Default = Template.bind({});
Default.args = {
  before,
  after,
  display: "side-by-side",
  rules: "OpenApi3"
};
