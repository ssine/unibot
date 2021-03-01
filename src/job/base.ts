import { Chatbot } from '../bot/base'

export abstract class Job {
  abstract register(bot: Chatbot): Promise<void>
}
