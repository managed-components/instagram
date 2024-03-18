import mustache from 'mustache'
import { Client, Manager } from '@managed-components/types'
import { getImg, getCSS, getHtml, updateHtml } from './utils'
import { UAParser } from 'ua-parser-js'

// function to use sha256
async function sha256(message: string) {
  const msgUint8 = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

//function to hash User Agent
async function hashedUserAgent(client: Client) {
  let hashInput = ''
  if (client?.userAgent) {
    const parser = new UAParser(client?.userAgent)
    const deviceType = parser.getDevice().type || 'desktop'
    const browserName = parser.getBrowser().name || ''
    hashInput = `${deviceType} - ${browserName}`
  }
  const hashOutput = await sha256(hashInput)
  return hashOutput
}

export default async function (manager: Manager, client: Client) {
  // define route to fetch and cache images from css
  const CSSRoute = manager.route('/css/rsrc/', async request => {
    const url = new URL(request.url)
    let cssPath = '/' + url.searchParams.get('q')
    cssPath = cssPath ? decodeURIComponent(cssPath) : ''
    const cssEndpoint = 'https://static.cdninstagram.com' + cssPath
    const cssBase = await sha256(cssEndpoint.split('?')[0])

    return manager
      .useCache(
        `css-${cssBase}`,
        () => getImg(manager, cssEndpoint, client), //use getImg to fetch images
        600
      )
      .then((cachedImageBase64: string) => {
        // Convert Base64 string to ArrayBuffer
        const arrayBuffer = Uint8Array.from(atob(cachedImageBase64), c =>
          c.charCodeAt(0)
        ).buffer

        // Convert the ArrayBuffer to a Blob
        const blob = new Blob([arrayBuffer], { type: 'image/jpeg' })

        // Return the Blob in the response
        return new Response(blob, {
          headers: { 'Content-Type': 'image/jpeg' },
        })
      })
      .catch((error: Error) => {
        return new Response(`Error: ${error}`, { status: 500 })
      })
  })
  // define route to fetch and cache imgages
  const imgRoute = manager.route('/image/', async request => {
    const url = new URL(request.url)
    let imgPathQuery = '/' + url.searchParams.get('q')
    imgPathQuery = imgPathQuery ? decodeURIComponent(imgPathQuery) : ''
    const imgEndpoint = 'https://scontent.cdninstagram.com' + imgPathQuery
    const imageBase = await sha256(imgEndpoint.split('?')[0])
    return manager
      .useCache(
        `image-${imageBase}`,
        () => getImg(manager, imgEndpoint, client),
        600
      )
      .then((cachedImageBase64: string) => {
        // Convert Base64 string to ArrayBuffer
        const arrayBuffer = Uint8Array.from(atob(cachedImageBase64), c =>
          c.charCodeAt(0)
        ).buffer

        // Convert the ArrayBuffer to a Blob
        const blob = new Blob([arrayBuffer], { type: 'image/jpeg' })

        // Return the Blob in the response
        return new Response(blob, {
          headers: { 'Content-Type': 'image/jpeg' },
        })
      })
      .catch((error: Error) => {
        return new Response(`Error: ${error}`, { status: 500 })
      })
  })

  manager.registerEmbed('post', async ({ parameters, client }) => {
    const captions = parameters['captions'] as string
    const isCaptioned = (captions: string) =>
      captions === 'true' ? 'captioned/' : ''

    const postUrlString = parameters['post-url'] as string
    const postUrl = new URL(postUrlString)
    const cleanUrl = postUrl.origin + postUrl.pathname

    const htmlEndpoint = cleanUrl + 'embed/' + isCaptioned(captions)
    const baseHTML = cleanUrl + hashedUserAgent(client)
    const postHtml = await manager.useCache(
      `html-${baseHTML}`,
      () => getHtml(manager, htmlEndpoint, client),
      600
    )
    //
    if (postHtml) {
      const postCss = await getCSS(manager, postHtml, client, CSSRoute)
      const updatedHtml = updateHtml(postHtml, client, imgRoute)
      const output = mustache.render(updatedHtml, {
        'post-css': postCss,
      })
      return output
    } else {
      // Return a default string or handle the undefined case more gracefully
      return 'Post could not be loaded'
    }
  })
}
