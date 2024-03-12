import { Client, Manager } from '@managed-components/types'
import * as cheerio from 'cheerio'

// function to fetch images
export async function getImg(
  manager: Manager,
  endpoint: string,
  client: Client
) {
  const response = await manager.fetch(endpoint, {
    headers: {
      authority: 'scontent.cdninstagram.com',
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'sec-ch-ua':
        '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'user-agent':
        client?.userAgent ||
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    },
    method: 'GET',
  })

  // Check the Content-Type header to see if it's an image
  if (response) {
    const contentType = response.headers.get('Content-Type')
    // Proceed only if the response is OK and content type is an image
    if (
      response &&
      response.ok &&
      contentType &&
      contentType.startsWith('image/')
    ) {
      const arrayBuffer = await response.arrayBuffer()
      const base64String = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      )
      return base64String
    } else {
      throw new Error('Fetched content is not an image or response is not OK')
    }
  }
}

// function to fetch css stylsheets and combine them together in JS var
export async function getCss(
  manager: Manager,
  postHtml: string,
  client: Client
) {
  const hostName =
    client.url.hostname === 'localhost'
      ? 'http://127.0.0.1:1337' // used for Zaraz testing
      : `http://${client.url.hostname}`

  // Load HTML string with cheerio
  const $ = cheerio.load(postHtml)

  // Extract CSS URLs
  const cssUrls = $('link[rel="stylesheet"]')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(url => typeof url === 'string')
  async function fetchAndCombineCss(urls: string[]): Promise<string> {
    const cssContents = await Promise.all(
      urls.map(url =>
        manager
          .fetch(url, {
            headers: {
              accept: 'text/css',
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
            method: 'GET',
          })
          ?.then(response => response.text())
      )
    )
    let combinedCss = cssContents.join('\n\n') // Combine all CSS contents

    // find images inside css and apply replace endpoint to route URL to load them from the same domain
    combinedCss = combinedCss.replace(
      /url\(\/rsrc/g,
      (_match, path) =>
        `${hostName}/cdn-cgi/zaraz/components/route/instagram_2c1b/css/rsrc/?q=` +
        encodeURIComponent(path)
    )
    return combinedCss.replace(/%3Fq=/, '?q=')
  }

  // here is the place to add a function to clean CSS by going over the posthtml and only keeping css that directly influences it

  // Fetch and combine CSS, and await the result
  const postCss = await fetchAndCombineCss(cssUrls)
  return postCss
}

// function to fetch html content
export async function getHtml(
  manager: Manager,
  htmlEndpoint: string,
  client: Client
) {
  const response = await manager.fetch(htmlEndpoint, {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      dnt: '1',
      'sec-ch-prefers-color-scheme': 'light',
      'sec-ch-ua':
        '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-platform-version': '"14.3.1"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'User-Agent':
        client?.userAgent ||
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'viewport-width': '1440',
    },
    method: 'GET',
  })
  const myHtml = await response?.text()
  return myHtml
}
// function to update the html
export async function updateHtml(postHtml: string, client: Client) {
  const hostName =
    client.url.hostname === 'localhost'
      ? 'http://127.0.0.1:1337' // used for Zaraz testing
      : `http://${client.url.hostname}`
  const $ = cheerio.load(postHtml)

  $('link, script').remove() // remove scripts from html

  $('img[src*="scontent.cdninstagram.com"]').each((i, el) => {
    const img = $(el)
    const src = img.attr('src')
    if (src) {
      const newSrc = src.replace(
        /^https:\/\/scontent.cdninstagram.com\/(.*)$/,
        (_match, path) =>
          `${hostName}/cdn-cgi/zaraz/components/route/instagram_2c1b/image/?q=` +
          encodeURIComponent(path)
      )
      img.attr('src', newSrc.replace(/%3Fq=/, '?q='))
    }

    const srcset = img.attr('srcset')
    if (srcset) {
      const newSrcset = srcset
        .split(',')
        .map(part => {
          const [url, descriptor] = part.trim().split(' ')
          const newUrl = url.replace(
            /^https:\/\/scontent.cdninstagram.com\/(.*)$/,
            (_match, path) =>
              `${hostName}/cdn-cgi/zaraz/components/route/instagram_2c1b/image/?q=` +
              encodeURIComponent(path)
          )
          return `${newUrl} ${descriptor}`
        })
        .join(', ')
      img.attr('srcset', newSrcset.replace(/%3Fq=/, '?q='))
    }
  })
  $('head').append(`<style>
  html {
    background: white;
    max-width: 540px;
    width: calc(100% - 2px);
    border-radius: 3px;
    border: 1px solid rgb(219, 219, 219);
    box-shadow: none;
    display: block;
    margin: 0px 0px 12px;
    min-width: 326px;
    padding: 0px;
  }
  {{{post-css}}}
</style>`)
  $('*').each(function () {
    const element = $(this)
    const node = this as any // ?? Not sure how to get rid of this type assertion to any

    // Iterate over each attribute of the element
    if (node.attribs) {
      Object.keys(node.attribs).forEach(attr => {
        const value = element.attr(attr)
        // Replace &amp; with & in the attribute value
        if (value) {
          element.attr(attr, value.replace(/&amp;/g, '&'))
        }
      })
    }
  })

  return $.html()
}
