// @ts-ignore
import Imap from 'node-imap'
// @ts-ignore
import { simpleParser } from 'mailparser'

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

export const getRecentMails = async (cfg: any, num: number): Promise<Email[]> => {
  const imap = new Imap(cfg);
  return new Promise((res, rej) => {
    const mails: Email[] = []
    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err: any, box: any) => {
        if (err) {
          rej(err);
          return;
        }
        console.log(box.messages)
        const first = box.messages.total - num + 1
        const f = imap.seq.fetch(`${first < 1 ? 1 : first}:*`, { bodies: [''] });
        f.on('message', (msg: any, seqno: number) => {
          msg.on('body', (stream: any) => {
            simpleParser(stream, (err: any, mail: any) => {
              if (err) {
                rej(err);
                return;
              }
              mail.id = seqno
              mails.push(mail)
            });
          });
        });
        f.once('error', function(err: any) {
          rej(err)
        });
        f.once('end', function() {
          console.log('Done fetching all messages!');
          imap.end();
          res(mails);
        });
      })
    });
    imap.once('error', function(err: any) {
      rej(err);
    });
     
    imap.connect();
  })
}

export const markAsRead = async (cfg: any, no: number): Promise<void> => {
  const imap = new Imap(cfg);
  return new Promise((res, rej) => {
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err: any, box: any) => {
        if (err) {
          rej(err);
          return;
        }
        const f = imap.seq.fetch(`${no}:${no}`, { bodies: [''], markSeen: true });
        f.on('message', (msg: any) => {
          msg.on('body', (stream: any) => {
            stream.once('end', () => {
              msg.once('attributes', (attrs: any) => {
                imap.addFlags(attrs.uid, ['\\Seen'], (err?: Error) => {
                    if (err) {
                      rej();
                    }
                });
              })
            })
          });
        });
        f.once('error', function(err: any) {
          rej(err)
        });
        f.once('end', function() {
          imap.end();
        });
      })
    });
    imap.once('error', function(err: any) {
      rej(err);
    });
     
    imap.once('end', function() {
      res();
    });
    imap.connect();
  })
}
