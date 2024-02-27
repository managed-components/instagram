import mustache from 'mustache'
import { Manager, Client } from '@managed-components/types'
import { getImg, getCss, getHtml, updateHtml } from './utils'

export default async function (manager: Manager, client: Client) {
  // define route to fetch and cache images from css
  manager.route('/css/*', request => {
    const cssPath = request.url.split('/webcm/instagram/css')[1]
    const cssEndpoint = 'https://static.cdninstagram.com' + cssPath
    return manager
      .useCache(
        `css-${cssPath}`,
        () => getImg(manager, cssEndpoint, client),
        600
      ) // cacheing does not work
      .then((cachedImage: Blob) => {
        return new Response(cachedImage, {
          headers: { 'Content-Type': 'image/jpeg' },
        })
      })
      .catch((error: Error) => {
        return new Response(`Error: ${error}`, { status: 500 })
      })
  })

  // define route to fetch and cache imgages
  manager.route('/image/*', request => {
    const imgPath = request.url.split('/webcm/instagram/image')[1]
    const imgEndpoint = 'https://scontent.cdninstagram.com' + imgPath
    return manager
      .useCache(
        `image-${imgPath}`,
        () => getImg(manager, imgEndpoint, client),
        600
      )
      .then((cachedImage: Blob) => {
        return new Response(cachedImage, {
          headers: { 'Content-Type': 'image/jpeg' },
        })
      })
      .catch((error: Error) => {
        return new Response(`Error: ${error}`, { status: 500 })
      })
  })

  manager.registerEmbed('instagram-post', async ({ parameters, client }) => {
    const captions = parameters['captions'] as string
    const isCaptioned = (captions: string) => {
      // note to self: check that uncaptioned works just as fine
      return captions ? 'captioned/' : ''
    }

    const postUrlString = parameters['post-url'] as string // note to self: check that different posts works just as fine
    const postUrl = new URL(postUrlString)
    const cleanUrl = postUrl.origin + postUrl.pathname

    const htmlEndpoint = cleanUrl + 'embed/' + isCaptioned(captions)
    const postHtml = await getHtml(manager, htmlEndpoint, client) // can't make the fetch dynamic, bc client is empty, I think
    if (postHtml) {
      const postCss = await getCss(manager, postHtml) // I am getting some errors _probably_ due to the await Promise.all

      const updatedHtml = await updateHtml(postHtml)

      const output = mustache.render(updatedHtml, {
        'post-css': postCss, // post CSS is still too big, I need to clean the CSS -- HOW?!?
      })
      return output // I `think we are making it larger due to how we embed the iframe using this method: src="data:text/html;charset=UTF-8,%3C!DOCTYPE%20html%3E...
    } else {
      // Return a default string or handle the undefined case more gracefully
      return 'Post could not be loaded' // Ensure we always return a string
    }
  })
}
