import React, { useState } from 'react';
import { Coin } from '@coin-collecting/shared';
import ValueResearchModal from './ValueResearchModal';
import SeriesAutocomplete from './SeriesAutocomplete';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface CoinFormProps {
  onSubmit: (coin: Partial<Coin>) => void;
  initialData?: Partial<Coin>;
  isEditing?: boolean;
}

const CoinForm: React.FC<CoinFormProps> = ({ onSubmit, initialData, isEditing }) => {
  const [formData, setFormData] = useState<Partial<Coin>>(initialData || {
    denomination: '',
    title: '',
    year: new Date().getFullYear(),
    mintMark: '',
    grade: '',
    obverseImage: '',
    reverseImage: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    country: '',
  });
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (side: 'obverse' | 'reverse') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        [side === 'obverse' ? 'obverseImage' : 'reverseImage']: imageUrl
      }));
    }
  };

  const handleImageRemove = (side: 'obverse' | 'reverse') => {
    const key = side === 'obverse' ? 'obverseImage' : 'reverseImage';
    const currentUrl = formData[key];
    if (currentUrl && currentUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentUrl);
    }
    setFormData(prev => ({ ...prev, [key]: '' }));
    // Reset the file input so the same file can be re-selected
    const inputId = side === 'obverse' ? 'obverseImage' : 'reverseImage';
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) input.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                name="title"
                value={formData.title || ''}
                onChange={handleChange}
                placeholder="e.g., 1964 Kennedy Half Dollar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="denomination">Denomination</Label>
              <Input
                id="denomination"
                type="text"
                name="denomination"
                value={formData.denomination || ''}
                onChange={handleChange}
                placeholder="e.g., Half Dollar"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                type="text"
                name="country"
                value={formData.country || ''}
                onChange={handleChange}
                placeholder="e.g., United States"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                name="year"
                value={formData.year || ''}
                onChange={handleChange}
                required
              />
            </div>

            {/* Series Autocomplete - Full width */}
            <div className="md:col-span-2 space-y-2">
              <Label>
                Series (Optional)
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {formData.country && formData.denomination ? '- Suggestions based on country and denomination' : '- Enter country and denomination for suggestions'}
                </span>
              </Label>
              <SeriesAutocomplete
                country={formData.country || undefined}
                denomination={formData.denomination || undefined}
                value={formData.series || ''}
                onChange={(series) => setFormData(prev => ({ ...prev, series }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Grading & Condition */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Grading & Condition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="mintMark">Mint Mark</Label>
              <Input
                id="mintMark"
                type="text"
                name="mintMark"
                value={formData.mintMark || ''}
                onChange={handleChange}
                placeholder="e.g., D"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Input
                id="grade"
                type="text"
                name="grade"
                value={formData.grade || ''}
                onChange={handleChange}
                placeholder="e.g., MS-65"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Valuation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Valuation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="faceValue">Face Value</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="faceValue"
                  type="number"
                  name="faceValue"
                  value={formData.faceValue || ''}
                  onChange={handleChange}
                  className="pl-8"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="purchasePrice"
                  type="number"
                  name="purchasePrice"
                  value={formData.purchasePrice || ''}
                  onChange={handleChange}
                  className="pl-8"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Date Acquired</Label>
              <Input
                id="purchaseDate"
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate || ''}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentMarketValue">Current Market Value</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="currentMarketValue"
                  type="number"
                  name="currentMarketValue"
                  value={formData.currentMarketValue || ''}
                  onChange={handleChange}
                  className="pl-8"
                  step="0.01"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsResearchModalOpen(true)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Coin Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Coin Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="obverseImage">Obverse (Front) Image</Label>
              <Input
                id="obverseImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange('obverse')}
              />
              {formData.obverseImage && (
                <div className="mt-2 relative w-32 h-32">
                  <img src={formData.obverseImage} alt="Obverse" className="w-32 h-32 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => handleImageRemove('obverse')}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reverseImage">Reverse (Back) Image</Label>
              <Input
                id="reverseImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange('reverse')}
              />
              {formData.reverseImage && (
                <div className="mt-2 relative w-32 h-32">
                  <img src={formData.reverseImage} alt="Reverse" className="w-32 h-32 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => handleImageRemove('reverse')}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              className="min-h-[128px]"
              placeholder="Add any additional notes about the coin..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button type="submit">
          {isEditing ? 'Update Coin' : 'Add Coin'}
        </Button>
      </div>

      <ValueResearchModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
        onValueSelect={(value) => {
          setFormData(prev => ({ ...prev, currentMarketValue: value }));
          setIsResearchModalOpen(false);
        }}
        coinInfo={{
          denomination: formData.denomination || '',
          year: formData.year || 0,
          mintMark: formData.mintMark || '',
          grade: formData.grade || ''
        }}
      />
    </form>
  );
};

export default CoinForm;
