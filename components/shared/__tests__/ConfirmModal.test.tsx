import ConfirmModal from '../ConfirmModal';

describe('ConfirmModal (lightweight checks)', () => {
  it('is a component function', () => {
    expect(typeof ConfirmModal).toBe('function');
  });

  it('accepts input props without throwing', () => {
    // we can't render DOM here (no testing-library), but ensure the function
    // accepts the input props and returns something renderable (JSX)
    const props: any = {
      isOpen: false,
      onConfirm: () => {},
      onCancel: () => {},
      showInput: true,
      inputLabel: 'Days',
      inputValue: '7',
      onInputChange: () => {},
    };

    // calling the component function should not throw synchronously
    expect(() => ConfirmModal(props)).not.toThrow();
  });
});
