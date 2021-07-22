import FormData from 'form-data'
import fetch from 'node-fetch'
import fileType from "file-type";
import { kiwiConfig } from '../config';

export class KiwiError extends Error {
  code = 1
  constructor(message?: string) {
    super(message)
    /**
     * Get xx instanceof xxError work in typescript
     * @see https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
     * @see https://github.com/reduardo7/ts-base-error/blob/master/src/index.ts
     */
    const trueProto = new.target.prototype
    Object.setPrototypeOf(this, trueProto)
  }
}

const codeErrorMap: Record<number, typeof KiwiError> = {}

export const constructErrorFromCode = (code: number, message: string): KiwiError => {
  return new codeErrorMap[code](message)
}

const register = (error: typeof KiwiError) => {
  codeErrorMap[new error().code] = error
}

@register
export class ItemNotExistsError extends KiwiError {
  code = 2
}

@register
export class NoReadPermissionError extends KiwiError {
  code = 3
}

@register
export class NoWritePermissionError extends KiwiError {
  code = 4
}

@register
export class UserNotExistsError extends KiwiError {
  message = 'User not exists'
  code = 5
}

@register
export class PasswordIncorrectError extends KiwiError {
  message = 'Password incorrect'
  code = 6
}

@register
export class UploadFileError extends KiwiError {
  code = 7
}

@register
export class InvalidURIError extends KiwiError {
  code = 8
}

async function postFile(url: string, data: Object, file: any): Promise<any> {
  const fm = new FormData()
  for (const [key, val] of Object.entries(data)) {
    fm.append(key, val)
  }
  fm.append('fn', file)
  const response = await fetch(url, {
    method: 'POST',
    body: fm,
    headers: {
      cookie: `token=${kiwiConfig.token}`
    }
  })
  if (response.status !== 200) throw new Error('Request failed')
  const packet = await response.json()
  if (packet.code !== 0) {
    console.log(packet)
    throw Error()
  }
  return packet.data
}

export const putBinaryItem = async (uri: string, item: Record<string, any>, file: any): Promise<void> => {
  return postFile('https://kiwi.ssine.cc/put-binary-item', { uri: uri, item: JSON.stringify(item) }, file)
}

export const putImage = async (url: string, name: string): Promise<string> => {
  const res = await fetch(url);
  const buffer = await res.buffer();
  const type = (await fileType.fromBuffer(buffer)) || {
    mime: 'image/png',
    ext: 'png'
  };
  const uri = `inbox/assets/${name}.${type.ext}`;
  await putBinaryItem(
    uri,
    {
      title: (new Date()).toISOString(),
      skinny: true,
      type: type.mime,
      header: {
        createTime: Date.now(),
      },
      renderSync: false,
      renderedHTML: "",
    },
    buffer
  );
  return `/${uri}`
};
