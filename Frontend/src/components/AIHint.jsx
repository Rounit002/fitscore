import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Brief, unobtrusive note that the recommendations shown in the app are
 * AI-assisted.
 *
 * Designed to be placed in the app shell footer so it is present on every
 * authenticated screen without competing with the main content. It must NOT
 * be a banner, modal, or anything that interrupts a flow — the goal is to
 * reassure doctors and health-conscious users that the scores are automated
 * recommendations, not a diagnostic claim.
 *
 * The full explanation of how AI-driven recommendations work, their
 * limitations, and the medical-advice disclaimer lives only in the
 * Privacy Policy and Terms & Conditions pages.
 *
 * @param {object} props
 * @param {'light'|'subtle'} [props.variant] - `subtle` (default) is a single
 *   muted line for the shell footer; `light` is a slightly more prominent
 *   card for pages that want a touch more presence.
 */
export default function AIHint({ variant = 'subtle' }) {
  const { t } = useTranslation();
  const className = variant === 'light' ? 'ai-hint ai-hint--light' : 'ai-hint';

  return (
    <p
      className={className}
      role="note"
      aria-label={t('ai_assisted_note_aria')}
    >
      <Sparkles size={12} aria-hidden="true" className="ai-hint-icon" />
      <span>{t('ai_assisted_note', 'AI-assisted recommendations')}</span>
    </p>
  );
}
