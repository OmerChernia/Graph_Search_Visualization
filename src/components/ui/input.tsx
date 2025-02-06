export function Input({
    type = 'text',
    value,
    onChange,
    className = '',
    min,
  }: {
    type?: string,
    value?: string | number,
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void,
    className?: string,
    min?: string | number,
  }) {
    return (
      <input
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        className={`border rounded px-3 py-2 ${className}`}
      />
    );
  }