import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Flame, Medal, RefreshCw, Trophy, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../api/client.js';

const rankLabels = ['1', '2', '3'];

function StatTile({ icon: Icon, label, value, tone }) {
  return (
    <div className={`streak-stat-tile ${tone}`}>
      <Icon size={32} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LeaderboardRow({ player, rank, isCurrentUser }) {
  const displayRank = rankLabels[rank - 1] || rank;
  const name = player.name || (isCurrentUser ? 'You' : 'NutriScore User');

  return (
    <div className={`leaderboard-row${isCurrentUser ? ' is-current-user' : ''}`}>
      <div className="leaderboard-rank">{displayRank}</div>
      <div className="leaderboard-avatar">
        {rank <= 3 ? <Medal size={18} /> : <User size={18} />}
      </div>
      <div className="leaderboard-user">
        <strong>{name}</strong>
        <span>{player.streak || 0} day streak</span>
      </div>
      <div className="leaderboard-points">{player.points || 0}</div>
    </div>
  );
}

export default function StreakLeaderboard({ authToken, userAuth, onBack }) {
  const [streakInfo, setStreakInfo] = useState({
    streak: userAuth?.streak || 0,
    points: userAuth?.points || 0,
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    const controller = new AbortController();

    const loadStreakPage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [streakResponse, leaderboardResponse] = await Promise.all([
          fetch(`${API}/auth/streak`, { credentials: 'include', signal: controller.signal }),
          fetch(`${API}/auth/leaderboard`, { credentials: 'include', signal: controller.signal }),
        ]);

        if (!streakResponse.ok || !leaderboardResponse.ok) {
          throw new Error('Failed to load streak data');
        }

        const streakData = await streakResponse.json();
        const leaderboardData = await leaderboardResponse.json();

        setStreakInfo({
          streak: streakData.streak || 0,
          points: streakData.points || 0,
        });
        setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
      } catch (loadError) {
        if (loadError.name === 'AbortError') return;
        console.error(loadError);
        setError(t('could_not_load'));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadStreakPage();

    return () => controller.abort();
  }, []);

  const rankedPlayers = useMemo(() => {
    if (leaderboard.length) return leaderboard.slice(0, 10);
    return [
      {
        name: userAuth?.name || 'You',
        points: streakInfo.points,
        streak: streakInfo.streak,
      },
    ];
  }, [leaderboard, streakInfo.points, streakInfo.streak, userAuth?.name]);

  const currentUserName = userAuth?.name;

  return (
    <div className="streak-page">
      <section className="streak-phone-shell" aria-label="Streak and leaderboard">
        <header className="streak-page-header">
          <button type="button" onClick={onBack} aria-label="Back to home">
            <ArrowLeft size={20} />
          </button>
          <div>
            <span>NutriScore</span>
            <strong>{t('streak_board')}</strong>
          </div>
        </header>

        <section className="streak-stats-grid" aria-label="Your streak and points">
          <StatTile icon={Flame} label={t('streak')} value={`${streakInfo.streak}d`} tone="fire" />
          <StatTile icon={Trophy} label={t('points')} value={`${streakInfo.points}+`} tone="points" />
        </section>

        <section className="leaderboard-card" aria-label="Leaderboard">
          <div className="leaderboard-card-title">
            <div>
              <span>{t('leaderboard')}</span>
              <strong>{t('top_users')}</strong>
            </div>
            {isLoading && <RefreshCw className="leaderboard-loading-icon" size={18} />}
          </div>

          {error ? (
            <div className="leaderboard-empty">{error}</div>
          ) : (
            <div className="leaderboard-list">
              {rankedPlayers.map((player, index) => (
                <LeaderboardRow
                  key={`${player.name || 'user'}-${index}`}
                  player={player}
                  rank={index + 1}
                  isCurrentUser={Boolean(currentUserName && player.name === currentUserName)}
                />
              ))}
              {!isLoading && rankedPlayers.length < 5 && (
                Array.from({ length: 5 - rankedPlayers.length }, (_, index) => (
                  <div className="leaderboard-row is-placeholder" key={`placeholder-${index}`}>
                    <div className="leaderboard-rank">{rankedPlayers.length + index + 1}</div>
                    <div className="leaderboard-placeholder-line" />
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
