import { useState, useEffect } from 'react';
import { fetchTopGames, fetchLeaderboard, fetchManagedGames, fetchUsers } from '../api/adminApi';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import RecentActions from '../components/RecentActions';

// ========== TOP GAMES LIST (compact) ==========
const TopGamesList = ({ games }: { games: any[] }) => {
  if (!games || games.length === 0) {
    return (
      <div className="db-card-compact">
        <div className="db-section-header">
          <h3 className="db-section-title">🔥 Most Played Games</h3>
          <span className="db-section-sub">Top 3</span>
        </div>
        <p className="db-empty-text">No data</p>
      </div>
    );
  }

  const top3 = games.slice(0, 3);

  return (
    <div className="db-card-compact">
      <div className="db-section-header">
        <h3 className="db-section-title">🔥 Most Played Games</h3>
        <span className="db-section-sub">Top 3 by plays</span>
      </div>
      <div className="db-topgames-list">
        {top3.map((game, idx) => (
          <div key={game.id || idx} className="db-topgames-row-compact">
            <div className="db-topgames-rank-compact">#{idx + 1}</div>
            <img
              src={game.thumbnail || ''}
              alt={game.title || 'Game'}
              className="db-topgames-thumb-compact"
              onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/32?text=No+Image')}
            />
            <div className="db-topgames-info">
              <span className="db-topgames-title-compact">{game.title || 'Untitled'}</span>
              <span className="db-topgames-cat-compact">{game.category || 'General'}</span>
            </div>
            <div className="db-topgames-plays-compact">
              {(game.playCount || 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========== TOP PLAYERS (compact) ==========
const medals = ['🥇', '🥈', '🥉'];
const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

const TopPlayers = ({ players }: { players: any[] }) => (
  <div className="db-card-compact">
    <div className="db-section-header">
      <h3 className="db-section-title">🏆 Top Players</h3>
      <span className="db-section-sub">Leaderboard</span>
    </div>
    <div className="db-players-list">
      {(!players || players.length === 0) ? (
        <p className="db-empty-text">No data</p>
      ) : (
        players.slice(0, 3).map((p, i) => (
          <div key={p.id || i} className="db-player-row-compact">
            <span className="db-player-medal-compact" style={{ color: medalColors[i] }}>{medals[i]}</span>
            {p.photoURL ? (
              <img src={p.photoURL} alt={p.name} className="db-player-avatar-img-compact" />
            ) : (
              <div className="db-player-avatar-compact">{(p.name || 'U').charAt(0).toUpperCase()}</div>
            )}
            <div className="db-player-info">
              <span className="db-player-name-compact">{p.name || 'Unknown'}</span>
              <span className="db-player-games-compact">{p.gamesPlayed || 0} games</span>
            </div>
            <div className="db-player-score-compact">
              {((p.totalPoints !== undefined ? p.totalPoints : p.totalScore) || 0).toLocaleString()}
              <span className="db-player-score-label">pts</span>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

// ========== CATEGORY CHARTS (two pie charts side by side) ==========
const COLORS = ['#C8FF00', '#A855F7', '#FF7D3F', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#EC4899'];

// Left chart: Game count per category
const CategoryPieChartReal = ({ games }: { games: any[] }) => {
  if (!games || games.length === 0) {
    return <div className="db-pie-placeholder"><p>No data</p></div>;
  }
  const categoryCount: Record<string, number> = {};
  games.forEach((game) => {
    const cat = game.category || 'Uncategorized';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const data = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));
  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height={100}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={25}
            outerRadius={40}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A45', borderRadius: '8px', fontSize: '11px' }}
            itemStyle={{ color: '#fff' }}
            formatter={(value, name) => [`${value} game(s)`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Right chart: Plays per category
const PlaysPerCategoryPie = ({ games }: { games: any[] }) => {
  if (!games || games.length === 0) {
    return <div className="db-pie-placeholder"><p>No play data</p></div>;
  }
  const categoryPlays: Record<string, number> = {};
  games.forEach((game) => {
    const cat = game.category || 'Uncategorized';
    categoryPlays[cat] = (categoryPlays[cat] || 0) + (game.playCount || 0);
  });
  const data = Object.entries(categoryPlays)
    .filter(([, plays]) => plays > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  if (data.length === 0) {
    return <div className="db-pie-placeholder"><p>No plays yet</p></div>;
  }
  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height={100}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={25}
            outerRadius={40}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A45', borderRadius: '8px', fontSize: '11px' }}
            itemStyle={{ color: '#fff' }}
            formatter={(value, name) => [`${value} plays`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Then in CategoryCharts, remove the "games total" subtitle to save space:
const CategoryCharts = ({ games }: { games: any[] }) => (
  <div className="db-card-compact">
    <div className="db-section-header">
      <h3 className="db-section-title">📁 Game Categories</h3>
    </div>
    <div className="db-two-charts">
      <div className="db-chart-item">
        <div className="db-chart-label">Games per Category</div>
        <CategoryPieChartReal games={games} />
      </div>
      <div className="db-chart-item">
        <div className="db-chart-label">Plays per Category</div>
        <PlaysPerCategoryPie games={games} />
      </div>
    </div>
  </div>
);

// ========== MAIN DASHBOARD ==========
const Dashboard = () => {
  const [topGames, setTopGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [top, lb, managedGames, allUsers] = await Promise.all([
        fetchTopGames(),
        fetchLeaderboard(),
        fetchManagedGames(),
        fetchUsers(),
      ]);
      setTopGames(Array.isArray(top) ? top : []);
      setPlayers(Array.isArray(lb) ? lb : []);
      setGames(Array.isArray(managedGames) ? managedGames : []);
      setUsers(Array.isArray(allUsers) ? allUsers : []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const totalGames = games.length;
  const totalUsers = users.length;
  const totalPlays = games.reduce((sum, g) => sum + (g.playCount || 0), 0);

  if (loading) return <div className="db-loading"><div className="db-spinner" /><p>Loading Dashboard…</p></div>;
  if (error) return <div className="db-loading" style={{ color: '#ff4b4b' }}><p>{error}</p><button className="btn-primary" onClick={loadData}>Retry</button></div>;

  return (
    <div className="db-root">
      {/* Stats row – compact */}
      <div className="stats-mini-row">
        <div className="stat-mini-card">
          <span className="stat-mini-icon">🎮</span>
          <span className="stat-mini-value">{totalGames}</span>
          <span className="stat-mini-label">Games</span>
        </div>
        <div className="stat-mini-card">
          <span className="stat-mini-icon">👥</span>
          <span className="stat-mini-value">{totalUsers}</span>
          <span className="stat-mini-label">Users</span>
        </div>
        <div className="stat-mini-card">
          <span className="stat-mini-icon">▶</span>
          <span className="stat-mini-value">{totalPlays.toLocaleString()}</span>
          <span className="stat-mini-label">Plays</span>
        </div>
      </div>

      {/* Perfectly aligned grid layout */}
      <div className="db-row-two-cols">
        <TopGamesList games={topGames} />
        <TopPlayers players={players} />
        <CategoryCharts games={games} />
        <RecentActions />
      </div>
    </div>
  );
};

export default Dashboard;