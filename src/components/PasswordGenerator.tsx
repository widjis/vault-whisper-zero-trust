
import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Slider,
  Switch,
  Card,
  CardContent,
  CardHeader,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Refresh, ContentCopy } from '@mui/icons-material';
import { generatePassword } from '@/lib/crypto';
import { SecureStorage } from '@/lib/storage';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { useToast } from '@/hooks/use-toast';

interface PasswordGeneratorProps {
  onPasswordGenerated?: (password: string) => void;
  sx?: object;
}

export function PasswordGenerator({ onPasswordGenerated, sx }: PasswordGeneratorProps) {
  const { toast } = useToast();
  const settings = SecureStorage.getSettings();
  
  const [options, setOptions] = useState(settings.passwordGeneratorDefaults);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = () => {
    setError('');
    try {
      const password = generatePassword(options);
      setGeneratedPassword(password);
      onPasswordGenerated?.(password);
      
      // Save preferences
      SecureStorage.setSettings({
        ...settings,
        passwordGeneratorDefaults: options,
      });
    } catch (error) {
      setError('Please select at least one character type.');
    }
  };

  const handleCopy = async () => {
    if (!generatedPassword) return;
    
    try {
      await SecureStorage.copyToClipboard(generatedPassword);
      toast({
        title: 'Password copied',
        description: 'Password copied to clipboard (will clear in 30 seconds).',
      });
    } catch (error) {
      setError('Failed to copy password to clipboard.');
    }
  };

  return (
    <Card sx={{ ...sx }}>
      <CardHeader 
        title="Password Generator"
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Length Slider */}
          <Box>
            <Typography gutterBottom>
              Length: {options.length}
            </Typography>
            <Slider
              value={options.length}
              onChange={(_, value) => setOptions(prev => ({ ...prev, length: value as number }))}
              min={4}
              max={128}
              step={1}
              marks={[
                { value: 4, label: '4' },
                { value: 32, label: '32' },
                { value: 64, label: '64' },
                { value: 128, label: '128' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>

          {/* Character Type Options */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.includeUppercase}
                  onChange={(e) => 
                    setOptions(prev => ({ ...prev, includeUppercase: e.target.checked }))
                  }
                />
              }
              label="Uppercase (A-Z)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={options.includeLowercase}
                  onChange={(e) => 
                    setOptions(prev => ({ ...prev, includeLowercase: e.target.checked }))
                  }
                />
              }
              label="Lowercase (a-z)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={options.includeNumbers}
                  onChange={(e) => 
                    setOptions(prev => ({ ...prev, includeNumbers: e.target.checked }))
                  }
                />
              }
              label="Numbers (0-9)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={options.includeSpecialChars}
                  onChange={(e) => 
                    setOptions(prev => ({ ...prev, includeSpecialChars: e.target.checked }))
                  }
                />
              }
              label="Special Characters"
            />
          </Box>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            variant="contained"
            size="large"
            startIcon={<Refresh />}
            fullWidth
          >
            Generate Password
          </Button>

          {/* Generated Password */}
          {generatedPassword && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                value={generatedPassword}
                InputProps={{
                  readOnly: true,
                  style: { fontFamily: 'monospace' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleCopy} edge="end">
                        <ContentCopy />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                fullWidth
                variant="outlined"
              />
              
              <PasswordStrengthMeter password={generatedPassword} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
