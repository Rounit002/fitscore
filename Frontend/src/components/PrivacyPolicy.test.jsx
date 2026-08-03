/* global jest, describe, it, expect */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PrivacyPolicy from './PrivacyPolicy';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

function renderPolicy() {
  return render(<PrivacyPolicy />);
}

describe('PrivacyPolicy', () => {
  it('renders a complete, publicly readable policy', () => {
    renderPolicy();

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(17);
    expect(screen.getByText(/This is not a zero-data service/i)).toBeInTheDocument();
  });

  it('states the no-refund rule without overriding mandatory rights', () => {
    renderPolicy();

    expect(screen.getByText(/does not voluntarily offer refunds/i)).toBeInTheDocument();
    expect(screen.getByText(/statutory consumer rights are not limited/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Google Play refund policies/i })).toHaveAttribute(
      'href',
      'https://support.google.com/googleplay/answer/2479637',
    );
  });

  it('provides a working privacy contact', () => {
    renderPolicy();

    expect(screen.getByRole('link', { name: 'support@bitezsnap.app' })).toHaveAttribute(
      'href',
      'mailto:support@bitezsnap.app',
    );
  });

  it('describes the public request and associated-data cleanup', () => {
    renderPolicy();

    expect(screen.getByText(/public deletion page using your registered email address/i)).toBeInTheDocument();
    expect(screen.getByText(/requests deletion of its hosted Cloudinary scan images/i)).toBeInTheDocument();
    expect(screen.getByText(/removes your internal account identifier from votes/i)).toBeInTheDocument();
  });
});
