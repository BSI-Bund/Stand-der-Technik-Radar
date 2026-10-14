import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary';
};
/** Native KERN markup, with state and event handling owned by React. */
export function Button({
  children,
  className = '',
  variant = 'secondary',
  type = 'button',
  ...props
}: Props) {
  return (
    <button type={type} className={`kern-btn kern-btn--${variant} ${className}`} {...props}>
      <span className="kern-label">{children}</span>
    </button>
  );
}
