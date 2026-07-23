import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  Minus,
  Trophy,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Activity,
  Filter,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot
} from 'recharts';
import { API } from '../api/client.js';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const color = data.score >= 8 ? '#10B981' : data.score >= 5 ? '#F59E0B' : '#EF4444';

    return (
      <div className="trends-tooltip">
        <p className="trends-tooltip-date">{label}</p>
        <div className="trends-tooltip-score" style={{ color }}>
          <strong>{data.score.toFixed(1)}</strong>
          <span>Health Score</span>
        </div>
        <div className="trends-tooltip-meta">
          <span>{data.scans.length} Scans</span>
          <span>{data.goodCount} Good / {data.badCount} Bad</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomDot = (props) => {
  const { cx, cy, payload, value } = props;
  const prevValue = payload.prevScore;

  if (prevValue === undefined) return <Dot {...props} />;

  const isUp = value > prevValue;
  const isDown = value < prevValue;

  return (
    <g>
      <Dot {...props} />
      {isUp && (
        <path
          d="M-4 4 L0 0 L4 4"
          transform={`translate(${cx}, ${cy - 12})`}
          fill="none"
          stroke="#10B981"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
      {isDown && (
        <path
          d="M-4 -4 L0 0 L4 -4"
          transform={`translate(${cx}, ${cy + 12})`}
          fill="none"
          stroke="#EF4444"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
    </g>
  );
};

export default function Trends({ authToken, onNavigate }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('weekly'); // 'weekly', 'monthly', 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    const controller = new AbortController();

    const fetchHistory = async () => {
      try {
        const res = await fetch(
          `${API}/scans`,
          { credentials: 'include', signal: controller.signal }
        );
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch history:', err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchHistory();
    return () => controller.abort();
  }, []);

  const processedData = useMemo(() => {
    if (!history.length) return [];

    const now = new Date();
    let startDate = new Date();

    if (timeRange === 'weekly') startDate.setDate(now.getDate() - 7);
    else if (timeRange === 'monthly') startDate.setDate(now.getDate() - 30);
    else if (timeRange === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
    } else {
      startDate.setDate(now.getDate() - 7); // Default
    }

    const endDate = (timeRange === 'custom' && customEnd) ? new Date(customEnd) : now;

    // Group scans by date string (YYYY-MM-DD)
    const dailyMap = {};

    // Fill with scan data
    history.forEach(scan => {
      const scanDate = new Date(scan.created_at || scan.date);
      if (Number.isNaN(scanDate.getTime()) || scanDate < startDate || scanDate > endDate) return;

      const key = scanDate.toISOString().split('T')[0];
      const score = Number(scan.score);
      if (!Number.isFinite(score) || score <= 0) return;

      if (!dailyMap[key]) {
        dailyMap[key] = {
          date: key,
          displayDate: scanDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          scans: [],
          totalScore: 0,
          goodCount: 0,
          badCount: 0
        };
      }

      dailyMap[key].scans.push(scan);
      dailyMap[key].totalScore += Math.max(1, Math.min(score, 10));
      if (score >= 8) dailyMap[key].goodCount++;
      if (score < 4) dailyMap[key].badCount++;
    });

    const sorted = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((day, idx) => {
      const averageScore = day.scans.length ? day.totalScore / day.scans.length : 0;
      return {
        ...day,
        score: Math.round(averageScore * 10) / 10,
        prevScore: idx > 0 ? Math.round((sorted[idx - 1].totalScore / sorted[idx - 1].scans.length) * 10) / 10 : undefined
      };
    });
  }, [history, timeRange, customStart, customEnd]);

  const stats = useMemo(() => {
    if (!processedData.length) return null;

    let best = processedData[0];
    let worst = processedData[0];
    let currentStreak = 0;
    let maxStreak = 0;

    processedData.forEach(day => {
      if (day.score > best.score) best = day;
      if (day.score < worst.score) worst = day;

      if (day.score >= 8) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    // Trend calculation (last 3 points)
    const last3 = processedData.slice(-3);
    let trend = 'Stable';
    if (last3.length >= 2) {
      const delta = last3[last3.length - 1].score - last3[0].score;
      if (delta > 0.5) trend = 'Improving';
      else if (delta < -0.5) trend = 'Declining';
    }

    return { best, worst, trend, maxStreak };
  }, [processedData]);

  const latest = processedData.length ? processedData[processedData.length - 1] : null;
  const latestColor = latest
    ? (latest.score >= 8 ? '#5BAD4E' : latest.score >= 5 ? '#F59E0B' : '#EF4444')
    : 'var(--ns-outline)';

  if (loading) return <div className="trends-loading"><Activity className="animate-spin" /></div>;

  return (
    <div className="trends-page">
      <header className="trends-header">
        <button onClick={() => onNavigate('dashboard')} className="trends-back-btn">
          <ArrowLeft size={20} />
        </button>
        <h1>{t('health_progress')}</h1>
        <div className="trends-header-actions">
          <Filter size={18} />
        </div>
      </header>

      <main className="trends-content">
        {/* Stat Cards */}
        <div className="trends-stats-grid">
          <div className="stat-card-premium">
            <div className="stat-card-icon best"><CheckCircle2 size={18} /></div>
            <div className="stat-card-info">
              <span>{t('best_day')}</span>
              <strong>{stats?.best.displayDate}</strong>
              <small>{stats?.best.score.toFixed(1)} / 10</small>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-card-icon worst"><XCircle size={18} /></div>
            <div className="stat-card-info">
              <span>{t('worst_day')}</span>
              <strong>{stats?.worst.displayDate}</strong>
              <small>{stats?.worst.score.toFixed(1)} / 10</small>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-card-icon trend"><TrendingUp size={18} /></div>
            <div className="stat-card-info">
              <span>{t('overall_trend')}</span>
              <strong>{stats?.trend === 'Improving' ? t('improving') : stats?.trend === 'Declining' ? t('declining') : t('stable')}</strong>
              <small>{t('last_n_days', { count: processedData.length })}</small>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-card-icon streak"><Trophy size={18} /></div>
            <div className="stat-card-info">
              <span>{t('best_streak')}</span>
              <strong>{stats?.maxStreak} {t('days_label')}</strong>
              <small>{t('good_choices')}</small>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="trends-filter-bar">
          <div className="range-tabs">
            <button
              className={timeRange === 'weekly' ? 'active' : ''}
              onClick={() => setTimeRange('weekly')}
            >{t('weekly')}</button>
            <button
              className={timeRange === 'monthly' ? 'active' : ''}
              onClick={() => setTimeRange('monthly')}
            >{t('monthly')}</button>
            <button
              className={timeRange === 'custom' ? 'active' : ''}
              onClick={() => setTimeRange('custom')}
            >{t('custom')}</button>
          </div>
        </div>

        {timeRange === 'custom' && (
          <div className="custom-range-inputs">
            <div className="input-group">
              <label>{t('from')}</label>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div className="input-group">
              <label>{t('to')}</label>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        {/* Graph Section */}
        <div className="trends-graph-container ns-card">
          <div className="graph-header">
            <div className="graph-heading">
              <span className="graph-eyebrow">{t('daily_health_score')}</span>
              {latest && (
                <div className="graph-score" style={{ color: latestColor }}>
                  <strong>{latest.score.toFixed(1)}</strong>
                  <span className="graph-score-max">/ 10</span>
                  {stats && (
                    <span className={`graph-trend-chip ${stats.trend.toLowerCase()}`}>
                      {stats.trend === 'Improving' ? <TrendingUp size={13} /> : stats.trend === 'Declining' ? <TrendingUp size={13} style={{ transform: 'rotate(180deg)' }} /> : <Minus size={13} />}
                      {stats.trend === 'Improving' ? t('improving') : stats.trend === 'Declining' ? t('declining') : t('stable')}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="graph-legend">
              <span className="dot good"></span> {t('good')}
              <span className="dot avg"></span> {t('avg')}
              <span className="dot bad"></span> {t('bad')}
            </div>
          </div>

          <div className="graph-wrapper">
            {processedData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={processedData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload.length > 0) {
                      setSelectedDay(data.activePayload[0].payload);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--ns-border-light)" />
                  <XAxis
                    dataKey="displayDate"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--ns-outline)', fontWeight: 600 }}
                    dy={10}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis
                    domain={[1, 10]}
                    ticks={[1, 2, 4, 6, 8, 10]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--ns-outline)', fontWeight: 600 }}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#10B981', strokeWidth: 1.5, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={0.12}
                    fill="#10B981"
                    dot={<CustomDot />}
                    activeDot={{ r: 6, stroke: 'var(--ns-card-bg)', strokeWidth: 3, fill: '#10B981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="trends-empty">
                <AlertCircle size={40} />
                <p>{t('no_scans_period')}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Day Details Bottom Sheet */}
      {selectedDay && (
        <div className="trends-overlay" onClick={() => setSelectedDay(null)}>
          <div className="trends-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" onClick={() => setSelectedDay(null)}></div>
            <header className="sheet-header">
              <div>
                <h2>{new Date(selectedDay.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <span className="sheet-score-pill" style={{
                  background: selectedDay.score >= 8 ? 'rgba(91, 173, 78,0.1)' : selectedDay.score >= 5 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                  color: selectedDay.score >= 8 ? '#5BAD4E' : selectedDay.score >= 5 ? '#F59E0B' : '#EF4444'
                }}>
                  {selectedDay.score.toFixed(1)} / 10
                </span>
              </div>
              <button onClick={() => setSelectedDay(null)} className="sheet-close-btn"><XCircle size={24} /></button>
            </header>

            <div className="sheet-stats">
              <div className="sheet-stat-item">
                <strong>{selectedDay.goodCount}</strong>
                <span>{t('good_choices_label')}</span>
              </div>
              <div className="sheet-divider"></div>
              <div className="sheet-stat-item">
                <strong>{selectedDay.badCount}</strong>
                <span>{t('bad_choices_label')}</span>
              </div>
            </div>

            <div className="sheet-product-list">
              <h3>{t('products_scanned')}</h3>
              {selectedDay.scans.length > 0 ? (
                selectedDay.scans.map((scan, i) => (
                  <div key={i} className="sheet-product-item">
                    <div className="sheet-product-icon">
                      {Number(scan.score) >= 8 ? <CheckCircle2 size={16} className="good" /> : Number(scan.score) < 4 ? <XCircle size={16} className="bad" /> : <Minus size={16} />}
                    </div>
                    <div className="sheet-product-info">
                      <strong>{scan.product_name}</strong>
                      <span>{scan.brand}</span>
                    </div>
                    <em className={Number(scan.score) >= 8 ? 'good' : Number(scan.score) < 4 ? 'bad' : ''}>{scan.score}</em>
                  </div>
                ))
              ) : (
                <div className="sheet-empty">{t('no_products_scanned')}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
