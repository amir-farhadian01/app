import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, CheckCircle2, AlertCircle, DollarSign, FileText, PenTool, ArrowLeft, Loader2, CreditCard, Banknote } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'platform' | 'cash'>('platform');

  const fetchContract = async () => {
    if (!id) return;
    try {
      const data = await api.get<any>(`/api/contracts/${id}`);
      setContract(data);
      if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
    } catch (error) {
      console.error('Failed to fetch contract:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
    const interval = setInterval(fetchContract, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSign = async () => {
    if (!contract || !user) return;
    setIsSigning(true);
    try {
      const isClient = user.id === contract.customerId;
      const body: any = {};
      if (isClient) {
        body.paymentMethod = paymentMethod;
      }
      await api.put(`/api/contracts/${contract.id}/sign`, body);
      await fetchContract();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to sign contract.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleComplete = async () => {
    if (!contract || !user) return;
    setIsSigning(true);
    try {
      await api.put(`/api/contracts/${contract.id}/status`, {
        status: 'completed',
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to complete contract.');
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
        <AlertCircle className="w-16 h-16 text-neutral-200 mx-auto" />
        <h2 className="text-2xl font-black italic uppercase tracking-tight">Contract Not Found</h2>
        <button onClick={() => navigate('/dashboard')} className="text-sm font-bold text-neutral-400 hover:text-neutral-900 underline">Return to Dashboard</button>
      </div>
    );
  }

  const isClient = user?.id === contract.customerId;
  const isProvider = user?.id === contract.providerId;
  const canSign = (isClient && !contract.clientSigned) || (isProvider && !contract.providerSigned);
  const bothSigned = contract.clientSigned && contract.providerSigned;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl transition-all border border-transparent hover:border-app-border">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Service Agreement</h1>
          <p className="text-neutral-500 font-medium">Contract #{contract.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          {/* Legal Terms */}
          <section className="bg-app-card p-10 rounded-[3rem] border border-app-border shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-neutral-400">
              <FileText className="w-5 h-5" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Legal Terms & Conditions</h3>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              <p>
                This agreement is entered into between the customer and the provider for the services described in
                request #{contract.requestId}.
              </p>
              <h4 className="font-black text-app-text mt-6">1. Provider obligations</h4>
              <p>
                The provider agrees to deliver the services with reasonable care, on time, and as described. Failure to
                perform may subject the provider to remedies described in platform policies.
              </p>
              <h4 className="font-black text-app-text mt-6">2. Customer obligations</h4>
              <p>
                The customer agrees to pay the agreed amount after final acceptance of the work. For cash payments, the
                provider remains responsible for settling the platform commission as required.
              </p>
              <h4 className="font-black text-app-text mt-6">3. Platform commission</h4>
              <p>
                As the intermediary, the platform retains ${contract.commissionAmount || contract.amount * 0.1} as a
                software and marketplace fee.
              </p>
            </div>
          </section>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6">
            <div className={cn(
              "p-8 rounded-[2.5rem] border transition-all space-y-4",
              contract.clientSigned ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800" : "bg-app-card border-app-border"
            )}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Customer Signature</p>
                {contract.clientSigned && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              </div>
              <div className="h-20 flex items-center justify-center border-b border-dashed border-neutral-200">
                {contract.clientSigned ? (
                  <span className="font-black italic text-xl text-app-text opacity-40">SIGNED</span>
                ) : (
                  <span className="text-neutral-200 italic">Awaiting Signature</span>
                )}
              </div>
              <p className="text-[10px] font-bold text-neutral-400 text-center">
                {contract.clientSignedAt ? new Date(contract.clientSignedAt).toLocaleString() : '---'}
              </p>
            </div>

            <div className={cn(
              "p-8 rounded-[2.5rem] border transition-all space-y-4",
              contract.providerSigned ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800" : "bg-app-card border-app-border"
            )}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Provider Signature</p>
                {contract.providerSigned && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              </div>
              <div className="h-20 flex items-center justify-center border-b border-dashed border-neutral-200">
                {contract.providerSigned ? (
                  <span className="font-black italic text-xl text-app-text opacity-40">SIGNED</span>
                ) : (
                  <span className="text-neutral-200 italic">Awaiting Signature</span>
                )}
              </div>
              <p className="text-[10px] font-bold text-neutral-400 text-center">
                {contract.providerSignedAt ? new Date(contract.providerSignedAt).toLocaleString() : '---'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Financial Summary */}
          <section className="bg-neutral-900 text-white p-10 rounded-[3rem] space-y-8 shadow-2xl shadow-neutral-900/20">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Amount</p>
              <h3 className="text-5xl font-black italic">${contract.amount.toLocaleString()}</h3>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/60">Platform Fee</span>
                <span className="font-black">${(contract.commissionAmount || (contract.amount * 0.1)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/60">Provider Net</span>
                <span className="font-black text-emerald-400">${(contract.amount - (contract.commissionAmount || (contract.amount * 0.1))).toLocaleString()}</span>
              </div>
            </div>

            {isClient && !contract.clientSigned && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('platform')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                      paymentMethod === 'platform' ? "bg-white text-neutral-900 border-white" : "bg-white/5 border-white/10 text-white/60"
                    )}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase">Platform</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                      paymentMethod === 'cash' ? "bg-white text-neutral-900 border-white" : "bg-white/5 border-white/10 text-white/60"
                    )}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase">Cash</span>
                  </button>
                </div>
              </div>
            )}

            {canSign && (
              <button
                onClick={handleSign}
                disabled={isSigning}
                className="w-full py-4 bg-white text-neutral-900 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl"
              >
                {isSigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
                Sign Agreement
              </button>
            )}

            {bothSigned && contract.status !== 'completed' && isProvider && (
              <button
                onClick={handleComplete}
                disabled={isSigning}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl"
              >
                {isSigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Complete Job
              </button>
            )}
          </section>

          {/* Status Alert */}
          <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex gap-4">
            <Shield className="w-6 h-6 text-amber-500 shrink-0" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-amber-900">Secure Transaction</h4>
              <p className="text-xs text-amber-700/70 leading-relaxed">
                {contract.paymentMethod === 'cash'
                  ? 'Cash payment is selected. The provider is responsible for settling the platform commission.'
                  : 'Payment is processed through the platform. Funds are held according to platform payout rules.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
