import React from 'react';
import { Box, Typography, LinearProgress, Tooltip, Chip, useTheme } from '@mui/material';
import { 
  calculatePasswordStrength, 
  strengthLabels, 
  strengthColors,
  PasswordStrength,
  getPasswordFeedback
} from '../../utils/passwordStrength';

interface EnhancedPasswordStrengthMeterProps {
  password: string;
  strength?: number;
  showText?: boolean;
  showFeedback?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'standard' | 'outlined' | 'filled';
}

const EnhancedPasswordStrengthMeter: React.FC<EnhancedPasswordStrengthMeterProps> = ({ 
  password, 
  strength: providedStrength,
  showText = true,
  showFeedback = true,
  size = 'medium',
  variant = 'standard'
}) => {
  const theme = useTheme();
  const strength = providedStrength !== undefined ? providedStrength : calculatePasswordStrength(password);
  const strengthLabel = strengthLabels[strength];
  const strengthColor = strengthColors[strength];
  const feedback = showFeedback ? getPasswordFeedback(password) : [];
  
  // Calculate progress value (0-100)
  const progressValue = ((strength + 1) / Object.keys(PasswordStrength).length * 2) * 100;
  
  // Determine sizes based on the size prop
  const progressHeight = size === 'small' ? 4 : size === 'medium' ? 8 : 10;
  const typographyVariant = size === 'small' ? 'caption' : 'body2';
  const spacing = size === 'small' ? 0.5 : size === 'medium' ? 1 : 1.5;
  
  // Determine styles based on variant
  const progressStyles = {
    standard: {
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
      borderRadius: 4,
    },
    outlined: {
      backgroundColor: 'transparent',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 4,
    },
    filled: {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      borderRadius: 4,
    }
  };
  
  return (
    <Box sx={{ width: '100%', mt: spacing, mb: showFeedback ? spacing * 2 : spacing }}>
      {showText && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: spacing / 2, alignItems: 'center' }}>
          <Typography variant={typographyVariant} color="text.secondary">
            Password Strength
          </Typography>
          {password && (
            <Chip
              label={strengthLabel}
              size={size === 'large' ? 'medium' : 'small'}
              sx={{
                backgroundColor: `${strengthColor}20`, // 20% opacity
                color: strengthColor,
                fontWeight: 'medium',
                height: size === 'small' ? 20 : 'auto',
                '& .MuiChip-label': {
                  px: size === 'small' ? 1 : 1.5,
                }
              }}
            />
          )}
        </Box>
      )}
      
      <Tooltip 
        title={feedback.length > 0 ? feedback.join(' • ') : ''}
        placement="bottom"
        arrow
      >
        <LinearProgress
          variant="determinate"
          value={password ? progressValue : 0}
          sx={{
            height: progressHeight,
            ...progressStyles[variant],
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              backgroundColor: strengthColor,
              transition: theme.transitions.create(['transform', 'background-color'], {
                duration: theme.transitions.duration.standard,
              }),
            },
          }}
        />
      </Tooltip>
      
      {showFeedback && feedback.length > 0 && (
        <Box sx={{ mt: spacing }}>
          <Typography variant={typographyVariant} color="text.secondary">
            Suggestions:
          </Typography>
          <ul style={{ 
            margin: `${theme.spacing(spacing / 2)} 0`, 
            paddingLeft: theme.spacing(3),
          }}>
            {feedback.map((tip, index) => (
              <li key={index}>
                <Typography variant={typographyVariant} color="text.secondary">
                  {tip}
                </Typography>
              </li>
            ))}
          </ul>
        </Box>
      )}
    </Box>
  );
};

export default EnhancedPasswordStrengthMeter;