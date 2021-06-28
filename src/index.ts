import { MatrixBot } from './bot/matrix'
import { mails, matrixConfig, matrixSelf } from './config'
import { MiscJob } from './job/misc'
import { LifeCalendar } from './job/calendar'
import { Accounting } from './job/accounting'
import { KiwiInbox } from './job/kiwi-inbox'
import { Email } from './job/email'

(async () => {
  const bot = new MatrixBot(matrixConfig)
  await bot.start()

  console.log('bot started')
  
  await Promise.all(mails.map(config => (new Email(matrixSelf, config).register(bot))))
  await (new MiscJob(matrixSelf)).register(bot)
  await (new LifeCalendar(matrixSelf)).register(bot)
  await (new Accounting(matrixSelf)).register(bot)
  await (new KiwiInbox(matrixSelf)).register(bot)

  console.log('jobs registered')
})()
