import { crc32, importArchive } from './archive-import.mjs';

// Stored ZIP entries match the build engine's import format.
export function exportArchive(files) {
  const encoder = new TextEncoder();
  const local = [], central = [];
  let offset = 0, directorySize = 0;
  function header(size, signature) {
    const data = new DataView(new ArrayBuffer(size));
    data.setUint32(0, signature, true);
    return data;
  }
  for (const [path, source] of Object.entries(files)) {
    const name = encoder.encode(path), body = encoder.encode(source);
    const crc = crc32(body);
    const entry = header(30, 0x04034b50), index = header(46, 0x02014b50);
    entry.setUint16(4, 20, true);
    index.setUint16(4, 20, true);
    index.setUint16(6, 20, true);
    for (const [record, start] of [[entry, 14], [index, 16]]) {
      record.setUint32(start, crc, true);
      record.setUint32(start + 4, body.length, true);
      record.setUint32(start + 8, body.length, true);
      record.setUint16(start + 12, name.length, true);
    }
    index.setUint32(42, offset, true);
    local.push(entry.buffer, name, body);
    central.push(index.buffer, name);
    offset += 30 + name.length + body.length;
    directorySize += 46 + name.length;
  }
  const end = header(22, 0x06054b50);
  const count = Object.keys(files).length;
  end.setUint16(8, count, true);
  end.setUint16(10, count, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, offset, true);
  return new Blob([...local, ...central, end.buffer], {type:'application/zip'});
}

export async function verifiedArchive(files) {
  const archive = exportArchive(files);
  importArchive(new Uint8Array(await archive.arrayBuffer()));
  return archive;
}
