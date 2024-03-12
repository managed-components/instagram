import mustache from 'mustache'
import { Client, Manager } from '@managed-components/types'
import { getImg, getCss, getHtml, updateHtml } from './utils'

export default async function (manager: Manager, client: Client) {
  // function to use sha256
  async function sha256(message: string) {
    const msgUint8 = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  // define route to fetch and cache images from css
  manager.route('/css/rsrc/', async request => {
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
      ) // cacheing does not work
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
  manager.route('/image/', async request => {
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
    const postHtml = await getHtml(manager, htmlEndpoint, client)
    if (postHtml) {
      const postCss = await getCss(manager, postHtml, client)
      const updatedHtml = await updateHtml(postHtml, client)

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
