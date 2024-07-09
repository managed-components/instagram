import { Client, Manager } from '@managed-components/types'
import * as cheerio from 'cheerio'

// function to convert arrayBuffer to string
function _arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(arrayBuffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
//function to determine hostname according to environment
function hostName(client: Client) {
  if (client?.url.hostname === 'localhost') {
    return 'http://127.0.0.1:1337' // used for Zaraz testing
  } else if (!client) {
    return 'http://localhost:1337' // used for WebCM
  } else if (client.url) {
    return `${client.url.protocol}//${client.url.hostname}`
  }
}

// function to fetch images
export async function getImg(
  manager: Manager,
  endpoint: string,
  client: Client
) {
  try {
    const response = await manager.fetch(endpoint, {
      headers: {
        authority: 'scontent.cdninstagram.com',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'sec-fetch-site': 'none',
        'user-agent':
          client?.userAgent ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
      method: 'GET',
    })
    // Check the Content-Type header to see if it's an image
    if (response) {
      const contentType = response.headers.get('Content-Type')
      if (
        response &&
        response.ok &&
        contentType &&
        contentType.startsWith('image/')
      ) {
        const arrayBuffer = await response.arrayBuffer()
        const base64String = _arrayBufferToBase64(arrayBuffer)
        console.log('🍣🍣🍣🍣 base64String')
        return base64String
      } else {
        throw new Error('Fetched content is not an image or response is not OK')
      }
    }
  } catch (error) {
    console.error('Error fetching image:', error)
    throw error
  }
}

// function to fetch css stylsheets and combine them together in JS var
export async function getCSS(
  manager: Manager,
  postHtml: string,
  client: Client,
  CSSRoute?: string
) {
  console.log('🍣🍣🍣🍣 getCSS works')
  // Load HTML string with cheerio
  const $ = cheerio.load(postHtml)

  // Extract CSS URLs
  const cssUrls = $('link[rel="stylesheet"]')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(url => typeof url === 'string')

  async function fetchAndCombineCss(urls: string[]): Promise<string> {
    const cssContents = await Promise.all(
      urls.map(async url => {
        try {
          return await manager.useCache(
            // cache css content
            `css-${url}`,
            async () => {
              const response = await manager.fetch(url, {
                headers: {
                  accept: 'text/css',
                  'sec-fetch-site': 'none',
                },
                method: 'GET',
              })
              if (response && !response.ok) {
                throw new Error(
                  `Failed to fetch CSS from ${url}, status: ${response.status}`
                )
              } else if (response?.ok) {
                return await response.text()
              }
            },
            600
          )
        } catch (error) {
          console.error(`Error fetching CSS from ${url}:`, error)
          return '' // Return an empty string to avoid disrupting the array of CSS contents
        }
      })
    )

    let combinedCss = cssContents.join('\n\n') // Combine all CSS contents

    // find images inside css and apply replace endpoint to route URL to load them from the same domain
    combinedCss = combinedCss.replace(
      /url\(\/rsrc/g,
      (_match, path) =>
        `${hostName(client)}${CSSRoute}?q=` + encodeURIComponent(path)
    )
    return combinedCss.replace(/%3Fq=/, '?q=')
  }

  // here is the place to add a function to clean CSS by going over the posthtml and only keeping css that directly influences it

  // Fetch and combine CSS, and await the result
  const postCss = await fetchAndCombineCss(cssUrls)
  console.log('🍣🍣🍣🍣🍣 postCss: ', postCss)
  return postCss
}

// function to fetch html content
export async function getHtml(
  manager: Manager,
  htmlEndpoint: string,
  client: Client
) {
  try {
    console.log('🍣🍣🍣🍣 getHtml works')
    const response = await manager.fetch(htmlEndpoint, {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'sec-fetch-site': 'none',
        'User-Agent':
          client?.userAgent ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
      method: 'GET',
    })
    if (response?.ok) {
      console.log('🍣🍣🍣🍣 getHtml response: ', response.text())
      return await response.text()
    } else {
      throw new Error('Failed to fetch HTML content')
    }
  } catch (error) {
    console.error('Error fetching HTML content:', error)
    throw error
  }
}

// function to update the html
export async function updateHtml(
  manager: Manager,
  postHtml: string,
  client: Client,
  baseHTML: string,
  imgRoute?: string
) {
  const updatedHtml = await manager.useCache(
    `html-${baseHTML}-${client.url.hostname}`,
    () => {
      const $ = cheerio.load(postHtml)

      $('link, script').remove() // remove scripts from html

      $('img[src*="scontent.cdninstagram.com"]').each((i, el) => {
        const img = $(el)
        const src = img.attr('src')!
        const newSrc = src.replace(
          /^https:\/\/scontent.cdninstagram.com\/(.*)$/,
          (_match, path) =>
            `${hostName(client)}${imgRoute}?q=` + encodeURIComponent(path)
        )
        img.attr('src', newSrc)

        const srcset = img.attr('srcset')
        if (srcset) {
          const newSrcset = srcset
            .split(',')
            .map(part => {
              const [url, descriptor] = part.trim().split(' ')
              const newUrl = url.replace(
                /^https:\/\/scontent.cdninstagram.com\/(.*)$/,
                (_match, path) =>
                  `${hostName(client)}${imgRoute}?q=` + encodeURIComponent(path)
              )
              return `${newUrl} ${descriptor}`
            })
            .join(', ')
          img.attr('srcset', newSrcset)
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
    },
    600
  )
  return updatedHtml
}
