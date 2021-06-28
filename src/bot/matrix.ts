import * as sdk from "matrix-js-sdk"
import { isThisTypeNode } from "typescript"
import { Chatbot, EventType, Message, MessageType } from './base'

type MatrixBotConfig = {
  homeserverUrl: string,
  accessToken: string,
  userId: string,
}

export class MatrixBot extends Chatbot {
  client: any
  botId: string
  synced: boolean = false

  constructor(config: MatrixBotConfig) {
    super()

    this.client = sdk.createClient({
      baseUrl: config.homeserverUrl,
      accessToken: config.accessToken,
      userId: config.userId,
    })

    this.botId = config.userId

    this.client.on("RoomMember.membership", (event: any, member: any) => {
      if (member.membership === "invite" && member.userId === this.botId) {
        this.client.joinRoom(member.roomId).then(function () {
          console.log("Auto-joined %s", member.roomId)
        })
      }
    })

    this.client.on("Room.timeline", (event: any, room: any, toStartOfTimeline: any) => {
      if (event.getType() !== "m.room.message") return
      if (event.event.sender === this.botId) return

      const from = {
        contact: { id: event.event.sender },
        room: { id: event.event.room_id, name: this.getRoomNameFromId(event.event.room_id) }
      }
      const timeSent = new Date(event.event.origin_server_ts)
      let content = {
        type: MessageType.text,
        text: '',
        url: '',
      }
      switch (event.event.content?.msgtype) {
        case 'm.text': {
          content.type = MessageType.text
          content.text = event.event.content?.body
          break
        }
        case 'm.image': {
          content.type = MessageType.image
          content.url = this.client.mxcUrlToHttp(event.event.content?.url, event.event.content?.info?.w, event.event.content?.info?.h, 'scale')
          break
        }
      }
      if (!this.synced) return
      this.onMessageReceived({
        from: from,
        content: content,
        timeSent: timeSent
      })
    });
  }

  async start() {
    const syncedPromise = new Promise((res, rej) => {
      this.client.on('sync', async (state: any, prevState: any, r: any) => {
        if (state !== 'PREPARED') return
        this.synced = true
        res(null)
      })
    })
    await this.client.startClient({
      initialSyncLimit: 10,
    })
    return syncedPromise
  }

  getInternalClient(): any {
    return this.client
  }

  getRoomNameFromId(roomId: string): string {
    for (const room of this.client.getRooms()) {
      if (room.roomId === roomId) {
        return room.name
      }
    }
    return ''
  }

  async sendTextMessage(args: {
    contactId?: string, roomId?: string, text: string
  }): Promise<void> {
    if (!args.roomId)
      throw new Error('matrix message sending requires room id')
    await this.client.sendEvent(
      args.roomId,
      'm.room.message',
      {
        msgtype: 'm.text',
        body: args.text,
      },
      ''
    );
  }

  async sendHtmlMessage(args: {
    contactId?: string, roomId?: string, text: string, html: string
  }): Promise<void> {
    if (!args.roomId)
      throw new Error('matrix message sending requires room id')
    await this.client.sendHtmlMessage( args.roomId, args.text, args.html);
  }

}
