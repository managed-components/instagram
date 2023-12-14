import { Manager } from '@managed-components/types'
import post from './templates/post.html'
import mustache from 'mustache'
import fs from 'fs'

export default async function (manager: Manager) {
  manager.registerEmbed('post', async ({ parameters }) => {
    const isCaptioned = (parameters: Record<string, unknown>) => {
      const caption = parameters['iscaptioned']
      if (!caption) {
        return ''
      } else {
        return 'data-instgrm-captioned'
      }
    }

    const postPath = (parameters: Record<string, unknown>) => {
      const path = parameters['postpath']
      if (!path) {
        return ''
      } else {
        console.log('222222222 path:', path)
        return path
      }
    }

    const accountName = (parameters: Record<string, unknown>) => {
      const name = parameters['accountname']
      if (!name) {
        return ''
      } else {
        return name
      }
    }

    const accountHandle = (parameters: Record<string, unknown>) => {
      const handle = parameters['accounthandle']
      if (!handle) {
        return ''
      } else {
        return handle
      }
    }
    const embedScript = fs.readFileSync(
      './components/instagram/src/templates/embed.js',
      'utf8'
    )
    const output = mustache.render(post, {
      isCaptioned: isCaptioned(parameters),
      postPath: postPath(parameters),
      accountName: accountName(parameters),
      accountHandle: accountHandle(parameters),
      embedScript: embedScript,
    })
    return output
  })
}
