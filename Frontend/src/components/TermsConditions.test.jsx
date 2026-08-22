/* global jest, describe, it, expect */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import TermsConditions from './TermsConditions';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

function renderTerms() {
  return render(<TermsConditions />);
}

describe('TermsConditions', () => {
  it('renders the page publicly, mirroring the Privacy Policy layout', () => {
    renderTerms();

    expect(
      screen.getByRole('heading', { name: /Terms & Conditions/i })
    ).toBeInTheDocument();
    // All top-level sections are exposed as h2 headings so the table of
    // contents stays in sync with the actual content below it.
    const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
    expect(sectionHeadings.length).toBeGreaterThanOrEqual(14);
  });

  it('documents that recommendations are AI-driven, not a diagnosis', () => {
    renderTerms();

    expect(
      screen.getByText(/uses artificial intelligence to analyse/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/automated recommendations/i)
    ).toBeInTheDocument();
  });

  it('contains the full medical-advice disclaimer (only here and in Privacy Policy)', () => {
    renderTerms();

    expect(
      screen.getByText(/are not medical, nutritional, or dietary advice/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Consult a qualified doctor or registered dietitian/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Do not delay or disregard professional advice/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/contact your local emergency services/i)
    ).toBeInTheDocument();
  });

  it('states the no-refund rule without overriding mandatory consumer rights', () => {
    renderTerms();

    expect(
      screen.getByText(/does not voluntarily offer refunds/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/statutory consumer rights are not limited/i)
    ).toBeInTheDocument();
  });

  it('provides a working support contact', () => {
    renderTerms();

    expect(
      screen.getByRole('link', { name: 'support@bitezsnap.app' })
    ).toHaveAttribute('href', 'mailto:support@bitezsnap.app');
  });
});
