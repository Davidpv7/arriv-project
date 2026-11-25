import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DesignSystemScreen from '../../../app/ds';

import { Button } from './Button';
import { DepartureRow } from './DepartureBoard';
import { TabBar, type TabKey } from './TabBar';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const withSafeArea = (ui: ReactElement) => (
  <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>
);

describe('DS screen', () => {
  it('renders every component section', async () => {
    await render(withSafeArea(<DesignSystemScreen />));
    for (const title of [
      'Colours',
      'Type',
      'Buttons',
      'Inputs',
      'Stamps',
      'Postmarks',
      'Boarding pass',
      'Postcard',
      'Departures board',
      'Luggage tags',
      'Notice',
      'Tab bar',
    ]) {
      expect(screen.getByRole('header', { name: title })).toBeTruthy();
    }
    expect(screen.getByText('Ana Costa')).toBeTruthy();
    expect(screen.getByText('Customs notice')).toBeTruthy();
  });

  it('toggles a like on the postcard', async () => {
    await render(withSafeArea(<DesignSystemScreen />));
    await fireEvent.press(screen.getByLabelText('Like. 48 likes'));
    expect(screen.getByLabelText('Like. 49 likes')).toBeTruthy();
  });

  it('shows a validation error for a bad handle', async () => {
    await render(withSafeArea(<DesignSystemScreen />));
    expect(screen.getByText('Use 3–20 letters, numbers or _')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Handle'), 'ana_costa');
    expect(screen.queryByText('Use 3–20 letters, numbers or _')).toBeNull();
  });
});

describe('Button', () => {
  it('calls onPress and is not pressable while loading', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button label="Join" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Join' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<Button label="Join" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole('button', { name: 'Join' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('DepartureRow', () => {
  it('truncates names longer than 20 characters but keeps the full name for screen readers', async () => {
    await render(
      <DepartureRow
        name="Student Visa 500 Crew Australia"
        gate="AU"
        joined={false}
        statusLabel="BOARD"
      />,
    );
    expect(screen.getByText('Student Visa 500 Cr…')).toBeTruthy();
    expect(screen.getByLabelText('Student Visa 500 Crew Australia, AU, BOARD')).toBeTruthy();
  });
});

describe('TabBar', () => {
  it('reports presses and marks the active tab', async () => {
    const onPress = jest.fn();
    const labels: Record<TabKey, string> = {
      home: 'Home',
      communities: 'Communities',
      create: 'Create',
      chat: 'Chat',
      backpack: 'My Backpack',
    };
    await render(withSafeArea(<TabBar active="chat" labels={labels} onPress={onPress} />));
    await fireEvent.press(screen.getByLabelText('Create'));
    expect(onPress).toHaveBeenCalledWith('create');
    expect(screen.getByRole('tab', { name: 'Chat' })).toHaveProp('accessibilityState', {
      selected: true,
    });
  });
});
