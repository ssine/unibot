import { getRecentMails } from '../api/imap'
import { Chatbot, MessageReceiver } from "../bot/base"
import { Job } from "./base"

export class Email extends Job {
  me: MessageReceiver
  ids: number[]
  imapConfig: any
  bot: Chatbot

  constructor(me: MessageReceiver, config: any) {
    super()
    this.me = me
    this.imapConfig = config;
  }

  async sayToMe(text: string): Promise<void> {
    await this.bot.sendTextMessage({ ...this.me, text: text })
  }

  async register(bot: Chatbot) {
    this.bot = bot;

    this.ids = (await getRecentMails(this.imapConfig, 30)).map(mail => mail.id)
    
    const runCheck = async () => {
      const mails = await getRecentMails(this.imapConfig, 30);
      await Promise.all(mails.filter(m => !this.ids.includes(m.id)).map(async m => {
        const text = `Mail #${m.id} of ${m.to.value[0]?.address}\n主题 ${m.subject}\n来自 ${m.from.text}\n正文：${m.text.substr(0, 100)}`
        const html = `<h1>Mail #${m.id} of ${m.to.value[0]?.address}</h1><b>主题</b> ${m.subject}<br/><b>来自</b> <i>${m.from.text}</i><br/><b>正文</b> ${m.text.substr(0, 100)}`
        await bot.sendHtmlMessage({ ...this.me, text: text, html: html })
        this.ids.push(m.id)
      }))
      setTimeout(runCheck, 15 * 60 * 1000);
    }

    setTimeout(runCheck, 15 * 60 * 1000);
  }
}