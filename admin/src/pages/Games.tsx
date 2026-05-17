import { useState, useEffect } from 'react';
import { fetchExternalGames, saveGame, deleteGame, fetchManagedGames, updateGame } from '../api/adminApi';
import { addAction } from '../utils/actionLogger';

const Games = () => {
  const [externalGames, setExternalGames] = useState<any[]>([]);
  const [managedGames, setManagedGames] = useState<any[]>([]);
  const [view, setView] = useState<'managed' | 'import'>('managed');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // Edit modal state
  const [editingGame, setEditingGame] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editIsNew, setEditIsNew] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadManagedGames();
  }, []);

  const loadManagedGames = async () => {
    setLoading(true);
    try {
      const data = await fetchManagedGames();
      setManagedGames(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading managed games:", error);
    }
    setLoading(false);
  };

  const handleFetchExternal = async () => {
    setLoading(true);
    try {
      const games = await fetchExternalGames();
      setExternalGames(games);
      setView('import');
    } catch (error) {
      alert("Failed to fetch games from GameMonetize");
    }
    setLoading(false);
  };

  const handleSave = async (game: any) => {
    setSaving(game.title);
    try {
      const result = await saveGame({
        ...game,
        isNew: true,
        isFeatured: false
      });
      if (result.success) {
        alert("Game saved to Firestore!");
        addAction('add', game.title);
        loadManagedGames();
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("Failed to save game");
    }
    setSaving(null);
  };

  const handleDelete = async (game: any) => {
    if (!window.confirm(`Are you sure you want to delete "${game.title}"?`)) return;
    try {
      const result = await deleteGame(game.id);
      if (result.success) {
        alert("Game deleted");
        addAction('delete', game.title);
        loadManagedGames();
      }
    } catch (error) {
      alert("Failed to delete game");
    }
  };

  const openEditModal = (game: any) => {
    setEditingGame(game);
    setEditTitle(game.title);
    setEditCategory(game.category || '');
    setEditIsFeatured(game.isFeatured || false);
    setEditIsNew(game.isNew || false);
  };

  const handleUpdateGame = async () => {
    if (!editingGame) return;
    setIsUpdating(true);
    try {
      const result = await updateGame(editingGame.id, {
        title: editTitle,
        category: editCategory,
        isFeatured: editIsFeatured,
        isNew: editIsNew,
      });
      if (result.success) {
        addAction('edit', editTitle);
        loadManagedGames();
        setEditingGame(null);
        alert("Game updated successfully");
      } else {
        alert("Update failed: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error updating game");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="games-page">
      <div className="page-header">
        <h1 className="page-title">{view === 'managed' ? 'Managed Games' : 'Import Games'}</h1>
        <div style={{ display: 'flex', gap: '15px' }}>
          {view === 'import' && (
            <button onClick={() => setView('managed')} className="btn-outline">Back to Managed</button>
          )}
          <button onClick={handleFetchExternal} disabled={loading} className="btn-primary">
            {loading ? 'Loading...' : 'Import from GameMonetize'}
          </button>
        </div>
      </div>

      <div className="data-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(view === 'managed' ? managedGames : externalGames).map((game, index) => (
                <tr key={game.id || index}>
                  <td>
                    <img src={game.thumbnail} alt="" className="thumbnail-sm" />
                  </td>
                  <td style={{ fontWeight: '700' }}>{game.title}</td>
                  <td>
                    <span className="badge badge-lime">{game.category}</span>
                  </td>
                  <td>
                    {game.isFeatured && <span className="badge" style={{ backgroundColor: 'rgba(212, 255, 0, 0.1)', color: 'var(--primary)', marginRight: '8px' }}>Featured</span>}
                    {game.isNew && <span className="badge" style={{ backgroundColor: 'rgba(255, 75, 75, 0.1)', color: 'var(--error)' }}>Hot</span>}
                    {!game.isNew && !game.isFeatured && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Standard</span>}
                  </td>
                  <td>
                    {view === 'managed' ? (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={() => openEditModal(game)}
                          className="btn-outline" 
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(game)} 
                          className="btn-outline" 
                          style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--error)', borderColor: 'rgba(255, 75, 75, 0.2)' }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleSave(game)} 
                        disabled={saving === game.title}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                      >
                        {saving === game.title ? 'Saving...' : 'Save to Firestore'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingGame && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Game</h3>
            <div className="modal-field">
              <label>Title</label>
              <input 
                type="text" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
              />
            </div>
            <div className="modal-field">
              <label>Category</label>
              <input 
                type="text" 
                value={editCategory} 
                onChange={(e) => setEditCategory(e.target.value)} 
              />
            </div>
            <div className="modal-field checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={editIsFeatured} 
                  onChange={(e) => setEditIsFeatured(e.target.checked)} 
                />
                Featured
              </label>
            </div>
            <div className="modal-field checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={editIsNew} 
                  onChange={(e) => setEditIsNew(e.target.checked)} 
                />
                New / Hot
              </label>
            </div>
            <div className="modal-buttons">
              <button onClick={handleUpdateGame} disabled={isUpdating} className="btn-primary">
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditingGame(null)} className="btn-outline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Games;
