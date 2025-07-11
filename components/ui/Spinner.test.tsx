import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Spinner from './Spinner';

describe('Spinner Component', () => {
  it('renders spinner with correct styling', () => {
    render(<Spinner />);
    
    const spinner = screen.getByRole('generic');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass(
      'w-8',
      'h-8',
      'border-4',
      'border-t-cyan-500',
      'border-r-cyan-500',
      'border-b-cyan-500',
      'border-l-transparent',
      'rounded-full',
      'animate-spin'
    );
  });

  it('has correct dimensions', () => {
    render(<Spinner />);
    
    const spinner = screen.getByRole('generic');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('has spinning animation', () => {
    render(<Spinner />);
    
    const spinner = screen.getByRole('generic');
    expect(spinner).toHaveClass('animate-spin');
  });

  it('has correct border colors for spinning effect', () => {
    render(<Spinner />);
    
    const spinner = screen.getByRole('generic');
    expect(spinner).toHaveClass(
      'border-t-cyan-500',
      'border-r-cyan-500', 
      'border-b-cyan-500',
      'border-l-transparent'
    );
  });
});