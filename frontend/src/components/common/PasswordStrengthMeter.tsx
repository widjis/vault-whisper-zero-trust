import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';
import { 
  calculatePasswordStrength, 
  strengthLabels, 
  strengthColors,
  PasswordStrength,
  getPasswordFeedback
} from '../../utils/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
  showFeedback?: boolean;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ 
  password, 
  showFeedback = true 
}) => {
  const strength = calculatePasswordStrength(password);
  const strengthLabel = strengthLabels[strength];
  const strengthColor = strengthColors[strength];
  const feedback = showFeedback ? getPasswordFeedback(password) : [];
  
  // Calculate progress value (0-100)
  const progressValue = ((strength + 1) / Object.keys(PasswordStrength).length * 2) * 100;
  
  return (
    <Box sx={{ width: '100%', mt: 1, mb: showFeedback ? 2 : 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Password Strength
        </Typography>
        <Typography variant="caption" fontWeight="medium" color={strengthColor}>
          {password ? strengthLabel : ''}
        </Typography>
      </Box>
      
      <Tooltip 
        title={feedback.length > 0 ? feedback.join(' • ') : ''}
        placement="bottom"
        arrow
      >
        <LinearProgress
          variant="determinate"
          value={password ? progressValue : 0}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              backgroundColor: strengthColor,
            },
          }}
        />
      </Tooltip>
      
      {showFeedback && feedback.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Suggestions:
          </Typography>
          <ul style={{ margin: '4px 0', paddingLeft: '1.5rem' }}>
            {feedback.map((tip, index) => (
              <li key={index}>
                <Typography variant="caption" color="text.secondary">
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

export default PasswordStrengthMeter;