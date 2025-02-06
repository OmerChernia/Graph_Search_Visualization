export function Button({ 
    children, 
    onClick, 
    disabled, 
    className = '' 
  }: { 
    children: React.ReactNode, 
    onClick?: () => void, 
    disabled?: boolean,
    className?: string 
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {children}
      </button>
    );
  }