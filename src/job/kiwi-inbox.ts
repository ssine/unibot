import { Chatbot, EventType, Message, MessageReceiver, MessageType } from '../bot/base'
import { Job } from './base'
import axios from 'axios'
import { kiwiConfig } from '../config'
import { putImage } from '../api/kiwi'

export class KiwiInbox extends Job {
  me: MessageReceiver

  constructor(me: MessageReceiver) {
    super()
    this.me = me
  }

  async register(bot: Chatbot): Promise<void> {

    bot.on(EventType.message, async (msg: Message): Promise<void> => {
      if (/inbox\/.*/.test(msg.from.room.name)) {
        if (msg.content.type === MessageType.text) {
          this.appendItemContent(msg.from.room.name, '\n\n' + msg.content.text)
          await bot.reply(msg, `text added to ${msg.from.room.name}`)
        } else if (msg.content.type === MessageType.image) {
          const m = /.*\/(.+?)\?/.exec(msg.content.url)
          const uri = await putImage(msg.content.url, m[1])
          this.appendItemContent(msg.from.room.name, `\n\n![img](${uri})`)
          await bot.reply(msg, `image added to ${msg.from.room.name}`)
        }
      } else if (msg.content.text.startsWith('get')) {
        await bot.reply(msg, (await this.getKiwiItem(msg.content.text.substr(4))).content)
      }
    });

  }

  async getKiwiItem(uri: string): Promise<any> {
    try {
      const res = await axios.post(`${kiwiConfig.base_uri}/get-item`, { "uri": uri }, {
        headers: {
          Cookie: `token=${kiwiConfig.token}`
        }
      })
      return res.data
    } catch (err) {
      console.log(err)
      return {
        uri: uri,
        title: uri.split('/').slice(-1)[0],
        headers: {
          tags: []
        },
        content: ''
      }
    }
  }

  async setKiwiItem(originUri: string, item: any): Promise<any> {
    const res = await axios.post(`${kiwiConfig.base_uri}/put-item`, { 'uri': originUri, 'item': item }, {
      headers: {
        Cookie: `token=${kiwiConfig.token}`
      }
    })
    return res.data
  }

  async appendItemContent(uri: string, text: string): Promise<any> {
    let item = (await this.getKiwiItem(uri)).data;
    item.content += text
    await this.setKiwiItem(uri, item)
  }
}
