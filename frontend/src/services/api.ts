export interface WeatherForecast {
  date: string;
  temperatureC: number;
  temperatureF: number;
  summary: string;
}
 
export async function getWeatherForecast(): Promise<WeatherForecast[]> {
  const response = await fetch("/api/weatherforecast");
  const data = await response.json();
  return data;
}
