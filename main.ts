import mqtt from "mqtt";
import fs from "fs";
import dotenv from "dotenv";
import {Protocol, convertToCp1251, EffectType} from "./signage/protocol";
import {Emulator, Font, getStringWidth} from "./signage/emulator";
import {WeatherApiComWeatherService} from "./weather/weatherapicom";
import path from "path";
import {Weather} from "./weather/weather";

dotenv.config();

const CA_CERTIFICATE_PATH = process.env.CA_CERTIFICATE_PATH ?? 'ca-cert.pem';
const MQTT_URL = process.env.MQTT_URL ?? 'mqtts://b4ck:b4ck@mqtt.internal.0x08.in';

const timezoneOffset = parseInt(process.env.DISPLAY_TZ_OFFSET ?? "0") * 60 * 60 * 1000;

const client = mqtt.connect(MQTT_URL, {
    ca: [fs.readFileSync(CA_CERTIFICATE_PATH)]
});

client.on('connect', () => {
    console.info('Connected to mqtt');
});
client.on('error', e => {
    console.error(`Error: ${e}`);
});

function getTimeString(time: number): string {
    return `${new Date(time).getHours().toString().padStart(2, '0')}:${
        new Date(time).getMinutes().toString().padStart(2, '0')}:${
        new Date(time).getSeconds().toString().padStart(2, '0')}`;
}

const weatherService = new WeatherApiComWeatherService(process.env.WEATHER_API_COM_KEY ?? "");
const font: Font = JSON.parse(fs.readFileSync(
    path.join(__dirname, "font.json")).toString());
const protocol = new Protocol();

let weather: Weather | undefined;

function drawAll(): Emulator {
    const emulator = new Emulator(font, 12);
    const timeString = convertToCp1251(getTimeString(Date.now() + timezoneOffset));
    const weatherString = convertToCp1251(weather ? Math.floor(weather.temperature) + "\u00b0C" : "N/A");
    emulator.clear(false);
    emulator.drawText(timeString, 0, 0, false);
    emulator.drawText(weatherString, emulator.getWidth() - getStringWidth(weatherString, font), 0, false);
    return emulator;
}

function updateWeather() {
    weatherService.getCurrentWeather(process.env.WEATHER_LOCATION ?? "")
        .then(newWeather => {
            weather = newWeather;
            console.info('Weather updated');
        })
        .catch(e => {
            weather = undefined;
            console.error(e);
        });
}

setInterval(updateWeather, 120000);
updateWeather();

setInterval(() => {
    const buffer = drawAll();
    client.publish('bus/devices/openspace-signage/background', Buffer.from(protocol.serializeSetBackgroundMessage({
        message: {
            data: buffer.getBuffer(),
            brightness: 4,
            effectType: EffectType.RAW_BUFFER
        }
    })));
}, 500);