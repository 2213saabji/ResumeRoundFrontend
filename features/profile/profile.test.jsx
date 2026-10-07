import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ChipInput } from './components/chip-input';
import { buildProfilePatch, firstErrorMessage, profileToForm } from './form-utils';

function Harness({ initial = [], maxItems }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <ChipInput label="Languages" value={value} onChange={setValue} maxItems={maxItems} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

const valueOf = () => JSON.parse(screen.getByTestId('value').textContent);

describe('ChipInput', () => {
  it('adds on Enter and comma, ignoring case-insensitive duplicates', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['Go']} />);
    const input = screen.getByRole('textbox', { name: /Languages/ });

    await user.type(input, 'TypeScript{Enter}');
    await user.type(input, 'go,Rust,');
    expect(valueOf()).toEqual(['Go', 'TypeScript', 'Rust']);
  });

  it('removes with the x button and Backspace on an empty input', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['Go', 'Rust', 'Java']} />);

    await user.click(screen.getByRole('button', { name: 'Remove Rust' }));
    expect(valueOf()).toEqual(['Go', 'Java']);

    await user.type(screen.getByRole('textbox', { name: /Languages/ }), '{Backspace}');
    expect(valueOf()).toEqual(['Go']);
  });

  it('enforces the item limit', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['a']} maxItems={2} />);
    await user.type(screen.getByRole('textbox', { name: /Languages/ }), 'b{Enter}');
    expect(valueOf()).toEqual(['a', 'b']);
    expect(screen.getByRole('textbox', { name: /Languages/ })).toBeDisabled();
  });
});

describe('profile form utils', () => {
  const profile = {
    id: 'p1',
    experienceYears: null,
    seniority: null,
    domain: null,
    skills: { languages: ['TS'], frameworks: [], databases: [], cloud: [] },
    projects: [{ name: 'Pay', technologies: ['Node'], description: 'x', scaleSignals: [] }],
  };

  it('fills nulls with editable defaults and every skill bucket', () => {
    const form = profileToForm(profile, 'sde2');
    expect(form).toMatchObject({ experienceYears: 0, seniority: 'sde2', domain: '' });
    expect(form.skills.architecture).toEqual([]);
  });

  it('sends only changed top-level sections, each in full', () => {
    const values = { ...profileToForm(profile, 'sde2'), experienceYears: 4 };
    const patch = buildProfilePatch(values, {
      experienceYears: true,
      skills: { languages: [true] },
    });
    expect(Object.keys(patch).sort()).toEqual(['experienceYears', 'skills']);
    expect(Object.keys(patch.skills)).toHaveLength(5);
  });

  it('finds the first nested error message', () => {
    expect(firstErrorMessage({ 2: { message: 'Too long' } })).toBe('Too long');
    expect(firstErrorMessage(undefined)).toBeUndefined();
  });
});
