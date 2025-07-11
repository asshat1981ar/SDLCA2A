import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-cyan-600'); // primary variant by default
  });

  it('renders with primary variant', () => {
    render(<Button variant="primary">Primary Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Primary Button' });
    expect(button).toHaveClass('bg-cyan-600', 'text-white', 'hover:bg-cyan-500');
  });

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Secondary Button' });
    expect(button).toHaveClass('bg-gray-700', 'text-gray-200', 'hover:bg-gray-600');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Custom Button' });
    expect(button).toHaveClass('custom-class');
  });

  it('passes through HTML button attributes', () => {
    render(<Button type="submit" disabled>Submit</Button>);
    
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeDisabled();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    let clicked = false;
    const handleClick = () => { clicked = true; };
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);
    
    expect(clicked).toBe(true);
  });

  it('applies base classes consistently', () => {
    render(<Button>Test Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toHaveClass(
      'px-6',
      'py-2.5',
      'font-bold',
      'rounded-lg',
      'transition-all',
      'duration-200',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'focus:ring-offset-gray-900',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      'text-center'
    );
  });

  it('shows disabled state styling', () => {
    render(<Button disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Disabled Button' });
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    expect(button).toBeDisabled();
  });
});