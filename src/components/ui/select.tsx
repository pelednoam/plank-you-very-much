"use client"

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    // Basic styles, mimicking Input
    const baseStyles =
      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

    const combinedClassName = `${baseStyles} ${className || ''}`.trim();

    return (
      <select
        className={combinedClassName}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

// Basic Option component for convenience
interface SelectOptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

const SelectOption: React.FC<SelectOptionProps> = (props) => {
  return <option {...props} />;
};

export { Select, SelectOption };
export type { SelectProps, SelectOptionProps };
