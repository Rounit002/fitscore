/* global jest, describe, it, expect */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import AIHint from './AIHint.jsx';
import i18n from '../i18n';

describe('AIHint', () => {
  it('renders the brief AI-assisted note as a single short line', () => {
    render(<AIHint />);
    expect(
      screen.getByText(i18n.t('ai_assisted_note', 'AI-assisted recommendations'))
    ).toBeInTheDocument();
  });

  it('does not include any long disclaimer or medical-advice language', () => {
    render(<AIHint />);
    // The full disclaimer text must not appear in the brief note. It lives
    // only in the Privacy Policy and Terms & Conditions pages.
    expect(screen.queryByText(/medical advice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/registered dietitian/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/consult a qualified/i)).not.toBeInTheDocument();
  });

  it('uses role="note" and an aria-label so screen readers get the full context', () => {
    render(<AIHint />);
    const hint = screen.getByRole('note', {
      name: i18n.t('ai_assisted_note_aria'),
    });
    expect(hint).toBeInTheDocument();
  });
});
