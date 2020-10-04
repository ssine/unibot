import { Chatbot } from '../bot/base'

export abstract class Job {
  abstract async register(bot: Chatbot): Promise<void>
}
