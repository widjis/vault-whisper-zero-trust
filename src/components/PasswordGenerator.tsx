
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, RefreshCw } from 'lucide-react';
import { generatePassword } from '@/lib/crypto';
import { SecureStorage } from '@/lib/storage';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { useToast } from '@/hooks/use-toast';

interface PasswordGeneratorProps {
  onPasswordGenerated?: (password: string) => void;
  className?: string;
}

export function PasswordGenerator({ onPasswordGenerated, className }: PasswordGeneratorProps) {
  const { toast } = useToast();
  const settings = SecureStorage.getSettings();
  
  const [options, setOptions] = useState(settings.passwordGeneratorDefaults);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const handleGenerate = () => {
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
      toast({
        title: 'Generation failed',
        description: 'Please select at least one character type.',
        variant: 'destructive',
      });
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
      toast({
        title: 'Copy failed',
        description: 'Failed to copy password to clipboard.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Password Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Length Slider */}
        <div className="space-y-2">
          <Label>Length: {options.length}</Label>
          <Slider
            value={[options.length]}
            onValueChange={([value]) => setOptions(prev => ({ ...prev, length: value }))}
            min={4}
            max={128}
            step={1}
            className="w-full"
          />
        </div>

        {/* Character Type Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="uppercase">Uppercase (A-Z)</Label>
            <Switch
              id="uppercase"
              checked={options.includeUppercase}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, includeUppercase: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="lowercase">Lowercase (a-z)</Label>
            <Switch
              id="lowercase"
              checked={options.includeLowercase}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, includeLowercase: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="numbers">Numbers (0-9)</Label>
            <Switch
              id="numbers"
              checked={options.includeNumbers}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, includeNumbers: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="special">Special Characters</Label>
            <Switch
              id="special"
              checked={options.includeSpecialChars}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, includeSpecialChars: checked }))
              }
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button onClick={handleGenerate} className="w-full" size="lg">
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Password
        </Button>

        {/* Generated Password */}
        {generatedPassword && (
          <div className="space-y-4">
            <div className="relative">
              <Input
                value={generatedPassword}
                readOnly
                className="font-mono pr-10"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={handleCopy}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            
            <PasswordStrengthMeter password={generatedPassword} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
