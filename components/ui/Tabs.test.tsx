
import { render, fireEvent } from '@testing-library/react';
import Tabs from './Tabs';

describe('Tabs', () => {
  const tabs = [
    { label: 'Tab 1', content: <div>Tab 1 Content</div> },
    { label: 'Tab 2', content: <div>Tab 2 Content</div> },
  ];

  it('renders the first tab by default', () => {
    const { getByText } = render(<Tabs tabs={tabs} />);
    expect(getByText('Tab 1 Content')).toBeInTheDocument();
  });

  it('switches to the second tab on click', () => {
    const { getByText } = render(<Tabs tabs={tabs} />);
    fireEvent.click(getByText('Tab 2'));
    expect(getByText('Tab 2 Content')).toBeInTheDocument();
  });
});
