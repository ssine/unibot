import { Chatbot, EventType, Message, MessageReceiver } from '../bot/base'
import { Job } from './base'
import { CronJob } from 'cron'

export class MiscJob extends Job {
  me: MessageReceiver

  constructor(me: MessageReceiver) {
    super()
    this.me = me
  }

  async register(bot: Chatbot): Promise<void> {

    await bot.sendTextMessage({
      ...this.me,
      text: '启动成功'
    })

    bot.on(EventType.message, async (msg: Message): Promise<void> => {
      if (/roll/.test(msg.content.text)) {
        await bot.reply(msg, (Math.random() * 100).toFixed(2).toString())
      }
    });

    new CronJob('0 0 0 * * *', async () => {
      await bot.sendTextMessage({
        ...this.me,
        text: '一亩三分地签到'
      })
    }, null, true, 'Asia/Shanghai');

  }
}
