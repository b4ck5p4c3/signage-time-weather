import mqtt from 'mqtt'
import fs from 'node:fs'
import path from 'node:path'
import { Logger } from 'tslog'

import type { Weather } from './weather/weather'

import font from './font.json'
import { Emulator, getStringWidth } from './signage/emulator'
import { convertToCp1251, EffectType, Protocol } from './signage/protocol'
import { WeatherApiComWeatherService } from './weather/weatherapicom'

const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883'

const WC_OCCUPIED_TOPIC = 'bus/states/wc/occupied'

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
client.subscribe(WC_OCCUPIED_TOPIC)
client.on('message', (topic, payload) => {
  switch (topic) {
    case WC_OCCUPIED_TOPIC: {
      isWCOccupied = payload.toString() === 'true'
      log.debug('WC occupation update: %s', isWCOccupied ? 'occupied' : 'vacant')
      break
    }
  }
})

function getTimeString (time: number): string {
  return `${new Date(time).getHours().toString().padStart(2, '0')}:${
        new Date(time).getMinutes().toString().padStart(2, '0')}:${
        new Date(time).getSeconds().toString().padStart(2, '0')}`
}

if (process.env.WEATHER_API_COM_KEY === undefined) {
  throw new Error('WEATHER_API_COM_KEY is not set')
}

const weatherService = new WeatherApiComWeatherService(process.env.WEATHER_API_COM_KEY)
const protocol = new Protocol()

let weather: undefined | Weather

function drawAll (): Emulator {
  const emulator = new Emulator(font, 12)
  const left = convertToCp1251(getTimeString(Date.now() + timezoneOffset))

  const right = isWCOccupied
    ? convertToCp1251('WC')
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
