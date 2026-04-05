import fs from 'fs';
import path from 'path';
import { ensureDirForFile } from '../config/dataPaths.js';

/**
 * JSON 저장을 임시 파일에 쓴 뒤 rename 으로 교체해, 쓰기 중단 시 기존 파일이 깨지지 않게 함.
 */
export function writeJsonFileAtomic(filePath, data) {
  ensureDirForFile(filePath);
  const tmp = filePath + '.tmp.' + process.pid + '.' + Date.now();
  const payload = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmp, payload, 'utf8');
  try {
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      fs.renameSync(tmp, filePath);
    } catch (err2) {
      try {
        fs.unlinkSync(tmp);
      } catch {}
      throw err2;
    }
  }
}
