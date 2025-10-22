'use client';

import {useState} from 'react';
import {Palette, Type, Layout, Code, Save, RotateCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Card} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Separator} from '@/components/ui/separator';
import type {ThemeSettings} from '@/lib/types';

export default function AppearancePage() {
  const [saving, setSaving] = useState(false);

  // Theme state
  const [primaryFont, setPrimaryFont] = useState('Inter');
  const [secondaryFont, setSecondaryFont] = useState('Playfair Display');
  const [primaryColor, setPrimaryColor] = useState('#77B5FE');
  const [secondaryColor, setSecondaryColor] = useState('#4682B4');
  const [accentColor, setAccentColor] = useState('#F0F8FF');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [textColor, setTextColor] = useState('#000000');
  const [linkColor, setLinkColor] = useState('#77B5FE');
  const [headerStyle, setHeaderStyle] = useState<'minimal' | 'classic' | 'modern'>('modern');
  const [footerStyle, setFooterStyle] = useState<'simple' | 'detailed'>('detailed');
  const [customCSS, setCustomCSS] = useState('');
  const [customJS, setCustomJS] = useState('');

  const handleSave = async () => {
    setSaving(true);

    try {
      const themeSettings: ThemeSettings = {
        primaryFont,
        secondaryFont,
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        textColor,
        linkColor,
        headerStyle,
        footerStyle,
        customCSS,
        customJS,
      };

      // TODO: Save to Firestore
      console.log('Saving theme settings:', themeSettings);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert('Theme settings saved successfully!');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default theme settings?')) {
      setPrimaryFont('Inter');
      setSecondaryFont('Playfair Display');
      setPrimaryColor('#77B5FE');
      setSecondaryColor('#4682B4');
      setAccentColor('#F0F8FF');
      setBackgroundColor('#FFFFFF');
      setTextColor('#000000');
      setLinkColor('#77B5FE');
      setHeaderStyle('modern');
      setFooterStyle('detailed');
      setCustomCSS('');
      setCustomJS('');
    }
  };

  const ColorPicker = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div
          className="w-12 h-10 rounded border cursor-pointer"
          style={{backgroundColor: value}}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = value;
            input.onchange = (e) => onChange((e.target as HTMLInputElement).value);
            input.click();
          }}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appearance</h1>
          <p className="text-muted-foreground mt-1">
            Customize your site's look and feel
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="colors">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="typography">
            <Type className="h-4 w-4 mr-2" />
            Typography
          </TabsTrigger>
          <TabsTrigger value="layout">
            <Layout className="h-4 w-4 mr-2" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Code className="h-4 w-4 mr-2" />
            Custom Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Color Scheme</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ColorPicker
                label="Primary Color"
                value={primaryColor}
                onChange={setPrimaryColor}
              />
              <ColorPicker
                label="Secondary Color"
                value={secondaryColor}
                onChange={setSecondaryColor}
              />
              <ColorPicker label="Accent Color" value={accentColor} onChange={setAccentColor} />
              <ColorPicker
                label="Background Color"
                value={backgroundColor}
                onChange={setBackgroundColor}
              />
              <ColorPicker label="Text Color" value={textColor} onChange={setTextColor} />
              <ColorPicker label="Link Color" value={linkColor} onChange={setLinkColor} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Preview</h3>
            <div
              className="p-8 rounded-lg"
              style={{
                backgroundColor: backgroundColor,
                color: textColor,
              }}
            >
              <h2
                className="text-3xl font-bold mb-4"
                style={{fontFamily: secondaryFont, color: primaryColor}}
              >
                Sample Heading
              </h2>
              <p className="mb-4" style={{fontFamily: primaryFont}}>
                This is a sample paragraph to preview your color scheme. You can see how your
                chosen colors work together.
              </p>
              <a href="#" style={{color: linkColor, textDecoration: 'underline'}}>
                Sample Link
              </a>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Font Settings</h3>
            <div className="space-y-4">
              <div>
                <Label>Primary Font (Body Text)</Label>
                <Select value={primaryFont} onValueChange={setPrimaryFont}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Open Sans">Open Sans</SelectItem>
                    <SelectItem value="Lato">Lato</SelectItem>
                    <SelectItem value="PT Sans">PT Sans</SelectItem>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Secondary Font (Headings)</Label>
                <Select value={secondaryFont} onValueChange={setSecondaryFont}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                    <SelectItem value="Merriweather">Merriweather</SelectItem>
                    <SelectItem value="Lora">Lora</SelectItem>
                    <SelectItem value="Montserrat">Montserrat</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                    <SelectItem value="Raleway">Raleway</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Typography Preview</h3>
            <div className="space-y-4">
              <div>
                <h1 className="text-4xl font-bold" style={{fontFamily: secondaryFont}}>
                  Heading 1
                </h1>
              </div>
              <div>
                <h2 className="text-3xl font-semibold" style={{fontFamily: secondaryFont}}>
                  Heading 2
                </h2>
              </div>
              <div>
                <h3 className="text-2xl font-semibold" style={{fontFamily: secondaryFont}}>
                  Heading 3
                </h3>
              </div>
              <div>
                <p className="text-base" style={{fontFamily: primaryFont}}>
                  This is a paragraph of body text using your primary font. Lorem ipsum dolor sit
                  amet, consectetur adipiscing elit.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Header Style</h3>
            <Select
              value={headerStyle}
              onValueChange={(v) => setHeaderStyle(v as 'minimal' | 'classic' | 'modern')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              Choose how your site header appears
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Footer Style</h3>
            <Select
              value={footerStyle}
              onValueChange={(v) => setFooterStyle(v as 'simple' | 'detailed')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              Choose the footer layout for your site
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Custom CSS</h3>
            <Textarea
              value={customCSS}
              onChange={(e) => setCustomCSS(e.target.value)}
              placeholder="/* Add your custom CSS here */&#10;.my-custom-class {&#10;  color: red;&#10;}"
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Add custom CSS to override default styles. Use with caution.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Custom JavaScript</h3>
            <Textarea
              value={customJS}
              onChange={(e) => setCustomJS(e.target.value)}
              placeholder="// Add your custom JavaScript here&#10;console.log('Custom JS loaded');"
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Add custom JavaScript for advanced functionality. Use with extreme caution.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
