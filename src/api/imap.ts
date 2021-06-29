// @ts-ignore
import Imap from 'node-imap'
// @ts-ignore
import { simpleParser } from 'mailparser'
import { serialize } from '../utils'

type Email = {
  id: number
  to: {
    value: {address: string, name: string}[]
    text: string
  }
  from: {
    value: {address: string, name: string}[]
    text: string
  }
  subject: string
  text: string
}

const runImapFn = serialize(async (imapCfg: any, fn: (...args: any[]) => Promise<any>) => {
  const imap = new Imap(imapCfg)
  return new Promise((res, rej) => {
    imap.once('ready', () => {
      fn(imap).then(res)
    })
    imap.once('error', function(err: any) {
      rej(err)
    })
    imap.connect()
  })
})

export const getRecentMails = async (cfg: any, num: number): Promise<Email[]> => {
  const mails: Email[] = []
  await runImapFn(cfg, async (imap: any) => {
    return new Promise((res, rej) => {
      imap.openBox('INBOX', true, (err: any, box: any) => {
        if (err) {
          rej(err)
          return
        }
        const first = box.messages.total - num + 1
        let pendingMails = 0
        let streamEnd = false
        const f = imap.seq.fetch(`${first < 1 ? 1 : first}:*`, { bodies: [''] })
        f.on('message', (msg: any, seqno: number) => {
          pendingMails ++
          msg.on('body', (stream: any) => {
            simpleParser(stream, (err: any, mail: any) => {
              if (err) {
                rej(err)
                return
              }
              mails.push({
                id: seqno,
                from: mail.from,
                to: mail.to,
                subject: mail.subject,
                text: mail.text?.substr(0, 100) || ''
              })
              pendingMails --
              if (streamEnd && pendingMails === 0) {
                res(mails)
              }
            })
          })
        })
        f.once('error', (err?: Error) => { err && rej(err) })
        f.once('end', () => {
          imap.end()
          streamEnd = true
        })
      })
    })
  })
  return mails
}

export const markAsRead = async (cfg: any, no: number): Promise<void> => {
  await runImapFn(cfg, async (imap: any) => {
    return new Promise((res, rej) => {
      imap.openBox('INBOX', false, (err: any, box: any) => {
        if (err) {
          rej(err)
          return
        }
        const f = imap.seq.fetch(`${no}:${no}`, { bodies: [''], markSeen: true });
        f.on('message', (msg: any) => {
          msg.once('attributes', (attrs: any) => {
            imap.addFlags(attrs.uid, ['\\Seen'], (err?: Error) => {
                if (err) {
                  rej()
                } else {
                  res(null)
                }
            })
          })
        })
        f.once('error', function(err: any) {
          rej(err)
        })
        f.once('end', function() {
          imap.end()
        })
      })
    })
  })
}
