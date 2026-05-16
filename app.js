const JAPAN_TIME_ZONE = "Asia/Tokyo";
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
};

let visibleYear;
let visibleMonth;

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function dateKeyFromDate(date) {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
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
  const firstOfMonth = new Date(visibleYear, visibleMonth, 1);
  const totalDays = new Date(visibleYear, visibleMonth + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay();
  const todayParts = getJapanDateParts();
  const todayKey = dateKey(todayParts.year, todayParts.month - 1, todayParts.day);
  const monthDate = new Date(visibleYear, visibleMonth, 1);

  elements.heading.textContent = monthFormatter.format(monthDate);
  elements.subtitle.textContent = `Japanese national holidays for ${visibleYear}`;
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
    const cell = document.createElement("article");
    cell.className = "calendar-day";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `${monthFormatter.format(monthDate)} ${day}${holiday ? `, ${holiday.name}` : ""}`);

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

    elements.grid.append(cell);
  }

  renderHolidayList(holidays);
}

function renderHolidayList(holidays) {
  const monthlyHolidays = Array.from(holidays.entries())
    .filter(([key]) => key.startsWith(`${visibleYear}-${pad(visibleMonth + 1)}`))
    .sort(([left], [right]) => left.localeCompare(right));

  elements.holidayList.innerHTML = "";

  if (monthlyHolidays.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    empty.textContent = "No Japanese national holidays this month.";
    elements.holidayList.append(empty);
    return;
  }

  for (const [key, holiday] of monthlyHolidays) {
    const item = document.createElement("li");
    const date = new Date(`${key}T00:00:00`);
    const time = document.createElement("time");
    const name = document.createElement("span");

    time.dateTime = key;
    time.textContent = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    name.textContent = holiday.name;

    item.append(time, name);
    elements.holidayList.append(item);
  }
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
  setInterval(updateClock, 1000);
}

init();
