import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, User, FileText, Loader2, CheckCircle, AlertTriangle, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  onSuccess: () => void;
}

export const VerificationModal = ({ isOpen, onClose, workerId, onSuccess }: VerificationModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [aadhaarCard, setAadhaarCard] = useState<File | null>(null);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a JPG, JPEG, or PNG image.',
          variant: 'destructive',
        });
        return;
      }
      
      setProfilePicture(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setProfilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a JPG, JPEG, PNG, or PDF file.',
          variant: 'destructive',
        });
        return;
      }
      
      setAadhaarCard(file);
    }
  };

  const handleSubmit = async () => {
    if (!profilePicture || !aadhaarCard) {
      toast({
        title: 'Missing Documents',
        description: 'Please upload both your profile picture and Aadhaar card.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload profile picture
      const profileExt = profilePicture.name.split('.').pop();
      const profileFileName = `profile-${workerId}-${Date.now()}.${profileExt}`;
      
      const { error: profileUploadError } = await supabase.storage
        .from('worker-documents')
        .upload(profileFileName, profilePicture);

      if (profileUploadError) {
        throw new Error('Failed to upload profile picture');
      }

      // Upload Aadhaar card
      const aadhaarExt = aadhaarCard.name.split('.').pop();
      const aadhaarFileName = `aadhaar-${workerId}-${Date.now()}.${aadhaarExt}`;
      
      const { error: aadhaarUploadError } = await supabase.storage
        .from('worker-documents')
        .upload(aadhaarFileName, aadhaarCard);

      if (aadhaarUploadError) {
        throw new Error('Failed to upload Aadhaar card');
      }

      // Update worker record with document URLs and set status to pending_verification
      const { error: updateError } = await supabase
        .from('workers')
        .update({
          id_proof_url: aadhaarFileName,
          status: 'pending_verification',
          updated_at: new Date().toISOString()
        })
        .eq('id', workerId);

      if (updateError) throw updateError;

      toast({
        title: 'Verification Submitted!',
        description: 'Your documents have been uploaded. You will be notified once verified.',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !uploading && onClose()}>
      <DialogContent className="sm:max-w-md relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={uploading}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {t('completeVerification')}
          </DialogTitle>
          <DialogDescription>
            {t('uploadDocuments')}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 py-4"
        >
          {/* Profile Picture Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              Profile Picture *
            </Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                {profilePreview ? (
                  <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  id="profile-picture"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                  disabled={uploading}
                />
                <label htmlFor="profile-picture">
                  <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {profilePicture ? 'Change Photo' : 'Upload Photo'}
                    </span>
                  </Button>
                </label>
                {profilePicture && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {profilePicture.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, JPEG, or PNG only
                </p>
              </div>
            </div>
          </div>

          {/* Aadhaar Card Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Aadhaar Card *
            </Label>
            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
              <input
                type="file"
                id="aadhaar-card"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleAadhaarChange}
                className="hidden"
                disabled={uploading}
              />
              <label htmlFor="aadhaar-card" className="cursor-pointer">
                {aadhaarCard ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{aadhaarCard.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload your Aadhaar Card
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, JPEG, PNG or PDF (max 5MB)
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            className="w-full"
            size="lg"
            disabled={uploading || !profilePicture || !aadhaarCard}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Submit for Verification'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your documents will be reviewed within 24-48 hours.
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
