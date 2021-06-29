import { CQWebSocket } from 'cq-websocket'
import { EventEmitter } from 'events'
import { getLogger } from 'log4js'
import { cqConfig } from './config'

let logger = getLogger('BOT');

class Bot {
  bot: CQWebSocket;
  emitter: EventEmitter;

  constructor() {
    this.bot = new CQWebSocket({
      host: cqConfig.host,
      port: cqConfig.port,
      accessToken: cqConfig.accessToken,
    });
    this.emitter = new EventEmitter();

    this.bot
    .on('socket.error', logger.error)
    .on('socket.connecting', (wsType) => logger.debug(`[${wsType}] Connecting...`))
    .on('socket.connect', (wsType, _, attempts) => logger.debug(`[${wsType}] Connected in ${attempts} attempts`))
    .on('socket.failed', (wsType, attempts) => logger.debug(`[${wsType}] Connect failed on ${attempts} attempts`))
    .on('socket.close', (wsType, code, desc) => logger.debug(`[${wsType}] Connect close: ${code} ${desc}`))

    .on('ready', () => {
      logger.info(`bot is ready`);

      this.bot('send_private_msg', {
        user_id: 963366202,
        message: '启动成功'
      })
    })

    .connect()
    
    .on('message.private', (event, context) => {
      logger.trace('received message ' + context.message + ' from ' + context.user_id);
      this.emitter.emit('message.private', event, context);
    })

  }

  register_on_event(event: any, callback: any) {
    this.bot.on(event, callback);
  }

  register_once_event(event: any, callback: any) {
    this.bot.once(event, callback);
  }

  add_private_msg_listener(callback: (sender: number, text: string) => void) {
    this.emitter.on('message.private', (event, context) => {
      callback(context.user_id, context.message);
    });
  }

  async send_private_msg(to: number, text: string): Promise<any> {
    logger.trace('sending message ' + text + ' to ' + to);
    try {
      return this.bot('send_private_msg', {
        user_id: to,
        message: text
      });
    } catch(err) {
      logger.error(err);
      return null;
    }
  }

  async send_group_msg(to: number, text: string): Promise<any> {
    logger.trace('sending group message ' + text + ' to ' + to);
    try {
      return this.bot('send_group_msg', {
        group_id: to,
        message: text
      });
    } catch(err) {
      logger.error(err);
      return null;
    }
  }

  async wait_for_msg(from: number): Promise<string> {
    let now = new Date().getTime() / 1000 + 1;
    logger.debug('begin waiting for message from ' + from);
    return new Promise<string>((resolve, reject) => {
      let callback = (event, context) => {
        logger.debug('got message: ' + JSON.stringify(context));
        if (context.time > now && context.sender.user_id == from) {
          this.emitter.removeListener('message.private', callback);
          logger.debug('event removed.');
          resolve(context.message);
        }
      }
      this.emitter.on('message.private', callback);
      logger.debug('message event registered, now: ' + now);
    });
  }
}

export { Bot }