import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { db, handleFirestoreError, OperationType, auth, storage } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, limit, addDoc, serverTimestamp, getDoc, setDoc, where, getDocs, deleteField } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Shield, Users, User, Briefcase, AlertCircle, Settings, BarChart3, Trash2, 
  CheckCircle, DollarSign, Activity, Lock, Key, List, FileText, 
  CreditCard, UserPlus, Globe, Layout, Cpu, Plus, Save, ExternalLink, 
  Search, Filter, ChevronRight, ChevronDown, X, Mail, Phone, ShieldCheck, ShieldAlert, Loader2, Palette,
  Smartphone, MapPin, Calendar, Columns, MoreVertical, MessageSquare, Download, Tag, CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown, History, Star, Unlock, Pencil, Wallet, MousePointer2, Paintbrush,
  Layers, TrendingUp, PieChart, FileSpreadsheet, PlusCircle, MinusCircle, Eye, EyeOff, Check, Ban, ClipboardCheck, FileWarning, Upload, Paperclip, Edit2,
  Package, Truck, Code, Wrench, Home, Zap, Brush, ShoppingBag, Wind, Scissors, Camera, Box, Component, Brain, Sparkles, Wand2, Building2, UserCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import UniversalUpload from '../components/UniversalUpload';
import { analyzeKycDocuments } from '../services/geminiService';
import { verifyBusinessEntity } from '../services/businessVerificationService';

type AdminTab = 
  | 'overview' 
  | 'users' 
  | 'kyc' 
  | 'services' 
  | 'intelligence'
  | 'finance' 
  | 'teams' 
  | 'content' 
  | 'cms'
  | 'monitoring' 
  | 'integrations' 
  | 'legal' 
  | 'settings';

type UserEditTab = 'general' | 'security' | 'role-specific' | 'finance';

// Helper for dynamic service icons
const getDynamicServiceIcon = (service: any, sizeClass: string = "w-full h-full p-2 opacity-70 border-none") => {
  if (service.icon && service.icon !== '📁') return <span className="flex items-center justify-center text-2xl h-full pb-1">{service.icon}</span>;
  const term = (service.name || '').toLowerCase();
  
  const IconProps = { className: sizeClass };
  
  if (term.includes('clean') || term.includes('maid') || term.includes('wash')) return <Brush {...IconProps} />;
  if (term.includes('move') || term.includes('truck') || term.includes('deliver') || term.includes('haul')) return <Truck {...IconProps} />;
  if (term.includes('code') || term.includes('dev') || term.includes('web') || term.includes('tech') || term.includes('soft')) return <Code {...IconProps} />;
  if (term.includes('plumb') || term.includes('repair') || term.includes('fix') || term.includes('handym') || term.includes('mechanic')) return <Wrench {...IconProps} />;
  if (term.includes('home') || term.includes('house') || term.includes('build') || term.includes('roof')) return <Home {...IconProps} />;
  if (term.includes('electric') || term.includes('wire') || term.includes('light')) return <Zap {...IconProps} />;
  if (term.includes('shop') || term.includes('buy') || term.includes('grocer') || term.includes('errand')) return <ShoppingBag {...IconProps} />;
  if (term.includes('hvac') || term.includes('air') || term.includes('heat') || term.includes('cool')) return <Wind {...IconProps} />;
  if (term.includes('hair') || term.includes('salon') || term.includes('cut') || term.includes('beauty')) return <Scissors {...IconProps} />;
  if (term.includes('photo') || term.includes('camera') || term.includes('video')) return <Camera {...IconProps} />;
  
  return <Package {...IconProps} />;
};

// Advanced Recursive Tree Selector component
const TreeServiceSelect = ({ services, validParents, value, onChange }: { services: any[], validParents: any[], value: string | null, onChange: (id: string | null, level: number) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const buildTree = (items: any[], parentId: string | null = null): any[] => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id)
      }));
  };

  const fullTree = buildTree(services);
  const selectedService = services.find(s => s.id === value);

  const renderNode = (node: any, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[node.id];
    const isSelected = value === node.id;
    const isValid = validParents.some(p => p.id === node.id);
    
    // Search filtering
    const matchesSearch = node.name.toLowerCase().includes(search.toLowerCase());
    const childMatches = hasChildren && node.children.some((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));
    
    if (search && !matchesSearch && !childMatches) return null;

    return (
      <div key={node.id} className="select-none">
        <div 
          onClick={() => {
            if (isValid) {
              onChange(node.id, node.level + 1);
              setIsOpen(false);
            }
          }}
          className={cn(
            "group flex items-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer relative",
            isSelected ? "bg-emerald-500/10 text-emerald-600 font-bold" : "text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
            !isValid && "opacity-40 cursor-not-allowed grayscale",
            depth > 0 && "ml-4"
          )}
        >
          {/* Tree Line vertical */}
          {depth > 0 && (
            <div className="absolute -left-3 top-0 bottom-0 w-[1px] bg-neutral-200 dark:bg-neutral-800" />
          )}
          {/* Tree Line horizontal */}
          {depth > 0 && (
            <div className="absolute -left-3 top-1/2 w-3 h-[1px] bg-neutral-200 dark:bg-neutral-800" />
          )}

          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button 
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
              >
                {isExpanded ? <MinusCircle className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <div className="w-4.5" />
            )}
            
            <span className="text-lg opacity-80 leading-none">{node.icon || '📁'}</span>
            <span className="truncate text-sm tracking-tight">{node.name}</span>
            {node.level && (
              <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 border border-neutral-200 dark:border-neutral-800 px-1 rounded">LVL {node.level}</span>
            )}
          </div>
        </div>

        {hasChildren && (isExpanded || search) && (
          <div className="ml-2">
            {node.children.map((child: any) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-app-input border border-app-border rounded-2xl cursor-pointer flex items-center justify-between group hover:border-emerald-500/50 transition-all shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-lg border border-app-border group-hover:border-emerald-500/30">
            {selectedService?.icon || '📁'}
          </div>
          <div className="flex flex-col">
            <span className={selectedService ? "text-app-text font-bold" : "text-neutral-500 text-sm font-medium"}>
              {selectedService ? selectedService.name : 'None (Root Level Branch)'}
            </span>
            {selectedService && (
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Level {selectedService.level} Category</span>
            )}
          </div>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-neutral-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute z-[110] top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-neutral-900 border border-app-border rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-app-border bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Filter tree structure..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-800 border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-app-text"
                />
              </div>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-neutral-900">
              <button 
                onClick={() => { onChange(null, 1); setIsOpen(false); }}
                className={cn(
                  "w-full text-left p-4 rounded-xl text-sm font-bold transition-all mb-4 border flex items-center gap-3",
                  !value 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'bg-neutral-50 dark:bg-neutral-800 border-app-border text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-700'
                )}
              >
                <Layers className="w-5 h-5" />
                <span>ROOT LEVEL (Top Parent)</span>
              </button>

              <div className="space-y-1">
                {fullTree.map(node => renderNode(node))}
              </div>

              {search && fullTree.every(node => !node.name.toLowerCase().includes(search.toLowerCase()) && (!node.children || !node.children.some((c: any) => c.name.toLowerCase().includes(search.toLowerCase())))) && (
                <div className="py-12 text-center text-neutral-500 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center">
                    <Search className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="font-bold italic uppercase tracking-tight text-sm">No branches found matching search</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-app-border text-[10px] font-black uppercase tracking-widest text-neutral-400 flex justify-between items-center italic">
              <span>Select branch to assign dependency</span>
              <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Circular Ref Protection Active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop for outside click */}
      {isOpen && (
        <div className="fixed inset-0 z-[105]" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

// Tree Service Select logic replacement completed

// Service Hierarchy Node Component
const ServiceHierarchyNode = ({ node, allServices, providerServices, requests, onAddSub, onEdit, onDelete, onUpdateStatus }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Strict duplicate check: Ensure children are filtered by unique ID to prevent UI bugs
  const children = allServices
    .filter((s: any) => s.parentId === node.id)
    .filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.id === v.id) === i);

  const linkedProvidersCount = providerServices.filter((ps: any) => ps.serviceId === node.id).length;
  
  // Market Health Logic: Online Providers vs Unassigned Orders
  const openOrders = requests.filter((r: any) => r.serviceId === node.id && r.status === 'pending').length;
  const healthRatio = linkedProvidersCount > 0 ? openOrders / linkedProvidersCount : (openOrders > 0 ? 2 : 0);
  
  // Simulated Data Science Metrics
  const churnRate = (Math.random() * 15 + 5).toFixed(1);
  const saturationIndex = healthRatio.toFixed(2);

  const getHealthStatus = () => {
    if (healthRatio > 1.5) return { label: 'Critical Supply Gap', color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20', icon: ShieldAlert };
    if (healthRatio > 0.8) return { label: 'High Demand', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', icon: Activity };
    if (healthRatio > 0.3) return { label: 'Healthy', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle };
    return { label: 'Oversaturated', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', icon: Users };
  };

  const health = getHealthStatus();

  return (
    <div className="space-y-2">
      <div className={cn(
        "flex items-center justify-between p-5 bg-white dark:bg-neutral-900 border border-app-border rounded-[2.5rem] transition-all hover:shadow-2xl group relative overflow-hidden",
        node.level === 1 ? "border-l-4 border-l-neutral-900 dark:border-l-emerald-500" : ""
      )}>
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        
        <div className="flex items-center gap-5 relative z-10 w-full">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn("p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-transform", isExpanded ? "rotate-90" : "")}
          >
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </button>
          
          <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center relative shadow-inner overflow-hidden flex-shrink-0 border border-app-border">
            {node.iconUrl ? (
              <img 
                src={node.iconUrl} 
                alt={node.name} 
                className="w-full h-full object-contain p-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] dark:drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              getDynamicServiceIcon(node, "w-full h-full p-2.5 opacity-60 text-neutral-500")
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h5 className="font-black text-app-text uppercase tracking-tight text-lg truncate max-w-[200px]">{node.name}</h5>
              <span className="text-[10px] font-black px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-400 border border-app-border shrink-0">LVL {node.level}</span>
              {node.status === 'hidden' && <EyeOff className="w-3.5 h-3.5 text-rose-500" />}
            </div>
            <div className="flex items-center gap-4 mt-1.5">
              <div className="flex items-center gap-1.5">
                <health.icon className={cn("w-3.5 h-3.5 font-bold", health.color.split(' ')[0])} />
                <span className={cn("text-[10px] font-black uppercase tracking-widest", health.color.split(' ')[0])}>
                  {health.label}
                </span>
              </div>
              <div className="h-3 w-px bg-app-border" />
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider truncate">
                {linkedProvidersCount} Providers • {openOrders} Jobs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.level < 5 && (
              <button 
                onClick={() => onAddSub(node)}
                className="p-3 text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all hover:scale-110"
                title="Add Sub-service"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => onEdit(node)}
              className="p-3 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all hover:scale-110"
              title="Edit Service"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onUpdateStatus(node.id, node.status === 'hidden' ? 'active' : 'hidden')}
              className="p-3 text-neutral-400 hover:text-app-text hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-all hover:scale-110"
              title={node.status === 'hidden' ? 'Show Service' : 'Hide Service'}
            >
              {node.status === 'hidden' ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => onDelete(node.id)}
              className="p-3 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all hover:scale-110"
              title="Delete Service"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && children.length > 0 && (
        <div className="ml-14 border-l-2 border-dashed border-neutral-100 dark:border-neutral-800 pl-8 space-y-3 py-3">
          {children.map((child: any) => (
            <ServiceHierarchyNode 
              key={child.id} 
              node={child} 
              allServices={allServices} 
              providerServices={providerServices}
              requests={requests}
              onAddSub={onAddSub}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper for detecting simulation mode to prevent infinite nested iframes
const isSimulatedRole = new URLSearchParams(window.location.search).has('role_preview');

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [providerServices, setProviderServices] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [masterLedger, setMasterLedger] = useState<any[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [legalPolicies, setLegalPolicies] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [cmsConfigs, setCmsConfigs] = useState<any[]>([]);
  const [cmsSubTab, setCmsSubTab] = useState<'content' | 'visual' | 'preview'>('content');
  const [selectedCmsConfig, setSelectedCmsConfig] = useState<any>(null);
  const [previewRole, setPreviewRole] = useState<'owner' | 'provider' | 'customer'>('customer');
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [editorTab, setEditorTab] = useState('props');
  const [isDirty, setIsDirty] = useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const toggleInspector = () => {
    const newState = !isInspectorActive;
    setIsInspectorActive(newState);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'TOGGLE_INSPECTOR', active: newState }, '*');
    }
  };

  const sendRealtimePreview = (elementName: string, data: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ 
        type: 'CMS_REALTIME_PREVIEW', 
        elementName,
        ...data
      }, '*');
    }
  };

  const handleUpdateElement = (elementName: string, styles: any) => {
    setSelectedElement((prev: any) => {
      const next = { ...prev, styles: { ...prev.styles, ...styles } };
      sendRealtimePreview(elementName, { styles: next.styles });
      return next;
    });
    setIsDirty(true);
  };

  const handleUpdateContent = (elementName: string, content: any) => {
    setSelectedElement((prev: any) => {
      const next = { ...prev, content: { ...prev.content, ...content } };
      sendRealtimePreview(elementName, { content: next.content });
      return next;
    });
    setIsDirty(true);
  };

  const handleUpdateConfig = (elementName: string, config: any) => {
    setSelectedElement((prev: any) => {
      const next = { ...prev, config: { ...prev.config, ...config } };
      sendRealtimePreview(elementName, { config: next.config });
      return next;
    });
    setIsDirty(true);
  };

  const handleUpdateAttribute = (elementName: string, attributes: any) => {
    setSelectedElement((prev: any) => {
      const next = { ...prev, attributes: { ...prev.attributes, ...attributes } };
      sendRealtimePreview(elementName, { attributes: next.attributes });
      return next;
    });
    setIsDirty(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedElement) return;
    try {
      const standardizedName = selectedElement.tagName.toLowerCase();
      await setDoc(doc(db, 'cms_visual_elements', standardizedName), {
        name: standardizedName,
        styles: selectedElement.styles,
        content: selectedElement.content,
        config: selectedElement.config,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsDirty(false);
      showSuccess(`Design changes for <${standardizedName}> persisted`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'cms_visual_elements');
    }
  };

  const handleResetElement = () => {
    const standardizedName = selectedElement.tagName.toLowerCase();
    const override = cmsConfigs.find(c => c.name?.toLowerCase() === standardizedName);
    setSelectedElement({
      ...selectedElement,
      styles: { ...selectedElement.styles, ...override?.styles },
      content: { ...override?.content },
      config: { ...override?.config }
    });
    setIsDirty(false);
    // Send reset to iframe
    sendRealtimePreview(standardizedName, {
      styles: override?.styles,
      content: override?.content,
      config: override?.config
    });
  };

  const handleResetEntireDesign = async () => {
    if (!confirm('CRITICAL ALERT: This will permanently delete ALL visual overrides and reset the theme to factory defaults. Continue?')) return;
    
    try {
      setIsSaving(true);
      // 1. Reset Global Theme keys (backgroundColor, etc)
      await updateDoc(doc(db, 'system_config', 'global'), {
        'theme.backgroundColor': deleteField(),
        'theme.textColor': deleteField(),
        'theme.borderRadius': deleteField()
      });

      // 2. Clear all component overrides
      const deletePromises = cmsConfigs.map(config => 
        deleteDoc(doc(db, 'cms_visual_elements', config.id))
      );
      await Promise.all(deletePromises);
      
      showSuccess('Platform design reset to defaults');
      setSelectedElement(null);
      setSelectedCmsConfig(null);
      
      // Notify iframe to reload full context
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.location.reload();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'system_config');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedElement && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'CLEAR_SELECTION' }, '*');
    }
  }, [selectedElement]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CMS_ELEMENT_SELECTED') {
        const baseElement = event.data.element;
        const standardizedName = baseElement.tagName.toLowerCase();
        const override = cmsConfigs.find(c => c.name?.toLowerCase() === standardizedName);
        setSelectedElement({
          ...baseElement,
          tagName: standardizedName,
          styles: { ...baseElement.styles, ...override?.styles },
          content: { ...override?.content },
          config: { ...override?.config }
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [cmsConfigs]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'users', 'kyc', 'services', 'reports', 'settings', 'cms'].includes(tab)) {
      setActiveTab(tab as AdminTab);
    }
  }, []);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showKycReviewModal, setShowKycReviewModal] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [showCmsVisualModal, setShowCmsVisualModal] = useState(false);
  const [cmsModalTab, setCmsModalTab] = useState<'layout' | 'style' | 'content'>('layout');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [kycSearch, setKycSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('all');
  const [kycTypeTab, setKycTypeTab] = useState<'personal' | 'business'>('personal');

  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  // CRM & Advanced User Management States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['user', 'role', 'status', 'lastInteraction', 'device', 'tags', 'actions']);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [showUserHubModal, setShowUserHubModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [profileTab, setProfileTab] = useState('overview');
  const [editUserTab, setEditUserTab] = useState<UserEditTab>('general');
  const [servicesTab, setServicesTab] = useState<'inventory' | 'hierarchy' | 'ledger'>('ledger');
  const [selectedLedgerOrder, setSelectedLedgerOrder] = useState<any>(null);
  const [showLedgerDetailModal, setShowLedgerDetailModal] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [isReceiptUploading, setIsReceiptUploading] = useState(false);
  const [receiptProgress, setReceiptProgress] = useState(0);
  const [secretNotes, setSecretNotes] = useState('');
  const [comparisonServices, setComparisonServices] = useState<string[]>([]);
  const [analyticsFilters, setAnalyticsFilters] = useState<string[][]>([[], [], [], [], []]);
  const [analyticsMetric, setAnalyticsMetric] = useState<'volume' | 'revenue'>('revenue');
  const [expandedLedgerRows, setExpandedLedgerRows] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceSort, setServiceSort] = useState({ field: 'name', direction: 'asc' });
  const [userFilters, setUserFilters] = useState({
    status: 'all',
    role: 'all',
    device: 'all',
    location: 'all',
    activity: 'all',
    dateRange: { from: '', to: '' },
    tags: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [intelligenceView, setIntelligenceView] = useState<'ops' | 'analytics' | 'geo'>('ops');
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  // Financial Management States
  const [creditAdjustment, setCreditAdjustment] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [commissionSettlement, setCommissionSettlement] = useState<string>('');
  const [balanceOverride, setBalanceOverride] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [userTransactions, setUserTransactions] = useState<any[]>([]);

  // Reset financial management states when modal opens or mode changes
  useEffect(() => {
    if (showUserHubModal) {
      setCreditAdjustment('');
      setAdjustmentReason('');
      setCommissionSettlement('');
      setBalanceOverride((profileUser?.balance || selectedUser?.balance || 0).toString());
      setTransactionType('deposit');
    }
  }, [showUserHubModal, isEditMode, profileUser, selectedUser]);

  const showSuccess = (message: string) => {
    setNotification({ show: true, message, type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const showError = (message: string) => {
    setNotification({ show: true, message, type: 'error' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBulkAction = async (action: 'email' | 'push' | 'export' | 'suspend' | 'activate') => {
    if (selectedUserIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      if (action === 'export') {
        const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
        const csv = [
          ['Name', 'Email', 'Role', 'Status', 'Last Seen', 'Device'].join(','),
          ...selectedUsers.map(u => [
            u.displayName,
            u.email,
            u.role,
            u.status,
            u.lastSeen || 'N/A',
            u.deviceType || 'N/A'
          ].join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neighborly-users-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        showSuccess(`Exported ${selectedUserIds.length} users`);
      } else if (action === 'suspend' || action === 'activate') {
        const newStatus = action === 'suspend' ? 'suspended' : 'active';
        await Promise.all(selectedUserIds.map(id => 
          updateDoc(doc(db, 'users', id), { status: newStatus })
        ));
        showSuccess(`Updated ${selectedUserIds.length} users to ${newStatus}`);
      } else {
        // Placeholder for email/push
        showSuccess(`Bulk ${action} initiated for ${selectedUserIds.length} users`);
      }
      setSelectedUserIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
      showError('Bulk action failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesStatus = userFilters.status === 'all' || user.status === userFilters.status;
    const matchesRole = userFilters.role === 'all' || user.role === userFilters.role;
    const matchesDevice = userFilters.device === 'all' || user.deviceType === userFilters.device;
    const matchesLocation = userFilters.location === 'all' || user.location?.city === userFilters.location;
    
    // Activity filter
    let matchesActivity = true;
    if (userFilters.activity !== 'all') {
      const lastSeen = user.lastSeen ? new Date(user.lastSeen).getTime() : 0;
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (userFilters.activity === 'online') matchesActivity = (now - lastSeen) < (5 * 60 * 1000); // 5 mins
      if (userFilters.activity === '24h') matchesActivity = (now - lastSeen) < oneDay;
      if (userFilters.activity === 'week') matchesActivity = (now - lastSeen) < (7 * oneDay);
    }

    // Date range filter
    let matchesDate = true;
    if (userFilters.dateRange.from || userFilters.dateRange.to) {
      const createdAt = user.createdAt ? new Date(user.createdAt).getTime() : 0;
      if (userFilters.dateRange.from) matchesDate = matchesDate && createdAt >= new Date(userFilters.dateRange.from).getTime();
      if (userFilters.dateRange.to) matchesDate = matchesDate && createdAt <= new Date(userFilters.dateRange.to).getTime();
    }

    // Tags filter
    const matchesTags = userFilters.tags.length === 0 || userFilters.tags.every(tag => user.tags?.includes(tag));

    return matchesStatus && matchesRole && matchesDevice && matchesLocation && matchesActivity && matchesDate && matchesTags;
  });

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    const uUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'users'));
    unsubscribers.push(uUnsubscribe);

    const kUnsubscribe = onSnapshot(query(collection(db, 'kyc'), orderBy('updatedAt', 'desc')), (snapshot) => {
      setKycSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'kyc'));
    unsubscribers.push(kUnsubscribe);

    const sUnsubscribe = onSnapshot(collection(db, 'services'), (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'services'));
    unsubscribers.push(sUnsubscribe);

    const psUnsubscribe = onSnapshot(collection(db, 'provider_services'), (snapshot) => {
      setProviderServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'provider_services'));
    unsubscribers.push(psUnsubscribe);

    const ctUnsubscribe = onSnapshot(collection(db, 'contracts'), (snapshot) => {
      setContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'contracts'));
    unsubscribers.push(ctUnsubscribe);

    const rUnsubscribe = onSnapshot(collection(db, 'requests'), (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'requests'));
    unsubscribers.push(rUnsubscribe);

    const configUnsubscribe = onSnapshot(doc(db, 'system_config', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSystemConfig(snapshot.data());
      } else {
        // Initialize if missing
        const configRef = doc(db, 'system_config', 'global');
        setDoc(configRef, { 
          appName: 'Neighborly', 
          allowRegistration: true,
          kycConfig: {
            strictBusinessLookup: true,
            enableAiAnalysis: true,
            enableFraudDetection: true,
            enableOcrMatching: true
          }
        });
      }
    });
    unsubscribers.push(configUnsubscribe);

    const cmsUnsubscribe = onSnapshot(collection(db, 'cms_visual_elements'), (snapshot) => {
      setCmsConfigs(snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, name: (data.name || doc.id).toLowerCase() };
      }));
    }, error => handleFirestoreError(error, OperationType.LIST, 'cms_visual_elements'));
    unsubscribers.push(cmsUnsubscribe);

    const aUnsubscribe = onSnapshot(
      query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50)), 
      (snapshot) => {
        setAuditLogs(snapshot.docs.map(doc => {
          const data = doc.data();
          let ts: Date;
          if (data.timestamp?.toDate) {
            ts = data.timestamp.toDate();
          } else if (data.timestamp instanceof Date) {
            ts = data.timestamp;
          } else if (typeof data.timestamp === 'string' || typeof data.timestamp === 'number') {
            ts = new Date(data.timestamp);
          } else {
            ts = new Date();
          }
          return { id: doc.id, ...data, timestamp: ts };
        }));
      },
      error => handleFirestoreError(error, OperationType.LIST, 'audit_logs')
    );
    unsubscribers.push(aUnsubscribe);

    const lUnsubscribe = onSnapshot(collection(db, 'legal_policies'), (snapshot) => {
      setLegalPolicies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    unsubscribers.push(lUnsubscribe);

    const pUnsubscribe = onSnapshot(collection(db, 'pages'), (snapshot) => {
      setPages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    unsubscribers.push(pUnsubscribe);

    const mlUnsubscribe = onSnapshot(query(collection(db, 'master_ledger'), orderBy('timestamp', 'desc')), (snapshot) => {
      setMasterLedger(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    unsubscribers.push(mlUnsubscribe);

    setLoading(false);
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  // Separate useEffect for user transactions to handle reactivity properly
  useEffect(() => {
    if (!showUserHubModal) {
      setUserTransactions([]);
      return;
    }
    const userId = selectedUser?.id || profileUser?.id;
    if (!userId) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    return onSnapshot(q, (snapshot) => {
      setUserTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [showUserHubModal, selectedUser?.id, profileUser?.id]);

  // Dynamic Analytics Calculations for Overview
  const totalRevenue = contracts
    .filter(c => c.status === 'completed' || c.status === 'confirmed')
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    
  const activeJobs = requests.filter(r => r.status === 'pending' || r.status === 'accepted').length;
  const pendingKyc = kycSubmissions.filter(k => k.status === 'pending').length;
  const openDisputes = contracts.filter(c => c.status === 'disputed').length;
  
  // Market Gaps: Services (lowest level) with no linked providers
  const marketGaps = services.filter(s => s.level === 3 && !providerServices.some(ps => ps.serviceId === s.id)).length;
  
  // Admins Online: lastSeen < 5 mins
  const adminsOnline = users.filter(u => 
    (u.role === 'platform_admin' || u.role === 'owner') && 
    u.lastSeen && (Date.now() - new Date(u.lastSeen).getTime()) < 300000
  ).length;

  // Revenue Velocity Data for Chart (Last 7 days)
  const revenueHistory = [...Array(11)].map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (10 - i));
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86400000;
    
    const dayRev = contracts
      .filter(c => {
        const cDate = c.createdAt?.toDate?.() || new Date(c.createdAt);
        const ct = cDate.getTime();
        return ct >= dayStart && ct < dayEnd;
      })
      .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
      
    return Math.min(100, (dayRev / (totalRevenue / 10 || 1000)) * 100) || 15;
  });

  // Marketplace Health Index (0-100)
  const healthIndex = Math.min(100, Math.round(
    ((contracts.filter(c => c.status === 'completed').length / (contracts.length || 1)) * 60) + 
    ((users.filter(u => u.isVerified).length / (users.length || 1)) * 40)
  )) || 0;

  const handleUpdateGlobalConfig = async (newData: any) => {
    try {
      await setDoc(doc(db, 'system_config', 'global'), newData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_config');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || isSaving) return;
    setIsSaving(true);
    try {
      const updateData: any = {};
      
      // Only include changed fields to optimize Firestore writes
      if (formData.role !== selectedUser.role) updateData.role = formData.role;
      if (formData.status !== selectedUser.status) updateData.status = formData.status;
      if (formData.displayName !== selectedUser.displayName) updateData.displayName = formData.displayName;
      if (formData.email !== selectedUser.email) updateData.email = formData.email;
      if (formData.phone !== selectedUser.phone) updateData.phone = formData.phone;

      // Role specific fields
      if (formData.role === 'provider') {
        if (formData.businessName !== selectedUser.businessName) updateData.businessName = formData.businessName;
        if (formData.serviceCategory !== selectedUser.serviceCategory) updateData.serviceCategory = formData.serviceCategory;
        if (formData.isVerifiedBadge !== selectedUser.isVerifiedBadge) updateData.isVerifiedBadge = formData.isVerifiedBadge;
      } else if (formData.role === 'customer') {
        if (JSON.stringify(formData.interests) !== JSON.stringify(selectedUser.interests)) {
          updateData.interests = formData.interests;
        }
      }

      // Financial Updates (Auditable & Incremental)
      if (editUserTab === 'finance') {
        let currentBalance = selectedUser?.balance || 0;
        let currentCommission = selectedUser?.pendingCommission || 0;
        let financialChanged = false;

        // 1. Relative Adjustment (Deposit/Withdraw)
        const creditValRaw = parseFloat(creditAdjustment) || 0;
        const creditVal = transactionType === 'deposit' ? creditValRaw : -creditValRaw;
        
        if (creditVal !== 0) {
          currentBalance += creditVal;
          financialChanged = true;
          // Document transaction for audit
          await addDoc(collection(db, 'transactions'), {
            userId: selectedUser.id,
            amount: creditVal,
            type: creditVal > 0 ? 'credit' : 'debit',
            reason: adjustmentReason || 'Administrative balance adjustment',
            timestamp: serverTimestamp(),
            performedBy: auth.currentUser?.email
          });
        }

        // 2. Commission Settlement (Provider Only)
        if (formData.role === 'provider') {
          const settlementVal = parseFloat(commissionSettlement) || 0;
          if (settlementVal > 0) {
            currentCommission = Math.max(0, currentCommission - settlementVal);
            financialChanged = true;
            await addDoc(collection(db, 'transactions'), {
              userId: selectedUser.id,
              amount: -settlementVal,
              type: 'commission_payment',
              reason: 'Settled pending marketplace commission',
              timestamp: serverTimestamp(),
              performedBy: auth.currentUser?.email
            });
          }
        }

        // 3. Absolute Override (Emergency Correction)
        // If the balanceOverride was manually touched and is different from the resulting adjusted balance
        const overrideVal = parseFloat(balanceOverride);
        if (!isNaN(overrideVal) && overrideVal !== currentBalance && overrideVal !== (selectedUser?.balance || 0)) {
          currentBalance = overrideVal;
          financialChanged = true;
        }

        if (financialChanged) {
          updateData.balance = currentBalance;
          updateData.pendingCommission = currentCommission;
        }
      }

      // Only perform update if there are actual changes
      if (Object.keys(updateData).length > 0) {
        await updateDoc(doc(db, 'users', selectedUser.id), updateData);
        
        // Audit Log
        await addDoc(collection(db, 'audit_logs'), {
          action: `Updated user ${selectedUser.email} profile`,
          actorId: auth.currentUser?.uid,
          timestamp: serverTimestamp(),
          changes: Object.keys(updateData),
          financialAdjustment: editUserTab === 'finance' ? {
            type: transactionType,
            amount: parseFloat(creditAdjustment) || 0,
            reason: adjustmentReason,
            settlement: parseFloat(commissionSettlement) || 0,
            override: parseFloat(balanceOverride)
          } : null
        });

        // Update local states to reflect changes immediately
        const updatedUser = { ...selectedUser, ...updateData };
        setProfileUser(updatedUser);
        setSelectedUser(updatedUser);
      }
      
      // Reset financial inputs
      setCreditAdjustment('');
      setAdjustmentReason('');
      setCommissionSettlement('');
      
      setIsEditMode(false);
      setShowUserHubModal(false); // Dismiss the UI as requested
      showSuccess('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      showError('Failed to update user profile');
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      // Simulation for demo
      showSuccess(`Password reset link sent to ${email}`);
      await addDoc(collection(db, 'audit_logs'), {
        action: `Sent password reset to ${email}`,
        actorId: auth.currentUser?.uid,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      showError('Failed to send reset link');
    }
  };

  const handleAdminPasswordReset = async (userId: string, newPassword: string) => {
    if (!newPassword || newPassword.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    try {
      const adminToken = await auth.currentUser?.getIdToken();
      if (!adminToken) {
        showError("Session expired. Please re-login.");
        return;
      }

      showSuccess("Initiating secure password overwrite...");

      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword, adminToken })
      });

      const result = await response.json();

      if (result.success) {
        showSuccess("Password updated in auth and database logs.");
        setAdminNewPassword("");
      } else {
        showError(result.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Admin Password Reset UI Error:", error);
      showError("A network error occurred.");
    }
  };

  const handleToggle2FA = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        twoFactorEnabled: !currentStatus
      });
      showSuccess(`2FA ${!currentStatus ? 'enabled' : 'disabled'} for user`);
    } catch (error) {
      showError('Failed to update 2FA status');
    }
  };

  const handleLockAccount = async (userId: string, isLocked: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isLocked: !isLocked,
        status: !isLocked ? 'suspended' : 'active'
      });
      showSuccess(`Account ${!isLocked ? 'locked' : 'unlocked'}`);
    } catch (error) {
      showError('Failed to update lock status');
    }
  };

  const handleAiAudit = async () => {
    if (!selectedKyc) return;
    setIsAiAnalyzing(true);
    setAiAnalysisResult(null);
    try {
      const user = users.find(u => u.id === selectedKyc.userId);
      const images: { mimeType: string; data: string }[] = [];
      
      if (selectedKyc.type === 'personal') {
        const details = selectedKyc.details || {};
        if (details.idImageFront) images.push({ mimeType: 'image/jpeg', data: details.idImageFront });
        if (details.idImageBack) images.push({ mimeType: 'image/jpeg', data: details.idImageBack });
        if (details.idImage && !details.idImageFront) images.push({ mimeType: 'image/jpeg', data: details.idImage });
      } else {
        const details = selectedKyc.details || {};
        if (details.businessLogo) images.push({ mimeType: 'image/jpeg', data: details.businessLogo });
        if (details.businessRegistrationDoc) images.push({ mimeType: 'image/jpeg', data: details.businessRegistrationDoc });
        if (details.certificates) images.push({ mimeType: 'image/jpeg', data: details.certificates });
      }

      const validImages = images.filter(img => img.data && img.data.startsWith('data:image'));

      if (validImages.length === 0) {
        showError("No reviewable images found. Only base64-encoded images (data:image/...) are supported for AI Audit in this preview.");
        return;
      }

      const result = await analyzeKycDocuments(
        validImages,
        user?.displayName || selectedKyc.userName || 'Unknown',
        selectedKyc.details?.businessName
      );
      setAiAnalysisResult(result);
      showSuccess("AI Analysis Complete");
    } catch (err) {
      console.error(err);
      showError("AI Analysis failed. Please check Gemini API configuration.");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleKycAction = async (id: string, status: 'verified' | 'rejected') => {
    try {
      const adminDetails = {
        verifiedByAdminId: auth.currentUser?.uid || 'Unknown',
        verifiedByAdminName: auth.currentUser?.displayName || 'Admin',
        verifiedByAdminEmail: auth.currentUser?.email || 'unknown@admin.com',
        approvedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'kyc', id), { 
        status,
        ...adminDetails 
      });

      const kyc = kycSubmissions.find(k => k.id === id);
      if (kyc && status === 'verified') {
        const userDoc = await getDoc(doc(db, 'users', kyc.userId));
        const userData = userDoc.data();
        
        // Logic: If business KYC is verified OR if personal KYC is verified and they requested provider role
        const shouldBeProvider = kyc.type === 'business' || userData?.requestedProviderRole;
        
        await updateDoc(doc(db, 'users', kyc.userId), { 
          isVerified: true,
          role: shouldBeProvider ? 'provider' : 'customer',
          status: 'active',
          requestedProviderRole: deleteField(), // Clear the request once handled
          ...adminDetails
        });
      }

      // Audit Log
      await addDoc(collection(db, 'audit_logs'), {
        action: `${status === 'verified' ? 'Approved' : 'Rejected'} KYC for user ${kyc?.userId || 'Unknown'}`,
        actorId: auth.currentUser?.uid || 'Unknown',
        timestamp: serverTimestamp()
      });

      setShowKycReviewModal(false);
      setSelectedKyc(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'kyc');
    }
  };

  const handleSaveService = async () => {
    if (!formData.name) return;
    try {
      if (formData.id) {
        await updateDoc(doc(db, 'services', formData.id), {
          name: formData.name,
          description: formData.description || '',
          icon: formData.icon || '',
          iconUrl: formData.iconUrl || null,
          parentId: formData.parentId || null,
          level: formData.level || 1,
          seasonality: formData.seasonality || null,
          updatedAt: serverTimestamp()
        });

        // Cascade level update to children recursively if level changed
        const existingService = services.find(s => s.id === formData.id);
        if (existingService && existingService.level !== formData.level) {
          const levelDiff = (formData.level || 1) - existingService.level;
          
          const updateChildrenRecursive = async (parentId: string, currentDiff: number) => {
            const children = services.filter(s => s.parentId === parentId);
            for (const child of children) {
              const newChildLevel = child.level + currentDiff;
              await updateDoc(doc(db, 'services', child.id), {
                level: newChildLevel,
                updatedAt: serverTimestamp()
              });
              await updateChildrenRecursive(child.id, currentDiff);
            }
          };
          
          await updateChildrenRecursive(formData.id, levelDiff);
        }

        showSuccess('Service updated successfully.');
      } else {
        await addDoc(collection(db, 'services'), {
          name: formData.name,
          description: formData.description || '',
          icon: formData.icon || '',
          iconUrl: formData.iconUrl || null,
          parentId: formData.parentId || null,
          level: formData.level || 1,
          status: 'active',
          seasonality: formData.seasonality || null,
          createdAt: serverTimestamp()
        });
        showSuccess('Service added to taxonomy.');
      }
      setShowAddModal(false);
      setFormData({});
      setUploadProgress(0);
    } catch (error) {
      handleFirestoreError(error, formData.id ? OperationType.UPDATE : OperationType.CREATE, 'services');
    }
  };

  const handleIconUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showError('Please upload a .png or .svg file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `services/icons/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload error:", error);
          showError("Failed to upload icon");
          setIsUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData({ ...formData, iconUrl: downloadURL });
          setIsUploading(false);
          showSuccess("Icon uploaded successfully");
        }
      );
    } catch (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
    }
  };

  const handleSaveCmsVisual = async () => {
    setIsSaving(true);
    try {
      const data = {
        ...formData,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email
      };
      
      if (formData.id) {
        const { id, ...updateData } = data;
        await updateDoc(doc(db, 'cms_visual_elements', id), updateData);
        showSuccess('Visual profile updated');
      } else {
        await addDoc(collection(db, 'cms_visual_elements'), data);
        showSuccess('Visual profile created');
      }
      setShowCmsVisualModal(false);
    } catch (error) {
      handleFirestoreError(error, formData.id ? OperationType.UPDATE : OperationType.CREATE, 'cms_visual_elements');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedDefaults = async (pageId: string) => {
    const suggestions: Record<string, any[]> = {
      'nav': [
        { name: 'Global Navbar', type: 'navbar', styles: { backgroundColor: '#ffffff', borderBottomWidth: '1px' }, content: { text: 'Neighborly' } },
        { name: 'Sticky Header', type: 'navbar', styles: { backdropFilter: 'blur(10px)', opacity: '0.8' } }
      ],
      'footer': [
        { name: 'Global Footer', type: 'footer', styles: { backgroundColor: '#f8f9fa', paddingTop: '48px' } },
        { name: 'Copyright Bar', type: 'generic', styles: { fontSize: '12px', color: '#888888' }, content: { text: '© 2026 Neighborly' } }
      ],
      'home': [
        { name: 'Hero Main', type: 'hero', styles: { paddingTop: '80px', paddingBottom: '80px', textAlign: 'center' } },
        { name: 'Feature Card', type: 'card', styles: { borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' } }
      ],
      'services': [
        { name: 'Service Grid', type: 'generic', styles: { display: 'grid', gap: '24px' } },
        { name: 'Filter Sidebar', type: 'generic', styles: { width: '280px', borderRightWidth: '1px' } }
      ],
      'dashboards': [
        { name: 'Stat Card', type: 'card', styles: { borderRadius: '32px', padding: '24px' } },
        { name: 'Dashboard Sidebar', type: 'generic', styles: { width: '240px', backgroundColor: '#f5f5f5' } }
      ]
    };

    const elements = suggestions[pageId] || [];
    if (elements.length === 0) {
      showError('No standard components template for this page type yet');
      return;
    }

    try {
      setIsSaving(true);
      await Promise.all(elements.map(el => 
        addDoc(collection(db, 'cms_visual_elements'), {
          ...el,
          pageId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.email
        })
      ));
      showSuccess(`Successfully seeded ${elements.length} components for ${pageId}`);
    } catch (error) {
      showError('Failed to seed components');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePage = async () => {
    if (!formData.title || !formData.slug) return;
    try {
      const pageData = {
        ...formData,
        lastEdit: new Date().toISOString()
      };
      if (selectedPage) {
        await updateDoc(doc(db, 'pages', selectedPage.id), pageData);
      } else {
        await addDoc(collection(db, 'pages'), pageData);
      }
      setShowPageModal(false);
      setSelectedPage(null);
      setFormData({});
    } catch (error) {
      handleFirestoreError(error, selectedPage ? OperationType.UPDATE : OperationType.CREATE, 'pages');
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      await deleteDoc(doc(db, 'pages', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'pages');
    }
  };

  const handleDeleteService = async (id: string, name?: string) => {
    const isLinked = providerServices.some(ps => ps.serviceId === id);
    if (isLinked) {
      showError(`Cannot delete: Service is linked to active providers.`);
      return;
    }
    const hasChildren = services.some(s => s.parentId === id);
    const serviceName = name || services.find(s => s.id === id)?.name || 'this service';
    
    if (hasChildren) {
      setShowConfirmModal({
        show: true,
        title: `Delete Service with Sub-Services`,
        message: `WARNING: "${serviceName}" has sub-services. Deleting it will detach its children (making them root level). Are you sure?`,
        type: 'danger',
        onConfirm: async () => {
          try {
            const children = services.filter(s => s.parentId === id);
            for (const child of children) {
              const levelDiff = 1 - child.level;
              await updateDoc(doc(db, 'services', child.id), {
                parentId: null,
                level: 1,
                updatedAt: serverTimestamp()
              });
              
              if (levelDiff !== 0) {
                const updateChildrenRecursive = async (parentId: string, currentDiff: number) => {
                  const desc = services.filter(s => s.parentId === parentId);
                  for (const d of desc) {
                    await updateDoc(doc(db, 'services', d.id), {
                      level: d.level + currentDiff,
                      updatedAt: serverTimestamp()
                    });
                    await updateChildrenRecursive(d.id, currentDiff);
                  }
                };
                await updateChildrenRecursive(child.id, levelDiff);
              }
            }
            await deleteDoc(doc(db, 'services', id));
            showSuccess('Service deleted and children detached.');
            setShowConfirmModal(prev => ({ ...prev, show: false }));
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, 'services');
          }
        }
      });
    } else {
      setShowConfirmModal({
        show: true,
        title: `Delete Service`,
        message: `Are you sure you want to permanently delete "${serviceName}"?`,
        type: 'danger',
        onConfirm: async () => {
          try {
            await deleteDoc(doc(db, 'services', id));
            showSuccess('Service deleted successfully.');
            setShowConfirmModal(prev => ({ ...prev, show: false }));
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, 'services');
          }
        }
      });
    }
  };

  const handleUpdateLedgerOrder = async (orderId: string, updates: any) => {
    try {
      const historyEntry = {
        timestamp: new Date().toISOString(),
        actorId: auth.currentUser?.uid,
        changes: Object.keys(updates),
        status: updates.status || null
      };
      
      const order = contracts.find(c => c.id === orderId);
      const newHistory = [...(order?.auditHistory || []), historyEntry];

      await updateDoc(doc(db, 'contracts', orderId), {
        ...updates,
        auditHistory: newHistory
      });
      showSuccess('Order updated and audited.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'contracts');
    }
  };

  const handleEvidenceUpload = async (file: File) => {
    if (!selectedLedgerOrder) return;
    setIsReceiptUploading(true);
    setReceiptProgress(0);

    try {
      const storageRef = ref(storage, `contracts/evidence/${selectedLedgerOrder.id}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => setReceiptProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        (error) => {
          console.error(error);
          setIsReceiptUploading(false);
          showError('Failed to upload evidence');
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const evidence = [...(selectedLedgerOrder.evidenceFiles || []), { url: downloadURL, name: file.name, type: file.type }];
          await handleUpdateLedgerOrder(selectedLedgerOrder.id, { evidenceFiles: evidence });
          setSelectedLedgerOrder({ ...selectedLedgerOrder, evidenceFiles: evidence });
          setIsReceiptUploading(false);
          showSuccess('Evidence uploaded successfully');
        }
      );
    } catch (error) {
      console.error(error);
      setIsReceiptUploading(false);
    }
  };

  const handleExportLegalPDF = async (order: any) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const client = users.find(u => u.id === order.customerId);
    const provider = users.find(u => u.id === order.providerId);
    
    const getPath = (sId: string) => {
      const path = [];
      let curr = services.find(s => s.id === sId);
      while (curr) {
        path.unshift(curr.name);
        curr = services.find(s => s.id === curr?.parentId);
      }
      return path.join(' > ');
    };

    const clientSpend = contracts.filter(c => c.customerId === order.customerId).reduce((acc, c) => acc + (c.amount || 0), 0);
    const providerVol = contracts.filter(c => c.providerId === order.providerId && c.status === 'completed').length;

    doc.setFontSize(24);
    doc.text('NBRLY : AUDIT EVIDENCE REPORT', 20, 30);
    doc.setFontSize(8);
    doc.text(`REFERENCE ID: ${order.id}`, 20, 40);
    doc.text(`GENERATED On: ${new Date().toLocaleString()}`, 20, 45);
    
    doc.setFontSize(12);
    doc.text('1. TRANSACTION ARCHITECTURE', 20, 60);
    doc.setFontSize(9);
    doc.text(`Service Path: ${getPath(order.serviceId)}`, 25, 70);
    doc.text(`Status: ${order.status.toUpperCase()}`, 25, 75);
    doc.text(`Date & Time: ${new Date(order.createdAt).toLocaleString('en-CA')}`, 25, 80);
    
    doc.setFontSize(12);
    doc.text('2. PARTICIPANT PERFORMANCE', 20, 95);
    doc.setFontSize(9);
    doc.text(`Customer: ${client?.displayName || 'N/A'} (${client?.email})`, 25, 105);
    doc.text(`Total Lifetime Spend (Branch): $${clientSpend.toFixed(2)}`, 25, 110);
    doc.text(`Provider: ${provider?.businessName || provider?.displayName} (${provider?.email})`, 25, 115);
    doc.text(`Total Completed Volume (Branch): ${providerVol} Orders`, 25, 120);
    
    doc.setFontSize(12);
    doc.text('3. FINANCIAL ADJUDICATION', 20, 135);
    doc.setFontSize(9);
    doc.text(`Gross Transaction Amount: $${order.amount?.toFixed(2)}`, 25, 145);
    doc.text(`GST/HST (13%): $${(order.amount * 0.13).toFixed(2)}`, 25, 150);
    doc.text(`Platform Fee (15%): $${(order.amount * 0.15).toFixed(2)}`, 25, 155);
    doc.text(`Net Provider Payout: $${(order.amount * 0.72).toFixed(2)}`, 25, 160);
    doc.text(`Payment Instrument: ${order.paymentMethod || 'CASH'}`, 25, 165);
    doc.text(`Ref Number: ${order.paymentRef || 'N/A'}`, 25, 170);

    doc.setFontSize(12);
    doc.text('4. LEGAL SHIELD & SECRET AUDIT', 20, 185);
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(order.secretNotes || 'No encrypted admin notes recorded for this transaction.', 160);
    doc.text(splitNotes, 25, 195);

    doc.setFontSize(14);
    doc.text('4. Evidence Files', 20, 180);
    let y = 190;
    (order.evidenceFiles || []).forEach((f: any) => {
      doc.setFontSize(8);
      doc.text(`- ${f.name} (Link: ${f.url.slice(0, 50)}...)`, 25, y);
      y += 8;
    });

    doc.save(`Legal_Evidence_${order.id.slice(0, 8)}.pdf`);
    showSuccess('Legal report generated.');
  };

  const handleExportMBR = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const timestamp = new Date().toLocaleString();
    
    doc.setFontSize(22);
    doc.text('Monthly Business Review (MBR)', 20, 30);
    doc.setFontSize(10);
    doc.text(`Generated: ${timestamp}`, 20, 40);
    
    doc.setFontSize(14);
    doc.text('Top Performing Services', 20, 60);
    
    let y = 70;
    services.filter(s => s.level === 1).slice(0, 5).forEach(s => {
      const revenue = contracts.filter(c => c.servicePath?.includes(s.name)).reduce((acc, c) => acc + (c.amount || 0), 0);
      doc.setFontSize(10);
      doc.text(`${s.name}: $${revenue.toLocaleString()}`, 25, y);
      y += 10;
    });
    
    doc.text('Lost Opportunity Metrics (No Result Searches)', 20, y + 10);
    doc.text('1. Emergency Plumbing (Toronto): 142 searches', 25, y + 20);
    doc.text('2. Snow Removal (Vancouver): 89 searches', 25, y + 30);
    
    doc.save(`Neighborly_MBR_${new Date().toISOString().split('T')[0]}.pdf`);
    showSuccess('MBR PDF exported successfully.');
  };

  const handleApproveRequest = async (req: any) => {
    try {
      const parent = services.find(s => s.id === req.suggestedParentId);
      const level = parent ? (parent.level || 1) + 1 : 1;

      // Convert request to live service
      await addDoc(collection(db, 'services'), {
        name: req.suggestedName,
        parentId: req.suggestedParentId || null,
        level: level,
        description: req.description || '',
        status: 'active',
        createdAt: serverTimestamp()
      });
      
      // Update request status
      await updateDoc(doc(db, 'service_requests', req.id), { status: 'approved' });
      
      // Audit Log
      await addDoc(collection(db, 'audit_logs'), {
        action: `Approved service suggestion: ${req.suggestedName}`,
        actorId: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
        details: { requestId: req.id, level, parentId: req.suggestedParentId }
      });

      showSuccess('Service request approved and mapped into hierarchy.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'services');
    }
  };

  const handleExportData = (format: 'csv' | 'xlsx') => {
    const data = contracts.map(c => ({
      'Order Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A',
      'Client': users.find(u => u.id === c.customerId)?.displayName || 'Unknown',
      'Provider': users.find(u => u.id === c.providerId)?.displayName || 'Unknown',
      'Service Path': c.servicePath || 'Construction > Residential > Painting',
      'Contract Value': c.amount || 0,
      'Commission': c.commissionAmount || 0,
      'Status': c.status,
      'Completion Date': c.completedAt ? new Date(c.completedAt).toLocaleDateString() : 'N/A'
    }));

    if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neighborly-ledger-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
      XLSX.writeFile(workbook, `neighborly-ledger-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    showSuccess(`Exported ${contracts.length} records to ${format.toUpperCase()}`);
  };

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'kyc', label: 'KYC Review', icon: ShieldCheck },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'intelligence', label: 'Intelligence', icon: Cpu },
    { id: 'finance', label: 'Financial Ledger', icon: Wallet },
    { id: 'teams', label: 'Teams', icon: Briefcase },
    { id: 'cms', label: 'CMS', icon: Layout },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'integrations', label: 'Integrations', icon: Cpu },
    { id: 'legal', label: 'Legal', icon: Lock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-20 min-h-screen bg-app-bg">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 space-y-2">
        <div className="p-6 mb-4">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none flex items-center gap-3 text-app-text">
            <Shield className="w-8 h-8" />
            Control
          </h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-2">Platform Admin Panel</p>
        </div>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl shadow-neutral-900/20 dark:shadow-none" 
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-white dark:text-neutral-900" : "text-neutral-400")} />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Overview Section - Uber Eats Inspired Layout */}
            {activeTab === 'overview' && (
              <div className="space-y-12">
                {/* 1. Top Hero / Promotion Layer */}
                <div className="relative group overflow-hidden rounded-[3rem] bg-neutral-900 border border-neutral-800 shadow-2xl">
                  {/* Grainy Texture + Gradient Glow */}
                  <div className="absolute inset-0 opacity-[0.4] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                  <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full" />
                  <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full" />
                  
                  <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 max-w-xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500 text-neutral-900 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <TrendingUp className="w-3 h-3" />
                        Platform Growth +12.4%
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white leading-[0.85] uppercase">
                        The Future <br /> of Local <span className="text-emerald-500 underline decoration-2 underline-offset-4">Markets</span>
                      </h2>
                      <p className="text-neutral-400 text-[10px] font-bold max-w-sm">
                        Monitoring {contracts.length.toLocaleString()} active transactions across {services.filter(s => s.level === 1).length} sectors.
                      </p>
                      <div className="flex items-center gap-3">
                        <button className="px-6 py-2 bg-white text-neutral-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform active:scale-95">
                          Analyze Operations
                        </button>
                        <button className="px-6 py-2 border border-neutral-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all">
                          Live Metrics
                        </button>
                      </div>
                    </div>

                    <div className="w-full md:w-[350px] h-[150px] bg-neutral-800/50 rounded-[1.5rem] border border-neutral-700/50 p-4 flex flex-col justify-end group-hover:border-emerald-500/30 transition-colors">
                      <div className="h-full w-full flex items-end gap-1 pb-4">
                        {revenueHistory.map((h, i) => (
                          <motion.div 
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: i * 0.05 }}
                            className="flex-1 bg-emerald-500/20 rounded-t-sm border-t border-emerald-500/50"
                          />
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Revenue Velocity</p>
                        <span className="text-emerald-400 text-lg font-black italic">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Category Chips (Horizontal Scroll) */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-4">Quick Navigation</h4>
                  <div className="flex items-center gap-3 overflow-x-auto pb-4 px-2 custom-scrollbar snap-x no-scrollbar">
                    {[
                      { label: 'Active Jobs', value: activeJobs, icon: Activity, active: true },
                      { label: 'Pending KYC', value: pendingKyc, icon: ShieldAlert, active: false },
                      { label: 'Market Gaps', value: marketGaps, icon: AlertCircle, active: false },
                      { label: 'Admins Online', value: adminsOnline, icon: Users, active: false },
                      { label: 'Open Disputes', value: openDisputes, icon: Lock, active: false },
                      { label: 'Audit Required', value: (pendingKyc + openDisputes), icon: ClipboardCheck, active: false },
                    ].map((chip, i) => (
                      <button 
                        key={i}
                        className={cn(
                          "flex items-center gap-3 px-6 py-4 rounded-full border transition-all snap-start shrink-0 min-w-[200px]",
                          chip.active 
                            ? "bg-neutral-900 border-neutral-900 text-white shadow-xl shadow-neutral-900/20" 
                            : "bg-white border-neutral-100 text-neutral-900 hover:bg-neutral-50"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", chip.active ? "bg-emerald-500" : "bg-neutral-100")}>
                          <chip.icon className={cn("w-4 h-4", chip.active ? "text-neutral-900" : "text-neutral-500")} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-tighter opacity-60 leading-none">{chip.label}</p>
                          <p className="text-sm font-black italic">{chip.value}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-12">
                  {/* 3. Live Feed (Vertical Feed) */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-neutral-900">Live Logistics Feed</h3>
                      <button className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:underline">View All Logs</button>
                    </div>
                    <div className="grid gap-4">
                      {auditLogs.length > 0 ? (
                        auditLogs.slice(0, 8).map((log, i) => (
                          <motion.div 
                            key={log.id} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-6 p-6 bg-white border border-neutral-100 rounded-[2rem] hover:shadow-2xl hover:scale-[1.01] transition-all group"
                          >
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-neutral-100 transition-colors",
                              log.action.toLowerCase().includes('approved') ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              log.action.toLowerCase().includes('rejected') ? "bg-rose-50 text-rose-600 border-rose-100" :
                              "bg-neutral-50 text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white"
                            )}>
                              {log.action.toLowerCase().includes('kyc') ? <ShieldCheck className="w-6 h-6" /> :
                               log.action.toLowerCase().includes('updated') ? <History className="w-6 h-6" /> :
                               <Activity className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-black italic uppercase tracking-tight text-neutral-900">{log.action}</p>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-neutral-100 rounded text-neutral-500 italic">ID: {log.id.slice(-6)}</span>
                                <span className="text-[10px] font-bold text-neutral-400">
                                  {log.timestamp instanceof Date ? log.timestamp.toLocaleString('en-CA', { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                                </span>
                              </div>
                            </div>
                            <button className="w-10 h-10 rounded-full border border-neutral-100 flex items-center justify-center text-neutral-300 hover:text-emerald-500 transition-colors">
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </motion.div>
                        ))
                      ) : (
                        <div className="p-20 text-center bg-white rounded-[3rem] border border-dashed border-neutral-200">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                            className="w-12 h-12 text-neutral-200 mx-auto mb-4"
                          >
                            <Loader2 className="w-full h-full" />
                          </motion.div>
                          <p className="text-sm font-black uppercase tracking-widest text-neutral-300">Awaiting stream data...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Performance Metrics (Rounded Widgets) */}
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-neutral-900">Performance</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { label: 'Cloud Efficiency', value: '99.9%', trend: '+0.4%', icon: Cpu, color: 'text-emerald-500' },
                        { label: 'System Latency', value: '42ms', trend: '-2ms', icon: Activity, color: 'text-blue-500' },
                        { label: 'Success Rate', value: `${((contracts.filter(c => c.status === 'completed').length / (contracts.length || 1)) * 100).toFixed(1)}%`, trend: '+1.2%', icon: CheckCircle, color: 'text-orange-500' },
                        { label: 'Data Footprint', value: `${((users.length + contracts.length + requests.length) * 0.1).toFixed(1)} GB`, trend: 'Total', icon: Globe, color: 'text-indigo-500' },
                      ].map((metric, i) => (
                        <div key={i} className="p-6 bg-white border border-neutral-100 rounded-[2.5rem] flex items-center justify-between hover:shadow-lg transition-all">
                          <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-neutral-50", metric.color.replace('text', 'bg').replace('500', '100'))}>
                              <metric.icon className={cn("w-6 h-6", metric.color)} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{metric.label}</p>
                              <h4 className="text-xl font-black italic text-neutral-900">{metric.value}</h4>
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-black uppercase">
                               {metric.trend}
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-10 bg-emerald-500 rounded-[3rem] text-neutral-900 space-y-4 relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign className="w-32 h-32 rotate-12" />
                      </div>
                      <h4 className="text-xl font-black uppercase italic leading-none">Marketplace <br /> Health Index</h4>
                      <p className="text-sm font-bold opacity-80">{healthIndex}/100</p>
                      <div className="h-2 w-full bg-neutral-900/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${healthIndex}%` }}
                          className="h-full bg-neutral-900"
                        />
                      </div>
                      <button className="w-full py-3 bg-neutral-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">
                        Optimize Revenue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Management Section */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* Advanced Filter Bar */}
                <div className="bg-app-card p-6 rounded-[2.5rem] border border-app-border shadow-sm space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">User Directory</h3>
                      <div className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        {filteredUsers.length} Users
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input 
                          type="text" 
                          placeholder="Search users..." 
                          className="pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 text-app-text w-64"
                        />
                      </div>
                      <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl border border-app-border text-sm font-bold transition-all",
                          showFilters ? "bg-neutral-900 text-white" : "bg-neutral-50 dark:bg-neutral-800 text-app-text hover:bg-neutral-100"
                        )}
                      >
                        <Filter className="w-4 h-4" />
                        Filters
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => setShowColumnToggle(!showColumnToggle)}
                          className="p-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl hover:bg-neutral-100 text-app-text"
                        >
                          <Columns className="w-4 h-4" />
                        </button>
                        <AnimatePresence>
                          {showColumnToggle && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute right-0 mt-2 w-48 bg-app-card border border-app-border rounded-2xl shadow-xl z-50 p-4 space-y-2"
                            >
                              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Toggle Columns</p>
                              {[
                                { id: 'role', label: 'Role' },
                                { id: 'status', label: 'Status' },
                                { id: 'lastInteraction', label: 'Last Interaction' },
                                { id: 'device', label: 'Device/Location' },
                                { id: 'tags', label: 'Tags' },
                                { id: 'financials', label: 'Financials' }
                              ].map(col => (
                                <label key={col.id} className="flex items-center gap-2 cursor-pointer group">
                                  <input 
                                    type="checkbox" 
                                    checked={visibleColumns.includes(col.id)}
                                    onChange={() => {
                                      if (visibleColumns.includes(col.id)) {
                                        setVisibleColumns(visibleColumns.filter(c => c !== col.id));
                                      } else {
                                        setVisibleColumns([...visibleColumns, col.id]);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                    visibleColumns.includes(col.id) ? "bg-neutral-900 border-neutral-900" : "border-neutral-300"
                                  )}>
                                    {visibleColumns.includes(col.id) && <CheckSquare className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className="text-xs font-bold text-neutral-600 group-hover:text-neutral-900">{col.label}</span>
                                </label>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showFilters && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-6 border-t border-app-border grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Status</label>
                            <select 
                              value={userFilters.status}
                              onChange={e => setUserFilters({ ...userFilters, status: e.target.value })}
                              className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-xs font-bold text-app-text"
                            >
                              <option value="all">All Status</option>
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="pending_verification">Pending</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Role</label>
                            <select 
                              value={userFilters.role}
                              onChange={e => setUserFilters({ ...userFilters, role: e.target.value })}
                              className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-xs font-bold text-app-text"
                            >
                              <option value="all">All Roles</option>
                              <option value="customer">Customer</option>
                              <option value="provider">Provider</option>
                              <option value="platform_admin">Admin</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Device</label>
                            <select 
                              value={userFilters.device}
                              onChange={e => setUserFilters({ ...userFilters, device: e.target.value })}
                              className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-xs font-bold text-app-text"
                            >
                              <option value="all">All Devices</option>
                              <option value="web">Web</option>
                              <option value="ios">iOS</option>
                              <option value="android">Android</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Activity</label>
                            <select 
                              value={userFilters.activity}
                              onChange={e => setUserFilters({ ...userFilters, activity: e.target.value })}
                              className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-xs font-bold text-app-text"
                            >
                              <option value="all">Anytime</option>
                              <option value="online">Online Now</option>
                              <option value="24h">Last 24h</option>
                              <option value="week">Last Week</option>
                            </select>
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Registration Date</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="date" 
                                value={userFilters.dateRange.from}
                                onChange={e => setUserFilters({ ...userFilters, dateRange: { ...userFilters.dateRange, from: e.target.value } })}
                                className="flex-1 p-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-xs font-bold text-app-text"
                              />
                              <span className="text-neutral-400">-</span>
                              <input 
                                type="date" 
                                value={userFilters.dateRange.to}
                                onChange={e => setUserFilters({ ...userFilters, dateRange: { ...userFilters.dateRange, to: e.target.value } })}
                                className="flex-1 p-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-xs font-bold text-app-text"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bulk Actions Bar */}
                <AnimatePresence>
                  {selectedUserIds.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-neutral-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg">
                          <CheckSquare className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">{selectedUserIds.length} Selected</span>
                        </div>
                        <div className="h-4 w-px bg-white/20" />
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleBulkAction('email')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleBulkAction('push')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Send Push"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleBulkAction('export')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Export CSV"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleBulkAction('activate')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-emerald-400" title="Activate All"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleBulkAction('suspend')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400" title="Suspend All"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedUserIds([])}
                        className="text-[10px] font-black uppercase tracking-widest hover:underline"
                      >
                        Deselect All
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Users Table */}
                <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-neutral-50/50 dark:bg-neutral-800/50">
                          <th className="px-6 py-4 w-12">
                            <button 
                              onClick={() => {
                                if (selectedUserIds.length === filteredUsers.length) {
                                  setSelectedUserIds([]);
                                } else {
                                  setSelectedUserIds(filteredUsers.map(u => u.id));
                                }
                              }}
                              className="w-5 h-5 rounded border border-neutral-300 flex items-center justify-center"
                            >
                              {selectedUserIds.length === filteredUsers.length ? <CheckSquare className="w-3 h-3 text-neutral-900" /> : null}
                            </button>
                          </th>
                          <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">User</th>
                          {visibleColumns.includes('role') && <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Role</th>}
                          {visibleColumns.includes('status') && <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>}
                          {visibleColumns.includes('lastInteraction') && <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Last Interaction</th>}
                          {visibleColumns.includes('device') && <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Device/Location</th>}
                          {visibleColumns.includes('tags') && <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Tags</th>}
                          {visibleColumns.includes('financials') && <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Financials</th>}
                          <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors group">
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => {
                                  if (selectedUserIds.includes(user.id)) {
                                    setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                  } else {
                                    setSelectedUserIds([...selectedUserIds, user.id]);
                                  }
                                }}
                                className={cn(
                                  "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                  selectedUserIds.includes(user.id) ? "bg-neutral-900 border-neutral-900" : "border-neutral-300"
                                )}
                              >
                                {selectedUserIds.includes(user.id) && <CheckSquare className="w-3 h-3 text-white" />}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div 
                                className="flex items-center gap-4 cursor-pointer"
                                onClick={() => {
                                  setProfileUser(user);
                                  setSelectedUser(user);
                                  setFormData({ ...user });
                                  setIsEditMode(false);
                                  setShowUserHubModal(true);
                                }}
                              >
                                <div className="w-10 h-10 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl flex items-center justify-center font-black italic">
                                  {user.displayName?.[0] || 'U'}
                                </div>
                                <div>
                                  <p className="font-bold text-app-text group-hover:text-blue-600 transition-colors">{user.displayName}</p>
                                  <p className="text-xs text-neutral-500">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            {visibleColumns.includes('role') && (
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                  user.role === 'owner' ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" :
                                  user.role === 'provider' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                                  "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                                )}>
                                  {user.role}
                                </span>
                              </td>
                            )}
                            {visibleColumns.includes('status') && (
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    user.status === 'active' ? "bg-emerald-500" : 
                                    user.status === 'suspended' ? "bg-red-500" : "bg-neutral-300"
                                  )} />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{user.status}</span>
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes('lastInteraction') && (
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-app-text">{user.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : 'Never'}</p>
                                  <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Login</p>
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes('device') && (
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {user.deviceType === 'ios' || user.deviceType === 'android' ? <Smartphone className="w-4 h-4 text-neutral-400" /> : <Globe className="w-4 h-4 text-neutral-400" />}
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-app-text">{user.location?.city || 'Unknown'}</p>
                                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest">{user.deviceType || 'Web'}</p>
                                  </div>
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes('tags') && (
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {user.tags?.slice(0, 2).map((tag: string) => (
                                    <span key={tag} className="px-2 py-0.5 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded text-[8px] font-black uppercase tracking-widest text-neutral-500">
                                      {tag}
                                    </span>
                                  ))}
                                  {user.tags?.length > 2 && <span className="text-[8px] font-black text-neutral-400">+{user.tags.length - 2}</span>}
                                  {(!user.tags || user.tags.length === 0) && <span className="text-[8px] text-neutral-300 uppercase font-black">No Tags</span>}
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes('financials') && (
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-app-text">${user.totalSpent?.toLocaleString() || '0'}</p>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="text-[10px] font-black text-neutral-400">{user.successRate || 100}%</span>
                                  </div>
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1">
                                <a href={`mailto:${user.email}`} className="p-2 text-neutral-400 hover:text-blue-600 transition-colors">
                                  <Mail className="w-4 h-4" />
                                </a>
                                {user.phone && (
                                  <a href={`tel:${user.phone}`} className="p-2 text-neutral-400 hover:text-emerald-600 transition-colors">
                                    <Phone className="w-4 h-4" />
                                  </a>
                                )}
                                <div className="relative group/menu">
                                  <button className="p-2 text-neutral-400 hover:text-app-text">
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  <div className="absolute right-0 top-full mt-2 w-48 bg-app-card border border-app-border rounded-2xl shadow-xl z-50 py-2 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all">
                                    <button 
                                      onClick={() => {
                                        setProfileUser(user);
                                        setSelectedUser(user);
                                        setFormData({ 
                                          role: user.role, 
                                          status: user.status,
                                          displayName: user.displayName || '',
                                          email: user.email || '',
                                          phone: user.phone || '',
                                          businessName: user.businessName || '',
                                          serviceCategory: user.serviceCategory || '',
                                          isVerifiedBadge: user.isVerifiedBadge || false,
                                          interests: user.interests || [],
                                          id: user.id
                                        });
                                        setShowUserHubModal(true);
                                        setIsEditMode(false);
                                        setProfileTab('overview');
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-app-text hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                                    >
                                      <Users className="w-3.5 h-3.5" /> View Profile
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setProfileUser(user);
                                        setSelectedUser(user);
                                        setFormData({ 
                                          role: user.role, 
                                          status: user.status,
                                          displayName: user.displayName || '',
                                          email: user.email || '',
                                          phone: user.phone || '',
                                          businessName: user.businessName || '',
                                          serviceCategory: user.serviceCategory || '',
                                          isVerifiedBadge: user.isVerifiedBadge || false,
                                          interests: user.interests || [],
                                          id: user.id
                                        });
                                        setShowUserHubModal(true);
                                        setIsEditMode(true);
                                        setEditUserTab('general');
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-app-text hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                                    >
                                      <Settings className="w-3.5 h-3.5" /> Quick Edit
                                    </button>
                                    <div className="h-px bg-app-border my-1" />
                                    <button 
                                      onClick={() => handleBulkAction(user.status === 'active' ? 'suspend' : 'activate')}
                                      className={cn(
                                        "w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2",
                                        user.status === 'active' ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"
                                      )}
                                    >
                                      {user.status === 'active' ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                      {user.status === 'active' ? 'Suspend User' : 'Activate User'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredUsers.length === 0 && (
                    <div className="p-20 text-center">
                      <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-neutral-300" />
                      </div>
                      <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No users found matching filters.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KYC Section */}
            {activeTab === 'kyc' && (
              <div className="space-y-8">
                <div className="flex gap-6 border-b border-app-border mb-6">
                  {[
                    { id: 'personal', label: 'Personal KYC', icon: User },
                    { id: 'business', label: 'Business KYC', icon: Building2 }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setKycTypeTab(tab.id as any)}
                      className={cn(
                        "px-6 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
                        kycTypeTab === tab.id 
                          ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white" 
                          : "border-transparent text-neutral-400 hover:text-neutral-600"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { label: 'Pending Verification', count: kycSubmissions.filter(k => k.status === 'pending' && k.type === kycTypeTab).length, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
                    { label: 'Verified Users', count: kycSubmissions.filter(k => k.status === 'verified' && k.type === kycTypeTab).length, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
                    { label: 'Rejected', count: kycSubmissions.filter(k => k.status === 'rejected' && k.type === kycTypeTab).length, color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-app-card p-6 rounded-3xl border border-app-border shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{stat.label}</p>
                      <h4 className={cn("text-3xl font-black mt-1", stat.color.split(' ')[2])}>{stat.count}</h4>
                    </div>
                  ))}
                </div>

                <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-app-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-app-text">KYC Submissions</h3>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input 
                          type="text" 
                          placeholder="Search name, email, phone..." 
                          value={kycSearch}
                          onChange={(e) => setKycSearch(e.target.value)}
                          className="pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 text-app-text w-64"
                        />
                      </div>
                      <select 
                        value={kycFilter}
                        onChange={(e) => setKycFilter(e.target.value)}
                        className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-sm font-bold text-app-text focus:outline-none"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/50 dark:bg-neutral-800/50">
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">User Details</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Type</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Submitted</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {kycSubmissions
                        .filter(k => {
                          const matchesSearch = !kycSearch || 
                            k.userName?.toLowerCase().includes(kycSearch.toLowerCase()) ||
                            k.userEmail?.toLowerCase().includes(kycSearch.toLowerCase()) ||
                            k.userPhone?.toLowerCase().includes(kycSearch.toLowerCase()) ||
                            k.userId.toLowerCase().includes(kycSearch.toLowerCase());
                          const matchesFilter = kycFilter === 'all' || k.status === kycFilter;
                          const matchesType = k.type === kycTypeTab;
                          return matchesSearch && matchesFilter && matchesType;
                        })
                        .map((kyc) => (
                        <tr key={kyc.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="px-8 py-6">
                            <div className="space-y-0.5">
                              <p className="font-bold text-app-text">{kyc.userName || 'Anonymous'}</p>
                              <p className="text-[10px] text-neutral-500 font-medium">{kyc.userEmail}</p>
                              <p className="text-[10px] text-neutral-400">{kyc.userPhone || 'No phone'}</p>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-app-text rounded-md">{kyc.type}</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest",
                              kyc.status === 'verified' ? "bg-emerald-100 text-emerald-700" :
                              kyc.status === 'pending' ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            )}>
                              {kyc.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-xs text-neutral-500">{new Date(kyc.createdAt).toLocaleDateString()}</td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => {
                                setSelectedKyc(kyc);
                                setShowKycReviewModal(true);
                              }}
                              className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Services Section (Taxonomy & Intelligence) */}
            {activeTab === 'services' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black italic uppercase tracking-tight text-app-text">Service Intelligence</h3>
                    <p className="text-neutral-500 text-sm font-medium">Manage taxonomy and analyze performance across 5 levels.</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => { setShowAddModal(true); setFormData({ type: 'service', level: 1 }); }}
                      className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                    >
                      <PlusCircle className="w-4 h-4" />
                      New Root Service
                    </button>
                  </div>
                </div>

                {/* Sub-navigation */}
                <div className="flex gap-4 border-b border-app-border">
                  {[
                    { id: 'ledger', label: 'Intelligence Ledger', icon: List },
                    { id: 'inventory', label: 'Service Inventory', icon: FileSpreadsheet },
                    { id: 'hierarchy', label: 'Hierarchy Explorer', icon: Layers }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setServicesTab(tab.id as any)}
                      className={cn(
                        "px-6 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
                        servicesTab === tab.id 
                          ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white" 
                          : "border-transparent text-neutral-400 hover:text-neutral-600"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {servicesTab === 'ledger' && (
                  <div className="space-y-8 mt-8">
                    {/* Top Header Layer */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl">
                             <Layers className="w-6 h-6 text-emerald-500" />
                          </div>
                          <div>
                             <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Service Intelligence Ledger</h2>
                             <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-none">Global Audit Trail • Real-time Compliance</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className="relative flex-1 md:w-80">
                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                             <input 
                               type="text" 
                               placeholder="Search Reference ID, Ref Num, or Status..." 
                               value={ledgerSearch}
                               onChange={(e) => setLedgerSearch(e.target.value)}
                               className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-neutral-700 shadow-xl"
                             />
                          </div>
                          <button 
                            onClick={async () => {
                              const data = contracts.map(c => {
                                const client = users.find(u => u.id === c.customerId);
                                const provider = users.find(u => u.id === c.providerId);
                                const getPath = (sId: string) => {
                                  const path = [];
                                  let curr = services.find(s => s.id === sId);
                                  while (curr) {
                                    path.unshift(curr.name);
                                    curr = services.find(s => s.id === curr?.parentId);
                                  }
                                  return path.join(' > ');
                                };
                                const clientSpend = contracts.filter(con => con.customerId === c.customerId).reduce((acc, con) => acc + (con.amount || 0), 0);
                                const provVol = contracts.filter(con => con.providerId === c.providerId && con.status === 'completed').length;
                                return {
                                  'ORDER ID': c.id,
                                  'SERVICE PATH': getPath(c.serviceId),
                                  'CLIENT NAME': client?.displayName || client?.email,
                                  'PROVIDER NAME': provider?.businessName || provider?.displayName || provider?.email,
                                  'ORDER DATE': new Date(c.createdAt).toLocaleString('en-CA'),
                                  'STATUS': c.status.toUpperCase(),
                                  'GROSS AMOUNT ($)': c.amount || 0,
                                  'GST/HST (13%) ($)': (c.amount || 0) * 0.13,
                                  'PLATFORM FEE (15%) ($)': (c.amount || 0) * 0.15,
                                  'NET PAYOUT ($)': (c.amount || 0) * 0.72,
                                  'TRANSACTION TYPE': c.paymentMethod || 'CASH',
                                  'REF NUMBER': c.paymentRef || 'N/A',
                                  'CLIENT TOTAL SPEND': clientSpend,
                                  'PROVIDER VOLUME': provVol,
                                  'ADMIN NOTES': c.secretNotes || ''
                                };
                              });
                              const ws = XLSX.utils.json_to_sheet(data);
                              const wb = XLSX.utils.book_new();
                              XLSX.utils.book_append_sheet(wb, ws, "Neighborly_Audit_Ledger");
                              XLSX.writeFile(wb, `Neighborly_Accountant_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
                              showSuccess("Accountant Audit Ledger Exported Successfully");
                            }}
                            className="px-8 py-3 bg-white text-neutral-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            Accountant Export (XLSX)
                          </button>
                       </div>
                    </div>

                    {/* Fixed Cascading Filters (Horizontal Style) */}
                    <div className="bg-neutral-950 p-6 rounded-[2.5rem] border border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                             <Filter className="w-5 h-5 text-emerald-500" />
                           </div>
                           <h4 className="text-lg font-black italic uppercase tracking-tighter text-white">Taxonomy Filtering Hub</h4>
                        </div>
                        <button 
                          onClick={() => setAnalyticsFilters([[], [], [], [], []])}
                          className="px-6 py-2 bg-neutral-900 text-neutral-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                        >
                          Clear Selection
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {[0, 1, 2, 3, 4].map((level) => {
                          const availableOptions = level === 0 
                            ? services.filter(s => s.level === 1)
                            : services.filter(s => analyticsFilters[level - 1].includes(s.parentId || ''));
                          
                          const isActive = level === 0 || analyticsFilters[level - 1].length > 0;

                          return (
                            <div 
                              key={level} 
                              className={cn(
                                "flex flex-col bg-neutral-900/50 border border-neutral-800/50 rounded-2xl h-56 transition-all",
                                !isActive ? "opacity-20 pointer-events-none grayscale" : "hover:border-neutral-700"
                              )}
                            >
                              <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
                                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Level {level + 1}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              </div>
                              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {availableOptions.map(option => (
                                  <label 
                                    key={option.id}
                                    className={cn(
                                      "flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all border border-transparent",
                                      analyticsFilters[level].includes(option.id)
                                        ? "bg-emerald-500/10 border-emerald-500/30"
                                        : "hover:bg-neutral-800"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-3 h-3 rounded-full border-2 transition-all shrink-0",
                                      analyticsFilters[level].includes(option.id) 
                                        ? "bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                        : "border-neutral-700"
                                    )} />
                                    <span className={cn(
                                      "text-[10px] font-black uppercase tracking-tight truncate",
                                      analyticsFilters[level].includes(option.id) ? "text-emerald-400" : "text-neutral-500"
                                    )}>{option.name}</span>
                                    <input 
                                      type="checkbox"
                                      className="hidden"
                                      checked={analyticsFilters[level].includes(option.id)}
                                      onChange={() => {
                                        const current = [...analyticsFilters[level]];
                                        const nextFilters = [...analyticsFilters];
                                        if (current.includes(option.id)) {
                                          nextFilters[level] = current.filter(id => id !== option.id);
                                        } else {
                                          nextFilters[level] = [...current, option.id];
                                        }
                                        for (let i = level + 1; i < 5; i++) nextFilters[i] = [];
                                        setAnalyticsFilters(nextFilters);
                                      }}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* The Professional Audit Ledger Table */}
                    <div className="bg-neutral-950 rounded-[2.5rem] border border-neutral-800 shadow-2xl relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                      <div className="overflow-x-auto relative z-10 custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[2000px]">
                          <thead>
                            <tr className="bg-neutral-900 text-neutral-400">
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[140px] border-b border-neutral-800">Order ID</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[200px] border-b border-neutral-800">Service Path</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[180px] border-b border-neutral-800">Client Name</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[180px] border-b border-neutral-800">Provider Name</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[150px] border-b border-neutral-800">Order Date</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[120px] border-b border-neutral-800">Status</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[120px] border-b border-neutral-800 text-right">Gross</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[120px] border-b border-neutral-800 text-right">Tax (13%)</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[120px] border-b border-neutral-800 text-right">Fee (15%)</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[200px] border-b border-neutral-800">Transaction Det.</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[120px] border-b border-neutral-800 text-right">Client Spend</th>
                              <th className="p-6 text-[9px] font-black uppercase tracking-widest w-[120px] border-b border-neutral-800 text-right">Prov Vol.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800">
                            {(() => {
                              const allSelectedIds = analyticsFilters.flat();
                              const isFiltered = allSelectedIds.length > 0;
                              
                              const isServiceMatch = (serviceId: string) => {
                                if (!isFiltered) return true;
                                return allSelectedIds.includes(serviceId);
                              };

                              const filteredContracts = contracts
                                .filter(c => isServiceMatch(c.serviceId))
                                .filter(c => {
                                  if (!ledgerSearch) return true;
                                  const term = ledgerSearch.toLowerCase();
                                  return c.id.toLowerCase().includes(term) || c.status.toLowerCase().includes(term);
                                });

                              if (filteredContracts.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={12} className="p-20 text-center">
                                       <Activity className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
                                       <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest italic">No matching records indexed</p>
                                    </td>
                                  </tr>
                                );
                              }

                              return filteredContracts.map((order, idx) => {
                                  const client = users.find(u => u.id === order.customerId);
                                  const provider = users.find(u => u.id === order.providerId);
                                  
                                  const getPath = (sId: string) => {
                                    const path = [];
                                    let curr = services.find(s => s.id === sId);
                                    while (curr) {
                                      path.unshift(curr.name);
                                      curr = services.find(s => s.id === curr?.parentId);
                                    }
                                    return path.join(' > ');
                                  };

                                  const gross = order.amount || 0;
                                  const tax = gross * 0.13;
                                  const fee = gross * 0.15;
                                  const isDisputed = order.status === 'disputed' || order.isDisputed;
                                  const isExpanded = expandedLedgerRows.includes(order.id);

                                  // Performance Stats
                                  const clientTotalSpend = contracts.filter(c => c.customerId === order.customerId).reduce((sum, curr) => sum + (curr.amount || 0), 0);
                                  const providerVolume = contracts.filter(c => c.providerId === order.providerId && c.status === 'completed').length;

                                  return (
                                    <React.Fragment key={order.id}>
                                      <tr className={cn(
                                        "transition-all",
                                        isExpanded ? "bg-neutral-900" : "hover:bg-neutral-900/40",
                                        isDisputed && "bg-rose-500/5"
                                      )}>
                                        <td className="p-6">
                                          <button 
                                            onClick={() => { setSelectedLedgerOrder(order); setShowLedgerDetailModal(true); }}
                                            className="group flex items-center gap-2"
                                          >
                                            <div className="w-2 h-2 rounded-full bg-neutral-700 group-hover:bg-emerald-500 shadow-sm" />
                                            <span className="font-black text-white uppercase tracking-tighter text-[11px] group-hover:underline">{order.id.slice(0, 10)}</span>
                                          </button>
                                        </td>
                                        <td className="p-6">
                                          <p className="text-[9px] font-black text-neutral-500 uppercase truncate max-w-[180px] bg-neutral-900 px-2 py-1 rounded border border-neutral-800 shadow-inner">
                                            {getPath(order.serviceId)}
                                          </p>
                                        </td>
                                        <td className="p-6">
                                          <button 
                                            onClick={() => { setProfileUser(client); setSelectedUser(client); setShowUserHubModal(true); }}
                                            className="text-[10px] font-black text-white hover:text-emerald-500 transition-colors uppercase truncate max-w-[160px] text-left"
                                          >
                                            {client?.displayName || client?.email?.split('@')[0]}
                                          </button>
                                        </td>
                                        <td className="p-6">
                                          <button 
                                            onClick={() => { setProfileUser(provider); setSelectedUser(provider); setShowUserHubModal(true); }}
                                            className="text-[10px] font-black text-white hover:text-emerald-500 transition-colors uppercase truncate max-w-[160px] text-left"
                                          >
                                            {provider?.businessName || provider?.displayName || provider?.email?.split('@')[0]}
                                          </button>
                                        </td>
                                        <td className="p-6">
                                          <p className="text-[10px] font-black text-white tracking-widest">{new Date(order.createdAt).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' })}</p>
                                        </td>
                                        <td className="p-6">
                                          <div className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                            order.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]" :
                                            isDisputed ? "bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-pulse" :
                                            "bg-neutral-800 text-neutral-500 border-neutral-700"
                                          )}>
                                            {order.status}
                                          </div>
                                        </td>
                                        <td className="p-6 text-right font-black text-[12px] text-white">${gross.toFixed(2)}</td>
                                        <td className="p-6 text-right font-bold text-[10px] text-neutral-500">${tax.toFixed(2)}</td>
                                        <td className="p-6 text-right font-bold text-[10px] text-rose-500/80">-${fee.toFixed(2)}</td>
                                        <td className="p-6">
                                          <div className="flex items-center gap-3">
                                             <div className="space-y-0.5">
                                               <p className="text-[9px] font-black text-white uppercase">{order.paymentMethod || 'CASH'}</p>
                                               <p className="text-[8px] font-bold text-neutral-600 font-mono tracking-tighter">{order.paymentRef || 'N/A'}</p>
                                             </div>
                                             <button 
                                               onClick={() => setExpandedLedgerRows(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id])}
                                               className="ml-auto w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:bg-neutral-800 transition-all"
                                             >
                                                <Paperclip className={cn("w-3.5 h-3.5", (order.evidenceFiles || []).length > 0 ? "text-emerald-500" : "text-neutral-500")} />
                                             </button>
                                          </div>
                                        </td>
                                        <td className="p-6 text-right font-black text-[11px] text-blue-500">${clientTotalSpend.toFixed(2)}</td>
                                        <td className="p-6 text-right font-black text-[11px] text-emerald-500">{providerVolume} Jobs</td>
                                      </tr>
                                      
                                      <AnimatePresence>
                                        {isExpanded && (
                                          <tr>
                                            <td colSpan={12} className="p-0 border-none bg-neutral-950">
                                              <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden px-10 py-10 border-b border-neutral-800"
                                              >
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                                   <div className="space-y-6">
                                                      <h5 className="text-[10px] font-black italic uppercase tracking-[0.25em] text-neutral-600 flex items-center gap-2">
                                                         <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                         Legal Shield protocol
                                                      </h5>
                                                      <div className="p-6 bg-neutral-900 rounded-3xl border border-neutral-800 space-y-4 shadow-2xl">
                                                         <div className="flex items-center justify-between">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Legal Adjudication</p>
                                                            <div className="flex gap-2">
                                                               <button 
                                                                 onClick={() => handleUpdateLedgerOrder(order.id, { isDisputed: !order.isDisputed, status: !order.isDisputed ? 'disputed' : 'completed' })}
                                                                 className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all", order.isDisputed ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]" : "bg-neutral-950 text-neutral-600")}
                                                               >
                                                                 Dispute Status
                                                               </button>
                                                            </div>
                                                         </div>
                                                         <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                                                            <p className="text-[9px] font-bold text-neutral-400 italic">"Flagging this order triggers a manual compliance audit and freezes the provider payout loop."</p>
                                                            <div className="flex justify-between items-center text-[8px] font-black uppercase text-neutral-600">
                                                               <span>Protection Active</span>
                                                               <span>CRA Ready</span>
                                                            </div>
                                                         </div>
                                                      </div>
                                                   </div>

                                                   <div className="space-y-6">
                                                      <h5 className="text-[10px] font-black italic uppercase tracking-[0.25em] text-neutral-600 flex items-center gap-2">
                                                         <Lock className="w-4 h-4 text-emerald-500" />
                                                         Secret Audit Ledger
                                                      </h5>
                                                      <textarea 
                                                        value={order.secretNotes || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setContracts(prev => prev.map(c => c.id === order.id ? {...c, secretNotes: val} : c));
                                                        }}
                                                        onBlur={(e) => handleUpdateLedgerOrder(order.id, { secretNotes: e.target.value })}
                                                        placeholder="Encrypted admin-level notes. These are never visible to the customer or provider."
                                                        className="w-full h-36 p-6 bg-neutral-900 border border-neutral-800 rounded-3xl text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-neutral-700 resize-none shadow-2xl"
                                                      />
                                                   </div>

                                                   <div className="space-y-6">
                                                      <div className="flex items-center justify-between">
                                                         <h5 className="text-[10px] font-black italic uppercase tracking-[0.25em] text-neutral-600 flex items-center gap-2">
                                                            <Paperclip className="w-4 h-4 text-emerald-500" />
                                                            Evidence Layer
                                                         </h5>
                                                         <label className="cursor-pointer px-4 py-1.5 bg-emerald-500 text-neutral-950 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg">
                                                            Upload Proof
                                                            <input 
                                                              type="file" 
                                                              className="hidden" 
                                                              onChange={(e) => e.target.files?.[0] && handleEvidenceUpload(e.target.files[0])}
                                                            />
                                                         </label>
                                                      </div>
                                                      <div className="grid grid-cols-2 gap-4">
                                                         {(order.evidenceFiles || []).length > 0 ? order.evidenceFiles.map((file: any, i: number) => (
                                                            <a 
                                                              key={i} 
                                                              href={file.url} 
                                                              target="_blank" 
                                                              rel="noreferrer"
                                                              className="group relative aspect-video bg-black rounded-2xl border border-neutral-800 overflow-hidden hover:border-emerald-500 transition-all shadow-xl"
                                                            >
                                                               <img src={file.url} alt="Evidence" className="w-full h-full object-cover opacity-30 group-hover:opacity-100 transition-all" referrerPolicy="no-referrer" />
                                                               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-emerald-950/60 p-2">
                                                                  <p className="text-[8px] font-black text-white uppercase text-center">{file.name}</p>
                                                               </div>
                                                            </a>
                                                         )) : (
                                                            <div className="col-span-2 py-8 bg-neutral-900 border-2 border-dashed border-neutral-800 rounded-3xl flex flex-col items-center justify-center gap-2">
                                                               <FileWarning className="w-6 h-6 text-neutral-800" />
                                                               <p className="text-[9px] font-black text-neutral-700 uppercase tracking-widest italic">Vault Empty</p>
                                                            </div>
                                                         )}
                                                      </div>
                                                   </div>
                                                </div>
                                                
                                                <div className="mt-12 pt-8 border-t border-neutral-800 flex items-center justify-between">
                                                   <div className="flex gap-4">
                                                      <button 
                                                        onClick={() => { setSelectedLedgerOrder(order); setShowLedgerDetailModal(true); }}
                                                        className="px-8 py-3 bg-neutral-900 border border-neutral-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-all"
                                                      >
                                                         View Audit Intelligence
                                                      </button>
                                                      <button 
                                                        onClick={() => handleExportLegalPDF(order)}
                                                        className="px-8 py-3 bg-white text-neutral-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                                                      >
                                                         Export Legal PDF
                                                      </button>
                                                   </div>
                                                   <div className="flex items-center gap-6">
                                                      <div className="flex items-center gap-2">
                                                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                         <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">Encrypted Connection: amirfarhadian569@gmail.com</p>
                                                      </div>
                                                   </div>
                                                </div>
                                              </motion.div>
                                            </td>
                                          </tr>
                                        )}
                                      </AnimatePresence>
                                    </React.Fragment>
                                  );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {servicesTab === 'inventory' && (
                  <div className="space-y-8">
                    {/* Advanced Filtering Command Bar */}
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input 
                          type="text" 
                          placeholder="Search inventory (Name, Level, Status)..."
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-app-card border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text font-bold"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const filteredServices = services.filter(s => 
                            s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                            s.level.toString().includes(serviceSearch) ||
                            s.status.toLowerCase().includes(serviceSearch.toLowerCase())
                          );
                          const data = filteredServices.map(s => ({
                            'Service Name': s.name,
                            'Level': s.level,
                            'Status': s.status,
                            'Providers': providerServices.filter(ps => ps.serviceId === s.id).length,
                            'Open Orders': requests.filter(r => r.serviceId === s.id && r.status === 'pending').length,
                            'GST/HST Impact': '13%',
                            'Commission Rate': '15%'
                          }));
                          const worksheet = XLSX.utils.json_to_sheet(data);
                          const csv = XLSX.utils.sheet_to_csv(worksheet);
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Neighborly_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
                          a.click();
                          showSuccess(`Exported ${filteredServices.length} filtered items to CSV`);
                        }}
                        className="px-6 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-600 transition-all"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export Filtered CSV
                      </button>
                    </div>

                    {/* Service Inventory Table */}
                    <div className="bg-app-card rounded-[3rem] border border-app-border shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-neutral-900 text-white">
                              <th 
                                className="p-6 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-neutral-800 transition-colors"
                                onClick={() => setServiceSort({ 
                                  field: 'name', 
                                  direction: serviceSort.field === 'name' && serviceSort.direction === 'asc' ? 'desc' : 'asc' 
                                })}
                              >
                                <div className="flex items-center gap-2">
                                  Service Path
                                  {serviceSort.field === 'name' && (serviceSort.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                                </div>
                              </th>
                              <th 
                                className="p-6 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-neutral-800 transition-colors"
                                onClick={() => setServiceSort({ 
                                  field: 'level', 
                                  direction: serviceSort.field === 'level' && serviceSort.direction === 'asc' ? 'desc' : 'asc' 
                                })}
                              >
                                <div className="flex items-center gap-2">
                                  Level
                                  {serviceSort.field === 'level' && (serviceSort.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                                </div>
                              </th>
                              <th className="p-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Supply (Providers)</th>
                              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Demand (Jobs)</th>
                              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Tax (GST/HST)</th>
                              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-app-border">
                            {services
                              .filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                              .sort((a, b) => {
                                const factor = serviceSort.direction === 'desc' ? -1 : 1;
                                const field = serviceSort.field as keyof typeof a;
                                if (a[field] < b[field]) return -1 * factor;
                                if (a[field] > b[field]) return 1 * factor;
                                return 0;
                              })
                              .map((service) => {
                                const providers = providerServices.filter(ps => ps.serviceId === service.id).length;
                                const openOrders = requests.filter(r => r.serviceId === service.id && r.status === 'pending').length;
                                return (
                                  <tr key={service.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                              <td className="p-6">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-app-border text-neutral-500">
                                          {service.iconUrl ? (
                                            <img 
                                              src={service.iconUrl} 
                                              alt={service.name} 
                                              className="w-full h-full object-contain p-1 drop-shadow-[0_0_6px_rgba(255,255,255,0.2)] dark:drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]" 
                                              referrerPolicy="no-referrer" 
                                            />
                                          ) : (
                                            getDynamicServiceIcon(service, "w-full h-full p-2.5 opacity-60")
                                          )}
                                        </div>
                                        <div>
                                          <p className="font-black text-app-text uppercase tracking-tight line-clamp-1">{service.name}</p>
                                          <p className="text-[10px] text-neutral-400 font-bold">ID: {service.id.slice(0, 8)}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-6">
                                      <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-[10px] font-black text-neutral-500">LVL {service.level}</span>
                                    </td>
                                    <td className="p-6">
                                      <div className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        service.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                      )}>
                                        <div className={cn("w-1.5 h-1.5 rounded-full", service.status === 'active' ? "bg-emerald-500" : "bg-rose-500")} />
                                        {service.status}
                                      </div>
                                    </td>
                                    <td className="p-6 text-center font-bold text-app-text">{providers}</td>
                                    <td className="p-6 text-center font-bold text-app-text">{openOrders}</td>
                                    <td className="p-6 text-center font-bold text-emerald-600">13%</td>
                                    <td className="p-6 text-right flex items-center justify-end gap-2">
                                      <button 
                                        onClick={() => {
                                          setShowAddModal(true);
                                          setFormData({
                                            type: 'service',
                                            id: service.id,
                                            name: service.name,
                                            description: service.description || '',
                                            icon: service.icon || '',
                                            iconUrl: service.iconUrl || '',
                                            parentId: service.parentId || null,
                                            level: service.level,
                                            seasonality: service.seasonality || null,
                                          });
                                        }}
                                        className="p-2 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                        title="Edit Service"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteService(service.id, service.name)}
                                        className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                        title="Delete Service"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {servicesTab === 'hierarchy' && (
                  <div className="space-y-8">
                    {/* Horizontal Cascading Filters */}
                    <div className="bg-app-card p-10 rounded-[3rem] border border-app-border shadow-sm space-y-8 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-1">
                          <h4 className="text-2xl font-black italic uppercase tracking-tight text-app-text flex items-center gap-3">
                            <Filter className="w-7 h-7 text-emerald-500" />
                            Operations Intelligence Flow
                          </h4>
                          <p className="text-sm text-neutral-500 font-medium italic">Drill-down taxonomy selection for precision comparative analysis.</p>
                        </div>
                        <button 
                          onClick={() => setAnalyticsFilters([[], [], [], [], []])}
                          className="px-8 py-4 bg-app-card border border-app-border text-neutral-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-neutral-900 hover:text-white transition-all shadow-lg"
                        >
                          Clear Multi-Selection
                        </button>
                      </div>

                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar relative z-10 snap-x">
                        {[0, 1, 2, 3, 4].map((level) => {
                          const availableOptions = level === 0 
                            ? services.filter(s => s.level === 1)
                            : services.filter(s => analyticsFilters[level - 1].includes(s.parentId || ''));
                          
                          const isActive = level === 0 || analyticsFilters[level - 1].length > 0;

                          return (
                            <div 
                              key={level} 
                              className={cn(
                                "flex-shrink-0 w-64 p-6 bg-app-bg border border-app-border rounded-[2.5rem] transition-all snap-start",
                                !isActive ? "opacity-30 pointer-events-none grayscale" : "opacity-100 hover:shadow-xl"
                              )}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Level {level + 1}</h5>
                                <span className="bg-neutral-900 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase">{availableOptions.length} Items</span>
                              </div>
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {availableOptions.map(option => (
                                  <label 
                                    key={option.id}
                                    className={cn(
                                      "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                                      analyticsFilters[level].includes(option.id)
                                        ? "bg-neutral-900 border-neutral-800 text-white scale-[1.02] shadow-md"
                                        : "bg-white dark:bg-neutral-800 border-app-border text-neutral-500 hover:border-neutral-400"
                                    )}
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className={cn(
                                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                                        analyticsFilters[level].includes(option.id) ? "bg-emerald-500 border-emerald-500" : "border-neutral-300 dark:border-neutral-600"
                                      )}>
                                        {analyticsFilters[level].includes(option.id) && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                                      </div>
                                      <span className="text-[11px] font-black uppercase tracking-tight truncate">{option.name}</span>
                                    </div>
                                    <input 
                                      type="checkbox"
                                      className="hidden"
                                      checked={analyticsFilters[level].includes(option.id)}
                                      onChange={() => {
                                        const current = [...analyticsFilters[level]];
                                        const nextFilters = [...analyticsFilters];
                                        if (current.includes(option.id)) {
                                          nextFilters[level] = current.filter(id => id !== option.id);
                                        } else {
                                          nextFilters[level] = [...current, option.id];
                                        }
                                        // Clear deeper levels when a parent level changes
                                        for (let i = level + 1; i < 5; i++) nextFilters[i] = [];
                                        setAnalyticsFilters(nextFilters);
                                      }}
                                    />
                                  </label>
                                ))}
                                {availableOptions.length === 0 && (
                                  <div className="py-8 text-center border-2 border-dashed border-app-border rounded-2xl">
                                    <p className="text-[10px] text-neutral-400 font-bold italic">No results found</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Analytics Intelligence Layer (Filtered) */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {(() => {
                        const allSelectedIds = analyticsFilters.flat();
                        const isFiltered = allSelectedIds.length > 0;
                        const isServiceMatch = (serviceId: string) => {
                          if (!isFiltered) return true;
                          return allSelectedIds.includes(serviceId);
                        };

                        const filteredRequests = requests.filter(r => isServiceMatch(r.serviceId));
                        const filteredProviders = users.filter(u => u.role === 'provider' && providerServices.some(ps => ps.providerId === u.id && isServiceMatch(ps.serviceId)));
                        const filteredContracts = contracts.filter(c => {
                          const request = requests.find(r => r.id === c.requestId);
                          return request && isServiceMatch(request.serviceId);
                        });

                        return [
                          { label: 'Total Providers', value: filteredProviders.length, icon: Users, color: 'text-blue-600' },
                          { label: 'Active Orders', value: filteredRequests.filter(r => r.status === 'accepted').length, icon: Activity, color: 'text-amber-600' },
                          { label: 'Pending Requests', value: filteredRequests.filter(r => r.status === 'pending').length, icon: AlertCircle, color: 'text-rose-600' },
                          { label: 'Completed GMV', value: `$${filteredContracts.filter(c => c.status === 'completed').reduce((acc, c) => acc + (c.amount || 0), 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600' }
                        ].map((kpi, i) => (
                          <div key={i} className="bg-app-card p-6 rounded-[2rem] border border-app-border shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                            <div className="flex items-center justify-between mb-4 relative z-10">
                              <div className={cn("p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800", kpi.color)}>
                                <kpi.icon className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Live KPI</span>
                            </div>
                            <h4 className="text-3xl font-black text-app-text relative z-10">{kpi.value}</h4>
                            <p className="text-xs font-bold text-neutral-500 mt-1 uppercase tracking-wider relative z-10">{kpi.label}</p>
                          </div>
                        ));
                      })()}
                    </div>

                    {/* Multi-Level Performance Chart */}
                    <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-8 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-1">
                          <h4 className="text-2xl font-black italic uppercase tracking-tight text-app-text flex items-center gap-3">
                            <Cpu className="w-7 h-7 text-emerald-500" />
                            Hierarchical Performance Engine
                          </h4>
                          <p className="text-sm text-neutral-500 font-medium">
                            {analyticsFilters.flat().length === 0 
                              ? "Total Company Output (Aggregate View)" 
                              : "Comparative Analysis of Selected Taxonomy"}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-app-border shadow-inner">
                            <button 
                              onClick={() => setAnalyticsMetric('revenue')}
                              className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", analyticsMetric === 'revenue' ? "bg-white dark:bg-neutral-900 text-app-text shadow-lg" : "text-neutral-400")}
                            >
                              Revenue (GMV)
                            </button>
                            <button 
                              onClick={() => setAnalyticsMetric('volume')}
                              className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", analyticsMetric === 'volume' ? "bg-white dark:bg-neutral-900 text-app-text shadow-lg" : "text-neutral-400")}
                            >
                              Volume (Orders)
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="h-[500px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const allSelectedIds = analyticsFilters.flat();
                            
                            const last6Months = Array.from({length: 6}, (_, i) => {
                              const d = new Date();
                              d.setMonth(d.getMonth() - (5 - i));
                              return { 
                                name: d.toLocaleString('default', { month: 'short' }),
                                month: d.getMonth(),
                                year: d.getFullYear()
                              };
                            });

                            if (allSelectedIds.length === 0) {
                              const data = last6Months.map(d => {
                                let output = 0;
                                contracts.forEach(c => {
                                  if (!c.createdAt) return;
                                  const cDate = new Date(c.createdAt.seconds * 1000);
                                  if (cDate.getMonth() === d.month && cDate.getFullYear() === d.year && c.status === 'completed') {
                                    output += (analyticsMetric === 'revenue' ? (c.amount || 0) : 1);
                                  }
                                });
                                return { name: d.name, "Total Output": output };
                              });
                              return (
                                <AreaChart data={data}>
                                  <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.3)', padding: '24px' }} />
                                  <Area type="monotone" dataKey="Total Output" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} />
                                </AreaChart>
                              );
                            } else {
                              const data = last6Months.map(d => {
                                const entry: any = { name: d.name };
                                allSelectedIds.forEach(id => {
                                  const s = services.find(item => item.id === id);
                                  if (s) {
                                    let output = 0;
                                    contracts.forEach(c => {
                                      if (!c.createdAt) return;
                                      const cDate = new Date(c.createdAt.seconds * 1000);
                                      const isMatch = c.serviceId === id || c.serviceName === s.name;
                                      if (isMatch && cDate.getMonth() === d.month && cDate.getFullYear() === d.year && c.status === 'completed') {
                                        output += (analyticsMetric === 'revenue' ? (c.amount || 0) : 1);
                                      }
                                    });
                                    entry[s.name] = output;
                                  }
                                });
                                return entry;
                              });

                              return (
                                <LineChart data={data}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.3)', padding: '24px' }} />
                                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }} />
                                  {allSelectedIds.map((id, index) => {
                                    const s = services.find(item => item.id === id);
                                    if (!s) return null;
                                    return (
                                      <Line 
                                        key={id} 
                                        type="monotone" 
                                        dataKey={s.name} 
                                        stroke={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'][index % 7]} 
                                        strokeWidth={4} 
                                        dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                                        activeDot={{ r: 8, strokeWidth: 0 }}
                                      />
                                    );
                                  })}
                                </LineChart>
                              );
                            }
                          })()}
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Service Taxonomy Hierarchy */}
                    <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                      <div className="flex items-center justify-between relative z-10">
                        <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text">Hierarchy Explorer</h4>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          5 Levels Supported
                        </div>
                      </div>

                      <div className="space-y-4 relative z-10">
                        {services
                          .filter(s => !s.parentId)
                          .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) // Strict duplicate id check
                          .map(root => (
                          <ServiceHierarchyNode 
                            key={root.id} 
                            node={root} 
                            allServices={services} 
                            providerServices={providerServices}
                            requests={requests}
                            onAddSub={(parentNode: any) => { 
                              setShowAddModal(true); 
                              setFormData({ 
                                type: 'service', 
                                parentId: parentNode.id, 
                                level: (parentNode.level || 1) + 1 
                              }); 
                            }}
                            onEdit={(nodeToEdit: any) => {
                              setShowAddModal(true);
                              setFormData({
                                type: 'service',
                                id: nodeToEdit.id,
                                name: nodeToEdit.name,
                                description: nodeToEdit.description || '',
                                icon: nodeToEdit.icon || '',
                                iconUrl: nodeToEdit.iconUrl || '',
                                parentId: nodeToEdit.parentId,
                                level: nodeToEdit.level,
                                seasonality: nodeToEdit.seasonality || null,
                              });
                            }}
                            onDelete={(id: string) => handleDeleteService(id)}
                            onUpdateStatus={async (id: string, status: string) => {
                              await updateDoc(doc(db, 'services', id), { status });
                              showSuccess(`Service status updated to ${status}`);
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Provider Requests Section */}
                    <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                      <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text relative z-10">Provider Suggestions</h4>
                      <div className="space-y-4 relative z-10">
                        {serviceRequests.length === 0 ? (
                          <div className="text-center py-12 border-2 border-dashed border-app-border rounded-[2rem]">
                            <MessageSquare className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                            <p className="text-neutral-400 font-bold">No pending service requests.</p>
                          </div>
                        ) : (
                          serviceRequests.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-neutral-800 rounded-[2rem] border border-app-border">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-neutral-900 rounded-2xl flex items-center justify-center shadow-sm">
                                  <Tag className="w-6 h-6 text-neutral-400" />
                                </div>
                                <div>
                                  <h5 className="font-black text-app-text uppercase tracking-tight">{req.suggestedName}</h5>
                                  <p className="text-xs text-neutral-500 font-medium">Suggested by: {users.find(u => u.id === req.providerId)?.displayName || 'Unknown Provider'}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleApproveRequest(req)}
                                  className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => updateDoc(doc(db, 'service_requests', req.id), { status: 'rejected' })}
                                  className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Intelligence Section */}
            {activeTab === 'intelligence' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black italic uppercase tracking-tight text-app-text">Operational Intelligence</h3>
                    <p className="text-neutral-500 text-sm font-medium">Real-time market health and predictive analytics for Canada.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleExportMBR()}
                      className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                    >
                      <FileText className="w-4 h-4" />
                      Export MBR (PDF)
                    </button>
                  </div>
                </div>

                {/* Sub-navigation */}
                <div className="flex gap-4 border-b border-app-border">
                  {[
                    { id: 'ops', label: 'Logistics & Ops', icon: Activity },
                    { id: 'analytics', label: 'Business Analytics', icon: BarChart3 },
                    { id: 'geo', label: 'Geofencing Insights', icon: MapPin }
                  ].map(view => (
                    <button
                      key={view.id}
                      onClick={() => setIntelligenceView(view.id as any)}
                      className={cn(
                        "px-6 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
                        intelligenceView === view.id 
                          ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white" 
                          : "border-transparent text-neutral-400 hover:text-neutral-600"
                      )}
                    >
                      <view.icon className="w-4 h-4" />
                      {view.label}
                    </button>
                  ))}
                </div>

                {intelligenceView === 'ops' && (
                  <div className="space-y-8">
                    {/* Market Health Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {services.filter(s => s.level === 1).map(service => {
                        const providers = providerServices.filter(ps => ps.serviceId === service.id).length;
                        const openOrders = requests.filter(r => r.serviceId === service.id && r.status === 'pending').length;
                        const health = providers > 0 ? (openOrders / providers) : (openOrders > 0 ? 2 : 0);
                        
                        return (
                          <div key={service.id} className="bg-app-card p-6 rounded-[2.5rem] border border-app-border shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                                  {getDynamicServiceIcon(service, "w-4 h-4 text-neutral-500 opacity-60")}
                                </div>
                                <h4 className="font-black text-app-text uppercase tracking-tight">{service.name}</h4>
                              </div>
                              <div className={cn(
                                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                health > 1.5 ? "bg-rose-50 text-rose-600" :
                                health > 0.8 ? "bg-amber-50 text-amber-600" :
                                "bg-emerald-50 text-emerald-600"
                              )}>
                                {health > 1.5 ? 'Critical' : health > 0.8 ? 'Warning' : 'Stable'}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Supply</p>
                                <p className="text-xl font-black text-app-text">{providers} Providers</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Demand</p>
                                <p className="text-xl font-black text-app-text">{openOrders} Orders</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-neutral-400">Saturation Index</span>
                                <span className="text-app-text">{Math.round(health * 100)}%</span>
                              </div>
                              <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all",
                                    health > 1.5 ? "bg-rose-500" : health > 0.8 ? "bg-amber-500" : "bg-emerald-500"
                                  )}
                                  style={{ width: `${Math.min(100, health * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Lead Time Tracking */}
                    <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6">
                      <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text flex items-center gap-2">
                        <History className="w-5 h-5 text-neutral-400" />
                        Lead Time Tracking (Avg. Acceptance)
                      </h4>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={services.filter(s => s.level === 1).map(s => ({
                            name: s.name,
                            minutes: Math.floor(Math.random() * 45) + 15 // Simulated lead time
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 700 }} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="minutes" fill="#171717" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {intelligenceView === 'analytics' && (
                  <div className="space-y-8">
                    {/* Horizontal Cascading Filters */}
                    <div className="bg-app-card p-10 rounded-[3rem] border border-app-border shadow-sm space-y-8 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-1">
                          <h4 className="text-2xl font-black italic uppercase tracking-tight text-app-text flex items-center gap-3">
                            <Filter className="w-7 h-7 text-emerald-500" />
                            Intelligence Strategy Filter
                          </h4>
                          <p className="text-sm text-neutral-500 font-medium italic">Professional-grade horizontal taxonomy explorer.</p>
                        </div>
                        <button 
                          onClick={() => setAnalyticsFilters([[], [], [], [], []])}
                          className="px-8 py-4 bg-app-card border border-app-border text-neutral-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-neutral-900 hover:text-white transition-all shadow-lg"
                        >
                          Clear Selection
                        </button>
                      </div>

                      <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar relative z-10 snap-x">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {[0, 1, 2, 3, 4].map((level) => {
                            const availableOptions = level === 0 
                              ? services.filter(s => s.level === 1)
                              : services.filter(s => analyticsFilters[level - 1].includes(s.parentId || ''));
                            
                            const isActive = level === 0 || analyticsFilters[level - 1].length > 0;

                            if (!isActive && level > 0) return null;

                            return (
                              <motion.div 
                                key={level} 
                                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className={cn(
                                  "flex-shrink-0 w-72 p-8 bg-app-bg border border-app-border rounded-[3rem] transition-all snap-start shadow-sm hover:shadow-xl",
                                  analyticsFilters[level].length > 0 ? "border-emerald-500/30 ring-1 ring-emerald-500/10" : ""
                                )}
                              >
                                <div className="flex items-center justify-between mb-6">
                                  <div className="space-y-0.5">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Layer {level + 1}</h5>
                                    <p className="text-[11px] font-bold text-app-text italic">Taxonomy Explore</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 text-white text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-tight">
                                      {availableOptions.length}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-3 custom-scrollbar">
                                  {availableOptions.map(option => (
                                    <label 
                                      key={option.id}
                                      className={cn(
                                        "flex items-center justify-between p-4 rounded-[1.75rem] cursor-pointer transition-all border group relative overflow-hidden",
                                        analyticsFilters[level].includes(option.id)
                                          ? "bg-neutral-900 border-neutral-800 text-white shadow-[0_10px_20px_-5px_rgba(16,185,129,0.2)]"
                                          : "bg-white dark:bg-neutral-800 border-app-border text-neutral-500 hover:border-neutral-400"
                                      )}
                                    >
                                      {analyticsFilters[level].includes(option.id) && (
                                        <motion.div 
                                          layoutId={`highlight-${level}`}
                                          className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
                                        />
                                      )}
                                      <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
                                        <div className={cn(
                                          "w-10 h-10 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 border border-app-border overflow-hidden bg-neutral-50 dark:bg-neutral-900",
                                          analyticsFilters[level].includes(option.id) ? "border-emerald-500/50" : ""
                                        )}>
                                          {option.iconUrl ? (
                                            <img 
                                              src={option.iconUrl} 
                                              alt={option.name} 
                                              className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                              referrerPolicy="no-referrer" 
                                            />
                                          ) : (
                                            getDynamicServiceIcon(option, "w-full h-full p-2 opacity-50 text-neutral-500")
                                          )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[12px] font-black uppercase tracking-tight truncate">{option.name}</span>
                                          <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none mt-0.5">
                                            {services.filter(s => s.parentId === option.id).length} Nested
                                          </span>
                                        </div>
                                      </div>
                                      <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 relative z-10",
                                        analyticsFilters[level].includes(option.id) ? "bg-emerald-500 border-emerald-500 scale-110" : "border-neutral-200 dark:border-neutral-700 group-hover:border-neutral-400"
                                      )}>
                                        {analyticsFilters[level].includes(option.id) && <Check className="w-3.5 h-3.5 text-white stroke-[4px]" />}
                                      </div>
                                      <input 
                                        type="checkbox"
                                        className="hidden"
                                        checked={analyticsFilters[level].includes(option.id)}
                                        onChange={() => {
                                          const current = [...analyticsFilters[level]];
                                          const nextFilters = [...analyticsFilters];
                                          if (current.includes(option.id)) {
                                            nextFilters[level] = current.filter(id => id !== option.id);
                                          } else {
                                            nextFilters[level] = [...current, option.id];
                                          }
                                          for (let i = level + 1; i < 5; i++) nextFilters[i] = [];
                                          setAnalyticsFilters(nextFilters);
                                        }}
                                      />
                                    </label>
                                  ))}
                                  {availableOptions.length === 0 && (
                                    <motion.div 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="py-12 text-center border-2 border-dashed border-app-border rounded-[2rem]"
                                    >
                                      <PieChart className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
                                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest italic">No Branches Found</p>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Advanced Metrics Row (Filtered) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(() => {
                        // Calculate filtered data
                        const allSelectedIds = analyticsFilters.flat();
                        const isFiltered = allSelectedIds.length > 0;
                        
                        // Helper to check if a service is selected strictly
                        const isServiceMatch = (serviceId: string) => {
                          if (!isFiltered) return true;
                          return allSelectedIds.includes(serviceId);
                        };

                        const filteredRequests = requests.filter(r => isServiceMatch(r.serviceId));
                        const filteredProviders = users.filter(u => u.role === 'provider' && providerServices.some(ps => ps.providerId === u.id && isServiceMatch(ps.serviceId)));
                        const filteredContracts = contracts.filter(c => {
                          const request = requests.find(r => r.id === c.requestId);
                          return request && isServiceMatch(request.serviceId);
                        });

                        const cr = filteredRequests.length > 0 ? ((filteredContracts.length / filteredRequests.length) * 100).toFixed(1) : '0.0';
                        const churn = '12.4'; // Simulated
                        const saturation = filteredProviders.length > 0 ? (filteredRequests.length / filteredProviders.length).toFixed(2) : '0.00';

                        return [
                          { label: 'Conversion Rate (CR)', value: `${cr}%`, icon: TrendingUp, color: 'text-emerald-500', desc: 'Views to Bookings ratio for selection.' },
                          { label: 'Churn Rate (Retention)', value: `${churn}%`, icon: MinusCircle, color: 'text-rose-500', desc: 'Retention within selected taxonomy.' },
                          { label: 'Saturation Index', value: saturation, icon: ShieldAlert, color: 'text-amber-500', desc: 'Supply/demand balance for selection.' }
                        ].map((metric, i) => (
                          <div key={i} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border shadow-sm space-y-4 relative overflow-hidden group">
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                            <div className="flex items-center justify-between relative z-10">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{metric.label}</h4>
                              <metric.icon className={cn("w-5 h-5", metric.color)} />
                            </div>
                            <h3 className="text-5xl font-black text-app-text relative z-10">{metric.value}</h3>
                            <p className="text-xs text-neutral-500 font-medium relative z-10">{metric.desc}</p>
                          </div>
                        ));
                      })()}
                    </div>

                    {/* Multi-Level Performance Chart */}
                    <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-8 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-1">
                          <h4 className="text-2xl font-black italic uppercase tracking-tight text-app-text flex items-center gap-3">
                            <BarChart3 className="w-7 h-7 text-emerald-500" />
                            Hierarchical Performance
                          </h4>
                          <p className="text-sm text-neutral-500 font-medium">
                            {analyticsFilters.flat().length === 0 
                              ? "Total Company Output (Aggregate View)" 
                              : "Comparative Analysis of Selected Taxonomy"}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-app-border shadow-inner">
                            <button 
                              onClick={() => setAnalyticsMetric('revenue')}
                              className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", analyticsMetric === 'revenue' ? "bg-white dark:bg-neutral-900 text-app-text shadow-lg" : "text-neutral-400")}
                            >
                              Revenue (GMV)
                            </button>
                            <button 
                              onClick={() => setAnalyticsMetric('volume')}
                              className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", analyticsMetric === 'volume' ? "bg-white dark:bg-neutral-900 text-app-text shadow-lg" : "text-neutral-400")}
                            >
                              Volume (Orders)
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="h-[500px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const allSelectedIds = analyticsFilters.flat();
                            
                            const last6Months = Array.from({length: 6}, (_, i) => {
                              const d = new Date();
                              d.setMonth(d.getMonth() - (5 - i));
                              return { 
                                name: d.toLocaleString('default', { month: 'short' }),
                                month: d.getMonth(),
                                year: d.getFullYear()
                              };
                            });

                            if (allSelectedIds.length === 0) {
                              // Aggregate View
                              const data = last6Months.map(d => {
                                let output = 0;
                                contracts.forEach(c => {
                                  if (!c.createdAt) return;
                                  const cDate = new Date(c.createdAt.seconds * 1000);
                                  if (cDate.getMonth() === d.month && cDate.getFullYear() === d.year && c.status === 'completed') {
                                    output += (analyticsMetric === 'revenue' ? (c.amount || 0) : 1);
                                  }
                                });
                                return { name: d.name, "Total Output": output };
                              });
                              return (
                                <AreaChart data={data}>
                                  <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.3)', padding: '24px' }}
                                  />
                                  <Area type="monotone" dataKey="Total Output" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} />
                                </AreaChart>
                              );
                            } else {
                              // Comparative View
                              const data = last6Months.map(d => {
                                const entry: any = { name: d.name };
                                allSelectedIds.forEach(id => {
                                  const s = services.find(item => item.id === id);
                                  if (s) {
                                    let output = 0;
                                    contracts.forEach(c => {
                                      if (!c.createdAt) return;
                                      const cDate = new Date(c.createdAt.seconds * 1000);
                                      const isMatch = c.serviceId === id || c.serviceName === s.name;
                                      if (isMatch && cDate.getMonth() === d.month && cDate.getFullYear() === d.year && c.status === 'completed') {
                                        output += (analyticsMetric === 'revenue' ? (c.amount || 0) : 1);
                                      }
                                    });
                                    entry[s.name] = output;
                                  }
                                });
                                return entry;
                              });

                              return (
                                <LineChart data={data}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.3)', padding: '24px' }}
                                  />
                                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }} />
                                  {allSelectedIds.map((id, index) => {
                                    const s = services.find(item => item.id === id);
                                    if (!s) return null;
                                    return (
                                      <Line 
                                        key={id} 
                                        type="monotone" 
                                        dataKey={s.name} 
                                        stroke={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'][index % 7]} 
                                        strokeWidth={4} 
                                        dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                                        activeDot={{ r: 8, strokeWidth: 0 }}
                                      />
                                    );
                                  })}
                                </LineChart>
                              );
                            }
                          })()}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {intelligenceView === 'geo' && (
                  <div className="space-y-8">
                    <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text">Canadian Market Heatmap</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-neutral-100" />
                            <span className="text-[10px] font-black text-neutral-400 uppercase">Low</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-neutral-900" />
                            <span className="text-[10px] font-black text-neutral-400 uppercase">High</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                          { prov: 'Ontario', code: 'ON', intensity: 0.9 },
                          { prov: 'Quebec', code: 'QC', intensity: 0.75 },
                          { prov: 'British Columbia', code: 'BC', intensity: 0.85 },
                          { prov: 'Alberta', code: 'AB', intensity: 0.6 },
                          { prov: 'Manitoba', code: 'MB', intensity: 0.3 },
                          { prov: 'Saskatchewan', code: 'SK', intensity: 0.25 },
                          { prov: 'Nova Scotia', code: 'NS', intensity: 0.4 },
                          { prov: 'New Brunswick', code: 'NB', intensity: 0.2 },
                          { prov: 'Newfoundland', code: 'NL', intensity: 0.15 },
                          { prov: 'PEI', code: 'PE', intensity: 0.1 },
                        ].map(region => (
                          <div 
                            key={region.code} 
                            className="p-6 rounded-[2rem] border border-app-border flex flex-col items-center justify-center space-y-2 transition-all hover:scale-105"
                            style={{ backgroundColor: `rgba(23, 23, 23, ${region.intensity * 0.1 + 0.02})` }}
                          >
                            <span className="text-2xl font-black text-app-text opacity-20">{region.code}</span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-app-text">{region.prov}</p>
                            <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full mt-2">
                              <div 
                                className="h-full bg-neutral-900 dark:bg-white rounded-full"
                                style={{ width: `${region.intensity * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Finance & Tax Section */}
            {activeTab === 'finance' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black italic uppercase tracking-tight text-app-text">Financial Ledger</h3>
                    <p className="text-neutral-500 text-sm font-medium">Canadian Tax Compliance & Commission Management.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleExportData('xlsx')}
                      className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Ledger
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { label: 'Total GMV', value: `$${contracts.reduce((acc, c) => acc + (c.amount || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'text-blue-600' },
                    { label: 'Platform Commission', value: `$${contracts.reduce((acc, c) => acc + (c.commissionAmount || 0), 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600' },
                    { label: 'Total Tax (GST/HST)', value: `$${contracts.reduce((acc, c) => acc + (c.taxAmount || 0), 0).toLocaleString()}`, icon: ShieldCheck, color: 'text-indigo-600' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border shadow-sm space-y-2">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-50 dark:bg-neutral-800", stat.color)}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{stat.label}</p>
                      <h4 className="text-2xl font-black text-app-text">{stat.value}</h4>
                    </div>
                  ))}
                </div>

                <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-app-border flex items-center justify-between">
                    <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text">Master Ledger</h4>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Marketplace Integrity Log</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="bg-neutral-50/50 dark:bg-neutral-800/50">
                          <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Date</th>
                          <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Tracking #</th>
                          <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Service</th>
                          <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Amount</th>
                          <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Platform Fee</th>
                          <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Provider Share</th>
                          <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border">
                        {masterLedger.map(entry => (
                          <tr key={entry.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors">
                            <td className="px-8 py-4 text-xs font-bold text-app-text">
                              {entry.timestamp?.toDate ? entry.timestamp.toDate().toLocaleDateString() : new Date(entry.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-8 py-4">
                              <span className="px-3 py-1 bg-neutral-900 text-emerald-500 rounded-lg text-[10px] font-black italic tracking-widest uppercase">
                                {entry.trackingNumber || 'NBRLY-XXXXXX'}
                              </span>
                            </td>
                            <td className="px-8 py-4">
                              <p className="text-xs font-bold text-app-text">{entry.serviceName || 'General'}</p>
                              <p className="text-[9px] text-neutral-500 uppercase font-black">{entry.category}</p>
                            </td>
                            <td className="px-8 py-4 text-xs font-black text-app-text">${(entry.amount || 0).toLocaleString()}</td>
                            <td className="px-8 py-4 text-xs font-bold text-emerald-600">${(entry.platformFee || 0).toLocaleString()}</td>
                            <td className="px-8 py-4 text-xs font-bold text-blue-600">${(entry.providerShare || 0).toLocaleString()}</td>
                            <td className="px-8 py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                                entry.status === 'DONE' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : 
                                entry.status === 'CANCELLED' ? "bg-rose-500 text-white" : "bg-amber-500 text-black"
                              )}>
                                {entry.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {masterLedger.length === 0 && (
                          <tr><td colSpan={7} className="p-20 text-center italic text-neutral-500 text-xs">No ledger entries found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6">
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-app-text">Payment Methods</h3>
                    <div className="space-y-4">
                      {['Credit Card', 'PayPal', 'Apple Pay', 'Google Pay', 'Bank Transfer'].map(method => (
                        <div key={method} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-neutral-400" />
                            <span className="font-bold text-sm text-app-text">{method}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Active</span>
                            <div className="w-10 h-5 bg-neutral-900 dark:bg-white rounded-full relative">
                              <div className="absolute right-1 top-1 w-3 h-3 bg-white dark:bg-neutral-900 rounded-full" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6">
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-app-text">Tax & Commission</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Platform Tax Rate (%)</label>
                        <div className="flex gap-4">
                          <input 
                            type="number" 
                            defaultValue={systemConfig?.taxRate || 15}
                            className="flex-1 p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl font-black text-xl text-app-text"
                          />
                          <button 
                            onClick={() => handleUpdateGlobalConfig({ taxRate: 15 })}
                            className="px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Provider Commission (%)</label>
                        <div className="flex gap-4">
                          <input 
                            type="number" 
                            defaultValue={10}
                            className="flex-1 p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl font-black text-xl text-app-text"
                          />
                          <button className="px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm">Update</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Teams Section */}
            {activeTab === 'teams' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Internal Teams</h3>
                  <button 
                    onClick={() => {
                      setProfileUser(null);
                      setSelectedUser(null);
                      setFormData({ 
                        role: 'support',
                        status: 'active',
                        displayName: '',
                        email: '',
                        phone: '',
                        businessName: '',
                        serviceCategory: '',
                        isVerifiedBadge: false,
                        interests: []
                      });
                      setShowUserHubModal(true);
                      setIsEditMode(true);
                      setEditUserTab('general');
                    }}
                    className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign Member
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { name: 'Support Team', role: 'support', icon: Mail },
                    { name: 'Financial Team', role: 'finance', icon: DollarSign },
                    { name: 'Operations Team', role: 'operations', icon: Globe },
                    { name: 'Platform Admins', role: 'platform_admin', icon: Shield },
                  ].map(team => (
                    <div key={team.name} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border shadow-sm space-y-4">
                      <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center">
                        <team.icon className="w-6 h-6 text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="font-black text-lg uppercase tracking-tight text-app-text">{team.name}</h4>
                        <p className="text-xs text-neutral-500">{users.filter(u => u.role === team.role).length} Active Members</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-app-border">
                    <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text">Staff Directory</h4>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/50 dark:bg-neutral-800/50">
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Member</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Team</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {users.filter(u => ['support', 'finance', 'operations', 'platform_admin'].includes(u.role)).map((user) => (
                        <tr key={user.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl flex items-center justify-center font-black italic">
                                {user.displayName?.[0] || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-app-text">{user.displayName}</p>
                                <p className="text-xs text-neutral-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => {
                                setProfileUser(user);
                                setSelectedUser(user);
                                setFormData({ 
                                  role: user.role, 
                                  status: user.status,
                                  displayName: user.displayName || '',
                                  email: user.email || '',
                                  phone: user.phone || '',
                                  businessName: user.businessName || '',
                                  serviceCategory: user.serviceCategory || '',
                                  isVerifiedBadge: user.isVerifiedBadge || false,
                                  interests: user.interests || [],
                                  id: user.id
                                });
                                setShowUserHubModal(true);
                                setIsEditMode(true);
                                setEditUserTab('general');
                              }}
                              className="p-2 text-neutral-400 hover:text-app-text"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Monitoring Section */}
            {activeTab === 'monitoring' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">System Monitoring</h3>
                    <p className="text-neutral-500 text-sm">Real-time audit logs and error tracking.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-app-border flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-app-text">Live Stream</span>
                    </div>
                  </div>
                </div>

                <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-app-border bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400">Recent Activity</h4>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{auditLogs.length} Logs Loaded</span>
                  </div>
                  <div className="divide-y divide-app-border max-h-[600px] overflow-y-auto custom-scrollbar">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-6 hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              log.type === 'error' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                            )}>
                              {log.type === 'error' ? <ShieldAlert className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className={cn(
                                "font-bold text-sm",
                                log.type === 'error' ? "text-red-600" : "text-app-text"
                              )}>
                                {log.action}
                              </p>
                              <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">
                                {log.timestamp instanceof Date ? log.timestamp.toLocaleString() : 'Just now'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded">
                            ID: {log.id.slice(0, 8)}
                          </span>
                        </div>
                        
                        {log.details && (
                          <div className="ml-11 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-app-border">
                            <pre className="text-[10px] font-mono text-neutral-500 whitespace-pre-wrap break-all">
                              {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        <div className="ml-11 flex items-center gap-4 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Actor: {log.actorId}
                          </span>
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <div className="p-20 text-center">
                        <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No logs found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Integrations Section */}
            {activeTab === 'integrations' && (
              <div className="space-y-8">
                {/* Status Banner */}
                {(!process.env.STRIPE_SECRET_KEY || !process.env.DATABASE_URL) && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-center gap-6">
                    <div className="w-12 h-12 bg-amber-500 text-neutral-900 rounded-2xl flex items-center justify-center shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black italic uppercase tracking-tight text-amber-600">Mock Mode Active</h4>
                      <p className="text-amber-600/80 text-xs">Some sensitive API keys are missing from the environment. The system is running with fallback plumbing. Update .env variables to enable full production logic.</p>
                    </div>
                  </div>
                )}

                <div className="bg-app-card p-12 rounded-[3rem] border border-app-border shadow-sm space-y-12">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                       <h3 className="text-3xl font-black italic uppercase tracking-tight text-app-text">API Architecture & Secrets</h3>
                       <p className="text-neutral-500 text-sm">Securely manage third-party API keys and system secrets. Values are injected at runtime.</p>
                    </div>
                    <div className="flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
                      <Lock className="w-4 h-4" />
                      Encrypted Connection
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {[
                      { 
                        name: 'Stripe Secret Key', 
                        key: process.env.STRIPE_SECRET_KEY ? `sk_live_****${process.env.STRIPE_SECRET_KEY.slice(-4)}` : 'sk_test_placeholder_mock_mode', 
                        type: 'Payment API (Connect)',
                        status: process.env.STRIPE_SECRET_KEY ? 'active' : 'placeholder'
                      },
                      { 
                        name: 'Database URL', 
                        key: process.env.DATABASE_URL ? `postgresql://****:****@${process.env.DATABASE_URL.split('@')[1] || 'localhost'}` : 'postgresql://placeholder:mock@localhost:5432/db', 
                        type: 'Internal Data Flow',
                        status: process.env.DATABASE_URL ? 'active' : 'placeholder'
                      },
                      { 
                        name: 'Stripe Webhook Secret', 
                        key: process.env.STRIPE_WEBHOOK_SECRET ? `whsec_****${process.env.STRIPE_WEBHOOK_SECRET.slice(-4)}` : 'whsec_placeholder_mock_mode', 
                        type: 'Real-time Event Hook',
                        status: process.env.STRIPE_WEBHOOK_SECRET ? 'active' : 'placeholder'
                      },
                      { 
                        name: 'Google Maps API', 
                        key: 'AIzaSy' + '*'.repeat(20) + '4x9', 
                        type: 'Geospatial Assets',
                        status: 'active'
                      },
                    ].map(integration => (
                      <div key={integration.name} className="p-8 bg-neutral-50 dark:bg-neutral-800 rounded-[2.5rem] border border-app-border space-y-6 group hover:border-emerald-500/50 transition-all relative overflow-hidden">
                        {integration.status === 'placeholder' && (
                          <div className="absolute top-0 right-0 px-4 py-1 bg-amber-500 text-neutral-900 text-[8px] font-black uppercase tracking-widest rounded-bl-xl">
                            Mock
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{integration.type}</span>
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            integration.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                          )} />
                        </div>
                        
                        <div>
                          <h4 className="font-black text-lg uppercase tracking-tight text-app-text">{integration.name}</h4>
                          <div className="mt-3 p-4 bg-app-bg border border-app-border rounded-xl font-mono text-[10px] text-neutral-500 break-all select-none">
                            {integration.key}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 pt-2">
                           <button className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                             Rotate Key
                           </button>
                           <button className="p-3 text-neutral-400 hover:text-emerald-500">
                             <Eye className="w-5 h-5" />
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Manual Override & Settings Section */}
                  <div className="p-10 border border-emerald-500/20 rounded-[3rem] bg-emerald-500/5 space-y-8">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 text-black rounded-2xl flex items-center justify-center">
                          <Settings className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xl font-black italic uppercase tracking-tight">System Runtime Configuration</h4>
                          <p className="text-neutral-500 text-xs">Update architecture keys and platform rules.</p>
                        </div>
                     </div>

                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Stripe Connect Secret Key</label>
                           <input 
                             type="password" 
                             className="w-full p-4 bg-app-card border border-app-border rounded-2xl font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                             placeholder="sk_live_..."
                           />
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Database Connection String (Prisma)</label>
                           <input 
                             type="password" 
                             className="w-full p-4 bg-app-card border border-app-border rounded-2xl font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                             placeholder="postgresql://..."
                           />
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Client Lockout Duration (Days)</label>
                           <div className="flex gap-4">
                             <input 
                               type="number" 
                               value={systemConfig?.lockoutDuration || 7}
                               onChange={(e) => handleUpdateGlobalConfig({ lockoutDuration: parseInt(e.target.value) })}
                               className="w-24 p-4 bg-app-card border border-app-border rounded-2xl font-black text-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                             />
                             <p className="flex-1 text-[10px] text-neutral-500 font-bold leading-relaxed py-2">
                               Duration a client is barred from the marketplace after multiple cancellations.
                             </p>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">AI Moderation Confidence Threshold</label>
                           <input 
                             type="range" 
                             min="0" max="100" step="1"
                             className="w-full accent-emerald-500"
                           />
                           <div className="flex justify-between text-[8px] font-black uppercase text-neutral-500">
                             <span>Loose (0%)</span>
                             <span>Strict (100%)</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-end pt-4">
                        <button className="px-12 py-4 bg-emerald-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">
                          Save Architecture Settings
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {/* Legal & Terms Section */}
            {activeTab === 'legal' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Legal Policies</h3>
                  <button className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Policy
                  </button>
                </div>

                <div className="space-y-4">
                  {legalPolicies.map(policy => (
                    <div key={policy.id} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border shadow-sm flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-neutral-400" />
                        </div>
                        <div>
                          <h4 className="font-black text-lg uppercase tracking-tight text-app-text">{policy.title}</h4>
                          <p className="text-xs text-neutral-500">Version {policy.version} • Last updated {new Date(policy.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-6 py-3 bg-neutral-50 dark:bg-neutral-800 text-app-text rounded-2xl font-bold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all">Edit Content</button>
                        <button className="p-3 text-neutral-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ))}
                  {legalPolicies.length === 0 && (
                    <div className="p-20 text-center bg-app-card border border-app-border rounded-[3rem]">
                      <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No policies created yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CMS & Design Section */}
            {activeTab === 'cms' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 bg-app-card p-2 rounded-2xl border border-app-border w-fit">
                  <button 
                    onClick={() => setCmsSubTab('content')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      cmsSubTab === 'content' ? "bg-neutral-900 text-white shadow-lg" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                  >
                    Content Manager
                  </button>
                  <button 
                    onClick={() => setCmsSubTab('visual')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      cmsSubTab === 'visual' ? "bg-neutral-900 text-white shadow-lg" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                  >
                    Visual Design Editor
                  </button>
                  {!isSimulatedRole && (
                    <button 
                      onClick={() => setCmsSubTab('preview')}
                      className={cn(
                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        cmsSubTab === 'preview' ? "bg-neutral-900 text-white shadow-lg" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      )}
                    >
                      Experience Center
                    </button>
                  )}
                </div>

                {cmsSubTab === 'content' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Page Manager</h3>
                      <button 
                        onClick={() => {
                          setSelectedPage(null);
                          setFormData({ status: 'draft', content: '' });
                          setShowPageModal(true);
                        }}
                        className="px-6 py-3 bg-neutral-900 text-white rounded-2xl font-bold text-sm flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create New Page
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {pages.map(page => (
                        <div key={page.id} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border shadow-sm space-y-6 group">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="font-black text-xl uppercase tracking-tight text-app-text">{page.title}</h4>
                              <p className="text-xs text-neutral-400 font-mono italic">{page.slug}</p>
                            </div>
                            <span className={cn(
                              "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest",
                              page.status === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {page.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-4 border-t border-app-border">
                            <button 
                              onClick={() => {
                                setSelectedPage(page);
                                setFormData(page);
                                setShowPageModal(true);
                              }}
                              className="flex-1 py-3 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                            >
                              Edit Content
                            </button>
                            <button 
                              onClick={() => handleDeletePage(page.id)}
                              className="p-3 text-neutral-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cmsSubTab === 'visual' && (
                  <div className="grid lg:grid-cols-12 gap-8">
                    {/* Page List Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                      <div className="bg-app-card border border-app-border rounded-[2.5rem] p-6 space-y-6">
                        <div className="flex items-center justify-between px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Application Pages</h4>
                          <button 
                            onClick={handleResetEntireDesign}
                            className="text-[8px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-black uppercase hover:bg-rose-100 transition-colors"
                          >
                            Reset UI
                          </button>
                        </div>
                        <div className="space-y-2">
                          {[
                            { id: 'home', name: 'Home Landing', icon: Home },
                            { id: 'services', name: 'Service Marketplace', icon: Layers },
                            { id: 'nav', name: 'Navigation Bar', icon: Columns },
                            { id: 'footer', name: 'Global Footer', icon: Layout },
                            { id: 'dashboards', name: 'User Dashboards', icon: Smartphone }
                          ].map(appPage => (
                            <button
                              key={appPage.id}
                              onClick={() => setSelectedCmsConfig({ 
                                id: appPage.id, 
                                name: appPage.name,
                                elements: cmsConfigs.filter(c => c.pageId === appPage.id)
                              })}
                              className={cn(
                                "w-full p-4 rounded-2xl flex items-center justify-between transition-all group",
                                selectedCmsConfig?.id === appPage.id 
                                  ? "bg-neutral-900 text-white shadow-xl translate-x-1" 
                                  : "bg-neutral-50 dark:bg-neutral-800/30 text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <appPage.icon className={cn("w-4 h-4", selectedCmsConfig?.id === appPage.id ? "text-emerald-400" : "text-neutral-400")} />
                                <span className="text-xs font-bold uppercase tracking-tight">{appPage.name}</span>
                              </div>
                              <ChevronRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", selectedCmsConfig?.id === appPage.id ? "text-emerald-400 opacity-100" : "")} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic Pages in CMS */}
                      <div className="bg-app-card border border-app-border rounded-[2.5rem] p-6 space-y-6">
                        <div className="flex items-center justify-between px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Custom Dynamic Pages</h4>
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Dynamic</span>
                        </div>
                        <div className="space-y-2">
                          {pages.map(page => (
                            <button
                              key={page.id}
                              onClick={() => setSelectedCmsConfig({ 
                                id: page.id, 
                                name: page.title,
                                elements: cmsConfigs.filter(c => c.pageId === page.id)
                              })}
                              className={cn(
                                "w-full p-4 rounded-2xl flex items-center justify-between transition-all group",
                                selectedCmsConfig?.id === page.id 
                                  ? "bg-neutral-900 text-white shadow-xl translate-x-1" 
                                  : "bg-neutral-50 dark:bg-neutral-800/30 text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <FileText className={cn("w-4 h-4", selectedCmsConfig?.id === page.id ? "text-emerald-400" : "text-neutral-400")} />
                                <span className="text-xs font-bold uppercase tracking-tight truncate max-w-[120px]">{page.title}</span>
                              </div>
                              <ChevronRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", selectedCmsConfig?.id === page.id ? "text-emerald-400 opacity-100" : "")} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Element Editor Area */}
                    <div className="lg:col-span-8">
                      <AnimatePresence mode="wait">
                        {selectedCmsConfig ? (
                          <motion.div
                            key={selectedCmsConfig.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">{selectedCmsConfig.name} Editor</h3>
                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Manage visual elements and styles for this page</p>
                              </div>
                              <button 
                                onClick={() => {
                                  setFormData({ 
                                    pageId: selectedCmsConfig.id, 
                                    type: 'generic',
                                    styles: { borderRadius: '24px', backgroundColor: '#ffffff', color: '#000000', display: 'flex' },
                                    content: { text: '' }
                                  });
                                  setShowCmsVisualModal(true);
                                }}
                                className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                                title="Add Style Element"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedCmsConfig.elements.map((element: any) => (
                                <div key={element.id} className="bg-app-card border border-app-border rounded-[3rem] p-8 space-y-6 group hover:border-emerald-500/30 transition-all">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-app-border"
                                        style={{ 
                                          backgroundColor: element.styles?.backgroundColor || '#f9fafb',
                                          borderRadius: element.styles?.borderRadius || '24px'
                                        }}
                                      >
                                        {element.icon || <Box className="w-6 h-6 text-neutral-400" />}
                                      </div>
                                      <div>
                                        <h5 className="font-black uppercase tracking-tight text-app-text">{element.name}</h5>
                                        <div className="flex items-center gap-2">
                                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Visual Component</p>
                                          {element.type && (
                                            <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{element.type}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => {
                                          setFormData(element);
                                          setShowCmsVisualModal(true);
                                        }}
                                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-emerald-500 transition-colors"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={async () => {
                                          if (confirm(`Delete style profile for ${element.name}?`)) {
                                            await deleteDoc(doc(db, 'cms_visual_elements', element.id));
                                            showSuccess('Element style profile deleted');
                                          }
                                        }}
                                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-rose-500 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(element.styles || {}).map(([key, val]: [string, any]) => (
                                      <div key={key} className="px-3 py-1 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center gap-2 border border-app-border">
                                        <span className="text-[8px] font-black uppercase text-neutral-400">{key}:</span>
                                        <span className="text-[8px] font-mono text-app-text">
                                          {key.toLowerCase().includes('color') ? (
                                            <div className="w-2 h-2 rounded-full inline-block border border-neutral-200" style={{ backgroundColor: val }} />
                                          ) : null} {val}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}

                              {selectedCmsConfig.elements.length === 0 && (
                                <div className="col-span-full py-20 bg-neutral-50 dark:bg-neutral-800/20 border-2 border-dashed border-app-border rounded-[3rem] text-center space-y-6">
                                  <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto">
                                    <Palette className="w-8 h-8 text-neutral-300" />
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">No visual elements defined for this page</p>
                                    <p className="text-[10px] text-neutral-500 max-w-xs mx-auto">You can either add a custom element or seed the standard components for this page type.</p>
                                  </div>
                                  <div className="flex items-center justify-center gap-4">
                                    <button 
                                      onClick={() => handleSeedDefaults(selectedCmsConfig.id)}
                                      className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                      Seed Standard Components
                                    </button>
                                    <div className="w-px h-8 bg-app-border" />
                                    <button 
                                      onClick={() => {
                                        setFormData({ 
                                          pageId: selectedCmsConfig.id, 
                                          type: 'generic',
                                          styles: { borderRadius: '24px', backgroundColor: '#ffffff', color: '#000000', display: 'flex' },
                                          content: { text: '' }
                                        });
                                        setShowCmsVisualModal(true);
                                      }}
                                      className="px-6 py-3 bg-neutral-900 dark:bg-neutral-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all"
                                    >
                                      + Manual Add
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center py-40 border-2 border-dashed border-app-border rounded-[4rem] text-center space-y-6">
                            <div className="w-24 h-24 bg-neutral-50 dark:bg-neutral-800 rounded-[2.5rem] flex items-center justify-center shadow-inner">
                              <Layout className="w-12 h-12 text-neutral-300" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-xl font-black italic uppercase tracking-tight text-neutral-400">Select Page Branch</h3>
                              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Choose a page from the sidebar to start designing</p>
                            </div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {cmsSubTab === 'preview' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Experience Center</h3>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Simulate application flow as different user roles</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={toggleInspector}
                          className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                            isInspectorActive 
                              ? "bg-blue-500 text-white border-blue-500 shadow-xl shadow-blue-500/20" 
                              : "bg-white dark:bg-neutral-800 text-neutral-500 border-app-border hover:bg-neutral-50 dark:hover:bg-neutral-700"
                          )}
                        >
                          <MousePointer2 className="w-3.5 h-3.5" />
                          {isInspectorActive ? 'Select Element...' : 'Visual Inspector'}
                        </button>
                        <div className="h-8 w-px bg-app-border" />
                        <div className="flex gap-2">
                          {['owner', 'provider', 'customer'].map(role => (
                            <button
                              key={role}
                              onClick={() => setPreviewRole(role as any)}
                              className={cn(
                                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                previewRole === role 
                                  ? "bg-neutral-900 text-white border-neutral-900 shadow-xl shadow-neutral-900/20" 
                                  : "bg-white dark:bg-neutral-800 text-neutral-500 border-app-border hover:bg-neutral-50 dark:hover:bg-neutral-700"
                              )}
                            >
                              {role === 'owner' ? 'Admin' : role === 'provider' ? 'Provider' : 'Client'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-8">
                      <div className={cn(
                        "bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col transition-all duration-500",
                        selectedElement ? "w-2/3" : "w-full"
                      )} style={{ height: '800px' }}>
                        <div className="h-14 bg-neutral-900 flex items-center px-6 justify-between z-20 shrink-0">
                          <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500" />
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          </div>
                          <div className="hidden md:flex bg-neutral-800 px-6 py-1.5 rounded-full text-[10px] font-mono text-emerald-500/80 items-center gap-2 border border-white/5">
                            <Lock className="w-3 h-3" />
                            https://app.neighborly.internal/?role_preview={previewRole}
                          </div>
                          <div className="flex items-center gap-4 text-neutral-500">
                            <div title="Reload History">
                              <History className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                            </div>
                            <button 
                              onClick={() => window.open(`/?role_preview=${previewRole}`, '_blank')}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-hidden bg-white">
                          <iframe 
                            ref={iframeRef}
                            key={previewRole}
                            src={`/?role_preview=${previewRole}`}
                            className="w-full h-full border-none"
                            title="Experience Preview"
                          />
                        </div>
                      </div>

                      {/* Editor Sidebar */}
                      <AnimatePresence>
                        {selectedElement && (
                          <motion.div 
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            className="w-1/3 bg-app-card border border-app-border rounded-[3rem] flex flex-col overflow-y-auto shadow-xl max-h-[80vh]"
                          >
                            <div className="p-6 border-b border-app-border flex items-center justify-between sticky top-0 bg-app-card z-10">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                                  <Paintbrush className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-black uppercase tracking-tight text-app-text">Visual Editor</h4>
                                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{selectedElement.tagName.toLowerCase()}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => setSelectedElement(null)}
                                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Tab Navigation */}
                            <div className="flex px-6 pt-4 border-b border-app-border">
                              {['props', 'style', 'layout', 'actions'].map((tab) => (
                                <button
                                  key={tab}
                                  onClick={() => setEditorTab(tab)}
                                  className={cn(
                                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                                    editorTab === tab 
                                      ? "border-blue-500 text-blue-500" 
                                      : "border-transparent text-neutral-500 hover:text-neutral-700"
                                  )}
                                >
                                  {tab}
                                </button>
                              ))}
                            </div>

                            <div className="flex-1 p-6 space-y-8">
                              {/* Props Tab Content */}
                              {editorTab === 'props' && (
                                <div className="space-y-6">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">HTML Tag</label>
                                    <select value={selectedElement.tagName.toLowerCase()} onChange={(e) => handleUpdateAttribute(selectedElement.tagName, { tagName: e.target.value })} className="w-full p-2 bg-app-input rounded-lg text-xs font-mono">
                                        {['div', 'span', 'p', 'h1', 'button', 'input', 'a'].map(tag => <option key={tag} value={tag}>{tag}</option>)}
                                    </select>
                                  </div>
                                  {selectedElement.tagName.toLowerCase() === 'input' && (
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Input Type</label>
                                      <select value={selectedElement.attributes?.type || 'text'} onChange={(e) => handleUpdateAttribute(selectedElement.tagName, { type: e.target.value })} className="w-full p-2 bg-app-input rounded-lg text-xs font-mono">
                                          {['text', 'password', 'email', 'search', 'number', 'tel'].map(type => <option key={type} value={type}>{type}</option>)}
                                      </select>
                                    </div>
                                  )}
                                  <div className="space-y-1.5">
                                       <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Text Content</label>
                                       <textarea value={selectedElement.textContent || ''} onChange={(e) => handleUpdateContent(selectedElement.tagName, { textContent: e.target.value })} className="w-full p-2 bg-app-input rounded-lg text-xs" rows={3} />
                                  </div>
                                </div>
                              )}

                              {/* Style Tab Content */}
                              {editorTab === 'style' && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Color</label>
                                      <input type="color" value={selectedElement.styles.color} onChange={(e) => handleUpdateElement(selectedElement.tagName, { color: e.target.value })} className="w-full h-8 rounded-lg cursor-pointer" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Font Size</label>
                                      <input type="text" value={selectedElement.styles.fontSize} onChange={(e) => handleUpdateElement(selectedElement.tagName, { fontSize: e.target.value })} className="w-full p-2 bg-app-input rounded-lg text-xs" />
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Font Family</label>
                                      <select value={selectedElement.styles.fontFamily} onChange={(e) => handleUpdateElement(selectedElement.tagName, { fontFamily: e.target.value })} className="w-full p-2 bg-app-input rounded-lg text-xs">
                                        <option value="sans-serif">Sans Serif</option>
                                        <option value="serif">Serif</option>
                                        <option value="monospace">Monospace</option>
                                      </select>
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Alignment</label>
                                      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-app-border">
                                        {['left', 'center', 'right', 'justify'].map(align => (
                                          <button
                                            key={align}
                                            onClick={() => handleUpdateElement(selectedElement.tagName, { textAlign: align })}
                                            className={cn(
                                              "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                                              selectedElement.styles.textAlign === align 
                                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm" 
                                                : "text-neutral-500 hover:text-neutral-700"
                                            )}
                                          >
                                            {align}
                                          </button>
                                        ))}
                                      </div>
                                  </div>
                                </div>
                              )}

                                <div className="space-y-6">
                                  <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-app-border pb-1">Container</h5>
                                
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Background Color</label>
                                  <div className="flex gap-2">
                                    <input 
                                      type="color" 
                                      value={selectedElement.styles.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#ffffff' : selectedElement.styles.backgroundColor}
                                      onChange={(e) => handleUpdateElement(selectedElement.tagName, { backgroundColor: e.target.value })}
                                      className="w-8 h-8 rounded-lg cursor-pointer border border-app-border p-0 overflow-hidden"
                                    />
                                    <input 
                                      type="text" 
                                      value={selectedElement.styles.backgroundColor}
                                      onChange={(e) => handleUpdateElement(selectedElement.tagName, { backgroundColor: e.target.value })}
                                      className="flex-1 p-2 bg-app-input border border-app-border rounded-lg text-[10px] font-mono uppercase"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Border Radius</label>
                                    <input 
                                      type="text" 
                                      value={selectedElement.styles.borderRadius}
                                      onChange={(e) => handleUpdateElement(selectedElement.tagName, { borderRadius: e.target.value })}
                                      className="w-full p-2 bg-app-input border border-app-border rounded-lg text-[10px] font-mono"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Padding</label>
                                    <input 
                                      type="text" 
                                      value={selectedElement.styles.padding}
                                      onChange={(e) => handleUpdateElement(selectedElement.tagName, { padding: e.target.value })}
                                      className="w-full p-2 bg-app-input border border-app-border rounded-lg text-[10px] font-mono"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Content Section */}
                              <div className="space-y-6">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-app-border pb-1">Content & Media</h5>
                                
                                {selectedElement.tagName === 'IMG' ? (
                                  <div className="space-y-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Image Source (URL)</label>
                                      <input 
                                        type="text" 
                                        value={selectedElement.attributes?.src || ''}
                                        onChange={(e) => handleUpdateContent(selectedElement.tagName, { src: e.target.value })}
                                        className="w-full p-2 bg-app-input border border-app-border rounded-lg text-[10px] font-mono"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Alt Text</label>
                                      <input 
                                        type="text" 
                                        value={selectedElement.attributes?.alt || ''}
                                        onChange={(e) => handleUpdateContent(selectedElement.tagName, { alt: e.target.value })}
                                        className="w-full p-2 bg-app-input border border-app-border rounded-lg text-[10px] font-mono"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Text Content</label>
                                    <textarea 
                                      value={selectedElement.content?.text ?? selectedElement.textContent}
                                      onChange={(e) => handleUpdateContent(selectedElement.tagName, { text: e.target.value })}
                                      className="w-full h-32 p-3 bg-app-input border border-app-border rounded-xl text-xs font-medium text-app-text"
                                    />
                                    <p className="text-[9px] text-neutral-500 italic uppercase ml-1">Note: Tag-based editing affects all elements of this type.</p>
                                  </div>
                                )}
                              </div>

                              {/* Save/Reset Footer */}
                              <div className="pt-8 border-t border-app-border space-y-3">
                                <button
                                  onClick={handleSaveChanges}
                                  disabled={!isDirty}
                                  className={cn(
                                    "w-full py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2",
                                    isDirty 
                                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:scale-[1.02] active:scale-95" 
                                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none"
                                  )}
                                >
                                  <Save className="w-4 h-4" />
                                  Confirm & Save Changes
                                </button>
                                <button
                                  onClick={handleResetElement}
                                  disabled={!isDirty}
                                  className={cn(
                                    "w-full py-3 rounded-2xl font-bold transition-all border flex items-center justify-center gap-2",
                                    isDirty
                                      ? "bg-white dark:bg-neutral-900 border-app-border text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                      : "opacity-0 pointer-events-none"
                                  )}
                                >
                                  <History className="w-4 h-4" />
                                  Discard Draft
                                </button>
                              </div>

                              {/* Logic & Variants Section */}
                              <div className="space-y-6">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-app-border pb-1">Logic & Variants</h5>
                                
                                <div className="space-y-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Component Variant (Type)</label>
                                    <select 
                                      value={selectedElement.config?.variant || 'default'}
                                      onChange={(e) => handleUpdateConfig(selectedElement.tagName, { variant: e.target.value })}
                                      className="w-full p-2 bg-app-input border border-app-border rounded-lg text-[10px] font-mono"
                                    >
                                      <option value="default">Default</option>
                                      <option value="minimalist">Minimalist</option>
                                      <option value="brutalist">Brutalist</option>
                                      <option value="glassmorphism">Glassmorphism</option>
                                      <option value="outline">Outline Only</option>
                                    </select>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-black uppercase text-neutral-500 ml-1">Logical Filters</label>
                                      <button 
                                        onClick={() => {
                                          const key = prompt("Filter key (e.g., status, category):");
                                          const val = prompt("Filter value:");
                                          if (key && val) {
                                            handleUpdateConfig(selectedElement.tagName, { 
                                              filters: { ...selectedElement.config?.filters, [key]: val } 
                                            });
                                          }
                                        }}
                                        className="text-[9px] font-black uppercase text-blue-500 hover:text-blue-600 transition-colors"
                                      >
                                        + Add Filter
                                      </button>
                                    </div>
                                    <div className="space-y-2">
                                      {Object.entries(selectedElement.config?.filters || {}).map(([key, val]: [string, any]) => (
                                        <div key={key} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-app-border">
                                          <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase text-neutral-400 leading-none mb-1">{key}</span>
                                            <span className="text-[10px] font-mono text-app-text">{String(val)}</span>
                                          </div>
                                          <button 
                                            onClick={() => {
                                              const newFilters = { ...selectedElement.config?.filters };
                                              delete newFilters[key];
                                              handleUpdateConfig(selectedElement.tagName, { filters: newFilters });
                                            }}
                                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                      {(!selectedElement.config?.filters || Object.keys(selectedElement.config?.filters).length === 0) && (
                                        <div className="text-[9px] text-neutral-400 italic text-center py-2">
                                          No active filters configured
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-6 bg-neutral-900 border-t border-white/5 space-y-4">
                              <button 
                                onClick={() => setSelectedElement(null)}
                                className="w-full py-3 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-neutral-200 transition-all shadow-xl shadow-white/5"
                              >
                                Apply All Changes
                              </button>
                            </div>
                          </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Settings Section */}
            {activeTab === 'settings' && (
              <div className="bg-app-card p-12 rounded-[3rem] border border-app-border shadow-sm space-y-12">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black italic uppercase tracking-tight text-app-text">Platform Settings</h3>
                  <p className="text-neutral-500 text-sm">Configure global platform behavior and appearance.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <h4 className="text-sm font-black uppercase tracking-widest text-app-text border-b border-app-border pb-2">Appearance</h4>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">App Background Color</label>
                        <div className="flex gap-4">
                          <input 
                            type="color" 
                            value={systemConfig?.theme?.backgroundColor || '#f9fafb'}
                            onChange={e => handleUpdateGlobalConfig({ theme: { ...systemConfig?.theme, backgroundColor: e.target.value } })}
                            className="w-16 h-16 p-1 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl cursor-pointer"
                          />
                          <div className="flex-1 space-y-1">
                            <input 
                              type="text" 
                              value={systemConfig?.theme?.backgroundColor || '#f9fafb'}
                              onChange={e => handleUpdateGlobalConfig({ theme: { ...systemConfig?.theme, backgroundColor: e.target.value } })}
                              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl font-mono text-sm text-app-text"
                              placeholder="#f9fafb"
                            />
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest ml-2">Hex code for global background</p>
                          </div>
                        </div>
                        <div className="pt-2">
                          <button 
                            onClick={handleResetEntireDesign}
                            className="px-4 py-2 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black uppercase hover:bg-rose-50 transition-all flex items-center gap-2"
                          >
                            <History className="w-3.5 h-3.5" />
                            Reset All Visuals to Factory Default
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Platform Name</label>
                        <input 
                          type="text" 
                          defaultValue={systemConfig?.appName || 'Neighborly'}
                          onBlur={e => handleUpdateGlobalConfig({ appName: e.target.value })}
                          className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl font-bold text-app-text"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h4 className="text-sm font-black uppercase tracking-widest text-app-text border-b border-app-border pb-2">System Controls</h4>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-neutral-800 rounded-[2rem]">
                        <div>
                          <p className="font-bold text-sm text-app-text">Maintenance Mode</p>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Disable all user access</p>
                        </div>
                        <button 
                          onClick={() => handleUpdateGlobalConfig({ maintenanceMode: !systemConfig?.maintenanceMode })}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            systemConfig?.maintenanceMode ? "bg-red-500" : "bg-neutral-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            systemConfig?.maintenanceMode ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-neutral-800 rounded-[2rem]">
                        <div>
                          <p className="font-bold text-sm text-app-text">New Registrations</p>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Allow new users to join</p>
                        </div>
                        <button 
                          onClick={() => handleUpdateGlobalConfig({ allowRegistration: !systemConfig?.allowRegistration })}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            systemConfig?.allowRegistration !== false ? "bg-emerald-500" : "bg-neutral-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            systemConfig?.allowRegistration !== false ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KYC & AI Intelligence Settings */}
                <div className="pt-8 border-t border-app-border">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                         <Brain className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="text-xl font-black italic uppercase tracking-tighter text-app-text">KYC Compliance & AI Intelligence</h4>
                         <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Global verification strictness and AI-assisted review logic</p>
                      </div>
                   </div>

                   <div className="grid md:grid-cols-2 gap-8">
                      {[
                        { 
                          id: 'strictBusinessLookup', 
                          label: 'Strict Business ID Matching', 
                          desc: 'Match Business Name with Reg Number via API',
                          icon: Building2 
                        },
                        { 
                          id: 'enableAiAnalysis', 
                          label: 'AI-Powered Identity Analysis', 
                          desc: 'Use Gemini 3 to audit documents for fraud',
                          icon: Sparkles 
                        },
                        { 
                          id: 'enableFraudDetection', 
                          label: 'Digital Manipulation Detection', 
                          desc: 'Detect Photoshop & internet-source leaks',
                          icon: ShieldAlert 
                        },
                        { 
                          id: 'enableOcrMatching', 
                          label: 'OCR Identity Cross-Match', 
                          desc: 'Verify OCR name matches profile display name',
                          icon: UserCheck 
                        }
                      ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-neutral-800 rounded-[2.5rem] border border-app-border/50">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center border border-app-border">
                                 <item.icon className="w-5 h-5 text-neutral-500" />
                              </div>
                              <div>
                                 <p className="font-bold text-sm text-app-text">{item.label}</p>
                                 <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">{item.desc}</p>
                              </div>
                           </div>
                           <button 
                             onClick={() => {
                               const current = systemConfig?.kycConfig || {};
                               handleUpdateGlobalConfig({ 
                                 kycConfig: { ...current, [item.id]: !current[item.id] } 
                               });
                             }}
                             className={cn(
                               "w-12 h-6 rounded-full transition-all relative",
                               systemConfig?.kycConfig?.[item.id] !== false ? "bg-amber-500 shadow-lg shadow-amber-500/20" : "bg-neutral-200 dark:bg-neutral-700"
                             )}
                           >
                             <div className={cn(
                               "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                               systemConfig?.kycConfig?.[item.id] !== false ? "right-1" : "left-1"
                             )} />
                           </button>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Unified User Management Hub Modal */}
      <AnimatePresence>
        {showUserHubModal && (selectedUser || profileUser) && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-app-card border border-app-border rounded-[3rem] p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Sticky Header */}
              <div className="p-8 border-b border-app-border bg-neutral-900 text-white flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white text-neutral-900 rounded-2xl flex items-center justify-center text-2xl font-black italic shadow-lg">
                    {(isEditMode ? formData.displayName : (selectedUser?.displayName || profileUser?.displayName))?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tight">
                      {isEditMode ? formData.displayName : (selectedUser?.displayName || profileUser?.displayName)}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-lg">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400">
                          ${(selectedUser?.balance || profileUser?.balance || 0).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        {isEditMode ? formData.role : (selectedUser?.role || profileUser?.role)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isEditMode && selectedUser?.id && (
                    <button 
                      onClick={() => setIsEditMode(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-xs font-bold"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Profile
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setShowUserHubModal(false);
                      setIsEditMode(false);
                    }} 
                    className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Tabs */}
              <div className="flex border-b border-app-border px-8 bg-white dark:bg-neutral-900">
                {[
                  { id: 'general', label: 'General Info', icon: Users },
                  { id: 'security', label: 'Security & Access', icon: Shield },
                  { id: 'role-specific', label: (isEditMode ? formData.role : (selectedUser?.role || profileUser?.role)) === 'provider' ? 'Business Details' : 'Customer Profile', icon: Briefcase },
                  { id: 'finance', label: 'Financial Ledger', icon: Wallet }
                ].filter((tab): tab is { id: UserEditTab, label: string, icon: any } => !!tab).map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setEditUserTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                      editUserTab === tab.id ? "border-neutral-900 dark:border-white text-app-text" : "border-transparent text-neutral-400 hover:text-app-text"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                {isEditMode ? (
                  /* EDIT MODE */
                  <div className="space-y-8">
                    {editUserTab === 'general' && (
                      <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Display Name</label>
                            <input 
                              type="text"
                              value={formData.displayName}
                              onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 text-app-text"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Email Address</label>
                            <input 
                              type="email"
                              value={formData.email}
                              onChange={e => setFormData({ ...formData, email: e.target.value })}
                              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 text-app-text"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Phone Number</label>
                            <PhoneInput
                              country={'us'}
                              value={formData.phone}
                              onChange={phone => setFormData({ ...formData, phone })}
                              enableSearch={true}
                              containerClass="!w-full"
                              inputClass="!w-full !h-auto !py-4 !pl-16 !pr-4 !bg-neutral-50 dark:!bg-neutral-800 !border-app-border !rounded-2xl !text-app-text focus:!ring-2 focus:!ring-emerald-500 !transition-all !font-bold"
                              buttonClass="!bg-transparent !border-none !rounded-l-2xl !pl-4 hover:!bg-neutral-100 dark:hover:!bg-neutral-700 transition-colors"
                              dropdownClass="dark:!bg-neutral-900 dark:!text-white !rounded-xl !shadow-2xl border-app-border"
                              searchClass="dark:!bg-neutral-800 dark:!text-white !border-app-border !rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Account Status</label>
                            <select 
                              value={formData.status}
                              onChange={e => setFormData({ ...formData, status: e.target.value })}
                              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 text-app-text"
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="pending_verification">Pending Verification</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Platform Role</label>
                          <select 
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 text-app-text"
                          >
                            <option value="customer">Customer</option>
                            <option value="provider">Provider</option>
                            <option value="platform_admin">Platform Admin</option>
                            <option value="support">Support</option>
                            <option value="finance">Finance</option>
                            <option value="operations">Operations</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {editUserTab === 'security' && (
                      <div className="space-y-8">
                        <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                                <Key className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-app-text">Password Management</h4>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">Send a secure reset link to the user</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleSendPasswordReset(formData.email)}
                              className="px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                              Send Link
                            </button>
                          </div>

                          <div className="h-px bg-app-border" />

                          <div className="pt-2 space-y-4">
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-app-text">Direct Password Overwrite</h4>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">Manually set a new password for this user (Min 6 chars)</p>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input 
                                  type="password"
                                  placeholder="Enter new master password..."
                                  value={adminNewPassword}
                                  onChange={(e) => setAdminNewPassword(e.target.value)}
                                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-900 border border-app-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500 text-app-text"
                                />
                              </div>
                              <button 
                                onClick={() => handleAdminPasswordReset(formData.id, adminNewPassword)}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-red-500/20"
                              >
                                Execute
                              </button>
                            </div>
                          </div>

                          <div className="h-px bg-app-border" />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-app-text">Two-Factor Auth (2FA)</h4>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">
                                  Status: {selectedUser?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleToggle2FA(selectedUser?.id, !!selectedUser?.twoFactorEnabled)}
                              className={cn(
                                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                selectedUser?.twoFactorEnabled ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                              )}
                            >
                              {selectedUser?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                            </button>
                          </div>

                          <div className="h-px bg-app-border" />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                selectedUser?.isLocked ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                              )}>
                                {selectedUser?.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-app-text">Account Lock</h4>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">
                                  Prevent all access to the platform
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleLockAccount(selectedUser?.id, !!selectedUser?.isLocked)}
                              className={cn(
                                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                selectedUser?.isLocked ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                              )}
                            >
                              {selectedUser?.isLocked ? 'Unlock Account' : 'Lock Account'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {editUserTab === 'role-specific' && (
                      <div className="space-y-6">
                        {formData.role === 'provider' ? (
                          <div className="space-y-6">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Business Name</label>
                              <input 
                                type="text"
                                value={formData.businessName}
                                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                                className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 text-app-text"
                                placeholder="e.g. Acme Services"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Service Category</label>
                              <select 
                                value={formData.serviceCategory}
                                onChange={e => setFormData({ ...formData, serviceCategory: e.target.value })}
                                className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 text-app-text"
                              >
                                <option value="">Select Category</option>
                                {services.filter(s => s.level === 1).map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border">
                              <div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-app-text">Verification Badge</h4>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">Display checkmark on public profile</p>
                              </div>
                              <button 
                                onClick={() => setFormData({ ...formData, isVerifiedBadge: !formData.isVerifiedBadge })}
                                className={cn(
                                  "w-12 h-6 rounded-full transition-all relative",
                                  formData.isVerifiedBadge ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                  formData.isVerifiedBadge ? "left-7" : "left-1"
                                )} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Interests & Tags</label>
                              <div className="flex flex-wrap gap-2 p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl">
                                {formData.interests?.map((tag: string) => (
                                  <span key={tag} className="px-3 py-1 bg-white dark:bg-neutral-700 rounded-lg text-[10px] font-bold text-app-text flex items-center gap-2">
                                    {tag}
                                    <button onClick={() => setFormData({ ...formData, interests: formData.interests.filter((t: string) => t !== tag) })}><X className="w-3 h-3" /></button>
                                  </span>
                                ))}
                                <input 
                                  type="text"
                                  placeholder="Add interest..."
                                  className="bg-transparent border-none outline-none text-xs font-bold text-app-text min-w-[100px]"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = (e.target as HTMLInputElement).value.trim();
                                      if (val && !formData.interests.includes(val)) {
                                        setFormData({ ...formData, interests: [...formData.interests, val] });
                                        (e.target as HTMLInputElement).value = '';
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {editUserTab === 'finance' && (
                      <div className="space-y-6">
                        <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black uppercase tracking-widest text-app-text">Credit & Debt Management</h4>
                            <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-app-border">
                              <button 
                                onClick={() => setTransactionType('deposit')}
                                className={cn(
                                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                  transactionType === 'deposit' ? "bg-emerald-500 text-white shadow-lg" : "text-neutral-500"
                                )}
                              >
                                Deposit
                              </button>
                              <button 
                                onClick={() => setTransactionType('withdraw')}
                                className={cn(
                                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                  transactionType === 'withdraw' ? "bg-red-500 text-white shadow-lg" : "text-neutral-500"
                                )}
                              >
                                Withdraw
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Add/Subtract Credit</label>
                              <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input 
                                  type="number"
                                  value={creditAdjustment}
                                  onChange={e => setCreditAdjustment(e.target.value)}
                                  className="w-full pl-10 pr-4 py-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text"
                                  placeholder="For promotional adjustments..."
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Adjustment Reason</label>
                              <input 
                                type="text"
                                value={adjustmentReason}
                                onChange={e => setAdjustmentReason(e.target.value)}
                                className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text"
                                placeholder="Mandatory note for audit log..."
                              />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            {(isEditMode ? formData.role : (selectedUser?.role || profileUser?.role)) === 'provider' ? (
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Commission Settlement</label>
                                <div className="relative">
                                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                  <input 
                                    type="number"
                                    value={commissionSettlement}
                                    onChange={e => setCommissionSettlement(e.target.value)}
                                    className="w-full pl-10 pr-4 py-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text"
                                    placeholder="Recording payments received from providers..."
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Transaction Reference</label>
                                <input 
                                  type="text"
                                  className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text opacity-50 cursor-not-allowed"
                                  placeholder="Auto-generated on save..."
                                  disabled
                                />
                              </div>
                            )}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Balance Override (Admin Only)</label>
                              <div className="relative">
                                <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input 
                                  type="number"
                                  value={balanceOverride}
                                  onChange={e => setBalanceOverride(e.target.value)}
                                  className="w-full pl-10 pr-4 py-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text font-bold"
                                  placeholder="For critical administrative corrections only..."
                                />
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-neutral-900 text-white rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Resulting Balance Preview</p>
                                <p className="text-xl font-black italic">
                                  ${(
                                    (parseFloat(balanceOverride) || (selectedUser?.balance || 0)) + 
                                    (transactionType === 'deposit' ? (parseFloat(creditAdjustment) || 0) : -(parseFloat(creditAdjustment) || 0))
                                  ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Current</p>
                              <p className="text-sm font-bold">${(selectedUser?.balance || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* VIEW MODE */
                  <div className="space-y-8">
                    {editUserTab === 'general' && (
                      <div className="space-y-8">
                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border">
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Account Status</p>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                (selectedUser?.status || profileUser?.status) === 'active' ? "bg-emerald-500" : "bg-amber-500"
                              )} />
                              <p className="text-sm font-bold text-app-text capitalize">{selectedUser?.status || profileUser?.status}</p>
                            </div>
                          </div>
                          <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border">
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Platform Role</p>
                            <p className="text-sm font-bold text-app-text capitalize">{selectedUser?.role || profileUser?.role}</p>
                          </div>
                          <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border">
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Member Since</p>
                            <p className="text-sm font-bold text-app-text">
                              {new Date((selectedUser?.createdAt || profileUser?.createdAt)?.seconds * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-sm font-black uppercase tracking-widest text-app-text border-b border-app-border pb-2">Contact Information</h4>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4 p-4 bg-app-input rounded-2xl border border-app-border">
                              <Mail className="w-5 h-5 text-neutral-400" />
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Email</p>
                                <p className="text-sm font-bold text-app-text">{selectedUser?.email || profileUser?.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-app-input rounded-2xl border border-app-border">
                              <Phone className="w-5 h-5 text-neutral-400" />
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Phone</p>
                                <p className="text-sm font-bold text-app-text">{selectedUser?.phone || profileUser?.phone || 'Not provided'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {editUserTab === 'security' && (
                      <div className="space-y-6">
                        <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ShieldCheck className="w-5 h-5 text-emerald-500" />
                              <span className="text-sm font-bold text-app-text">Two-Factor Authentication</span>
                            </div>
                            <span className={cn(
                              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                              (selectedUser?.twoFactorEnabled || profileUser?.twoFactorEnabled) ? "bg-emerald-500/10 text-emerald-500" : "bg-neutral-500/10 text-neutral-500"
                            )}>
                              {(selectedUser?.twoFactorEnabled || profileUser?.twoFactorEnabled) ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Lock className="w-5 h-5 text-red-500" />
                              <span className="text-sm font-bold text-app-text">Account Lock Status</span>
                            </div>
                            <span className={cn(
                              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                              (selectedUser?.isLocked || profileUser?.isLocked) ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                            )}>
                              {(selectedUser?.isLocked || profileUser?.isLocked) ? 'Locked' : 'Unlocked'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {editUserTab === 'role-specific' && (
                      <div className="space-y-6">
                        {(selectedUser?.role || profileUser?.role) === 'provider' ? (
                          <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Business Name</p>
                                <p className="text-sm font-bold text-app-text">{selectedUser?.businessName || profileUser?.businessName || 'N/A'}</p>
                              </div>
                              <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Service Category</p>
                                <p className="text-sm font-bold text-app-text capitalize">{selectedUser?.serviceCategory || profileUser?.serviceCategory || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Verification Status</p>
                                <p className="text-sm font-bold text-app-text">
                                  {((selectedUser?.isVerifiedBadge || profileUser?.isVerifiedBadge) || (selectedUser?.isVerified || profileUser?.isVerified)) ? 'Verified Professional' : 'Standard Provider'}
                                </p>
                                {((selectedUser?.isVerified || profileUser?.isVerified) || (selectedUser?.isVerifiedBadge || profileUser?.isVerifiedBadge)) && (selectedUser?.verifiedByAdminName || profileUser?.verifiedByAdminName) && (
                                  <p className="text-[10px] italic text-neutral-500 mt-1">
                                    Verified by: {selectedUser?.verifiedByAdminName || profileUser?.verifiedByAdminName} ({selectedUser?.verifiedByAdminEmail || profileUser?.verifiedByAdminEmail})
                                  </p>
                                )}
                              </div>
                              {((selectedUser?.isVerifiedBadge || profileUser?.isVerifiedBadge) || (selectedUser?.isVerified || profileUser?.isVerified)) && <CheckCircle className="w-8 h-8 text-emerald-500" />}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border">
                              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Interests & Tags</p>
                              <div className="flex flex-wrap gap-2">
                                {(selectedUser?.interests || profileUser?.interests || []).map((tag: string) => (
                                  <span key={tag} className="px-3 py-1 bg-white dark:bg-neutral-700 rounded-lg text-[10px] font-bold text-app-text">
                                    {tag}
                                  </span>
                                ))}
                                {(selectedUser?.interests || profileUser?.interests || []).length === 0 && (
                                  <p className="text-xs text-neutral-400 italic">No interests listed</p>
                                )}
                              </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Total Tasks</p>
                                <p className="text-2xl font-black italic text-app-text">{selectedUser?.totalTasks || profileUser?.totalTasks || 0}</p>
                              </div>
                              <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-app-border">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Total Spent</p>
                                <p className="text-2xl font-black italic text-emerald-500">
                                  ${(selectedUser?.totalSpent || profileUser?.totalSpent || 0).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {editUserTab === 'finance' && (
                      <div className="space-y-8">
                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="p-6 bg-neutral-900 text-white rounded-3xl space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Earnings</p>
                            <h4 className="text-3xl font-black italic">${(selectedUser?.totalEarnings || profileUser?.totalEarnings || 0).toLocaleString()}</h4>
                          </div>
                          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-3xl space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Pending Commission</p>
                            <h4 className="text-3xl font-black italic text-red-700">${(selectedUser?.pendingCommission || profileUser?.pendingCommission || 0).toLocaleString()}</h4>
                          </div>
                          <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-3xl space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Credit Balance</p>
                            <h4 className="text-3xl font-black italic text-emerald-700">${(selectedUser?.balance || profileUser?.balance || 0).toLocaleString()}</h4>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-sm font-black uppercase tracking-widest text-app-text border-b border-app-border pb-2">Transaction History</h4>
                          <div className="bg-app-input border border-app-border rounded-2xl overflow-hidden">
                            <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-app-border">
                              {userTransactions.map(tx => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-10 h-10 rounded-xl flex items-center justify-center",
                                      tx.type === 'credit' ? "bg-emerald-50 text-emerald-600" : 
                                      tx.type === 'commission_payment' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                                    )}>
                                      {tx.type === 'credit' ? <Plus className="w-5 h-5" /> : 
                                       tx.type === 'commission_payment' ? <CheckCircle className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-app-text capitalize">{tx.reason || tx.type.replace('_', ' ')}</p>
                                      <p className="text-[10px] text-neutral-400 uppercase font-black">
                                        {tx.timestamp?.seconds ? new Date(tx.timestamp.seconds * 1000).toLocaleString() : 'Recent'}
                                      </p>
                                    </div>
                                  </div>
                                  <span className={cn(
                                    "font-black text-sm",
                                    tx.amount > 0 ? "text-emerald-500" : "text-red-500"
                                  )}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                              {userTransactions.length === 0 && (
                                <div className="p-12 text-center">
                                  <History className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                                  <p className="text-xs font-bold text-neutral-400">No transaction records found.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Integrated Communication (Visible in both modes) */}
                <div className="pt-8 border-t border-app-border">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Quick Communication</p>
                  <div className="flex gap-4">
                    <a href={`mailto:${isEditMode ? formData.email : (selectedUser?.email || profileUser?.email)}`} className="flex-1 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-100 transition-all">
                      <Mail className="w-4 h-4" />
                      <span className="text-xs font-bold">Email</span>
                    </a>
                    <a href={`tel:${isEditMode ? formData.phone : (selectedUser?.phone || profileUser?.phone)}`} className="flex-1 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all">
                      <Phone className="w-4 h-4" />
                      <span className="text-xs font-bold">Call</span>
                    </a>
                    <a href={`https://wa.me/${(isEditMode ? formData.phone : (selectedUser?.phone || profileUser?.phone))?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl flex items-center justify-center gap-2 hover:bg-green-100 transition-all">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-bold">WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-app-border bg-neutral-50/50 dark:bg-neutral-800/50 flex gap-4">
                {isEditMode ? (
                  <>
                    <button 
                      onClick={() => setIsEditMode(false)}
                      className="px-8 py-4 bg-app-card border border-app-border rounded-2xl font-bold text-sm text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpdateUser}
                      disabled={isSaving}
                      className="flex-1 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Profile Changes'
                      )}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setShowUserHubModal(false)}
                    className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all shadow-xl"
                  >
                    Close Hub
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ledger Detail Modal */}
      <AnimatePresence>
        {showLedgerDetailModal && selectedLedgerOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLedgerDetailModal(false)}
              className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-app-bg border border-app-border rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Section */}
              <div className={cn(
                "p-8 border-b border-app-border flex items-center justify-between relative overflow-hidden",
                (selectedLedgerOrder.status === 'disputed' || selectedLedgerOrder.isDisputed) && "bg-rose-500/5"
              )}>
                <div className="flex items-center gap-4 relative z-10">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                    (selectedLedgerOrder.status === 'disputed' || selectedLedgerOrder.isDisputed) ? "bg-rose-500 text-white" : "bg-neutral-900 text-white"
                  )}>
                    {selectedLedgerOrder.status === 'disputed' ? <ShieldAlert className="w-8 h-8" /> : <ClipboardCheck className="w-8 h-8" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Order Intelligence & Evidence</h2>
                    <p className="text-sm font-bold text-neutral-400">ID: {selectedLedgerOrder.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                  <button 
                    onClick={() => handleExportLegalPDF(selectedLedgerOrder)}
                    className="px-6 py-3 bg-app-card border border-app-border text-app-text rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-neutral-900 hover:text-white transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Legal Evidence Export (PDF)
                  </button>
                  <button 
                    onClick={() => setShowLedgerDetailModal(false)}
                    className="p-3 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Column 1: Core Financials & Participants */}
                  <div className="space-y-8">
                    <div className="bg-app-card p-6 rounded-[2rem] border border-app-border space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Financial Evidence Layer</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-app-border">
                          <span className="text-xs font-bold text-neutral-500">Gross Subtotal</span>
                          <span className="text-lg font-black text-app-text">${selectedLedgerOrder.amount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-app-border">
                          <span className="text-xs font-bold text-neutral-500 text-rose-500">Platform Commission (15%)</span>
                          <span className="text-sm font-black text-rose-500">-${(selectedLedgerOrder.amount * 0.15).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-xs font-black uppercase tracking-widest text-emerald-500">Net Provider Payout</span>
                          <span className="text-2xl font-black text-emerald-500">${(selectedLedgerOrder.amount * 0.85).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-app-card p-6 rounded-[2rem] border border-app-border space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Transaction Logistics</h4>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Payment Method</label>
                          <select 
                            value={selectedLedgerOrder.paymentMethod || ''}
                            onChange={(e) => handleUpdateLedgerOrder(selectedLedgerOrder.id, { paymentMethod: e.target.value })}
                            className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-xs font-bold text-app-text outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Select Method</option>
                            <option value="Cash">Cash</option>
                            <option value="E-transfer">E-transfer</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Reference Number (Bank ID)</label>
                          <input 
                            type="text"
                            value={selectedLedgerOrder.paymentRef || ''}
                            onChange={(e) => handleUpdateLedgerOrder(selectedLedgerOrder.id, { paymentRef: e.target.value })}
                            placeholder="e.g. TXN-1920392"
                            className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-xs font-bold text-app-text outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Proof of Payment & Audit Trail */}
                  <div className="space-y-8">
                    <div className="bg-app-card p-6 rounded-[2rem] border border-app-border space-y-6 min-h-[300px]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 italic">Proof of Payment</h4>
                        <label className="cursor-pointer px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2">
                           <Upload className="w-3 h-3" />
                           Upload Evidence
                           <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*,application/pdf"
                            onChange={(e) => e.target.files && handleEvidenceUpload(e.target.files[0])}
                          />
                        </label>
                      </div>
                      
                      {isReceiptUploading && (
                        <div className="space-y-2">
                          <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-emerald-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${receiptProgress}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-center font-black text-neutral-400 uppercase">Uploading... {Math.round(receiptProgress)}%</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {(selectedLedgerOrder.evidenceFiles || []).map((file: any, i: number) => (
                          <a 
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-2xl overflow-hidden border border-app-border hover:border-emerald-500 flex items-center justify-center p-2 transition-all"
                          >
                            {file.type?.startsWith('image/') ? (
                              <img src={file.url} alt="Evidence" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                            ) : (
                              <FileText className="w-10 h-10 text-neutral-400" />
                            )}
                            <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                              <p className="text-[8px] font-black text-white uppercase tracking-widest text-center truncate w-full">{file.name}</p>
                              <ExternalLink className="w-4 h-4 text-emerald-400 mt-2" />
                            </div>
                          </a>
                        ))}
                        {(!selectedLedgerOrder.evidenceFiles || selectedLedgerOrder.evidenceFiles.length === 0) && !isReceiptUploading && (
                          <div className="col-span-2 flex flex-col items-center justify-center py-12 border-2 border-dashed border-app-border rounded-2xl bg-neutral-50/50">
                             <FileWarning className="w-8 h-8 text-neutral-300 mb-2" />
                             <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest italic">No evidence uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-app-card p-6 rounded-[2rem] border border-app-border space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 italic">Audit Trail History</h4>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {(selectedLedgerOrder.auditHistory || []).slice().reverse().map((entry: any, i: number) => (
                          <div key={i} className="flex gap-4 group">
                            <div className="flex flex-col items-center">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
                              <div className="w-[1px] flex-1 bg-app-border group-last:hidden mt-1" />
                            </div>
                            <div className="flex-1 pb-6">
                              <p className="text-[10px] font-black text-app-text uppercase tracking-tight">Status: {entry.status || 'Updated'}</p>
                              <p className="text-[8px] font-bold text-neutral-400 mb-2">{new Date(entry.timestamp).toLocaleString()}</p>
                              <div className="flex flex-wrap gap-1">
                                {entry.changes?.map((c: string) => (
                                  <span key={c} className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded text-[7px] font-black uppercase tracking-widest">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!selectedLedgerOrder.auditHistory || selectedLedgerOrder.auditHistory.length === 0) && (
                          <p className="text-[10px] text-neutral-400 italic text-center py-4">No audit entries yet.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Legal Shield */}
                  <div className="space-y-8">
                     <div className={cn(
                      "p-8 rounded-[2.5rem] border shadow-2xl transition-all relative overflow-hidden group",
                      (selectedLedgerOrder.status === 'disputed' || selectedLedgerOrder.isDisputed) 
                        ? "bg-rose-500 border-rose-500 text-white ring-4 ring-rose-500/20" 
                        : "bg-app-card border-app-border"
                    )}>
                      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                      <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className={cn(
                            "text-sm font-black italic uppercase tracking-widest flex items-center gap-2",
                            (selectedLedgerOrder.status === 'disputed' || selectedLedgerOrder.isDisputed) ? "text-white" : "text-app-text"
                          )}>
                            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                            Legal Shield Protocol
                          </h4>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={selectedLedgerOrder.status === 'disputed' || selectedLedgerOrder.isDisputed}
                              onChange={(e) => handleUpdateLedgerOrder(selectedLedgerOrder.id, { 
                                status: e.target.checked ? 'disputed' : 'completed',
                                isDisputed: e.target.checked 
                              })}
                            />
                            <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900"></div>
                          </label>
                        </div>

                        {(selectedLedgerOrder.status === 'disputed' || selectedLedgerOrder.isDisputed) && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30"
                          >
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white">Alert: Under Legal Review</p>
                            <p className="text-[9px] font-bold text-white/80 mt-1 italic">Financial settlements for this order are frozen pending admin resolution.</p>
                          </motion.div>
                        )}

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              (selectedLedgerOrder.status === 'disputed' || selectedLedgerOrder.isDisputed) ? "text-white" : "text-neutral-400"
                            )}>
                              Encrypted Admin Secret Notes
                            </p>
                            <Lock className={cn("w-3 h-3", (selectedLedgerOrder.status === 'disputed' || selectedLedgerOrder.isDisputed) ? "text-white" : "text-neutral-400")} />
                          </div>
                          <textarea 
                            value={secretNotes}
                            onChange={(e) => setSecretNotes(e.target.value)}
                            onBlur={() => handleUpdateLedgerOrder(selectedLedgerOrder.id, { secretNotes })}
                            className={cn(
                              "w-full h-48 p-5 text-sm font-bold bg-neutral-50 dark:bg-neutral-900 border border-app-border rounded-3xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner",
                              (selectedLedgerOrder.status === 'disputed' || selectedLedgerOrder.isDisputed) ? "text-rose-900 border-white/30 placeholder:text-rose-900/50" : "text-app-text"
                            )}
                            placeholder="Type encrypted notes here for internal legal review..."
                          />
                          <p className={cn(
                            "text-[8px] font-bold uppercase tracking-widest text-center",
                            (selectedLedgerOrder.status === 'disputed' || selectedLedgerOrder.isDisputed) ? "text-white/60" : "text-neutral-400"
                          )}>
                            All notes are timestamped and linked to Platform Owner (amirfarhadian569@gmail.com)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-app-border bg-neutral-50 dark:bg-neutral-900 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-neutral-900 bg-neutral-200" />
                    ))}
                  </div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest italic">Admin Group Collaboration Active</p>
                </div>
                <button 
                  onClick={() => setShowLedgerDetailModal(false)}
                  className="px-10 py-4 bg-app-card border border-app-border text-app-text rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-neutral-900 hover:text-white transition-all shadow-xl"
                >
                  Close Transaction View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KYC Review Modal */}
      <AnimatePresence>
        {showKycReviewModal && selectedKyc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-app-card rounded-[3rem] p-10 space-y-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar border border-app-border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Review KYC</h3>
                  <p className="text-xs text-neutral-400 uppercase tracking-widest font-black">
                    {selectedKyc.type === 'business' ? 'Business Verification' : 'Personal Verification'}
                  </p>
                </div>
                <button onClick={() => setShowKycReviewModal(false)} className="p-2 hover:bg-app-input rounded-full text-app-text transition-colors">
                  <X className="w-6 h-6 text-app-text" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-app-text border-b border-app-border pb-2">Submitted Details</h4>
                  
                  <div className="p-4 bg-app-input rounded-2xl border border-app-border space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">User Contact</p>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-app-text">{selectedKyc.userName || 'N/A'}</p>
                      <p className="text-xs text-neutral-500">{selectedKyc.userEmail}</p>
                      <p className="text-xs text-neutral-400">{selectedKyc.userPhone || 'No phone'}</p>
                    </div>
                  </div>

                  {selectedKyc.type === 'personal' ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ID Type</p>
                        <p className="font-bold capitalize text-app-text">{selectedKyc.details?.idType?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ID Number</p>
                        <p className="font-bold text-app-text">{selectedKyc.details?.idNumber}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Business Name</p>
                          <p className="font-bold text-app-text">{selectedKyc.details?.businessName}</p>
                        </div>
                        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center gap-2 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">API Verified</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Owner Name</p>
                        <p className="font-bold text-app-text">{selectedKyc.details?.ownerName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Reg Number</p>
                          <p className="font-bold text-app-text">{selectedKyc.details?.registrationNumber}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">License #</p>
                          <p className="font-bold text-app-text">{selectedKyc.details?.businessLicense}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Expiry Date</p>
                        <p className={cn(
                          "font-bold",
                          selectedKyc.details?.expiryDate && new Date(selectedKyc.details.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                            ? "text-rose-500"
                            : "text-emerald-500"
                        )}>
                          {selectedKyc.details?.expiryDate || 'N/A'}
                          {selectedKyc.details?.expiryDate && new Date(selectedKyc.details.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && " (Expires soon)"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Address</p>
                        <p className="font-bold text-app-text text-xs">{selectedKyc.details?.businessAddress}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-app-text border-b border-app-border pb-2">Documents</h4>
                  
                  {selectedKyc.type === 'personal' ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ID Front</p>
                        {selectedKyc.details?.idImageFront || selectedKyc.details?.idImage ? (
                          <img 
                            src={selectedKyc.details.idImageFront || selectedKyc.details.idImage} 
                            alt="ID Front" 
                            className="w-full h-48 object-cover rounded-2xl border border-app-border"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-48 bg-app-bg rounded-2xl flex items-center justify-center border border-dashed border-app-border">
                            <p className="text-xs text-neutral-400">No image provided</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ID Back</p>
                        {selectedKyc.details?.idImageBack ? (
                          <img 
                            src={selectedKyc.details.idImageBack} 
                            alt="ID Back" 
                            className="w-full h-48 object-cover rounded-2xl border border-app-border"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-48 bg-app-bg rounded-2xl flex items-center justify-center border border-dashed border-app-border">
                            <p className="text-xs text-neutral-400">No image provided</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Business Logo</p>
                        {selectedKyc.details?.businessLogo ? (
                          <img 
                            src={selectedKyc.details.businessLogo} 
                            alt="Logo" 
                            className="w-full h-32 object-contain rounded-2xl border border-app-border bg-white"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-32 bg-app-bg rounded-2xl flex items-center justify-center border border-dashed border-app-border">
                            <p className="text-xs text-neutral-400">No logo provided</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Registration Document</p>
                        {selectedKyc.details?.businessRegistrationDoc || selectedKyc.details?.certificates ? (
                          <a 
                            href={selectedKyc.details.businessRegistrationDoc || selectedKyc.details.certificates} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-app-bg rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-app-border"
                          >
                            <FileText className="w-5 h-5 text-neutral-400" />
                            <span className="text-xs font-bold text-blue-600 truncate">View Document</span>
                          </a>
                        ) : (
                          <div className="w-full h-24 bg-app-bg rounded-2xl flex items-center justify-center border border-dashed border-app-border">
                            <p className="text-xs text-neutral-400">No document provided</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Intelligence Audit */}
                  <div className="pt-6 border-t border-app-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-app-text">AI Intelligent Audit</span>
                      </div>
                      <button 
                        onClick={handleAiAudit}
                        disabled={isAiAnalyzing}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          isAiAnalyzing 
                            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" 
                            : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                        )}
                      >
                        {isAiAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {isAiAnalyzing ? 'Analyzing...' : 'Execute AI Audit'}
                      </button>
                    </div>

                    {aiAnalysisResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-4 rounded-2xl border space-y-3 shadow-sm",
                          aiAnalysisResult.recommendation === 'approve' ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
                          aiAnalysisResult.recommendation === 'reject' ? "bg-rose-50 border-rose-200 text-rose-900" :
                          "bg-amber-50 border-amber-200 text-amber-900"
                        )}
                      >
                         <div className="flex items-center justify-between">
                            <p className="font-black italic uppercase text-xs flex items-center gap-2">
                               <Wand2 className="w-3 h-3" />
                               AI Result: {aiAnalysisResult.recommendation.toUpperCase()}
                            </p>
                            <span className="text-[10px] font-bold opacity-60">Confidence: {Math.round(aiAnalysisResult.confidence * 100)}%</span>
                         </div>
                         
                         <p className="text-[10px] leading-relaxed font-medium">
                            {aiAnalysisResult.reasoning}
                         </p>

                         <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="flex items-center gap-2 text-[8px] font-bold uppercase p-2 bg-white/50 rounded-lg">
                               {aiAnalysisResult.isEdited ? <FileWarning className="w-3 h-3 text-rose-500" /> : <Check className="w-3 h-3 text-emerald-500" />}
                               <span>Edit Detect</span>
                            </div>
                            <div className="flex items-center gap-2 text-[8px] font-bold uppercase p-2 bg-white/50 rounded-lg">
                               {aiAnalysisResult.isDownloaded ? <FileWarning className="w-3 h-3 text-rose-500" /> : <Check className="w-3 h-3 text-emerald-500" />}
                               <span>Authentic Source</span>
                            </div>
                            <div className="flex items-center gap-2 text-[8px] font-bold uppercase p-2 bg-white/50 rounded-lg">
                               {aiAnalysisResult.ocrMatch ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-rose-500" />}
                               <span>Identity Match</span>
                            </div>
                            <div className="flex items-center gap-2 text-[8px] font-bold uppercase p-2 bg-white/50 rounded-lg">
                               <Check className="w-3 h-3 text-emerald-500" />
                               <span>Data Extracted</span>
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-8 border-t border-neutral-100">
                {selectedKyc.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => handleKycAction(selectedKyc.id, 'rejected')}
                      className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-100 transition-all"
                    >
                      Reject Submission
                    </button>
                    <button 
                      onClick={() => handleKycAction(selectedKyc.id, 'verified')}
                      className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Approve & Verify
                    </button>
                  </>
                ) : (
                  <div className="flex-1 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex flex-col items-center justify-center">
                    <p className={`text-sm font-bold ${selectedKyc.status === 'verified' ? 'text-emerald-500' : 'text-red-500'} capitalize mb-1`}>
                      {selectedKyc.status}
                    </p>
                    {selectedKyc.verifiedByAdminName && (
                      <p className="text-xs text-neutral-500">
                        by {selectedKyc.verifiedByAdminName} ({selectedKyc.verifiedByAdminEmail})
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Page Editor Modal */}
      <AnimatePresence>
        {showPageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-app-card rounded-[3rem] p-10 space-y-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar border border-app-border"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black italic uppercase tracking-tight">
                  {selectedPage ? 'Edit Page' : 'Create New Page'}
                </h3>
                <button onClick={() => setShowPageModal(false)} className="p-2 hover:bg-app-input rounded-full text-app-text transition-colors">
                  <X className="w-6 h-6 text-app-text" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Page Title</label>
                    <input 
                      type="text" 
                      value={formData.title || ''}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text"
                      placeholder="e.g. About Us"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">URL Slug</label>
                    <input 
                      type="text" 
                      value={formData.slug || ''}
                      onChange={e => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text"
                      placeholder="e.g. /about"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Status</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Page Content (Markdown/HTML)</label>
                  <textarea 
                    value={formData.content || ''}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 h-64 resize-none font-mono text-sm"
                    placeholder="Enter page content..."
                  />
                </div>
              </div>

              <button 
                onClick={handleSavePage}
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {selectedPage ? 'Update Page' : 'Create Page'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal (Generic for categories, etc.) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-app-card border border-app-border rounded-[3rem] p-10 space-y-8 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">
                  {formData.id ? `Edit ${formData.type}` : `Add New ${formData.type}`}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-app-input rounded-full text-app-text transition-colors">
                  <X className="w-6 h-6 text-app-text" />
                </button>
              </div>

                <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text"
                    placeholder="Enter name..."
                  />
                </div>
                {formData.type === 'service' && (() => {
                  // Validate tree logic for dropdown
                  const getSubtreeMaxDepth = (srvId: string): number => {
                    let depth = 0;
                    const children = services.filter(s => s.parentId === srvId);
                    for (const c of children) {
                      depth = Math.max(depth, 1 + getSubtreeMaxDepth(c.id));
                    }
                    return depth;
                  };
                  
                  const getDescendants = (srvId: string, set = new Set<string>()): Set<string> => {
                    const children = services.filter(s => s.parentId === srvId);
                    children.forEach(c => {
                      set.add(c.id);
                      getDescendants(c.id, set);
                    });
                    return set;
                  };

                  const myMaxDepth = formData.id ? getSubtreeMaxDepth(formData.id) : 0;
                  const myDescendants = formData.id ? getDescendants(formData.id) : new Set<string>();

                  // Max valid level this item can take = 5 - myMaxDepth
                  const validParents = services.filter(s => 
                    s.id !== formData.id && // not self
                    !myDescendants.has(s.id) && // not descendant (prevents cycle)
                    (s.level + 1 + myMaxDepth) <= 5 // restrict depth to 5
                  );

                  return (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Parent Service</label>
                    <TreeServiceSelect 
                      services={services}
                      validParents={validParents}
                      value={formData.parentId || null}
                      onChange={(newParentId, newLevel) => {
                        setFormData({ ...formData, parentId: newParentId, level: newLevel });
                      }}
                    />
                    {validParents.length < services.length - (formData.id ? 1 : 0) && (
                      <p className="text-[10px] text-amber-500 mt-1 ml-2 flex items-center gap-1 font-bold">
                        <AlertCircle className="w-3 h-3" /> Some options hidden to prevent cycles or exceeding 5 levels.
                      </p>
                    )}
                  </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Icon (Emoji)</label>
                    <input 
                      type="text" 
                      value={formData.icon || ''}
                      onChange={e => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text text-center text-xl"
                      placeholder="🛠️"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Visual Preview</label>
                    <div className="w-16 h-16 bg-white dark:bg-neutral-950 border-2 border-emerald-500/20 rounded-2xl flex items-center justify-center overflow-hidden mx-auto shadow-xl ring-4 ring-neutral-50 dark:ring-neutral-900/50">
                      {formData.iconUrl ? (
                        <div className="relative group w-full h-full flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                          <img 
                            src={formData.iconUrl} 
                            alt="Icon Preview" 
                            className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                            referrerPolicy="no-referrer"
                          />
                          <button 
                            onClick={() => setFormData({ ...formData, iconUrl: null })}
                            className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        getDynamicServiceIcon({name: formData.name, icon: formData.icon}, "w-full h-full p-3 opacity-20 text-neutral-500")
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Cloud Icon Upload (.png, .svg)</label>
                  <UniversalUpload 
                    onUploadComplete={(url) => setFormData({ ...formData, iconUrl: url })}
                    onUploadError={(error) => showError(`Icon Upload Failed: ${error.message}`)}
                    accept="image/png,image/svg+xml,image/jpeg,image/webp"
                    label="Transparent Icon"
                    folder="services/icons"
                    maxSizeMB={1}
                  />
                  <div className="space-y-1 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Manual Icon URL (Fallback)</label>
                    <input 
                      type="text" 
                      value={formData.iconUrl || ''}
                      onChange={e => setFormData({ ...formData, iconUrl: e.target.value })}
                      className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text text-xs"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Description</label>
                  <textarea 
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text h-32 resize-none"
                    placeholder="Enter service details..."
                  />
                </div>
                {formData.type === 'service' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Seasonality (Optional)</label>
                      <div className="flex gap-2">
                        <select 
                          value={formData.seasonality?.startMonth || ''}
                          onChange={e => setFormData({ 
                            ...formData, 
                            seasonality: { ...formData.seasonality, startMonth: e.target.value } 
                          })}
                          className="flex-1 p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text text-xs"
                        >
                          <option value="">Start Month</option>
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select 
                          value={formData.seasonality?.endMonth || ''}
                          onChange={e => setFormData({ 
                            ...formData, 
                            seasonality: { ...formData.seasonality, endMonth: e.target.value } 
                          })}
                          className="flex-1 p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text text-app-text text-xs"
                        >
                          <option value="">End Month</option>
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={handleSaveService}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save {formData.type === 'service' ? 'Service' : formData.type}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Confirmation Modal */}
      {/* CMS Visual Editor Modal */}
      <AnimatePresence>
        {showCmsVisualModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-app-card border border-app-border rounded-[3rem] p-10 space-y-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">
                    {formData.id ? 'Edit Component Style' : 'New Component Style'}
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest italic">{formData.pageId} / {formData.name || 'Untitled'}</p>
                </div>
                <button onClick={() => setShowCmsVisualModal(false)} className="p-2 hover:bg-app-input rounded-full text-app-text transition-colors">
                  <X className="w-6 h-6 text-app-text" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Element Name</label>
                    <input 
                      type="text" 
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-app-text"
                      placeholder="e.g. Hero Section"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Component Type</label>
                    <select 
                      value={formData.type || 'generic'}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-app-text font-bold"
                    >
                      <option value="generic">Generic Box</option>
                      <option value="navbar">Navigation Bar</option>
                      <option value="button">Action Button</option>
                      <option value="hero">Hero Section</option>
                      <option value="card">Feature Card</option>
                      <option value="footer">Footer Block</option>
                      <option value="text">Typography Block</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 p-1 bg-app-input rounded-2xl border border-app-border">
                  {['layout', 'style', 'content'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setCmsModalTab(tab as any)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        cmsModalTab === tab ? "bg-neutral-900 text-white shadow-lg" : "text-neutral-500 hover:bg-neutral-100"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {cmsModalTab === 'layout' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Padding</label>
                      <input 
                        type="text" 
                        value={formData.styles?.padding || ''}
                        onChange={e => setFormData({ ...formData, styles: { ...formData.styles, padding: e.target.value } })}
                        className="w-full p-4 bg-app-input border border-app-border rounded-2xl text-app-text"
                        placeholder="e.g. 2rem"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Margin</label>
                      <input 
                        type="text" 
                        value={formData.styles?.margin || ''}
                        onChange={e => setFormData({ ...formData, styles: { ...formData.styles, margin: e.target.value } })}
                        className="w-full p-4 bg-app-input border border-app-border rounded-2xl text-app-text"
                        placeholder="e.g. 1rem auto"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Shadow</label>
                      <select 
                        value={formData.styles?.boxShadow || 'none'}
                        onChange={e => setFormData({ ...formData, styles: { ...formData.styles, boxShadow: e.target.value } })}
                        className="w-full p-4 bg-app-input border border-app-border rounded-2xl text-app-text font-bold"
                      >
                        <option value="none">None</option>
                        <option value="0 4px 6px -1px rgb(0 0 0 / 0.1)">Light</option>
                        <option value="0 10px 15px -3px rgb(0 0 0 / 0.1)">Medium</option>
                        <option value="0 25px 50px -12px rgb(0 0 0 / 0.25)">Heavy</option>
                        <option value="0 20px 25px -5px rgb(16 185 129 / 0.2)">Emerald Glow</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Visibility</label>
                      <div className="flex bg-app-card rounded-2xl border border-app-border p-1">
                        <button 
                          onClick={() => setFormData({ ...formData, styles: { ...formData.styles, display: 'flex' } })}
                          className={cn("flex-1 py-3 rounded-xl text-[10px] font-bold", formData.styles?.display !== 'none' ? "bg-emerald-500 text-white" : "text-neutral-400")}
                        >
                          Visible
                        </button>
                        <button 
                          onClick={() => setFormData({ ...formData, styles: { ...formData.styles, display: 'none' } })}
                          className={cn("flex-1 py-3 rounded-xl text-[10px] font-bold", formData.styles?.display === 'none' ? "bg-red-500 text-white" : "text-neutral-400")}
                        >
                          Hidden
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {cmsModalTab === 'style' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Corner Radius</label>
                        <input 
                          type="text" 
                          value={formData.styles?.borderRadius || ''}
                          onChange={e => setFormData({ ...formData, styles: { ...formData.styles, borderRadius: e.target.value } })}
                          className="w-full p-4 bg-app-input border border-app-border rounded-2xl text-app-text"
                          placeholder="e.g. 2rem"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Text Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={formData.styles?.color || '#000000'}
                            onChange={e => setFormData({ ...formData, styles: { ...formData.styles, color: e.target.value } })}
                            className="w-12 h-14 bg-transparent border-none cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={formData.styles?.color || ''}
                            onChange={e => setFormData({ ...formData, styles: { ...formData.styles, color: e.target.value } })}
                            className="flex-1 p-4 bg-app-input border border-app-border rounded-2xl text-app-text font-mono text-sm uppercase"
                            placeholder="#HEX"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Background Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={formData.styles?.backgroundColor || '#ffffff'}
                            onChange={e => setFormData({ ...formData, styles: { ...formData.styles, backgroundColor: e.target.value } })}
                            className="w-12 h-14 bg-transparent border-none cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={formData.styles?.backgroundColor || ''}
                            onChange={e => setFormData({ ...formData, styles: { ...formData.styles, backgroundColor: e.target.value } })}
                            className="flex-1 p-4 bg-app-input border border-app-border rounded-2xl text-app-text font-mono text-sm uppercase"
                            placeholder="#HEX"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Accent Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={formData.styles?.primaryColor || '#10b981'}
                            onChange={e => setFormData({ ...formData, styles: { ...formData.styles, primaryColor: e.target.value } })}
                            className="w-12 h-14 bg-transparent border-none cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={formData.styles?.primaryColor || ''}
                            onChange={e => setFormData({ ...formData, styles: { ...formData.styles, primaryColor: e.target.value } })}
                            className="flex-1 p-4 bg-app-input border border-app-border rounded-2xl text-app-text font-mono text-sm uppercase"
                            placeholder="#HEX"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {cmsModalTab === 'content' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Display Text / Label</label>
                      <input 
                        type="text" 
                        value={formData.content?.text || ''}
                        onChange={e => setFormData({ ...formData, content: { ...formData.content, text: e.target.value } })}
                        className="w-full p-4 bg-app-input border border-app-border rounded-2xl text-app-text"
                        placeholder="e.g. Get Started Now"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Component Icon</label>
                      <input 
                        type="text" 
                        value={formData.icon || ''}
                        onChange={e => setFormData({ ...formData, icon: e.target.value })}
                        className="w-full p-4 bg-app-input border border-app-border rounded-2xl text-app-text"
                        placeholder="e.g. 🏠 or HeroIcon"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Font Size</label>
                        <input 
                          type="text" 
                          value={formData.styles?.fontSize || ''}
                          onChange={e => setFormData({ ...formData, styles: { ...formData.styles, fontSize: e.target.value } })}
                          className="w-full p-4 bg-app-input border border-app-border rounded-2xl text-app-text"
                          placeholder="e.g. 1.25rem"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Font Weight</label>
                        <select 
                          value={formData.styles?.fontWeight || '400'}
                          onChange={e => setFormData({ ...formData, styles: { ...formData.styles, fontWeight: e.target.value } })}
                          className="w-full p-4 bg-app-input border border-app-border rounded-2xl text-app-text font-bold"
                        >
                          <option value="300">Light</option>
                          <option value="400">Regular</option>
                          <option value="600">Semi-Bold</option>
                          <option value="800">Extra-Bold</option>
                          <option value="900">Black</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowCmsVisualModal(false)}
                  className="flex-1 py-4 bg-app-card border border-app-border text-app-text rounded-2xl font-bold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSaveCmsVisual}
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSaving ? 'Synchronizing...' : 'Apply Visual Logic'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showConfirmModal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-app-card rounded-[3rem] p-10 space-y-8 shadow-2xl border border-app-border"
            >
              <div className="text-center space-y-4">
                <div className={cn(
                  "w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto",
                  showConfirmModal.type === 'danger' ? "bg-red-50 text-red-500" :
                  showConfirmModal.type === 'warning' ? "bg-amber-50 text-amber-500" :
                  "bg-blue-50 text-blue-500"
                )}>
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">{showConfirmModal.title}</h3>
                <p className="text-neutral-500 text-sm">{showConfirmModal.message}</p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={showConfirmModal.onConfirm}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold text-sm transition-all",
                    showConfirmModal.type === 'danger' ? "bg-red-600 text-white hover:bg-red-700" :
                    showConfirmModal.type === 'warning' ? "bg-amber-500 text-white hover:bg-amber-600" :
                    "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  )}
                >
                  Confirm Action
                </button>
                <button 
                  onClick={() => setShowConfirmModal(prev => ({ ...prev, show: false }))}
                  className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-bold rounded-2xl text-sm hover:text-neutral-900 dark:hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[300]"
          >
            <div className={cn(
              "px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border",
              notification.type === 'success' ? "bg-emerald-500 border-emerald-400 text-white" : "bg-red-500 border-red-400 text-white"
            )}>
              {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              <span className="font-bold text-sm">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
