# Instagram Managed Component

## Documentation

Managed Components docs are published at **https://managedcomponents.dev** .

Find out more about Managed Components [here](https://blog.cloudflare.com/zaraz-open-source-managed-components-and-webcm/) for inspiration and motivation details.

[![Released under the Apache license.](https://img.shields.io/badge/license-apache-blue.svg)](./LICENSE)
[![PRs welcome!](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## 🚀 Quickstart local dev environment

1. Make sure you're running node version >=18.
2. Install dependencies with `npm i`
3. Run unit test watcher with `npm run test:dev`

## ⚙️ Tool Settings

> Settings are used to configure the tool in a Component Manager config file

No settings are required to use the Instagram Managed Components.

## 🧱 Fields Description

> Fields are properties that can/must be sent with certain events

No fields are processed by the Instagram Managed Components.

## ⎙ Embeds

This Managed Components uses the [Embeds API](https://managedcomponents.dev/specs/embed-and-widgets/embeds) to render Instagram posts on a web page, and accepts the folowing HTML attributes:

### Component Embed `HTML Attribute` _required_

The MC looks for the `instagram-post` string as the name of the Embed.

### Post URL `HTML Attribute` _required_

Specify the post you wish to render using the `post-url` attribute. Use the full URL, excluding any query parameters.

### Captions `HTML Attribute` _optional_

Use the `captions` attribute to determine whether to include post captions. If captions are set to true, the MC will render the post including its captions. Otherwise, it will render the post without captions.

_Example:_ To place an embed on a page using WebCM, use a placeholder div element with the following attributes:

```html
<div
  data-component-embed="instagram-instagram-post"
  data-post-url="https://www.instagram.com/p/C3Sk6d2MTjI/"
  captions="true"
></div>
```

### Support

This MC only supports the rendering an image, text, captions and post details. Posts that include an image gallery and/or videos will be rendered as a single image post.
◊

## 📝 License

Licensed under the [Apache License](./LICENSE).
