import OSS from 'ali-oss'
import { ossConfig } from '../config'

let client = new OSS(ossConfig);

async function getFileContent (file_name: string): Promise<string> {
  try {
    let result = await client.get(file_name);
    return result.content.toString();
  } catch (e) {
    console.log(e);
    return '';
  }
}

async function putFile (file_name: string, content: string) {
  try {
    let result = await client.put(file_name, Buffer.from(content));
    return result;
  } catch (e) {
    console.log(e);
    return;
  }
}

export {
  getFileContent,
  putFile
}