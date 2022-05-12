# api-diff-viewer
<img alt="npm" src="https://img.shields.io/npm/v/api-diff-viewer"> <img alt="npm" src="https://img.shields.io/npm/dm/api-diff-viewer?label=npm"> <img alt="npm type definitions" src="https://img.shields.io/npm/types/api-diff-viewer"> <img alt="GitHub" src="https://img.shields.io/github/license/udamir/api-diff-viewer">

React component to view the difference between two JsonSchema or API specifications

View demo on [![Storybook](https://cdn.jsdelivr.net/gh/storybookjs/brand@master/badge/badge-storybook.svg)](https://api-diff-viewer.vercel.app/)

## Current status and plans:
- [x] JsonSchema support
- [x] OpenApi3 support
- [ ] Swagger support
- [x] AsyncApi2 support
- [x] Side-by-side compare view
- [x] Inline compare view
- [x] Yaml output
- [x] Json output
- [x] Compare text by words
- [x] Collapse/expand blocks
- [x] View change summary on collaped blocks
- [x] Collapse/expand all
- [x] Filter changes by type (Hide unchanged/not filtered lines)
- [ ] Navigation sidebar
- [ ] WebComponent
- [ ] Color themes


## Documentation

### Installation

```sh
# Yarn
yarn add api-diff-viewer

# NPM
npm install api-diff-viewer
```

> ✨ Checkout the stories [here](https://api-diff-viewer.vercel.app/) for a detailed documentation.

## Development

### Install

```sh
yarn install
```

### Develop

```sh
yarn storybook
```

## License

MIT
