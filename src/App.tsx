import { useMemo, useState } from "react";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

type CalendarDay = {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
};

function createMonthDays(activeDate: Date): CalendarDay[] {
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const calendarStart = new Date(firstDay);
  calendarStart.setDate(firstDay.getDate() - firstDay.getDay());

  const today = new Date();
  const daysInGrid = 42;

  return Array.from({ length: daysInGrid }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);

    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    return {
      date,
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });
}

function App() {
  const [activeDate, setActiveDate] = useState(() => new Date());
  const calendarDays = useMemo(() => createMonthDays(activeDate), [activeDate]);
  const currentMonthLabel = monthFormatter.format(activeDate);

  const goToPreviousMonth = () => {
    setActiveDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setActiveDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setActiveDate(new Date());
  };

  return (
    <main className="app-shell" aria-labelledby="page-title">
      <section className="hero-card">
        <p className="eyebrow">React + Vite + TypeScript</p>
        <div className="hero-content">
          <div>
            <h1 id="page-title">Monthly Calendar</h1>
            <p className="intro">
              Plan your month with a clean responsive calendar that highlights today, weekends,
              and neighboring days for context.
            </p>
          </div>
          <button className="today-button" type="button" onClick={goToToday}>
            Today
          </button>
        </div>
      </section>

      <section className="calendar-card" aria-labelledby="calendar-title">
        <header className="calendar-header">
          <button type="button" className="nav-button" onClick={goToPreviousMonth} aria-label="Previous month">
            ‹
          </button>
          <div className="month-heading">
            <h2 id="calendar-title">{currentMonthLabel}</h2>
            <p>{fullDateFormatter.format(new Date())}</p>
          </div>
          <button type="button" className="nav-button" onClick={goToNextMonth} aria-label="Next month">
            ›
          </button>
        </header>

        <div className="weekday-grid" aria-hidden="true">
          {weekdayLabels.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="calendar-grid" role="grid" aria-label={`${currentMonthLabel} monthly calendar`}>
          {calendarDays.map((day) => {
            const className = [
              "calendar-day",
              day.isCurrentMonth ? "" : "calendar-day--muted",
              day.isToday ? "calendar-day--today" : "",
              day.isWeekend ? "calendar-day--weekend" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article
                className={className}
                key={day.date.toISOString()}
                role="gridcell"
                aria-label={fullDateFormatter.format(day.date)}
                aria-current={day.isToday ? "date" : undefined}
              >
                <span className="day-number">{day.dayOfMonth}</span>
                {day.isToday ? <span className="day-badge">Today</span> : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default App;
