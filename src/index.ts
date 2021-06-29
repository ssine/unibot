import { MatrixBot } from './bot/matrix'
import { mailConfig, matrixConfig, matrixSelf } from './config'
import { MiscJob } from './job/misc'
import { LifeCalendar } from './job/calendar'
import { Accounting } from './job/accounting'
import { KiwiInbox } from './job/kiwi-inbox'
import { Email } from './job/email'

(async () => {
  const bot = new MatrixBot(matrixConfig)
  await bot.start()

  console.log('bot started')
  
  await Promise.all(mailConfig.accounts.map(m => (new Email(mailConfig.room, m).register(bot))))
  await (new MiscJob(matrixSelf)).register(bot)
  await (new LifeCalendar(matrixSelf)).register(bot)
  await (new Accounting(matrixSelf)).register(bot)
  await (new KiwiInbox(matrixSelf)).register(bot)

  console.log('jobs registered')
})()
