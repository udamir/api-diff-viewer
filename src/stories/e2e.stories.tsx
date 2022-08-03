import React, { useEffect, useRef, useState } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react'

import { ApiDiffViewer } from '../components/ApiDiffViewer'
import openApiBefore from "./samples/openApi.before"
import openApiAfter from "./samples/openApi.after"
import asyncApiBefore from "./samples/asyncApi.before"
import asyncApiAfter from "./samples/asyncApi.after"
import jsonSchemaBefore from "./samples/jsonSchema.before"
import jsonSchemaAfter from "./samples/jsonSchema.after"
import { ApiNavigation } from '../components/ApiNavigation';
import { DiffContextProps } from '../helpers/diff.context';

export default {
  title: 'E2E',
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
    navigation: {
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

const Template: ComponentStory<typeof ApiDiffViewer> = (args) => {
  const [data, setData] = useState()
  const navigateTo = useRef<(id: string, parent?: HTMLElement) => void>()
  const layout = useRef<HTMLDivElement>(null)

  function setWindowHeight(){
    if (!layout.current) { return }
    layout.current.style.height = `${window.innerHeight}px`
  }

  useEffect(() => {
    setWindowHeight()
    // initiate the event handler
    window.addEventListener("resize",setWindowHeight,false);
    return () => window.removeEventListener("resize", setWindowHeight)
  }, [])

  const onReady = (c: DiffContextProps) => {
    setData(c.data)
    navigateTo.current = c.navigateTo
  }

  const onNavigate = (id: string) => {
    navigateTo.current && navigateTo.current(id, document.getElementById("api-diff-viewer-div")!)
  }

  const props = {...args, navigation: false, onReady}

  return (<div ref={layout}>
    <div style={{ height: "inherit", overflowY: "auto", float: "left" }}>
      <ApiNavigation data={data} onNavigate={onNavigate} />
    </div>
    <div id="api-diff-viewer-div" style={{ height: "inherit", overflowY: "auto" }}>
      <ApiDiffViewer {...props} />
    </div>
  </div>)
}

export const OpenApi3 = Template.bind({});
OpenApi3.args = {
  before: openApiBefore,
  after: openApiAfter,
  display: "side-by-side",
  format: "yaml",
  navigation: true,
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
