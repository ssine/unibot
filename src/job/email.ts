import { getMail, getRecentMails, markAsRead } from '../api/imap'
import { Chatbot, EventType, MessageReceiver, MessageType } from "../bot/base"
import { Job } from "./base"

export class Email extends Job {
  me: MessageReceiver
  ids: number[]
  imapConfig: any
  bot: Chatbot
  accountId: number
  static GlobalID: number = 0

  constructor(me: MessageReceiver, config: any) {
    super()
    this.me = me
    this.imapConfig = config
    this.accountId = Email.GlobalID++
  }

  async sayToMe(text: string): Promise<void> {
    await this.bot.sendTextMessage({ ...this.me, text: text })
  }

  async register(bot: Chatbot) {
    this.bot = bot;

    this.ids = (await getRecentMails(this.imapConfig, 30)).map(mail => mail.id)
    console.log(`${this.ids.length} mails buffer created for account ${this.imapConfig.user}`)
    
    const runCheck = async () => {
      console.log(`checking for new mails in account ${this.imapConfig.user}`)
      const mails = await getRecentMails(this.imapConfig, 4);
      await Promise.all(mails.filter(m => !this.ids.includes(m.id)).map(async m => {
        const text = `Mail #${m.id} of ${m.to.value[0]?.address}\n主题 ${m.subject}\n来自 ${m.from.text}\n正文：${m.text.substr(0, 100)}`
        const html = `<h1>Mail #${m.id} of ${this.imapConfig.user} (${this.accountId})</h1><b>主题</b> ${m.subject}<br/><b>来自</b> <i>${m.from.text}</i><br/><b>正文</b> ${m.text.substr(0, 100)}`
        await bot.sendHtmlMessage({ ...this.me, text: text, html: html })
        this.ids.push(m.id)
      }))
      console.log('check done')
      setTimeout(runCheck, 15 * 60 * 1000);
    }

    setTimeout(runCheck, 2 * 60 * 1000);  // for easy checking

    bot.on(EventType.message, async (msg) => {
      if (msg.from.room.id === this.me.roomId && msg.content.type === MessageType.text) {
        const text = msg.content.text
        let m = /x (\d+) (\d+)/.exec(text)
        if (m) {
          if (parseInt(m[1]) === this.accountId) {
            await markAsRead(this.imapConfig, parseInt(m[2]))
            bot.reply(msg, `Mail #${m[2]} in account ${m[1]} marked as read.`)
            return
          }
        }

        m = /o (\d+) (\d+)/.exec(text)
        if (m) {
          if (parseInt(m[1]) === this.accountId) {
            const mail = await getMail(this.imapConfig, parseInt(m[2]))
            bot.reply(msg, mail.text)
            return
          }
        }
      }
    })
  }
}