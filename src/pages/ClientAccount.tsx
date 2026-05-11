import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Lock, Shield, Moon, Sun, ChevronRight, LogOut, Camera,
  Phone, Mail, Check, X, Plus, Trash2, Car, Heart, MapPin,
  Briefcase, Home, FileText, CreditCard, Package, Eye, EyeOff,
  AlertCircle, CheckCircle, Clock,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { api, uploadBinary } from '../lib/api';
import { useTheme } from '../ThemeContext';
import { cn } from '../lib/utils';

// ─── static legal content ──────────────────────────────────────────────────

const TERMS_CONTENT = `
**Terms and Conditions – Neighborly Platform**
*Effective date: January 1, 2025*

**1. Acceptance**
By creating a Neighborly account or using our services you agree to these Terms. If you do not agree, please do not use the platform.

**2. Description of Service**
Neighborly is a local-services marketplace that connects customers ("Customers") with independent service providers ("Providers"). We provide the technology platform only; we are not a party to any service agreement between Customer and Provider.

**3. Eligibility**
You must be at least 18 years old and legally capable of entering binding contracts to use Neighborly. Accounts are personal and non-transferable.

**4. Account Security**
You are responsible for keeping your credentials secure. Notify us immediately at support@neighborly.app if you suspect unauthorized access. We are not liable for losses arising from your failure to protect your account.

**5. Payments & Fees**
Service fees are agreed between Customer and Provider. Neighborly may charge a platform fee disclosed at checkout. All payments are processed by our third-party payment partners and are subject to their terms.

**6. Cancellations & Refunds**
Cancellation and refund policies are set per order. Please review the Provider's policy before booking. Disputes may be escalated through the Neighborly resolution centre.

**7. Prohibited Conduct**
You may not use Neighborly to: violate any law; transmit harmful or offensive content; attempt to circumvent the platform; solicit Providers off-platform to avoid fees; or engage in fraud or misrepresentation.

**8. Limitation of Liability**
To the maximum extent permitted by law, Neighborly's total liability arising out of or in connection with these Terms shall not exceed the amount paid by you in the three months preceding the claim.

**9. Changes to Terms**
We may update these Terms with 14 days' notice. Continued use of the platform after notice constitutes acceptance.

**10. Governing Law**
These Terms are governed by the laws of the jurisdiction in which Neighborly operates. Disputes shall be resolved by binding arbitration where permitted.

For questions contact: legal@neighborly.app
`;

const RULES_CONTENT = `
**Community Rules – Neighborly Platform**
*Last updated: January 1, 2025*

Neighborly is built on trust between neighbors. These rules apply to all users.

**1. Be Respectful**
Treat every person on the platform — Customers, Providers, and staff — with courtesy and respect. Harassment, discrimination, or abusive language will result in immediate account suspension.

**2. Be Honest**
Provide accurate information in your profile, order requests, and reviews. Misleading information, fake reviews, and identity fraud are grounds for permanent removal.

**3. Safety First**
Do not share personal financial details (bank numbers, PINs) through the chat. All payments must go through the Neighborly checkout. Off-platform cash deals are not protected by our guarantee.

**4. Keep Appointments**
If you book a service, be present and prepared. If you need to cancel, do so at least 24 hours in advance. Repeated no-shows may restrict your ability to book.

**5. Protect Privacy**
Do not photograph, record, or share personal information about other users without explicit consent. Respect the privacy of your neighbors.

**6. No Spam or Solicitation**
Do not send unsolicited promotional messages. Do not contact users for purposes unrelated to an active order.

**7. Report Issues**
If you witness rule violations, use the Report button or contact support@neighborly.app. Do not take matters into your own hands.

**8. Fair Reviews**
Reviews must reflect your genuine experience. Reviewing your own service, coordinating fake reviews, or pressuring users for positive ratings is prohibited.

**Enforcement**
Violations may result in warnings, temporary suspension, or permanent account removal depending on severity. Decisions by the Neighborly trust & safety team are final.
`;

const PRIVACY_CONTENT = `
**Privacy Policy – Neighborly Platform**
*Effective date: January 1, 2025*

**1. What We Collect**
- *Account data:* name, email, phone, profile photo, and address when you register.
- *Usage data:* pages visited, features used, search queries, device and browser information.
- *Order data:* service requests, chat messages, transaction history.
- *Location data:* only when you grant permission or enter an address for a booking.
- *Verification data:* government ID documents submitted for KYC — stored encrypted, accessible only to our compliance team.

**2. How We Use Your Data**
- To provide, maintain, and improve the Neighborly platform.
- To process payments and prevent fraud.
- To send transactional notifications (order updates, receipts).
- To comply with legal obligations.
- With your consent: marketing communications (opt-out any time).

**3. Sharing Your Data**
We do not sell your personal data. We share data only:
- With the Provider you book, to the extent necessary to fulfil the service.
- With payment processors, identity verification partners, and cloud infrastructure providers bound by data processing agreements.
- When required by law or to protect Neighborly's legal rights.

**4. Data Retention**
Active account data is retained while your account is open. After deletion we retain anonymized transaction records for 7 years to meet accounting requirements.

**5. Your Rights**
Depending on your jurisdiction you may request access, correction, deletion, or portability of your personal data. Submit requests to privacy@neighborly.app. We respond within 30 days.

**6. Cookies**
We use essential cookies for session management and analytics cookies (with consent). Manage preferences in your browser settings.

**7. Security**
We use TLS encryption in transit, AES-256 at rest, and role-based access controls. Despite our efforts, no transmission over the internet is 100% secure.

**8. Children**
Neighborly is not directed at persons under 18. We do not knowingly collect data from children.

**9. Changes**
We will notify you of material changes 14 days before they take effect via email or an in-app notice.

Contact our Data Protection Officer: privacy@neighborly.app
`;

// ─── tiny helpers ───────────────────────────────────────────────────────────

function Avatar({ url, name, size = 80 }: Readonly<{ url?: string | null; name: string; size?: number }>) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border-2 border-white shadow-md"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-md select-none"
    >
      {initials}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: Readonly<{ checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
        checked ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  onClick,
  badge,
  danger,
}: Readonly<{
  icon: React.ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  danger?: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors text-left',
        onClick
          ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 cursor-pointer'
          : 'cursor-default',
      )}
    >
      <Icon
        size={18}
        className={cn(danger ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400')}
      />
      <span
        className={cn(
          'flex-1 text-sm font-medium',
          danger
            ? 'text-red-500'
            : 'text-neutral-800 dark:text-neutral-100',
        )}
      >
        {label}
      </span>
      {badge}
      {value && (
        <span className="text-sm text-neutral-400 dark:text-neutral-500 truncate max-w-[140px]">
          {value}
        </span>
      )}
      {onClick && <ChevronRight size={14} className="text-neutral-400 shrink-0" />}
    </button>
  );
}

function SectionCard({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-neutral-100 dark:bg-neutral-800 ml-[52px]" />;
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Legal Modal ────────────────────────────────────────────────────────────

function LegalModal({ open, onClose, title, content }: Readonly<{ open: boolean; onClose: () => void; title: string; content: string }>) {
  const lines = content.trim().split('\n');
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-2" />;
          if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.slice(2, -2).includes('**')) {
            return (
              <p key={i} className="font-bold text-neutral-900 dark:text-neutral-100 mt-4 first:mt-0">
                {trimmed.slice(2, -2)}
              </p>
            );
          }
          const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={i}>
              {parts.map((part, j) =>
                part.startsWith('**') && part.endsWith('**') ? (
                  <strong key={j}>{part.slice(2, -2)}</strong>
                ) : (
                  part
                ),
              )}
            </p>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── Change Password Modal ───────────────────────────────────────────────────

function ChangePasswordModal({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm('');
    setErr(''); setOk(false); setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr('');
    if (next.length < 8) { setErr('New password must be at least 8 characters.'); return; }
    if (next !== confirm) { setErr('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await api.post('/api/users/me/change-password', { currentPassword: current, newPassword: next });
      setOk(true);
      setTimeout(handleClose, 1500);
    } catch (e: any) {
      setErr(e.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Change Password">
      {ok ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <CheckCircle size={40} className="text-green-500" />
          <p className="font-semibold text-neutral-800 dark:text-neutral-100">Password updated!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {err && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={14} />
              {err}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNext ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowNext(!showNext)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      )}
    </Modal>
  );
}

// ─── Add Address Modal ───────────────────────────────────────────────────────

function AddressModal({
  open,
  onClose,
  type,
  initial,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  type: 'home' | 'work';
  initial: string;
  onSave: (addr: string) => Promise<void>;
}>) {
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { setVal(initial); }, [initial]);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr('');
    if (!val.trim()) { setErr('Please enter an address.'); return; }
    setSaving(true);
    try {
      await onSave(val.trim());
      onClose();
    } catch (e: any) {
      setErr(e.message || 'Failed to save address.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={type === 'home' ? 'Home Address' : 'Work Address'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={14} /> {err}
          </div>
        )}
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={3}
          placeholder="Enter full address…"
          className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Address'}
        </button>
      </form>
    </Modal>
  );
}

// ─── Add Vehicle Modal ───────────────────────────────────────────────────────

function AddVehicleModal({
  open,
  onClose,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (v: VehicleEntry) => Promise<void>;
}>) {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const reset = () => { setMake(''); setModel(''); setPlate(''); setErr(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr('');
    if (!make.trim() || !model.trim()) { setErr('Make and model are required.'); return; }
    setSaving(true);
    try {
      await onSave({ id: Date.now().toString(), make: make.trim(), model: model.trim(), plate: plate.trim() });
      handleClose();
    } catch (e: any) {
      setErr(e.message || 'Failed to add vehicle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Vehicle">
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={14} /> {err}
          </div>
        )}
        {[
          { label: 'Make (e.g. Toyota)', val: make, set: setMake },
          { label: 'Model (e.g. Camry)', val: model, set: setModel },
          { label: 'License Plate (optional)', val: plate, set: setPlate },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="block text-xs font-semibold text-neutral-500 mb-1.5">{label}</label>
            <input
              value={val}
              onChange={(e) => set(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Add Vehicle'}
        </button>
      </form>
    </Modal>
  );
}

// ─── types ───────────────────────────────────────────────────────────────────

interface AccountPrefs {
  homeAddress?: string;
  workAddress?: string;
  vehicles?: VehicleEntry[];
  favorites?: FavoriteEntry[];
}

interface VehicleEntry {
  id: string;
  make: string;
  model: string;
  plate?: string;
}

interface FavoriteEntry {
  id: string;
  title: string;
  category?: string;
}

interface OrderItem {
  id: string;
  status: string;
  address: string;
  category?: string;
  totalAmount?: number;
  createdAt: string;
}

interface InvoiceItem {
  id: string;
  status: string;
  amount: number;
  createdAt: string;
  description?: string;
}

// ─── Tab 1: Account ──────────────────────────────────────────────────────────

function AccountTab() {
  const { user, refreshUser, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [saveOk, setSaveOk] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(user?.mfaEnabled ?? false);

  const [showPassword, setShowPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setDisplayName(user.displayName ?? '');
      setPhone(user.phone ?? '');
      setMfaEnabled(user.mfaEnabled ?? false);
    }
  }, [user]);

  const handlePhotoClick = () => fileRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadBinary(file, file.name);
      await api.put('/api/users/me', { avatarUrl: url });
      await refreshUser();
    } catch {
      /* silent */
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaveErr('');
    setSaving(true);
    try {
      await api.put('/api/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || `${firstName} ${lastName}`.trim(),
        phone: phone.trim(),
      });
      await refreshUser();
      setSaveOk(true);
      setEditing(false);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (e: any) {
      setSaveErr(e.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleMfaToggle = async (v: boolean) => {
    setMfaEnabled(v);
    try {
      await api.put('/api/users/me', { mfaEnabled: v });
      await refreshUser();
    } catch {
      setMfaEnabled(!v);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  if (!user) return null;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.displayName || 'User';

  return (
    <div className="space-y-4">
      {/* Avatar */}
      <SectionCard>
        <div className="flex items-center gap-4 p-5">
          <div className="relative shrink-0">
            <Avatar url={user.avatarUrl} name={fullName} size={72} />
            <button
              onClick={handlePhotoClick}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900 transition-colors"
            >
              {uploadingPhoto ? (
                <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera size={12} className="text-white" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate">{fullName}</p>
            <p className="text-sm text-neutral-500 truncate">@{user.displayName || user.email.split('@')[0]}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={() => { setEditing(!editing); setSaveErr(''); }}
            className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-neutral-200 dark:border-neutral-800"
            >
              <div className="p-5 space-y-3">
                {saveErr && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                    <AlertCircle size={14} /> {saveErr}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'First Name', val: firstName, set: setFirstName },
                    { label: 'Last Name', val: lastName, set: setLastName },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-neutral-500 mb-1">{label}</label>
                      <input
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Username</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Email</label>
                  <input
                    value={user.email}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/50 text-sm text-neutral-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="+1 234 567 8900"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : saveOk ? (
                    <><Check size={14} /> Saved</>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      {/* Settings */}
      <SectionCard>
        <div className="flex items-center gap-3 px-4 py-3.5">
          {mode === 'dark' ? <Moon size={18} className="text-neutral-500" /> : <Sun size={18} className="text-neutral-500" />}
          <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <ToggleSwitch checked={mode === 'dark'} onChange={() => toggleTheme()} />
        </div>
        <Divider />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Shield size={18} className="text-neutral-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Two-Factor Auth</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {mfaEnabled ? 'Active — your account is more secure' : 'Add extra protection to your account'}
            </p>
          </div>
          <ToggleSwitch checked={mfaEnabled} onChange={handleMfaToggle} />
        </div>
        <Divider />
        <Row icon={Lock} label="Change Password" onClick={() => setShowPassword(true)} />
      </SectionCard>

      {/* Legal */}
      <SectionCard>
        <Row icon={FileText} label="Terms and Conditions" onClick={() => setShowTerms(true)} />
        <Divider />
        <Row icon={FileText} label="Community Rules" onClick={() => setShowRules(true)} />
        <Divider />
        <Row icon={FileText} label="Privacy Policy" onClick={() => setShowPrivacy(true)} />
      </SectionCard>

      {/* Log out */}
      <SectionCard>
        <Row icon={LogOut} label="Sign Out" onClick={handleLogout} danger />
      </SectionCard>

      {/* Modals */}
      <ChangePasswordModal open={showPassword} onClose={() => setShowPassword(false)} />
      <LegalModal open={showTerms} onClose={() => setShowTerms(false)} title="Terms and Conditions" content={TERMS_CONTENT} />
      <LegalModal open={showRules} onClose={() => setShowRules(false)} title="Community Rules" content={RULES_CONTENT} />
      <LegalModal open={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy Policy" content={PRIVACY_CONTENT} />
    </div>
  );
}

// ─── Tab 2: Personal ─────────────────────────────────────────────────────────

function PersonalTab() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<AccountPrefs>({});
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  const [homeModal, setHomeModal] = useState(false);
  const [workModal, setWorkModal] = useState(false);
  const [vehicleModal, setVehicleModal] = useState(false);
  const [verifyTab, setVerifyTab] = useState<'email' | 'phone'>('email');

  useEffect(() => {
    api.get<AccountPrefs>('/api/users/me/account-preferences').then((d) => {
      setPrefs(d || {});
    }).catch(() => {}).finally(() => setLoadingPrefs(false));
  }, []);

  const savePrefs = async (patch: Partial<AccountPrefs>) => {
    const next = { ...prefs, ...patch };
    await api.put('/api/users/me/account-preferences', next);
    setPrefs(next);
  };

  const handleSaveAddress = (type: 'home' | 'work') => async (addr: string) => {
    await savePrefs(type === 'home' ? { homeAddress: addr } : { workAddress: addr });
  };

  const handleAddVehicle = async (v: VehicleEntry) => {
    await savePrefs({ vehicles: [...(prefs.vehicles ?? []), v] });
  };

  const handleRemoveVehicle = async (id: string) => {
    await savePrefs({ vehicles: (prefs.vehicles ?? []).filter((v) => v.id !== id) });
  };

  const kyc = (user as any)?.kyc;
  const emailVerified = kyc?.emailVerified ?? user?.isVerified ?? false;
  const phoneVerified = kyc?.phoneVerified ?? false;

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Verification */}
      <SectionCard>
        <div className="px-4 pt-4 pb-0">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Verification</p>
          <div className="flex gap-2 mb-3">
            {(['email', 'phone'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setVerifyTab(t)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-semibold transition-colors',
                  verifyTab === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                )}
              >
                {t === 'email' ? 'Email' : 'Phone'}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-4">
          {verifyTab === 'email' ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
              <Mail size={18} className="text-neutral-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{user.email}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {emailVerified ? 'Verified — looks good!' : 'Not yet verified'}
                </p>
              </div>
              {emailVerified ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold">
                  <Check size={11} /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold">
                  <Clock size={11} /> Pending
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
              <Phone size={18} className="text-neutral-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                  {user.phone || 'No phone number'}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {phoneVerified ? 'Verified — looks good!' : user.phone ? 'Not yet verified' : 'Add a phone number first'}
                </p>
              </div>
              {phoneVerified ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold">
                  <Check size={11} /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold">
                  <Clock size={11} /> Pending
                </span>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Addresses */}
      <SectionCard>
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Addresses</p>
        </div>
        {loadingPrefs ? (
          <div className="px-4 py-4 text-sm text-neutral-400">Loading…</div>
        ) : (
          <>
            <button
              onClick={() => setHomeModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Home size={18} className="text-neutral-500 shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Home Address</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {prefs.homeAddress || 'Add home address'}
                </p>
              </div>
              <ChevronRight size={14} className="text-neutral-400 shrink-0" />
            </button>
            <Divider />
            <button
              onClick={() => setWorkModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Briefcase size={18} className="text-neutral-500 shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Work Address</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {prefs.workAddress || 'Add work address'}
                </p>
              </div>
              <ChevronRight size={14} className="text-neutral-400 shrink-0" />
            </button>
          </>
        )}
      </SectionCard>

      {/* Vehicles */}
      <SectionCard>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Vehicles</p>
          <button
            onClick={() => setVehicleModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {loadingPrefs ? (
          <div className="px-4 py-3 text-sm text-neutral-400">Loading…</div>
        ) : (prefs.vehicles ?? []).length === 0 ? (
          <div className="px-4 pb-4">
            <button
              onClick={() => setVehicleModal(true)}
              className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              <Car size={24} />
              <span className="text-xs font-medium">Add your first vehicle</span>
            </button>
          </div>
        ) : (
          <div className="pb-2">
            {(prefs.vehicles ?? []).map((v, idx) => (
              <React.Fragment key={v.id}>
                {idx > 0 && <Divider />}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <Car size={18} className="text-neutral-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      {v.make} {v.model}
                    </p>
                    {v.plate && <p className="text-xs text-neutral-500 mt-0.5">{v.plate}</p>}
                  </div>
                  <button
                    onClick={() => handleRemoveVehicle(v.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Favorites */}
      <SectionCard>
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Favorites</p>
        </div>
        {(prefs.favorites ?? []).length === 0 ? (
          <div className="px-4 pb-4">
            <div className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-400">
              <Heart size={24} />
              <span className="text-xs font-medium">No favorites yet — bookmark services you love</span>
            </div>
          </div>
        ) : (
          <div className="pb-2">
            {(prefs.favorites ?? []).map((f, idx) => (
              <React.Fragment key={f.id}>
                {idx > 0 && <Divider />}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <Heart size={18} className="text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{f.title}</p>
                    {f.category && <p className="text-xs text-neutral-500 mt-0.5">{f.category}</p>}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Modals */}
      <AddressModal
        open={homeModal}
        onClose={() => setHomeModal(false)}
        type="home"
        initial={prefs.homeAddress ?? ''}
        onSave={handleSaveAddress('home')}
      />
      <AddressModal
        open={workModal}
        onClose={() => setWorkModal(false)}
        type="work"
        initial={prefs.workAddress ?? ''}
        onSave={handleSaveAddress('work')}
      />
      <AddVehicleModal open={vehicleModal} onClose={() => setVehicleModal(false)} onSave={handleAddVehicle} />
    </div>
  );
}

// ─── Tab 3: Finance ───────────────────────────────────────────────────────────

function FinanceTab() {
  const [activeSection, setActiveSection] = useState<'invoices' | 'orders'>('orders');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ordersRes, financeRes] = await Promise.allSettled([
          api.get<any>('/api/orders/me?limit=20'),
          api.get<any>('/api/transactions/finance-history'),
        ]);

        if (ordersRes.status === 'fulfilled') {
          const raw = ordersRes.value;
          const list: any[] = Array.isArray(raw) ? raw : raw?.orders ?? raw?.data ?? [];
          setOrders(
            list.map((o) => ({
              id: o.id,
              status: o.status,
              address: o.address ?? o.location ?? 'No address',
              category: o.category ?? o.serviceTitle ?? '',
              totalAmount: o.totalAmount ?? o.price ?? undefined,
              createdAt: o.createdAt,
            })),
          );
        }

        if (financeRes.status === 'fulfilled') {
          const raw = financeRes.value;
          const list: any[] = Array.isArray(raw) ? raw : raw?.history ?? raw?.transactions ?? [];
          setInvoices(
            list.map((t) => ({
              id: t.id,
              status: t.contractStatus ?? t.status ?? 'unknown',
              amount: t.amount ?? t.contractAmount ?? 0,
              createdAt: t.createdAt,
              description: t.serviceTitle ?? t.description ?? '',
            })),
          );
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statusColor = (s: string) => {
    if (['completed', 'paid', 'active'].includes(s)) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    if (['pending', 'open', 'submitted'].includes(s)) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
    if (['cancelled', 'rejected', 'failed'].includes(s)) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    return 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800';
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
        {([['orders', 'My Orders', Package], ['invoices', 'Invoices', CreditCard]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              activeSection === id
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400',
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <span className="w-8 h-8 border-3 border-neutral-300 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      ) : activeSection === 'orders' ? (
        orders.length === 0 ? (
          <SectionCard>
            <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
              <Package size={32} className="text-neutral-300 dark:text-neutral-600" />
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">No orders yet</p>
              <p className="text-sm text-neutral-500">Your service orders will appear here.</p>
            </div>
          </SectionCard>
        ) : (
          <SectionCard>
            {orders.map((order, idx) => (
              <React.Fragment key={order.id}>
                {idx > 0 && <Divider />}
                <div className="flex items-start gap-3 px-4 py-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Package size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {order.category || 'Service Order'}
                      </p>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold shrink-0', statusColor(order.status))}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate flex items-center gap-1">
                      <MapPin size={10} className="shrink-0" /> {order.address}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-neutral-400">{fmtDate(order.createdAt)}</p>
                      {order.totalAmount !== undefined && (
                        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {fmtCurrency(order.totalAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </SectionCard>
        )
      ) : invoices.length === 0 ? (
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
            <CreditCard size={32} className="text-neutral-300 dark:text-neutral-600" />
            <p className="font-semibold text-neutral-700 dark:text-neutral-300">No invoices yet</p>
            <p className="text-sm text-neutral-500">Completed transactions will appear here.</p>
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          {invoices.map((inv, idx) => (
            <React.Fragment key={inv.id}>
              {idx > 0 && <Divider />}
              <div className="flex items-start gap-3 px-4 py-4">
                <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CreditCard size={16} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {inv.description || 'Transaction'}
                    </p>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold shrink-0', statusColor(inv.status))}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-neutral-400">{fmtDate(inv.createdAt)}</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {fmtCurrency(inv.amount)}
                    </p>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </SectionCard>
      )}
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'personal', label: 'Personal', icon: Shield },
  { id: 'finance', label: 'Finance', icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ClientAccount() {
  const [tab, setTab] = useState<TabId>('account');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
            >
              <X size={18} />
            </button>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex-1">My Account</h1>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
                  tab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200',
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-lg mx-auto px-4 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'account' && <AccountTab />}
            {tab === 'personal' && <PersonalTab />}
            {tab === 'finance' && <FinanceTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
