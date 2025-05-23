import path from 'node:path'
import { loadSync, Type } from 'protobufjs'

interface MessageWithoutEffect {
  brightness: number;
  data: Uint8Array;
}

export enum EffectType {
  FLASH = 2,
  RAW_BUFFER = 3,
  SCROLL = 1,
  STATIC = 0
}

export enum Position {
  CENTER = 1,
  LEFT = 0,
  RIGHT = 2
}

export enum Direction {
  LEFT_TO_RIGHT = 0,
  RIGHT_TO_LEFT = 1
}

interface PartialMessageStaticEffect {
  effectType: EffectType.STATIC;
  staticEffect: {
    position: Position;
  };
}

interface PartialMessageScrollEffect {
  effectType: EffectType.SCROLL;
  scrollEffect: {
    direction: Direction;
    speed: number;
  };
}

interface PartialMessageFlashEffect {
  effectType: EffectType.FLASH;
  flashEffect: {
    delay: number;
    position: Position;
  };
}

interface PartialMessageRawBufferEffect {
  effectType: EffectType.RAW_BUFFER;
}

export type Message = MessageWithoutEffect & (PartialMessageFlashEffect | PartialMessageRawBufferEffect |
    PartialMessageScrollEffect | PartialMessageStaticEffect)

export interface SetMessagePacket {
  duration: number;
  message: Message;
  priority: number;
}

export interface SetBackgroundMessagePacket {
  message: Message;
}

const cp1251CharMap: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  11: 11,
  12: 12,
  13: 13,
  14: 14,
  15: 15,
  16: 16,
  17: 17,
  18: 18,
  19: 19,
  20: 20,
  21: 21,
  22: 22,
  23: 23,
  24: 24,
  25: 25,
  26: 26,
  27: 27,
  28: 28,
  29: 29,
  30: 30,
  31: 31,
  32: 32,
  33: 33,
  34: 34,
  35: 35,
  36: 36,
  37: 37,
  38: 38,
  39: 39,
  40: 40,
  41: 41,
  42: 42,
  43: 43,
  44: 44,
  45: 45,
  46: 46,
  47: 47,
  48: 48,
  49: 49,
  50: 50,
  51: 51,
  52: 52,
  53: 53,
  54: 54,
  55: 55,
  56: 56,
  57: 57,
  58: 58,
  59: 59,
  60: 60,
  61: 61,
  62: 62,
  63: 63,
  64: 64,
  65: 65,
  66: 66,
  67: 67,
  68: 68,
  69: 69,
  70: 70,
  71: 71,
  72: 72,
  73: 73,
  74: 74,
  75: 75,
  76: 76,
  77: 77,
  78: 78,
  79: 79,
  80: 80,
  81: 81,
  82: 82,
  83: 83,
  84: 84,
  85: 85,
  86: 86,
  87: 87,
  88: 88,
  89: 89,
  90: 90,
  91: 91,
  92: 92,
  93: 93,
  94: 94,
  95: 95,
  96: 96,
  97: 97,
  98: 98,
  99: 99,
  100: 100,
  101: 101,
  102: 102,
  103: 103,
  104: 104,
  105: 105,
  106: 106,
  107: 107,
  108: 108,
  109: 109,
  110: 110,
  111: 111,
  112: 112,
  113: 113,
  114:
    114,
  115: 115,
  116: 116,
  117: 117,
  118: 118,
  119: 119,
  120: 120,
  121: 121,
  122: 122,
  123: 123,
  124: 124,
  125: 125,
  126: 126,
  127: 127,
  160: 160,
  164: 164,
  166: 166,
  167: 167,
  169: 169,
  171: 171,
  172: 172,
  173: 173,
  174: 174,
  176: 176,
  177: 177,
  181:
    181,
  182: 182,
  183: 183,
  187: 187,
  1025: 168,
  1026: 128,
  1027: 129,
  1028: 170,
  1029: 189,
  1030: 178,
  1031: 175,
  1032: 163,
  1033: 138,
  1034: 140,
  1035: 142,
  1036: 141,
  1038: 161,
  1039: 143,
  1040: 192,
  1041: 193,
  1042: 194,
  1043: 195,
  1044: 196,
  1045: 197,
  1046: 198,
  1047: 199,
  1048: 200,
  1049: 201,
  1050: 202,
  1051: 203,
  1052: 204,
  1053: 205,
  1054: 206,
  1055: 207,
  1056: 208,
  1057: 209,
  1058: 210,
  1059: 211,
  1060: 212,
  1061: 213,
  1062: 214,
  1063: 215,
  1064: 216,
  1065: 217,
  1066: 218,
  1067: 219,
  1068: 220,
  1069: 221,
  1070: 222,
  1071: 223,
  1072: 224,
  1073: 225,
  1074: 226,
  1075: 227,
  1076: 228,
  1077: 229,
  1078: 230,
  1079: 231,
  1080: 232,
  1081: 233,
  1082: 234,
  1083: 235,
  1084: 236,
  1085: 237,
  1086: 238,
  1087: 239,
  1088: 240,
  1089: 241,
  1090: 242,
  1091: 243,
  1092: 244,
  1093: 245,
  1094: 246,
  1095: 247,
  1096: 248,
  1097: 249,
  1098: 250,
  1099: 251,
  1100: 252,
  1101: 253,
  1102: 254,
  1103: 255,
  1105: 184,
  1106: 144,
  1107: 131,
  1108: 186,
  1109: 190,
  1110: 179,
  1111: 191,
  1112:
    188,
  1113: 154,
  1114: 156,
  1115: 158,
  1116: 157,
  1118: 162,
  1119: 159,
  1168: 165,
  1169: 180,
  8211: 150,
  8212: 151,
  8216: 145,
  8217: 146,
  8218: 130,
  8220: 147,
  8221: 148,
  8222: 132,
  8224: 134,
  8225: 135,
  8226: 149,
  8230: 133,
  8240: 137,
  8249: 139,
  8250: 155,
  8364: 136,
  8470: 185,
  8482: 153
}

const QUESTION_MARK_CODE = cp1251CharMap['?'.codePointAt(0) as number] as number

export function convertToCp1251 (s: string): Uint8Array {
  const result: number[] = []

  for (const c of s) {
    const code = c.codePointAt(0)
    if (code !== undefined && cp1251CharMap[code] !== undefined) {
      result.push(cp1251CharMap[code])
      continue
    }

    result.push(QUESTION_MARK_CODE)
  }

  return new Uint8Array(result)
}

export class Protocol {
  private setBackgroundMessagePacketType: Type
  private setMessagePacketType: Type

  constructor () {
    const proto = loadSync(path.join(import.meta.dirname, 'messages.proto'))
    this.setMessagePacketType = proto.lookupType('SetMessagePacket')
    this.setBackgroundMessagePacketType = proto.lookupType('SetBackgroundMessagePacket')
  }

  serializeSetBackgroundMessage (packet: SetBackgroundMessagePacket): Uint8Array {
    return this.setBackgroundMessagePacketType.encode(this.setBackgroundMessagePacketType.fromObject(packet)).finish()
  }

  serializeSetMessage (packet: SetMessagePacket): Uint8Array {
    return this.setMessagePacketType.encode(this.setMessagePacketType.fromObject(packet)).finish()
  }
}
