/**
 * This file is intended to contain a base class for all chatbot sdks,
 * including coolq, telegram, wechaty and matrix.
 * My own purpose was simple, only text messaging functionality will be
 * supported now.
 */
import { EventEmitter } from 'events'

export enum EventType {
  message = 'message'
}

export type Contact = {
  id: string
  alias?: string
}

export type Room = {
  id: string
}

export enum MessageType {
  text = 'text'
}

export type Message = {
  from: {
    contact: Contact,
    room: Room | null
  },
  content: {
    type: MessageType
    text: string
  },
  timeSent: Date
}

export type MessageReceiver = {
  contactId?: string
  roomId?: string
}

export abstract class Chatbot {
  emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
  }

  abstract getInternalClient(): any
  abstract async sendTextMessage(args: {
    contactId?: string, roomId?: string, text: string
  }): Promise<void>

  /**
   * This method should be called when new message arrives.
   * @param message 
   */
  protected onMessageReceived(message: Message): void {
    this.emitter.emit(EventType.message, message)
  }

  on(eventType: EventType.message, callback: (message: Message) => void): void
  on(eventType: any, callback: any): any {
    this.emitter.on(eventType, callback)
  }

  off(eventType: EventType.message, callback: (message: Message) => void): void
  off(eventType: any, callback: any): any {
    this.emitter.off(eventType, callback)
  }

  async reply(msg: Message, text: string): Promise<void> {
    let to: MessageReceiver = {}
    if (msg.from.contact) to.contactId = msg.from.contact.id
    if (msg.from.room) to.roomId = msg.from.room.id
    await this.sendTextMessage({ ...to, text: text })
  }

  async waitForMessage(args: {
    contactId?: string, roomId?: string, text?: RegExp, timeoutSecond?: number
  }): Promise<Message> {
    const waitTime = new Date()

    return new Promise<Message>((resolve, reject) => {

      const callback = async (message: Message) => {
        if (message.timeSent < waitTime) return
        if (args.contactId && message.from.contact.id !== args.contactId) return
        if (args.roomId && message.from.room?.id !== args.roomId) return
        if (args.text && !args.text.test(message.content.text)) return
        this.off(EventType.message, callback)
        resolve(message)
      }

      this.on(EventType.message, callback)

      if (args.timeoutSecond) {
        setTimeout(() => {
          this.off(EventType.message, callback)
          reject(Error('timed out'))
        }, args.timeoutSecond * 1000)
      }

    })
  }
}
