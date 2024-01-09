import {Weather, WeatherService, WeatherType} from "./weather";
import axios from "axios";

const weatherTypeMap: Record<number, WeatherType> = {
    1000: WeatherType.SUNNY,
    1003: WeatherType.PARTLY_CLOUDY,
    1006: WeatherType.CLOUDY,
    1009: WeatherType.OVERCAST,
    1030: WeatherType.MIST,
    1063: WeatherType.PATCHY_RAIN_POSSIBLE,
    1066: WeatherType.PATCHY_SNOW_POSSIBLE,
    1069: WeatherType.PATCHY_SLEET_POSSIBLE,
    1072: WeatherType.PATCHY_FREEZING_DRIZZLE_POSSIBLE,
    1087: WeatherType.THUNDERY_OUTBREAKS_POSSIBLE,
    1114: WeatherType.BLOWING_SNOW,
    1117: WeatherType.BLIZZARD,
    1135: WeatherType.FOG,
    1147: WeatherType.FREEZING_FOG,
    1150: WeatherType.PATCHY_LIGHT_DRIZZLE,
    1153: WeatherType.LIGHT_DRIZZLE,
    1168: WeatherType.FREEZING_DRIZZLE,
    1171: WeatherType.HEAVY_FREEZING_DRIZZLE,
    1180: WeatherType.PATCHY_LIGHT_RAIN,
    1183: WeatherType.LIGHT_RAIN,
    1186: WeatherType.MODERATE_RAIN_AT_TIMES,
    1189: WeatherType.MODERATE_RAIN,
    1192: WeatherType.HEAVY_RAIN_AT_TIMES,
    1195: WeatherType.HEAVY_RAIN,
    1198: WeatherType.LIGHT_FREEZING_RAIN,
    1201: WeatherType.MODERATE_OR_HEAVY_FREEZING_RAIN,
    1204: WeatherType.LIGHT_SLEET,
    1207: WeatherType.MODERATE_OR_HEAVY_SLEET,
    1210: WeatherType.PATCHY_LIGHT_SNOW,
    1213: WeatherType.LIGHT_SNOW,
    1216: WeatherType.PATCHY_MODERATE_SNOW,
    1219: WeatherType.MODERATE_SNOW,
    1222: WeatherType.PATCHY_HEAVY_SNOW,
    1225: WeatherType.HEAVY_SNOW,
    1237: WeatherType.ICE_PELLETS,
    1240: WeatherType.LIGHT_RAIN_SHOWER,
    1243: WeatherType.MODERATE_OR_HEAVY_RAIN_SHOWER,
    1246: WeatherType.TORRENTIAL_RAIN_SHOWER,
    1249: WeatherType.LIGHT_SLEET_SHOWERS,
    1252: WeatherType.MODERATE_OR_HEAVY_SLEET_SHOWERS,
    1255: WeatherType.LIGHT_SNOW_SHOWERS,
    1258: WeatherType.MODERATE_OR_HEAVY_SNOW_SHOWERS,
    1261: WeatherType.LIGHT_SHOWERS_OF_ICE_PELLETS,
    1264: WeatherType.MODERATE_OR_HEAVY_SHOWERS_OF_ICE_PELLETS,
    1273: WeatherType.PATCHY_LIGHT_RAIN_WITH_THUNDER,
    1276: WeatherType.MODERATE_OR_HEAVY_RAIN_WITH_THUNDER,
    1279: WeatherType.PATCHY_LIGHT_SNOW_WITH_THUNDER,
    1282: WeatherType.MODERATE_OR_HEAVY_SNOW_WITH_THUNDER
};

export class WeatherApiComWeatherService implements WeatherService {
    constructor(private readonly key: string) {
    }

    async getCurrentWeather(location: string): Promise<Weather> {
        const data = await axios.get(
            `http://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(this.key)
            }&q=${encodeURIComponent(location)}aqi=no`);

        const rawWeatherData = data.data;

        return {
            temperature: rawWeatherData.current.temp_c,
            type: weatherTypeMap[rawWeatherData.current.condition.code] ?? WeatherType.UNKNOWN
        };
    }
}