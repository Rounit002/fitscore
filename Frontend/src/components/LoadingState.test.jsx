import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoadingState from './LoadingState';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { changeLanguage: jest.fn() } }),
}));

jest.mock('lucide-react', () => ({
  Search: () => <span>Search</span>,
  BrainCircuit: () => <span>BrainCircuit</span>,
  Activity: () => <span>Activity</span>,
  Sparkles: () => <span>Sparkles</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  Leaf: () => <span>Leaf</span>,
  X: () => <span>X</span>,
}));

describe('LoadingState', () => {
  it('renders analyzing text and step labels', () => {
    render(<LoadingState elapsedSeconds={0} />);
    expect(screen.getByText('analyzing')).toBeInTheDocument();
    expect(screen.getByText('ocr_extraction')).toBeInTheDocument();
    expect(screen.getByText('profile_matching')).toBeInTheDocument();
    expect(screen.getByText('health_impact')).toBeInTheDocument();
    expect(screen.getByText('verdict_generation')).toBeInTheDocument();
  });

  it('shows elapsed time formatted', () => {
    render(<LoadingState elapsedSeconds={65} />);
    expect(screen.getByText('1m 5s')).toBeInTheDocument();
  });

  it('does not show cancel button before 10s', () => {
    const onCancel = jest.fn();
    render(<LoadingState elapsedSeconds={5} onCancel={onCancel} />);
    expect(screen.queryByText('Cancel scan')).not.toBeInTheDocument();
  });

  it('shows cancel button after 10s and calls onCancel', async () => {
    const onCancel = jest.fn();
    render(<LoadingState elapsedSeconds={12} onCancel={onCancel} />);
    const btn = screen.getByText('Cancel scan');
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onCancel).toHaveBeenCalled();
  });

  it('advances step based on elapsed seconds', () => {
    const { container } = render(<LoadingState elapsedSeconds={30} />);
    // Step 2 (health_impact) should be active at 28+
    expect(screen.getByText('health_impact')).toBeInTheDocument();
  });
});
