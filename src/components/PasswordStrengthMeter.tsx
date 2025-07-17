
import { Progress } from '@/components/ui/progress';
import { calculatePasswordStrength } from '@/lib/crypto';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { score, feedback } = calculatePasswordStrength(password);
  
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'text-red-600',
    'text-orange-600', 
    'text-yellow-600',
    'text-blue-600',
    'text-green-600'
  ];

  if (!password) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password Strength</span>
        <span className={cn('text-sm font-medium', strengthColors[score])}>
          {strengthLabels[score]}
        </span>
      </div>
      
      <Progress 
        value={(score + 1) * 20} 
        className={cn('h-2', `password-strength-${score}`)}
      />
      
      {feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {feedback.map((item, index) => (
            <li key={index} className="flex items-center">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mr-2" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
