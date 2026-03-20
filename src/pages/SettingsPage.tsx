import { useNavigate } from "react-router-dom";
import { ROUTES, TIMEZONES } from "../constants";
import { useEffect, useState } from "react";
import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "../firebase";
import { AuthService } from "../services/authService";
import { motion } from "framer-motion";
import { 
  User, 
  Building, 
  Shield, 
  Globe, 
  Zap,
  Save,
  ChevronRight,
  Mail,
  Phone,
  Lock,
  Image as ImageIcon,
  Upload,
  Loader2
} from "lucide-react";

import { useToast } from "../components/Toast";

const SettingSection = ({ title, description, children, onSave, isSaving }: any) => (
  <div className="glass-card p-8 space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight">{title}</h3>
        <p className="text-[var(--text-muted)] text-sm mt-1">{description}</p>
      </div>
      <button 
        onClick={onSave}
        disabled={isSaving}
        className="btn-secondary flex items-center space-x-2 py-2 px-4 text-xs"
      >
        <Save className="w-4 h-4" />
        <span>{isSaving ? "Saving..." : "Save Changes"}</span>
      </button>
    </div>
    <div className="h-px bg-[var(--border-main)]" />
    <div className="space-y-6">
      {children}
    </div>
  </div>
);

const InputGroup = ({ label, icon: Icon, type = "text", placeholder, value, onChange }: any) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-[var(--text-muted)] ml-1">{label}</label>
    <div className="relative group">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-[var(--brand-primary)] transition-colors" />
      <input 
        type={type} 
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} 
        className="input-field pl-12"
      />
    </div>
  </div>
);

export default function SettingsPage() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const { showToast } = useToast();
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;

  useEffect(() => {
    async function fetchBusiness() {
      if (!businessId) return;
      try {
        const docRef = doc(db, "businesses", businessId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBusiness(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching business:", error);
        handleFirestoreError(error, OperationType.GET, `businesses/${businessId}`);
      } finally {
        setLoading(false);
      }
    }
    fetchBusiness();
  }, [businessId]);

  const handleSave = async (section: string) => {
    if (!businessId || !business) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, "businesses", businessId);
      await setDoc(docRef, {
        ...business,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast(`${section} settings saved successfully!`, "success");
    } catch (error) {
      console.error("Error saving settings:", error);
      handleFirestoreError(error, OperationType.WRITE, `businesses/${businessId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      showToast("Please enter a new password.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await AuthService.updatePassword(newPassword);
      showToast("Password updated successfully!", "success");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      let message = error.message || "Failed to update password.";
      
      if (message.includes("identitytoolkit.googleapis.com")) {
        message = "The Identity Toolkit API is disabled for this project. Please enable it in the Google Cloud Console to allow password updates.";
      }
      
      showToast(message, "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    showToast("Account deletion is not available in this demo.", "error");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit.", "error");
      return;
    }

    if (type === 'logo') setIsUploadingLogo(true);
    else setIsUploadingBg(true);

    setUploadProgress(prev => ({ ...prev, [type]: 0 }));

    try {
      console.log(`[Upload] Starting client-side upload for ${type}:`, file.name);
      
      const fileName = `businesses/${businessId}/${type}_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(prev => ({ ...prev, [type]: progress }));
        },
        (error) => {
          console.error(`[Upload] Task error for ${type}:`, error);
          showToast(`Upload failed: ${error.message}`, "error");
          if (type === 'logo') setIsUploadingLogo(false);
          else setIsUploadingBg(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log(`[Upload] ${type} success, URL:`, downloadURL);

            const updatedBusiness = {
              ...business,
              [type === 'logo' ? 'logoUrl' : 'backgroundUrl']: downloadURL
            };

            setBusiness(updatedBusiness);
            
            // Save immediately to Firestore
            const docRef = doc(db, "businesses", businessId);
            await setDoc(docRef, {
              ...updatedBusiness,
              updatedAt: serverTimestamp()
            }, { merge: true });

            showToast(`${type === 'logo' ? 'Logo' : 'Background'} uploaded successfully!`, "success");
          } catch (error: any) {
            console.error(`[Upload] Error after completion for ${type}:`, error);
            showToast(`Failed to finalize upload: ${error.message}`, "error");
          } finally {
            if (type === 'logo') setIsUploadingLogo(false);
            else setIsUploadingBg(false);
          }
        }
      );
    } catch (error: any) {
      console.error(`[Upload] Error initiating ${type}:`, error);
      showToast(`Upload failed: ${error.message}`, "error");
      if (type === 'logo') setIsUploadingLogo(false);
      else setIsUploadingBg(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">Settings</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage your account, business, and AI preferences.</p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 rounded-xl">
          <Zap className="w-4 h-4 text-[var(--brand-primary)]" />
          <span className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider">Pro Account</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <SettingSection 
          title="Profile Information" 
          description="Update your personal details and how others see you."
          onSave={() => handleSave("Profile")}
          isSaving={isSaving}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup 
              label="Full Name" 
              icon={User} 
              value={business?.ownerName} 
              onChange={(val: string) => setBusiness({ ...business, ownerName: val })}
            />
            <InputGroup 
              label="Email Address" 
              icon={Mail} 
              value={business?.email} 
              onChange={(val: string) => setBusiness({ ...business, email: val })}
            />
          </div>
        </SettingSection>

        <SettingSection 
          title="Business Settings" 
          description="Configure your business profile and AI receptionist behavior."
          onSave={() => handleSave("Business")}
          isSaving={isSaving}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup 
              label="Business Name" 
              icon={Building} 
              value={business?.name} 
              onChange={(val: string) => setBusiness({ ...business, name: val })}
            />
            <InputGroup 
              label="Phone Number" 
              icon={Phone} 
              value={business?.phone} 
              onChange={(val: string) => setBusiness({ ...business, phone: val })}
            />
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--text-muted)] ml-1">Timezone</label>
              <div className="relative group">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-[var(--brand-primary)] transition-colors" />
                <select 
                  className="input-field pl-12 appearance-none"
                  value={business?.timezone || "UTC"}
                  onChange={(e) => setBusiness({ ...business, timezone: e.target.value })}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>
        </SettingSection>

        <SettingSection 
          title="Branding" 
          description="Customize your business logo and background for shareable links."
          onSave={() => handleSave("Branding")}
          isSaving={isSaving}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo Upload */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-[var(--text-muted)] ml-1">Business Logo</label>
              <div className="relative group aspect-square max-w-[200px] bg-[var(--bg-main)] rounded-2xl border-2 border-dashed border-[var(--border-main)] hover:border-[var(--brand-primary)]/50 transition-all overflow-hidden flex flex-col items-center justify-center text-center p-4">
                {business?.logoUrl ? (
                  <>
                    <img 
                      src={business.logoUrl} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors">
                        <Upload className="w-6 h-6 text-white" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center space-y-2">
                    {isUploadingLogo ? (
                      <div className="flex flex-col items-center space-y-2">
                        <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
                        <span className="text-[10px] text-[var(--brand-primary)] font-bold">{uploadProgress.logo || 0}%</span>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)] font-medium">Upload Logo</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                  </label>
                )}
                {isUploadingLogo && business?.logoUrl && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex flex-col items-center space-y-1">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                      <span className="text-[10px] text-white font-bold">{uploadProgress.logo || 0}%</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Recommended: Square PNG/SVG, min 200x200px.</p>
            </div>

            {/* Background Upload */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-[var(--text-muted)] ml-1">Link Background</label>
              <div className="relative group aspect-video bg-[var(--bg-main)] rounded-2xl border-2 border-dashed border-[var(--border-main)] hover:border-[var(--brand-primary)]/50 transition-all overflow-hidden flex flex-col items-center justify-center text-center p-4">
                {business?.backgroundUrl ? (
                  <>
                    <img 
                      src={business.backgroundUrl} 
                      alt="Background" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors">
                        <Upload className="w-6 h-6 text-white" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'background')} />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center space-y-2">
                    {isUploadingBg ? (
                      <div className="flex flex-col items-center space-y-2">
                        <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
                        <span className="text-[10px] text-[var(--brand-primary)] font-bold">{uploadProgress.background || 0}%</span>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)] font-medium">Upload Background</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'background')} />
                  </label>
                )}
                {isUploadingBg && business?.backgroundUrl && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex flex-col items-center space-y-1">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                      <span className="text-[10px] text-white font-bold">{uploadProgress.background || 0}%</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Recommended: 1920x1080px, max 2MB.</p>
            </div>
          </div>
        </SettingSection>

        <SettingSection 
          title="Botcake Integration" 
          description="Connect your Botcake account to personalize calls for Facebook customers."
          onSave={() => handleSave("Botcake")}
          isSaving={isSaving}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup 
              label="Botcake API Key" 
              icon={Lock} 
              type="password"
              placeholder="Enter your Botcake API Key"
              value={business?.botcakeApiKey} 
              onChange={(val: string) => setBusiness({ ...business, botcakeApiKey: val })}
            />
            <InputGroup 
              label="Botcake Page ID" 
              icon={Globe} 
              placeholder="Enter your Facebook Page ID"
              value={business?.botcakePageId} 
              onChange={(val: string) => setBusiness({ ...business, botcakePageId: val })}
            />
          </div>
          <div className="p-4 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 rounded-xl">
            <p className="text-xs text-[var(--brand-primary)] leading-relaxed">
              <span className="font-bold uppercase tracking-wider mr-2">Tip:</span>
              Use the Botcake-specific link in your Botcake flows to automatically greet customers by their Facebook name. 
              You can find this link in the <span className="font-bold underline cursor-pointer" onClick={() => navigate(ROUTES.LINKS)}>Links</span> section.
            </p>
          </div>
        </SettingSection>

        <SettingSection 
          title="Security" 
          description="Manage your password and account security preferences."
          onSave={handleUpdatePassword}
          isSaving={isUpdatingPassword}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup 
              label="New Password" 
              icon={Lock} 
              type="password" 
              placeholder="••••••••" 
              value={newPassword}
              onChange={setNewPassword}
            />
            <InputGroup 
              label="Confirm New Password" 
              icon={Lock} 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-[var(--bg-main)]/50 border border-[var(--border-main)] rounded-xl">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-[var(--brand-primary)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-main)]">Two-Factor Authentication</p>
                <p className="text-xs text-[var(--text-muted)]">Add an extra layer of security to your account.</p>
              </div>
            </div>
            <button 
              onClick={() => showToast("2FA setup is not implemented in this demo.", "info")}
              className="text-xs font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 transition-colors uppercase tracking-widest"
            >
              Enable
            </button>
          </div>
        </SettingSection>

        <div className="glass-card p-8 border-[var(--color-danger)]/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-[var(--color-danger)] tracking-tight">Danger Zone</h3>
              <p className="text-[var(--text-muted)] text-sm mt-1">Irreversibly delete your account and all associated data.</p>
            </div>
            <button 
              onClick={handleDeleteAccount}
              className="px-6 py-2.5 bg-[var(--color-danger)]/10 hover:bg-[var(--color-danger)]/20 text-[var(--color-danger)] font-semibold rounded-xl transition-all border border-[var(--color-danger)]/20"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
