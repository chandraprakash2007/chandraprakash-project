import { useState, useMemo, useEffect, useRef } from "react";

/* ─── Seed Data ─────────────────────────────────────────────────────────── */
const SEED = [
  { id: 1, description: "Monthly Salary", amount: 5200, type: "income",  category: "Salary",        date: "2025-06-01" },
  { id: 2, description: "Apartment Rent", amount: 1400, type: "expense", category: "Rent/Utilities", date: "2025-06-02" },
  { id: 3, description: "Grocery Run",    amount: 120,  type: "expense", category: "Food",           date: "2025-06-05" },
  { id: 4, description: "Freelance gig",  amount: 800,  type: "income",  category: "Freelance",      date: "2025-06-08" },
  { id: 5, description: "Netflix + Gym",  amount: 55,   type: "expense", category: "Entertainment",  date: "2025-06-09" },
  { id: 6, description: "Bus pass",       amount: 40,   type: "expense", category: "Transport",      date: "2025-06-10" },
  { id: 7, description: "New shoes",      amount: 95,   type: "expense", category: "Shopping",       date: "2025-06-12" },
  { id: 8, description: "ETF dividend",   amount: 230,  type: "income",  category: "Investments",    date: "2025-06-14" },
];

const INCOME_CATS  = ["Salary", "Freelance", "Investments", "Other"];
const EXPENSE_CATS = ["Food", "Rent/Utilities", "Entertainment", "Transport", "Shopping", "Other"];

const CAT_COLORS = {
  Food:            "#F59E0B",
  "Rent/Utilities":"#6366F1",
  Entertainment:   "#EC4899",
  Transport:       "#14B8A6",
  Shopping:        "#F97316",
  Other:           "#94A3B8",
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

const today = () => new Date().toISOString().slice(0, 10);

/* ─── Tiny SVG Icons ────────────────────────────────────────────────────── */
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);
const IconTrend = ({ up }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    {up
      ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
      : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>}
  </svg>
);
const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 01-2-2V4a2 2 0 012-2h14v4"/><path d="M4 6v12a2 2 0 002 2h14v-4"/>
    <circle cx="18" cy="12" r="1" fill="currentColor"/>
  </svg>
);

/* ─── Animated Progress Bar ─────────────────────────────────────────────── */
function ProgressBar({ pct, color }) {
  const barRef = useRef(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    el.style.width = "0%";
    const raf = requestAnimationFrame(() => {
      el.style.transition = "width 0.9s cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.width = `${pct}%`;
    });
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <div className="bar-track">
      <div
        ref={barRef}
        className="bar-fill"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}88` }}
      />
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────── */
export default function ExpenseDashboard() {
  const [transactions, setTransactions] = useState(SEED);
  const [form, setForm]   = useState({ description: "", amount: "", type: "expense", category: "Food", date: today() });
  const [errors, setErrors] = useState({});
  const [flash, setFlash]   = useState(null);
  const nextId = useRef(SEED.length + 1);

  /* ── Derived Totals ── */
  const { totalIncome, totalExpense, net } = useMemo(() => {
    let inc = 0, exp = 0;
    transactions.forEach(t => t.type === "income" ? (inc += t.amount) : (exp += t.amount));
    return { totalIncome: inc, totalExpense: exp, net: inc - exp };
  }, [transactions]);

  /* ── Expense Breakdown ── */
  const catBreakdown = useMemo(() => {
    const map = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] || 1;
    return entries.map(([cat, amt]) => ({ cat, amt, pct: Math.round((amt / max) * 100) }));
  }, [transactions]);

  /* ── Form Handlers ── */
  const cats = form.type === "income" ? INCOME_CATS : EXPENSE_CATS;

  const handleTypeChange = (type) => {
    const defaultCat = type === "income" ? "Salary" : "Food";
    setForm(f => ({ ...f, type, category: defaultCat }));
  };

  const validate = () => {
    const e = {};
    if (!form.description.trim()) e.description = "Description is required.";
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = "Enter a positive number.";
    if (!form.date) e.date = "Date is required.";
    return e;
  };

  const handleAdd = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    const newT = { id: nextId.current++, ...form, amount: parseFloat(form.amount) };
    setTransactions(prev => [newT, ...prev]);
    setForm({ description: "", amount: "", type: "expense", category: "Food", date: today() });
    setFlash("Transaction added!");
    setTimeout(() => setFlash(null), 2500);
  };

  const handleDelete = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const sorted = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)),
  [transactions]);

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* ── Header ── */}
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <IconWallet />
              <span>FinPulse</span>
            </div>
            <p className="header-sub">Daily Expense Analytics</p>
          </div>
        </header>

        <main className="main">

          {/* ── Summary Cards ── */}
          <section className="cards">
            <SummaryCard label="Total Income"   value={fmt(totalIncome)}  accent="#10B981" icon={<IconTrend up />}   />
            <SummaryCard label="Total Expenses" value={fmt(totalExpense)} accent="#EF4444" icon={<IconTrend up={false} />} />
            <SummaryCard
              label="Net Balance"
              value={fmt(net)}
              accent={net >= 0 ? "#6366F1" : "#EF4444"}
              icon={<IconWallet />}
              highlight
            />
          </section>

          {/* ── Body Grid ── */}
          <div className="body-grid">

            {/* ── Add Transaction Form ── */}
            <div className="card form-card">
              <h2 className="card-title">Add Transaction</h2>

              {flash && <div className="flash">{flash}</div>}

              <div className="type-toggle">
                {["expense","income"].map(t => (
                  <button
                    key={t}
                    className={`toggle-btn ${form.type === t ? "active-" + t : ""}`}
                    onClick={() => handleTypeChange(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div className="field">
                <label>Description</label>
                <input
                  className={errors.description ? "err" : ""}
                  placeholder="e.g. Morning coffee"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
                {errors.description && <span className="err-msg">{errors.description}</span>}
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Amount (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={errors.amount ? "err" : ""}
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                  {errors.amount && <span className="err-msg">{errors.amount}</span>}
                </div>
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    className={errors.date ? "err" : ""}
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                  {errors.date && <span className="err-msg">{errors.date}</span>}
                </div>
              </div>

              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {cats.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <button className={`submit-btn ${form.type}`} onClick={handleAdd}>
                <IconPlus /> Add {form.type === "income" ? "Income" : "Expense"}
              </button>
            </div>

            {/* ── Analytics Panel ── */}
            <div className="card analytics-card">
              <h2 className="card-title">Expense Breakdown</h2>
              {catBreakdown.length === 0
                ? <p className="empty">No expense data yet.</p>
                : catBreakdown.map(({ cat, amt, pct }) => (
                  <div key={cat} className="cat-row">
                    <div className="cat-header">
                      <span className="cat-dot" style={{ background: CAT_COLORS[cat] || "#94A3B8" }} />
                      <span className="cat-name">{cat}</span>
                      <span className="cat-amt">{fmt(amt)}</span>
                      <span className="cat-pct">{pct}%</span>
                    </div>
                    <ProgressBar pct={pct} color={CAT_COLORS[cat] || "#94A3B8"} />
                  </div>
                ))
              }
            </div>
          </div>

          {/* ── Transaction History ── */}
          <div className="card history-card">
            <h2 className="card-title">
              Transaction History
              <span className="count-badge">{transactions.length}</span>
            </h2>
            {sorted.length === 0
              ? <p className="empty">No transactions yet. Add one above.</p>
              : (
                <div className="tx-list">
                  {sorted.map(tx => (
                    <div key={tx.id} className="tx-row">
                      <div className={`tx-type-bar ${tx.type}`} />
                      <div className="tx-info">
                        <span className="tx-desc">{tx.description}</span>
                        <span className="tx-meta">{tx.category} · {tx.date}</span>
                      </div>
                      <div className={`tx-amount ${tx.type}`}>
                        {tx.type === "income" ? "+" : "−"}{fmt(tx.amount)}
                      </div>
                      <button className="delete-btn" onClick={() => handleDelete(tx.id)} title="Delete">
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

        </main>
      </div>
    </>
  );
}

/* ─── Summary Card Sub-component ─────────────────────────────────────────── */
function SummaryCard({ label, value, accent, icon, highlight }) {
  return (
    <div className={`card summary-card ${highlight ? "summary-highlight" : ""}`}
         style={{ "--accent": accent }}>
      <div className="sc-icon" style={{ color: accent }}>{icon}</div>
      <div className="sc-body">
        <p className="sc-label">{label}</p>
        <p className="sc-value" style={{ color: accent }}>{value}</p>
      </div>
      <div className="sc-glow" style={{ background: accent }} />
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:         #0B1120;
    --surface:    #111827;
    --surface2:   #1A2236;
    --border:     rgba(255,255,255,0.07);
    --text:       #E2E8F0;
    --muted:      #64748B;
    --green:      #10B981;
    --red:        #EF4444;
    --indigo:     #6366F1;
    --radius:     14px;
    --shadow:     0 4px 24px rgba(0,0,0,0.35);
  }

  body { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; }

  /* ── App Shell ── */
  .app { min-height: 100vh; }

  /* ── Header ── */
  .header {
    background: linear-gradient(135deg, #0F1B30 0%, #111827 100%);
    border-bottom: 1px solid var(--border);
    padding: 20px 32px;
    position: sticky; top: 0; z-index: 10;
    backdrop-filter: blur(12px);
  }
  .header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 16px; }
  .logo { display: flex; align-items: center; gap: 10px; font-size: 1.25rem; font-weight: 800;
          letter-spacing: -0.5px; color: var(--indigo); }
  .logo svg { color: var(--indigo); }
  .header-sub { font-size: 0.75rem; color: var(--muted); font-weight: 400; margin-left: auto; letter-spacing: 0.06em; text-transform: uppercase; }

  /* ── Main ── */
  .main { max-width: 1200px; margin: 0 auto; padding: 32px 24px 64px; display: flex; flex-direction: column; gap: 24px; }

  /* ── Card base ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px;
    box-shadow: var(--shadow);
  }
  .card-title {
    font-size: 0.85rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--muted);
    margin-bottom: 22px; display: flex; align-items: center; gap: 10px;
  }

  /* ── Summary Cards ── */
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }

  .summary-card {
    position: relative; overflow: hidden; padding: 24px 24px 22px;
    display: flex; align-items: center; gap: 16px; transition: transform 0.18s;
  }
  .summary-card:hover { transform: translateY(-2px); }
  .summary-highlight { border-color: rgba(99,102,241,0.25); }

  .sc-icon { flex-shrink: 0; opacity: 0.9; }
  .sc-label { font-size: 0.72rem; font-weight: 500; color: var(--muted); letter-spacing: 0.06em;
              text-transform: uppercase; margin-bottom: 6px; }
  .sc-value { font-size: 1.55rem; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
  .sc-glow {
    position: absolute; right: -30px; bottom: -30px; width: 100px; height: 100px;
    border-radius: 50%; opacity: 0.07; filter: blur(24px);
  }

  /* ── Body Grid ── */
  .body-grid { display: grid; grid-template-columns: 380px 1fr; gap: 24px; }

  /* ── Form Card ── */
  .form-card { display: flex; flex-direction: column; gap: 16px; align-self: start; }

  .flash {
    background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3);
    color: var(--green); padding: 10px 14px; border-radius: 8px;
    font-size: 0.82rem; font-weight: 500; text-align: center;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }

  .type-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: var(--surface2); padding: 5px; border-radius: 10px; }
  .toggle-btn {
    border: none; cursor: pointer; padding: 9px; border-radius: 7px;
    font-family: inherit; font-size: 0.82rem; font-weight: 600;
    background: transparent; color: var(--muted); transition: all 0.18s;
  }
  .toggle-btn:hover { color: var(--text); }
  .toggle-btn.active-expense { background: rgba(239,68,68,0.15); color: var(--red); }
  .toggle-btn.active-income  { background: rgba(16,185,129,0.15); color: var(--green); }

  .field { display: flex; flex-direction: column; gap: 6px; flex: 1; }
  .field label { font-size: 0.73rem; font-weight: 600; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; }
  .field-row { display: flex; gap: 12px; }

  input, select {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); border-radius: 9px; padding: 10px 14px;
    font-family: inherit; font-size: 0.88rem; width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s; outline: none;
  }
  input:focus, select:focus {
    border-color: var(--indigo); box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
  }
  input.err, select.err { border-color: var(--red); }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
  .err-msg { font-size: 0.71rem; color: var(--red); font-weight: 500; }

  select option { background: var(--surface2); }

  .submit-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 13px; border: none; border-radius: 10px; cursor: pointer;
    font-family: inherit; font-size: 0.9rem; font-weight: 700;
    transition: opacity 0.15s, transform 0.15s; margin-top: 4px;
    letter-spacing: 0.02em;
  }
  .submit-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .submit-btn:active { transform: translateY(0); }
  .submit-btn.income  { background: linear-gradient(135deg, #059669, #10B981); color: #fff; }
  .submit-btn.expense { background: linear-gradient(135deg, #DC2626, #EF4444); color: #fff; }

  /* ── Analytics ── */
  .analytics-card { display: flex; flex-direction: column; gap: 0; }
  .cat-row { margin-bottom: 18px; }
  .cat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
  .cat-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .cat-name { font-size: 0.83rem; font-weight: 600; color: var(--text); flex: 1; }
  .cat-amt  { font-size: 0.83rem; font-weight: 700; color: var(--text); }
  .cat-pct  { font-size: 0.72rem; font-weight: 500; color: var(--muted); min-width: 34px; text-align: right; }

  .bar-track {
    height: 7px; background: var(--surface2); border-radius: 99px; overflow: hidden;
  }
  .bar-fill { height: 100%; border-radius: 99px; width: 0; }

  /* ── History ── */
  .history-card { padding: 28px; }
  .count-badge {
    background: var(--surface2); color: var(--muted);
    font-size: 0.7rem; font-weight: 700; padding: 2px 8px;
    border-radius: 99px; letter-spacing: 0.04em; margin-left: 2px;
  }

  .tx-list { display: flex; flex-direction: column; gap: 2px; }

  .tx-row {
    display: flex; align-items: center; gap: 14px;
    padding: 13px 12px; border-radius: 10px;
    transition: background 0.15s;
  }
  .tx-row:hover { background: var(--surface2); }

  .tx-type-bar { width: 3px; height: 36px; border-radius: 99px; flex-shrink: 0; }
  .tx-type-bar.income  { background: var(--green); }
  .tx-type-bar.expense { background: var(--red); }

  .tx-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .tx-desc { font-size: 0.88rem; font-weight: 600; color: var(--text); }
  .tx-meta { font-size: 0.73rem; color: var(--muted); font-weight: 400; }

  .tx-amount { font-size: 0.95rem; font-weight: 800; letter-spacing: -0.3px; }
  .tx-amount.income  { color: var(--green); }
  .tx-amount.expense { color: var(--red); }

  .delete-btn {
    background: none; border: none; cursor: pointer; color: var(--muted);
    padding: 6px; border-radius: 6px; display: flex; align-items: center;
    transition: color 0.15s, background 0.15s;
  }
  .delete-btn:hover { color: var(--red); background: rgba(239,68,68,0.1); }

  .empty { color: var(--muted); font-size: 0.85rem; text-align: center; padding: 32px 0; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .body-grid { grid-template-columns: 1fr; }
    .cards { grid-template-columns: 1fr; gap: 12px; }
    .header { padding: 16px 18px; }
    .main { padding: 20px 14px 48px; gap: 16px; }
    .card { padding: 20px; }
  }
  @media (max-width: 480px) {
    .field-row { flex-direction: column; }
    .sc-value { font-size: 1.3rem; }
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--surface2); border-radius: 3px; }
`;
