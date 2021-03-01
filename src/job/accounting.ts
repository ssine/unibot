import { Chatbot, EventType, Message, MessageReceiver } from '../bot/base'
import { Job } from './base'
import { CronJob } from 'cron'

export class Accounting extends Job {
  me: MessageReceiver

  constructor(me: MessageReceiver) {
    super()
    this.me = me
  }

  async register(bot: Chatbot): Promise<void> {

    new CronJob('0 0 0 1 * *', async () => {
      await bot.sendTextMessage({
        ...this.me,
        text: '记录账户余额！'
      })
    }, null, true, 'Asia/Shanghai');

  }
}
