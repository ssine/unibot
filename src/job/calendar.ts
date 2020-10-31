import { get_file_content, put_file } from '../api/oss'
import { Chatbot, Contact, Message, EventType, MessageReceiver } from '../bot/base'
import { CronJob } from 'cron'
import { Job } from './base'

export class LifeCalendar extends Job {
  calendarItems: string[]
  calenderPromises: Promise<any>[]
  me: MessageReceiver
  bot: Chatbot

  constructor(me: MessageReceiver) {
    super()
    this.calendarItems = []
    this.calenderPromises = []
    this.me = me
  }

  async sayToMe(text: string): Promise<void> {
    await this.bot.sendTextMessage({ ...this.me, text: text })
  }

  async register(bot: Chatbot): Promise<void> {
    this.bot = bot

    new CronJob('0 30 23 * * *', () => {
      console.log('it\'s ' + new Date().toLocaleTimeString() + ' now, asking for life calendar update.')
      this.sequencedGetCalender()
    }, null, true, 'Asia/Shanghai')

    let cmd_table: [RegExp, (msg: Message) => any][] = []

    bot.on(EventType.message, async (msg: Message): Promise<void> => {
      for (let [reg, callback] of cmd_table) {
        if (reg.test(msg.content.text)) await callback(msg)
      }
    })

    cmd_table.push([
      /(^cal add|^记录) ([\s\S]+)/,
      async (msg) => {
        let content = /(^cal add|^记录) ([\s\S]+)/.exec(msg.content.text)[2]
        this.addCalendarItem(content)
        await this.sayToMe(`日历条目 "${content}" 已添加。`)
      }
    ])

    cmd_table.push([
      /^cal show/,
      async (msg) => {
        await this.getCalendarItems()
      }
    ])

    cmd_table.push([
      /(^cal del|^删除条目) (\d+)/,
      async (msg) => {
        let idx = parseInt(/(^cal del|^删除条目) (\d+)/.exec(msg.content.text)[2])
        let item = this.delCalendarItem(idx)
        await this.sayToMe(`日历条目 "${item}" 已删除。`)
      }
    ])

    cmd_table.push([
      /(^cal clear|^清空日历)/,
      async (msg) => {
        this.clearCalendarItems()
        await this.sayToMe('当日日历内容已清空。')
      }
    ])
  }

  async getLifeCalendar(date_str: string) {
    const file_name = 'life_calendar/events.html'

    console.log('life calendar event triggered')
    console.log('getting today\'s data.')

    await this.sayToMe('今天做了些什么呢？')
    await this.sayToMe('每个事件一条，空语句或句号结束。')
    while (true) {
      let content = (await this.bot.waitForMessage(this.me)).content.text
      if (content === '.' || content.trim() === '' || content === '。') break
      this.calendarItems.push(content)
    }

    await this.sayToMe('那么，给今天分配一个分数吧！')
    let score = (await this.bot.waitForMessage(this.me)).content.text

    let slot = '<div date="' + date_str + '" credit="' + score + '">' + this.calendarItems.join('<br/>') + '</div>\r\n'
    console.log('slot to append: ' + slot)

    console.log('getting file from oss')
    let event_file = await get_file_content(file_name)
    let events = event_file.split('\n')
    events = events.map(s => s.trim())

    events.splice(events.length - 1, 0, slot)

    event_file = events.join('\n')
    console.log('saving file to oss')
    await put_file(file_name, event_file)

    await this.sayToMe(`事件\n${this.calendarItems.join('\n')}\n保存成功`)

    this.calendarItems = []
    console.log('done')
  }

  sequencedGetCalender() {
    let date = new Date()
    let date_str = date.getMonth() + 1 +
      '/' + date.getDate() +
      '/' + date.getFullYear()
    let promiseToWait: null | Promise<void> = null
    if (this.calenderPromises.length > 0) {
      promiseToWait = this.calenderPromises[this.calenderPromises.length - 1]
    }
    this.calenderPromises.push(new Promise(async (res, rej) => {
      if (promiseToWait) {
        await this.sayToMe('上次的日历还没有记录，正在等待之前的完成。')
        await promiseToWait
      }
      await this.getLifeCalendar(date_str)
      res()
      this.calenderPromises.splice(0, 1)
    }))
  }

  async getCalendarItems() {
    await this.sayToMe('今日已记录事件：\n' + this.calendarItems.join('\n'))
    return
  }

  addCalendarItem(event: string) {
    this.calendarItems.push(event)
    return
  }

  delCalendarItem(idx: number) {
    let item = this.calendarItems[idx]
    this.calendarItems.splice(idx, 1)
    return item
  }

  clearCalendarItems() {
    this.calendarItems = []
    return
  }

}
