import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react'

import { ApiNavigation } from '../components/ApiNavigation'
import openApiBefore from "./samples/openApi.before"
import asyncApiBefore from "./samples/asyncApi.before"
import jsonSchemaAfter from "./samples/jsonSchema.after"

export default {
  title: 'Components/ApiNavigation',
  component: ApiNavigation,
} as ComponentMeta<typeof ApiNavigation>

const Template: ComponentStory<any> = (args) => <ApiNavigation {...args} />

export const OpenApi3Navigation = Template.bind({});
OpenApi3Navigation.args = {
  data: openApiBefore
}

export const AsyncApi2Navigation = Template.bind({});
AsyncApi2Navigation.args = {
  data: asyncApiBefore
}

export const JsonSchemaNavigation = Template.bind({});
JsonSchemaNavigation.args = {
  data: jsonSchemaAfter
}
