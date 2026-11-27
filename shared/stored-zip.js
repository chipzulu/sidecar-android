const encoder=new TextEncoder();
let crcTable = null;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      crcTable[index] = value >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function write16(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function write32(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concatenate(parts) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function zipFiles(files) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const [name, contents] of files) {
    const nameBytes = encoder.encode(name);
    const data = contents instanceof Uint8Array ? contents : encoder.encode(contents);
    const checksum = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    write32(local, 0, 0x04034b50);
    write16(local, 4, 20);
    write16(local, 6, 0x0800);
    write16(local, 8, 0);
    write16(local, 10, dosTime);
    write16(local, 12, dosDate);
    write32(local, 14, checksum);
    write32(local, 18, data.length);
    write32(local, 22, data.length);
    write16(local, 26, nameBytes.length);
    local.set(nameBytes, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    write32(central, 0, 0x02014b50);
    write16(central, 4, 20);
    write16(central, 6, 20);
    write16(central, 8, 0x0800);
    write16(central, 10, 0);
    write16(central, 12, dosTime);
    write16(central, 14, dosDate);
    write32(central, 16, checksum);
    write32(central, 20, data.length);
    write32(central, 24, data.length);
    write16(central, 28, nameBytes.length);
    write32(central, 42, localOffset);
    central.set(nameBytes, 46);
    centralParts.push(central);
    localOffset += local.length + data.length;
  }

  const centralDirectory = concatenate(centralParts);
  const end = new Uint8Array(22);
  write32(end, 0, 0x06054b50);
  write16(end, 8, files.length);
  write16(end, 10, files.length);
  write32(end, 12, centralDirectory.length);
  write32(end, 16, localOffset);
  return concatenate([...localParts, centralDirectory, end]);
}

