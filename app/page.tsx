"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Log = Record<string, number>;

const FOCUS_SECONDS = 25 * 60;

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getRecentDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      key: dateKey(date),
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.getDate(),
    };
  });
}

export default function Home() {
  const [seconds, setSeconds] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<Log>({});
  const [ready, setReady] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const tickNumber = useRef(0);
  const today = dateKey();
  const days = useMemo(getRecentDays, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("pomo-daily-log");
    if (saved) setLogs(JSON.parse(saved));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem("pomo-daily-log", JSON.stringify(logs));
  }, [logs, ready]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      const context = audioContext.current;
      if (context && context.state === "running") {
        const now = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(tickNumber.current++ % 2 ? 880 : 1040, now);
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
      }
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          setLogs((current) => ({ ...current, [today]: (current[today] || 0) + 1 }));
          return FOCUS_SECONDS;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, today]);

  useEffect(() => () => {
    void audioContext.current?.close();
  }, []);

  const completed = logs[today] || 0;
  const total = days.reduce((sum, day) => sum + (logs[day.key] || 0), 0);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const progress = ((FOCUS_SECONDS - seconds) / FOCUS_SECONDS) * 100;

  function addSession() {
    setLogs((current) => ({ ...current, [today]: (current[today] || 0) + 1 }));
  }

  function resetTimer() {
    setRunning(false);
    setSeconds(FOCUS_SECONDS);
  }

  async function toggleTimer() {
    if (!running) {
      if (!audioContext.current) audioContext.current = new AudioContext();
      if (audioContext.current.state === "suspended") await audioContext.current.resume();
    }
    setRunning((value) => !value);
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Pomo home"><span className="brand-dot" />pomo</a>
        <div className="today-label"><span />{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        <button className="avatar" aria-label="User profile">KV</button>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">Focus session</div>
        <h1>Make this one count.</h1>
        <p>One focused block. A steady clock. Your progress is saved automatically.</p>

        <div className="timer-card">
          <div className="timer-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}>
            <div className="timer-inner">
              <span className="timer-label">FOCUS</span>
              <strong>{minutes}:{secs}</strong>
              <span className="timer-sub">25 minute session</span>
            </div>
          </div>
          <div className="timer-actions">
            <button className="primary" onClick={toggleTimer}>{running ? "Pause" : seconds === FOCUS_SECONDS ? "Start focus" : "Resume"}</button>
            <button className="icon-button" onClick={resetTimer} aria-label="Reset timer">↻</button>
          </div>
        </div>
      </section>

      <section className="dashboard">
        <div className="section-heading">
          <div><span className="eyebrow">Daily rhythm</span><h2>Your week at a glance</h2></div>
          <div className="week-total"><strong>{total}</strong><span>sessions this week</span></div>
        </div>

        <div className="stats-grid">
          <article className="today-card">
            <div className="card-top"><span>Today</span><span className="live-dot">LIVE</span></div>
            <div className="big-number">{completed}</div>
            <p>pomodoros completed</p>
            <div className="goal-row"><span>Daily goal</span><span>{completed} / 8</span></div>
            <div className="goal-track"><i style={{ width: `${Math.min(100, completed / 8 * 100)}%` }} /></div>
            <button className="secondary" onClick={addSession}>+ Log completed session</button>
          </article>

          <article className="week-card">
            <div className="card-top"><span>Last 7 days</span><span>{total * 25} focused min</span></div>
            <div className="bars" aria-label="Pomodoros completed over the last seven days">
              {days.map((day) => {
                const count = logs[day.key] || 0;
                return <div className="bar-column" key={day.key}>
                  <div className="count">{count || ""}</div>
                  <div className="bar-track"><i style={{ height: `${Math.max(8, Math.min(100, count / 8 * 100))}%` }} className={day.key === today ? "active" : ""} /></div>
                  <strong>{day.day}</strong><span>{day.date}</span>
                </div>;
              })}
            </div>
          </article>
        </div>
      </section>
      <footer><span>pomo</span><p>Small sessions. Meaningful progress.</p></footer>
    </main>
  );
}
