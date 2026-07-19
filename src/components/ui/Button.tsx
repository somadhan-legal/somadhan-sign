import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { buttonStyles } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonStyles({ variant, size, className })}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
export default Button
