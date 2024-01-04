import mustache from 'mustache'
import { Manager } from '@managed-components/types'
import postCss from './templates/post-css.css'

export default async function (manager: Manager) {
  // function to fetch img content
  async function getImg(imgEndpoint: string) {
    console.log(
      'Get image is WORKINGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG: ',
      imgEndpoint
    )
    // const response = await fetch(imgEndpoint, {
    //   headers: {
    //     Accept: 'image/jpeg,image/png,image/*,*/*;q=0.8',
    //     'User-Agent':
    //       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
    //   },
    //   method: 'GET',
    //   mode: 'cors',
    //   credentials: 'include',
    // })
    const response = new Response('ok its fine')
    console.log('Response:', response)
    console.log('Response status:', response.status)

    // Check the Content-Type header to see if it's an image
    const contentType = response.headers.get('Content-Type')
    console.log('Content-Type:', contentType)

    // Proceed only if the response is OK and content type is an image
    //   if (response.ok && contentType && contentType.startsWith('image/')) {
    //     return response.blob()
    //   } else {
    //     throw new Error('Fetched content is not an image or response is not OK')
    //   }
    return 'ok im soooo cool!!!!'
  }

  // define route to fetch and cache imgages
  manager.route('/image/*', request => {
    console.log(
      'route is onnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'
    )
    const imgPath = request.url.split('/webcm/instagram/image')[1]
    const imgEndpoint = 'https://scontent.cdninstagram.com/v' + imgPath
    console.log(
      '!@!#!@$#@$!$#!@$!@#$!@#$@#!$@#$@!$@!#$@#$ this is imgEndpoint: ',
      imgEndpoint
    )
    return manager
      .useCache(`image-${imgPath}`, () => getImg(imgEndpoint), 600)
      .then((cachedImage: any) => {
        //change later to Blob
        console.log(
          '!@#$!$!@#%!@%@!#%#@!%!@%@#!% this is CASHEDIMAGE',
          cachedImage
        )
        return new Response(cachedImage, {
          headers: { 'Content-Type': 'image/jpeg' },
        })
      })
      .catch((error: Error) => {
        return new Response(`Error: ${error}`, { status: 500 })
      })
  })

  // registerEmbed to Instagram post that grabs content from the html
  manager.registerEmbed('post', async ({ parameters }) => {
    const captions = parameters['captions'] as string
    const isCaptioned = (captions: string) => {
      return captions ? 'captioned/' : ''
    }

    const postUrlString = parameters['post-url'] as string
    const postUrl = new URL(postUrlString)
    const cleanUrl = postUrl.origin + postUrl.pathname

    const endpoint = cleanUrl + 'embed/' + isCaptioned(captions)
    // fetch html content
    const response = await fetch(endpoint, {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'cache-control': 'max-age=0',
        dpr: '2',
        'sec-ch-prefers-color-scheme': 'dark',
        'sec-ch-ua':
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-full-version-list':
          '"Not_A Brand";v="8.0.0.0", "Chromium";v="120.0.6099.109", "Google Chrome";v="120.0.6099.109"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-platform': '"macOS"',
        'sec-ch-ua-platform-version': '"14.1.1"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'viewport-width': '358',
      },
      referrerPolicy: 'strict-origin-when-cross-origin',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
    })
    // store the html response in a JS var to update html content
    const postHtml = await response.text()

    // change html encoding
    let updatedHtml = postHtml.replace(/&amp;/g, '&')
    // remove unnecessary css and scripts
    const regex =
      /<(link|script)[^>]+?(href|src)="https:\/\/static\.cdninstagram\.com\/rsrc\.php[^>]+?>.*?<\/script>/gs
    updatedHtml = updatedHtml.replace(regex, '')
    updatedHtml = updatedHtml.replace(
      /<script src="chrome-extension:\/\/nngceckbapebfimnlniiiahkandclblb\/content\/fido2\/page-script\.js"><\/script>/g,
      ''
    )
    // prepare to inline css using mustache
    updatedHtml = updatedHtml.replace(
      /(<head[^>]*>)/,
      `$1<style>{{{post-css}}}</style>`
    )
    // change images links to route function

    updatedHtml = updatedHtml.replace(
      /<img([^>]+?)src=["']https:\/\/scontent\.cdninstagram\.com\/v([^"']+)["']/g,
      '<img$1src="/webcm/instagram/image$2"'
    )

    // const updatedCss = postCss.replace(/&#39;/g, "\\'")

    const output = mustache.render(updatedHtml, {
      'post-css': postCss,
    })

    console.log('@@@@@@!#!@$%$!@%#!@#%!@%$#!% this is output :', output)
    return output
  })
}
