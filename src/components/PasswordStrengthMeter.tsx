
import { Box, Typography, LinearProgress, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Circle } from '@mui/icons-material';
import { calculatePasswordStrength } from '@/lib/crypto';

interface PasswordStrengthMeterProps {
  password: string;
  sx?: object;
}

export function PasswordStrengthMeter({ password, sx }: PasswordStrengthMeterProps) {
  const { score, feedback } = calculatePasswordStrength(password);
  
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#f44336', '#ff9800', '#ffeb3b', '#2196f3', '#4caf50'];

  if (!password) return null;

  return (
    <Box sx={{ ...sx }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Password Strength
        </Typography>
        <Typography 
          variant="body2" 
          fontWeight="medium"
          sx={{ color: strengthColors[score] }}
        >
          {strengthLabels[score]}
        </Typography>
      </Box>
      
      <LinearProgress 
        variant="determinate" 
        value={(score + 1) * 20}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: strengthColors[score],
            borderRadius: 4,
          },
        }}
      />
      
      {feedback.length > 0 && (
        <List dense sx={{ mt: 1, py: 0 }}>
          {feedback.map((item, index) => (
            <ListItem key={index} sx={{ py: 0, px: 0 }}>
              <ListItemIcon sx={{ minWidth: 16, mr: 1 }}>
                <Circle sx={{ fontSize: 4, color: 'text.secondary' }} />
              </ListItemIcon>
              <ListItemText 
                primary={item}
                primaryTypographyProps={{
                  variant: 'caption',
                  color: 'text.secondary'
                }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
