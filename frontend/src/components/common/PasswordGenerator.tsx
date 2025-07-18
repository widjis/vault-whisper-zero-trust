import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Slider,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { generatePassword } from '../../utils/passwordStrength';
import { useClipboard } from '../../hooks';

interface PasswordGeneratorProps {
  onSelectPassword?: (password: string) => void;
  initialLength?: number;
  standalone?: boolean;
}

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  onSelectPassword,
  initialLength = 16,
  standalone = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { copyToClipboard, copied } = useClipboard();
  
  const [password, setPassword] = useState('');
  const [passwordLength, setPasswordLength] = useState(initialLength);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  
  // Generate password on initial render and when options change
  useEffect(() => {
    generateNewPassword();
  }, [passwordLength, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);
  
  const generateNewPassword = () => {
    const newPassword = generatePassword({
      length: passwordLength,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols
    });
    setPassword(newPassword);
  };
  
  const handleCopyPassword = () => {
    copyToClipboard(password);
  };
  
  const handleUsePassword = () => {
    if (onSelectPassword) {
      onSelectPassword(password);
    }
  };
  
  const handleLengthChange = (_event: Event, newValue: number | number[]) => {
    setPasswordLength(newValue as number);
  };
  
  const content = (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          value={password}
          label="Generated Password"
          variant="outlined"
          InputProps={{
            readOnly: true,
            endAdornment: (
              <Box sx={{ display: 'flex' }}>
                <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                  <IconButton onClick={handleCopyPassword} edge="end">
                    {copied ? <CheckCircleOutlineIcon color="success" /> : <ContentCopyIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Generate new password">
                  <IconButton onClick={generateNewPassword} edge="end">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            ),
          }}
        />
      </Box>
      
      <PasswordStrengthMeter password={password} />
      
      <Box sx={{ mt: 3 }}>
        <Typography gutterBottom>Password Length: {passwordLength}</Typography>
        <Slider
          value={passwordLength}
          onChange={handleLengthChange}
          aria-labelledby="password-length-slider"
          valueLabelDisplay="auto"
          step={1}
          marks
          min={8}
          max={32}
        />
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <Typography gutterBottom>Character Types:</Typography>
        <FormGroup row={!isMobile}>
          <FormControlLabel
            control={
              <Checkbox 
                checked={includeUppercase} 
                onChange={(e) => setIncludeUppercase(e.target.checked)}
                disabled={!includeLowercase && !includeNumbers && !includeSymbols}
              />
            }
            label="Uppercase (A-Z)"
          />
          <FormControlLabel
            control={
              <Checkbox 
                checked={includeLowercase} 
                onChange={(e) => setIncludeLowercase(e.target.checked)}
                disabled={!includeUppercase && !includeNumbers && !includeSymbols}
              />
            }
            label="Lowercase (a-z)"
          />
          <FormControlLabel
            control={
              <Checkbox 
                checked={includeNumbers} 
                onChange={(e) => setIncludeNumbers(e.target.checked)}
                disabled={!includeUppercase && !includeLowercase && !includeSymbols}
              />
            }
            label="Numbers (0-9)"
          />
          <FormControlLabel
            control={
              <Checkbox 
                checked={includeSymbols} 
                onChange={(e) => setIncludeSymbols(e.target.checked)}
                disabled={!includeUppercase && !includeLowercase && !includeNumbers}
              />
            }
            label="Symbols (!@#$%)"
          />
        </FormGroup>
      </Box>
      
      {onSelectPassword && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleUsePassword}
          >
            Use This Password
          </Button>
        </Box>
      )}
    </Box>
  );
  
  if (standalone) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          maxWidth: 600, 
          mx: 'auto',
          mt: 4,
          borderRadius: 2
        }}
      >
        <Typography variant="h5" component="h2" gutterBottom>
          Password Generator
        </Typography>
        <Divider sx={{ mb: 3 }} />
        {content}
      </Paper>
    );
  }
  
  return content;
};

export default PasswordGenerator;