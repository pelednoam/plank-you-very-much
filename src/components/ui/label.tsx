"use client"

import React from 'react';

interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    // Basic styles
    const baseStyles = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

    const combinedClassName = `${baseStyles} ${className || ''}`.trim();

    return (
      <label
        ref={ref}
        className={combinedClassName}
        {...props}
      />
    );
  }
);
Label.displayName = 'Label';

export { Label };
export type { LabelProps };
