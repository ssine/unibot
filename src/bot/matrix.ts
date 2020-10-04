import {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
  LogService,
  LogLevel,
  MessageEvent,
} from "matrix-bot-sdk"
import { Chatbot, EventType, Message, MessageType } from './base'

type MatrixBotConfig = {
  homeserverUrl: string,
  accessToken: string,
  dataStorePath: string
}

export class MatrixBot extends Chatbot {
  client: MatrixClient
  botId: string

  constructor(config: MatrixBotConfig) {
    super()

    LogService.setLevel(LogLevel.ERROR)
    const storage = new SimpleFsStorageProvider(config.dataStorePath)
    this.client = new MatrixClient(config.homeserverUrl, config.accessToken, storage)
    AutojoinRoomsMixin.setupOnClient(this.client)

    this.client.on('room.message', (roomId: string, ev: any) => {
      const event = new MessageEvent(ev)
      if (event.isRedacted) return;  // Ignore redacted events that come through
      if (event.sender === this.botId) return;  // Ignore ourselves
      if (event.messageType !== "m.text") return;  // Ignore non-text messages

      // message transformation
      const from = {
        contact: { id: event.sender },
        room: { id: roomId }
      }
      const timeSent = new Date(event.timestamp)
      let content = {
        type: MessageType.text,
        text: ''
      }
      switch (event.content?.msgtype) {
        case 'm.text': {
          content.type = MessageType.text
          content.text = event.content?.body
        }
      }
      this.onMessageReceived({
        from: from,
        content: content,
        timeSent: timeSent
      })
    })
  }

  async start() {
    await this.client.start()
    this.botId = await this.client.getUserId()
  }

  getInternalClient(): MatrixClient {
    return this.client
  }

  async sendTextMessage(args: {
    contactId?: string, roomId?: string, text: string
  }): Promise<void> {
    if (!args.roomId)
      throw new Error('matrix message sending requires room id')
    await this.client.sendMessage(args.roomId, {
      'body': args.text,
      'msgtype': 'm.text'
    })
  }

}
