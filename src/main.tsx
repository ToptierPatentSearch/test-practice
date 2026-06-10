import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
};

function dateKey(date: Date): string {
  return [date.getFullYear(), date.getMonth(), date.getDate()].join('-');
}

function dateTimeValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildCalendarDays(activeDate: Date): CalendarDay[] {
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  const todayKey = dateKey(startOfDay(new Date()));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date,
      isCurrentMonth: date.getMonth() === month,
      isToday: dateKey(date) === todayKey,
    };
  });
}

function App() {
  const [activeDate, setActiveDate] = React.useState(() => startOfDay(new Date()));
  const calendarDays = React.useMemo(() => buildCalendarDays(activeDate), [activeDate]);
  const selectedMonthName = monthFormatter.format(activeDate);
  const todayLabel = fullDateFormatter.format(new Date());

  const changeMonth = (offset: number) => {
    setActiveDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const jumpToToday = () => {
    setActiveDate(startOfDay(new Date()));
  };

  return (
    <main className="calendar-shell" aria-labelledby="page-title">
      <section className="hero-card">
        <p className="eyebrow">Plan your month</p>
        <div className="hero-content">
          <div>
            <h1 id="page-title">Monthly Calendar</h1>
            <p className="intro">
              A clean, responsive calendar view for tracking dates across the current month,
              neighboring weeks, and today at a glance.
            </p>
          </div>
          <div className="today-card" aria-label={`Today is ${todayLabel}`}>
            <span>Today</span>
            <strong>{todayLabel}</strong>
          </div>
        </div>
      </section>

      <section className="calendar-card" aria-labelledby="calendar-title">
        <header className="calendar-header">
          <button type="button" className="nav-button" onClick={() => changeMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <div className="month-heading">
            <h2 id="calendar-title">{selectedMonthName}</h2>
            <button type="button" className="today-button" onClick={jumpToToday}>
              Jump to today
            </button>
          </div>
          <button type="button" className="nav-button" onClick={() => changeMonth(1)} aria-label="Next month">
            ›
          </button>
        </header>

        <div className="weekday-row" aria-hidden="true">
          {weekdayLabels.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="calendar-grid" role="grid" aria-label={`${selectedMonthName} calendar`}>
          {calendarDays.map(({ date, isCurrentMonth, isToday }) => {
            const label = fullDateFormatter.format(date);
            return (
              <time
                key={dateKey(date)}
                className={`calendar-day${isCurrentMonth ? '' : ' muted'}${isToday ? ' today' : ''}`}
                dateTime={dateTimeValue(date)}
                role="gridcell"
                aria-label={isToday ? `${label}, today` : label}
                aria-current={isToday ? 'date' : undefined}
              >
                <span>{date.getDate()}</span>
              </time>
            );
          })}
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
