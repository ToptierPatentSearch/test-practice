const JAPAN_TIME_ZONE = "Asia/Tokyo";
const TEMPERATURE_UNIT = "celsius";
const TEMPERATURE_UNIT_LABEL = "°C";
const SUN_ZENITH_DEGREES = 90.833;
const RADIAN_PER_DEGREE = Math.PI / 180;
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: JAPAN_TIME_ZONE });
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: JAPAN_TIME_ZONE,
});
const japaneseDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  weekday: "short",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: JAPAN_TIME_ZONE,
});

const elements = {
  time: document.querySelector("#jst-time"),
  date: document.querySelector("#jst-date"),
  heading: document.querySelector("#calendar-heading"),
  subtitle: document.querySelector("#calendar-subtitle"),
  grid: document.querySelector("#calendar-grid"),
  holidayList: document.querySelector("#holiday-list"),
  prev: document.querySelector("#prev-month"),
  next: document.querySelector("#next-month"),
  today: document.querySelector("#today-button"),
  yearInput: document.querySelector("#year-input"),
  sunStatus: document.querySelector("#sun-status"),
  weatherStatus: document.querySelector("#weather-status"),
  weatherList: document.querySelector("#weather-list"),
};

let visibleYear;
let visibleMonth;
let localSunCoordinates = null;

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function dateKeyFromDate(date) {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function normalizeHours(value) {
  return ((value % 24) + 24) % 24;
}

function dayOfYear(year, monthIndex, day) {
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, monthIndex, day);
  return Math.floor((current - start) / 86400000);
}

function calculateSunEvent(year, monthIndex, day, latitude, longitude, isSunrise) {
  const dateNumber = dayOfYear(year, monthIndex, day);
  const longitudeHour = longitude / 15;
  const approximateTime = dateNumber + ((isSunrise ? 6 : 18) - longitudeHour) / 24;
  const meanAnomaly = 0.9856 * approximateTime - 3.289;
  const trueLongitude = normalizeDegrees(
    meanAnomaly +
      1.916 * Math.sin(meanAnomaly * RADIAN_PER_DEGREE) +
      0.02 * Math.sin(2 * meanAnomaly * RADIAN_PER_DEGREE) +
      282.634
  );

  let rightAscension = normalizeDegrees(Math.atan(0.91764 * Math.tan(trueLongitude * RADIAN_PER_DEGREE)) / RADIAN_PER_DEGREE);
  rightAscension += Math.floor(trueLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;

  const sinDeclination = 0.39782 * Math.sin(trueLongitude * RADIAN_PER_DEGREE);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosLocalHour =
    (Math.cos(SUN_ZENITH_DEGREES * RADIAN_PER_DEGREE) - sinDeclination * Math.sin(latitude * RADIAN_PER_DEGREE)) /
    (cosDeclination * Math.cos(latitude * RADIAN_PER_DEGREE));

  if (cosLocalHour > 1 || cosLocalHour < -1) {
    return null;
  }

  const localHour = (isSunrise ? 360 - Math.acos(cosLocalHour) / RADIAN_PER_DEGREE : Math.acos(cosLocalHour) / RADIAN_PER_DEGREE) / 15;
  const localMeanTime = localHour + rightAscension - 0.06571 * approximateTime - 6.622;
  const universalTime = normalizeHours(localMeanTime - longitudeHour);

  return new Date(Date.UTC(year, monthIndex, day) + universalTime * 60 * 60 * 1000);
}

function formatSunTime(date) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function sunTimesForDate(year, monthIndex, day) {
  if (!localSunCoordinates) {
    return null;
  }

  const { latitude, longitude } = localSunCoordinates;
  return {
    sunrise: calculateSunEvent(year, monthIndex, day, latitude, longitude, true),
    sunset: calculateSunEvent(year, monthIndex, day, latitude, longitude, false),
  };
}

function getJapanDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAPAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, Number(value)]));
}

function nthMonday(year, monthIndex, occurrence) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const firstMonday = 1 + ((8 - firstDay) % 7);
  return firstMonday + (occurrence - 1) * 7;
}

function vernalEquinoxDay(year) {
  if (year < 1980 || year > 2099) {
    return 20;
  }

  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnalEquinoxDay(year) {
  if (year < 1980 || year > 2099) {
    return 23;
  }

  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function addHoliday(holidays, year, monthIndex, day, name, type = "national") {
  holidays.set(dateKey(year, monthIndex, day), { name, type });
}

function japaneseSolarTerms(year) {
  return new Map([
    [dateKey(year, 0, 5), "小寒 · Shōkan (Lesser Cold)"],
    [dateKey(year, 0, 20), "大寒 · Daikan (Greater Cold)"],
    [dateKey(year, 1, 4), "立春 · Risshun (Beginning of Spring)"],
    [dateKey(year, 1, 19), "雨水 · Usui (Rain Water)"],
    [dateKey(year, 2, 5), "啓蟄 · Keichitsu (Awakening of Insects)"],
    [dateKey(year, 2, 20), "春分 · Shunbun (Spring Equinox)"],
    [dateKey(year, 3, 4), "清明 · Seimei (Clear and Bright)"],
    [dateKey(year, 3, 20), "穀雨 · Kokuu (Grain Rain)"],
    [dateKey(year, 4, 5), "立夏 · Rikka (Beginning of Summer)"],
    [dateKey(year, 4, 21), "小満 · Shōman (Lesser Fullness)"],
    [dateKey(year, 5, 6), "芒種 · Bōshu (Grain in Ear)"],
    [dateKey(year, 5, 21), "夏至 · Geshi (Summer Solstice)"],
    [dateKey(year, 6, 7), "小暑 · Shōsho (Lesser Heat)"],
    [dateKey(year, 6, 22), "大暑 · Taisho (Greater Heat)"],
    [dateKey(year, 7, 7), "立秋 · Risshū (Beginning of Autumn)"],
    [dateKey(year, 7, 23), "処暑 · Shosho (Limit of Heat)"],
    [dateKey(year, 8, 7), "白露 · Hakuro (White Dew)"],
    [dateKey(year, 8, 23), "秋分 · Shūbun (Autumn Equinox)"],
    [dateKey(year, 9, 8), "寒露 · Kanro (Cold Dew)"],
    [dateKey(year, 9, 23), "霜降 · Sōkō (Frost Descent)"],
    [dateKey(year, 10, 7), "立冬 · Rittō (Beginning of Winter)"],
    [dateKey(year, 10, 22), "小雪 · Shōsetsu (Lesser Snow)"],
    [dateKey(year, 11, 7), "大雪 · Taisetsu (Greater Snow)"],
    [dateKey(year, 11, 21), "冬至 · Tōji (Winter Solstice)"],
  ]);
}

function baseJapaneseHolidays(year) {
  const holidays = new Map();

  addHoliday(holidays, year, 0, 1, "元日 · New Year's Day");
  addHoliday(holidays, year, 0, nthMonday(year, 0, 2), "成人の日 · Coming of Age Day");
  addHoliday(holidays, year, 1, 11, "建国記念の日 · National Foundation Day");
  addHoliday(holidays, year, 1, 23, "天皇誕生日 · Emperor's Birthday");
  addHoliday(holidays, year, 2, vernalEquinoxDay(year), "春分の日 · Vernal Equinox Day");
  addHoliday(holidays, year, 3, 29, "昭和の日 · Shōwa Day");
  addHoliday(holidays, year, 4, 3, "憲法記念日 · Constitution Memorial Day");
  addHoliday(holidays, year, 4, 4, "みどりの日 · Greenery Day");
  addHoliday(holidays, year, 4, 5, "こどもの日 · Children's Day");
  addHoliday(holidays, year, 6, nthMonday(year, 6, 3), "海の日 · Marine Day");
  addHoliday(holidays, year, 7, 11, "山の日 · Mountain Day");
  addHoliday(holidays, year, 8, nthMonday(year, 8, 3), "敬老の日 · Respect for the Aged Day");
  addHoliday(holidays, year, 8, autumnalEquinoxDay(year), "秋分の日 · Autumnal Equinox Day");
  addHoliday(holidays, year, 9, nthMonday(year, 9, 2), "スポーツの日 · Sports Day");
  addHoliday(holidays, year, 10, 3, "文化の日 · Culture Day");
  addHoliday(holidays, year, 10, 23, "勤労感謝の日 · Labor Thanksgiving Day");

  return holidays;
}

function japaneseHolidays(year) {
  const holidays = baseJapaneseHolidays(year);

  for (const [key, holiday] of Array.from(holidays.entries())) {
    const date = new Date(`${key}T00:00:00`);
    if (date.getDay() !== 0) {
      continue;
    }

    const substitute = new Date(date);
    do {
      substitute.setDate(substitute.getDate() + 1);
    } while (holidays.has(dateKeyFromDate(substitute)));

    holidays.set(dateKeyFromDate(substitute), {
      name: `${holiday.name} 振替休日 · Substitute Holiday`,
      type: "substitute",
    });
  }

  const start = new Date(year, 0, 2);
  const end = new Date(year, 11, 30);
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const key = dateKeyFromDate(day);
    if (holidays.has(key)) {
      continue;
    }

    const previous = new Date(day);
    previous.setDate(day.getDate() - 1);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);

    if (holidays.has(dateKeyFromDate(previous)) && holidays.has(dateKeyFromDate(next))) {
      holidays.set(key, { name: "国民の休日 · Citizens' Holiday", type: "citizens" });
    }
  }

  return holidays;
}

function updateClock() {
  const now = new Date();
  elements.time.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: JAPAN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  elements.date.textContent = `${dateFormatter.format(now)} · ${japaneseDateFormatter.format(now)}`;
}

function renderCalendar() {
  const holidays = japaneseHolidays(visibleYear);
  const solarTerms = japaneseSolarTerms(visibleYear);
  const firstOfMonth = new Date(visibleYear, visibleMonth, 1);
  const totalDays = new Date(visibleYear, visibleMonth + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay();
  const todayParts = getJapanDateParts();
  const todayKey = dateKey(todayParts.year, todayParts.month - 1, todayParts.day);
  const monthDate = new Date(visibleYear, visibleMonth, 1);

  elements.heading.textContent = monthFormatter.format(monthDate);
  elements.subtitle.textContent = `Japanese national holidays for ${visibleYear}${localSunCoordinates ? " · local sunrise and sunset times" : ""}`;
  elements.yearInput.value = visibleYear;
  elements.grid.innerHTML = "";

  for (let index = 0; index < startOffset; index += 1) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day is-empty";
    elements.grid.append(emptyCell);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const key = dateKey(visibleYear, visibleMonth, day);
    const date = new Date(visibleYear, visibleMonth, day);
    const holiday = holidays.get(key);
    const solarTerm = solarTerms.get(key);
    const sunTimes = sunTimesForDate(visibleYear, visibleMonth, day);
    const sunriseLabel = sunTimes ? formatSunTime(sunTimes.sunrise) : null;
    const sunsetLabel = sunTimes ? formatSunTime(sunTimes.sunset) : null;
    const cell = document.createElement("article");
    cell.className = "calendar-day";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute(
      "aria-label",
      `${monthFormatter.format(monthDate)} ${day}${holiday ? `, ${holiday.name}` : ""}${solarTerm ? `${holiday ? "," : ""} ${solarTerm}` : ""}${
        sunTimes ? `, sunrise ${sunriseLabel}, sunset ${sunsetLabel}` : ""
      }`
    );

    if (date.getDay() === 0 || date.getDay() === 6) {
      cell.classList.add("is-weekend");
    }
    if (holiday) {
      cell.classList.add("is-holiday");
    }
    if (key === todayKey) {
      cell.classList.add("is-today");
    }

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = day;
    cell.append(number);

    if (holiday) {
      const label = document.createElement("span");
      label.className = "holiday-name";
      label.textContent = holiday.name;
      cell.append(label);
    }
    if (solarTerm) {
      const label = document.createElement("span");
      label.className = "holiday-name";
      label.classList.add("solar-term");
      label.textContent = solarTerm;
      cell.append(label);
    }

    if (sunTimes) {
      const sun = document.createElement("div");
      const sunrise = document.createElement("span");
      const sunset = document.createElement("span");

      sun.className = "sun-times";
      sunrise.title = "Local sunrise";
      sunset.title = "Local sunset";
      sunrise.textContent = `☀︎ ${sunriseLabel}`;
      sunset.textContent = `☾ ${sunsetLabel}`;
      sun.append(sunrise, sunset);
      cell.append(sun);
    }

    elements.grid.append(cell);
  }

  renderHolidayList(holidays, solarTerms);
}

function renderHolidayList(holidays, solarTerms) {
  const monthlyEntries = [
    ...Array.from(holidays.entries()).map(([key, holiday]) => ({ key, label: holiday.name, kind: "holiday" })),
    ...Array.from(solarTerms.entries()).map(([key, label]) => ({ key, label, kind: "solar-term" })),
  ]
    .filter(({ key }) => key.startsWith(`${visibleYear}-${pad(visibleMonth + 1)}`))
    .sort((left, right) => left.key.localeCompare(right.key));

  elements.holidayList.innerHTML = "";

  if (monthlyEntries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    empty.textContent = "No Japanese holidays or solar terms this month.";
    elements.holidayList.append(empty);
    return;
  }

  for (const { key, label, kind } of monthlyEntries) {
    const item = document.createElement("li");
    item.classList.add(kind);
    const date = new Date(`${key}T00:00:00`);
    const time = document.createElement("time");
    const name = document.createElement("span");

    time.dateTime = key;
    time.textContent = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    name.textContent = label;

    item.append(time, name);
    elements.holidayList.append(item);
  }
}

function weatherCodeLabel(code) {
  const map = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Heavy rain showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm hail",
    99: "Severe thunderstorm hail",
  };
  return map[code] ?? "Unknown";
}

async function fetchWeatherForecast(lat, lon) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: "weathercode,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "7",
    temperature_unit: TEMPERATURE_UNIT,
  }).toString();

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`);
  }

  return response.json();
}

function renderWeather(forecast) {
  const { time, weathercode, temperature_2m_max: max, temperature_2m_min: min } = forecast.daily;
  elements.weatherList.innerHTML = "";

  time.forEach((isoDate, index) => {
    const item = document.createElement("li");
    const date = new Date(`${isoDate}T00:00:00`);
    const day = document.createElement("time");
    const summary = document.createElement("span");
    const temps = document.createElement("strong");

    day.dateTime = isoDate;
    day.textContent = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    summary.textContent = weatherCodeLabel(weathercode[index]);
    temps.textContent = `${Math.round(max[index])}${TEMPERATURE_UNIT_LABEL} / ${Math.round(min[index])}${TEMPERATURE_UNIT_LABEL}`;
    item.append(day, summary, temps);
    elements.weatherList.append(item);
  });
}

async function initWeather(coords) {
  try {
    elements.weatherStatus.textContent = "Loading 7-day local forecast…";
    const data = await fetchWeatherForecast(coords.latitude, coords.longitude);
    elements.weatherStatus.textContent = `Forecast for ${data.timezone}. Max/Min temperatures in ${TEMPERATURE_UNIT_LABEL}.`;
    renderWeather(data);
  } catch (error) {
    elements.weatherStatus.textContent = "Could not load weather forecast right now.";
  }
}

function initLocalData() {
  if (!navigator.geolocation) {
    elements.sunStatus.textContent = "Geolocation is not available, so local sunrise and sunset times cannot be shown.";
    elements.weatherStatus.textContent = "Geolocation is not available in this browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      localSunCoordinates = { latitude: coords.latitude, longitude: coords.longitude };
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "your local time zone";
      elements.sunStatus.textContent = `Showing sunrise and sunset for your detected location in ${timeZone}.`;
      renderCalendar();
      initWeather(coords);
    },
    () => {
      elements.sunStatus.textContent = "Allow location access to show local sunrise and sunset times on the calendar.";
      elements.weatherStatus.textContent = "Allow location access to see your local 7-day forecast.";
    },
    { enableHighAccuracy: false, timeout: 10000 }
  );
}

function moveMonth(delta) {
  const nextMonth = new Date(visibleYear, visibleMonth + delta, 1);
  visibleYear = nextMonth.getFullYear();
  visibleMonth = nextMonth.getMonth();
  renderCalendar();
}

function jumpToJapanToday() {
  const today = getJapanDateParts();
  visibleYear = today.year;
  visibleMonth = today.month - 1;
  renderCalendar();
}

function setupControls() {
  elements.prev.addEventListener("click", () => moveMonth(-1));
  elements.next.addEventListener("click", () => moveMonth(1));
  elements.today.addEventListener("click", jumpToJapanToday);
  elements.yearInput.addEventListener("change", (event) => {
    const year = Number(event.target.value);
    if (Number.isInteger(year) && year >= 2022 && year <= 2099) {
      visibleYear = year;
      renderCalendar();
      return;
    }

    event.target.value = visibleYear;
  });
}

function init() {
  jumpToJapanToday();
  setupControls();
  updateClock();
  initLocalData();
  setInterval(updateClock, 1000);
}

init();
