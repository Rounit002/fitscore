import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ChevronUp,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Tag,
  CheckCircle2,
  Circle,
  Loader2,
  X,
  MessageSquarePlus,
  ArrowUpDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../api/client.js';

const CATEGORIES = ['Feature', 'UI', 'Performance', 'Bug', 'Other'];
const STATUSES = {
  'Under Review': { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  'Planned': { color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.1)' },
  'In Progress': { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  'Completed': { color: '#5BAD4E', bg: 'rgba(91, 173, 78, 0.1)' }
};

export default function FeatureRequests({ userAuth, authToken, onBack }) {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Most Votes'); // 'Most Votes', 'Newest', 'Oldest'

  // New form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Feature');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const controller = new AbortController();
    fetchFeatures(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchFeatures = async (signal) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API}/features`,
        { credentials: 'include', ...(signal ? { signal } : {}) }
      );
      if (!response.ok) throw new Error('Failed to fetch features');
      const data = await response.json();
      setFeatures(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setError('Could not load feature requests.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const handleVote = async (featureId, currentVote) => {
    const newVote = currentVote === 'up' ? 'none' : 'up';

    // Optimistic update
    setFeatures(currents => currents.map(f => {
      if (f.id === featureId) {
        const updatedVoters = { ...f.voters };
        if (newVote === 'none') delete updatedVoters[userAuth.id];
        else updatedVoters[userAuth.id] = 'up';

        let upvotes = 0;
        for (const uid in updatedVoters) if (updatedVoters[uid] === 'up') upvotes++;

        return { ...f, voters: updatedVoters, upvotes };
      }
      return f;
    }));

    try {
      await fetch(
        `${API}/features/${featureId}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ vote: newVote })
        }
      );
    } catch (err) {
      console.error('Failed to vote:', err);
      fetchFeatures();
    }
  };

  const handleSubmitNew = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `${API}/features`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: newTitle,
            description: newDescription,
            category: newCategory
          })
        }
      );

      if (!response.ok) throw new Error('Failed to create feature');

      resetForm();
      fetchFeatures();
    } catch (err) {
      console.error('Error submitting feature:', err);
      setError('Could not submit feature request.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewCategory('Feature');
    setShowNewForm(false);
  };

  const timeAgo = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - d) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const filteredFeatures = useMemo(() => {
    let result = [...features];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      );
    }

    // Filter Tabs
    if (activeFilter === 'Planned') result = result.filter(f => f.status === 'Planned');
    else if (activeFilter === 'Completed') result = result.filter(f => f.status === 'Completed');
    else if (activeFilter === 'Top Voted') result.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    else if (activeFilter === 'New') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Secondary Sort
    if (sortBy === 'Most Votes') {
      result.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    } else if (sortBy === 'Newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'Oldest') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return result;
  }, [features, searchQuery, activeFilter, sortBy]);

  return (
    <div className="feature-requests-page">
      <header className="fr-header">
        <div className="fr-header-top">
          <button onClick={onBack} className="fr-back-btn">
            <ArrowLeft size={22} />
          </button>
          <h1>{t('feature_requests')}</h1>
          <button onClick={() => setShowNewForm(true)} className="fr-new-btn">
            <Plus size={20} />
            <span>{t('new')}</span>
          </button>
        </div>

        <div className="fr-header-search">
          <div className="search-pill">
            <Search size={18} />
            <input
              type="text"
              placeholder={t('search_ideas')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && <X size={16} onClick={() => setSearchQuery('')} />}
          </div>
        </div>

        <div className="fr-filter-tabs">
          {['All', 'Top Voted', 'New', 'Planned', 'Completed'].map(tab => (
            <button
              key={tab}
              className={activeFilter === tab ? 'active' : ''}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="fr-content">
        <div className="fr-toolbar">
          <span className="fr-count">{t('requests_count', { count: filteredFeatures.length })}</span>
          <div className="fr-sort">
            <ArrowUpDown size={14} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option>Most Votes</option>
              <option>Newest</option>
              <option>Oldest</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="fr-loading">
            <Loader2 className="animate-spin" size={32} />
            <p>{t('loading_requests')}</p>
          </div>
        ) : error ? (
          <div className="fr-error">{error}</div>
        ) : filteredFeatures.length === 0 ? (
          <div className="fr-empty">
            <div className="fr-empty-icon">
              <MessageSquarePlus size={32} />
            </div>
            <h3>{t('no_requests')}</h3>
            <p>{t('no_requests_desc')}</p>
            <button onClick={() => setShowNewForm(true)} className="fr-empty-btn">{t('suggest_feature')}</button>
          </div>
        ) : (
          <div className="fr-list">
            {filteredFeatures.map(feature => {
              const myVote = feature.voters && userAuth ? feature.voters[userAuth.id] : null;
              const status = STATUSES[feature.status] || STATUSES['Under Review'];

              return (
                <div key={feature.id} className="fr-card">
                  <div className="fr-card-vote">
                    <button
                      onClick={() => handleVote(feature.id, myVote)}
                      className={`vote-btn ${myVote === 'up' ? 'active' : ''}`}
                    >
                      <ChevronUp size={22} />
                      <span>{feature.upvotes - (feature.downvotes || 0)}</span>
                    </button>
                  </div>

                  <div className="fr-card-body">
                    <div className="fr-card-header">
                      <div className="fr-badges">
                        <span className="badge-status" style={{ background: status.bg, color: status.color }}>
                          {feature.status || 'Under Review'}
                        </span>
                        <span className="badge-category">
                          <Tag size={14} />
                          {feature.category || 'Feature'}
                        </span>
                      </div>
                      <h3>{feature.title}</h3>
                    </div>

                    <p className="fr-card-desc">{feature.description}</p>

                    <div className="fr-card-footer">
                      <div className="fr-user">
                        <User size={14} />
                        <span>{feature.author_name || 'Anonymous'}</span>
                      </div>
                      <div className="fr-dot" />
                      <div className="fr-time">
                        <Clock size={14} />
                        <span>{timeAgo(feature.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Feature Modal / Bottom Sheet */}
      {showNewForm && (
        <div className="fr-modal-overlay" onClick={resetForm}>
          <div className="fr-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" onClick={resetForm} />
            <div className="sheet-header">
              <h2>{t('suggest_a_feature')}</h2>
              <button onClick={resetForm} className="sheet-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="sheet-form">
              <div className="form-group">
                <label>{t('title')}</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={t('what_should_add')}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>{t('category')}</label>
                <div className="category-chips">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={newCategory === cat ? 'active' : ''}
                      onClick={() => setNewCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>{t('description')}</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder={t('describe_feature')}
                  required
                  rows={4}
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={submitting || !newTitle.trim() || !newDescription.trim()}
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : t('post_request')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
