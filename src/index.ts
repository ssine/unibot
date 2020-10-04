import { MatrixBot } from './bot/matrix'
import { matrixConfig, matrixSelf } from './config'
import { MiscJob } from './job/misc'
import { LifeCalendar } from './job/calendar'

(async () => {
  const bot = new MatrixBot(matrixConfig)
  await bot.start()

  console.log('bot started')
  
  await (new MiscJob(matrixSelf)).register(bot)
  await (new LifeCalendar(matrixSelf)).register(bot)
  
  console.log('jobs registered')
})()
