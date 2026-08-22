import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ChevronRight,
  Check,
  Clock,
  Crown,
  Edit3,
  Globe2,
  HeartPulse,
  Languages,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { API } from '../api/client.js';
import { LANGUAGES } from '../utils/languages.js';
import { ThemeModeSelector } from './ThemeToggle.jsx';

/**
 * Display copy for the paywall tiers.
 *
 * Prices are NOT stored here — the amounts come from GET /api/payment/plans, which
 * reads the same server catalogue that Razorpay is charged from. Keeping the
 * numbers on the server means the price on screen cannot drift from the price
 * charged, and a tampered client cannot buy the lifetime tier for 1 paisa.
 *
 * `usdRate` is a rough INR->USD divisor used only for the "~$x" secondary line.
 */
const USD_PER_INR = 83;

const PLAN_COPY = {
  trial7: {
    subtitle: 'For new users only',
    unit: '/ 7 days',
    note: 'One-time offer — first purchase only',
    cta: 'Start 7-day access',
    // The advertised figure is the whole charge, not a per-month rate.
    perMonth: false,
  },
  monthly: {
    subtitle: 'Flexible month-to-month',
    unit: '/ month',
    cta: 'Get monthly access',
    perMonth: false,
  },
  yearly: {
    subtitle: 'Best rate when you pay yearly',
    unit: '/ month',
    badge: 'Best value',
    cta: 'Get best value',
    // Billed as one yearly charge but advertised as the monthly equivalent, so
    // the headline figure is amount / 12 and the note states the real total.
    perMonth: true,
    months: 12,
  },
  lifetime: {
    subtitle: 'Pay once, keep it forever',
    unit: 'one-time',
    badge: 'Lifetime',
    note: 'No renewals — never expires',
    cta: 'Get lifetime access',
    perMonth: false,
  },
};

// Order the cards left-to-right by commitment length.
const PLAN_ORDER = ['trial7', 'monthly', 'yearly', 'lifetime'];

const PLAN_FEATURES = [
  'Unlimited food scans (subject to fair usage)',
  'AI-powered nutrition analysis',
  'Ingredient explanations',
  'Personalized health insights',
  'Smart recommendations',
  'Priority AI responses',
];

/** Paise -> whole rupees. All catalogue amounts are whole rupees, so no decimals. */
const rupees = (paise) => Math.round(paise / 100);

const healthIssues = [
  'Acid Reflux / GERD',
  'Acne',
  'ADHD',
  'Allergic Rhinitis',
  'Anemia',
  'Anxiety',
  'Arthritis',
  'Asthma',
  'Autoimmune Disease',
  'Back Pain',
  'Bipolar Disorder',
  'Celiac Disease',
  'Chronic Bronchitis',
  'Chronic Kidney Disease',
  'Chronic Liver Disease',
  'Chronic Migraine',
  'Chronic Obstructive Pulmonary Disease (COPD)',
  'Chronic Pain',
  'Constipation',
  'Coronary Artery Disease',
  'Depression',
  'Diabetes',
  'Diabetes Type 1',
  'Diabetes Type 2',
  'Eczema',
  'Endometriosis',
  'Epilepsy',
  'Fatty Liver Disease',
  'Fibromyalgia',
  'Food Allergy',
  'Gallstones',
  'Gastritis',
  'Gestational Diabetes',
  'Gluten Sensitivity',
  'Gout',
  "Graves' Disease",
  'Hashimoto Thyroiditis',
  'Heart Disease',
  'High Blood Pressure',
  'High Cholesterol',
  'Hormonal Imbalance',
  'Hyperthyroidism',
  'Hypothyroidism',
  'IBS / Irritable Bowel Syndrome',
  'Insomnia',
  'Insulin Resistance',
  'Iron Deficiency',
  'Kidney Stones',
  'Lactose Intolerance',
  'Low Blood Pressure',
  'Metabolic Syndrome',
  'Migraine',
  'Obesity',
  'Osteoarthritis',
  'Osteoporosis',
  'PCOD',
  'PCOS',
  'Peptic Ulcer',
  'Prediabetes',
  'Psoriasis',
  'Rheumatoid Arthritis',
  'Sinusitis',
  'Sleep Apnea',
  'Stroke History',
  'Thyroid Disorder',
  'Ulcerative Colitis',
  'Vitamin B12 Deficiency',
  'Vitamin D Deficiency',
];

const healthGoalsList = [
  'Lose Weight',
  'Maintain Weight',
  'Gain Healthy Weight',
  'Build Muscle',
  'Improve Strength',
  'Improve Endurance',
  'Increase Daily Steps',
  'Improve Heart Health',
  'Lower Blood Pressure',
  'Improve Cholesterol',
  'Manage Blood Sugar',
  'Improve Insulin Sensitivity',
  'Improve Digestion',
  'Reduce Bloating',
  'Improve Gut Health',
  'Eat More Protein',
  'Eat More Fiber',
  'Eat More Fruits and Vegetables',
  'Reduce Added Sugar',
  'Reduce Sodium',
  'Drink More Water',
  'Improve Sleep',
  'Reduce Stress',
  'Boost Energy',
  'Improve Mental Wellbeing',
  'Support Hormonal Balance',
  'Improve Skin Health',
  'Improve Immunity',
  'Recover After Workout',
  'Improve Bone Health',
  'Pregnancy Nutrition',
  'Postpartum Recovery',
  'Healthy Aging',
  'General Fitness',
  'Balanced Nutrition',
];

const severityLevels = ['Low', 'Medium', 'High'];

const normalizeCondition = (condition) => {
  if (typeof condition === 'string') {
    return { name: condition, severity: 'Medium' };
  }

  return {
    name: condition?.name || '',
    severity: severityLevels.includes(condition?.severity) ? condition.severity : 'Medium',
  };
};

// Sourced from the shared list rather than redeclared: this copy had been saved
// with its UTF-8 bytes decoded as latin1, so six of the eight labels rendered as
// mojibake in the profile language picker while the header switcher was correct.
const profileLanguages = LANGUAGES;

function ProfileSection({ title, children }) {
  return (
    <section className="profile-menu-section">
      <h2>{title}</h2>
      <div className="profile-menu-group">{children}</div>
    </section>
  );
}

// `area` selects the row's group accent (DESIGN_TOKENS.md 14.4). It is emitted as
// data-area so the stylesheet derives the badge tint, the glyph colour and the
// hover fill from one --edge-accent, rather than each being set independently.
// The accent is per functional group, not per row: eleven rows in eleven colours
// would be a paint chart, and eleven identical emerald badges (the previous
// state) made the badge column carry no information at all.
// A danger row ignores its group — "this deletes your data" outranks "this is an
// account setting" — so it takes --ns-error via .is-danger.
function ProfileAction({ label, icon: Icon, onClick, danger = false, area }) {
  return (
    <button
      className={`profile-menu-action${danger ? ' is-danger' : ''}`}
      type="button"
      onClick={onClick}
      data-area={danger ? undefined : area}
    >
      {Icon && (
        <span className="profile-action-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
      )}
      <span>{label}</span>
      <ChevronRight size={16} />
    </button>
  );
}

function ProfileModal({ title, children, onClose }) {
  return (
    <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="profile-modal-card">
        <div className="profile-modal-title">
          <strong>{title}</strong>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function compressProfileImage(file, maxSize = 320, quality = 0.76) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      image.onerror = () => reject(new Error('Could not load selected image'));
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error('Could not read selected image'));
    reader.readAsDataURL(file);
  });
}

// Mirrors the 13+ policy in Backend/utils/ageCheck.js. Onboarding collects age
// directly (date of birth is no longer asked), so editing it here has to respect
// the same floor.
const MINIMUM_AGE = 13;
const MAXIMUM_AGE = 100;

const personalFields = [
  { key: 'name', label: 'Name', type: 'text', source: 'user' },
  { key: 'height', label: 'Height', type: 'number', suffix: 'cm' },
  { key: 'age', label: 'Age', type: 'number', min: MINIMUM_AGE, max: MAXIMUM_AGE },
  { key: 'weight', label: 'Weight', type: 'number', suffix: 'kg' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
];

function formatPersonalValue(field, value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  return field.suffix ? `${value} ${field.suffix}` : value;
}

export function PersonalDetailsPage({
  userProfile,
  userAuth,
  authToken,
  onBack,
  onDetailsSaved,
}) {
  const [details, setDetails] = useState(() => ({
    name: userAuth?.name || '',
    height: userProfile?.height || '',
    age: userProfile?.age || '',
    weight: userProfile?.weight || '',
    gender: userProfile?.gender || '',
  }));
  const [editingKey, setEditingKey] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState('');

  const startEditing = (field) => {
    setError('');
    setEditingKey(field.key);
    setDraftValue(details[field.key] || '');
  };

  const cancelEditing = () => {
    setError('');
    setEditingKey(null);
    setDraftValue('');
  };

  const saveField = async (field) => {
    // The 13+ gate. Checked before the request so the user gets the specific
    // message rather than the generic save failure; the server enforces it too.
    if (field.key === 'age' && draftValue !== '') {
      const parsedAge = Number(draftValue);
      if (!Number.isInteger(parsedAge) || parsedAge < MINIMUM_AGE || parsedAge > MAXIMUM_AGE) {
        setError(`Age must be between ${MINIMUM_AGE} and ${MAXIMUM_AGE}.`);
        return;
      }
    }

    const nextDetails = { ...details, [field.key]: draftValue };
    const profilePatch = {};
    if (field.source !== 'user') {
      profilePatch[field.key] = draftValue;
    }

    setSavingKey(field.key);
    setError('');

    try {
      const response = await fetch(
        `${API}/auth/details`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: field.key === 'name' ? draftValue : undefined,
            profile: profilePatch,
          }),
        }
      );

      if (!response.ok) throw new Error('Save failed');
      const data = await response.json();
      setDetails(nextDetails);
      onDetailsSaved?.(data.user);
      cancelEditing();
    } catch (saveError) {
      console.error(saveError);
      setError('Could not save this detail. Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleKeyDown = (event, field) => {
    if (event.key === 'Enter') saveField(field);
    if (event.key === 'Escape') cancelEditing();
  };

  return (
    <div className="personal-details-page">
      <section className="personal-details-shell" aria-label="Personal details">
        <header className="personal-details-header">
          <button type="button" onClick={onBack} aria-label="Back to profile">
            <ArrowLeft size={20} />
          </button>
          <h1>Personal Details</h1>
          <span />
        </header>

        <section className="personal-details-card">
          {personalFields.map((field) => {
            const isEditing = editingKey === field.key;
            const value = details[field.key];

            return (
              <div className="personal-detail-row" key={field.key}>
                <label>{field.label}</label>
                <div className="personal-detail-control">
                  {isEditing ? (
                    <>
                      {field.type === 'select' ? (
                        <select
                          value={draftValue}
                          onChange={(event) => setDraftValue(event.target.value)}
                          autoFocus
                        >
                          <option value="">N/A</option>
                          {field.options.map((option) => (
                            <option value={option} key={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          min={field.min}
                          max={field.max}
                          value={draftValue}
                          onChange={(event) => setDraftValue(event.target.value)}
                          onKeyDown={(event) => handleKeyDown(event, field)}
                          autoFocus
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => saveField(field)}
                        disabled={savingKey === field.key}
                        aria-label={`Save ${field.label}`}
                      >
                        <Check size={16} />
                      </button>
                      <button type="button" onClick={cancelEditing} aria-label={`Cancel ${field.label}`}>
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <strong>{formatPersonalValue(field, value)}</strong>
                      <button type="button" onClick={() => startEditing(field)} aria-label={`Edit ${field.label}`}>
                        <Edit3 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {error && <p className="personal-details-error">{error}</p>}
      </section>
    </div>
  );
}

export function MedicalProfilePage({
  userProfile,
  authToken,
  onBack,
  onDetailsSaved,
  isOnboarding = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssues, setSelectedIssues] = useState(() => (
    (userProfile?.conditions || [])
      .map(normalizeCondition)
      .filter((condition) => condition.name)
  ));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedIssueNames = useMemo(() => selectedIssues.map((issue) => issue.name), [selectedIssues]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleIssues = useMemo(() => {
    return healthIssues
      .filter((issue) => issue.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => {
        const aSelected = selectedIssueNames.includes(a);
        const bSelected = selectedIssueNames.includes(b);
        if (aSelected !== bSelected) return aSelected ? -1 : 1;

        if (normalizedSearch) {
          const aStarts = a.toLowerCase().startsWith(normalizedSearch);
          const bStarts = b.toLowerCase().startsWith(normalizedSearch);
          if (aStarts !== bStarts) return aStarts ? -1 : 1;
        }

        return a.localeCompare(b);
      });
  }, [normalizedSearch, selectedIssueNames]);

  const toggleIssue = (issue) => {
    setError('');
    setSelectedIssues((current) => (
      current.some((item) => item.name === issue)
        ? current.filter((item) => item.name !== issue)
        : [...current, { name: issue, severity: 'Medium' }]
    ));
  };

  const setIssueSeverity = (issue, severity) => {
    setError('');
    setSelectedIssues((current) => current.map((item) => (
      item.name === issue ? { ...item, severity } : item
    )));
  };

  const saveMedicalProfile = async () => {
    if (isOnboarding) {
      onDetailsSaved?.({ profile: { conditions: selectedIssues } });
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(
        `${API}/auth/details`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            profile: { conditions: selectedIssues },
          }),
        }
      );

      if (!response.ok) throw new Error('Save failed');
      const data = await response.json();
      onDetailsSaved?.(data.user);
      onBack();
    } catch (saveError) {
      console.error(saveError);
      setError('Could not save your medical profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="medical-profile-page">
      <section className="medical-profile-shell" aria-label="Medical profile">
        <header className="medical-profile-header">
          <button type="button" onClick={onBack} aria-label="Back to profile">
            <ArrowLeft size={20} />
          </button>
          <h1>Medical Profile</h1>
          <span />
        </header>

        <div className="medical-search-box">
          <Search size={18} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search"
            aria-label="Search health issues"
          />
        </div>

        {selectedIssues.length > 0 && (
          <section className="medical-summary-card" aria-label="Selected health issues">
            <div className="medical-summary-title">
              <span>Selected Conditions</span>
              <strong>{selectedIssues.length}</strong>
            </div>
            <div className="medical-selected-strip">
              {selectedIssues.map((issue) => (
                <button key={issue.name} type="button" onClick={() => toggleIssue(issue.name)}>
                  {issue.name}
                  <span>{issue.severity}</span>
                  <X size={14} />
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="medical-issue-list" aria-label="Health issue options">
          {visibleIssues.length ? visibleIssues.map((issue) => {
            const selectedIssue = selectedIssues.find((item) => item.name === issue);
            const isSelected = Boolean(selectedIssue);
            return (
              <div
                key={issue}
                className={`medical-issue-item${isSelected ? ' is-selected' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => toggleIssue(issue)}
                  aria-pressed={isSelected}
                >
                  <span>{issue}</span>
                  <strong>{isSelected ? 'Selected' : 'Select'}</strong>
                </button>

                {isSelected && (
                  <div className="medical-severity-control" aria-label={`${issue} severity`}>
                    {severityLevels.map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={selectedIssue.severity === level ? 'is-active' : ''}
                        onClick={() => setIssueSeverity(issue, level)}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="medical-empty-result">No matching health issue found.</div>
          )}
        </div>

        {error && <p className="medical-profile-error">{error}</p>}

        <button
          className="medical-save-button"
          type="button"
          onClick={saveMedicalProfile}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : isOnboarding ? 'Next Step' : `Save ${selectedIssues.length} Selected`}
        </button>
      </section>
    </div>
  );
}

export function HealthGoalsPage({
  userProfile,
  authToken,
  onBack,
  onDetailsSaved,
  isOnboarding = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGoals, setSelectedGoals] = useState(() => userProfile?.goals || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleGoals = useMemo(() => {
    return healthGoalsList
      .filter((goal) => goal.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => {
        const aSelected = selectedGoals.includes(a);
        const bSelected = selectedGoals.includes(b);
        if (aSelected !== bSelected) return aSelected ? -1 : 1;

        if (normalizedSearch) {
          const aStarts = a.toLowerCase().startsWith(normalizedSearch);
          const bStarts = b.toLowerCase().startsWith(normalizedSearch);
          if (aStarts !== bStarts) return aStarts ? -1 : 1;
        }

        return a.localeCompare(b);
      });
  }, [normalizedSearch, selectedGoals]);

  const toggleGoal = (goal) => {
    setError('');
    setSelectedGoals((current) => (
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal]
    ));
  };

  const saveHealthGoals = async () => {
    if (isOnboarding) {
      onDetailsSaved?.({ profile: { goals: selectedGoals } });
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(
        `${API}/auth/details`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            profile: { goals: selectedGoals },
          }),
        }
      );

      if (!response.ok) throw new Error('Save failed');
      const data = await response.json();
      onDetailsSaved?.(data.user);
      onBack();
    } catch (saveError) {
      console.error(saveError);
      setError('Could not save your health goals. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="health-goals-page">
      <section className="health-goals-shell" aria-label="Health goals">
        <header className="health-goals-header">
          <button type="button" onClick={onBack} aria-label="Back to profile">
            <ArrowLeft size={20} />
          </button>
          <h1>Health Goals</h1>
          <span />
        </header>

        <div className="health-goals-search-box">
          <Search size={18} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search"
            aria-label="Search health goals"
          />
        </div>

        {selectedGoals.length > 0 && (
          <section className="health-goals-summary-card" aria-label="Selected health goals">
            <div className="health-goals-summary-title">
              <span>Selected Goals</span>
              <strong>{selectedGoals.length}</strong>
            </div>
            <div className="health-goals-selected-strip">
              {selectedGoals.map((goal) => (
                <button key={goal} type="button" onClick={() => toggleGoal(goal)}>
                  {goal}
                  <X size={14} />
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="health-goals-list" aria-label="Health goal options">
          {visibleGoals.length ? visibleGoals.map((goal) => {
            const isSelected = selectedGoals.includes(goal);
            return (
              <button
                key={goal}
                className={isSelected ? 'is-selected' : ''}
                type="button"
                onClick={() => toggleGoal(goal)}
                aria-pressed={isSelected}
              >
                <span>{goal}</span>
                <strong>{isSelected ? 'Selected' : 'Select'}</strong>
              </button>
            );
          }) : (
            <div className="health-goals-empty-result">No matching health goal found.</div>
          )}
        </div>

        {error && <p className="health-goals-error">{error}</p>}

        <button
          className="health-goals-save-button"
          type="button"
          onClick={saveHealthGoals}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : isOnboarding ? 'Finish Setup' : `Save ${selectedGoals.length} Selected`}
        </button>
      </section>
    </div>
  );
}

export default function Profile({ userProfile, userAuth, authToken, onBack, onLogout, onDetailsSaved, onNavigateFeatures, themeMode, setThemeMode }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [view, setView] = useState('menu');
  const [language, setLanguage] = useState(() => i18n.resolvedLanguage || i18n.language || 'en');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  // Kept only as a defensive fallback for any stale rendered state during a
  // hot update. The visible Profile action now routes directly to the page.
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting] = useState(false);
  const [deleteError] = useState('');
  const [deleteScheduledSuccess] = useState(false);
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState(() => userAuth?.scheduledDeletionAt || null);
  const [isCancellingDeletion, setIsCancellingDeletion] = useState(false);
  const fileInputRef = useRef(null);

  const ageLabel = userProfile?.age ? `${userProfile.age}` : t('age');
  const displayName = userAuth?.name || userProfile?.name || 'Name';
  const profileImageUrl = userProfile?.profileImageUrl || userProfile?.avatarUrl || userProfile?.photoUrl || '';
  const initials = useMemo(() => {
    return displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'FS';
  }, [displayName]);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentToast, setPaymentToast] = useState(null);
  // Which card's button is spinning, so only the clicked tier shows "Processing".
  const [pendingPlanId, setPendingPlanId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansState, setPlansState] = useState('idle'); // idle | loading | ready | error

  // Plans are fetched when the upgrade modal opens rather than on mount: the
  // response depends on the account's payment history (the 7-day intro tier is
  // hidden after a first purchase), and most Profile visits never open it.
  useEffect(() => {
    if (modal !== 'family' || userAuth?.isPremium) return;

    const controller = new AbortController();
    setPlansState('loading');

    (async () => {
      try {
        const res = await fetch(`${API}/api/payment/plans`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Failed to load plans');
        const data = await res.json();
        const list = Array.isArray(data.plans) ? data.plans : [];
        // Only render tiers the client has copy for, ordered by commitment.
        const ordered = PLAN_ORDER
          .map((id) => list.find((p) => p.id === id))
          .filter((p) => p && PLAN_COPY[p.id]);
        setPlans(ordered);
        setPlansState('ready');
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load plans:', err);
        setPlansState('error');
      }
    })();

    return () => controller.abort();
  }, [modal, userAuth?.isPremium]);

  const showPaymentToast = (message, type = 'success') => {
    setPaymentToast({ message, type });
    setTimeout(() => setPaymentToast(null), 4000);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (planId) => {
    setIsProcessingPayment(true);
    setPendingPlanId(planId);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }

      const orderRes = await fetch(
        `${API}/api/payment/create-order`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          // Was `{ planType }`, which the strict emptyBody schema on this route
          // rejected with a 400 — the upgrade button could never open checkout.
          // The route now validates `planId` against the server plan catalogue.
          body: JSON.stringify({ planId })
        }
      );
      if (!orderRes.ok) {
        const detail = await orderRes.json().catch(() => null);
        throw new Error(detail?.error || 'Failed to create order');
      }
      const order = await orderRes.json();

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "bitezsnap",
        description: `bitezsnap Premium — ${plans.find((p) => p.id === planId)?.label || 'Premium'}`,
        order_id: order.order_id,
        handler: async function (response) {
          try {
            const verifyRes = await fetch(
              `${API}/api/payment/verify`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                // `planType` was sent here too and rejected by the strict verify
                // schema. The plan is not a client input at all: /verify reads it
                // from the order row it was recorded against, so paying for the
                // 7-day tier cannot be redeemed as lifetime.
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                })
              }
            );
            if (verifyRes.ok) {
              showPaymentToast(`Payment successful! Welcome to Premium.`, 'success');
              setModal(null);
              if (userAuth) {
                 const updatedAuth = { ...userAuth, isPremium: true };
                 onDetailsSaved?.(updatedAuth);
              }
            } else {
              showPaymentToast('Payment verification failed.', 'error');
            }
          } catch (err) {
            console.error('Verify error:', err);
            showPaymentToast('Payment verification failed.', 'error');
          }
        },
        prefill: {
          name: userProfile?.name || "",
          email: userAuth?.email || ""
        },
        theme: {
          color: "#10B981"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed', response.error);
        showPaymentToast('Payment failed: ' + response.error.description, 'error');
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      showPaymentToast(err.message || 'Payment initiation failed', 'error');
    } finally {
      setIsProcessingPayment(false);
      setPendingPlanId(null);
    }
  };

  // Calculate remaining days for scheduled deletion
  const deletionCountdown = useMemo(() => {
    if (!scheduledDeletionAt) return null;
    const now = new Date();
    const target = new Date(scheduledDeletionAt);
    const diff = target - now;
    if (diff <= 0) return { days: 0, hours: 0, label: 'soon' };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return { days, hours, label: `${days} day${days !== 1 ? 's' : ''}` };
    return { days: 0, hours, label: `${hours} hour${hours !== 1 ? 's' : ''}` };
  }, [scheduledDeletionAt]);

  const handleLanguageChange = (nextLanguageCode) => {
    i18n.changeLanguage(nextLanguageCode);
    setLanguage(nextLanguageCode);
    localStorage.setItem('fitscan_language', nextLanguageCode);
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    navigate('/delete-account');
  };

  const handleCancelDeletion = async () => {
    setIsCancellingDeletion(true);
    try {
      const response = await fetch(
        `${API}/auth/cancel-deletion`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Cancel failed');
      }
      setScheduledDeletionAt(null);
    } catch (err) {
      console.error('[Cancel deletion error]', err);
    } finally {
      setIsCancellingDeletion(false);
    }
  };

  const mailSupport = () => {
    window.location.href = 'mailto:support@bitezsnap.app?subject=bitezsnap%20Support';
  };

  const handleProfilePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file.');
      event.target.value = '';
      return;
    }

    const uploadCompressedImage = async () => {
      setIsUploadingPhoto(true);
      setPhotoError('');

      try {
        const compressedImage = await compressProfileImage(file);
        console.log('[Profile photo upload] compressed image size:', compressedImage.length);

        const response = await fetch(
          `${API}/auth/profile-picture`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ imageBase64: compressedImage }),
          }
        );

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || `Upload failed with status ${response.status}`);
        }

        const data = await response.json();
        onDetailsSaved?.(data.user);
      } catch (error) {
        console.error('[Profile photo upload]', error);
        setPhotoError('Could not save profile picture. Please try again.');
      } finally {
        setIsUploadingPhoto(false);
        event.target.value = '';
      }
    };

    uploadCompressedImage();
  };

  if (view === 'personal') {
    return (
      <PersonalDetailsPage
        userProfile={userProfile}
        userAuth={userAuth}
        authToken={authToken}
        onBack={() => setView('menu')}
        onDetailsSaved={onDetailsSaved}
      />
    );
  }

  if (view === 'medical') {
    return (
      <MedicalProfilePage
        userProfile={userProfile}
        authToken={authToken}
        onBack={() => setView('menu')}
        onDetailsSaved={onDetailsSaved}
      />
    );
  }

  if (view === 'goals') {
    return (
      <HealthGoalsPage
        userProfile={userProfile}
        authToken={authToken}
        onBack={() => setView('menu')}
        onDetailsSaved={onDetailsSaved}
      />
    );
  }

  return (
    <div className="profile-page">
      {paymentToast && (
        <div className="scan-toast" style={{ background: paymentToast.type === 'error' ? 'var(--ns-error)' : 'var(--ns-success)' }}>
          <span>{paymentToast.message}</span>
        </div>
      )}
      <section className="profile-phone-shell" aria-label="Profile">
        <header className="profile-topbar">
          <button type="button" onClick={onBack} aria-label={t('back')}>
            <ArrowLeft size={20} />
          </button>
          <h1>{t('profile')}</h1>
          <span />
        </header>

        <section className="profile-hero">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="profile-photo-input"
            onChange={handleProfilePhotoChange}
          />
          <button
            className={`profile-avatar${profileImageUrl ? ' has-image' : ''}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            aria-label={t('upload_profile_picture')}
          >
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={`${displayName} profile`} />
            ) : (
              <span>{initials}</span>
            )}
            <em>
              <Camera size={14} />
            </em>
            {isUploadingPhoto && <i>{t('uploading')}</i>}
          </button>
          {photoError && <p className="profile-photo-error">{photoError}</p>}
          <div className="profile-name-row">
            <strong>{displayName}</strong>
            <span>{ageLabel}</span>
          </div>
          {userAuth?.isPremium ? (
            <button className="profile-upgrade-button premium" type="button" onClick={() => setModal('family')}>
              <Crown size={16} />
              <span>Premium Active</span>
            </button>
          ) : (
            <button className="profile-upgrade-button" type="button" onClick={() => setModal('family')}>
              <Crown size={16} />
              <span>{t('upgrade')}</span>
            </button>
          )}
        </section>

        <ProfileSection title={t('account')}>
          <ProfileAction label={t('personal_detail')} icon={User} onClick={() => setView('personal')} area="account" />
          <ProfileAction label={`${t('language')}: ${profileLanguages.find((option) => option.code === language)?.label || 'English'}`} icon={Languages} onClick={() => setModal('language')} area="account" />
          <div className="profile-theme-setting" data-area="account">
            <span className="profile-theme-label">{t('theme')}</span>
            <ThemeModeSelector mode={themeMode} onChange={setThemeMode} t={t} />
          </div>
        </ProfileSection>

        <ProfileSection title={t('goals_tracking')}>
          <ProfileAction label={t('edit_medical_profile')} icon={HeartPulse} onClick={() => setView('medical')} area="health" />
          <ProfileAction label={t('edit_health_goal')} icon={Sparkles} onClick={() => setView('goals')} area="health" />
        </ProfileSection>

        <ProfileSection title={t('support_legal')}>
          <ProfileAction label={t('request_feature')} icon={Globe2} onClick={onNavigateFeatures} area="support" />
          <ProfileAction label={t('support_email')} icon={Mail} onClick={mailSupport} area="support" />
          {/* Both legal pages open at shareable URLs rather than modals so the
              full AI disclaimer and limitations can live in one place and be
              linked from the store listing and OAuth consent screens. */}
          <ProfileAction label={t('terms_condition')} icon={ShieldCheck} onClick={() => navigate('/terms-conditions')} area="support" />
          <ProfileAction label={t('privacy_policy')} icon={Lock} onClick={() => navigate('/privacy-policy')} area="support" />
        </ProfileSection>

        <ProfileSection title={t('account_action')}>
          <ProfileAction label={t('logout')} icon={LogOut} onClick={onLogout} area="account" />
          <ProfileAction label={scheduledDeletionAt ? 'Deletion Scheduled' : t('delete_account')} icon={Trash2} onClick={() => navigate('/delete-account')} danger />
        </ProfileSection>

        {scheduledDeletionAt && deletionCountdown && (
          <div className="deletion-scheduled-banner">
            <div className="deletion-banner-icon">
              <Clock size={20} />
            </div>
            <div className="deletion-banner-text">
              <strong>Account deletion scheduled</strong>
              <span>Your account will be permanently deleted in <b>{deletionCountdown.label}</b>. Log in again or tap Cancel to keep your account.</span>
            </div>
            <button
              type="button"
              className="deletion-banner-cancel"
              onClick={handleCancelDeletion}
              disabled={isCancellingDeletion}
            >
              {isCancellingDeletion ? 'Cancellingâ€¦' : 'Cancel Deletion'}
            </button>
          </div>
        )}
      </section>

      {modal === 'family' && (
        <ProfileModal title="Upgrade Your Plan" onClose={() => setModal(null)}>
          <p className="profile-upgrade-subtitle">Choose the plan that fits your health goals.</p>
          {!userAuth?.isPremium ? (
            plansState === 'loading' ? (
              <div className="profile-plans-status">
                <Loader2 size={20} className="animate-spin" />
                <span>Loading plans…</span>
              </div>
            ) : plansState === 'error' || plans.length === 0 ? (
              <div className="profile-plans-status">
                <AlertTriangle size={20} />
                <span>Plans are unavailable right now. Please try again later.</span>
              </div>
            ) : (
              <div className="profile-plans-container">
                {plans.map((plan) => {
                  const copy = PLAN_COPY[plan.id];
                  const total = rupees(plan.amount);
                  // Yearly advertises its monthly equivalent; every other tier
                  // advertises the amount actually charged.
                  const headline = copy.perMonth ? Math.round(total / copy.months) : total;
                  const usd = (headline / USD_PER_INR).toFixed(2);
                  const isPending = pendingPlanId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className={`profile-plan-card${copy.badge ? ' premium-card' : ''}`}
                    >
                      {copy.badge && <span className="plan-badge">{copy.badge}</span>}

                      <div className="plan-header">
                        <h3>{plan.label}</h3>
                        <p className="plan-subtitle">{copy.subtitle}</p>
                        <p className="plan-price">
                          ₹{headline} <span>{copy.unit}</span>
                        </p>
                        <p className="plan-price-usd">
                          ~${usd}
                          {copy.perMonth ? '/month' : ''}
                        </p>
                        {/* Yearly's note is derived, not hardcoded, so it always
                            agrees with the amount the server will charge. */}
                        {copy.perMonth ? (
                          <p className="plan-note">
                            Billed yearly — ₹{headline} × {copy.months} = ₹{total}
                          </p>
                        ) : copy.note ? (
                          <p className="plan-note">{copy.note}</p>
                        ) : null}
                      </div>

                      <ul className="plan-features">
                        {PLAN_FEATURES.map((feature) => (
                          <li key={feature}>
                            <Check size={16} /> {feature}
                          </li>
                        ))}
                      </ul>

                      <button
                        className="profile-modal-primary"
                        type="button"
                        onClick={() => handlePayment(plan.id)}
                        disabled={isProcessingPayment}
                      >
                        {isPending ? 'Processing…' : copy.cta}
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="profile-active-plan">
              <div className="active-plan-header">
                <Crown size={20} color="var(--ns-primary)" />
                <h3>You are on the Premium Plan!</h3>
              </div>
              <div className="active-plan-stats">
                <div className="stat-row">
                  <span>Expires On:</span>
                  <strong>{userAuth?.subscriptionExpiresAt ? new Date(userAuth.subscriptionExpiresAt).toLocaleDateString() : 'N/A'}</strong>
                </div>
              </div>
              <button 
                className="profile-modal-primary" 
                type="button" 
                onClick={() => setModal(null)}
                style={{ marginTop: '20px' }}
              >
                Manage Subscription
              </button>
            </div>
          )}
        </ProfileModal>
      )}

      {modal === 'language' && (
        <ProfileModal title={t('language')} onClose={() => setModal(null)}>
          <div className="profile-language-list">
            {profileLanguages.map((option) => (
              <button
                key={option.code}
                className={language === option.code ? 'is-selected' : ''}
                type="button"
                onClick={() => handleLanguageChange(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </ProfileModal>
      )}

      {showDeleteConfirm && (
        <div className="delete-confirm-backdrop" role="dialog" aria-modal="true" aria-label="Delete account confirmation">
          <div className="delete-confirm-card">
            <div className="delete-confirm-icon-wrap">
              <AlertTriangle size={32} />
            </div>
            <h2 className="delete-confirm-title">Delete Account?</h2>
            <p className="delete-confirm-body">
              Your account will be <strong>scheduled for permanent deletion</strong>. After <strong>7 days</strong>, all of the following will be irreversibly removed:
            </p>
            <ul className="delete-confirm-list">
              <li>Your profile &amp; personal details</li>
              <li>Medical conditions &amp; health goals</li>
              <li>Scan history &amp; saved results</li>
              <li>Feature requests &amp; votes</li>
              <li>Your authentication account</li>
            </ul>
            <p className="delete-confirm-grace">
              <Clock size={14} />
              <span>You have <strong>7 days</strong> to change your mind. Simply <strong>log in again</strong> within 7 days to cancel the deletion and keep your account.</span>
            </p>
            {deleteError && (
              <p className="delete-confirm-error">{deleteError}</p>
            )}
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="delete-confirm-cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-confirm-destroy"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="delete-spinner" />
                    Schedulingâ€¦
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteScheduledSuccess && (
        <div className="delete-confirm-backdrop" role="alert">
          <div className="delete-scheduled-success-card">
            <div className="delete-success-icon-wrap">
              <Clock size={32} />
            </div>
            <h2 className="delete-success-title">Deletion Scheduled</h2>
            <p className="delete-success-body">
              Your account will be permanently deleted in <strong>7 days</strong>.
              To cancel, simply <strong>log in again</strong> before then.
            </p>
            <p className="delete-success-redirect">Logging you outâ€¦</p>
          </div>
        </div>
      )}
    </div>
  );
}
