import mqtt from 'mqtt'
import fs from 'node:fs'
import path from 'node:path'
import { hkdfSync, randomUUID } from 'node:crypto';
import { Logger } from 'tslog'

import type { Weather } from './weather/weather'

import font from './font.json'
import { Emulator, getStringWidth } from './signage/emulator'
import { convertToCp1251, EffectType, Protocol } from './signage/protocol'
import { WeatherApiComWeatherService } from './weather/weatherapicom'

const BOOT_ID = randomUUID();
const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883'

const WC_OCCUPIED_TOPIC = 'bus/states/wc/occupied'
// These values should be in-sync with b4ck5p4c3/iot-devices:devices/indoor-meteo/indoor-meteo.yaml
const CO2_TOPIC = 'bus/devices/indoor-meteo/sensor/mhz19_co2/state'
const CO2_YELLOW_GE = 800;
const CO2_RED_GE = 1200;

const log = new Logger()

// @todo: use time zone name instead.
const timezoneOffset = Number.parseInt(process.env.DISPLAY_TZ_OFFSET ?? '0') * 60 * 60 * 1000

const client = mqtt.connect(MQTT_URL, {
  ca: [
    fs.readFileSync(path.resolve(import.meta.dirname, '..', process.env.CA_CERTIFICATE_PATH ?? 'ca-cert.pem'))
  ]
})

client.on('connect', () => log.info('Connected to MQTT broker'))
client.on('error', error => { throw error })

/**
 * Toilet AI Assistant
 */
let isWCOccupied: boolean = false
let co2ppm: number = 600
let co2LastUpdate: number = 0
client.subscribe(WC_OCCUPIED_TOPIC)
client.subscribe(CO2_TOPIC)
client.on('message', (topic, payload) => {
  switch (topic) {
    case CO2_TOPIC: {
      co2ppm = parseInt(payload.toString())
      co2LastUpdate = Date.now()
      log.debug('CO2 updated: %s ppm', co2ppm)
    }
    case WC_OCCUPIED_TOPIC: {
      isWCOccupied = payload.toString() === 'true'
      log.debug('WC occupation update: %s', isWCOccupied ? 'occupied' : 'vacant')
      break
    }
  }
})

// Computer clocks are like a cat who never remembers where it has been, only
// steps ahead in more or less random directions. The cat has a general idea
// in which direction leads to food, just not a precise idea of how to get there.
// Mathematically, this represents random walk frequency noise.
// -- https://www.ntp.org/ntpfaq/ntp-s-related/#911-what-is-mills-speak
//
// So, getTimeString() produces a bit of random walk on display.
let lastBits: undefined | number;
let lastDateInfo: undefined | string;

function getTimeString (time: number): string {
  const NBSP = '\u00A0';  // \u00A0, NBSP in CP1251, font width for NBSP and ':' should match
  const HIDT = '\u2022';  // Unicode bullet: `•` 0x2022 maps to 0x95 (149)
  const LODT = '\u00b7';  // Middle dot: `·` 0x00B7 maps to 0xb7 (183)
  const COLN = ':';       // font['widths'][ord(':')] == 1
  const date = new Date(time);
  const salt = 'X-Clacks-Overhead: Professor David L. Mills';
  const info = date.toString() + ((time % 1000) >= 500 ? '^' : '_');
  if (info !== lastDateInfo) {
    lastDateInfo = info;
    const buff = hkdfSync('sha256', BOOT_ID, salt, info, 1);
    const view = new Uint8Array(buff);
    for (var i = 0; i < buff.byteLength; i++) {
      const biLo = view[i] & 15;
      if (biLo != lastBits) {
        lastBits = biLo;
        break;
      }
      const biHi = (view[i] >> 4) & 15;
      if (biHi != lastBits) {
        lastBits = biHi;
        break;
      }
    }
  }
  const dict = [NBSP, LODT, HIDT, COLN];
  const c1st = dict[lastBits >> 2];
  const c2nd = dict[lastBits & 3];
  return `${date.getHours().toString().padStart(2, '0')}${c1st}${
        date.getMinutes().toString().padStart(2, '0')}${c2nd}${
        date.getSeconds().toString().padStart(2, '0')}`
}

if (process.env.WEATHER_API_COM_KEY === undefined) {
  throw new Error('WEATHER_API_COM_KEY is not set')
}

const weatherService = new WeatherApiComWeatherService(process.env.WEATHER_API_COM_KEY)
const protocol = new Protocol()

let weather: undefined | Weather

function drawAll (): Emulator {
  const emulator = new Emulator(font, 12)
  const now = Date.now()
  const left = convertToCp1251(getTimeString(now + timezoneOffset))

  const co2good = now - co2LastUpdate < 15_000
  let co2label = undefined
  if (co2good && CO2_YELLOW_GE <= co2ppm < CO2_RED_GE)
    co2label = (now / (4 * redrawInterval)) & 1 ? 'co2' : '';
  else if (co2good && CO2_RED_GE <= co2ppm)
    co2label = (now / redrawInterval) & 1 ? 'CO2' : '';
  const right =
    isWCOccupied ? convertToCp1251('WC')
    ? co2label !== undefined : convertToCp1251(co2label)
    : convertToCp1251(weather ? Math.round(weather.temperature) + '\u00B0C' : '')

  emulator.clear(false)
  emulator.drawText(left, 0, 0, false)
  emulator.drawText(right, emulator.getWidth() - getStringWidth(right, font), 0, false)
  return emulator
}

function updateWeather () {
  weatherService.getCurrentWeather(process.env.WEATHER_LOCATION ?? '')
    .then(newWeather => {
      weather = newWeather
      log.debug('Weather updated: %s°', weather.temperature)
    })
    .catch(error => {
      weather = undefined
      console.error(error)
    })
}

setInterval(updateWeather, 120_000)
updateWeather()

function redrawAll () {
  const buffer = drawAll()
  const bytes = Buffer.from(protocol.serializeSetBackgroundMessage({
    message: {
      brightness: 4,
      data: buffer.getBuffer(),
      effectType: EffectType.RAW_BUFFER
    }
  }))
  client.publish('bus/devices/openspace-signage/background', bytes)
}

const redrawInterval = 500;
setInterval(() => {
  const msPassed = Date.now() % redrawInterval;
  const delay = msPassed ? redrawInterval - msPassed : 0;
  setTimeout(redrawAll, delay);
}, redrawInterval);
