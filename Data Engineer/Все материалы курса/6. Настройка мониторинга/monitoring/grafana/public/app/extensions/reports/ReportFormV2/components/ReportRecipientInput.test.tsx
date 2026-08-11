import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReportRecipientInput } from './ReportRecipientInput';

describe('ReportRecipientInput', () => {
  it('removes recipient when clicking on remove button', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ReportRecipientInput onChange={onChange} recipients={['one@example.com', 'two@example.com']} />);

    await user.click(await screen.findByRole('button', { name: /Remove recipient: one@example.com/i }));

    expect(onChange).toHaveBeenCalledWith(['two@example.com']);
  });

  it('does NOT remove recipient when clicking on remove button when disabled', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ReportRecipientInput onChange={onChange} recipients={['one@example.com', 'two@example.com']} disabled />);

    await user.click(await screen.findByRole('button', { name: /Remove recipient: one@example.com/i }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds recipient when pressing Enter', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ReportRecipientInput onChange={onChange} recipients={[]} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'new@example.com{enter}');

    expect(onChange).toHaveBeenCalledWith(['new@example.com']);
  });

  it('adds recipient when clicking Add button', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ReportRecipientInput onChange={onChange} recipients={[]} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'new@example.com');
    await user.click(screen.getByRole('button', { name: /Add/i }));

    expect(onChange).toHaveBeenCalledWith(['new@example.com']);
  });

  it('adds recipient on blur when addOnBlur is enabled', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ReportRecipientInput onChange={onChange} recipients={[]} addOnBlur />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'new@example.com');
    await user.tab(); // triggers blur

    expect(onChange).toHaveBeenCalledWith(['new@example.com']);
  });

  it('does not add duplicate recipients', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ReportRecipientInput onChange={onChange} recipients={['existing@example.com']} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'existing@example.com{enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  // Regression test due to prior usage of the TagsInput component: ensure very long email addresses can be entered
  it('allows entering very long email addresses', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ReportRecipientInput onChange={onChange} recipients={[]} />);

    // Create a very longemail address
    const longLocalPart = 'a'.repeat(200);
    const longEmail = `${longLocalPart}@verylongdomainname.example.com`;
    expect(longEmail.length).toBeGreaterThanOrEqual(200);

    const input = screen.getByRole('textbox');
    await user.type(input, longEmail);

    // Verify the Add button is enabled (not disabled due to length)
    const addButton = screen.getByRole('button', { name: /Add/i });
    expect(addButton).not.toBeDisabled();

    await user.click(addButton);

    expect(onChange).toHaveBeenCalledWith([longEmail]);
  });
});
