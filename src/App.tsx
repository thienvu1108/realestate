import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  browserLocalPersistence,
  User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  where,
  or,
  serverTimestamp,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  increment,
  arrayUnion,
  limit,
  getDocs
} from './firestore-proxy';
import { auth, db, testConnection } from './firebase';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Popover, 
  PopoverContent, 
  PopoverDescription, 
  PopoverHeader, 
  PopoverTitle, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Tooltip as UITooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  LogIn, LogOut, Plus, Search, Trash2, Edit2, 
  FileBox, BarChart3, Users, Settings, Filter, Download, 
  Upload, CheckCircle2, XCircle, AlertCircle, RefreshCw, 
  ChevronLeft, ChevronRight, Calendar, User as UserIcon, LayoutDashboard, 
  ArrowUpRight, ArrowDownRight, PieChart, TrendingUp, History, 
  FileText, Check, MoreHorizontal, FileDown, Eye, Send, MessageSquare, Info, ShieldCheck, UserCheck, ChevronDown, ChevronDown as ChevronDownIcon,
  ChevronUp, ChevronUp as ChevronUpIcon,
  ExternalLink,
  LockKeyhole,
  Save,
  Undo,
  X,
  Menu,
  ArrowUpDown, ArrowUp, ArrowDown,
  AlertTriangle,
  UserCircle,
  Map as MapIcon,
  Layers,
  Database,
  FileUp,
  FileSpreadsheet,
  Link,
  FileWarning,
  Copy,
  ArrowRight,
  Clock,
  Target,
  GitMerge,
  CheckSquare,
  BadgeDollarSign,
  PlusCircle,
  MinusCircle,
  BadgeCheck,
  MessageCircle,
  ShieldAlert,
  Wallet,
  Coins,
  Building2,
  FileCheck,
  Trash,
  Sliders,
  Sparkles,
  Bell,
  BellRing,
  CheckCheck,
  RotateCcw,
  FolderKanban,
  Loader2,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { MktProcessManager } from './components/MktProcessManager';
import { DoiUngProcessManager } from './components/DoiUngProcessManager';
import { MktEfficiencyManager } from './components/MktEfficiencyManager';
import { AcceptanceManager } from './components/AcceptanceManager';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart as RePieChart, Pie,
  LineChart, Line, ComposedChart, Tooltip as ChartTooltip
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, getWeek } from 'date-fns';
import { vi } from 'date-fns/locale';

// Component Input cÃ³ debounce Ä‘á»ƒ trÃ¡nh re-render toÃ n bá»™ app khi gÃµ phÃ­m
const DebouncedInput = memo(({ 
  value: initialValue, 
  onChange, 
  debounce = 300, 
  ...props 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  debounce?: number; 
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) => {
  const [value, setValue] = useState(initialValue ?? '');

  useEffect(() => {
    setValue(initialValue ?? '');
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, onChange]);

  return (
    <Input 
      {...props} 
      value={value ?? ''} 
      onChange={e => setValue(e.target.value)} 
    />
  );
});

// Optimized searchable components for reports to prevent whole-app re-renders on every keystroke
const SearchableSelectGeneric = memo(({ 
  value, 
  onValueChange, 
  items = [], 
  placeholder, 
  searchPlaceholder = "TÃ¬m kiáº¿m...",
  noResultsText = "KhÃ´ng tÃ¬m tháº¥y káº¿t quáº£",
  emptyMessage,
  triggerClassName,
  triggerDisplay,
  selectContentClassName,
  renderItem
}: any) => {
  const [search, setSearch] = useState('');

  const normalizedItems = useMemo(() => {
    return (items || []).map((item: any) => {
      const val = item.value !== undefined ? String(item.value) : (item.id !== undefined ? String(item.id) : '');
      const lbl = item.label !== undefined ? String(item.label) : (item.name !== undefined ? String(item.name) : (item.title !== undefined ? String(item.title) : val));
      const searchStr = item.searchString !== undefined 
        ? String(item.searchString).toLowerCase()
        : `${lbl} ${item.code || item.teamCode || item.projectCode || ''} ${val}`.toLowerCase();
      return {
        ...item,
        value: val,
        label: lbl,
        searchString: searchStr
      };
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    if (!q) return normalizedItems;
    return normalizedItems.filter((item: any) => 
      (item.searchString || '').includes(q)
    );
  }, [normalizedItems, search]);

  const resolvedDisplay = triggerDisplay || normalizedItems.find((i: any) => i.value === String(value ?? ''))?.label || undefined;
  const resolvedNoResults = emptyMessage || noResultsText;

  return (
    <Select value={value !== undefined && value !== null ? String(value) : ''} onValueChange={onValueChange}>
      <SelectTrigger className={`w-full overflow-hidden flex items-center justify-between ${triggerClassName}`}>
        <SelectValue placeholder={placeholder}>
          <span className="truncate block text-left flex-1">{resolvedDisplay || placeholder}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={selectContentClassName}>
        <div className="p-2 sticky top-0 bg-popover z-10 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <DebouncedInput
              placeholder={searchPlaceholder}
              className="pl-8 h-9"
              value={search}
              onChange={setSearch}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        {filteredItems.map((item: any) => renderItem ? renderItem(item) : (
          <SelectItem key={item.value} value={item.value}>
            <span className="truncate">{item.label}</span>
          </SelectItem>
        ))}
        {filteredItems.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">{resolvedNoResults}</div>
        )}
      </SelectContent>
    </Select>
  );
});

const SearchableRegionSelect = memo(({ value, onValueChange, regions = [] }: any) => {
  const items = useMemo(() => {
    const list = [{ value: 'all', label: 'Táº¥t cáº£ miá»n', searchString: 'táº¥t cáº£ miá»n all' }];
    regions.forEach((r: string) => {
      list.push({ value: r, label: r, searchString: r.toLowerCase() });
    });
    return list;
  }, [regions]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Táº¥t cáº£ miá»n"
      searchPlaceholder="TÃ¬m miá»n..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ miá»n" : value}
    />
  );
});

const SearchableTypeSelect = memo(({ value, onValueChange, types = [] }: any) => {
  const items = useMemo(() => {
    const list = [{ value: 'all', label: 'Táº¥t cáº£ loáº¡i hÃ¬nh', searchString: 'táº¥t cáº£ loáº¡i hÃ¬nh all' }];
    types.forEach((t: string) => {
      list.push({ value: t, label: t, searchString: t.toLowerCase() });
    });
    return list;
  }, [types]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Táº¥t cáº£ loáº¡i hÃ¬nh"
      searchPlaceholder="TÃ¬m loáº¡i hÃ¬nh..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ loáº¡i hÃ¬nh" : value}
    />
  );
});

const SearchableProjectSelect = memo(({ value, onValueChange, projects = [], projectMap = {} }: any) => {
  const items = useMemo(() => {
    const list = projects.map((p: any) => ({
      value: p.id,
      label: `${p.name} (${p.projectCode})`,
      searchString: `${p.name} ${p.projectCode || ''}`
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c dá»± Ã¡n', searchString: 'tat ca cÃ¡c du an all' }, ...list];
  }, [projects]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Táº¥t cáº£ dá»± Ã¡n"
      searchPlaceholder="TÃ¬m dá»± Ã¡n..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c dá»± Ã¡n" : (projectMap[value] || projects.find((p: any) => p.id === value)?.name || value) + ` (${projects.find((p: any) => p.id === value)?.projectCode || ''})`}
    />
  );
});

const SearchableTeamSelect = memo(({ value, onValueChange, teams = [], uniqueTeams = [] }: any) => {
  const items = useMemo(() => {
    const list = uniqueTeams.map((t: string) => ({
      value: t,
      label: `${t} (${teams.find((team: any) => team.name === t)?.teamCode || ''})`,
      searchString: t
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c Ä‘á»™i', searchString: 'tat ca cÃ¡c doi team all' }, ...list];
  }, [uniqueTeams, teams]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Táº¥t cáº£ Ä‘á»™i"
      searchPlaceholder="TÃ¬m team..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c Ä‘á»™i" : `${value} (${teams.find((t: any) => t.name === value)?.teamCode || ''})`}
    />
  );
});

const SearchableUserTeamSelect = memo(({ value, onValueChange, teams = [] }: any) => {
  const items = useMemo(() => {
    const list = teams.map((t: any) => ({
      value: t.name,
      label: `${t.name} (${t.teamCode || ''})`,
      searchString: `${t.name} ${t.teamCode || ''}`.toLowerCase()
    }));
    
    if (value && value !== 'no_team' && !teams.some((t: any) => t.name === value)) {
      list.push({
        value,
        label: value,
        searchString: value.toLowerCase()
      });
    }

    return [
      { value: 'no_team', label: '-- ChÆ°a gÃ¡n --', searchString: 'chua gan no team empty' },
      ...list
    ];
  }, [teams, value]);

  const displayVal = value && value !== 'no_team' ? value : '-- ChÆ°a gÃ¡n --';

  return (
    <SearchableSelectGeneric
      value={value || 'no_team'}
      onValueChange={(val: string) => onValueChange(val === 'no_team' ? '' : val)}
      items={items}
      placeholder="-- Chá»n team --"
      searchPlaceholder="TÃ¬m team..."
      triggerClassName="w-[160px] h-8 text-xs font-semibold"
      triggerDisplay={displayVal}
    />
  );
});

const SearchableBlockDirectorSelect = memo(({ value, onValueChange, allUsers = [], emptyValue = "", emptyLabel = "-- ChÆ°a gÃ¡n / Chá»n sau --" }: any) => {
  const items = useMemo(() => {
    const list = (allUsers || []).map((u: any) => {
      const uValue = u.uid || u.id;
      const displayName = u.displayName || u.fullName || u.email || "";
      const email = u.email || "";
      return {
        value: uValue,
        label: `${displayName} (${email})`,
        searchString: `${displayName} ${email}`.toLowerCase()
      };
    });
    return [{ value: emptyValue, label: emptyLabel, searchString: emptyLabel.toLowerCase() }, ...list];
  }, [allUsers, emptyValue, emptyLabel]);

  const selectedUser = allUsers.find((u: any) => (u.uid || u.id) === value);
  const displayLabel = value === emptyValue || !value
    ? emptyLabel
    : selectedUser 
      ? `${selectedUser.displayName || selectedUser.fullName || selectedUser.email} (${selectedUser.email || ''})`
      : value;

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chá»n tÃ i khoáº£n..."
      searchPlaceholder="TÃ¬m tÃ i khoáº£n vÃ  email..."
      triggerClassName="w-full bg-slate-50 border-slate-200 rounded-xl h-9 text-xs text-slate-700"
      triggerDisplay={displayLabel}
    />
  );
});

const SearchableBlockAssistantsSelect = memo(({ values = [], onValuesChange, allUsers = [] }: any) => {
  const [search, setSearch] = useState('');
  const filteredUsers = useMemo(() => {
    const s = search.toLowerCase().trim();
    return (allUsers || []).filter((u: any) => {
      const name = (u.displayName || u.fullName || u.email || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(s) || email.includes(s);
    });
  }, [allUsers, search]);

  const handleToggle = (uid: string) => {
    if (values.includes(uid)) {
      onValuesChange(values.filter((v: string) => v !== uid));
    } else {
      onValuesChange([...values, uid]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[38px]">
        {values.length === 0 ? (
          <span className="text-xs text-slate-400 italic">ChÆ°a cÃ³ trá»£ lÃ½ nÃ o Ä‘Æ°á»£c gÃ¡n cho khá»‘i</span>
        ) : (
          values.map((uid: string) => {
            const u = (allUsers || []).find((usr: any) => (usr.uid || usr.id) === uid);
            const label = u ? (u.fullName || u.displayName || u.email) : uid;
            return (
              <Badge key={uid} variant="secondary" className="text-xs gap-1 bg-violet-100 text-violet-800 border-violet-200 py-0.5 px-2">
                <span className="truncate max-w-[180px]">{label}</span>
                <button
                  type="button"
                  onClick={() => handleToggle(uid)}
                  className="hover:bg-violet-200 text-violet-600 hover:text-violet-900 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })
        )}
      </div>
      <div className="border border-slate-200 rounded-xl bg-white p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input 
            placeholder="TÃ¬m tÃ i khoáº£n hoáº·c email trá»£ lÃ½ khá»‘i..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-8 h-8 text-xs rounded-lg"
            onKeyDown={e => e.stopPropagation()}
          />
        </div>
        <div className="max-h-36 overflow-y-auto space-y-1">
          {filteredUsers.map((u: any) => {
            const uid = u.uid || u.id;
            const isSelected = values.includes(uid);
            return (
              <div 
                key={uid}
                onClick={() => handleToggle(uid)}
                className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isSelected ? 'bg-violet-50 text-violet-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="truncate flex-1 pr-2">
                  <span className="font-medium">{u.displayName || u.fullName || u.email}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">({u.email})</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={() => {}} 
                  className="rounded text-violet-600 focus:ring-violet-500 pointer-events-none h-3.5 w-3.5"
                />
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <div className="text-center py-2 text-xs text-slate-400">KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n phÃ¹ há»£p</div>
          )}
        </div>
      </div>
    </div>
  );
});

const SearchableEfficiencyProjectSelect = memo(({ value, onValueChange, projects = [], projectMap = {} }: any) => {
  const items = useMemo(() => {
    const list = projects.map((p: any) => ({
      value: p.id,
      label: p.name,
      searchString: `${p.name} ${p.projectCode || ''}`
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c dá»± Ã¡n', searchString: 'tat ca cÃ¡c du an all' }, ...list];
  }, [projects]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chá»n dá»± Ã¡n..."
      searchPlaceholder="TÃ¬m dá»± Ã¡n..."
      triggerClassName="bg-slate-50 border-none h-11 rounded-xl"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c dá»± Ã¡n" : (value ? (projectMap[value] || projects.find((p: any) => p.id === value)?.name || value) + ` (${projects.find((p: any) => p.id === value)?.projectCode || ''})` : "Chá»n dá»± Ã¡n...")}
      renderItem={(item: any) => (
        <SelectItem key={item.value} value={item.value}>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{item.label}</span>
          </div>
        </SelectItem>
      )}
    />
  );
});

const SearchableEfficiencyTeamSelect = memo(({ value, onValueChange, teams = [], teamMap = {} }: any) => {
  const items = useMemo(() => {
    const list = teams.map((t: any) => ({
      value: t.id,
      label: `${t.name} (${t.teamCode || 'N/A'})`,
      searchString: `${t.name} ${t.teamCode || ''}`
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c Ä‘á»™i', searchString: 'tat ca cÃ¡c doi team all' }, ...list];
  }, [teams]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chá»n team..."
      searchPlaceholder="TÃ¬m team..."
      triggerClassName="bg-slate-50 border-none h-11 rounded-xl"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c Ä‘á»™i" : (value ? `${teamMap[value] || value} (${teams.find((t: any) => t.id === value)?.teamCode || ''})` : "Chá»n team...")}
      renderItem={(item: any) => (
        <SelectItem key={item.value} value={item.value}>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{item.label}</span>
          </div>
        </SelectItem>
      )}
    />
  );
});

const SearchableAcceptanceTeamSelect = memo(({ value, onValueChange, teams = [], teamMap = {} }: any) => {
  const items = useMemo(() => {
    const list = teams.map((t: any) => ({
      value: t.id,
      label: `${t.name} (${t.teamCode || 'N/A'})`,
      searchString: `${t.name} ${t.teamCode || ''}`
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c Ä‘á»™i', searchString: 'tat ca cÃ¡c doi team all' }, ...list];
  }, [teams]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chá»n Ä‘á»™i..."
      searchPlaceholder="TÃ¬m Ä‘á»™i..."
      triggerClassName="h-11 bg-slate-50 border-none rounded-xl font-bold"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c Ä‘á»™i" : (value ? `${teamMap[value] || value} (${teams.find((t: any) => t.id === value)?.teamCode || ''})` : "Chá»n Ä‘á»™i...")}
    />
  );
});


const SearchableAcceptanceProjectMultiSelect = memo(({ values = [], onValuesChange, projects = [], projectMap = {}, isEditing }: any) => {
  const [search, setSearch] = useState('');
  
  const items = useMemo(() => {
    return projects.map((p: any) => ({
      value: p.id,
      label: p.name,
      projectCode: p.projectCode || '',
      searchString: `${p.name} ${p.projectCode || ''}`.toLowerCase()
    }));
  }, [projects]);

  const filteredItems = useMemo(() => {
    return items.filter((item: any) => 
      item.searchString.includes(search.toLowerCase())
    );
  }, [items, search]);

  const toggleValue = (val: string) => {
    if (isEditing) {
      onValuesChange([val]);
      return;
    }
    
    if (values.includes(val)) {
      onValuesChange(values.filter((v: string) => v !== val));
    } else {
      onValuesChange([...values, val]);
    }
  };

  const getDisplay = () => {
    if (values.length === 0) return "Chá»n dá»± Ã¡n...";
    if (values.length <= 3) {
      return values.map((v: string) => {
        const name = projectMap[v] || projects.find((p: any) => p.id === v)?.name || v;
        const code = projects.find((p: any) => p.id === v)?.projectCode;
        return code ? `${name} (${code})` : name;
      }).join(', ');
    }
    return `ÄÃ£ chá»n ${values.length} dá»± Ã¡n`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full h-11 bg-slate-50 border-none rounded-xl font-bold flex items-center justify-between px-4 hover:bg-slate-100 transition-all shadow-none"
        >
          <span className="truncate">{getDisplay()}</span>
          <ChevronDownIcon className="w-4 h-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden" align="start">
        <div className="p-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="TÃ¬m dá»± Ã¡n..." 
              className="pl-10 h-10 bg-slate-50 border-none rounded-xl text-xs font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
          {filteredItems.map((item: any) => (
            <div 
              key={item.value}
              className="flex items-center gap-3 p-2 hover:bg-indigo-50/50 rounded-xl cursor-pointer group transition-colors"
              onClick={() => toggleValue(item.value)}
            >
              <Checkbox 
                checked={values.includes(item.value)} 
                onCheckedChange={() => toggleValue(item.value)}
                className="rounded-md border-slate-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
              />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">{item.label}</p>
                <p className="text-[10px] font-medium text-slate-400">{item.projectCode}</p>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs font-medium italic">KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n</div>
          )}
        </div>
        {!isEditing && values.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-indigo-600 uppercase">ÄÃ£ chá»n {values.length}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50"
              onClick={() => onValuesChange([])}
            >
              Bá» chá»n táº¥t cáº£
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});

const SearchableAcceptanceProjectSelect = memo(({ value, onValueChange, projects = [], projectMap = {} }: any) => {
  const items = useMemo(() => {
    const list = projects.map((p: any) => ({
      value: p.id,
      label: p.name,
      searchString: `${p.name} ${p.projectCode || ''}`
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c dá»± Ã¡n', searchString: 'tat ca cÃ¡c du an all' }, ...list];
  }, [projects]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chá»n dá»± Ã¡n..."
      searchPlaceholder="TÃ¬m dá»± Ã¡n..."
      triggerClassName="h-11 bg-slate-50 border-none rounded-xl font-bold"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c dá»± Ã¡n" : (value ? (projectMap[value] || projects.find((p: any) => p.id === value)?.name || value) + ` (${projects.find((p: any) => p.id === value)?.projectCode || ''})` : "Chá»n dá»± Ã¡n...")}
    />
  );
});
// Error handling for Firestore
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  const errorJson = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorJson);
  
  if (errInfo.error.includes('insufficient permissions') || errInfo.error.includes('offline')) {
    toast.error(`Lá»—i káº¿t ná»‘i hoáº·c phÃ¢n quyá»n Firestore: ${errInfo.error}`);
    throw new Error(errorJson);
  } else {
    toast.error(`Lá»—i Firestore: ${errInfo.error}`);
  }
}

const normalizeMonth = (val: any): string => {
  if (!val) return '';
  if (val instanceof Date) {
    const d = new Date(val.getTime() + 12 * 60 * 60 * 1000);
    return format(d, 'yyyy-MM');
  }
  const str = String(val).trim().normalize('NFC').replace(/^\uFEFF/, '');
  const parts = str.split(/[-/.]/);
  if (parts.length === 2) {
    let year = '';
    let month = '';
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, '0');
    } else {
      month = parts[0].padStart(2, '0');
      year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
    }
    if (year.length === 4 && (parseInt(month) >= 1 && parseInt(month) <= 12)) return `${year}-${month}`;
  }
  return str;
};

const getMarketingMonth = (date: Date | any) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  if (day >= 21) {
    d.setMonth(d.getMonth() + 1);
  }
  return format(d, 'yyyy-MM');
};

const parseTimestampToDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate();
    } catch (e) {}
  }
  if (typeof val === 'object') {
    const seconds = val.seconds ?? val._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000 + Math.floor((val.nanoseconds ?? val._nanoseconds ?? 0) / 1000000));
    }
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {}
  return null;
};

const safeFormat = (date: any, formatStr: string) => {
  const d = parseTimestampToDate(date);
  if (!d) return '';
  try {
    return format(d, formatStr);
  } catch (e) {
    return '';
  }
};

const formatYAxis = (value: number) => {
  return value.toLocaleString('vi-VN');
};

const parseVal = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleanVal = String(val).replace(/[.,]/g, '');
  const num = Number(cleanVal);
  return isNaN(num) ? 0 : num;
};

const extractEmail = (text: string): string | null => {
  if (!text) return null;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0].toLowerCase().trim() : null;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const normalizeTeamCode = (code: any): string => {
  if (code === undefined || code === null) return '';
  let str = String(code).trim();
  // 1. Convert MH to MAY and normalize space/hyphen separators (e.g., MH 02.08 -> MAY02.08, MH-36.01 -> MAY36.01)
  str = str
    .replace(/\bMH([0-9.]+)/gi, 'MAY$1')
    .replace(/\bMH[-_\s]+([0-9.]+)/gi, 'MAY$1')
    .replace(/\bMH\b/gi, 'MAY');

  // 2. Ensure MAY prefix is uppercase and normalize any spaces/hyphens after MAY (e.g. MAY 02.08 -> MAY02.08)
  str = str.replace(/\bMAY[-_\s]+([0-9.]+)/gi, 'MAY$1');
  str = str.replace(/\bmay/gi, 'MAY');

  // 3. Format MAY codes with single digit after dot: MAY36.1 -> MAY36.01, MAY02.8 -> MAY02.08
  str = str.replace(/\bMAY(\d+)\.(\d)(?!\d)/gi, (_, g1, g2) => `MAY${g1}.0${g2}`);

  return str;
};

export const normalizeTeamName = (name: any): string => {
  if (name === undefined || name === null) return '';
  let str = String(name);
  // 1. Convert MH to MAY and normalize space/hyphen separators (e.g., MH 02.08 -> MAY02.08, MH-36.01 -> MAY36.01)
  str = str
    .replace(/\bMH([0-9.]+)/gi, 'MAY$1')
    .replace(/\bMH[-_\s]+([0-9.]+)/gi, 'MAY$1')
    .replace(/\bMH\b/gi, 'MAY');

  // 2. Normalize spaces/hyphens after MAY inside name: "MAY - 36.01" -> "MAY36.01", "MAY 02.08" -> "MAY02.08"
  str = str.replace(/\bMAY[-_\s]+([0-9.]+)/gi, 'MAY$1');

  // 3. Format MAY codes with single digit after dot inside name: MAY36.1 -> MAY36.01, MAY02.8 -> MAY02.08
  str = str.replace(/\bMAY(\d+)\.(\d)(?!\d)/gi, (_, g1, g2) => `MAY${g1}.0${g2}`);

  return str;
};

export const convertMhToMay = (val: any): string => {
  return normalizeTeamName(val);
};

const extractTeamCode = (name: string) => {
  if (!name) return '';
  const normalized = normalizeTeamName(name);
  const match = normalized.match(/(?:MAY|MH|[A-Z]+)[0-9.]+/i);
  if (match) {
    let code = match[0].toUpperCase().replace(/\.+$/, '');
    return normalizeTeamCode(code);
  }
  return '';
};

const isTeamInBlock = (t: any, block: any, allTeams?: any[]) => {
  if (!block || !t) return false;
  let teamObj = t;
  if (typeof t === 'string') {
    if (allTeams && allTeams.length > 0) {
      teamObj = allTeams.find(item => item.id === t || item.name === t || item.teamCode === t) || { name: t };
    } else {
      teamObj = { name: t };
    }
  }
  if (teamObj.blockId === block.id || teamObj.blockCode === block.blockCode) return true;
  if (teamObj.blockId === 'unassigned' || teamObj.blockCode === 'unassigned' || teamObj.blockId === 'none' || teamObj.blockCode === 'none') return false;
  if (teamObj.blockId && teamObj.blockId !== block.id) return false;
  if (teamObj.blockCode && teamObj.blockCode !== block.blockCode) return false;
  
  let prefix = (block.teamPrefix || '').toUpperCase().trim();
  if (prefix === 'MH') prefix = 'MAY';
  if (!prefix) return false;
  const code = teamObj.teamCode || extractTeamCode(teamObj.name || '');
  return code.toUpperCase().trim().startsWith(prefix);
};

const extractGDKD = (name: string) => {
  if (!name) return '';
  const teamCode = extractTeamCode(name);
  if (teamCode) {
    const idx = name.toLowerCase().indexOf(teamCode.toLowerCase());
    if (idx !== -1) {
      let rest = name.substring(idx + teamCode.length);
      rest = rest.replace(/^[\s.\-_/]+/, '').trim();
      if (rest) return rest;
    }
  }
  const codeRegex = /^[A-Z0-9.-]+\s+/i;
  const codeMatch = name.match(codeRegex);
  if (codeMatch) {
    return name.substring(codeMatch[0].length).trim();
  }
  return name;
};

const extractProjectCode = (name: string) => {
  // Look for uppercase blocks DA-xxx or just capitalized acronyms
  const match = name.match(/[A-Z0-9-]{3,}/);
  return match ? match[0].toUpperCase() : '';
};

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    'home.view', 'home.export',
    'admin.projects.view', 'admin.projects.edit', 'admin.projects.import',
    'admin.teams.view', 'admin.teams.edit',
    'admin.budgets.view', 'admin.budgets.edit',
    'admin.costs.view', 'admin.costs.edit',
    'admin.efficiency.edit',
    'admin.users.view', 'admin.users.edit',
    'admin.backup.view', 'admin.permissions.edit',
    'block.view', 'block.approve',
    'team_mgmt.view', 'team_mgmt.approve',
    'register.view', 'register.create', 'register.edit', 'register.import',
    'actual.view', 'actual.create', 'actual.edit', 'actual.import',
    'history.view', 'history.export',
    'report_nt.view', 'report_nt.sync',
    'support.create', 'support.resolve',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  admin: [
    'home.view', 'home.export',
    'admin.projects.view', 'admin.projects.edit', 'admin.projects.import',
    'admin.teams.view', 'admin.teams.edit',
    'admin.budgets.view', 'admin.budgets.edit',
    'admin.costs.view', 'admin.costs.edit',
    'admin.efficiency.edit',
    'admin.users.view', 'admin.users.edit',
    'admin.backup.view', 'admin.permissions.edit',
    'block.view', 'block.approve',
    'team_mgmt.view', 'team_mgmt.approve',
    'register.view', 'register.create', 'register.edit', 'register.import',
    'actual.view', 'actual.create', 'actual.edit', 'actual.import',
    'history.view', 'history.export',
    'report_nt.view', 'report_nt.sync',
    'support.create', 'support.resolve',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  mod: [
    'home.view',
    'admin.projects.view', 'admin.teams.view',
    'admin.budgets.view', 'admin.costs.view',
    'block.view',
    'team_mgmt.view',
    'register.view', 'register.create', 'register.edit',
    'actual.view', 'actual.create', 'actual.edit',
    'history.view',
    'report_nt.view',
    'support.create', 'support.resolve',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  accountant: [
    'home.view', 'home.export',
    'admin.projects.view', 'admin.projects.edit',
    'admin.teams.view',
    'admin.budgets.view', 'admin.budgets.edit',
    'admin.costs.view', 'admin.costs.edit',
    'block.view',
    'team_mgmt.view',
    'register.view',
    'actual.view',
    'history.view', 'history.export',
    'report_nt.view',
    'support.create',
    'process_mkt.create',
    'process_doiung.create',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  gdda: [
    'home.view',
    'admin.projects.view',
    'block.view',
    'team_mgmt.view',
    'register.view', 'register.create', 'register.edit',
    'actual.view', 'actual.create', 'actual.edit',
    'history.view',
    'report_nt.view',
    'support.create',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  gd_khoi: [
    'home.view',
    'block.view', 'block.approve',
    'team_mgmt.view',
    'register.view',
    'actual.view',
    'history.view',
    'report_nt.view',
    'support.create',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  tro_ly_khoi: [
    'home.view',
    'block.view', 'block.approve',
    'team_mgmt.view',
    'register.view',
    'actual.view',
    'history.view',
    'report_nt.view',
    'support.create',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  gdkd: [
    'home.view',
    'block.view',
    'team_mgmt.view', 'team_mgmt.approve',
    'register.view',
    'actual.view',
    'history.view',
    'report_nt.view',
    'support.create',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  assistant: [
    'home.view', 'home.export',
    'block.view',
    'team_mgmt.view',
    'register.view', 'register.create', 'register.edit',
    'actual.view', 'actual.create', 'actual.edit',
    'history.view', 'history.export',
    'report_nt.view',
    'support.create',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  user: [
    'home.view',
    'block.view',
    'team_mgmt.view',
    'register.view', 'register.create', 'register.edit',
    'actual.view', 'actual.create', 'actual.edit',
    'history.view',
    'report_nt.view',
    'support.create',
    'process_mkt.create',
    'process_doiung.create'
  ]
};

export const ROLE_NAMES: Record<string, string> = {
  super_admin: "Super Admin (Quáº£n trá»‹ cao cáº¥p)",
  admin: "Admin (Quáº£n trá»‹ viÃªn)",
  mod: "Mod (Äiá»u phá»‘i viÃªn)",
  accountant: "Accountant (Káº¿ toÃ¡n)",
  gdda: "GDDA (GiÃ¡m Ä‘á»‘c Dá»± Ã¡n)",
  gd_khoi: "GÄ Khá»‘i (GiÃ¡m Ä‘á»‘c Khá»‘i)",
  tro_ly_khoi: "Trá»£ lÃ½ Khá»‘i (Trá»£ lÃ½ GiÃ¡m Ä‘á»‘c Khá»‘i)",
  gdkd: "GÄKD (GiÃ¡m Ä‘á»‘c Kinh doanh)",
  assistant: "Trá»£ lÃ½ (Trá»£ lÃ½ Ban GiÃ¡m Ä‘á»‘c)",
  user: "User (NgÆ°á»i dÃ¹ng thÆ°á»ng)"
};

export const PERMISSION_GROUPS = [
  {
    category: 'Trang chá»§ (Dashboard & BÃ¡o cÃ¡o tá»•ng thá»ƒ)',
    items: [
      { key: 'home.view', label: 'Xem Trang chá»§', desc: 'CÃ³ quyá»n truy cáº­p tab Trang chá»§, xem biá»ƒu Ä‘á»“, doanh sá»‘, chi phÃ­ tá»•ng quan.' },
      { key: 'home.export', label: 'Táº£i bÃ¡o cÃ¡o tá»•ng há»£p', desc: 'Táº£i bÃ¡o cÃ¡o Excel tÃ­ch lÅ©y vÃ  hiá»‡u quáº£ tá»•ng há»£p.' }
    ]
  },
  {
    category: 'Quáº£n trá»‹ há»‡ thá»‘ng (Admin Panel)',
    items: [
      { key: 'admin.projects.view', label: 'Xem danh sÃ¡ch Dá»± Ã¡n', desc: 'Xem danh sÃ¡ch cÃ¡c dá»± Ã¡n trong há»‡ thá»‘ng.' },
      { key: 'admin.projects.edit', label: 'Quáº£n lÃ½ Dá»± Ã¡n (ThÃªm/Sá»­a/XÃ³a/GÃ¡n)', desc: 'ThÃªm dá»± Ã¡n má»›i, sá»­a thÃ´ng tin, xÃ³a dá»± Ã¡n, gÃ¡n loáº¡i hÃ¬nh/vÃ¹ng miá»n.' },
      { key: 'admin.projects.import', label: 'Nháº­p dá»¯ liá»‡u dá»± Ã¡n', desc: 'Nháº­p danh má»¥c dá»± Ã¡n hÃ ng loáº¡t tá»« file Excel.' },
      { key: 'admin.teams.view', label: 'Xem danh sÃ¡ch Team/Äá»™i', desc: 'Xem danh sÃ¡ch cÃ¡c phÃ²ng ban/tá»• Ä‘á»™i.' },
      { key: 'admin.teams.edit', label: 'Quáº£n lÃ½ Team/Äá»™i (ThÃªm/Sá»­a/XÃ³a)', desc: 'ThÃªm team, cáº­p nháº­t mÃ£ team, phÃ¢n bá»• tá»• Ä‘á»™i.' },
      { key: 'admin.budgets.view', label: 'Xem duyá»‡t Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch', desc: 'Xem danh sÃ¡ch toÃ n bá»™ cÃ¡c Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch cá»§a há»‡ thá»‘ng.' },
      { key: 'admin.budgets.edit', label: 'Pháº§n bá»• & Duyá»‡t NgÃ¢n sÃ¡ch', desc: 'Duyá»‡t/XÃ¡c Ä‘á»‹nh ngÃ¢n sÃ¡ch, chá»‰nh sá»­a, gÃ¡n ngÆ°á»i xá»­ lÃ½.' },
      { key: 'admin.costs.view', label: 'Xem duyá»‡t chi phÃ­ thá»±c táº¿', desc: 'Xem danh sÃ¡ch toÃ n bá»™ chi phÃ­ thá»±c chi thá»±c táº¿.' },
      { key: 'admin.costs.edit', label: 'Duyá»‡t & Quáº£n lÃ½ Chi phÃ­ thá»±c táº¿', desc: 'Chá»‰nh sá»­a, xÃ³a, duyá»‡t sá»‘ liá»‡u chi phÃ­ thá»±c táº¿ cáº¥p há»‡ thá»‘ng.' },
      { key: 'admin.efficiency.edit', label: 'Cáº­p nháº­t hiá»‡u quáº£ kinh doanh', desc: 'Nháº­p/Sá»­a sá»‘ cÄƒn bÃ¡n má»›i, doanh sá»‘ bÃ¡n láº» Ä‘á»ƒ tÃ­nh ROI.' },
      { key: 'admin.users.view', label: 'Xem danh sÃ¡ch NgÆ°á»i dÃ¹ng', desc: 'Xem danh sÃ¡ch cÃ¡c tÃ i khoáº£n Ä‘Äƒng kÃ½ trong app.' },
      { key: 'admin.users.edit', label: 'PhÃ¢n quyá»n tÃ i khoáº£n & GÃ¡n dá»± Ã¡n', desc: 'Chá»‰nh sá»­a vai trÃ², gÃ¡n danh sÃ¡ch dá»± Ã¡n cho Mod.' },
      { key: 'admin.backup.view', label: 'Quáº£n trá»‹ Sao lÆ°u & Phá»¥c há»“i', desc: 'Xem nháº­t kÃ½ thay Ä‘á»•i vÃ  quÃ©t/phá»¥c há»“i dá»¯ liá»‡u cÅ© bá»‹ xÃ³a.' },
      { key: 'admin.permissions.edit', label: 'Quáº£n lÃ½ phÃ¢n quyá»n vai trÃ²', desc: 'ÄÆ°á»£c phÃ©p tÃ¹y chá»‰nh danh má»¥c quyá»n nÃ y.' }
    ]
  },
  {
    category: 'Quáº£n lÃ½ Khá»‘i (Block management)',
    items: [
      { key: 'block.view', label: 'GiÃ¡m sÃ¡t chi phÃ­ Khá»‘i', desc: 'Xem sá»‘ liá»‡u phÃ¢n bá»•, thá»±c chi, cáº£nh bÃ¡o ngÃ¢n sÃ¡ch cá»§a Block.' },
      { key: 'block.approve', label: 'PhÃª duyá»‡t cáº¥p Khá»‘i', desc: 'Ghi Ã½ kiáº¿n phÃª duyá»‡t / Äá» xuáº¥t ngÃ¢n sÃ¡ch liÃªn phÃ²ng.' }
    ]
  },
  {
    category: 'Quáº£n lÃ½ PhÃ²ng KD (Team management)',
    items: [
      { key: 'team_mgmt.view', label: 'GiÃ¡m sÃ¡t hoáº¡t Ä‘á»™ng Äá»™i nhÃ³m', desc: 'Theo dÃµi Ä‘Äƒng kÃ½, tiáº¿n Ä‘á»™ cháº¡y chi phÃ­ cá»§a cÃ¡c team trá»±c thuá»™c.' },
      { key: 'team_mgmt.approve', label: 'Ã kiáº¿n Ä‘á» xuáº¥t cáº¥p PhÃ²ng KD', desc: 'Ghi nháº­n Ä‘á» xuáº¥t/Ã kiáº¿n Ä‘iá»u hÃ nh chung cáº¥p phÃ²ng.' }
    ]
  },
  {
    category: 'ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch',
    items: [
      { key: 'register.view', label: 'Xem danh sÃ¡ch Ä‘Äƒng kÃ½', desc: 'CÃ³ quyá»n xem danh má»¥c Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch cá»§a Ä‘á»™i hoáº·c báº£n thÃ¢n.' },
      { key: 'register.create', label: 'Táº¡o má»›i phiáº¿u Ä‘Äƒng kÃ½', desc: 'ÄÆ°á»£c phÃ©p láº­p káº¿ hoáº¡ch vÃ  submit ngÃ¢n sÃ¡ch thÃ¡ng má»›i.' },
      { key: 'register.edit', label: 'Chá»‰nh sá»­a/XÃ³a phiáº¿u Ä‘Äƒng kÃ½ cÃ¡ nhÃ¢n', desc: 'Sá»­a hoáº·c xÃ³a phiáº¿u Ä‘Äƒng kÃ½ khi á»Ÿ tráº¡ng thÃ¡i Chá» duyá»‡t.' },
      { key: 'register.import', label: 'Nháº­p Excel ngÃ¢n sÃ¡ch hÃ ng loáº¡t', desc: 'Nháº­p excel Ä‘Äƒng kÃ½ nhiá»u dÃ²ng Ä‘á»“ng thá»i.' }
    ]
  },
  {
    category: 'Ghi nháº­n chi phÃ­ thá»±c táº¿',
    items: [
      { key: 'actual.view', label: 'Xem thá»±c chi chiáº¿n dá»‹ch', desc: 'Xem danh sÃ¡ch thá»±c chi chiáº¿n chiáº¿n dá»‹ch quáº£ng cÃ¡o.' },
      { key: 'actual.create', label: 'Táº¡o má»›i phiáº¿u chi thá»±c táº¿', desc: 'Táº¡o phiáº¿u ghi nháº­n chi phÃ­ thá»±c táº¿ hÃ ng tuáº§n.' },
      { key: 'actual.edit', label: 'Sá»­a/XÃ³a phiáº¿u chi thá»±c táº¿ chÆ°a duyá»‡t', desc: 'Sá»­a hoáº·c xÃ³a phiáº¿u chi thá»±c táº¿ á»Ÿ tráº¡ng thÃ¡i chÆ°a Ä‘á»‘i soÃ¡t.' },
      { key: 'actual.import', label: 'Nháº­p Excel thá»±c táº¿ hÃ ng loáº¡t', desc: 'Nháº­p hÃ ng loáº¡t cÃ¡c dÃ²ng chi thá»±c táº¿ báº±ng file Excel.' }
    ]
  },
  {
    category: 'Lá»‹ch sá»­ dÃ²ng tiá»n (Transaction History)',
    items: [
      { key: 'history.view', label: 'Xem & Tra cá»©u dÃ²ng tiá»n', desc: 'Tra cá»©u thÃ´ng tin minh báº¡ch Ä‘á»‘i chiáº¿u cá»§a dá»± Ã¡n/Ä‘á»™i nhÃ³m.' },
      { key: 'history.export', label: 'Táº£i dÃ²ng tiá»n Excel', desc: 'Xuáº¥t dá»¯ liá»‡u lá»‹ch sá»­ Ä‘á»‘i chiáº¿u ra file Excel.' }
    ]
  },
  {
    category: 'BÃ¡o cÃ¡o Nghiá»‡m thu (NT Report)',
    items: [
      { key: 'report_nt.view', label: 'Xem BÃ¡o cÃ¡o Nghiá»‡m thu', desc: 'Xem bÃ¡o cÃ¡o nghiá»‡m thu tá»± Ä‘á»™ng káº¿t ná»‘i tá»« Google Sheet.' },
      { key: 'report_nt.sync', label: 'Äá»“ng bá»™ hÃ³a & Cáº­p nháº­t Sheet Link', desc: 'Äá»“ng bá»™ láº¡i dá»¯ liá»‡u nghiá»‡m thu, Ä‘á»•i link Google Sheets.' }
    ]
  },
  {
    category: 'Há»— trá»£ ká»¹ thuáº­t (Support Center)',
    items: [
      { key: 'support.create', label: 'Gá»­i yÃªu cáº§u há»— trá»£ má»›i', desc: 'Táº¡o ticket nhá» há»— trá»£ ká»¹ thuáº­t hoáº·c bÃ¡o lá»—i.' },
      { key: 'support.resolve', label: 'Xá»­ lÃ½ & ÄÃ³ng yÃªu cáº§u há»— trá»£', desc: 'Viáº¿t cÃ¢u tráº£ lá»i pháº£n há»“i, thay Ä‘á»•i tráº¡ng thÃ¡i ticket (DÃ nh cho Admin/Mod).' }
    ]
  },
  {
    category: 'Quy trÃ¬nh Marketing',
    items: [
      { key: 'process_mkt.create', label: 'Táº¡o quy trÃ¬nh Marketing', desc: 'Thiáº¿t láº­p quy trÃ¬nh chiáº¿n dá»‹ch vÃ  chuyá»ƒn giao tráº¡ng thÃ¡i.' },
      { key: 'process_mkt.approve', label: 'Duyá»‡t quy trÃ¬nh Marketing', desc: 'PhÃª duyá»‡t cÃ¡c bÆ°á»›c trong quy trÃ¬nh Marketing.' }
    ]
  },
  {
    category: 'Quy trÃ¬nh Ä‘á»‘i á»©ng bÃ n giao',
    items: [
      { key: 'process_doiung.create', label: 'Táº¡o quy trÃ¬nh Ä‘á»‘i á»©ng', desc: 'Khá»Ÿi táº¡o quy trÃ¬nh bÃ n giao nháº­n Ä‘á»‘i á»©ng.' },
      { key: 'process_doiung.approve', label: 'Duyá»‡t quy trÃ¬nh Ä‘á»‘i á»©ng', desc: 'PhÃª duyá»‡t quy trÃ¬nh Ä‘á»‘i á»©ng bÃ n giao.' }
    ]
  },
  {
    category: 'Hiá»‡u quáº£ Marketing (MKT Efficiency)',
    items: [
      { key: 'mkt_efficiency.view', label: 'Xem chi tiáº¿t Hiá»‡u quáº£ MKT', desc: 'Quyá»n xem tab Hiá»‡u quáº£ Marketing, cÃ¡c biá»ƒu Ä‘á»“, chi tiáº¿t chiáº¿n dá»‹ch vÃ  danh sÃ¡ch báº£n ghi.' },
      { key: 'mkt_efficiency.export', label: 'Xuáº¥t file Excel Hiá»‡u quáº£ MKT', desc: 'Quyá»n táº£i vá» cÃ¡c báº£n ghi vÃ  bÃ¡o cÃ¡o chiáº¿n dá»‹ch dÆ°á»›i dáº¡ng file Excel.' },
      { key: 'mkt_efficiency.filter', label: 'Lá»c danh sÃ¡ch Hiá»‡u quáº£ MKT', desc: 'Quyá»n sá»­ dá»¥ng tÃ¹y chá»n lá»c theo Dá»± Ã¡n, PhÃ²ng ban vÃ  ThÃ¡ng trong danh sÃ¡ch hiá»‡u quáº£.' }
    ]
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'mod' | 'accountant' | 'gdda' | 'gd_khoi' | 'gdkd' | 'assistant' | 'user' | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [rolePermissionsList, setRolePermissionsList] = useState<any[]>([]);
  const [selectedRolePermission, setSelectedRolePermission] = useState<string>('admin');
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const currentRolePermissions = useMemo(() => {
    const found = rolePermissionsList.find(rp => rp.role === selectedRolePermission);
    const roleKey = userRole || 'user';
    const activeSaved = rolePermissionsList.find(rp => rp.role === roleKey);
    if (activeSaved) {
      return activeSaved.permissions || [];
    }
    return DEFAULT_PERMISSIONS[roleKey] || [];
  }, [rolePermissionsList, userRole]);

  const hasPermission = useCallback((permKey: string) => {
    if (user?.email === 'thienvu1108@gmail.com' || userRole === 'super_admin') {
      return true;
    }
    return currentRolePermissions.includes(permKey);
  }, [currentRolePermissions, userRole, user?.email]);

  useEffect(() => {
    const found = rolePermissionsList.find(rp => rp.role === selectedRolePermission);
    if (found) {
      setEditedPermissions(found.permissions || []);
    } else {
      setEditedPermissions(DEFAULT_PERMISSIONS[selectedRolePermission] || []);
    }
  }, [selectedRolePermission, rolePermissionsList]);

  const hasUnsavedChanges = useMemo(() => {
    const saved = rolePermissionsList.find(rp => rp.role === selectedRolePermission)?.permissions || DEFAULT_PERMISSIONS[selectedRolePermission] || [];
    if (saved.length !== editedPermissions.length) return true;
    return [...saved].sort().join(',') !== [...editedPermissions].sort().join(',');
  }, [selectedRolePermission, rolePermissionsList, editedPermissions]);

  const handleSavePermissions = async () => {
    setIsSavingPermissions(true);
    try {
      const docId = selectedRolePermission;
      const docRef = doc(db, 'rolePermissions', docId);
      await setDoc(docRef, {
        role: selectedRolePermission,
        permissions: editedPermissions,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || 'admin'
      });
      await logAction('UPDATE', 'rolePermissions', docId, {
        role: selectedRolePermission,
        permissionsCount: editedPermissions.length
      });
      toast.success(`ÄÃ£ cáº­p nháº­t phÃ¢n quyá»n thÃ nh cÃ´ng cho vai trÃ² ${ROLE_NAMES[selectedRolePermission] || selectedRolePermission}`);
    } catch (error) {
      console.error("Save system permissions error:", error);
      toast.error("KhÃ´ng thá»ƒ lÆ°u phÃ¢n quyá»n: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSavingPermissions(false);
    }
  };
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [efficiencyReports, setEfficiencyReports] = useState<any[]>([]);
  const [acceptances, setAcceptances] = useState<any[]>([]);
  const [finalAcceptances, setFinalAcceptances] = useState<any[]>([]);
  const [docProcessingStatus, setDocProcessingStatus] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);

  // Pagination states for 20 items per page
  const [projectPage, setProjectPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [budgetPage, setBudgetPage] = useState(1);
  const [unbudgetedPage, setUnbudgetedPage] = useState(1);
  const [costPage, setCostPage] = useState(1);
  const [efficiencyPage, setEfficiencyPage] = useState(1);
  const [acceptancePage, setAcceptancePage] = useState(1);

  // Report states moved up
  const [userProfile, setUserProfile] = useState<{ fullName?: string, teamName?: string, role?: string, assignedProjects?: string[], assignedBlock?: string } | null>(null);
  const [budgetWarningThreshold, setBudgetWarningThreshold] = useState(80);
  const [budgetCriticalThreshold, setBudgetCriticalThreshold] = useState(100);

  const isAdmin = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return role === 'admin' || role === 'super_admin' || role === 'quáº£n trá»‹' || user?.email?.toLowerCase() === 'thienvu1108@gmail.com';
  }, [userRole, userProfile, user]);

  const isSuperAdmin = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return role === 'super_admin' || user?.email?.toLowerCase() === 'thienvu1108@gmail.com';
  }, [userRole, userProfile, user]);

  const isMod = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return role === 'mod' || role === 'moderator' || role === 'Ä‘iá»u phá»‘i';
  }, [userRole, userProfile]);

  const isAccountant = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return role === 'accountant' || role === 'káº¿ toÃ¡n' || role === 'accounting';
  }, [userRole, userProfile]);

  const isGDDA = useMemo(() => {
    const role = (userProfile?.role || userRole || '').toString().toLowerCase().trim();
    return role === 'gdda' || role === 'gÄ‘da' || role === 'giÃ¡m Ä‘á»‘c dá»± Ã¡n';
  }, [userProfile, userRole]);

  const isGDKhoi = useMemo(() => {
    const role = (userProfile?.role || userRole || '').toString().toLowerCase().trim();
    return role === 'gd_khoi' || role === 'gdkhoi' || role === 'gÄ‘ khá»‘i' || role === 'giÃ¡m Ä‘á»‘c khá»‘i' || role === 'giÃ¡m Ä‘á»‘c liÃªn khá»‘i' || role === 'gdk' || role === 'tro_ly_khoi' || role === 'tro ly khoi' || role === 'trá»£ lÃ½ khá»‘i' || role === 'tro_ly_gdkhoi' || role === 'assistant_block';
  }, [userProfile, userRole]);

  const isTroLyKhoi = useMemo(() => {
    const role = (userProfile?.role || userRole || '').toString().toLowerCase().trim();
    return role === 'tro_ly_khoi' || role === 'tro ly khoi' || role === 'trá»£ lÃ½ khá»‘i' || role === 'tro_ly_gdkhoi' || role === 'assistant_block';
  }, [userProfile, userRole]);

  const isGDKD = useMemo(() => {
    const role = (userProfile?.role || userRole || '').toString().toLowerCase().trim();
    return role === 'gdkd' || role === 'gÄ‘kd' || role === 'giÃ¡m Ä‘á»‘c kinh doanh' || role === 'gÄ‘ kinh doanh';
  }, [userProfile, userRole]);

  const isAssistant = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return role === 'assistant' || role === 'trá»£ lÃ½' || role === 'tro ly';
  }, [userRole, userProfile]);

  const isUser = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return !role || role === 'user' || role === 'ngÆ°á»i dÃ¹ng';
  }, [userRole, userProfile]);

  const isInternalStaff = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    const email = user?.email?.toLowerCase() || '';
    const internalRoles = ['super_admin', 'admin', 'mod', 'accountant', 'gdda', 'gd_khoi', 'gdkhoi', 'gÄ‘ khá»‘i', 'giÃ¡m Ä‘á»‘c khá»‘i', 'tro_ly_khoi', 'trá»£ lÃ½ khá»‘i', 'gdkd', 'giÃ¡m Ä‘á»‘c kinh doanh', 'assistant', 'trá»£ lÃ½', 'tro ly', 'moderator', 'káº¿ toÃ¡n', 'Ä‘iá»u phá»‘i', 'accounting'];
    return internalRoles.includes(role) || 
           email === 'thienvu1108@gmail.com' || 
           email === 'tesscain2022@gmail.com' ||
           isSuperAdmin || isAdmin || isMod || isAccountant || isGDDA || isGDKhoi || isTroLyKhoi || isGDKD || isAssistant;
  }, [userRole, user, isSuperAdmin, isAdmin, isMod, isAccountant, isGDDA, isGDKhoi, isTroLyKhoi, isGDKD, isAssistant]);
  const [activeTab, setActiveTab] = useState('home');
  const [reportNtSubTab, setReportNtSubTab] = useState<'direct' | 'google-sheet'>('direct');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [showQuotaGuide, setShowQuotaGuide] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    if ((window as any).isFirestoreQuotaExceeded) {
      setIsQuotaExceeded(true);
    }
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingTeam, setOnboardingTeam] = useState('');
  const [onboardingTeamSearch, setOnboardingTeamSearch] = useState('');

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [projects]);

  const teamMap = useMemo(() => {
    const map: Record<string, string> = {};
    teams.forEach(t => {
      map[t.id] = convertMhToMay(t.name);
    });
    return map;
  }, [teams]);

  const blockMap = useMemo(() => {
    const map: Record<string, string> = {};
    blocks.forEach(b => {
      map[b.id] = b.name || b.blockCode || b.id;
    });
    return map;
  }, [blocks]);



  // Block management states
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [activeTeamMgmtId, setActiveTeamMgmtId] = useState<string>('');
  const [blockNameInput, setBlockNameInput] = useState('');
  const [blockCodeInput, setBlockCodeInput] = useState('');
  const [blockPrefixInput, setBlockPrefixInput] = useState('');
  const [blockDirectorUid, setBlockDirectorUid] = useState('');
  const [createBlockAssistantUids, setCreateBlockAssistantUids] = useState<string[]>([]);
  const [createBlockTeamSearch, setCreateBlockTeamSearch] = useState('');
  const [selectedTeamToAddToBlock, setSelectedTeamToAddToBlock] = useState('');
  const [isCreateBlockDialogOpen, setIsCreateBlockDialogOpen] = useState(false);
  const [selectedTeamIdsForNewBlock, setSelectedTeamIdsForNewBlock] = useState<string[]>([]);
  const [blockBudgetMonthFilter, setBlockBudgetMonthFilter] = useState<string>('all');
  const [blockCostMonthFilter, setBlockCostMonthFilter] = useState<string>('all');
  const [isCreatingBlockTeam, setIsCreatingBlockTeam] = useState(false);
  const [teamBudgetMonthFilter, setTeamBudgetMonthFilter] = useState<string>('all');
  const [teamCostMonthFilter, setTeamCostMonthFilter] = useState<string>('all');
  const [assignExistingTeamId, setAssignExistingTeamId] = useState<string>('');
  
  // States related to Editing a Block
  const [isEditBlockDialogOpen, setIsEditBlockDialogOpen] = useState(false);
  const [editBlockNameInput, setEditBlockNameInput] = useState('');
  const [editBlockCodeInput, setEditBlockCodeInput] = useState('');
  const [editBlockPrefixInput, setEditBlockPrefixInput] = useState('');
  const [editBlockDirectorUid, setEditBlockDirectorUid] = useState('');
  const [editBlockAssistantUids, setEditBlockAssistantUids] = useState<string[]>([]);
  const [editBlockTeamSearch, setEditBlockTeamSearch] = useState('');
  const [editBlockSelectedTeamToAssign, setEditBlockSelectedTeamToAssign] = useState('');

  // States for Block Marketing Acceptance
  const [blockAcceptanceMonthFilter, setBlockAcceptanceMonthFilter] = useState<string>('all');
  const [blockAcceptanceTeamFilter, setBlockAcceptanceTeamFilter] = useState<string>('all');
  const [blockAcceptanceProjectFilter, setBlockAcceptanceProjectFilter] = useState<string>('all');
  const [blockAcceptanceStatusFilter, setBlockAcceptanceStatusFilter] = useState<string>('all');
  const [blockAcceptanceSearch, setBlockAcceptanceSearch] = useState<string>('');
  const [blockAcceptanceViewMode, setBlockAcceptanceViewMode] = useState<'direct' | 'google-sheet'>('direct');

  const myBlock = useMemo(() => {
    if (userProfile?.assignedBlock) {
      const found = blocks.find(b => b.id === userProfile.assignedBlock || b.blockCode === userProfile.assignedBlock);
      if (found) return found;
    }
    const uUid = user?.uid;
    const uEmail = user?.email?.toLowerCase();
    if (uUid || uEmail) {
      const found = blocks.find(b => 
        (uUid && b.directorUid === uUid) || 
        (uEmail && b.directorUid?.toLowerCase() === uEmail) ||
        (Array.isArray(b.assistantUids) && (
          (uUid && b.assistantUids.includes(uUid)) || 
          (uEmail && b.assistantUids.some((uid: string) => uid?.toLowerCase() === uEmail))
        ))
      );
      if (found) return found;
    }
    return null;
  }, [userProfile?.assignedBlock, blocks, user]);

  const currentActiveBlock = useMemo(() => {
    if (isGDKhoi) return myBlock;
    if (selectedBlockId) {
      return blocks.find(b => b.id === selectedBlockId || b.blockCode === selectedBlockId);
    }
    return blocks[0] || null;
  }, [isGDKhoi, myBlock, selectedBlockId, blocks]);

  const isTeamInMyBlock = useCallback((teamId: string) => {
    if (isAdmin || isAccountant || isSuperAdmin) return true;
    const block = currentActiveBlock;
    if (!block) return false;
    const team = teams.find(t => t.id === teamId);
    if (!team) return false;
    if (team.blockId === block.id || team.blockCode === block.blockCode) return true;
    if (team.blockId === 'unassigned' || team.blockCode === 'unassigned' || team.blockId === 'none' || team.blockCode === 'none') return false;
    if (team.blockId && team.blockId !== block.id) return false;
    if (team.blockCode && team.blockCode !== block.blockCode) return false;
    const code = team.teamCode || extractTeamCode(team.name || '');
    let prefix = (block.teamPrefix || '').toUpperCase().trim();
    if (prefix === 'MH') prefix = 'MAY';
    return !!(prefix && code.toUpperCase().startsWith(prefix));
  }, [currentActiveBlock, teams, isAdmin, isAccountant, isSuperAdmin]);

  const [budgetReportSort, setBudgetReportSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'amount', direction: 'desc' });
  const [costReportSort, setCostReportSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'amount', direction: 'desc' });

  const [reportProject, setReportProject] = useState('all');
  const [reportTeam, setReportTeam] = useState('all');
  const [reportRegion, setReportRegion] = useState('all');
  const [reportType, setReportType] = useState('all');
  const [reportMonths, setReportMonths] = useState<string[]>([getMarketingMonth(new Date())]);
  const [reportWeek, setReportWeek] = useState('all');
  const [costPeriod, setCostPeriod] = useState('1');
  const [chartTimeType, setChartTimeType] = useState<'week' | 'month'>('month');
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportSortBy, setReportSortBy] = useState<'budget' | 'actual' | 'revenue'>('budget');
  const [activeReportTab, setActiveReportTab] = useState('team');
  const [efficiencyGroupType, setEfficiencyGroupType] = useState<'team' | 'project' | 'region'>('team');

  const [adminBudgetSearch, setAdminBudgetSearch] = useState('');
  const debouncedAdminBudgetSearch = useDebounce(adminBudgetSearch, 300);
  const [adminBudgetMonthFilter, setAdminBudgetMonthFilter] = useState(getMarketingMonth(new Date()));
  const [adminBudgetSort, setAdminBudgetSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  const handleAdminBudgetSort = useCallback((key: string) => {
    setAdminBudgetSort(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);
  const [adminCostSearch, setAdminCostSearch] = useState('');
  const debouncedAdminCostSearch = useDebounce(adminCostSearch, 300);
  const [adminCostMonthFilter, setAdminCostMonthFilter] = useState(getMarketingMonth(new Date()));
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [selectedLogForRestore, setSelectedLogForRestore] = useState<any>(null);

  const [newBlockTeamName, setNewBlockTeamName] = useState('');
  const [newBlockTeamCode, setNewBlockTeamCode] = useState('');
  const [editingBlockTeamId, setEditingBlockTeamId] = useState<string | null>(null);
  const [editingBlockTeamName, setEditingBlockTeamName] = useState('');
  const [editingBlockTeamCode, setEditingBlockTeamCode] = useState('');

  const [blockBudgetProject, setBlockBudgetProject] = useState('');
  const [blockBudgetTeam, setBlockBudgetTeam] = useState('');
  const [blockBudgetMonth, setBlockBudgetMonth] = useState(getMarketingMonth(new Date()));
  const [blockBudgetAmount, setBlockBudgetAmount] = useState('');
  const [blockBudgetImplementer, setBlockBudgetImplementer] = useState('');

  const [blockCostProject, setBlockCostProject] = useState('');
  const [blockCostTeam, setBlockCostTeam] = useState('');
  const [blockCostMonth, setBlockCostMonth] = useState(getMarketingMonth(new Date()));
  const [blockCostAmount, setBlockCostAmount] = useState('');
  const [blockCostNote, setBlockCostNote] = useState('');
  const [blockCostFb, setBlockCostFb] = useState('');
  const [blockCostGoogle, setBlockCostGoogle] = useState('');
  const [blockCostZalo, setBlockCostZalo] = useState('');
  const [blockCostPosting, setBlockCostPosting] = useState('');
  const [blockCostOther, setBlockCostOther] = useState('');

  // Team management (GDKD) states
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('user');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserRole, setEditingUserRole] = useState('user');

  // Admin expanded Team Management states
  const [adminSelectedTeamToManage, setAdminSelectedTeamToManage] = useState<string | null>(null);
  const [adminAddMemberName, setAdminAddMemberName] = useState('');
  const [adminAddMemberEmail, setAdminAddMemberEmail] = useState('');
  const [adminAddMemberRole, setAdminAddMemberRole] = useState('user');
  const [adminSelectExistingUserId, setAdminSelectExistingUserId] = useState('');

  const [teamCostProject, setTeamCostProject] = useState('');
  const [teamCostMonth, setTeamCostMonth] = useState(getMarketingMonth(new Date()));
  const [teamCostAmount, setTeamCostAmount] = useState('');
  const [teamCostNote, setTeamCostNote] = useState('');
  const [teamCostMember, setTeamCostMember] = useState('');
  const [teamCostFb, setTeamCostFb] = useState('');
  const [teamCostGoogle, setTeamCostGoogle] = useState('');
  const [teamCostZalo, setTeamCostZalo] = useState('');
  const [teamCostPosting, setTeamCostPosting] = useState('');
  const [teamCostOther, setTeamCostOther] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [selectedEfficiencyIds, setSelectedEfficiencyIds] = useState<string[]>([]);
  const [multiBudgetItems, setMultiBudgetItems] = useState<any[]>([]);
  const [isOverBudgetDetailOpen, setIsOverBudgetDetailOpen] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [adminBudgetStartDay, setAdminBudgetStartDay] = useState('1');
  const [adminBudgetEndDay, setAdminBudgetEndDay] = useState('20');
  const [isEditCostDialogOpen, setIsEditCostDialogOpen] = useState(false);
  const [isAlertManagementOpen, setIsAlertManagementOpen] = useState(false);

  const [adminSubTab, setAdminSubTab] = useState('budgets');
  const [blockSubTab, setBlockSubTab] = useState('block-teams');
  const [teamSubTab, setTeamSubTab] = useState('team-members');

  // BÃ¡o cÃ¡o NT states
  const [reportNTUrl, setReportNTUrl] = useState('');
  const [reportNTRecords, setReportNTRecords] = useState<any[]>([]);
  const [reportNTLastUpdated, setReportNTLastUpdated] = useState<any>(null);
  const [isSyncingReportNT, setIsSyncingReportNT] = useState(false);
  const [reportNTSearch, setReportNTSearch] = useState('');
  const [inputReportNTUrl, setInputReportNTUrl] = useState('');
  const [ntPage, setNtPage] = useState(1);
  const [ntSortField, setNtSortField] = useState<string | null>(null);
  const [ntSortDirection, setNtSortDirection] = useState<'asc' | 'desc' | 'none'>('none');

  const syncLogToGoogleSheets = async (logEntry: any) => {
    try {
      const payload = {
        action: logEntry.action,
        collection: logEntry.collection,
        docId: logEntry.docId,
        userEmail: logEntry.userEmail,
        timestamp: new Date().toISOString(),
        details: JSON.stringify(logEntry.data || {}).substring(0, 1000)
      };

      await fetch('https://script.google.com/macros/s/AKfycbz_m3Yc0_H69P6Pj6Uq9p5uH7U6q_R5p6s/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Google Sheets Auto-Sync Error:", e);
    }
  };

  const logAction = async (action: string, collectionName: string, docId: string, data: any) => {
    try {
      const logData = {
        action,
        collection: collectionName,
        docId,
        data,
        timestamp: serverTimestamp(),
        userEmail: user?.email,
        userId: user?.uid
      };
      
      await addDoc(collection(db, 'auditLogs'), logData);
      
      // Tá»± Ä‘á»™ng Ä‘á»“ng bá»™ Nháº­t kÃ½ nÃ y sang Google Sheet ngay láº­p tá»©c
      syncLogToGoogleSheets({
        action,
        collection: collectionName,
        docId,
        data,
        userEmail: user?.email
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  };

  const [acceptanceSearch, setAcceptanceSearch] = useState('');
  const debouncedAcceptanceSearch = useDebounce(acceptanceSearch, 300);
  const [acceptanceMonthFilter, setAcceptanceMonthFilter] = useState('all');
  const [acceptanceProjectFilter, setAcceptanceProjectFilter] = useState('all');
  const [acceptanceTeamFilter, setAcceptanceTeamFilter] = useState('all');
  const [acceptanceCategoryFilter, setAcceptanceCategoryFilter] = useState('all');

  const groupedDocProcessing = useMemo(() => {
    const groups: Record<string, any> = {};
    
    // Index status for O(1) lookup
    const statusMap = new Map();
    (docProcessingStatus || []).forEach(s => {
      if (s.projectId || s.teamId) {
        statusMap.set(`${s.projectId}_${s.teamId}`, s);
      }
    });

    (finalAcceptances || []).forEach(a => {
      // Filter by month if not 'all'
      if (acceptanceMonthFilter !== 'all' && a.month !== acceptanceMonthFilter) {
        return;
      }

      // Use unique key combining IDs and names to prevent accidental merging of different entities with missing IDs
      const safePID = a.projectId || 'ID_MISSING';
      const safePName = (a.projectName || projectMap[a.projectId] || 'N/A').trim();
      const safeTID = a.teamId || 'ID_MISSING';
      const safeTName = (a.teamName || teamMap[a.teamId] || 'N/A').trim();
      
      const key = `${safePID}_${safePName}_${safeTID}_${safeTName}`;
      
      if (!groups[key]) {
        groups[key] = {
          groupKey: key,
          projectId: a.projectId || '',
          projectName: safePName,
          teamId: a.teamId || '',
          teamName: safeTName,
          totalAmount: 0,
          visaCost: 0,
          digitalCost: 0,
          crmCost: 0,
          facebookCost: 0,
          googleCost: 0,
          zaloCost: 0,
          tiktokCost: 0,
          postingCost: 0,
          otherCost: 0,
          recordCount: 0
        };
      }
      groups[key].totalAmount += (a.totalActualCost || a.afterAcceptanceCost || 0);
      groups[key].visaCost += (a.visaCost || 0);
      groups[key].digitalCost += (a.digitalCost || 0);
      groups[key].crmCost += (a.crmCost || 0);
      groups[key].facebookCost += (a.facebookCost || 0);
      groups[key].googleCost += (a.googleCost || 0);
      groups[key].zaloCost += (a.zaloCost || 0);
      groups[key].tiktokCost += (a.tiktokCost || 0);
      groups[key].postingCost += (a.postingCost || 0);
      groups[key].otherCost += (a.otherCost || 0);
      groups[key].recordCount += 1;
    });

    const searchLower = (debouncedAcceptanceSearch || '').toLowerCase();
    const projectNameFromMap = (projectMap[acceptanceProjectFilter] || '').toLowerCase();
    const teamNameFromMap = (teamMap[acceptanceTeamFilter] || '').toLowerCase();
    const projectFilterLower = (acceptanceProjectFilter || '').toLowerCase();
    const teamFilterLower = (acceptanceTeamFilter || '').toLowerCase();

    return Object.values(groups).map(group => {
      // Improved lookup: Try ID match, then fallback to Name match
      let status = statusMap.get(`${group.projectId}_${group.teamId}`);
      if (!status) {
         status = docProcessingStatus.find(s => 
           (s.projectId === group.projectId && s.teamId === group.teamId) ||
           (s.projectName === group.projectName && s.teamName === group.teamName)
         );
      }
      
      return {
        ...group,
        id: status?.id || null,
        confirmation: status?.confirmation || 'ChÆ°a Ä‘á»‘i soÃ¡t',
        note: status?.note || '',
        updatedAt: status?.updatedAt,
        updatedByEmail: status?.updatedByEmail
      };
    }).filter(g => {
      const matchSearch = !searchLower ||
        (g.projectName || '').toLowerCase().includes(searchLower) ||
        (g.teamName || '').toLowerCase().includes(searchLower);
      
      const gProjectLower = (g.projectName || '').toLowerCase().trim();
      const matchProject = acceptanceProjectFilter === 'all' || 
                           (g.projectId && String(g.projectId).trim() === String(acceptanceProjectFilter).trim()) || 
                           (projectNameFromMap && gProjectLower.includes(projectNameFromMap)) ||
                           (gProjectLower.includes(projectFilterLower));
      
      const gTeamLower = (g.teamName || '').toLowerCase().trim();
      const matchTeam = acceptanceTeamFilter === 'all' || 
                       (gTeamLower.includes(teamFilterLower)) ||
                       (g.teamId && String(g.teamId).toLowerCase().trim() === String(acceptanceTeamFilter).trim().toLowerCase()) ||
                       (teamNameFromMap && gTeamLower.includes(teamNameFromMap));
      
      const matchCategory = acceptanceCategoryFilter === 'all' || 
                           (acceptanceCategoryFilter === 'digital' && g.digitalCost > 0) ||
                           (acceptanceCategoryFilter === 'visa' && g.visaCost > 0) ||
                           (acceptanceCategoryFilter === 'crm' && (g.crmCost || 0) > 0);
      
      return matchSearch && matchProject && matchTeam && matchCategory;
    });
  }, [finalAcceptances, docProcessingStatus, projectMap, teamMap, debouncedAcceptanceSearch, acceptanceProjectFilter, acceptanceTeamFilter, acceptanceMonthFilter, acceptanceCategoryFilter]);

  const handleUpdateDocProcessing = async (projectId: string, teamId: string, confirmation: string, note: string) => {
    try {
      const existing = docProcessingStatus.find(s => s.projectId === projectId && s.teamId === teamId);
      const data = {
        projectId,
        teamId,
        confirmation,
        note,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
        updatedByEmail: user?.email
      };

      if (existing) {
        await updateDoc(doc(db, 'docProcessing', existing.id), data);
      } else {
        await addDoc(collection(db, 'docProcessing'), data);
      }
      toast.success('Cáº­p nháº­t tráº¡ng thÃ¡i thÃ nh cÃ´ng');
      await logAction('UPDATE_DOC_PROCESSING', 'docProcessing', `${projectId}_${teamId}`, { confirmation, note });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'docProcessing');
    }
  };

  const dataDrivenTeamMap = useMemo(() => {
    const map: Record<string, string> = { ...teamMap };
    budgets.forEach(b => { if (b.teamId && b.teamName && !map[b.teamId]) map[b.teamId] = b.teamName; });
    costs.forEach(c => { if (c.teamId && c.teamName && !map[c.teamId]) map[c.teamId] = c.teamName; });
    return map;
  }, [budgets, costs, teamMap]);

  const dataDrivenProjectMap = useMemo(() => {
    const map: Record<string, string> = { ...projectMap };
    budgets.forEach(b => { if (b.projectId && b.projectName && !map[b.projectId]) map[b.projectId] = b.projectName; });
    costs.forEach(c => { if (c.projectId && c.projectName && !map[c.projectName]) map[c.projectName] = c.projectName; });
    return map;
  }, [budgets, costs, projectMap]);

  const budgetAmountMap = useMemo(() => {
    const map: Record<string, number> = {};
    budgets.forEach(b => {
      map[b.id] = b.amount;
    });
    return map;
  }, [budgets]);

  const latestCostsByBudget = useMemo(() => {
    const map: Record<string, any> = {};
    costs.forEach(c => {
      const budgetId = c.budgetId;
      if (!budgetId) return;
      
      const existing = map[budgetId];
      const currentTimestamp = c.createdAt?.toDate ? c.createdAt.toDate().getTime() : (c.createdAt ? new Date(c.createdAt).getTime() : 0);
      const existingTimestamp = existing?.createdAt?.toDate ? existing.createdAt.toDate().getTime() : (existing?.createdAt ? new Date(existing.createdAt).getTime() : 0);
      
      if (!existing || currentTimestamp > existingTimestamp) {
        map[budgetId] = c;
      }
    });
    return map;
  }, [costs]);

  const latestCostsList = useMemo(() => Object.values(latestCostsByBudget), [latestCostsByBudget]);

  const resolveTeamName = useCallback((id: string | undefined, name: string | undefined) => {
    let res = 'N/A';
    if (id && teamMap[id]) res = teamMap[id];
    else if (id && dataDrivenTeamMap[id]) res = dataDrivenTeamMap[id];
    else if (name) {
      const isIdLike = name.length > 10 && !name.includes(' ') && /^[a-zA-Z0-9]+$/.test(name);
      if (isIdLike && dataDrivenTeamMap[name]) res = dataDrivenTeamMap[name];
      else res = name;
    } else {
      res = id || 'N/A';
    }
    return convertMhToMay(res);
  }, [teamMap, dataDrivenTeamMap]);

  const resolveProjectName = useCallback((id: string | undefined, name: string | undefined) => {
    if (id && projectMap[id]) return projectMap[id];
    if (id && dataDrivenProjectMap[id]) return dataDrivenProjectMap[id];
    if (name) {
      const isIdLike = name.length > 10 && !name.includes(' ') && /^[a-zA-Z0-9]+$/.test(name);
      if (isIdLike && dataDrivenProjectMap[name]) return dataDrivenProjectMap[name];
      return name;
    }
    return id || 'N/A';
  }, [projectMap, dataDrivenProjectMap]);

  const getAcceptanceCostValue = useCallback((a: any): number => {
    if (!a) return 0;
    if (a.afterAcceptanceCost !== undefined && a.afterAcceptanceCost !== null && Number(a.afterAcceptanceCost) > 0) {
      return Number(a.afterAcceptanceCost);
    }
    if (a.totalActualCost !== undefined && a.totalActualCost !== null && Number(a.totalActualCost) > 0) {
      return Number(a.totalActualCost);
    }
    return Number(a.totalCost || 0);
  }, []);

  const acceptanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    const groupedAcceptances: Record<string, number> = {};

    // Combine acceptances and finalAcceptances cleanly without duplicate IDs
    const allAcceptancesMap = new Map<string, any>();
    (acceptances || []).forEach(a => {
      if (a && a.id) allAcceptancesMap.set(a.id, a);
    });
    (finalAcceptances || []).forEach(fa => {
      if (fa && fa.id && !allAcceptancesMap.has(fa.id)) {
        allAcceptancesMap.set(fa.id, fa);
      }
    });

    allAcceptancesMap.forEach(a => {
      const aTeamName = resolveTeamName(a.teamId, a.teamName) || teamMap[a.teamId] || a.teamName || '';
      const aProjName = resolveProjectName(a.projectId, a.projectName) || projectMap[a.projectId] || a.projectName || '';
      const tKey = normalizeTeamName(aTeamName).trim().toLowerCase();
      const pKey = aProjName.trim().toLowerCase();
      const mKey = normalizeMonth(a.month || '');

      const costValue = getAcceptanceCostValue(a);

      if (mKey && costValue >= 0) {
        if (tKey && pKey) {
          const key1 = `${tKey}|${pKey}|${mKey}`;
          groupedAcceptances[key1] = (groupedAcceptances[key1] || 0) + costValue;
        }
        if (a.teamId && a.projectId) {
          const key2 = `${String(a.teamId).trim().toLowerCase()}|${String(a.projectId).trim().toLowerCase()}|${mKey}`;
          if (key2 !== `${tKey}|${pKey}|${mKey}`) {
            groupedAcceptances[key2] = (groupedAcceptances[key2] || 0) + costValue;
          }
        }
      }
    });

    budgets.forEach(b => {
      const bTeamName = resolveTeamName(b.teamId, b.teamName) || teamMap[b.teamId] || b.teamName || '';
      const bProjName = resolveProjectName(b.projectId, b.projectName) || projectMap[b.projectId] || b.projectName || '';
      const tKey = normalizeTeamName(bTeamName).trim().toLowerCase();
      const pKey = bProjName.trim().toLowerCase();
      const mKey = normalizeMonth(b.month || '');

      const key1 = `${tKey}|${pKey}|${mKey}`;
      const key2 = `${String(b.teamId).trim().toLowerCase()}|${String(b.projectId).trim().toLowerCase()}|${mKey}`;

      if (groupedAcceptances[key1] !== undefined) {
        map[b.id] = groupedAcceptances[key1];
      } else if (groupedAcceptances[key2] !== undefined) {
        map[b.id] = groupedAcceptances[key2];
      } else {
        map[b.id] = 0;
      }
    });

    return map;
  }, [budgets, acceptances, finalAcceptances, resolveTeamName, resolveProjectName, teamMap, projectMap, getAcceptanceCostValue]);

  const baoCaoNTMap = acceptanceMap;

  const isReportsActive = activeTab === 'reports' || (activeTab === 'admin' && adminSubTab === 'reports') || activeTab === 'mkt-efficiency';

  const normalizedReportMonths = useMemo(() => reportMonths.map(m => normalizeMonth(m)), [reportMonths]);

  const filteredBudgets = useMemo(() => {
    if (!isReportsActive && activeTab !== 'budgets' && activeTab !== 'admin' && activeTab !== 'doc-processing') return [];
    // Get all teams in GÄ Khá»‘i's block if user is GÄ Khá»‘i
    const blockTeams = teams.filter(t => isTeamInBlock(t, currentActiveBlock));
    const blockTeamIds = new Set(blockTeams.map(t => t.id));
    const blockTeamNames = new Set(blockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(blockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return budgets.filter(b => {
      const bProjectName = resolveProjectName(b.projectId, b.projectName);
      const bTeamName = resolveTeamName(b.teamId, b.teamName);
      const project = projects.find(p => p.id === b.projectId || p.name === bProjectName);
      
      const userEmail = user?.email?.toLowerCase();
      const budgetEmail = (b.userEmail || b.createdByEmail)?.toLowerCase();
      const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
      const isAssigned = b.assignedUserEmail?.toLowerCase() === userEmail;
      
      const isInMyBlock = isGDKhoi && (
        (b.teamId && blockTeamIds.has(b.teamId)) ||
        (b.teamName && blockTeamNames.has(b.teamName.toLowerCase().trim())) ||
        (b.teamCode && blockTeamCodes.has(b.teamCode.toLowerCase().trim()))
      );

      const isInMyTeam = isGDKD && userProfile?.teamName && (
        (b.teamName && b.teamName.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim()) ||
        (b.teamId && teams.find(t => t.id === b.teamId)?.name?.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim())
      );

      const hasAccess = isAdmin || isMod || isAccountant || isGDDA || isInMyBlock || isInMyTeam || (isOwner || isAssigned);
      
      if (!hasAccess) return false;

      const matchProject = reportProject === 'all' || b.projectId === reportProject || bProjectName === projectMap[reportProject];
      const matchTeam = reportTeam === 'all' || b.teamId === reportTeam || bTeamName === reportTeam || bTeamName === teamMap[reportTeam];
      const matchMonth = normalizedReportMonths.length === 0 || normalizedReportMonths.includes(normalizeMonth(b.month));
      const matchRegion = reportRegion === 'all' || (project?.region || 'KhÃ¡c') === reportRegion;
      const matchType = reportType === 'all' || (project?.type || 'KhÃ¡c') === reportType;
      
      return matchProject && matchTeam && matchMonth && matchRegion && matchType;
    }).sort((a, b) => {
      const factor = budgetReportSort.direction === 'asc' ? 1 : -1;
      if (budgetReportSort.key === 'amount') return (a.amount - b.amount) * factor;
      if (budgetReportSort.key === 'team') return (a.teamName || '').localeCompare(b.teamName || '') * factor;
      if (budgetReportSort.key === 'project') return (a.projectName || '').localeCompare(b.projectName || '') * factor;
      if (budgetReportSort.key === 'implementer') return (a.implementerName || '').localeCompare(b.implementerName || '') * factor;
      return 0;
    });
  }, [budgets, costs, projectMap, teamMap, dataDrivenTeamMap, dataDrivenProjectMap, reportProject, reportTeam, normalizedReportMonths, reportRegion, reportType, isAdmin, isMod, isGDDA, isGDKhoi, isGDKD, currentActiveBlock, teams, userProfile, budgetReportSort, user, resolveProjectName, resolveTeamName, isReportsActive, activeTab]);

  const filteredCosts = useMemo(() => {
    if (!isReportsActive && activeTab !== 'budgets' && activeTab !== 'admin' && activeTab !== 'doc-processing') return [];
    // Get all teams in GÄ Khá»‘i's block if user is GÄ Khá»‘i
    const blockTeams = teams.filter(t => isTeamInBlock(t, currentActiveBlock));
    const blockTeamIds = new Set(blockTeams.map(t => t.id));
    const blockTeamNames = new Set(blockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(blockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return costs.filter(c => {
      const cProjectName = resolveProjectName(c.projectId, c.projectName);
      const cTeamName = resolveTeamName(c.teamId, c.teamName);
      const project = projects.find(p => p.id === c.projectId || p.name === cProjectName);
      
      const userEmail = user?.email?.toLowerCase();
      const costEmail = (c.userEmail || c.createdByEmail)?.toLowerCase();
      const isOwner = (costEmail && userEmail && costEmail === userEmail) || (c.createdBy === user?.uid);
      const isAssigned = c.assignedUserEmail?.toLowerCase() === userEmail;
      
      const isInMyBlock = isGDKhoi && (
        (c.teamId && blockTeamIds.has(c.teamId)) ||
        (c.teamName && blockTeamNames.has(c.teamName.toLowerCase().trim())) ||
        (c.teamCode && blockTeamCodes.has(c.teamCode.toLowerCase().trim()))
      );

      const isInMyTeam = isGDKD && userProfile?.teamName && (
        (c.teamName && c.teamName.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim()) ||
        (c.teamId && teams.find(t => t.id === c.teamId)?.name?.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim())
      );

      const hasAccess = isAdmin || isMod || isAccountant || isGDDA || isInMyBlock || isInMyTeam || (isOwner || isAssigned);
      
      if (!hasAccess) return false;

      const matchProject = reportProject === 'all' || c.projectId === reportProject || cProjectName === projectMap[reportProject];
      const matchTeam = reportTeam === 'all' || c.teamId === reportTeam || cTeamName === reportTeam || cTeamName === teamMap[reportTeam];
      const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
      const normalizedMMonth = normalizeMonth(mMonth);
      const matchMonth = normalizedReportMonths.length === 0 || (normalizedMMonth && normalizedReportMonths.includes(normalizedMMonth));
      const matchRegion = reportRegion === 'all' || (project?.region || 'KhÃ¡c') === reportRegion;
      const matchType = reportType === 'all' || (project?.type || 'KhÃ¡c') === reportType;
      const matchWeek = reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
      
      return matchProject && matchTeam && matchMonth && matchRegion && matchType && matchWeek;
    }).sort((a, b) => {
      const factor = costReportSort.direction === 'asc' ? 1 : -1;
      if (costReportSort.key === 'amount') return (a.amount - b.amount) * factor;
      if (costReportSort.key === 'team') return (a.teamName || '').localeCompare(b.teamName || '') * factor;
      if (costReportSort.key === 'project') return (a.projectName || '').localeCompare(b.projectName || '') * factor;
      if (costReportSort.key === 'implementer') return (a.implementerName || '').localeCompare(b.implementerName || '') * factor;
      if (costReportSort.key === 'createdAt') {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return (timeA - timeB) * factor;
      }
      return 0;
    });
  }, [costs, projects, projectMap, teamMap, dataDrivenTeamMap, dataDrivenProjectMap, reportProject, reportTeam, normalizedReportMonths, getMarketingMonth, reportRegion, reportType, reportWeek, isAdmin, isMod, isGDDA, isGDKhoi, isGDKD, currentActiveBlock, teams, userProfile, costReportSort, user, resolveProjectName, resolveTeamName, isReportsActive, activeTab]);

  const budgetReportWithActuals = useMemo(() => {
    if (!isReportsActive && activeTab !== 'budgets' && activeTab !== 'admin') return [];
    const budgetMap: { [key: string]: any } = {};

    // 1. Group budgets by team + project across selected months
    filteredBudgets.forEach(b => {
      const bTeamName = resolveTeamName(b.teamId, b.teamName) || '';
      const bProjectName = resolveProjectName(b.projectId, b.projectName) || '';
      const key = `${String(bTeamName).trim().toLowerCase()}|${String(bProjectName).trim().toLowerCase()}`;

      if (!budgetMap[key]) {
        budgetMap[key] = {
          ...b,
          id: b.id, // Primary ID for actions
          teamName: bTeamName,
          projectName: bProjectName,
          amount: 0,
          actualCost: 0,
          isFinalized: false
        };
      }
      budgetMap[key].amount += (b.amount || 0);
    });

    // 2. Map acceptances and merge into grouped data
    const userEmail = user?.email?.toLowerCase();
    const blockTeams = teams.filter(t => isTeamInBlock(t, currentActiveBlock));
    const blockTeamIds = new Set(blockTeams.map(t => t.id));
    const blockTeamNames = new Set(blockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(blockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    acceptances.forEach(a => {
      const aProjectName = resolveProjectName(a.projectId, a.projectName) || '';
      const aTeamName = resolveTeamName(a.teamId, a.teamName) || '';
      const project = projects.find(p => p.id === a.projectId || p.name === aProjectName);
      const normalizedAMonth = normalizeMonth(a.month);

      // Access logic
      const aEmail = a.userEmail?.toLowerCase() || a.createdBy?.toLowerCase();
      const isOwner = (aEmail && userEmail && aEmail === userEmail) || (a.createdByUid === user?.uid);
      
      const isInMyBlock = isGDKhoi && (
        (a.teamId && blockTeamIds.has(a.teamId)) ||
        (a.teamName && blockTeamNames.has(a.teamName.toLowerCase().trim())) ||
        (a.teamCode && blockTeamCodes.has(a.teamCode.toLowerCase().trim()))
      );

      const isInMyTeam = isGDKD && userProfile?.teamName && (
        (a.teamName && a.teamName.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim()) ||
        (a.teamId && teams.find(t => t.id === a.teamId)?.name?.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim())
      );

      const hasAccess = isAdmin || isMod || isAccountant || isGDDA || isInMyBlock || isInMyTeam || isOwner;
      if (!hasAccess) return;

      // Filter logic
      const matchProject = reportProject === 'all' || a.projectId === reportProject || aProjectName === projectMap[reportProject];
      const matchTeam = reportTeam === 'all' || a.teamId === reportTeam || aTeamName === reportTeam || aTeamName === teamMap[reportTeam];
      const matchMonth = normalizedReportMonths.length === 0 || (normalizedAMonth && normalizedReportMonths.includes(normalizedAMonth));
      const matchRegion = reportRegion === 'all' || (project?.region || 'KhÃ¡c') === reportRegion;
      const matchType = reportType === 'all' || (project?.type || 'KhÃ¡c') === reportType;

      if (matchProject && matchTeam && matchMonth && matchRegion && matchType) {
        const key = `${String(aTeamName).trim().toLowerCase()}|${String(aProjectName).trim().toLowerCase()}`;
        // Use confirmed cost if finalized
        const costValue = a.status === 'ÄÃ£ nghiá»‡m thu' ? (a.afterAcceptanceCost || 0) : 0;

        if (!budgetMap[key]) {
          budgetMap[key] = {
            id: `grouped-acc-${a.id}`,
            teamId: a.teamId,
            teamName: aTeamName,
            projectId: a.projectId,
            projectName: aProjectName,
            amount: 0, // Registered budget is 0 if no record exists
            actualCost: 0,
            isFinalized: false,
            implementerName: 'N/A',
            userEmail: a.createdBy || 'N/A',
            month: a.month
          };
        }
        budgetMap[key].actualCost += costValue;
        if (a.status === 'ÄÃ£ nghiá»‡m thu') {
          budgetMap[key].isFinalized = true;
        }
      }
    });

    return Object.values(budgetMap).sort((a: any, b: any) => {
      const factor = budgetReportSort.direction === 'asc' ? 1 : -1;
      if (budgetReportSort.key === 'amount') return (a.amount - b.amount) * factor;
      if (budgetReportSort.key === 'actual') return (a.actualCost - b.actualCost) * factor;
      if (budgetReportSort.key === 'month') return (a.month || '').localeCompare(b.month || '') * factor;
      if (budgetReportSort.key === 'team') return (a.teamName || '').localeCompare(b.teamName || '') * factor;
      if (budgetReportSort.key === 'project') return (a.projectName || '').localeCompare(b.projectName || '') * factor;
      return 0;
    });
  }, [filteredBudgets, budgetReportSort, isReportsActive, activeTab]);

  const paginatedBudgetReportWithActuals = useMemo(() => {
    const start = (budgetPage - 1) * 20;
    return (budgetReportWithActuals || []).slice(start, start + 20);
  }, [budgetReportWithActuals, budgetPage]);

  const overBudgetStats = useMemo(() => {
    return {
      count: 0,
      warningCount: 0,
      totalExcess: 0,
      items: [],
      warningItems: []
    };
  }, []);

  const uniqueTeams = useMemo(() => {
    const set = new Set(teams.map(t => t.name));
    budgets.forEach(b => {
      const name = teamMap[b.teamId] || b.teamName;
      if (name) set.add(name);
    });
    costs.forEach(c => {
      const name = teamMap[c.teamId] || c.teamName;
      if (name) set.add(name);
    });
    acceptances.forEach(a => {
      const name = teamMap[a.teamId] || a.teamName;
      if (name) set.add(name);
    });
    efficiencyReports.forEach(r => {
      const name = teamMap[r.teamId] || r.teamName;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [teams, budgets, costs, acceptances, efficiencyReports, teamMap]);

  const comparisonChartData = useMemo(() => {
    if (!isReportsActive) return [];
    // This chart compares items (based on efficiencyGroupType) across multiple months
    // reportSortBy determines which metric to compare
    
    // 1. Determine base items
    let items: any[] = [];
    if (efficiencyGroupType === 'team') {
      items = uniqueTeams.filter(t => reportTeam === 'all' || t === reportTeam).map(name => ({ id: name, name }));
    } else if (efficiencyGroupType === 'project') {
      items = projects.filter(p => reportProject === 'all' || p.id === reportProject).map(p => ({ id: p.id, name: p.name }));
    } else if (efficiencyGroupType === 'region') {
      items = regions.filter(r => reportRegion === 'all' || r.name === reportRegion).map(r => ({ id: r.name, name: r.name }));
    }

    // 2. Map items to monthly data
    return items.map(item => {
      const data: any = { name: item.name };
      
      reportMonths.forEach(month => {
        let value = 0;
        
        if (reportSortBy === 'budget') {
          value = budgets.filter(b => {
            const project = projects.find(p => p.id === b.projectId);
            const bTeamName = resolveTeamName(b.teamId, b.teamName);
            const bProjectName = resolveProjectName(b.projectId, b.projectName);
            
            const matchMonth = b.month === month;
            const matchProject = reportProject === 'all' || b.projectId === reportProject;
            const matchTeam = reportTeam === 'all' || bTeamName === reportTeam;
            const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
            const matchType = reportType === 'all' || (project?.type === reportType);
            
            if (!(matchMonth && matchProject && matchTeam && matchRegion && matchType)) return false;
            
            if (efficiencyGroupType === 'team') return bTeamName === item.id;
            if (efficiencyGroupType === 'project') return b.projectId === item.id || bProjectName === item.name;
            if (efficiencyGroupType === 'region') return project?.region === item.id;
            return false;
          }).reduce((acc, curr) => acc + (curr.amount || 0), 0);
        } else if (reportSortBy === 'actual') {
          value = acceptances.filter(a => {
            const project = projects.find(p => p.id === a.projectId);
            const aTeamName = resolveTeamName(a.teamId, a.teamName);
            const aProjectName = resolveProjectName(a.projectId, a.projectName);
            
            const matchMonth = normalizeMonth(a.month) === month;
            const matchProject = reportProject === 'all' || a.projectId === reportProject;
            const matchTeam = reportTeam === 'all' || aTeamName === reportTeam;
            const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
            const matchType = reportType === 'all' || (project?.type === reportType);
            
            if (!(matchMonth && matchProject && matchTeam && matchRegion && matchType)) return false;
            
            if (efficiencyGroupType === 'team') return aTeamName === item.id;
            if (efficiencyGroupType === 'project') return a.projectId === item.id || aProjectName === item.name;
            if (efficiencyGroupType === 'region') return project?.region === item.id;
            return false;
          }).reduce((acc, curr) => {
            const val = curr.status === 'ÄÃ£ nghiá»‡m thu' ? (curr.afterAcceptanceCost || 0) : 0;
            return acc + val;
          }, 0);
        } else if (reportSortBy === 'revenue') {
          value = efficiencyReports.filter(r => {
            const project = projects.find(p => p.id === r.projectId);
            const rTeamName = resolveTeamName(r.teamId, r.teamName);
            const rProjectName = resolveProjectName(r.projectId, r.projectName);
            
            const matchMonth = r.month === month;
            const matchProject = reportProject === 'all' || r.projectId === reportProject;
            const matchTeam = reportTeam === 'all' || rTeamName === reportTeam;
            const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
            
            if (!(matchMonth && matchProject && matchTeam && matchRegion)) return false;
            
            if (efficiencyGroupType === 'team') return rTeamName === item.id;
            if (efficiencyGroupType === 'project') return r.projectId === item.id || rProjectName === item.name;
            if (efficiencyGroupType === 'region') return project?.region === item.id;
            return false;
          }).reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        }
        
        data[month] = value;
      });
      
      return data;
    }).filter(d => {
      // Keep only items that have at least one month with data > 0
      return reportMonths.some(m => d[m] > 0);
    });
  }, [reportMonths, budgets, acceptances, efficiencyReports, efficiencyGroupType, reportSortBy, teams, projects, regions, projectMap, teamMap, uniqueTeams, resolveTeamName, resolveProjectName, reportProject, reportTeam, reportRegion, reportType, isReportsActive, activeTab]);

  const projectChartData = useMemo(() => {
    if (!isReportsActive) return [];
    return projects.filter(p => reportProject === 'all' || p.id === reportProject).map(p => {
      const projBudgets = budgets.filter(b => {
        const matchProject = b.projectId === p.id;
        const bTeamName = resolveTeamName(b.teamId, b.teamName);
        const matchTeam = reportTeam === 'all' || bTeamName === reportTeam;
        const matchMonth = reportMonths.length === 0 || reportMonths.includes(b.month);
        return matchProject && matchTeam && matchMonth;
      });
      
      const projActual = acceptances
        .filter(a => {
          const matchProject = a.projectId === p.id;
          const matchMonth = reportMonths.length === 0 || reportMonths.includes(normalizeMonth(a.month));
          const aTeamName = resolveTeamName(a.teamId, a.teamName);
          const matchTeam = reportTeam === 'all' || aTeamName === reportTeam;
          return matchProject && matchMonth && matchTeam;
        })
        .reduce((acc, curr) => {
          const val = curr.status === 'ÄÃ£ nghiá»‡m thu' ? (curr.afterAcceptanceCost || 0) : 0;
          return acc + val;
        }, 0);
      
      const bTotal = projBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      
      const pRevenue = efficiencyReports
        .filter(r => {
          const matchProject = r.projectId === p.id;
          const rTeamName = resolveTeamName(r.teamId, r.teamName);
          const matchTeam = reportTeam === 'all' || rTeamName === reportTeam;
          const matchMonth = reportMonths.length === 0 || reportMonths.includes(r.month);
          return matchProject && matchTeam && matchMonth;
        })
        .reduce((acc, curr) => acc + (curr.revenue || 0), 0);
      
      return {
        name: p.name,
        budget: bTotal,
        actual: projActual,
        revenue: pRevenue
      };
    }).filter(d => d.budget > 0 || d.actual > 0).sort((a,b) => b.actual - a.actual);
  }, [projects, budgets, acceptances, efficiencyReports, reportMonths, reportProject, reportTeam, resolveTeamName, isReportsActive, activeTab]);

  const regionChartData = useMemo(() => {
    if (!isReportsActive) return [];
    return regions.filter(reg => reportRegion === 'all' || reg.name === reportRegion).map(reg => {
      const regBudgets = budgets.filter(b => {
        const project = projects.find(p => p.id === b.projectId);
        const bTeamName = resolveTeamName(b.teamId, b.teamName);
        const matchMonth = reportMonths.length === 0 || reportMonths.includes(b.month);
        const matchProject = reportProject === 'all' || b.projectId === reportProject;
        const matchTeam = reportTeam === 'all' || bTeamName === reportTeam;
        const matchType = reportType === 'all' || (project?.type === reportType);
        
        return (project?.region === reg.name) && matchMonth && matchProject && matchTeam && matchType;
      });
      
      const regActual = acceptances
        .filter(a => {
          const project = projects.find(p => p.id === a.projectId);
          const aTeamName = resolveTeamName(a.teamId, a.teamName);
          const matchMonth = reportMonths.length === 0 || reportMonths.includes(normalizeMonth(a.month));
          const matchProject = reportProject === 'all' || a.projectId === reportProject;
          const matchTeam = reportTeam === 'all' || aTeamName === reportTeam;
          const matchType = reportType === 'all' || (project?.type === reportType);
          
          return (project?.region === reg.name) && matchMonth && matchProject && matchTeam && matchType;
        })
        .reduce((acc, curr) => {
          const val = curr.status === 'ÄÃ£ nghiá»‡m thu' ? (curr.afterAcceptanceCost || 0) : 0;
          return acc + val;
        }, 0);
      
      const bTotal = regBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      
      const regRevenue = efficiencyReports
        .filter(r => {
          const project = projects.find(p => p.id === r.projectId);
          const rTeamName = resolveTeamName(r.teamId, r.teamName);
          const matchMonth = reportMonths.length === 0 || reportMonths.includes(r.month);
          const matchProject = reportProject === 'all' || r.projectId === reportProject;
          const matchTeam = reportTeam === 'all' || rTeamName === reportTeam;
          
          return (project?.region === reg.name) && matchMonth && matchProject && matchTeam;
        })
        .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

      return {
        name: reg.name,
        budget: bTotal,
        actual: regActual,
        revenue: regRevenue
      };
    }).filter(d => d.budget > 0 || d.actual > 0);
  }, [regions, projects, budgets, acceptances, efficiencyReports, reportMonths, resolveTeamName, reportRegion, reportProject, reportTeam, reportType, resolveProjectName, isReportsActive, activeTab]);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoringData, setIsRestoringData] = useState(false);
  const [isRestoreBudgetsDialogOpen, setIsRestoreBudgetsDialogOpen] = useState(false);
  const [isRestoreCheckpointDialogOpen, setIsRestoreCheckpointDialogOpen] = useState(false);

  const handleUpdateCost = async (id: string, data: any) => {
    try {
      const docRef = doc(db, 'costs', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
        editHistory: arrayUnion({
          action: 'UPDATE_COST',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          changes: data
        })
      });
      await logAction('UPDATE_COST', 'costs', id, data);
      toast.success('ÄÃ£ cáº­p nháº­t chi phÃ­');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `costs/${id}`);
    }
  };

  const handleOpenMktReportDialog = (cost: any) => {
    setSelectedCostForMkt(cost);
    const report = cost.mktReport || {};
    setMktTotalLeads(report.totalLeads ? report.totalLeads.toString() : '');
    setMktContactedLeads(report.contactedLeads ? report.contactedLeads.toString() : '');
    setMktUnconvertedLeads(report.unconvertedLeads ? report.unconvertedLeads.toString() : '');
    setMktUnconvertedReason(report.unconvertedReason || '');
    setMktConvertedLeads(report.convertedLeads ? report.convertedLeads.toString() : '');
    setMktConversionRevenue(report.conversionRevenue ? report.conversionRevenue.toString() : '');
    setMktEditStartDate(report.startDate || '');
    setMktEditEndDate(report.endDate || '');
    setIsMktReportDialogOpen(true);
  };

  const handleSaveMktReport = async () => {
    if (!selectedCostForMkt) return;
    try {
      const costRef = doc(db, 'costs', selectedCostForMkt.id);
      const mktReportData = {
        totalLeads: Number(mktTotalLeads.toString().replace(/\./g, '')) || 0,
        contactedLeads: Number(mktContactedLeads.toString().replace(/\./g, '')) || 0,
        unconvertedLeads: Number(mktUnconvertedLeads.toString().replace(/\./g, '')) || 0,
        unconvertedReason: mktUnconvertedReason || '',
        convertedLeads: Number(mktConvertedLeads.toString().replace(/\./g, '')) || 0,
        conversionRevenue: Number(mktConversionRevenue.toString().replace(/\./g, '')) || 0,
        startDate: mktEditStartDate || '',
        endDate: mktEditEndDate || ''
      };

      await updateDoc(costRef, {
        mktReport: mktReportData,
        updatedAt: serverTimestamp(),
        editHistory: arrayUnion({
          action: 'UPDATE_MKT_REPORT',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          changes: {
            mktReport: mktReportData
          }
        })
      });

      toast.success('ÄÃ£ cáº­p nháº­t BÃ¡o cÃ¡o Hiá»‡u quáº£ MKT');
      setIsMktReportDialogOpen(false);
      setSelectedCostForMkt(null);
      await logAction('UPDATE_MKT_REPORT', 'costs', selectedCostForMkt.id, mktReportData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `costs/${selectedCostForMkt.id}`);
    }
  };
  const uniqueRegions = useMemo(() => {
    return regions.map(r => r.name).sort();
  }, [regions]);

  const uniqueTypes = useMemo(() => {
    return types.map(t => t.name).sort();
  }, [types]);

  const overBudgetProjectIds = useMemo(() => {
    const currentMonth = getMarketingMonth(new Date());
    const projectBudgets: {[key: string]: number} = {};
    const projectCosts: {[key: string]: number} = {};
    
    budgets.forEach(b => {
      const normalizedBMonth = normalizeMonth(b.month);
      if (normalizedBMonth === currentMonth) {
        const pName = resolveProjectName(b.projectId, b.projectName);
        projectBudgets[pName] = (projectBudgets[pName] || 0) + b.amount;
      }
    });
    
    // Use acceptance data for real costs
    acceptances.forEach(a => {
      const aMonth = normalizeMonth(a.month);
      if (aMonth === currentMonth) {
        const pName = resolveProjectName(a.projectId, a.projectName);
        const costValue = a.status === 'ÄÃ£ nghiá»‡m thu' ? (a.afterAcceptanceCost || 0) : 0;
        projectCosts[pName] = (projectCosts[pName] || 0) + costValue;
      }
    });

    const overLimitNames = new Set<string>();
    Object.entries(projectBudgets).forEach(([pName, budget]) => {
      if ((projectCosts[pName] || 0) > budget) {
        overLimitNames.add(pName);
      }
    });

    const overLimitIds = new Set<string>();
    overLimitNames.forEach(name => {
      const foundId = Object.keys(dataDrivenProjectMap).find(id => dataDrivenProjectMap[id] === name);
      if (foundId) overLimitIds.add(foundId);
      else overLimitIds.add(name);
    });

    return overLimitIds;
  }, [budgets, latestCostsList, getMarketingMonth, dataDrivenProjectMap, resolveProjectName]);

  const chartData = useMemo(() => {
    return uniqueTeams.filter(t => reportTeam === 'all' || t === reportTeam).map(team => {
      const teamBudgets = budgets.filter(b => {
        const project = projects.find(p => p.id === b.projectId);
        const matchProject = reportProject === 'all' || b.projectId === reportProject;
        const matchMonth = reportMonths.length === 0 || reportMonths.includes(b.month);
        const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
        const matchType = reportType === 'all' || (project?.type === reportType);
        const bTeamName = resolveTeamName(b.teamId, b.teamName);
        return matchProject && bTeamName === team && matchMonth && matchRegion && matchType;
      });
      
      let teamTotalBudget = teamBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      if (chartTimeType === 'week' && reportWeek !== 'all') teamTotalBudget = teamTotalBudget / 4;

      const teamProjectDetails = projects.map(p => {
        const pBudgets = teamBudgets.filter(b => b.projectId === p.id);
        
        const pAcceptanceTotal = acceptances
          .filter(a => {
            const matchProject = a.projectId === p.id;
            const matchMonth = reportMonths.length === 0 || reportMonths.includes(normalizeMonth(a.month));
            const aTeamName = resolveTeamName(a.teamId, a.teamName);
            return matchProject && aTeamName === team && matchMonth;
          })
          .reduce((acc, curr) => {
            const val = curr.status === 'ÄÃ£ nghiá»‡m thu' ? (curr.afterAcceptanceCost || 0) : 0;
            return acc + val;
          }, 0);

        let pTotalBudget = pBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        if (chartTimeType === 'week' && reportWeek !== 'all') pTotalBudget = pTotalBudget / 4;

        let pRevenue = efficiencyReports
          .filter(r => r.projectId === p.id && resolveTeamName(r.teamId, r.teamName) === team && (reportMonths.length === 0 || reportMonths.includes(r.month)))
          .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

        if (chartTimeType === 'week' && reportWeek !== 'all') pRevenue = pRevenue / 4;

        return {
          name: p.name,
          budget: pTotalBudget,
          actual: pAcceptanceTotal,
          revenue: pRevenue
        };
      }).filter(d => d.budget > 0 || d.actual > 0)
        .sort((a, b) => (b[reportSortBy] || 0) - (a[reportSortBy] || 0));

      const teamTotalCost = teamProjectDetails.reduce((sum, d) => sum + d.actual, 0);
      const teamRevenue = teamProjectDetails.reduce((sum, d) => sum + d.revenue, 0);
      
      return {
        name: team,
        budget: teamTotalBudget,
        actual: teamTotalCost,
        revenue: teamRevenue,
        details: teamProjectDetails,
        isTeamReport: true
      };
    }).filter(d => d.budget > 0 || d.actual > 0)
      .sort((a, b) => b[reportSortBy] - a[reportSortBy]);
  }, [uniqueTeams, budgets, acceptances, reportTeam, reportProject, reportMonths, reportRegion, reportType, projects, chartTimeType, reportWeek, getMarketingMonth, reportSortBy, teamMap, efficiencyReports, resolveTeamName, resolveProjectName]);

  const efficiencyChartData = useMemo(() => {
    if (!isReportsActive) return [];
    const rawData: { [key: string]: { [detailKey: string]: { budget: number, cost: number, revenue: number, sales: number } } } = {};

    const getTarget = (mainKey: string, detailKey: string) => {
      if (!mainKey || !detailKey) return null;
      if (!rawData[mainKey]) rawData[mainKey] = {};
      if (!rawData[mainKey][detailKey]) rawData[mainKey][detailKey] = { budget: 0, cost: 0, revenue: 0, sales: 0 };
      return rawData[mainKey][detailKey];
    };

    budgets.forEach(b => {
      if (reportMonths.length > 0 && !reportMonths.includes(b.month)) return;
      
      const bProjectName = resolveProjectName(b.projectId, b.projectName);
      const bTeamName = resolveTeamName(b.teamId, b.teamName);

      if (reportProject !== 'all' && b.projectId !== reportProject && bProjectName !== projectMap[reportProject]) return;
      if (reportTeam !== 'all' && bTeamName !== reportTeam) return;

      const bProject = projects.find(p => p.id === b.projectId || p.name === bProjectName);
      if (reportRegion !== 'all' && (bProject?.region || 'KhÃ¡c') !== reportRegion) return;
      if (reportType !== 'all' && (bProject?.type || 'KhÃ¡c') !== reportType) return;
      
      const bRegion = bProject?.region || 'KhÃ¡c';
      const bTeamIdOrName = bTeamName;
      
      let mainKey, detailKey;
      if (efficiencyGroupType === 'project') {
        mainKey = bProjectName;
        detailKey = bTeamIdOrName;
      } else if (efficiencyGroupType === 'region') {
        mainKey = bRegion;
        detailKey = bProjectName;
      } else {
        mainKey = bTeamIdOrName;
        detailKey = bProjectName;
      }
      
      const target = getTarget(mainKey, detailKey);
      if (target) {
        let amount = b.amount || 0;
        if (chartTimeType === 'week' && reportWeek !== 'all') {
          amount = amount / 4;
        }
        target.budget += amount;
      }
    });

    acceptances.forEach(a => {
      const normalizedAMonth = normalizeMonth(a.month);
      if (reportMonths.length > 0 && !reportMonths.includes(normalizedAMonth)) return;
      
      const aProjectName = resolveProjectName(a.projectId, a.projectName);
      const aTeamName = resolveTeamName(a.teamId, a.teamName);

      if (reportProject !== 'all' && a.projectId !== reportProject && aProjectName !== projectMap[reportProject]) return;
      if (reportTeam !== 'all' && aTeamName !== reportTeam) return;

      const aProject = projects.find(p => p.id === a.projectId || p.name === aProjectName);
      if (reportRegion !== 'all' && (aProject?.region || 'KhÃ¡c') !== reportRegion) return;
      if (reportType !== 'all' && (aProject?.type || 'KhÃ¡c') !== reportType) return;
      
      const aRegion = aProject?.region || 'KhÃ¡c';
      const aTeamIdOrName = aTeamName;
      
      let mainKey, detailKey;
      if (efficiencyGroupType === 'project') {
        mainKey = aProjectName;
        detailKey = aTeamIdOrName;
      } else if (efficiencyGroupType === 'region') {
        mainKey = aRegion;
        detailKey = aProjectName;
      } else {
        mainKey = aTeamIdOrName;
        detailKey = aProjectName;
      }

      const target = getTarget(mainKey, detailKey);
      if (target) {
        const costValue = a.status === 'ÄÃ£ nghiá»‡m thu' ? (a.afterAcceptanceCost || 0) : 0;
        target.cost += costValue;
      }
    });

    // We keep costs for historical data before April 2026 if requested, 
    // but the prompt says "starting from April, take from acceptance". 
    // This usually means and standardizing the report on the new source.
    // If we need both, we'd filter costs by normalizedMonth < "2026-04".
    // For now I'll stick to the acceptance source as it's the new requirement for this report.

    efficiencyReports.forEach(r => {
      if (reportMonths.length > 0 && !reportMonths.includes(r.month)) return;
      
      const rProjectName = resolveProjectName(r.projectId, r.projectName);
      const rTeamName = resolveTeamName(r.teamId, r.teamName);

      if (reportProject !== 'all' && r.projectId !== reportProject && rProjectName !== projectMap[reportProject]) return;
      if (reportTeam !== 'all' && rTeamName !== reportTeam) return;

      const rProject = projects.find(p => p.id === r.projectId || p.name === rProjectName);
      if (reportRegion !== 'all' && (rProject?.region || 'KhÃ¡c') !== reportRegion) return;
      if (reportType !== 'all' && (rProject?.type || 'KhÃ¡c') !== reportType) return;
      
      const rRegion = rProject?.region || 'KhÃ¡c';
      const rTeamIdOrName = rTeamName;

      let mainKey, detailKey;
      if (efficiencyGroupType === 'project') {
        mainKey = rProjectName;
        detailKey = rTeamIdOrName;
      } else if (efficiencyGroupType === 'region') {
        mainKey = rRegion;
        detailKey = rProjectName;
      } else {
        mainKey = rTeamIdOrName;
        detailKey = rProjectName;
      }

      const target = getTarget(mainKey, detailKey);
      if (target) {
        let rev = r.revenue || 0;
        let sales = r.salesCount || 0;
        if (chartTimeType === 'week' && reportWeek !== 'all') {
          rev = rev / 4;
          sales = sales / 4;
        }
        target.sales += sales;
        target.revenue += rev;
      }
    });

    return Object.keys(rawData).map(mainKey => {
      const details = Object.keys(rawData[mainKey]).map(detailKey => {
        return {
          name: detailKey,
          ...rawData[mainKey][detailKey]
        };
      }).sort((a, b) => {
        if (reportSortBy === 'budget') return b.budget - a.budget;
        if (reportSortBy === 'actual') return b.cost - a.cost;
        return b.revenue - a.revenue || b.cost - a.cost;
      });

      const totals = details.reduce((acc, curr) => ({
        sales: acc.sales + curr.sales,
        revenue: acc.revenue + curr.revenue,
        cost: acc.cost + curr.cost,
        budget: acc.budget + curr.budget
      }), { sales: 0, revenue: 0, cost: 0, budget: 0 });

      return {
        id: mainKey,
        name: mainKey,
        ...totals,
        details
      };
    }).sort((a, b) => {
      if (reportSortBy === 'budget') return b.budget - a.budget;
      if (reportSortBy === 'actual') return b.cost - a.cost;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.cost - a.cost;
    });
  }, [efficiencyReports, acceptances, budgets, reportMonths, reportProject, reportTeam, efficiencyGroupType, projectMap, projects, chartTimeType, reportWeek, getMarketingMonth, reportSortBy, reportRegion, reportType, resolveProjectName, resolveTeamName, isReportsActive, activeTab]);

  const salesGeneratingData = useMemo(() => 
    efficiencyChartData.filter(d => d.revenue > 0), [efficiencyChartData]
  );

  const noSalesData = useMemo(() => 
    efficiencyChartData.filter(d => d.revenue === 0), [efficiencyChartData]
  );

  const reportSummaryStats = useMemo(() => {
    const budget = efficiencyChartData.reduce((acc, d) => acc + d.budget, 0);
    const cost = efficiencyChartData.reduce((acc, d) => acc + d.cost, 0);
    const sales = efficiencyChartData.reduce((acc, d) => acc + d.sales, 0);
    const revenue = efficiencyChartData.reduce((acc, d) => acc + d.revenue, 0);
    
    // Calculate accurate project count based on filters including team
    const projectsWithData = new Set();
    
    // If we have a specific team filter, we need to know which projects they are in
    // Or we can just use the project IDs present in efficiencyChartData if we are grouping by project
    // But efficiencyChartData is grouped by efficiencyGroupType.
    
    // Let's use a more direct approach: find projects that match project/region/type filters 
    // AND have at least one record matching the team filter (if team is not 'all')
    const filteredProjects = projects.filter(p => {
      const matchProject = reportProject === 'all' || p.id === reportProject;
      const matchRegion = reportRegion === 'all' || p.region === reportRegion;
      const matchType = reportType === 'all' || p.type === reportType;
      
      if (!matchProject || !matchRegion || !matchType) return false;
      
      if (reportTeam !== 'all') {
        // Check if this project has any engagement with the selected team
        const hasTeamData = budgets.some(b => b.projectId === p.id && resolveTeamName(b.teamId, b.teamName) === reportTeam) ||
                           acceptances.some(a => a.projectId === p.id && resolveTeamName(a.teamId, a.teamName) === reportTeam) ||
                           efficiencyReports.some(r => r.projectId === p.id && resolveTeamName(r.teamId, r.teamName) === reportTeam);
        return hasTeamData;
      }
      
      return true;
    });

    return {
      projectCount: filteredProjects.length,
      budget,
      cost,
      sales,
      revenue
    };
  }, [efficiencyChartData, projects, reportProject, reportRegion, reportType, reportTeam, budgets, acceptances, efficiencyReports, resolveTeamName]);

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWebView, setIsWebView] = useState(false);
  const [showAuthHelper, setShowAuthHelper] = useState(false);

  useEffect(() => {
    if (isWebView) {
      setShowAuthHelper(true);
    }
  }, [isWebView]);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);

    // Detect if opened inside Zalo or FB Messenger/In-app browser
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isZaloBrowser = /Zalo/i.test(ua);
      const isFB = /FBAN|FBAV|Messenger/i.test(ua);
      const isInstagram = /Instagram/i.test(ua);
      const isOtherWebview = /WebView|iPod|iPad|iPhone|Android/i.test(ua) && ((/wv/i.test(ua) || ua.includes('Version/')) && !/Safari|Chrome/i.test(ua));
      setIsWebView(isZaloBrowser || isFB || isInstagram || isOtherWebview);
    }

    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const getActiveTabLabel = (tab: string) => {
    switch (tab) {
      case 'home': return 'Trang chá»§';
      case 'admin': return 'Quáº£n trá»‹';
      case 'block-mgmt': return 'Quáº£n lÃ½ Khá»‘i';
      case 'team-mgmt': return 'Quáº£n lÃ½ PhÃ²ng Kinh doanh';
      case 'register': return 'ÄÄƒng kÃ½ MKT';
      case 'actual': return 'Cáº­p nháº­t Chi phÃ­';
      case 'mkt-efficiency': return 'Hiá»‡u quáº£ MKT';
      case 'history': return 'Lá»‹ch sá»­';
      case 'report-nt': return 'Nghiá»‡m thu MKT';
      case 'support': return 'Há»— trá»£';
      default: return '';
    }
  };

  const getBlockDisplayName = useCallback((block: any) => {
    if (!block) return '';
    const name = block.name || '';
    const code = block.blockCode || '';
    const isFirestoreId = /^[a-zA-Z0-9]{20}$/.test(name) || /^[a-zA-Z0-9]{20}$/.test(code);
    if (!name || isFirestoreId) {
      return code ? `Khá»‘i ${code}` : 'Khá»‘i chÆ°a Ä‘áº·t tÃªn';
    }
    return name;
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          setIsScrolled(currentScrollY > 15);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Tá»± Ä‘á»™ng Ä‘Ã³ng menu di Ä‘á»™ng khi chuyá»ƒn Ä‘á»•i tab
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  const dashboardStats = useMemo(() => {
    if (activeTab === 'reports' || (activeTab === 'admin' && adminSubTab === 'reports')) {
      let monthText = 'Táº¤T Cáº¢';
      if (reportMonths.length === 1) {
        monthText = `HÃ€ Ná»˜I ${reportMonths[0].split('-')[1]}`;
      } else if (reportMonths.length > 1) {
        monthText = `${reportMonths.length} THÃNG`;
      }

      return {
        projectCount: reportSummaryStats.projectCount,
        budget: reportSummaryStats.budget,
        cost: reportSummaryStats.cost,
        sales: reportSummaryStats.sales,
        revenue: reportSummaryStats.revenue,
        isContextual: true,
        monthLabel: `(THÃNG ${monthText})`
      };
    }

    if (activeTab === 'doc-processing') {
      const budget = groupedDocProcessing.reduce((acc: number, d: any) => acc + (d.budget || 0), 0);
      const cost = groupedDocProcessing.reduce((acc: number, d: any) => acc + (d.totalAmount || 0), 0);
      const projectIds = new Set(groupedDocProcessing.map((d: any) => d.projectId));
      
      return {
        projectCount: projectIds.size,
        budget: budget || 0,
        cost: cost || 0,
        sales: 0,
        revenue: 0,
        isContextual: true,
        monthLabel: '(Trong Äá»‘i soÃ¡t)'
      };
    }

    // Default "This Month" Stats
    const currentMonth = getMarketingMonth(new Date());
    
    // NgÃ¢n sÃ¡ch thÃ¡ng nÃ y
    const budgetTotal = budgets
      .filter(b => {
        const matchMonth = b.month === currentMonth;
        if (!isAdmin && !isMod && !isAccountant && !isGDDA) {
          const userEmail = user?.email?.toLowerCase();
          const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
          return matchMonth && (budgetEmail === userEmail || b.createdBy === user?.uid);
        }
        return matchMonth;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Thá»±c táº¿ Ä‘Ã£ chi (ThÃ¡ng nÃ y) - Sá»­ dá»¥ng dá»¯ liá»‡u Nghiá»‡m thu
    const costTotal = acceptances
      .filter(a => {
        const matchMonth = normalizeMonth(a.month) === currentMonth;
        if (!isAdmin && !isMod && !isAccountant && !isGDDA) {
          const userEmail = user?.email?.toLowerCase();
          const aEmail = a.userEmail?.toLowerCase() || a.createdBy?.toLowerCase();
          return matchMonth && (aEmail === userEmail || a.createdByUid === user?.uid);
        }
        return matchMonth;
      })
      .reduce((acc, curr) => {
        const val = curr.status === 'ÄÃ£ nghiá»‡m thu' ? (curr.afterAcceptanceCost || 0) : 0;
        return acc + val;
      }, 0);

    // CÄƒn bÃ¡n (ThÃ¡ng nÃ y)
    const salesTotal = efficiencyReports
      .filter(r => {
        const matchMonth = r.month === currentMonth;
        if (!isAdmin && !isMod && !isAccountant && !isGDDA) {
          return matchMonth && r.createdByEmail?.toLowerCase() === user?.email?.toLowerCase();
        }
        return matchMonth;
      })
      .reduce((acc, curr) => acc + (curr.salesCount || 0), 0);

    // Doanh sá»‘ (ThÃ¡ng nÃ y)
    const revenueTotal = efficiencyReports
      .filter(r => {
        const matchMonth = r.month === currentMonth;
        if (!isAdmin && !isMod && !isAccountant && !isGDDA) {
          return matchMonth && r.createdByEmail?.toLowerCase() === user?.email?.toLowerCase();
        }
        return matchMonth;
      })
      .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

    return {
      projectCount: projects.length,
      budget: budgetTotal,
      cost: costTotal,
      sales: salesTotal,
      revenue: revenueTotal,
      isContextual: false,
      monthLabel: `(THÃNG HÃ€ Ná»˜I ${currentMonth.split('-')[1]})`
    };
  }, [activeTab, adminSubTab, reportSummaryStats, projects, budgets, latestCostsList, efficiencyReports, isAdmin, isMod, isAccountant, isGDDA, user, reportMonths, getMarketingMonth]);

  const efficiencyPieData = useMemo(() => {
    const costWithSales = salesGeneratingData.reduce((acc, curr) => acc + curr.cost, 0);
    const costWithoutSales = noSalesData.reduce((acc, curr) => acc + curr.cost, 0);
    
    return [
      { name: 'PhÃ¡t sinh doanh sá»‘', value: costWithSales, color: '#10b981' },
      { name: 'KhÃ´ng phÃ¡t sinh doanh sá»‘', value: costWithoutSales, color: '#f87171' }
    ];
  }, [salesGeneratingData, noSalesData]);

  const efficiencyTrendData = useMemo(() => {
    const monthlyMap: { [key: string]: { month: string, sales: number, revenue: number, cost: number, roi: number } } = {};
    const year = reportYear || new Date().getFullYear().toString();
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${year}-${m.toString().padStart(2, '0')}`;
      monthlyMap[monthStr] = { month: monthStr, sales: 0, revenue: 0, cost: 0, roi: 0 };
    }

    efficiencyReports.forEach(r => {
      if (!r.month || !r.month.startsWith(year)) return;
      const rProjectName = resolveProjectName(r.projectId, r.projectName);
      const rTeamName = resolveTeamName(r.teamId, r.teamName);
      if (reportProject !== 'all' && r.projectId !== reportProject && rProjectName !== projectMap[reportProject]) return;
      if (reportTeam !== 'all' && rTeamName !== reportTeam) return;
      if (monthlyMap[r.month]) {
        monthlyMap[r.month].sales += r.salesCount || 0;
        monthlyMap[r.month].revenue += r.revenue || 0;
      }
    });

    acceptances.forEach(a => {
      const aMonth = normalizeMonth(a.month);
      if (!aMonth || !aMonth.startsWith(year)) return;
      
      const aProjectName = resolveProjectName(a.projectId, a.projectName);
      const aTeamName = resolveTeamName(a.teamId, a.teamName);
      
      if (reportProject !== 'all' && a.projectId !== reportProject && aProjectName !== projectMap[reportProject]) return;
      if (reportTeam !== 'all' && aTeamName !== reportTeam) return;
      
      if (monthlyMap[aMonth]) {
        const costValue = a.status === 'ÄÃ£ nghiá»‡m thu' ? (a.afterAcceptanceCost || 0) : 0;
        monthlyMap[aMonth].cost += costValue;
      }
    });

    return Object.values(monthlyMap).map(m => ({
      ...m,
      roi: m.cost > 0 ? (m.revenue / m.cost) : 0
    }));
  }, [efficiencyReports, latestCostsList, reportYear, reportProject, reportTeam, getMarketingMonth, projectMap, resolveProjectName, resolveTeamName]);

  const pendingSupportCount = useMemo(() => {
    return supportRequests.filter((r: any) => r.status === 'Chá» xá»­ lÃ½').length;
  }, [supportRequests]);

  const menuItems = useMemo(() => {
    return [
      { value: 'home', label: 'Trang chá»§', icon: LayoutDashboard, color: 'text-indigo-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('home.view'), desc: 'Tá»•ng quan bÃ¡o cÃ¡o' },
      { value: 'admin', label: 'Quáº£n trá»‹ há»‡ thá»‘ng', icon: ShieldCheck, color: 'text-rose-600', activeBg: 'bg-slate-900', activeText: 'text-white font-black', visible: (hasPermission('admin.projects.view') || hasPermission('admin.teams.view') || hasPermission('admin.budgets.view') || hasPermission('admin.costs.view') || hasPermission('admin.users.view') || hasPermission('admin.permissions.edit')), desc: 'Cáº¥u hÃ¬nh dá»± Ã¡n, ngÃ¢n sÃ¡ch, nhÃ¢n sá»±' },
      { value: 'block-mgmt', label: 'Quáº£n lÃ½ Khá»‘i', icon: Building2, color: 'text-purple-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('block.view') || isGDKhoi || isTroLyKhoi || isAssistant, desc: 'Äá»“ng bá»™ & giÃ¡m sÃ¡t ngÃ¢n sÃ¡ch Khá»‘i' },
      { value: 'team-mgmt', label: 'Quáº£n lÃ½ PhÃ²ng KD', icon: Users, color: 'text-teal-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('team_mgmt.view'), desc: 'BÃ¡o cÃ¡o tÃ­ch lÅ©y, cÃ¡c tá»• Ä‘á»™i direct' },
      { value: 'register', label: 'ÄÄƒng kÃ½ MKT', icon: Wallet, color: 'text-emerald-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('register.view'), desc: 'Láº­p káº¿ hoáº¡ch phÃ¢n bá»• chi phÃ­ thÃ¡ng' },
      { value: 'history', label: 'Lá»‹ch sá»­ dÃ²ng tiá»n', icon: History, color: 'text-slate-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('history.view'), desc: 'Tra cá»©u lá»‹ch sá»­ thu chi minh báº¡ch' },
      { value: 'report-nt', label: 'Nghiá»‡m thu MKT', icon: FileCheck, color: 'text-indigo-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('report_nt.view'), desc: 'Nghiá»‡m thu MKT tá»± Ä‘á»™ng láº¥y tá»« Google Sheet' },
      { value: 'support', label: 'Há»— trá»£ ká»¹ thuáº­t', icon: MessageCircle, color: 'text-blue-500', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('support.create') || hasPermission('support.resolve'), badge: pendingSupportCount, desc: 'YÃªu cáº§u há»— trá»£, pháº£n há»“i sá»± cá»‘' },
      { value: 'process-mkt', label: 'Quy trÃ¬nh MKT', icon: FileText, color: 'text-amber-500', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('process_mkt.create'), desc: 'Quáº£n lÃ½ quy trÃ¬nh chiáº¿n dá»‹ch Marketing' },
      { value: 'process-doiung', label: 'Quy trÃ¬nh Ä‘á»‘i á»©ng', icon: RefreshCw, color: 'text-violet-500', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('process_doiung.create'), desc: 'Quáº£n lÃ½ Ä‘á»‘i á»©ng & bÃ n giao' },
    ].filter(item => item.visible);
  }, [hasPermission, isGDKhoi, isTroLyKhoi, isAssistant, pendingSupportCount]);

  const adminFilteredBudgets = useMemo(() => {
    const getTime = (item: any) => {
      if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
      if (item.createdAt?.toMillis) return item.createdAt.toMillis();
      if (item.createdAt) return new Date(item.createdAt).getTime();
      if (item.updatedAt?.toDate) return item.updatedAt.toDate().getTime();
      if (item.updatedAt?.toMillis) return item.updatedAt.toMillis();
      if (item.updatedAt) return new Date(item.updatedAt).getTime();
      return 0;
    };

    // Helper to get or synthesize initial history for a budget record
    const getBudgetHistory = (b: any) => {
      if (b.editHistory && Array.isArray(b.editHistory) && b.editHistory.length > 0) {
        return b.editHistory;
      }
      const bAmt = Number(b.amount || 0);
      const editor = b.implementerName || b.userEmail || b.createdByEmail || 'ChÆ°a rÃµ';
      const timeStr = b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : (b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString());
      return [{
        action: 'REGISTER',
        editorName: editor,
        editorEmail: b.userEmail || b.createdByEmail || '',
        timestamp: timeStr,
        amount: bAmt,
        note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u: ${bAmt.toLocaleString()}Ä‘`
      }];
    };

    // Group budgets by (projectId, teamId, month) and sum amounts for duplicate project entries of a team
    const latestBudgetsMap = new Map<string, any>();
    budgets.forEach(b => {
      const projName = resolveProjectName(b.projectId, b.projectName) || projectMap[b.projectId] || b.projectName || b.projectId || '';
      const teamNameStr = resolveTeamName(b.teamId, b.teamName) || teamMap[b.teamId] || b.teamName || b.teamId || '';
      const pKey = projName.trim().toLowerCase();
      const tKey = normalizeTeamName(teamNameStr).trim().toLowerCase();
      const mKey = normalizeMonth(b.month || '');
      const key = `${pKey}_${tKey}_${mKey}`;

      const existing = latestBudgetsMap.get(key);
      const bAmount = Number(b.amount || 0);
      const bHist = getBudgetHistory(b);

      if (!existing) {
        latestBudgetsMap.set(key, { 
          ...b, 
          amount: bAmount,
          projectName: projName,
          teamName: teamNameStr,
          month: mKey,
          editHistory: bHist
        });
      } else {
        // Keep the latest item metadata, but SUM amounts & COMBINE history of duplicate records for the same team + project + month
        const baseItem = getTime(b) > getTime(existing) ? { ...b } : { ...existing };
        const combinedHist = [...(existing.editHistory || []), ...bHist];
        combinedHist.sort((x: any, y: any) => new Date(x.timestamp || 0).getTime() - new Date(y.timestamp || 0).getTime());

        latestBudgetsMap.set(key, {
          ...baseItem,
          amount: Number(existing.amount || 0) + bAmount,
          projectName: projName,
          teamName: teamNameStr,
          month: mKey,
          editHistory: combinedHist
        });
      }
    });

    const uniqueBudgets = Array.from(latestBudgetsMap.values());

    const filtered = uniqueBudgets.filter(b => {
      const bTeamName = resolveTeamName(b.teamId, b.teamName) || teamMap[b.teamId] || b.teamName || '';
      const bProjName = resolveProjectName(b.projectId, b.projectName) || projectMap[b.projectId] || b.projectName || '';
      const matchesSearch = 
        bProjName.toLowerCase().includes(debouncedAdminBudgetSearch.toLowerCase()) ||
        bTeamName.toLowerCase().includes(debouncedAdminBudgetSearch.toLowerCase()) ||
        (b.implementerName || '').toLowerCase().includes(debouncedAdminBudgetSearch.toLowerCase());
      const matchesMonth = !adminBudgetMonthFilter || normalizeMonth(b.month) === normalizeMonth(adminBudgetMonthFilter);
      return matchesSearch && matchesMonth;
    });

    return filtered.sort((a, b) => {
      const factor = adminBudgetSort.direction === 'asc' ? 1 : -1;

      switch (adminBudgetSort.key) {
        case 'project': {
          const pA = (projectMap[a.projectId] || a.projectName || '').toLowerCase();
          const pB = (projectMap[b.projectId] || b.projectName || '').toLowerCase();
          return pA.localeCompare(pB, 'vi') * factor;
        }
        case 'team': {
          const tA = (teamMap[a.teamId] || a.teamName || '').toLowerCase();
          const tB = (teamMap[b.teamId] || b.teamName || '').toLowerCase();
          return tA.localeCompare(tB, 'vi') * factor;
        }
        case 'teamCode': {
          const tcA = (teams.find((t: any) => t.id === a.teamId || t.name === (teamMap[a.teamId] || a.teamName))?.teamCode || '').toLowerCase();
          const tcB = (teams.find((t: any) => t.id === b.teamId || t.name === (teamMap[b.teamId] || b.teamName))?.teamCode || '').toLowerCase();
          return tcA.localeCompare(tcB, 'vi') * factor;
        }
        case 'gdkd': {
          const gA = extractGDKD(teamMap[a.teamId] || a.teamName || '').toLowerCase();
          const gB = extractGDKD(teamMap[b.teamId] || b.teamName || '').toLowerCase();
          return gA.localeCompare(gB, 'vi') * factor;
        }
        case 'implementer': {
          const iA = (a.implementerName || '').toLowerCase();
          const iB = (b.implementerName || '').toLowerCase();
          return iA.localeCompare(iB, 'vi') * factor;
        }
        case 'month': {
          const mA = `${a.month || ''}-W${a.weekNumber || 0}`;
          const mB = `${b.month || ''}-W${b.weekNumber || 0}`;
          return mA.localeCompare(mB) * factor;
        }
        case 'amount': {
          return ((a.amount || 0) - (b.amount || 0)) * factor;
        }
        case 'baoCaoNT': {
          const valA = baoCaoNTMap[a.id] || 0;
          const valB = baoCaoNTMap[b.id] || 0;
          return (valA - valB) * factor;
        }
        case 'rate': {
          const rateA = a.amount > 0 ? ((baoCaoNTMap[a.id] || 0) / a.amount) : 0;
          const rateB = b.amount > 0 ? ((baoCaoNTMap[b.id] || 0) / b.amount) : 0;
          return (rateA - rateB) * factor;
        }
        case 'createdAt':
        default: {
          const getTime = (item: any) => {
            if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
            if (item.createdAt?.toMillis) return item.createdAt.toMillis();
            if (item.createdAt) return new Date(item.createdAt).getTime();
            return 0;
          };
          return (getTime(a) - getTime(b)) * factor;
        }
      }
    });
  }, [budgets, debouncedAdminBudgetSearch, adminBudgetMonthFilter, projectMap, teamMap, teams, baoCaoNTMap, adminBudgetSort]);

  const paginatedAdminFilteredBudgets = useMemo(() => {
    const start = (budgetPage - 1) * 20;
    return (adminFilteredBudgets || []).slice(start, start + 20);
  }, [adminFilteredBudgets, budgetPage]);

  const unbudgetedAcceptances = useMemo(() => {
    const isBudgetsViewActive = activeTab === 'budgets' || (activeTab === 'admin' && (adminSubTab === 'budgets' || adminSubTab === 'unbudgeted'));
    if (!isBudgetsViewActive) return [];
    // 1. Map registered budget amounts by (teamKey, projectKey, monthKey)
    const budgetAmountsMap: Record<string, number> = {};

    budgets.forEach(b => {
      const bTeamName = resolveTeamName(b.teamId, b.teamName) || teamMap[b.teamId] || b.teamName || '';
      const bProjName = resolveProjectName(b.projectId, b.projectName) || projectMap[b.projectId] || b.projectName || '';
      const tKey = normalizeTeamName(bTeamName).trim().toLowerCase();
      const pKey = bProjName.trim().toLowerCase();
      const mKey = normalizeMonth(b.month || '');

      if (tKey && pKey && mKey) {
        const key = `${tKey}|${pKey}|${mKey}`;
        budgetAmountsMap[key] = (budgetAmountsMap[key] || 0) + (Number(b.amount) || 0);
      }
    });

    // 2. Group acceptances by (teamKey, projectKey, monthKey)
    const acceptanceGroups: Record<string, {
      teamId?: string;
      teamName: string;
      teamCode?: string;
      projectId?: string;
      projectName: string;
      month: string;
      acceptanceCost: number;
      count: number;
    }> = {};

    // Combine acceptances and finalAcceptances cleanly without duplicate IDs
    const allAcceptancesList: any[] = [];
    const seenIds = new Set<string>();
    (acceptances || []).forEach(a => {
      if (a && a.id && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        allAcceptancesList.push(a);
      }
    });
    (finalAcceptances || []).forEach(fa => {
      if (fa && fa.id && !seenIds.has(fa.id)) {
        seenIds.add(fa.id);
        allAcceptancesList.push(fa);
      }
    });

    allAcceptancesList.forEach(a => {
      const aTeamName = resolveTeamName(a.teamId, a.teamName) || teamMap[a.teamId] || a.teamName || '';
      const aProjName = resolveProjectName(a.projectId, a.projectName) || projectMap[a.projectId] || a.projectName || '';
      const tKey = normalizeTeamName(aTeamName).trim().toLowerCase();
      const pKey = aProjName.trim().toLowerCase();
      const mKey = normalizeMonth(a.month || '');

      const costValue = getAcceptanceCostValue(a);

      if (tKey && pKey && mKey && costValue > 0) {
        const key = `${tKey}|${pKey}|${mKey}`;
        const teamObj = teams.find((t: any) => t.id === a.teamId || normalizeTeamName(t.name).toLowerCase() === tKey);
        const resolvedTeamName = teamObj?.name || aTeamName || tKey.toUpperCase();
        const resolvedTeamCode = teamObj?.teamCode || a.teamCode || normalizeTeamCode(extractTeamCode(resolvedTeamName));

        if (!acceptanceGroups[key]) {
          acceptanceGroups[key] = {
            teamId: a.teamId,
            teamName: resolvedTeamName,
            teamCode: resolvedTeamCode,
            projectId: a.projectId,
            projectName: aProjName || pKey.toUpperCase(),
            month: mKey,
            acceptanceCost: 0,
            count: 0
          };
        }
        acceptanceGroups[key].acceptanceCost += costValue;
        acceptanceGroups[key].count += 1;
      }
    });

    // 3. Filter groups where acceptanceCost > 0 but registered budget <= 0
    const result: Array<{
      id: string;
      teamId?: string;
      teamName: string;
      teamCode?: string;
      projectId?: string;
      projectName: string;
      month: string;
      acceptanceCost: number;
      budgetAmount: number;
      count: number;
    }> = [];

    Object.entries(acceptanceGroups).forEach(([key, item]) => {
      const budgetAmt = budgetAmountsMap[key] || 0;
      if (budgetAmt <= 0) {
        result.push({
          id: key,
          ...item,
          budgetAmount: budgetAmt
        });
      }
    });

    // Sort by month desc, then projectName asc, then teamName asc
    result.sort((a, b) => {
      if (b.month !== a.month) return b.month.localeCompare(a.month);
      if (a.projectName !== b.projectName) return a.projectName.localeCompare(b.projectName, 'vi');
      return a.teamName.localeCompare(b.teamName, 'vi');
    });

    return result;
  }, [acceptances, budgets, resolveTeamName, resolveProjectName, teamMap, projectMap, teams]);

  const filteredUnbudgetedAcceptances = useMemo(() => {
    const q = (debouncedAdminBudgetSearch || '').toLowerCase().trim();
    return unbudgetedAcceptances.filter(item => {
      const matchesSearch = 
        !q ||
        (item.projectName || '').toLowerCase().includes(q) ||
        (item.teamName || '').toLowerCase().includes(q) ||
        (item.teamCode || '').toLowerCase().includes(q) ||
        extractGDKD(item.teamName || '').toLowerCase().includes(q);
      
      const matchesMonth = !adminBudgetMonthFilter || normalizeMonth(item.month) === normalizeMonth(adminBudgetMonthFilter);
      return matchesSearch && matchesMonth;
    });
  }, [unbudgetedAcceptances, debouncedAdminBudgetSearch, adminBudgetMonthFilter]);

  const paginatedUnbudgetedAcceptances = useMemo(() => {
    const start = (unbudgetedPage - 1) * 20;
    return (filteredUnbudgetedAcceptances || []).slice(start, start + 20);
  }, [filteredUnbudgetedAcceptances, unbudgetedPage]);

  const adminFilteredCosts = useMemo(() => {
    return costs
      .filter(c => {
        const matchesSearch = 
          (projectMap[c.projectId] || c.projectName || '').toLowerCase().includes(debouncedAdminCostSearch.toLowerCase()) ||
          (teamMap[c.teamId] || c.teamName || '').toLowerCase().includes(debouncedAdminCostSearch.toLowerCase()) ||
          (c.implementerName || '').toLowerCase().includes(debouncedAdminCostSearch.toLowerCase());
        
        const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
        const matchesMonth = !adminCostMonthFilter || (costDate && getMarketingMonth(costDate) === adminCostMonthFilter);
        
        return matchesSearch && matchesMonth;
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
  }, [costs, debouncedAdminCostSearch, adminCostMonthFilter, projectMap, teamMap, getMarketingMonth]);

  const paginatedAdminFilteredCosts = useMemo(() => {
    const start = (costPage - 1) * 20;
    return (adminFilteredCosts || []).slice(start, start + 20);
  }, [adminFilteredCosts, costPage]);

  const isProjectKey = useCallback((key: string) => {
    const k = key.toLowerCase();
    return k.includes('dá»± Ã¡n') || k.includes('project') || k.includes('tÃªn');
  }, []);

  const isMoneyKey = useCallback((key: string) => {
    const k = key.toLowerCase();
    return k.includes('tiá»n') || k.includes('vnÄ‘') || k.includes('vnd') || k.includes('chi') || k.includes('lÆ°á»£ng') || k.includes('giÃ¡') || k.includes('cost') || k.includes('budget') || k.includes('amount');
  }, []);

  const formatNTValue = useCallback((val: any) => {
    if (val === undefined || val === null) return '-';
    const strVal = String(val).trim();
    if (!strVal) return '-';

    const cleanStr = strVal.replace(/\s+/g, '');
    
    if (/^-?\d+$/.test(cleanStr)) {
      return cleanStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    } else if (/^-?\d+\.\d+$/.test(cleanStr)) {
      const parts = cleanStr.split('.');
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${integerPart},${parts[1]}`;
    } else if (/^-?\d+,\d+$/.test(cleanStr)) {
      const parts = cleanStr.split(',');
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${integerPart},${parts[1]}`;
    }

    let formattedStr = strVal;
    formattedStr = formattedStr.replace(/\b\d{4,}\b/g, (match) => {
      return match.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    });

    return formattedStr;
  }, []);

  const handleToggleSortNT = (headerKey: string) => {
    if (ntSortField !== headerKey) {
      setNtSortField(headerKey);
      setNtSortDirection('asc');
    } else if (ntSortDirection === 'asc') {
      setNtSortDirection('desc');
    } else if (ntSortDirection === 'desc') {
      setNtSortDirection('none');
      setNtSortField(null);
    } else {
      setNtSortField(headerKey);
      setNtSortDirection('asc');
    }
  };

  const filteredNTRecords = useMemo(() => {
    if (!reportNTRecords) return [];
    
    // First, filter based on search query
    let result = [...reportNTRecords];
    if (reportNTSearch) {
      const q = reportNTSearch.toLowerCase().trim();
      result = result.filter(rec => {
        return Object.entries(rec).some(([key, val]) => {
          if (key === 'id_row') return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // Next, apply sorting if fields and direction are defined
    if (ntSortField && ntSortDirection !== 'none') {
      result.sort((a, b) => {
        let valA = a[ntSortField];
        let valB = b[ntSortField];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        // If both values are numeric or represent money numbers, we should parse them cleanly
        const cleanA = String(valA).replace(/[^0-9-]/g, '').trim();
        const cleanB = String(valB).replace(/[^0-9-]/g, '').trim();
        const numA = Number(cleanA);
        const numB = Number(cleanB);

        const isNumA = cleanA !== '' && !isNaN(numA);
        const isNumB = cleanB !== '' && !isNaN(numB);

        if (isNumA && isNumB) {
          return ntSortDirection === 'asc' ? numA - numB : numB - numA;
        }

        // Fallback to Vietnamese string locale comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return ntSortDirection === 'asc'
          ? strA.localeCompare(strB, 'vi', { sensitivity: 'base' })
          : strB.localeCompare(strA, 'vi', { sensitivity: 'base' });
      });
    }

    return result;
  }, [reportNTRecords, reportNTSearch, ntSortField, ntSortDirection]);

  const ntPageSize = 20;
  const totalNtPages = Math.ceil((filteredNTRecords?.length || 0) / ntPageSize) || 1;
  const paginatedNTRecords = useMemo(() => {
    if (!filteredNTRecords) return [];
    const start = (ntPage - 1) * ntPageSize;
    return filteredNTRecords.slice(start, start + ntPageSize);
  }, [filteredNTRecords, ntPage]);

  useEffect(() => {
    setNtPage(1);
  }, [reportNTSearch]);

  const getWeekRange = (weekStr: string) => {
    if (!weekStr) return '';
    try {
      const [year, week] = weekStr.split('-W').map(Number);
      const d = new Date(year, 0, 1);
      const dayNum = d.getDay() || 7;
      if (dayNum <= 4) d.setDate(d.getDate() - d.getDay() + 1);
      else d.setDate(d.getDate() + 8 - d.getDay());
      const monday = new Date(d.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
      return `${safeFormat(monday, 'dd/MM')} - ${safeFormat(sunday, 'dd/MM')}`;
    } catch (e) {
      return '';
    }
  };



  const getReportingPeriod = (monthStr: string) => {
    if (!monthStr) return '';
    try {
      const [year, month] = monthStr.split('-').map(Number);
      // Month M is 21/(M-1) - 20/M
      const endDate = new Date(year, month - 1, 20);
      const startDate = new Date(year, month - 2, 21);
      return `( ${format(startDate, 'd/M')} - ${format(endDate, 'd/M')} )`;
    } catch (e) {
      return '';
    }
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    // The current marketing month could be the "next" calendar month if we are past the 21st
    const currentM = getMarketingMonth(now);
    const [y, m] = currentM.split('-').map(Number);
    
    // Show current month and next 5 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(y, m - 1 + i, 1);
      const val = format(d, 'yyyy-MM');
      options.push({
        value: val,
        label: getMarketingMonthDisplayRange(val)
      });
    }
    return options;
  };

  const getChartColor = (index: number) => {
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    return colors[index % colors.length];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumberWithCommas = (value: string | number) => {
    if (value === undefined || value === null || value === '') return '';
    const stringValue = value.toString().replace(/\./g, '');
    return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleNumberInputChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\./g, '');
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      setter(rawValue);
    }
  };



  const EfficiencyDetailedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const roi = data.cost > 0 ? (data.revenue / data.cost).toFixed(2) : '0';
      const isOverBudget = data.cost > data.budget;
      const usagePercent = data.budget > 0 ? (data.cost / data.budget) * 100 : 0;

      return (
        <div className="bg-white p-5 rounded-[24px] shadow-2xl border border-slate-100 min-w-[340px] space-y-4 animate-in fade-in zoom-in duration-200">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{label}</p>
            </div>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[8px] font-black uppercase">Hiá»‡u quáº£ ká»³ nÃ y</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Wallet className="w-2.5 h-2.5" /> NgÃ¢n sÃ¡ch
              </p>
              <p className="text-xs font-black text-slate-700 font-mono">{formatCurrency(data.budget)}</p>
            </div>
            <div className={`space-y-1 p-3 rounded-2xl border ${isOverBudget ? 'bg-red-50 border-red-100' : 'bg-slate-50/50 border-slate-100/50'}`}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5" /> Chi phÃ­
              </p>
              <p className={`text-xs font-black font-mono ${isOverBudget ? 'text-red-600' : 'text-slate-700'}`}>
                {formatCurrency(data.cost)}
              </p>
              {isOverBudget && <p className="text-[8px] font-bold text-red-500 italic">VÆ°á»£t {usagePercent.toFixed(0)}%</p>}
            </div>
          </div>

          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-400/30 pb-2">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest">Sáº£n lÆ°á»£ng bÃ¡n</p>
                <p className="text-lg font-black text-white leading-none">{data.sales || 0} <span className="text-[10px] font-bold opacity-80 uppercase">CÄƒn</span></p>
              </div>
              <div className="h-8 w-[1px] bg-indigo-400/30" />
              <div className="space-y-0.5 text-right">
                <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest">Doanh sá»‘</p>
                <p className="text-sm font-black text-white leading-none">{formatCurrency(data.revenue || 0)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-indigo-100 uppercase tracking-widest opacity-80">ROI (Doanh thu/Vá»‘n)</p>
                  <p className="text-xs font-black text-white uppercase">{roi}x láº§n</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-md">
                <p className="text-[9px] font-black text-white">{data.cost > 0 ? ((data.revenue/data.cost)*100).toFixed(0) : 0}% Lá»£i Ä‘iá»ƒm</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
              {efficiencyGroupType === 'team' ? 'ThÃ nh pháº§n (Xáº¿p theo Doanh sá»‘)' : 'Äá»™i ngÅ© triá»ƒn khai (Xáº¿p theo Doanh sá»‘)'}
            </p>
            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {data.details.map((d: any, i: number) => (
                <div key={i} className="flex flex-col p-2.5 rounded-lg border border-slate-100 bg-slate-50/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[10px] uppercase tracking-tight">{d.name}</span>
                    {d.sales > 0 && (
                      <Badge variant="secondary" className="h-4 text-[7px] font-black px-1.5 bg-emerald-50 text-emerald-600 border-none">{d.sales} cÄƒn</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
                    <div className="flex justify-between border-r border-slate-100 pr-2">
                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Doanh sá»‘:</span>
                      <span className="font-black text-emerald-600 font-mono">{formatCurrency(d.revenue)}</span>
                    </div>
                    <div className="flex justify-between pl-1">
                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Chi phÃ­:</span>
                      <span className={`font-mono font-black ${(d.budget > 0 && d.cost > d.budget) ? 'text-red-600' : 'text-slate-600'}`}>
                        {formatCurrency(d.cost)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const budget = payload.find((p: any) => p.dataKey === 'budget' || p.name === 'NgÃ¢n sÃ¡ch')?.value || 0;
      const actual = payload.find((p: any) => p.dataKey === 'actual' || p.name === 'Chi phÃ­' || p.name === 'Thá»±c chi')?.value || 0;
      const revenue = payload.find((p: any) => p.dataKey === 'revenue' || p.name === 'Doanh sá»‘')?.value || 0;
      const details = payload[0]?.payload?.details || [];
      const isTeamReport = payload[0]?.payload?.isTeamReport;
      const isProjectReport = payload[0]?.payload?.isProjectReport;
      
      const usagePercent = budget > 0 ? (actual / budget) * 100 : 0;
      const variancePercent = budget > 0 ? ((actual / budget) - 1) * 100 : 0;
      
      const romi = actual > 0 ? (revenue / actual).toFixed(2) : '0';
      const costRatio = revenue > 0 ? ((actual / revenue) * 100).toFixed(1) : '0';

      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-slate-100 min-w-[320px] animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-100">
            <p className="text-sm font-bold text-slate-800">{label}</p>
            <div className="flex flex-col items-end">
              {revenue > 0 ? (
                <div className="flex flex-col items-end gap-0.5">
                  <Badge className="text-[10px] px-1.5 h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                    ROMI: {romi}x
                  </Badge>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">CP/Doanh sá»‘: {costRatio}%</span>
                </div>
              ) : (
                <>
                  <Badge variant={usagePercent > 100 ? "destructive" : usagePercent > 90 ? "secondary" : "default"} className="text-[10px] px-1.5 h-5">
                    SD: {usagePercent.toFixed(1)}%
                  </Badge>
                  <span className={`text-[9px] font-bold mt-1 ${Math.abs(variancePercent) < 0.1 ? 'text-slate-400' : variancePercent > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    CL: {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className={`grid ${revenue > 0 && budget > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pb-2`}>
              {budget > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NgÃ¢n sÃ¡ch</p>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(budget)}</p>
                </div>
              )}
              <div className={`space-y-1 ${!revenue && budget ? 'text-right' : ''}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chi phÃ­</p>
                <p className="text-sm font-bold text-emerald-600">{formatCurrency(actual)}</p>
              </div>
              {revenue > 0 && (
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doanh sá»‘</p>
                  <p className="text-sm font-bold text-indigo-600">{formatCurrency(revenue)}</p>
                </div>
              )}
            </div>

            {details.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{isTeamReport ? 'Chi tiáº¿t Dá»± Ã¡n' : isProjectReport ? 'Chi tiáº¿t Team' : 'Chi tiáº¿t'}</span>
                  {revenue > 0 && <span className="text-[9px] font-medium italic text-slate-400">Æ¯u tiÃªn theo doanh sá»‘</span>}
                </p>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {details.map((detail: any, i: number) => {
                    const dUsage = detail.budget > 0 ? (detail.actual / detail.budget) * 100 : 0;
                    const dRomi = detail.actual > 0 ? (detail.revenue / detail.actual).toFixed(1) : '0';
                    return (
                      <div key={i} className="flex flex-col text-[11px] p-1.5 rounded-lg bg-slate-50 border border-slate-100 group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-700 truncate mr-2" title={detail.name}>{detail.name}</span>
                          {detail.revenue > 0 ? (
                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1 rounded">R: {dRomi}x</span>
                          ) : (
                            <span className={`font-bold tabular-nums ${dUsage > 100 ? 'text-rose-500' : 'text-slate-500'}`}>
                              {dUsage.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 italic">CP:</span>
                            <span className="font-bold text-slate-800">{formatCurrency(detail.actual)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            {detail.revenue > 0 ? (
                              <>
                                <span className="text-slate-400 italic">DS:</span>
                                <span className="font-bold text-indigo-600">{formatCurrency(detail.revenue)}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-slate-400 italic">NS:</span>
                                <span className="font-medium text-slate-600">{formatCurrency(detail.budget)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {detail.budget > 0 && !detail.revenue && (
                          <div className="w-full bg-slate-200/50 h-0.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-700 ${dUsage > 100 ? 'bg-rose-500' : dUsage > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(dUsage, 100)}%` }}
                            />
                          </div>
                        )}
                        {detail.revenue > 0 && (
                          <div className="w-full bg-slate-200/50 h-0.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-indigo-600"
                              style={{ width: `${Math.min((detail.revenue / (revenue || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // ThÃªm component footer thÃ´ng tin phÃ¡t triá»ƒn
  const DeveloperFooter = ({ className = "", isHeader = false }: { className?: string, isHeader?: boolean }) => (
    <div className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${className}`}>
      <div className={`flex items-center gap-2 font-black uppercase tracking-[0.2em] ${isHeader ? 'text-[12px]' : 'text-[9px]'}`}>
        <span className="opacity-60">PhÃ¡t triá»ƒn bá»Ÿi</span>
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
        <span className={isHeader ? 'text-slate-800' : 'text-slate-600'}>ThiÃªn VÅ© - Digital Marketing Mayhomes</span>
      </div>
      <a 
        href="https://zalo.me/0854642555" 
        target="_blank" 
        rel="noopener noreferrer"
        className={`flex items-center gap-3 border transition-all duration-300 group ${isHeader ? 'px-6 py-2.5 bg-white border-blue-200 rounded-2xl shadow-lg shadow-blue-100/50 hover:shadow-xl hover:border-blue-400 hover:translate-y-[-2px]' : 'px-3 py-1 bg-slate-50 border-slate-100 rounded-full hover:bg-white hover:shadow-sm'}`}
      >
        <div className={`bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200 group-hover:rotate-[10deg] transition-all ${isHeader ? 'w-8 h-8' : 'w-5 h-5'}`}>
          <MessageCircle className={`${isHeader ? 'w-5 h-5' : 'w-3 h-3'} fill-current`} />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className={`font-black uppercase tracking-tight ${isHeader ? 'text-sm text-blue-700' : 'text-[10px] text-slate-600'}`}>LiÃªn há»‡ há»— trá»£ Zalo</span>
          {isHeader && <span className="text-[11px] font-bold text-blue-500/70 mt-0.5">0854.642.555</span>}
        </div>
      </a>
    </div>
  );

  const getMarketingMonthDisplayRange = (monthStr: string) => {
    if (!monthStr) return '';
    try {
      const [year, month] = monthStr.split('-').map(Number);
      // User requested: Month M ( 21/M-1 - 20/M )
      const startDate = new Date(year, month - 2, 21);
      const endDate = new Date(year, month - 1, 20);
      return `ThÃ¡ng ${month} ( ${safeFormat(startDate, 'd/M')} - ${safeFormat(endDate, 'd/M')} )`;
    } catch (e) {
      return '';
    }
  };

  // Form states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectRegion, setNewProjectRegion] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [actualProjectId, setActualProjectId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [implementerName, setImplementerName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [teamName, setTeamName] = useState('');
  const currentMarketingMonth = useMemo(() => getMarketingMonth(new Date()), []);
  const [budgetMonth, setBudgetMonth] = useState<string>(() => getMarketingMonth(new Date()) || '');
  
  // Search and Confirmation states
  const [projectSearch, setProjectSearch] = useState('');
  const debouncedProjectSearch = useDebounce(projectSearch, 300);
  const [teamSearch, setTeamSearch] = useState('');
  const debouncedTeamSearch = useDebounce(teamSearch, 300);
  const [adminProjectRegionFilter, setAdminProjectRegionFilter] = useState('all');
  const [adminProjectTypeFilter, setAdminProjectTypeFilter] = useState('all');
  const [budgetSearch, setBudgetSearch] = useState('');
  const debouncedBudgetSearch = useDebounce(budgetSearch, 300);
  const [isConfirmBudgetOpen, setIsConfirmBudgetOpen] = useState(false);
  const [isConfirmingMulti, setIsConfirmingMulti] = useState(false);
  
  // Recent Budget Registration List States - Defaults to current marketing period
  const [recentBudgetMonthFilter, setRecentBudgetMonthFilter] = useState<string>(() => getMarketingMonth(new Date()) || 'all');
  const [recentBudgetProjectFilter, setRecentBudgetProjectFilter] = useState<string>('all');
  const [recentBudgetRoleFilter, setRecentBudgetRoleFilter] = useState<'all' | 'created' | 'updated' | 'team'>('all');
  const [recentBudgetSearch, setRecentBudgetSearch] = useState('');
  const debouncedRecentBudgetSearch = useDebounce(recentBudgetSearch, 300);
  const [recentBudgetLimit, setRecentBudgetLimit] = useState<number | 'all'>(25);

  // Auto-default Team and Implementer from User Profile for Marketing Budget Registration
  useEffect(() => {
    if (userProfile?.fullName && (!implementerName || implementerName === '')) {
      setImplementerName(userProfile.fullName);
    }
    
    const userTeamName = userProfile?.teamName ? String(userProfile.teamName).trim() : '';
    const userTeamId = userProfile?.teamId ? String(userProfile.teamId).trim() : '';

    if (userTeamName || userTeamId) {
      const matched = teams.find(t => 
        (userTeamId && t.id === userTeamId) ||
        (userTeamName && normalizeTeamName(t.name).toLowerCase() === normalizeTeamName(userTeamName).toLowerCase()) ||
        (userTeamName && t.name.toLowerCase().trim() === userTeamName.toLowerCase()) ||
        (userTeamName && t.teamCode && t.teamCode.toLowerCase().trim() === userTeamName.toLowerCase()) ||
        (userTeamName && extractTeamCode(t.name).toLowerCase() === extractTeamCode(userTeamName).toLowerCase())
      );

      if (matched) {
        setSelectedTeamId(matched.id);
        setSelectedTeamName(matched.name);
      } else {
        if (userTeamName) setSelectedTeamName(userTeamName);
        if (userTeamId) setSelectedTeamId(userTeamId);
      }
    }
  }, [userProfile?.teamName, userProfile?.teamId, userProfile?.fullName, teams]);


  const userRelatedRecentBudgets = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    const currentUserId = user?.uid || '';
    const currentFullName = (userProfile?.fullName || user?.displayName || '').toLowerCase().trim();
    const currentTeamId = userProfile?.teamId || '';
    const currentTeamName = (userProfile?.teamName || '').toLowerCase().trim();

    return budgets
      .map(b => {
        const creatorEmail = (b.userEmail || b.createdByEmail || b.creatorEmail || b.assignedUserEmail || b.implementerEmail || '').toLowerCase().trim();
        const creatorName = (b.implementerName || b.creatorName || b.userName || '').toLowerCase().trim();

        const isCreator = Boolean(
          (creatorEmail && userEmail && creatorEmail === userEmail) ||
          (b.createdBy && currentUserId && b.createdBy === currentUserId) ||
          (b.assignedUserEmail && b.assignedUserEmail.toLowerCase().trim() === userEmail) ||
          (creatorName && currentFullName && creatorName === currentFullName)
        );

        let isUpdater = Boolean(
          (b.updatedBy && currentUserId && b.updatedBy === currentUserId) ||
          (b.updatedByEmail && b.updatedByEmail.toLowerCase().trim() === userEmail) ||
          (b.lastEditorEmail && b.lastEditorEmail.toLowerCase().trim() === userEmail) ||
          (b.lastEditorName && currentFullName && b.lastEditorName.toLowerCase().trim() === currentFullName)
        );

        let isSubContributor = false;
        let mySubAmount = 0;
        if (Array.isArray(b.subBudgets) && b.subBudgets.length > 0) {
          b.subBudgets.forEach((s: any) => {
            const sEmail = (s.userEmail || s.email || '').toLowerCase().trim();
            const sName = (s.userName || '').toLowerCase().trim();
            const sUid = s.userId || '';
            const match = (sEmail && userEmail && sEmail === userEmail) ||
                          (sUid && currentUserId && sUid === currentUserId) ||
                          (sName && currentFullName && sName === currentFullName);
            if (match) {
              isSubContributor = true;
              mySubAmount += Number(s.amount || 0);
            }
          });
        }

        let historyCount = 0;
        let lastHistoryItem: any = null;
        if (Array.isArray(b.editHistory) && b.editHistory.length > 0) {
          historyCount = b.editHistory.length;
          lastHistoryItem = b.editHistory[b.editHistory.length - 1];
          const hasInHistory = b.editHistory.some((h: any) => {
            const hEmail = (h.editorEmail || h.userEmail || '').toLowerCase().trim();
            const hName = (h.editorName || '').toLowerCase().trim();
            const hUid = h.userId || h.editorId || '';
            return (hEmail && userEmail && hEmail === userEmail) ||
                   (hUid && currentUserId && hUid === currentUserId) ||
                   (hName && currentFullName && hName === currentFullName);
          });
          if (hasInHistory) {
            isUpdater = true;
          }
        }

        const isTeamMember = Boolean(
          (currentTeamId && b.teamId && currentTeamId === b.teamId) ||
          (currentTeamName && b.teamName && currentTeamName === b.teamName.toLowerCase().trim())
        );

        const isAssignedGDDA = isGDDA && (
          !userProfile?.assignedProjects || 
          userProfile.assignedProjects.length === 0 || 
          userProfile.assignedProjects.includes(b.projectId)
        );

        // All users can view the budget records in this view
        const isVisible = true;

        // Effective activity timestamp for sorting
        let effectiveTime = 0;
        if (lastHistoryItem?.timestamp) {
          effectiveTime = lastHistoryItem.timestamp.toDate ? lastHistoryItem.timestamp.toDate().getTime() : new Date(lastHistoryItem.timestamp).getTime();
        } else if (b.updatedAt) {
          effectiveTime = b.updatedAt.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt).getTime();
        } else if (b.createdAt) {
          effectiveTime = b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        }

        return {
          ...b,
          _isCreator: isCreator,
          _isUpdater: isUpdater,
          _isSubContributor: isSubContributor,
          _isTeamMember: isTeamMember,
          _mySubAmount: mySubAmount,
          _historyCount: historyCount,
          _lastHistoryItem: lastHistoryItem,
          _effectiveTime: effectiveTime,
          _isVisible: isVisible
        };
      })
      .filter(b => b._isVisible)
      .sort((a, b) => b._effectiveTime - a._effectiveTime);
  }, [budgets, user, userProfile, isAdmin, isMod, isAccountant, isGDDA]);

  // Scoped recent budgets for the active month filter (for accurate pill count badges)
  const monthScopedRecentBudgets = useMemo(() => {
    return userRelatedRecentBudgets.filter(b => {
      if (recentBudgetMonthFilter !== 'all') {
        return normalizeMonth(b.month) === normalizeMonth(recentBudgetMonthFilter);
      }
      return true;
    });
  }, [userRelatedRecentBudgets, recentBudgetMonthFilter]);

  const filteredRecentBudgets = useMemo(() => {
    return userRelatedRecentBudgets.filter(b => {
      // 1. Month / Period Filter
      if (recentBudgetMonthFilter !== 'all') {
        if (normalizeMonth(b.month) !== normalizeMonth(recentBudgetMonthFilter)) {
          return false;
        }
      }

      // 2. Project Filter (Optional filter in recent list without needing form selection)
      if (recentBudgetProjectFilter !== 'all') {
        if (b.projectId !== recentBudgetProjectFilter) {
          return false;
        }
      }

      // 3. Role Filter
      if (recentBudgetRoleFilter === 'created' && !b._isCreator) return false;
      if (recentBudgetRoleFilter === 'updated' && !b._isUpdater) return false;
      if (recentBudgetRoleFilter === 'team' && !b._isTeamMember) return false;

      // 4. Search Filter
      if (debouncedRecentBudgetSearch.trim()) {
        const query = debouncedRecentBudgetSearch.toLowerCase().trim();
        const pName = (projectMap[b.projectId] || b.projectName || '').toLowerCase();
        const pCode = (projects.find(p => p.id === b.projectId)?.projectCode || '').toLowerCase();
        const tName = (b.teamName || teamMap[b.teamId] || '').toLowerCase();
        const tCode = (teams.find(t => t.id === b.teamId || t.name === b.teamName)?.teamCode || b.teamCode || '').toLowerCase();
        const impName = (b.implementerName || '').toLowerCase();
        const uEmail = (b.userEmail || '').toLowerCase();
        const lastEditor = (b._lastHistoryItem?.editorName || b._lastHistoryItem?.editorEmail || '').toLowerCase();
        
        const match = pName.includes(query) || pCode.includes(query) || tName.includes(query) || 
                      tCode.includes(query) || impName.includes(query) || uEmail.includes(query) || 
                      lastEditor.includes(query) || (b.month || '').includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [userRelatedRecentBudgets, recentBudgetMonthFilter, recentBudgetProjectFilter, recentBudgetRoleFilter, debouncedRecentBudgetSearch, projectMap, teamMap, projects, teams]);

  const recentAvailableBudgetMonths = useMemo(() => {
    const set = new Set<string>();
    const currentM = getMarketingMonth(new Date());
    if (currentM) set.add(normalizeMonth(currentM));
    budgets.forEach(b => {
      if (b.month) set.add(normalizeMonth(b.month));
    });
    getMonthOptions().forEach(opt => {
      if (opt.value) set.add(normalizeMonth(opt.value));
    });
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [budgets]);

  const registeredProjectIdsInPeriod = useMemo(() => {
    if (!selectedTeamId || !budgetMonth) return new Set<string>();
    const set = new Set<string>();
    budgets.forEach(b => {
      if ((b.teamId === selectedTeamId || b.teamName === selectedTeamName) && normalizeMonth(b.month) === normalizeMonth(budgetMonth)) {
        set.add(b.projectId);
      }
    });
    multiBudgetItems.forEach(item => {
      if ((item.teamId === selectedTeamId || item.teamName === selectedTeamName) && normalizeMonth(item.month) === normalizeMonth(budgetMonth)) {
        set.add(item.projectId);
      }
    });
    return set;
  }, [budgets, multiBudgetItems, selectedTeamId, selectedTeamName, budgetMonth]);

  const existingBudgetForSelection = useMemo(() => {
    if (!selectedProjectId || !selectedTeamId || !budgetMonth) return null;
    return budgets.find(b => 
      b.projectId === selectedProjectId && 
      (b.teamId === selectedTeamId || b.teamName === selectedTeamName) && 
      normalizeMonth(b.month) === normalizeMonth(budgetMonth)
    ) || null;
  }, [budgets, selectedProjectId, selectedTeamId, selectedTeamName, budgetMonth]);

  const existingBudgetHistoryItems = useMemo(() => {
    if (!existingBudgetForSelection) return [];
    
    let items: any[] = [];
    
    if (existingBudgetForSelection.editHistory && Array.isArray(existingBudgetForSelection.editHistory) && existingBudgetForSelection.editHistory.length > 0) {
      items = existingBudgetForSelection.editHistory.map((h: any) => ({
        action: h.action || 'UPDATE',
        editorName: h.editorName || h.editorEmail || 'ThÃ nh viÃªn',
        editorEmail: h.editorEmail || '',
        timestamp: h.timestamp || h.createdAt || existingBudgetForSelection.updatedAt || existingBudgetForSelection.createdAt,
        amount: h.newAmount || h.newTotalAmount || h.amount || h.addedAmount || existingBudgetForSelection.amount,
        oldAmount: h.oldAmount || h.previousTotal,
        note: h.note || h.reason || (h.action === 'REGISTER' ? 'ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u' : 'Cáº­p nháº­t ngÃ¢n sÃ¡ch')
      }));
    } else if (existingBudgetForSelection.subBudgets && Array.isArray(existingBudgetForSelection.subBudgets) && existingBudgetForSelection.subBudgets.length > 0) {
      items = existingBudgetForSelection.subBudgets.map((s: any) => ({
        action: 'SUB_BUDGET',
        editorName: s.userName || s.userEmail || 'ThÃ nh viÃªn',
        editorEmail: s.userEmail || '',
        timestamp: s.createdAt || s.updatedAt || existingBudgetForSelection.createdAt,
        amount: s.amount,
        note: s.note || 'ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch thÃ nh viÃªn'
      }));
    } else {
      const bAmt = Number(existingBudgetForSelection.amount || 0);
      const editor = existingBudgetForSelection.implementerName || existingBudgetForSelection.userEmail || 'ThÃ nh viÃªn';
      items = [{
        action: 'REGISTER',
        editorName: editor,
        editorEmail: existingBudgetForSelection.userEmail || '',
        timestamp: existingBudgetForSelection.createdAt,
        amount: bAmt,
        note: 'ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u'
      }];
    }
    
    return items.sort((a, b) => {
      const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
      const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
      return tB - tA;
    });
  }, [existingBudgetForSelection]);
  
  // Delete confirmation states
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<{ id: string, name: string } | null>(null);

  // Sorting states
  const [projectSort, setProjectSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [teamSort, setTeamSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const [efficiencyTableSort, setEfficiencyTableSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'revenue', direction: 'desc' });

  const [costAmount, setCostAmount] = useState('');
  const [fbAds, setFbAds] = useState('');
  const [posting, setPosting] = useState('');
  const [zaloAds, setZaloAds] = useState('');
  const [googleAds, setGoogleAds] = useState('');
  const [digitalCost, setDigitalCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [costNote, setCostNote] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [costWeek, setCostWeek] = useState(format(new Date(), "yyyy-'W'ww"));

  // MKT Efficiency Report states for addition form
  const [totalLeads, setTotalLeads] = useState('');
  const [contactedLeads, setContactedLeads] = useState('');
  const [unconvertedLeads, setUnconvertedLeads] = useState('');
  const [unconvertedReason, setUnconvertedReason] = useState('');
  const [convertedLeads, setConvertedLeads] = useState('');
  const [conversionRevenue, setConversionRevenue] = useState('');
  const [mktStartDate, setMktStartDate] = useState('');
  const [mktEndDate, setMktEndDate] = useState('');
  const [showMktReport, setShowMktReport] = useState(false);

  // MKT Efficiency Report states for edit dialog
  const [isMktReportDialogOpen, setIsMktReportDialogOpen] = useState(false);
  const [selectedCostForMkt, setSelectedCostForMkt] = useState<any>(null);
  const [mktTotalLeads, setMktTotalLeads] = useState('');
  const [mktContactedLeads, setMktContactedLeads] = useState('');
  const [mktUnconvertedLeads, setMktUnconvertedLeads] = useState('');
  const [mktUnconvertedReason, setMktUnconvertedReason] = useState('');
  const [mktConvertedLeads, setMktConvertedLeads] = useState('');
  const [mktConversionRevenue, setMktConversionRevenue] = useState('');
  const [mktEditStartDate, setMktEditStartDate] = useState('');
  const [mktEditEndDate, setMktEditEndDate] = useState('');

  // Edit states for Budget
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');
  const [editingBudgetVerifiedAmount, setEditingBudgetVerifiedAmount] = useState('');
  const [editingBudgetMonth, setEditingBudgetMonth] = useState(getMarketingMonth(new Date()));
  const [editingBudgetTeam, setEditingBudgetTeam] = useState('');
  const [editingBudgetTeamSearch, setEditingBudgetTeamSearch] = useState('');
  const [editingBudgetUserSearch, setEditingBudgetUserSearch] = useState('');
  const [editingBudgetUserId, setEditingBudgetUserId] = useState('');
  const [editingBudgetProject, setEditingBudgetProject] = useState('');
  const [editingBudgetImplementer, setEditingBudgetImplementer] = useState('');
  const [editingBudgetReason, setEditingBudgetReason] = useState('');
  const [isEditBudgetDialogOpen, setIsEditBudgetDialogOpen] = useState(false);

  // Adjust states for Budget
  const [adjustingBudgetId, setAdjustingBudgetId] = useState<string | null>(null);
  const [adjustingBudgetAmount, setAdjustingBudgetAmount] = useState('');
  const [adjustingBudgetReason, setAdjustingBudgetReason] = useState('');
  const [isAdjustBudgetDialogOpen, setIsAdjustBudgetDialogOpen] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCostAmount, setEditingCostAmount] = useState('');
  const [editingCostNote, setEditingCostNote] = useState('');

  // Edit states
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectCode, setEditingProjectCode] = useState('');
  const [editingProjectRegion, setEditingProjectRegion] = useState('');
  const [editingProjectType, setEditingProjectType] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [editingTeamCode, setEditingTeamCode] = useState('');
  const [editingTeamBlockId, setEditingTeamBlockId] = useState('none');
  const [adminTeamBlockFilter, setAdminTeamBlockFilter] = useState('all');
  const [adminTeamSort, setAdminTeamSort] = useState<'name-asc' | 'name-desc' | 'code-asc' | 'date-desc' | 'members-desc'>('name-asc');
  const [isImportingTeams, setIsImportingTeams] = useState(false);
  const [newTeamBlockId, setNewTeamBlockId] = useState('none');

  const teamMemberCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allUsers.forEach(u => {
      if (u.teamId) {
        map[u.teamId] = (map[u.teamId] || 0) + 1;
      }
      if (u.teamName) {
        map[u.teamName] = (map[u.teamName] || 0) + 1;
      }
    });
    return map;
  }, [allUsers]);

  const filteredAdminTeams = useMemo(() => {
    return teams.filter(t => {
      const q = (teamSearch || '').toLowerCase().trim();
      const matchesSearch = !q || 
        (t.name || '').toLowerCase().includes(q) || 
        (t.teamCode || '').toLowerCase().includes(q) ||
        (t.blockCode || '').toLowerCase().includes(q);
      
      const matchesBlock = adminTeamBlockFilter === 'all' || 
        (adminTeamBlockFilter === 'unassigned' && (!t.blockId || t.blockId === '')) ||
        (t.blockId === adminTeamBlockFilter || t.blockCode === adminTeamBlockFilter);

      return matchesSearch && matchesBlock;
    }).sort((a, b) => {
      if (adminTeamSort === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (adminTeamSort === 'code-asc') return (a.teamCode || '').localeCompare(b.teamCode || '');
      if (adminTeamSort === 'members-desc') {
        const countA = teamMemberCounts[a.id] || teamMemberCounts[a.name] || 0;
        const countB = teamMemberCounts[b.id] || teamMemberCounts[b.name] || 0;
        return countB - countA;
      }
      if (adminTeamSort === 'date-desc') {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [teams, teamSearch, adminTeamBlockFilter, adminTeamSort, teamMemberCounts]);

  // Region management states
  const [newRegionName, setNewRegionName] = useState('');
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingRegionName, setEditingRegionName] = useState('');
  const [regionSearch, setRegionSearch] = useState('');
  const [regionSort, setRegionSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [isDeleteRegionDialogOpen, setIsDeleteRegionDialogOpen] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isSetProjectsDialogOpen, setIsSetProjectsDialogOpen] = useState(false);
  const [regionForProjects, setRegionForProjects] = useState<any>(null);
  const [selectedProjectIdsForRegion, setSelectedProjectIdsForRegion] = useState<string[]>([]);

  // Type management states
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [typeSort, setTypeSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [isDeleteTypeDialogOpen, setIsDeleteTypeDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isSetProjectsForTypeDialogOpen, setIsSetProjectsForTypeDialogOpen] = useState(false);
  const [typeForProjects, setTypeForProjects] = useState<any>(null);
  const [selectedProjectIdsForType, setSelectedProjectIdsForType] = useState<string[]>([]);


  
  const formatCurrencyInput = (value: string) => {
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const [historyToView, setHistoryToView] = useState<any[]>([]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyTargetName, setHistoryTargetName] = useState('');
  const [historyTargetRecord, setHistoryTargetRecord] = useState<any>(null);
  const [teamNotifications, setTeamNotifications] = useState<any[]>([]);
  const [isTeamNotificationDialogOpen, setIsTeamNotificationDialogOpen] = useState(false);
  const [notifFilterTab, setNotifFilterTab] = useState<'all' | 'unread' | 'my_projects'>('all');
  const [editingCostForm, setEditingCostForm] = useState({
    fbAds: '',
    posting: '',
    zaloAds: '',
    googleAds: '',
    visaCost: '',
    digitalCost: '',
    otherCost: '',
    note: ''
  });
  const [costBudgetMonth, setCostBudgetMonth] = useState(getMarketingMonth(new Date()));
  const [isBudgetSelectionDialogOpen, setIsBudgetSelectionDialogOpen] = useState(false);
  const [selectedRegionForBulk, setSelectedRegionForBulk] = useState('');
  const [isBulkUpdateRegionDialogOpen, setIsBulkUpdateRegionDialogOpen] = useState(false);
  const [selectedTypeForBulk, setSelectedTypeForBulk] = useState('');
  const [isBulkUpdateTypeDialogOpen, setIsBulkUpdateTypeDialogOpen] = useState(false);
  const [isGlobalProjectAssignDialogOpen, setIsGlobalProjectAssignDialogOpen] = useState(false);
  const [selectedGlobalProjectIds, setSelectedGlobalProjectIds] = useState<string[]>([]);
  const [targetGlobalType, setTargetGlobalType] = useState('');
  const [isMigrateTypeDialogOpen, setIsMigrateTypeDialogOpen] = useState(false);
  const [typeToMigrate, setTypeToMigrate] = useState<{id: string, name: string} | null>(null);
  const [migrationTargetType, setMigrationTargetType] = useState('');
  const [isMigratingTypes, setIsMigratingTypes] = useState(false);
  const [isAddingRegion, setIsAddingRegion] = useState(false);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);
  const [isDeletingTeams, setIsDeletingTeams] = useState(false);
  const [isDeletingRegions, setIsDeletingRegions] = useState(false);
  const [isDeletingTypes, setIsDeletingTypes] = useState(false);
  const [isSyncingTypes, setIsSyncingTypes] = useState(false);
  const [isSyncingTeams, setIsSyncingTeams] = useState(false);
  const [isSyncingProjects, setIsSyncingProjects] = useState(false);
  const [isSyncingBudgetPermissions, setIsSyncingBudgetPermissions] = useState(false);

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjeE6fQBkPs5SaIaMO7pLwkp_XGwwuVMxEXpExlFnSzsCws3hqc5buywAToX82iRlsWw/exec";
  const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1hOAZtsqgCEegOrxDSnDRWso7EUpRXNi4G-kBfcNyhBg/edit?gid=0#gid=0"; // Link Google Sheet cá»§a báº¡n

  const [isSyncingLogs, setIsSyncingLogs] = useState(false);
  const [isDeletingProjects, setIsDeletingProjects] = useState(false);
  const [isMergingBudgets, setIsMergingBudgets] = useState(false);

  const handleMergeDuplicateBudgets = async (targetMonthFilter?: string) => {
    if (!isAdmin && !isMod && !isAccountant) return;
    
    setIsMergingBudgets(true);
    const filterLabel = targetMonthFilter ? `ká»³ ${targetMonthFilter}` : 'táº¥t cáº£ cÃ¡c ká»³';
    const toastId = toast.loading(`Äang xá»­ lÃ½ rÃ  soÃ¡t & gá»™p ngÃ¢n sÃ¡ch (${filterLabel})...`);
    
    try {
      const groups: Record<string, any[]> = {};
      
      budgets.forEach(b => {
        const projName = resolveProjectName(b.projectId, b.projectName) || b.projectId || '';
        const teamNameStr = resolveTeamName(b.teamId, b.teamName) || b.teamId || '';
        const pKey = projName.trim().toLowerCase();
        const tKey = normalizeTeamName(teamNameStr).trim().toLowerCase();
        const mKey = normalizeMonth(b.month || '');
        if (!pKey || !tKey || !mKey) return;
        
        // If filter month is specified, only include matching month
        if (targetMonthFilter && normalizeMonth(targetMonthFilter) !== mKey) {
          return;
        }

        const key = `${pKey}_${tKey}_${mKey}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(b);
      });
      
      let mergedCount = 0;
      let deletedCount = 0;
      let costUpdatedCount = 0;
      let subBudgetsUpdatedCount = 0;
      
      for (const key in groups) {
        const group = groups[key];
        const target = group[0];
        const others = group.slice(1);
        
        const totalAmount = group.reduce((sum, b) => sum + Number(b.amount || 0), 0);
        
        // Collect & construct subBudgets breakdown for individual user contributions
        let combinedSubBudgets: any[] = [];
        group.forEach(b => {
          if (b.subBudgets && Array.isArray(b.subBudgets) && b.subBudgets.length > 0) {
            combinedSubBudgets = [...combinedSubBudgets, ...b.subBudgets];
          } else {
            const bAmt = Number(b.amount || 0);
            const editor = b.implementerName || b.userEmail || b.createdByEmail || 'ChÆ°a rÃµ';
            const email = (b.userEmail || b.createdByEmail || '').toLowerCase();
            const timeStr = b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : (b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString());
            combinedSubBudgets.push({
              id: b.id || `sub-${Math.random().toString(36).substring(2, 9)}`,
              userId: b.createdBy || b.userId || '',
              userName: editor,
              userEmail: email,
              amount: bAmt,
              note: b.note || b.description || `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ${getMarketingMonthDisplayRange(b.month)}`,
              createdAt: timeStr
            });
          }
        });

        // Ensure subBudgets are chronologically sorted
        combinedSubBudgets.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

        // Collect all edit histories (synthesize initial registration entry if missing)
        let combinedHistory: any[] = [];
        group.forEach(b => {
          if (b.editHistory && Array.isArray(b.editHistory) && b.editHistory.length > 0) {
            combinedHistory = [...combinedHistory, ...b.editHistory];
          } else {
            const bAmt = Number(b.amount || 0);
            const editor = b.implementerName || b.userEmail || b.createdByEmail || 'Há»‡ thá»‘ng';
            const timeStr = b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : (b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString());
            combinedHistory.push({
              action: 'REGISTER',
              editorName: editor,
              editorEmail: b.userEmail || b.createdByEmail || '',
              timestamp: timeStr,
              amount: bAmt,
              note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u: ${bAmt.toLocaleString()}Ä‘ (${resolveProjectName(b.projectId, b.projectName)} - ${resolveTeamName(b.teamId, b.teamName)})`
            });
          }
        });

        if (group.length > 1) {
          // Add a merge entry
          combinedHistory.push({
            action: 'MERGE_CONSOLIDATE',
            editorName: userProfile?.fullName || user?.displayName || 'SYSTEM',
            editorEmail: user?.email || 'system@ais.dev',
            timestamp: new Date().toISOString(),
            mergedCount: group.length,
            userCount: combinedSubBudgets.length,
            mergedIds: others.map(o => o.id),
            previousTotal: target.amount || 0,
            addedAmount: totalAmount - (target.amount || 0),
            newTotal: totalAmount,
            note: `Gá»™p ${group.length} báº£n ghi Ä‘Äƒng kÃ½ cá»§a cÃ¡c thÃ nh viÃªn thÃ nh 1 ngÃ¢n sÃ¡ch tá»•ng cho Äá»™i (${resolveTeamName(target.teamId, target.teamName)} - ${resolveProjectName(target.projectId, target.projectName)})`
          });
        }
        
        // Sort history by timestamp
        combinedHistory.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
        
        if (group.length > 1 || !target.subBudgets || target.subBudgets.length === 0) {
          const batch = writeBatch(db);
          
          // Update target
          batch.update(doc(db, 'budgets', target.id), {
            amount: totalAmount,
            subBudgets: combinedSubBudgets,
            editHistory: combinedHistory,
            updatedAt: serverTimestamp()
          });
          subBudgetsUpdatedCount++;
          
          if (group.length > 1) {
            // Update costs pointing to others
            const otherIds = others.map(o => o.id);
            const costsToUpdate = costs.filter(c => otherIds.includes(c.budgetId));
            
            costsToUpdate.forEach(c => {
              batch.update(doc(db, 'costs', c.id), {
                budgetId: target.id
              });
              costUpdatedCount++;
            });
            
            // Delete others
            others.forEach(o => {
              batch.delete(doc(db, 'budgets', o.id));
              deletedCount++;
            });
            mergedCount++;
          }
          
          await batch.commit();
        }
      }
      
      if (mergedCount > 0 || subBudgetsUpdatedCount > 0) {
        toast.success(`ÄÃ£ rÃ  soÃ¡t & gá»™p thÃ nh cÃ´ng ${filterLabel}: ÄÃ£ gá»™p ${mergedCount} nhÃ³m ngÃ¢n sÃ¡ch trÃ¹ng, chuáº©n hÃ³a chi tiáº¿t cho ${subBudgetsUpdatedCount} báº£n ghi Äá»™i, cáº­p nháº­t ${costUpdatedCount} chi phÃ­ liÃªn quan.`, { id: toastId, duration: 6000 });
        await logAction('SYSTEM', 'budgets', 'audit_merge', { filterLabel, mergedCount, deletedCount, costUpdatedCount, subBudgetsUpdatedCount });
      } else {
        toast.success(`NgÃ¢n sÃ¡ch (${filterLabel}) Ä‘Ã£ chuáº©n hÃ³a, khÃ´ng cÃ³ báº£n ghi trÃ¹ng láº·p nÃ o cáº§n gá»™p.`, { id: toastId });
      }
    } catch (error) {
      console.error("Merge error:", error);
      toast.error('Lá»—i khi rÃ  soÃ¡t & gá»™p ngÃ¢n sÃ¡ch: ' + (error instanceof Error ? error.message : String(error)), { id: toastId });
    } finally {
      setIsMergingBudgets(false);
    }
  };

  const handleAuditAndMerge082026Budgets = async () => {
    await handleMergeDuplicateBudgets('08-2026');
  };

  const handleAuditAndUpdateBudgetHistories = async () => {
    if (!isAdmin && !isMod && !isAccountant) return;
    
    setIsMergingBudgets(true);
    const toastId = toast.loading('Äang rÃ  soÃ¡t & cáº­p nháº­t lá»‹ch sá»­ Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch...');
    
    try {
      let updatedHistoriesCount = 0;
      const batchSize = 400;
      let batch = writeBatch(db);
      let opCount = 0;

      // 1. Audit single budget records lacking editHistory and populate initial REGISTER entry
      for (const b of budgets) {
        if (!b.editHistory || !Array.isArray(b.editHistory) || b.editHistory.length === 0) {
          const bAmt = Number(b.amount || 0);
          const editor = b.implementerName || b.userEmail || b.createdByEmail || 'ChÆ°a rÃµ';
          const timeStr = b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : (b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString());
          const initialHist = [{
            action: 'REGISTER',
            editorName: editor,
            editorEmail: b.userEmail || b.createdByEmail || '',
            timestamp: timeStr,
            amount: bAmt,
            note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u: ${bAmt.toLocaleString()}Ä‘ (${resolveProjectName(b.projectId, b.projectName)} - ${resolveTeamName(b.teamId, b.teamName)})`
          }];

          const bRef = doc(db, 'budgets', b.id);
          batch.update(bRef, {
            editHistory: initialHist,
            updatedAt: serverTimestamp()
          });
          opCount++;
          updatedHistoriesCount++;

          if (opCount >= batchSize) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      // 2. Perform merge cleanup for duplicate records while preserving complete combined history
      await handleMergeDuplicateBudgets();

      toast.success(`ÄÃ£ hoÃ n táº¥t rÃ  soÃ¡t vÃ  cáº­p nháº­t lá»‹ch sá»­ cho ${updatedHistoriesCount} báº£n ghi ngÃ¢n sÃ¡ch!`, { id: toastId });
    } catch (error) {
      console.error("Audit budget history error:", error);
      toast.error('Lá»—i khi rÃ  soÃ¡t lá»‹ch sá»­ ngÃ¢n sÃ¡ch: ' + (error instanceof Error ? error.message : String(error)), { id: toastId });
    } finally {
      setIsMergingBudgets(false);
    }
  };

  const [isDeletingBudgets, setIsDeletingBudgets] = useState(false);
  const [isDeletingCosts, setIsDeletingCosts] = useState(false);
  const [isAddingEfficiency, setIsAddingEfficiency] = useState(false);
  const [isDeletingEfficiency, setIsDeletingEfficiency] = useState(false);
  const [isDeletingEfficiencyBatch, setIsDeletingEfficiencyBatch] = useState(false);
  const [newEfficiencyProject, setNewEfficiencyProject] = useState('');
  const [newEfficiencyTeam, setNewEfficiencyTeam] = useState('');
  const [newEfficiencyMonth, setNewEfficiencyMonth] = useState(getMarketingMonth(new Date()));
  const [newEfficiencySales, setNewEfficiencySales] = useState('');
  const [newEfficiencyRevenue, setNewEfficiencyRevenue] = useState('');
  const [adminEfficiencySearch, setAdminEfficiencySearch] = useState('');
  const debouncedAdminEfficiencySearch = useDebounce(adminEfficiencySearch, 300);
  const [adminEfficiencyMonthFilter, setAdminEfficiencyMonthFilter] = useState(getMarketingMonth(new Date()));
  const [adminEfficiencySort, setAdminEfficiencySort] = useState<{ key: 'sales' | 'revenue' | 'name' | 'month' | 'none', direction: 'asc' | 'desc' }>({ key: 'none', direction: 'desc' });
  const [isImportingEfficiencyUrl, setIsImportingEfficiencyUrl] = useState(false);
  const [efficiencySheetUrl, setEfficiencySheetUrl] = useState('');
  const [costSheetUrl, setCostSheetUrl] = useState('');
  const [budgetSheetUrl, setBudgetSheetUrl] = useState('');
  const [isImportingBudgetsUrl, setIsImportingBudgetsUrl] = useState(false);
  const [isImportingCostsUrl, setIsImportingCostsUrl] = useState(false);
  const [isDeleteEfficiencyDialogOpen, setIsDeleteEfficiencyDialogOpen] = useState(false);
  const [isBulkDeleteEfficiencyDialogOpen, setIsBulkDeleteEfficiencyDialogOpen] = useState(false);
  const [isDeleteAllEfficiencyDialogOpen, setIsDeleteAllEfficiencyDialogOpen] = useState(false);
  const [efficiencyToDelete, setEfficiencyToDelete] = useState<any>(null);
  const [isEditEfficiencyDialogOpen, setIsEditEfficiencyDialogOpen] = useState(false);
  const [editingEfficiency, setEditingEfficiency] = useState<any>(null);
  const [isImportEfficiencyDialogOpen, setIsImportEfficiencyDialogOpen] = useState(false);
  const [isImportingEfficiency, setIsImportingEfficiency] = useState(false);

  const [isDeleteBudgetDialogOpen, setIsDeleteBudgetDialogOpen] = useState(false);
  const [isBulkDeleteBudgetsDialogOpen, setIsBulkDeleteBudgetsDialogOpen] = useState(false);
  const [isDeleteAllBudgetsDialogOpen, setIsDeleteAllBudgetsDialogOpen] = useState(false);
  const [isMigrateBudgetsDialogOpen, setIsMigrateBudgetsDialogOpen] = useState(false);
  const [isMigratingBudgets, setIsMigratingBudgets] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleteCostDialogOpen, setIsDeleteCostDialogOpen] = useState(false);
  const [isBulkDeleteCostsDialogOpen, setIsBulkDeleteCostsDialogOpen] = useState(false);
  const [isDeleteAllCostsDialogOpen, setIsDeleteAllCostsDialogOpen] = useState(false);
  const [isImportCostsDialogOpen, setIsImportCostsDialogOpen] = useState(false);
  const [isImportBudgetsDialogOpen, setIsImportBudgetsDialogOpen] = useState(false);
  const [isImportingCosts, setIsImportingCosts] = useState(false);
  const [isImportingBudgets, setIsImportingBudgets] = useState(false);
  const [isImportingProjects, setIsImportingProjects] = useState(false);
  const [isImportingAcceptances, setIsImportingAcceptances] = useState(false);
  const [isImportAcceptancesDialogOpen, setIsImportAcceptancesDialogOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<{id: string, name: string} | null>(null);
  
  const [isBulkDeleteProjectsDialogOpen, setIsBulkDeleteProjectsDialogOpen] = useState(false);
  const [isDeleteAllProjectsDialogOpen, setIsDeleteAllProjectsDialogOpen] = useState(false);
  const [isBulkDeleteRegionsDialogOpen, setIsBulkDeleteRegionsDialogOpen] = useState(false);
  const [isDeleteAllRegionsDialogOpen, setIsDeleteAllRegionsDialogOpen] = useState(false);
  const [isBulkDeleteTypesDialogOpen, setIsBulkDeleteTypesDialogOpen] = useState(false);
  const [isDeleteAllTypesDialogOpen, setIsDeleteAllTypesDialogOpen] = useState(false);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, email: string} | null>(null);

  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImportErrorsDialogOpen, setIsImportErrorsDialogOpen] = useState(false);


  const filteredBudgetsForCostSelection = useMemo(() => {
    const userEmail = user?.email?.toLowerCase();
    
    return budgets
      .filter(b => {
        const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
        const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
        const isAssigned = b.assignedUserEmail?.toLowerCase() === userEmail;
        
        const canSee = isInternalStaff || isOwner || isAssigned;
        return canSee && b.month === costBudgetMonth;
      })
      .filter(b => 
        (projectMap[b.projectId] || '').toLowerCase().includes(debouncedBudgetSearch.toLowerCase()) ||
        (b.teamName || '').toLowerCase().includes(debouncedBudgetSearch.toLowerCase()) ||
        (b.implementerName || '').toLowerCase().includes(debouncedBudgetSearch.toLowerCase())
      );
  }, [budgets, user, userProfile, isGDDA, isAdmin, isMod, costBudgetMonth, projectMap, debouncedBudgetSearch]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          if (unsubscribeProfile) {
            unsubscribeProfile();
            unsubscribeProfile = null;
          }

          // Check/Create user profile
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          
          let userDoc;
          try {
            // Prefer getDoc (which might use cache)
            userDoc = await getDoc(userDocRef);
          } catch (e: any) {
            console.warn("getDoc failed, trying getDocFromServer:", e.message);
            // If it failed due to being offline or something, try forcing server fetch if possible
            // or just catch and report
            userDoc = await getDocFromServer(userDocRef).catch(() => null);
          }

          if (!userDoc) {
            console.error("Critical: Could not fetch user profile. System might be offline.");
            setUser(firebaseUser); // Still set user but might be degraded
            return;
          }
          
          let role: 'super_admin' | 'admin' | 'mod' | 'accountant' | 'gdda' | 'assistant' | 'user' = 'user';
          if (firebaseUser.email?.toLowerCase() === 'thienvu1108@gmail.com') {
            role = 'super_admin';
          }

          if (!userDoc.exists()) {
            const initialProfile = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: role,
              fullName: '',
              teamName: '',
              assignedProjects: [],
              createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, initialProfile);
            setUserProfile(initialProfile);
            setShowOnboarding(true);
          }

          // Real-time profile listener
          unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data && data.teamName) {
                data.teamName = convertMhToMay(data.teamName);
              }
              setUserProfile(data || null);
              
              const rawRole = String(data?.role || 'user').toLowerCase().trim();
              let synchronizedRole: 'super_admin' | 'admin' | 'mod' | 'accountant' | 'gdda' | 'gd_khoi' | 'gdkd' | 'assistant' | 'user' = 'user';
              
              if (firebaseUser.email?.toLowerCase() === 'thienvu1108@gmail.com') synchronizedRole = 'super_admin';
              else if (rawRole === 'super_admin') synchronizedRole = 'super_admin';
              else if (rawRole === 'admin') synchronizedRole = 'admin';
              else if (rawRole === 'mod' || rawRole === 'moderator' || rawRole === 'Ä‘iá»u phá»‘i') synchronizedRole = 'mod';
              else if (rawRole === 'accountant' || rawRole === 'káº¿ toÃ¡n') synchronizedRole = 'accountant';
              else if (rawRole === 'gdda' || rawRole === 'gÄ‘da' || rawRole === 'giÃ¡m Ä‘á»‘c dá»± Ã¡n') synchronizedRole = 'gdda';
              else if (rawRole === 'gd_khoi' || rawRole === 'gdkhoi' || rawRole === 'gÄ‘ khá»‘i' || rawRole === 'giÃ¡m Ä‘á»‘c khá»‘i' || rawRole === 'giÃ¡m Ä‘á»‘c liÃªn khá»‘i' || rawRole === 'gdk') synchronizedRole = 'gd_khoi';
              else if (rawRole === 'gdkd' || rawRole === 'gÄ‘kd' || rawRole === 'giÃ¡m Ä‘á»‘c kinh doanh' || rawRole === 'gÄ‘ kinh doanh') synchronizedRole = 'gdkd';
              else if (rawRole === 'assistant' || rawRole === 'trá»£ lÃ½' || rawRole === 'tro ly') synchronizedRole = 'assistant';
              else synchronizedRole = 'user';
              
              setUserRole(synchronizedRole);

              const hasValidTeam = Boolean(data?.teamName && String(data.teamName).trim() !== '');
              if (!data?.fullName || !hasValidTeam) {
                setOnboardingName(data?.fullName || firebaseUser.displayName || '');
                setOnboardingTeam(data?.teamName || '');
                setShowOnboarding(true);
              } else {
                setImplementerName(data.fullName);
                setSelectedTeamName(data.teamName);
                if (data.teamId) {
                  setSelectedTeamId(data.teamId);
                }
              }
            }
          }, (error) => {
             if (auth.currentUser) {
               handleFirestoreError(error, OperationType.GET, 'users');
             } else {
               console.warn("Ignoring Firestore permission error on profile listener since auth.currentUser is null");
             }
          });

          setUser(firebaseUser);
          
          // Initial tab redirection logic (based on initial fetch)
          const initialData = userDoc.data();
          const initialRawRole = (initialData?.role || 'user').toLowerCase().trim();
          if (firebaseUser.email === 'thienvu1108@gmail.com' || ['super_admin', 'admin', 'mod', 'accountant', 'gdda', 'assistant', 'trá»£ lÃ½', 'tro ly'].includes(initialRawRole)) {
            setActiveTab('admin');
          } else if (['gd_khoi', 'gdkhoi', 'gÄ‘ khá»‘i', 'giÃ¡m Ä‘á»‘c khá»‘i', 'giÃ¡m Ä‘á»‘c liÃªn khá»‘i', 'gdk'].includes(initialRawRole)) {
            setActiveTab('block-mgmt');
          } else if (['gdkd', 'gÄ‘kd', 'giÃ¡m Ä‘á»‘c kinh doanh', 'gÄ‘ kinh doanh'].includes(initialRawRole)) {
            setActiveTab('team-mgmt');
          } else {
            setActiveTab('register');
          }

          setLoading(false);
        } else {
          setUser(null);
          setUserRole(null);
          setUserProfile(null);
          setShowOnboarding(false);
          if (unsubscribeProfile) {
            unsubscribeProfile();
            unsubscribeProfile = null;
          }
        }
      } catch (error) {
        console.error('Auth State Error:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => {
      unsubscribe();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      testConnection();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;

    // Listen to projects - load all relevant projects to ensure mapping and search work perfectly
    let qProjects;
    if (isAdmin || isMod || isAccountant || isUser || isGDKhoi || isGDKD || (isGDDA && (!userProfile?.assignedProjects || userProfile.assignedProjects.length === 0))) {
      qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      qProjects = query(collection(db, 'projects'), where('__name__', 'in', userProfile.assignedProjects));
    } else {
      qProjects = query(collection(db, 'projects'), where('__name__', '==', 'dummy_id'));
    }

    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    // Listen to teams - load all teams to ensure mapping and search work perfectly
    const qTeams = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
    const unsubTeams = onSnapshot(qTeams, (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const sanitized = raw.map(t => ({
        ...t,
        name: normalizeTeamName(t.name),
        teamCode: normalizeTeamCode(t.teamCode || extractTeamCode(t.name))
      }));
      setTeams(sanitized);


    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));

    // Listen to blocks
    const qBlocks = query(collection(db, 'blocks'), orderBy('name', 'asc'));
    const unsubBlocks = onSnapshot(qBlocks, (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const sanitized = raw.map(b => ({
        ...b,
        teamPrefix: String(b.teamPrefix || '').toUpperCase().trim() === 'MH' ? 'MAY' : convertMhToMay(b.teamPrefix)
      }));
      setBlocks(sanitized);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'blocks'));

    // Listen to regions
    const qRegions = query(collection(db, 'regions'), orderBy('createdAt', 'desc'));
    const unsubRegions = onSnapshot(qRegions, (snapshot) => {
      setRegions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'regions'));

    // Listen to types
    const qTypes = query(collection(db, 'types'), orderBy('createdAt', 'desc'));
    const unsubTypes = onSnapshot(qTypes, (snapshot) => {
      setTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'types'));

    // Listen to budgets - load all relevant budgets to ensure mapping and team visibility work perfectly
    const qBudgets = query(collection(db, 'budgets'), orderBy('createdAt', 'desc'));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = { id: doc.id, ...doc.data() as any };
        return {
          ...d,
          teamName: convertMhToMay(d.teamName),
          teamCode: convertMhToMay(d.teamCode)
        };
      });
      setBudgets(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'budgets'));

    // Listen to costs - load all relevant costs to ensure mapping, team visibility, and actual costs work perfectly
    const qCosts = query(collection(db, 'costs'), orderBy('createdAt', 'desc'));
    const unsubCosts = onSnapshot(qCosts, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = { id: doc.id, ...doc.data() as any };
        return {
          ...d,
          teamName: convertMhToMay(d.teamName),
          teamCode: convertMhToMay(d.teamCode)
        };
      });
      setCosts(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'costs'));

    // Listen to team notifications for budget changes
    const qTeamNotifs = query(collection(db, 'teamNotifications'), orderBy('createdAt', 'desc'), limit(100));
    const unsubTeamNotifs = onSnapshot(qTeamNotifs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setTeamNotifications(data);
    }, (error) => {
      console.warn("teamNotifications listener error:", error);
    });

    // Listen to audit logs
    let unsubLogs = () => {};
    if (isAdmin || isMod || isAccountant) {
      const qLogs = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(500));
      unsubLogs = onSnapshot(qLogs, (snapshot) => {
        setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'auditLogs'));
    }

    // Listen to all users (for Admin, Accountant, GDKhoi, GDKD, and Team Management)
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(500));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const sanitized = raw.map(u => ({
        ...u,
        teamName: convertMhToMay(u.teamName)
      }));
      setAllUsers(sanitized);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    // Listen to efficiency reports - load all relevant efficiency reports to ensure mapping and search work perfectly
    let unsubEfficiency = () => {};
    if (isAdmin || isMod || isAccountant || isUser || isGDKhoi || isGDKD || (isGDDA && (!userProfile?.assignedProjects || userProfile.assignedProjects.length === 0))) {
      const qEfficiency = query(collection(db, 'efficiencyReports'), orderBy('createdAt', 'desc'));
      unsubEfficiency = onSnapshot(qEfficiency, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(e => ({
          ...e,
          teamName: convertMhToMay(e.teamName)
        }));
        setEfficiencyReports(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'efficiencyReports'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      const qEfficiency = query(collection(db, 'efficiencyReports'), where('projectId', 'in', userProfile.assignedProjects));
      unsubEfficiency = onSnapshot(qEfficiency, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(e => ({
          ...e,
          teamName: convertMhToMay(e.teamName)
        }));
        setEfficiencyReports(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'efficiencyReports'));
    }

    // Listen to acceptances - load all relevant acceptances to ensure mapping and search work perfectly
    let unsubAcceptances = () => {};
    if (isAdmin || isMod || isAccountant || isGDKhoi || isGDKD || (isGDDA && (!userProfile?.assignedProjects || userProfile.assignedProjects.length === 0))) {
      const qAcceptances = query(collection(db, 'acceptances'), orderBy('month', 'desc'));
      unsubAcceptances = onSnapshot(qAcceptances, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(a => ({
          ...a,
          teamName: convertMhToMay(a.teamName),
          teamCode: convertMhToMay(a.teamCode)
        }));
        setAcceptances(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'acceptances'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      const qAcceptances = query(collection(db, 'acceptances'), where('projectId', 'in', userProfile.assignedProjects));
      unsubAcceptances = onSnapshot(qAcceptances, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(a => ({
          ...a,
          teamName: convertMhToMay(a.teamName),
          teamCode: convertMhToMay(a.teamCode)
        }));
        setAcceptances(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'acceptances'));
    }

    // Listen to final acceptances - load all relevant final acceptances to ensure mapping and search work perfectly
    let unsubFinalAcceptances = () => {};
    let unsubDocProcessing = () => {};
    if (isAdmin || isMod || isAccountant || isGDKhoi || isGDKD || (isGDDA && (!userProfile?.assignedProjects || userProfile.assignedProjects.length === 0))) {
      const qFinal = query(collection(db, 'finalAcceptances'), orderBy('finalizedAt', 'desc'));
      unsubFinalAcceptances = onSnapshot(qFinal, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(fa => ({
          ...fa,
          teamName: convertMhToMay(fa.teamName),
          teamCode: convertMhToMay(fa.teamCode)
        }));
        setFinalAcceptances(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'finalAcceptances'));

      const qDocProcessing = query(collection(db, 'docProcessing'));
      unsubDocProcessing = onSnapshot(qDocProcessing, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(dp => ({
          ...dp,
          teamName: convertMhToMay(dp.teamName)
        }));
        setDocProcessingStatus(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'docProcessing'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      const qFinal = query(collection(db, 'finalAcceptances'), where('projectId', 'in', userProfile.assignedProjects));
      unsubFinalAcceptances = onSnapshot(qFinal, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(fa => ({
          ...fa,
          teamName: convertMhToMay(fa.teamName),
          teamCode: convertMhToMay(fa.teamCode)
        }));
        setFinalAcceptances(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'finalAcceptances'));

      const qDocProcessing = query(collection(db, 'docProcessing'), where('projectId', 'in', userProfile.assignedProjects));
      unsubDocProcessing = onSnapshot(qDocProcessing, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(dp => ({
          ...dp,
          teamName: convertMhToMay(dp.teamName)
        }));
        setDocProcessingStatus(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'docProcessing'));
    }

    // Listen to support requests
    let unsubSupport = () => {};
    if (isAdmin || isMod || isAccountant) {
      const qSupport = query(collection(db, 'supportRequests'), orderBy('createdAt', 'desc'), limit(1000));
      unsubSupport = onSnapshot(qSupport, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(sr => ({
          ...sr,
          teamName: convertMhToMay(sr.teamName),
          userTeam: convertMhToMay(sr.userTeam)
        }));
        setSupportRequests(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'supportRequests'));
    } else {
      const qSupport = query(collection(db, 'supportRequests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(500));
      unsubSupport = onSnapshot(qSupport, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(sr => ({
          ...sr,
          teamName: convertMhToMay(sr.teamName),
          userTeam: convertMhToMay(sr.userTeam)
        }));
        setSupportRequests(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'supportRequests'));
    }

    // Listen to settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSystemSettings(data);
        if (data.budgetStartDay) setAdminBudgetStartDay(data.budgetStartDay.toString());
        if (data.budgetEndDay) setAdminBudgetEndDay(data.budgetEndDay.toString());
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings'));

    // Listen to BÃ¡o cÃ¡o NT settings and cached records
    const unsubReportNT = onSnapshot(doc(db, 'settings', 'report_nt'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setReportNTUrl(data.sheetUrl || '');
        setInputReportNTUrl(data.sheetUrl || '');
        setReportNTRecords(data.records || []);
        setReportNTLastUpdated(data.lastUpdated || null);
      }
    }, (error) => {
      console.warn("BÃ¡o cÃ¡o NT settings listener skipped or not created yet:", error);
    });

    return () => {
      unsubProjects();
      unsubTeams();
      unsubRegions();
      unsubTypes();
      unsubBudgets();
      unsubCosts();
      unsubBlocks();
      unsubLogs();
      unsubUsers();
      unsubEfficiency();
      unsubDocProcessing();
      unsubAcceptances();
      unsubFinalAcceptances();
      unsubSupport();
      unsubSettings();
      unsubReportNT();
      unsubTeamNotifs();
    };
  }, [user?.uid, userRole, isAdmin, isMod, isAccountant, isGDDA, isGDKhoi, isGDKD, JSON.stringify(userProfile), JSON.stringify(currentRolePermissions)]);

  useEffect(() => {
    if (!user) return;
    const unsubRolePerms = onSnapshot(collection(db, 'rolePermissions'), (snapshot) => {
      setRolePermissionsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("rolePermissions collection listener error:", error);
    });
    return () => unsubRolePerms();
  }, [user?.uid]);

  const initialDocProcessingMonthSet = useRef(false);
  useEffect(() => {
    if (finalAcceptances && finalAcceptances.length > 0 && !initialDocProcessingMonthSet.current) {
      const latestRecord = finalAcceptances[0];
      if (latestRecord && latestRecord.month) {
        setAcceptanceMonthFilter(latestRecord.month);
        initialDocProcessingMonthSet.current = true;
      }
    }
  }, [finalAcceptances]);

  const googleSheetTableRef = useRef<HTMLDivElement>(null);

  // Implement mouse-drag horizontal scroll for best UX in Google Sheet view
  useEffect(() => {
    const slider = googleSheetTableRef.current;
    if (!slider) return;

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let hasMoved = false;
    let lastClientX = 0;
    let lastTime = 0;
    let velocityX = 0;
    let inertiaRaf: number | null = null;

    const handleDragStart = (e: DragEvent) => e.preventDefault();

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (inertiaRaf) {
        cancelAnimationFrame(inertiaRaf);
        inertiaRaf = null;
      }

      const target = e.target as HTMLElement;
      if (target.closest('input:not([type="checkbox"]), select, textarea, button, a, [role="button"], label, .no-drag')) {
        return;
      }

      isDown = true;
      hasMoved = false;
      startX = e.clientX;
      lastClientX = e.clientX;
      lastTime = performance.now();
      velocityX = 0;
      startScrollLeft = slider.scrollLeft;
      e.preventDefault();

      slider.classList.add('cursor-grabbing');
      slider.classList.remove('cursor-grab');
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const currentX = e.clientX;
      const dx = currentX - startX;

      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 0) {
        const instantVelocity = (lastClientX - currentX) / dt;
        velocityX = 0.7 * instantVelocity + 0.3 * velocityX;
        lastClientX = currentX;
        lastTime = now;
      }

      if (Math.abs(dx) > 3) {
        hasMoved = true;
        e.preventDefault();
      }
      slider.scrollLeft = startScrollLeft - dx;
    };

    const handleMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      slider.classList.remove('cursor-grabbing');
      slider.classList.add('cursor-grab');
      document.body.style.userSelect = '';

      if (hasMoved && Math.abs(velocityX) > 0.12) {
        let currentVelocity = velocityX * 16;
        const friction = 0.93;

        const glide = () => {
          if (Math.abs(currentVelocity) < 0.3) {
            inertiaRaf = null;
            return;
          }
          slider.scrollLeft += currentVelocity;
          currentVelocity *= friction;
          inertiaRaf = requestAnimationFrame(glide);
        };
        inertiaRaf = requestAnimationFrame(glide);
      }
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (hasMoved) {
        e.stopPropagation();
        e.preventDefault();
        hasMoved = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        slider.scrollLeft += e.deltaY * 1.2;
      }
    };

    slider.addEventListener('dragstart', handleDragStart);
    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('click', handleClickCapture, true);
    slider.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (inertiaRaf) {
        cancelAnimationFrame(inertiaRaf);
      }
      slider.removeEventListener('dragstart', handleDragStart);
      slider.removeEventListener('mousedown', handleMouseDown);
      slider.removeEventListener('click', handleClickCapture, true);
      slider.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, []);

  const handleImportEfficiency = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (projects.length === 0 || teams.length === 0) {
      toast.error("Dá»¯ liá»‡u há»‡ thá»‘ng (Dá»± Ã¡n/Team) chÆ°a táº£i xong. Vui lÃ²ng Ä‘á»£i giÃ¢y lÃ¡t.");
      return;
    }


    setIsImportingEfficiency(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays to find headers
        let rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rows.length === 0) {
          toast.error("File trá»‘ng hoáº·c khÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u");
          setIsImportingEfficiency(false);
          return;
        }

        // Find header row (the one containing 'ID' or 'Dá»± Ã¡n')
        let headerIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (row.some(cell => {
            const str = String(cell || '').toLowerCase().replace(/\s+/g, '');
            return str.includes('idduan') || str.includes('dá»±Ã¡n') || str.includes('projectid');
          })) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) {
          // Fallback to first row if no obvious header found
          headerIndex = 0;
        }

        // Re-parse with detected header row
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { range: headerIndex });

        if (json.length === 0) {
          toast.error("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u há»£p lá»‡. Vui lÃ²ng kiá»ƒm tra láº¡i cáº¥u trÃºc file máº«u.");
          setIsImportingEfficiency(false);
          return;
        }

        const batch = writeBatch(db);
        let count = 0;
        const currentImportErrors: string[] = [];
        const ops: any[] = [];

        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          const rowNum = i + headerIndex + 2; 

          // Normalize row keys
          const normalizedRow: any = {};
          Object.keys(row).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
            normalizedRow[cleanKey] = row[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
              if (normalizedRow[cleanPK] !== undefined && normalizedRow[cleanPK] !== '') return normalizedRow[cleanPK];
            }
            return undefined;
          };

          const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'teamid', 'id team', 'mÃ£ team']) || '').trim();
          let month = normalizeMonth(getVal(['ThÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'thaÌng', 'ká»³']));
          
          const salesStr = String(getVal(['CÄƒn bÃ¡n', 'Sá»‘ cÄƒn bÃ¡n', 'canban', 'socan', 'salescount', 'sales', 'sá»‘ cÄƒn', 'units']) || '0');
          const revenueStr = String(getVal(['Doanh sá»‘', 'revenue', 'doanhso', 'thá»±c Ä‘áº¡t', 'doanh thu', 'doanhthu']) || '0');

          if (!pRef || !tRef || !month) {
            const hasData = Object.values(normalizedRow).some(v => v !== null && v !== undefined && v !== '');
            if (hasData) {
              const missing = [];
              if (!pRef) missing.push('Dá»± Ã¡n (MÃ£/TÃªn)');
              if (!tRef) missing.push('Team (MÃ£/TÃªn)');
              if (!month) missing.push('ThÃ¡ng (Ká»³)');
              currentImportErrors.push(
                `DÃ²ng ${rowNum}: THIáº¾U THÃ”NG TIN Báº®T BUá»˜C (${missing.join(', ')}).\n` +
                `â€¢ NguyÃªn nhÃ¢n: Cá»™t chá»©a thÃ´ng tin nÃ y bá»‹ trá»‘ng hoáº·c tÃªn cá»™t khÃ´ng khá»›p máº«u.\n` +
                `â€¢ CÃ¡ch kháº¯c phá»¥c: Äáº£m báº£o cÃ¡c cá»™t ID/TÃªn Dá»± Ã¡n, Team vÃ  ThÃ¡ng Ä‘Æ°á»£c Ä‘iá»n Ä‘áº§y Ä‘á»§. Äá»‘i vá»›i ThÃ¡ng, hÃ£y nháº­p Ä‘Ãºng Ä‘á»‹nh dáº¡ng YYYY-MM (VÃ­ dá»¥: 2024-04).`
              );
            }
            continue;
          }

          const project = projects.find(p => p.id === pRef || p.projectCode === pRef || (p.name && String(p.name).toLowerCase() === String(pRef).toLowerCase()));
          const team = teams.find(t => t.id === tRef || t.teamCode === tRef || (t.name && String(t.name).toLowerCase() === String(tRef).toLowerCase()));

          if (!project) {
            currentImportErrors.push(
              `DÃ²ng ${rowNum}: KHÃ”NG TÃŒM THáº¤Y Dá»° ÃN khá»›p vá»›i "${pRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: MÃ£ dá»± Ã¡n hoáº·c TÃªn dá»± Ã¡n trong file khÃ´ng tá»“n táº¡i trong há»‡ thá»‘ng.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Kiá»ƒm tra láº¡i má»¥c "Quáº£n lÃ½ Dá»± Ã¡n" Ä‘á»ƒ láº¥y chÃ­nh xÃ¡c MÃ£ ID hoáº·c TÃªn dá»± Ã¡n. LÆ°u Ã½ khÃ´ng cÃ³ khoáº£ng tráº¯ng thá»«a.`
            );
            continue;
          }
          if (!team) {
            currentImportErrors.push(
              `DÃ²ng ${rowNum}: KHÃ”NG TÃŒM THáº¤Y TEAM khá»›p vá»›i "${tRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: MÃ£ team hoáº·c TÃªn team trong file khÃ´ng tá»“n táº¡i trong há»‡ thá»‘ng.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Kiá»ƒm tra láº¡i má»¥c "Quáº£n lÃ½ Team/SÃ n" Ä‘á»ƒ láº¥y chÃ­nh xÃ¡c MÃ£ ID hoáº·c TÃªn team.`
            );
            continue;
          }

          const sales = parseInt(salesStr.replace(/[^0-9]/g, '')) || 0;
          const revenue = parseInt(revenueStr.replace(/[^0-9]/g, '')) || 0;

          const projectId = project.id;
          const teamId = team.id;

          // Find existing record
          const existing = efficiencyReports.find(r => 
            r.projectId === projectId && 
            r.teamId === teamId && 
            r.month === month
          );

          if (existing) {
            ops.push({
              type: 'update',
              ref: doc(db, 'efficiencyReports', existing.id),
              data: {
                salesCount: sales,
                revenue: revenue,
                updatedAt: serverTimestamp()
              }
            });
          } else {
            ops.push({
              type: 'set',
              ref: doc(collection(db, 'efficiencyReports')),
              data: {
                projectId,
                projectName: projectMap[projectId] || 'N/A',
                teamId,
                teamName: teamMap[teamId] || 'N/A',
                month,
                salesCount: sales,
                revenue: revenue,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: user?.uid,
                createdByEmail: user?.email
              }
            });
          }
          count++;
        }

        if (ops.length > 0) {
          for (let i = 0; i < ops.length; i += 450) {
            const batch = writeBatch(db);
            ops.slice(i, i + 450).forEach(op => {
              if (op.type === 'update') batch.update(op.ref, op.data);
              else batch.set(op.ref, op.data);
            });
            await batch.commit();
          }
        }
        
        if (count > 0) {
          toast.success(`Äá»“ng bá»™ thÃ nh cÃ´ng ${count} báº£n ghi.`);
        }

        if (currentImportErrors.length > 0) {
          setImportErrors(currentImportErrors);
          setIsImportErrorsDialogOpen(true);
          toast.error(`CÃ³ ${currentImportErrors.length} dÃ²ng gáº·p lá»—i khi nháº­p dá»¯ liá»‡u.`);
        } else if (count === 0) {
          toast.info("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u má»›i Ä‘á»ƒ Ä‘á»“ng bá»™.");
        }

        await logAction('IMPORT', 'efficiencyReports', 'bulk', { count, errors: currentImportErrors.length });
      } catch (error) {
        console.error("Import Error:", error);
        toast.error("Lá»—i xá»­ lÃ½ file. Vui lÃ²ng Ä‘áº£m báº£o báº¡n Ä‘ang dÃ¹ng file Excel (.xlsx) hoáº·c CSV chuáº©n vÃ  khÃ´ng cÃ³ báº£o máº­t.");
      } finally {
        setIsImportingEfficiency(false);
        setIsImportEfficiencyDialogOpen(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportBudgetsFromUrl = async () => {
    if (!budgetSheetUrl.trim()) {
      toast.error('Vui lÃ²ng nháº­p Link Google Sheet ngÃ¢n sÃ¡ch');
      return;
    }

    const docIdMatch = budgetSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) {
      toast.error('Link Google Sheet khÃ´ng há»£p lá»‡');
      return;
    }

    const docId = docIdMatch[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=xlsx`;

    setIsImportingBudgetsUrl(true);
    setImportErrors([]);
    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("KhÃ´ng thá»ƒ táº£i file tá»« Google Sheet. HÃ£y Ä‘áº£m báº£o file Ä‘Ã£ Ä‘Æ°á»£c chia sáº» cÃ´ng khai.");
      }
      
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      
      let rows: any[] = [];
      let foundHeaders = false;

      // Scan all sheets to find the one with budget headers
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let headerIndex = -1;
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
          const row = rawData[i];
          if (row && Array.isArray(row) && row.some(cell => {
            const str = String(cell || '').toLowerCase().replace(/\s+/g, '');
            return str.includes('ngÃ¢nsÃ¡ch') || str.includes('amount') || str.includes('idduan') || str.includes('dá»±Ã¡n') || str.includes('idteam');
          })) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex !== -1) {
          rows = XLSX.utils.sheet_to_json(worksheet, { range: headerIndex });
          if (rows.length > 0) {
            foundHeaders = true;
            break;
          }
        }
      }

      if (!foundHeaders || rows.length === 0) {
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(firstSheet);
      }

      let count = 0;
      let skippedCount = 0;
      const errorDetails: string[] = [];
      const ops: any[] = [];

      // Pre-consolidate incoming Google Sheet data
      const consolidatedDataMap = new Map();
      for (const row of rows) {
        const normalizedRow: any = {};
        Object.keys(row).forEach(k => {
          const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '');
          normalizedRow[cleanKey] = row[k];
        });

        const getVal = (possibleKeys: string[]) => {
          for (const pk of possibleKeys) {
            const cleanPK = pk.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedRow[cleanPK] !== undefined && normalizedRow[cleanPK] !== '') return normalizedRow[cleanPK];
          }
          return undefined;
        };

          const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'idteam', 'id team', 'mÃ£ team']) || '').trim();
          const monthRaw = getVal(['ThÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'thaÌng', 'ká»³']);
          const month = normalizeMonth(monthRaw);
          const amount = parseVal(getVal(['NgÃ¢n sÃ¡ch', 'Amount', 'ngansach', 'ngÃ¢n saÌch', 'ngÃ¢nsÃ¡ch', 'sá»‘ tiá»n']));
          const implementer = String(getVal(['NgÆ°á»i triá»ƒn khai', 'GDDA', 'Implementer', 'nguoiphutrach', 'giamdockinhdoanh', 'nguoitrienkhai', 'ngÆ°Æ¡Ì€i triÃªÌ‰n khai', 'phá»¥ trÃ¡ch']) || '').trim();

          if (pRef && tRef && month && (amount >= 0 || !isNaN(amount))) {
            const key = `${pRef}_${tRef}_${month}`;
            if (consolidatedDataMap.has(key)) {
              consolidatedDataMap.get(key).amount += amount;
            } else {
              consolidatedDataMap.set(key, { pRef, tRef, month, amount, implementer });
            }
          } else if (Object.values(normalizedRow).some(v => v !== '')) {
            const missing = [];
            if (!pRef) missing.push('Dá»± Ã¡n');
            if (!tRef) missing.push('Team');
            if (!month) missing.push('ThÃ¡ng');
            if (isNaN(amount)) missing.push('NgÃ¢n sÃ¡ch');
            
            errorDetails.push(
              `THÃ”NG TIN SAI HOáº¶C THIáº¾U: (${missing.join(', ')}).\n` +
              `â€¢ NguyÃªn nhÃ¢n: Má»™t sá»‘ Ã´ á»Ÿ Google Sheet Ä‘ang trá»‘ng hoáº·c sai Ä‘á»‹nh dáº¡ng sá»‘.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Kiá»ƒm tra láº¡i cÃ¡c cá»™t Dá»± Ã¡n, Team, ThÃ¡ng vÃ  NgÃ¢n sÃ¡ch táº¡i Link Google Sheet.`
            );
            skippedCount++;
          }
      }

      const consolidatedItems = Array.from(consolidatedDataMap.values()) as any[];

      for (const item of consolidatedItems) {
        const findProject = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => 
            p.id === ref || 
            (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const findTeam = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => 
            t.id === ref || 
            (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const project = findProject(item.pRef);
        const team = findTeam(item.tRef);

        if (!project) {
          errorDetails.push(
            `KHÃ”NG TÃŒM THáº¤Y Dá»° ÃN khá»›p vá»›i "${item.pRef}".\n` +
            `â€¢ NguyÃªn nhÃ¢n: Dá»± Ã¡n mang tÃªn "${item.pRef}" trong Google Sheet khÃ´ng khá»›p vá»›i há»‡ thá»‘ng.\n` +
            `â€¢ CÃ¡ch kháº¯c phá»¥c: Sá»­a láº¡i tÃªn Dá»± Ã¡n trong Google Sheet cho Ä‘Ãºng vá»›i danh sÃ¡ch há»‡ thá»‘ng.`
          );
          skippedCount++;
          continue;
        }
        if (!team) {
          errorDetails.push(
            `KHÃ”NG TÃŒM THáº¤Y TEAM khá»›p vá»›i "${item.tRef}".\n` +
            `â€¢ NguyÃªn nhÃ¢n: MÃ£ hoáº·c tÃªn Team "${item.tRef}" khÃ´ng tá»“n táº¡i.\n` +
            `â€¢ CÃ¡ch kháº¯c phá»¥c: Sá»­a láº¡i tÃªn Team trong Google Sheet cho Ä‘Ãºng vá»›i danh sÃ¡ch há»‡ thá»‘ng.`
          );
          skippedCount++;
          continue;
        }

        const projectId = project.id;
        const teamId = team.id;
        const assignedUserEmail = extractEmail(item.implementer);

        const existingBudgetsForMatch = budgets.filter(b => 
          b.projectId && b.projectId === projectId && 
          b.teamId && b.teamId === teamId && 
          b.month === item.month
        );

        if (existingBudgetsForMatch.length > 0) {
          const targetBudget = existingBudgetsForMatch[0];
          const duplicates = existingBudgetsForMatch.slice(1);
          
          // PRESERVE the total existing amount when merging duplicates
          const totalExistingAmount = existingBudgetsForMatch.reduce((sum, b) => sum + b.amount, 0);

          ops.push({
            type: 'update',
            ref: doc(db, 'budgets', targetBudget.id),
            data: {
              amount: item.amount, // Set to Excel amount (if we want to replace existing with Excel value)
              implementerName: item.implementer || targetBudget.implementerName,
              assignedUserEmail: assignedUserEmail || targetBudget.assignedUserEmail || null,
              userEmail: assignedUserEmail || targetBudget.userEmail || user?.email?.toLowerCase(),
              updatedAt: serverTimestamp(),
              updatedBy: user?.uid,
              editHistory: arrayUnion({
                action: 'URL_IMPORT_UPDATE_MERGE',
                editorName: implementerName,
                timestamp: new Date().toISOString(),
                prevTotalInDb: totalExistingAmount,
                newImportAmount: item.amount,
                duplicatesFixed: duplicates.length
              })
            }
          });

          for (const dup of duplicates) {
            const affectedCosts = costs.filter(c => c.budgetId === dup.id);
            affectedCosts.forEach(c => {
              ops.push({ 
                type: 'update', 
                ref: doc(db, 'costs', c.id), 
                data: { budgetId: targetBudget.id } 
              });
            });
            ops.push({ 
              type: 'delete', 
              ref: doc(db, 'budgets', dup.id) 
            });
          }
        } else {
          ops.push({
            type: 'set',
            ref: doc(collection(db, 'budgets')),
            data: {
              projectId,
              projectName: project.name,
              teamId,
              teamName: team.name,
              implementerName: item.implementer || 'N/A',
              assignedUserEmail: assignedUserEmail,
              userEmail: assignedUserEmail || user?.email?.toLowerCase(),
              month: item.month,
              amount: item.amount,
              createdAt: serverTimestamp(),
              createdBy: user?.uid,
              editHistory: [{
                action: 'URL_IMPORT_CREATE',
                editorName: implementerName,
                timestamp: new Date().toISOString(),
                amount: item.amount
              }]
            }
          });
        }
        count++;
      }

      if (ops.length > 0) {
        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(db);
          ops.slice(i, i + 450).forEach(op => {
            if (op.type === 'update') batch.update(op.ref, op.data);
            else if (op.type === 'set') batch.set(op.ref, op.data);
            else if (op.type === 'delete') batch.delete(op.ref);
          });
          await batch.commit();
        }
        await logAction('IMPORT_BUDGETS_URL', 'budgets', docId, { count, errors: skippedCount });
        
        let msg = `ÄÃ£ cáº­p nháº­t ${count} ngÃ¢n sÃ¡ch tá»« Google Sheet.`;
        if (skippedCount > 0) {
          msg += ` Bá» qua ${skippedCount} dÃ²ng lá»—i.`;
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        }
        toast.success(msg);
        setBudgetSheetUrl('');
      } else {
        if (errorDetails.length > 0) {
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        } else {
          toast.info("KhÃ´ng cÃ³ dá»¯ liá»‡u ngÃ¢n sÃ¡ch há»£p lá»‡ Ä‘á»ƒ cáº­p nháº­t. Vui lÃ²ng kiá»ƒm tra tiÃªu Ä‘á» cá»™t vÃ  ná»™i dung.");
        }
      }
    } catch (error) {
      console.error('Import budgets error:', error);
      toast.error('Lá»—i khi táº£i hoáº·c xá»­ lÃ½ link Google Sheet. Äáº£m báº£o file Ä‘Æ°á»£c chia sáº» cÃ´ng khai.');
    } finally {
      setIsImportingBudgetsUrl(false);
    }
  };

  const handleImportEfficiencyFromUrl = async () => {
    if (!efficiencySheetUrl) {
      toast.error("Vui lÃ²ng nháº­p link Google Sheet");
      return;
    }

    // Extract Spreadsheet ID
    const match = efficiencySheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      toast.error("Link Google Sheet khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng");
      return;
    }

    const spreadsheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    setIsImportingEfficiencyUrl(true);
    setIsImportingEfficiency(true);

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("KhÃ´ng thá»ƒ táº£i file tá»« Google Sheet. HÃ£y Ä‘áº£m báº£o file Ä‘Ã£ Ä‘Æ°á»£c chia sáº» cÃ´ng khai (Báº¥t ká»³ ai cÃ³ liÃªn káº¿t Ä‘á»u cÃ³ thá»ƒ xem).");
      }
      
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      
      let rows: any[] = [];
      let foundHeaders = false;
      let headerIndex = -1;

      // Scan all sheets to find the one with efficiency headers
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const dataArr: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        headerIndex = -1;
        for (let i = 0; i < Math.min(dataArr.length, 20); i++) {
          const row = dataArr[i];
          if (row && Array.isArray(row) && row.some(cell => {
            const str = String(cell || '').toLowerCase().replace(/\s+/g, '');
            return str.includes('idduan') || str.includes('dá»±Ã¡n') || str.includes('projectid') || str.includes('idteam') || str.includes('cÄƒnbaÌn');
          })) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex !== -1) {
          rows = XLSX.utils.sheet_to_json(worksheet, { range: headerIndex });
          if (rows.length > 0) {
            foundHeaders = true;
            break;
          }
        }
      }

      if (!foundHeaders || rows.length === 0) {
        // Fallback to first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(firstSheet);
      }

      if (rows.length === 0) {
        toast.error("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u há»£p lá»‡ trong Google Sheet.");
        return;
      }

      const batch = writeBatch(db);
      let count = 0;
      let skippedCount = 0;
      const errorDetails: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowIndex = i + 2;
        const normalizedRow: any = {};
        Object.keys(row).forEach(k => {
          const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '');
          normalizedRow[cleanKey] = row[k];
        });

        const getVal = (possibleKeys: string[]) => {
          for (const pk of possibleKeys) {
            const cleanPK = pk.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedRow[cleanPK] !== undefined) return normalizedRow[cleanPK];
          }
          return undefined;
        };

        const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
        const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'idteam', 'id team', 'mÃ£ team']) || '').trim();
        const month = normalizeMonth(getVal(['ThÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'thaÌng', 'ká»³']));

        const salesStr = String(getVal(['CÄƒn bÃ¡n', 'Sá»‘ cÄƒn bÃ¡n', 'canban', 'socan', 'salescount', 'sales', 'sá»‘ cÄƒn', 'units']) || '0');
        const revenueStr = String(getVal(['Doanh sá»‘', 'revenue', 'doanhso', 'thá»±c Ä‘áº¡t', 'doanh thu', 'doanhthu']) || '0');

        const sales = parseInt(salesStr.replace(/[^0-9]/g, '')) || 0;
        const revenue = parseInt(revenueStr.replace(/[^0-9]/g, '')) || 0;

        if (!pRef || !tRef || !month) {
          const hasData = Object.values(normalizedRow).some(v => v !== null && v !== undefined && v !== '');
          if (hasData) {
            errorDetails.push(`DÃ²ng ${rowIndex}: Thiáº¿u thÃ´ng tin báº¯t buá»™c (Dá»± Ã¡n: "${pRef}", Team: "${tRef}", Ká»³: "${month}")`);
            skippedCount++;
          }
          continue;
        }

        const findProject = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => 
            p.id === ref || 
            (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const findTeam = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => 
            t.id === ref || 
            (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const project = findProject(pRef);
        const team = findTeam(tRef);

        if (!project) {
          errorDetails.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y Dá»± Ã¡n khá»›p vá»›i "${pRef}"`);
          skippedCount++;
          continue;
        }
        if (!team) {
          errorDetails.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y Team khá»›p vá»›i "${tRef}"`);
          skippedCount++;
          continue;
        }

        const projectId = project.id;
        const teamId = team.id;

        const existing = efficiencyReports.find(r => 
          r.projectId === projectId && 
          r.teamId === teamId && 
          r.month === month
        );

        if (existing) {
          const docRef = doc(db, 'efficiencyReports', existing.id);
          batch.update(docRef, {
            salesCount: sales,
            revenue: revenue,
            updatedAt: serverTimestamp()
          });
        } else {
          const docRef = doc(collection(db, 'efficiencyReports'));
          batch.set(docRef, {
            projectId,
            projectName: projectMap[projectId] || 'N/A',
            teamId,
            teamName: teamMap[teamId] || 'N/A',
            month,
            salesCount: sales,
            revenue: revenue,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user?.uid,
            createdByEmail: user?.email
          });
        }
        count++;
      }

      if (count > 0) {
        await batch.commit();
        let msg = `Äá»“ng bá»™ thÃ nh cÃ´ng ${count} báº£n ghi hiá»‡u quáº£ tá»« Google Sheet.`;
        if (skippedCount > 0) {
          msg += ` Bá» qua ${skippedCount} dÃ²ng lá»—i.`;
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        }
        toast.success(msg);
      } else {
        if (errorDetails.length > 0) {
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        } else {
          toast.error("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u hiá»‡u quáº£ há»£p lá»‡ Ä‘á»ƒ nháº­p.");
        }
      }

      await logAction('IMPORT_URL', 'efficiencyReports', spreadsheetId, { count, errors: skippedCount });
      setIsImportEfficiencyDialogOpen(false);
      setEfficiencySheetUrl('');
    } catch (error: any) {
      console.error("Link Import Error:", error);
      toast.error(error.message || "Lá»—i khi káº¿t ná»‘i vá»›i Google Sheet. HÃ£y kiá»ƒm tra quyá»n chia sáº» cá»§a file.");
    } finally {
      setIsImportingEfficiencyUrl(false);
      setIsImportingEfficiency(false);
    }
  };

  const handleDownloadEfficiencyTemplate = () => {
    const templateData = [
      {
        'ID Dá»± Ã¡n': projects[0]?.id || 'ID_DU_AN_1',
        'ID Team': teams[0]?.id || 'ID_TEAM_1',
        'ThÃ¡ng': format(new Date(), 'yyyy-MM'),
        'Sá»‘ cÄƒn bÃ¡n': 5,
        'Doanh sá»‘': 15000000000
      }
    ];

    const projectData = projects.map(p => ({
      'ID Dá»± Ã¡n': p.id,
      'TÃªn Dá»± Ã¡n': p.name,
      'VÃ¹ng/Khu vá»±c': p.region
    }));

    const teamData = teams.map(t => ({
      'ID Team': t.id,
      'TÃªn Team': t.name
    }));

    const wb = XLSX.utils.book_new();
    
    // Create sheet with only required columns
    const wsTemplate = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, wsTemplate, "Máº«u Nháº­p Liá»‡u");

    const wsProjects = XLSX.utils.json_to_sheet(projectData);
    XLSX.utils.book_append_sheet(wb, wsProjects, "DANH SÃCH ID Dá»° ÃN");

    const wsTeams = XLSX.utils.json_to_sheet(teamData);
    XLSX.utils.book_append_sheet(wb, wsTeams, "DANH SÃCH ID TEAM");

    XLSX.writeFile(wb, `Mau_Bao_Cao_Hieu_Qua_Sync_IDs_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast.success("ÄÃ£ táº£i xuá»‘ng file máº«u Ä‘á»“ng bá»™ theo ID!");
  };

  const handleAddEfficiency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEfficiencyProject || !newEfficiencyTeam || !newEfficiencySales || !newEfficiencyRevenue) {
      toast.error('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin');
      return;
    }

    setIsAddingEfficiency(true);
    try {
      const docRef = await addDoc(collection(db, 'efficiencyReports'), {
        projectId: newEfficiencyProject,
        projectName: projectMap[newEfficiencyProject] || 'N/A',
        teamId: newEfficiencyTeam,
        teamName: teamMap[newEfficiencyTeam] || 'N/A',
        month: newEfficiencyMonth,
        salesCount: parseInt(newEfficiencySales),
        revenue: parseInt(newEfficiencyRevenue),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid,
        createdByEmail: user?.email
      });
      await logAction('CREATE', 'efficiencyReports', docRef.id, { 
        project: projectMap[newEfficiencyProject], 
        team: teamMap[newEfficiencyTeam],
        month: newEfficiencyMonth,
        sales: newEfficiencySales,
        revenue: newEfficiencyRevenue
      });
      toast.success('ÄÃ£ lÆ°u bÃ¡o cÃ¡o hiá»‡u quáº£');
      setNewEfficiencySales('');
      setNewEfficiencyRevenue('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'efficiencyReports');
    } finally {
      setIsAddingEfficiency(false);
    }
  };

  const handleUpdateEfficiency = async (id: string, sales: string, revenue: string) => {
    try {
      const updateData = {
        salesCount: parseInt(sales),
        revenue: parseInt(revenue),
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, 'efficiencyReports', id), updateData);
      await logAction('UPDATE', 'efficiencyReports', id, updateData);
      toast.success('ÄÃ£ cáº­p nháº­t bÃ¡o cÃ¡o');
      setIsEditEfficiencyDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'efficiencyReports');
    }
  };

  const handleDeleteEfficiency = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'efficiencyReports', id));
      await logAction('DELETE', 'efficiencyReports', id, {});
      toast.success('ÄÃ£ xÃ³a bÃ¡o cÃ¡o hiá»‡u quáº£');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'efficiencyReports');
    }
  };

  const handleBulkDeleteEfficiency = async () => {
    if (selectedEfficiencyIds.length === 0 || isDeletingEfficiencyBatch) return;
    setIsBulkDeleteEfficiencyDialogOpen(true);
  };

  const confirmBulkDeleteEfficiency = async () => {
    setIsDeletingEfficiencyBatch(true);
    setIsBulkDeleteEfficiencyDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedEfficiencyIds.forEach(id => {
        batch.delete(doc(db, 'efficiencyReports', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'efficiencyReports', 'multiple', { count: selectedEfficiencyIds.length });
      toast.success(`ÄÃ£ xÃ³a ${selectedEfficiencyIds.length} báº£n ghi hiá»‡u quáº£`);
      setSelectedEfficiencyIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'efficiencyReports');
    } finally {
      setIsDeletingEfficiencyBatch(false);
    }
  };

  const handleDeleteAllEfficiency = async () => {
    if (efficiencyReports.length === 0) return;
    setIsDeleteAllEfficiencyDialogOpen(true);
  };

  const confirmDeleteAllEfficiency = async () => {
    setIsDeleteAllEfficiencyDialogOpen(false);
    try {
      const batch = writeBatch(db);
      efficiencyReports.forEach(r => {
        batch.delete(doc(db, 'efficiencyReports', r.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'efficiencyReports', 'all', { count: efficiencyReports.length });
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ báº£n ghi hiá»‡u quáº£ kinh doanh');
      setSelectedEfficiencyIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'efficiencyReports');
    }
  };

  const filteredEfficiencyReports = useMemo(() => {
    return efficiencyReports.filter(r => {
      const pName = projectMap[r.projectId] || r.projectName || '';
      const tName = teamMap[r.teamId] || r.teamName || '';
      const matchSearch = (pName.toLowerCase().includes(debouncedAdminEfficiencySearch.toLowerCase())) ||
                        (tName.toLowerCase().includes(debouncedAdminEfficiencySearch.toLowerCase()));
      const matchMonth = !adminEfficiencyMonthFilter || r.month === adminEfficiencyMonthFilter;
      return matchSearch && matchMonth;
    }).sort((a, b) => {
      if (adminEfficiencySort.key === 'none') {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      }
      
      let comparison = 0;
      if (adminEfficiencySort.key === 'sales') {
        comparison = a.salesCount - b.salesCount;
      } else if (adminEfficiencySort.key === 'revenue') {
        comparison = a.revenue - b.revenue;
      } else if (adminEfficiencySort.key === 'name') {
        const nameA = (projectMap[a.projectId] || a.projectName || '').toLowerCase();
        const nameB = (projectMap[b.projectId] || b.projectName || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (adminEfficiencySort.key === 'month') {
        comparison = a.month.localeCompare(b.month);
      }
      
      return adminEfficiencySort.direction === 'asc' ? comparison : -comparison;
    });
  }, [efficiencyReports, debouncedAdminEfficiencySearch, adminEfficiencyMonthFilter, projectMap, teamMap, adminEfficiencySort]);

  const paginatedFilteredEfficiencyReports = useMemo(() => {
    const start = (efficiencyPage - 1) * 20;
    return (filteredEfficiencyReports || []).slice(start, start + 20);
  }, [filteredEfficiencyReports, efficiencyPage]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      // Ensure persistence is set to local
      await auth.setPersistence(browserLocalPersistence);
      await signInWithPopup(auth, provider);
      toast.success('ÄÄƒng nháº­p thÃ nh cÃ´ng');
    } catch (error: any) {
      console.error('Login Error:', error);
      let message = 'ÄÄƒng nháº­p tháº¥t báº¡i';
      if (error.code === 'auth/popup-blocked') {
        message = 'TrÃ¬nh duyá»‡t Ä‘Ã£ cháº·n cá»­a sá»• báº­t lÃªn. Vui lÃ²ng cho phÃ©p báº­t lÃªn Ä‘á»ƒ Ä‘Äƒng nháº­p.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = 'YÃªu cáº§u Ä‘Äƒng nháº­p Ä‘Ã£ bá»‹ há»§y.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'TÃªn miá»n nÃ y chÆ°a Ä‘Æ°á»£c á»§y quyá»n trong Firebase Console.';
      } else if (error.message) {
        message = `Lá»—i: ${error.message}`;
      }
      toast.error(message);
    }
  };

  const syncFullSystem = async () => {
    setIsBackingUp(true);
    
    // Helper function to sanitize data recursively (convert Timestamps to ISO strings)
    const sanitizeData = (data: any[]) => {
      if (!data || !Array.isArray(data)) return [];
      
      const sanitizeObj = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        
        // Handle Firestore Timestamp specifically
        if (typeof obj === 'object' && obj.seconds !== undefined && obj.nanoseconds !== undefined) {
          try {
            return new Date(obj.seconds * 1000).toISOString();
          } catch (e) {
            return String(obj);
          }
        }
        
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObj);
        }
        
        if (typeof obj === 'object') {
          // If it's a Date object
          if (obj instanceof Date) return obj.toISOString();
          
          const newObj: any = {};
          Object.keys(obj).forEach(key => {
            newObj[key] = sanitizeObj(obj[key]);
          });
          return newObj;
        }
        
        return obj;
      };
      
      return data.map(sanitizeObj);
    };

    const masterPayload = {
      nganSach: sanitizeData(budgets),
      chiPhi: sanitizeData(costs),
      duAn: sanitizeData(projects),
      team: sanitizeData(teams),
      nguoiDung: sanitizeData(allUsers),
      vungKhuVuc: sanitizeData(regions),
      hieuQuaKinhDoanh: sanitizeData(efficiencyReports),
      nghiemThu: sanitizeData(acceptances),
      nhatKyHeThong: auditLogs.slice(0, 1000).map(log => {
        const ts = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
        return {
          id: log.id,
          action: log.action,
          collection: log.collection,
          docId: log.docId,
          data: typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data),
          userEmail: log.userEmail,
          userId: log.userId,
          timestamp: ts.toISOString(),
          // CÃ¡c trÆ°á»ng tiáº¿ng viá»‡t cho Sheet
          thoiGian: ts.toLocaleString('vi-VN'),
          hanhDong: log.action || 'N/A',
          nguoiChinhSua: log.userEmail || 'Há»‡ thá»‘ng'
        };
      }),
      systemLog: {
        action: "Full System Backup",
        user: user?.email || "Admin_Mayhomes",
        timestamp: new Date().toISOString(),
        details: `Sao lÆ°u ${budgets.length} ngÃ¢n sÃ¡ch, ${costs.length} chi phÃ­, ${projects.length} dá»± Ã¡n`
      }
    };

    try {
      console.log("Dá»¯ liá»‡u chuáº©n hÃ³a gá»­i sang Google Sheets:", masterPayload);
      
      // Sá»­ dá»¥ng text/plain Ä‘á»ƒ trÃ¡nh Preflight CORS (POST simple request)
      // Dá»¯ liá»‡u Ä‘Æ°á»£c gá»­i dÆ°á»›i dáº¡ng chuá»—i JSON thÃ´
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(masterPayload)
      });
      
      toast.success("ÄÃ£ gá»­i yÃªu cáº§u sao lÆ°u thÃ nh cÃ´ng! Dá»¯ liá»‡u Ä‘ang Ä‘Æ°á»£c xá»­ lÃ½ trÃªn Google Sheet.");
      await logAction('FULL_SYSTEM_BACKUP', 'system', 'all', { 
        counts: {
          budgets: budgets.length,
          costs: costs.length,
          projects: projects.length,
          teams: teams.length,
          users: allUsers.length,
          regions: regions.length,
          efficiency: efficiencyReports.length
        }
      });
    } catch (error) {
      console.error("Lá»—i Ä‘á»“ng bá»™ há»‡ thá»‘ng:", error);
      toast.error("Lá»—i Ä‘á»“ng bá»™ há»‡ thá»‘ng. Vui lÃ²ng kiá»ƒm tra láº¡i cáº¥u hÃ¬nh script.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleGoogleBackup = async () => {
    setIsBackingUp(true);
    try {
      // 1. Get Auth URL
      const urlRes = await fetch('/api/auth/google/url');
      const { url } = await urlRes.json();

      // 2. Open Popup
      const authWindow = window.open(url, 'google_auth_popup', 'width=600,height=700');
      
      if (!authWindow) {
        toast.error('Vui lÃ²ng cho phÃ©p popup Ä‘á»ƒ tiáº¿p tá»¥c sao lÆ°u.');
        setIsBackingUp(false);
        return;
      }

      // 3. Wait for success message
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          
          // 4. Perform Backup
          toast.info('Äang chuáº©n bá»‹ dá»¯ liá»‡u sao lÆ°u...');
          
          const backupData = [
            { collectionName: 'Dá»± Ã¡n', docs: projects },
            { collectionName: 'VÃ¹ng_KhuVá»±c', docs: regions },
            { collectionName: 'Loáº¡i_HÃ¬nh', docs: types },
            { collectionName: 'Team', docs: teams },
            { collectionName: 'NgÃ¢n_SÃ¡ch', docs: budgets },
            { collectionName: 'Thá»±c_Chi', docs: costs },
            { collectionName: 'Nháº­t_KÃ½', docs: auditLogs },
            { collectionName: 'NgÆ°á»i_DÃ¹ng', docs: allUsers }
          ];

          const backupRes = await fetch('/api/backup/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: backupData,
              fileName: `Backup_Mayhomes_${format(new Date(), 'yyyyMMdd_HHmmss')}`
            })
          });

          const result = await backupRes.json();
          if (result.success) {
            toast.success('Sao lÆ°u thÃ nh cÃ´ng!');
            if (result.spreadsheetUrl) {
              window.open(result.spreadsheetUrl, '_blank');
            }
          } else {
            toast.error('Sao lÆ°u tháº¥t báº¡i: ' + result.error);
          }
          setIsBackingUp(false);
        }
      };

      window.addEventListener('message', handleMessage);

    } catch (error) {
      console.error('Backup error:', error);
      toast.error('CÃ³ lá»—i xáº£y ra trong quÃ¡ trÃ¬nh sao lÆ°u.');
      setIsBackingUp(false);
    }
  };

  const logout = () => signOut(auth);

  const handleSyncAllLogs = async () => {
    if (isSyncingLogs || auditLogs.length === 0) return;
    setIsSyncingLogs(true);
    try {
      const sanitizeLogs = (logs: any[]) => {
        return logs.map(log => {
          const ts = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
          return {
            ...log,
            timestamp: ts.toISOString(),
            // ThÃªm cÃ¡c trÆ°á»ng tiáº¿ng Viá»‡t theo yÃªu cáº§u user
            thoiGian: ts.toLocaleString('vi-VN'),
            hanhDong: log.action || 'N/A',
            nguoiChinhSua: log.userEmail || 'Há»‡ thá»‘ng',
            collection: log.collection || 'N/A',
            docId: log.docId || 'N/A',
            data: typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)
          };
        });
      };

      const payload = {
        nhatKyHanhDong: sanitizeLogs(auditLogs.slice(0, 2000)) // TÄƒng giá»›i háº¡n lÃªn 2000 Ä‘á»ƒ bao quÃ¡t hÆ¡n
      };

      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      
      toast.success(`ÄÃ£ Ä‘á»“ng bá»™ ${Math.min(auditLogs.length, 2000)} nháº­t kÃ½ lÃªn Google Sheet.`);
    } catch (error) {
      console.error("Sync All Logs Error:", error);
      toast.error("Lá»—i khi Ä‘á»“ng bá»™ toÃ n bá»™ nháº­t kÃ½");
    } finally {
      setIsSyncingLogs(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string, assignedProjects: string[] = []) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        assignedProjects,
        updatedAt: serverTimestamp()
      });
      await logAction('UPDATE_USER_ROLE', 'users', userId, { role: newRole, assignedProjects });
      toast.success('ÄÃ£ cáº­p nháº­t quyá»n ngÆ°á»i dÃ¹ng');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleUpdateUserTeam = async (userId: string, teamName: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        teamName,
        updatedAt: serverTimestamp()
      });
      await logAction('UPDATE_USER_TEAM', 'users', userId, { teamName });
      toast.success('ÄÃ£ cáº­p nháº­t team ngÆ°á»i dÃ¹ng');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleAdminUpdateUserTeamAndBlock = async (userId: string, teamName: string, assignedBlock: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        teamName,
        assignedBlock,
        updatedAt: serverTimestamp()
      });
      await logAction('UPDATE_USER_STRUCTURE', 'users', userId, { teamName, assignedBlock });
      toast.success('ÄÃ£ cáº­p nháº­t cÆ¡ cáº¥u tá»• chá»©c ngÆ°á»i dÃ¹ng');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleDeleteUser = (userId: string, email: string) => {
    setUserToDelete({ id: userId, email });
    setIsDeleteUserDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      await logAction('DELETE_USER', 'users', userToDelete.id, { email: userToDelete.email });
      toast.success('ÄÃ£ xÃ³a ngÆ°á»i dÃ¹ng');
      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  const sortedProjects = useMemo(() => {
    const q = (debouncedProjectSearch || '').toLowerCase().trim();
    let filtered = projects.filter(p => {
      const matchSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.projectCode || '').toLowerCase().includes(q);
      const matchRegion = adminProjectRegionFilter === 'all' || p.region === adminProjectRegionFilter;
      const matchType = adminProjectTypeFilter === 'all' || p.type === adminProjectTypeFilter;
      
      // Role-based filtering
      const isSuperAdmin = userRole === 'super_admin';
      const isAdmin = userRole === 'admin';
      const isMod = userRole === 'mod';
      const isAccountant = userRole === 'accountant';
      const isUser = userRole === 'user';

      if (isSuperAdmin || isAdmin || isAccountant || isUser) return matchSearch && matchRegion && matchType;
      if (isMod) {
        const isAssigned = userProfile?.assignedProjects?.includes(p.id);
        return isAssigned && matchSearch && matchRegion && matchType;
      }
      return false;
    });

    return filtered.sort((a, b) => {
      const aValue = a[projectSort.key] || '';
      const bValue = b[projectSort.key] || '';
      if (aValue < bValue) return projectSort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return projectSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, projectSort, debouncedProjectSearch, adminProjectRegionFilter, adminProjectTypeFilter, userRole, userProfile]);

  const paginatedProjects = useMemo(() => {
    const start = (projectPage - 1) * 20;
    return (sortedProjects || []).slice(start, start + 20);
  }, [sortedProjects, projectPage]);



  const sortedTeams = useMemo(() => {
    const q = (debouncedTeamSearch || '').toLowerCase().trim();
    let filtered = teams.filter(t => 
      !q ||
      (t.name || '').toLowerCase().includes(q) ||
      (t.teamCode || '').toLowerCase().includes(q)
    );

    return filtered.sort((a, b) => {
      let aValue = '';
      let bValue = '';
      if (teamSort.key === 'gdkd') {
        aValue = extractGDKD(a.name);
        bValue = extractGDKD(b.name);
      } else if (teamSort.key === 'blockName') {
        const aBlock = blocks.find(b => b.id === a.blockId || b.blockCode === a.blockCode);
        aValue = aBlock?.name || a.blockCode || '';
        const bBlock = blocks.find(b => b.id === b.blockId || b.blockCode === b.blockCode);
        bValue = bBlock?.name || b.blockCode || '';
      } else {
        aValue = a[teamSort.key] || '';
        bValue = b[teamSort.key] || '';
      }
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (aStr < bStr) return teamSort.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return teamSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [teams, teamSort, debouncedTeamSearch, blocks]);

  const paginatedTeams = useMemo(() => {
    const start = (teamPage - 1) * 20;
    return (sortedTeams || []).slice(start, start + 20);
  }, [sortedTeams, teamPage]);

  const myBlockTeams = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    return teams.filter(t => isTeamInBlock(t, block));
  }, [currentActiveBlock, teams]);

  const myBlockBudgets = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    
    const blockTeamIds = new Set(myBlockTeams.map(t => t.id));
    const blockTeamNames = new Set(myBlockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(myBlockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return budgets.filter(b => {
      if (b.teamId && blockTeamIds.has(b.teamId)) return true;
      const tName = (b.teamName || '').toLowerCase().trim();
      const tCode = (b.teamCode || '').toLowerCase().trim();
      return blockTeamNames.has(tName) || blockTeamCodes.has(tCode);
    });
  }, [currentActiveBlock, myBlockTeams, budgets]);

  const myBlockCosts = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    
    const blockTeamIds = new Set(myBlockTeams.map(t => t.id));
    const blockTeamNames = new Set(myBlockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(myBlockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return costs.filter(c => {
      if (c.teamId && blockTeamIds.has(c.teamId)) return true;
      const tName = (c.teamName || '').toLowerCase().trim();
      const tCode = (c.teamCode || '').toLowerCase().trim();
      return blockTeamNames.has(tName) || blockTeamCodes.has(tCode);
    });
  }, [currentActiveBlock, myBlockTeams, costs]);

  const myBlockAcceptances = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    
    const blockTeamIds = new Set(myBlockTeams.map(t => t.id));
    const blockTeamNames = new Set(myBlockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(myBlockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return acceptances.filter(a => {
      if (a.teamId && blockTeamIds.has(a.teamId)) return true;
      const tName = (a.teamName || '').toLowerCase().trim();
      const tCode = (a.teamCode || '').toLowerCase().trim();
      return blockTeamNames.has(tName) || blockTeamCodes.has(tCode);
    });
  }, [currentActiveBlock, myBlockTeams, acceptances]);

  const myBlockFinalAcceptances = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    
    const blockTeamIds = new Set(myBlockTeams.map(t => t.id));
    const blockTeamNames = new Set(myBlockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(myBlockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return finalAcceptances.filter(fa => {
      if (fa.teamId && blockTeamIds.has(fa.teamId)) return true;
      const tName = (fa.teamName || '').toLowerCase().trim();
      const tCode = (fa.teamCode || '').toLowerCase().trim();
      return blockTeamNames.has(tName) || blockTeamCodes.has(tCode);
    });
  }, [currentActiveBlock, myBlockTeams, finalAcceptances]);

  const availableBudgetMonths = useMemo(() => {
    const list = Array.from(new Set(myBlockBudgets.map(b => b.month))).filter((m): m is string => typeof m === 'string' && !!m);
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [myBlockBudgets]);

  const availableCostMonths = useMemo(() => {
    const list = Array.from(new Set(myBlockCosts.map(c => c.month))).filter((m): m is string => typeof m === 'string' && !!m);
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [myBlockCosts]);

  const filteredBlockBudgets = useMemo(() => {
    if (!blockBudgetMonthFilter || blockBudgetMonthFilter === 'all') return myBlockBudgets;
    return myBlockBudgets.filter(b => b.month === blockBudgetMonthFilter);
  }, [myBlockBudgets, blockBudgetMonthFilter]);

  const filteredBlockCosts = useMemo(() => {
    if (!blockCostMonthFilter || blockCostMonthFilter === 'all') return myBlockCosts;
    return myBlockCosts.filter(c => c.month === blockCostMonthFilter);
  }, [myBlockCosts, blockCostMonthFilter]);

  const teamsNotInBlock = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    return teams.filter(t => !isTeamInBlock(t, block));
  }, [teams, currentActiveBlock]);

  const blockAggregatedData = useMemo(() => {
    const data: Record<string, { teamName: string; projectName: string; budgetTotal: number; costTotal: number }> = {};
    
    myBlockBudgets.forEach(b => {
      const key = `${b.teamName}_${b.projectId}`;
      if (!data[key]) {
        data[key] = { teamName: b.teamName || 'N/A', projectName: b.projectName || 'N/A', budgetTotal: 0, costTotal: 0 };
      }
      data[key].budgetTotal += b.amount || 0;
    });

    myBlockCosts.forEach(c => {
      const key = `${c.teamName}_${c.projectId}`;
      if (!data[key]) {
        data[key] = { teamName: c.teamName || 'N/A', projectName: c.projectName || 'N/A', budgetTotal: 0, costTotal: 0 };
      }
      data[key].costTotal += c.amount || 0;
    });

    return Object.values(data);
  }, [myBlockBudgets, myBlockCosts]);

  const currentActiveTeam = useMemo(() => {
    if (isGDKD && userProfile?.teamName) {
      const tn = String(userProfile.teamName).toLowerCase().trim();
      return teams.find(t => (t.name && String(t.name).toLowerCase().trim() === tn) || (t.teamCode && String(t.teamCode).toLowerCase().trim() === tn)) || null;
    }
    if (activeTeamMgmtId) {
      return teams.find(t => t.id === activeTeamMgmtId) || null;
    }
    if (userProfile?.teamName) {
      const tn = String(userProfile.teamName).toLowerCase().trim();
      const found = teams.find(t => (t.name && String(t.name).toLowerCase().trim() === tn) || (t.teamCode && String(t.teamCode).toLowerCase().trim() === tn));
      if (found) return found;
    }
    return teams[0] || null;
  }, [isGDKD, userProfile?.teamName, activeTeamMgmtId, teams]);

  const teamMembers = useMemo(() => {
    const activeTeam = currentActiveTeam;
    if (!activeTeam) return [];
    const targetTeam = (activeTeam.name || '').toLowerCase().trim();
    const targetCode = (activeTeam.teamCode || '').toLowerCase().trim();
    return allUsers.filter(u => {
      const uTeam = (u.teamName || '').toLowerCase().trim();
      return (targetTeam && uTeam === targetTeam) || (targetCode && uTeam === targetCode);
    });
  }, [allUsers, currentActiveTeam]);

  const myTeamCosts = useMemo(() => {
    const activeTeam = currentActiveTeam;
    if (!activeTeam) return [];
    const targetTeam = (activeTeam.name || '').toLowerCase().trim();
    const targetCode = (activeTeam.teamCode || '').toLowerCase().trim();
    const teamId = activeTeam.id;
    return costs.filter(c => {
      if (c.teamId && teamId && c.teamId === teamId) return true;
      const cTeam = (c.teamName || '').toLowerCase().trim();
      return (targetTeam && cTeam === targetTeam) || (targetCode && cTeam === targetCode);
    });
  }, [costs, currentActiveTeam]);

  const myTeam = currentActiveTeam;

  const myTeamBudgets = useMemo(() => {
    const activeTeam = currentActiveTeam;
    if (!activeTeam) return [];
    const targetTn = (activeTeam.name || '').toLowerCase().trim();
    const targetCode = (activeTeam.teamCode || '').toLowerCase().trim();
    const teamId = activeTeam.id;
    return budgets.filter(b => {
      if (b.teamId && teamId && b.teamId === teamId) return true;
      const bTeam = (b.teamName || '').toLowerCase().trim();
      return (targetTn && bTeam === targetTn) || (targetCode && bTeam === targetCode);
    });
  }, [budgets, currentActiveTeam]);

  const myTeamActualCosts = useMemo(() => {
    const activeTeam = currentActiveTeam;
    if (!activeTeam) return [];
    const targetTn = (activeTeam.name || '').toLowerCase().trim();
    const targetCode = (activeTeam.teamCode || '').toLowerCase().trim();
    const teamId = activeTeam.id;
    return costs.filter(c => {
      if (c.teamId && teamId && c.teamId === teamId) return true;
      const cTeam = (c.teamName || '').toLowerCase().trim();
      return (targetTn && cTeam === targetTn) || (targetCode && cTeam === targetCode);
    });
  }, [costs, currentActiveTeam]);

  const availableTeamBudgetMonths = useMemo(() => {
    const list = Array.from(new Set(myTeamBudgets.map(b => b.month))).filter((m): m is string => typeof m === 'string' && !!m);
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [myTeamBudgets]);

  const availableTeamCostMonths = useMemo(() => {
    const list = Array.from(new Set(myTeamActualCosts.map(c => c.month))).filter((m): m is string => typeof m === 'string' && !!m);
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [myTeamActualCosts]);

  const filteredTeamBudgets = useMemo(() => {
    if (!teamBudgetMonthFilter || teamBudgetMonthFilter === 'all') return myTeamBudgets;
    return myTeamBudgets.filter(b => b.month === teamBudgetMonthFilter);
  }, [myTeamBudgets, teamBudgetMonthFilter]);

  const filteredTeamActualCosts = useMemo(() => {
    if (!teamCostMonthFilter || teamCostMonthFilter === 'all') return myTeamActualCosts;
    return myTeamActualCosts.filter(c => c.month === teamCostMonthFilter);
  }, [myTeamActualCosts, teamCostMonthFilter]);

  const teamAggregatedData = useMemo(() => {
    if (!userProfile?.teamName) return [];
    const targetTeam = String(userProfile.teamName).toLowerCase().trim();
    const data: Record<string, { projectName: string; budgetTotal: number; costTotal: number }> = {};

    budgets
      .filter(b => (b.teamName || '').toLowerCase().trim() === targetTeam)
      .forEach(b => {
        const key = b.projectId;
        if (!data[key]) {
          data[key] = { projectName: b.projectName || 'N/A', budgetTotal: 0, costTotal: 0 };
        }
        data[key].budgetTotal += b.amount || 0;
      });

    costs
      .filter(c => (c.teamName || '').toLowerCase().trim() === targetTeam)
      .forEach(c => {
        const key = c.projectId;
        if (!data[key]) {
          data[key] = { projectName: c.projectName || 'N/A', budgetTotal: 0, costTotal: 0 };
        }
        data[key].costTotal += c.amount || 0;
      });

    return Object.values(data);
  }, [budgets, costs, userProfile?.teamName]);

  const isBudgetVisibleToUser = useCallback((b: any) => {
    if (isAdmin || isMod || isAccountant) return true;
    const userEmail = user?.email?.toLowerCase() || '';
    const budgetEmail = (b.userEmail || b.createdByEmail || '').toLowerCase();
    const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
    const isAssigned = (b.assignedUserEmail || '').toLowerCase() === userEmail;
    const isAssignedGDDA = isGDDA && (
      !userProfile?.assignedProjects || 
      userProfile.assignedProjects.length === 0 || 
      userProfile.assignedProjects.includes(b.projectId)
    );

    // Check same team for all team members (and GDKD)
    const myTeamName = (userProfile?.teamName || '').toLowerCase().trim();
    const bTeamName = (b.teamName || '').toLowerCase().trim();
    const activeTeam = currentActiveTeam;
    const activeTeamName = (activeTeam?.name || '').toLowerCase().trim();
    const activeTeamCode = (activeTeam?.teamCode || '').toLowerCase().trim();
    const bTeamCode = (b.teamCode || '').toLowerCase().trim();
    
    const isSameTeam = Boolean(
      (myTeamName && bTeamName && myTeamName === bTeamName) ||
      (activeTeamName && bTeamName && activeTeamName === bTeamName) ||
      (activeTeam?.id && b.teamId === activeTeam.id) ||
      (activeTeamCode && (bTeamName === activeTeamCode || bTeamCode === activeTeamCode))
    );

    // Check same block for GDKhoi
    const isSameBlock = isGDKhoi && (
      (currentActiveBlock && isTeamInBlock(b.teamId || b.teamName, currentActiveBlock)) ||
      (myBlockTeams && myBlockTeams.some((t: any) => t.id === b.teamId || t.name.toLowerCase().trim() === bTeamName))
    );

    return Boolean(isOwner || isAssigned || isAssignedGDDA || isSameTeam || isSameBlock);
  }, [isAdmin, isMod, isAccountant, isGDDA, isGDKhoi, user?.uid, user?.email, userProfile?.teamName, userProfile?.assignedProjects, currentActiveTeam, currentActiveBlock, myBlockTeams]);

  const safeArrayOfStrings = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean).map((x: any) => String(x).toLowerCase().trim());
    if (typeof val === 'string') return [val.toLowerCase().trim()];
    return [];
  };

  const myTeamNotifications = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    const myTeamName = (userProfile?.teamName || '').toLowerCase().trim();
    const myTeamId = userProfile?.teamId || '';
    const activeTeam = currentActiveTeam;
    const activeTeamName = (activeTeam?.name || '').toLowerCase().trim();
    const activeTeamCode = (activeTeam?.teamCode || '').toLowerCase().trim();
    const activeTeamId = activeTeam?.id || '';

    return teamNotifications.filter(n => {
      // 1. Super Admin, Admin, Accountant, Mod can see all notifications
      if (isAdmin || isSuperAdmin || isMod || isAccountant) return true;

      // 2. Creator or any user who has registered/modified/contributed to this budget
      const recipients = Array.from(new Set([
        ...safeArrayOfStrings(n.recipients),
        ...safeArrayOfStrings(n.previousRegistrants),
        ...safeArrayOfStrings(n.targetEmails)
      ]));
      const creatorEmail = (n.creatorEmail || n.userEmail || n.createdByEmail || '').toLowerCase().trim();
      const editorEmail = (n.editorEmail || '').toLowerCase().trim();

      if (userEmail && (
        recipients.includes(userEmail) ||
        creatorEmail === userEmail ||
        editorEmail === userEmail ||
        (n.createdBy && n.createdBy === user?.uid)
      )) {
        return true;
      }

      // 3. Team match (active team or user's assigned team)
      const nTeamId = n.teamId || '';
      const nTeamName = (n.teamName || '').toLowerCase().trim();
      const nTeamCode = (n.teamCode || '').toLowerCase().trim();

      if (activeTeamId && nTeamId && nTeamId === activeTeamId) return true;
      if (activeTeamName && nTeamName && (nTeamName === activeTeamName || nTeamName === activeTeamCode || (nTeamCode && nTeamCode === activeTeamCode))) return true;
      if (myTeamId && nTeamId && nTeamId === myTeamId) return true;
      if (myTeamName && nTeamName && (nTeamName === myTeamName || (nTeamCode && nTeamCode === myTeamName))) return true;

      // 4. GDDA / GDKhoi check
      if (isGDDA && n.projectId && (!userProfile?.assignedProjects || userProfile.assignedProjects.length === 0 || userProfile.assignedProjects.includes(n.projectId))) {
        return true;
      }
      if (isGDKhoi && isTeamInBlock(nTeamId || nTeamName, currentActiveBlock)) {
        return true;
      }

      return false;
    });
  }, [teamNotifications, user?.email, user?.uid, userProfile?.teamName, userProfile?.teamId, userProfile?.assignedProjects, currentActiveTeam, currentActiveBlock, isAdmin, isSuperAdmin, isMod, isAccountant, isGDDA, isGDKhoi]);

  const unreadTeamNotifCount = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    if (!userEmail) return 0;
    return myTeamNotifications.filter(n => {
      const readList = safeArrayOfStrings(n.readBy);
      return !readList.includes(userEmail);
    }).length;
  }, [myTeamNotifications, user?.email]);

  const markTeamNotifAsRead = async (notifId: string) => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    if (!userEmail) return;
    try {
      const notifRef = doc(db, 'teamNotifications', notifId);
      await updateDoc(notifRef, {
        readBy: arrayUnion(userEmail)
      });
    } catch (e) {
      console.warn('Failed to mark notification as read', e);
    }
  };

  const markAllTeamNotifsAsRead = async () => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    if (!userEmail) return;
    try {
      const unread = myTeamNotifications.filter(n => {
        const readList = safeArrayOfStrings(n.readBy);
        return !readList.includes(userEmail);
      });
      if (unread.length === 0) return;
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'teamNotifications', n.id), {
          readBy: arrayUnion(userEmail)
        });
      });
      await batch.commit();
      toast.success('ÄÃ£ Ä‘Ã¡nh dáº¥u Ä‘Ã£ Ä‘á»c táº¥t cáº£ thÃ´ng bÃ¡o');
    } catch (e) {
      console.warn('Failed to mark all as read', e);
    }
  };

  const sendBudgetChangeNotification = async ({
    budgetId,
    projectId,
    projectName,
    teamId,
    teamName,
    teamCode,
    month,
    oldAmount,
    newAmount,
    editorName,
    editorEmail,
    reason,
    originalBudget,
    subBudgetsList = []
  }: {
    budgetId: string;
    projectId: string;
    projectName: string;
    teamId: string;
    teamName: string;
    teamCode?: string;
    month: string;
    oldAmount: number;
    newAmount: number;
    editorName: string;
    editorEmail: string;
    reason?: string;
    originalBudget?: any;
    subBudgetsList?: any[];
  }) => {
    try {
      const creatorEmail = (originalBudget?.userEmail || originalBudget?.createdByEmail || '').toLowerCase().trim();
      const assignedEmail = (originalBudget?.assignedUserEmail || '').toLowerCase().trim();
      const origSubEmails = (originalBudget?.subBudgets || []).map((s: any) => (s.userEmail || s.email || '').toLowerCase().trim()).filter(Boolean);
      const currSubEmails = subBudgetsList.map((s: any) => (s.userEmail || s.email || '').toLowerCase().trim()).filter(Boolean);
      const historyEmails = (originalBudget?.editHistory || []).map((h: any) => (h.editorEmail || '').toLowerCase().trim()).filter(Boolean);

      // Collect all affected user emails (creator, all users with subBudgets, previous editors)
      const allRecipients = Array.from(new Set([
        creatorEmail,
        assignedEmail,
        ...origSubEmails,
        ...currSubEmails,
        ...historyEmails
      ])).filter(Boolean);

      const diff = newAmount - (oldAmount || 0);
      const diffStr = diff > 0 ? `+${formatCurrency(diff)}` : (diff < 0 ? `-${formatCurrency(Math.abs(diff))}` : '0Ä‘');

      const notifTitle = `NgÃ¢n sÃ¡ch dá»± Ã¡n ${projectName} (${month}) Ä‘Ã£ Ä‘Æ°á»£c thay Ä‘á»•i`;
      const notifMessage = `NgÃ¢n sÃ¡ch Ä‘Äƒng kÃ½ dá»± Ã¡n ${projectName} (${month}) Ä‘Ã£ Ä‘Æ°á»£c ${editorName} cáº­p nháº­t: ${formatCurrency(oldAmount || 0)} âžœ ${formatCurrency(newAmount)} (${diffStr}).${reason ? ` LÃ½ do: ${reason}` : ''}`;

      await addDoc(collection(db, 'teamNotifications'), {
        type: 'BUDGET_CHANGED',
        budgetId,
        projectId,
        projectName,
        teamId,
        teamName,
        teamCode: teamCode || originalBudget?.teamCode || extractTeamCode(teamName),
        month,
        oldAmount: oldAmount || 0,
        newAmount,
        difference: diff,
        editorName,
        editorEmail: (editorEmail || '').toLowerCase().trim(),
        creatorEmail,
        createdBy: originalBudget?.createdBy || '',
        recipients: allRecipients,
        previousRegistrants: allRecipients,
        targetEmails: allRecipients,
        title: notifTitle,
        message: notifMessage,
        reason: reason || '',
        createdAt: serverTimestamp(),
        readBy: editorEmail ? [editorEmail.toLowerCase().trim()] : []
      });
    } catch (err) {
      console.warn('Failed to send budget change notification:', err);
    }
  };

  const handleCreateBlock = async () => {
    if (!blockNameInput.trim() || !blockCodeInput.trim()) {
      toast.error("Vui lÃ²ng nháº­p MÃ£ Khá»‘i vÃ  TÃªn Khá»‘i!");
      return;
    }
    const finalPrefix = blockPrefixInput.trim() || blockCodeInput.trim().toUpperCase();
    try {
      const q = query(collection(db, 'blocks'), where('blockCode', '==', blockCodeInput.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("MÃ£ Khá»‘i nÃ y Ä‘Ã£ tá»“n táº¡i trÃªn há»‡ thá»‘ng!");
        return;
      }

      const blockRef = await addDoc(collection(db, 'blocks'), {
        name: blockNameInput.trim(),
        blockCode: blockCodeInput.trim().toUpperCase(),
        teamPrefix: finalPrefix.toUpperCase(),
        directorUid: blockDirectorUid || null,
        assistantUids: createBlockAssistantUids || [],
        createdAt: serverTimestamp(),
        createdBy: user?.uid
      });

      // Update GÄ Khá»‘i user and their role
      if (blockDirectorUid) {
        const targetUser = allUsers.find(u => u.uid === blockDirectorUid || u.id === blockDirectorUid);
        if (targetUser) {
          await updateDoc(doc(db, 'users', targetUser.id), {
            assignedBlock: blockCodeInput.trim().toUpperCase(),
            role: 'gd_khoi'
          });
        }
      }

      // Update Trá»£ lÃ½ Khá»‘i users and their role
      if (createBlockAssistantUids.length > 0) {
        for (const astUid of createBlockAssistantUids) {
          const targetUser = allUsers.find(u => u.uid === astUid || u.id === astUid);
          if (targetUser && targetUser.role !== 'admin' && targetUser.role !== 'super_admin' && targetUser.role !== 'gd_khoi') {
            await updateDoc(doc(db, 'users', targetUser.id), {
              assignedBlock: blockCodeInput.trim().toUpperCase(),
              role: 'tro_ly_khoi'
            });
          }
        }
      }

      // Assign selected teams to this new block
      if (selectedTeamIdsForNewBlock.length > 0) {
        for (const teamId of selectedTeamIdsForNewBlock) {
          await updateDoc(doc(db, 'teams', teamId), {
            blockId: blockRef.id,
            blockCode: blockCodeInput.trim().toUpperCase()
          });
          await logAction('UPDATE', 'teams', teamId, { blockId: blockRef.id, blockCode: blockCodeInput.trim().toUpperCase() });
        }
      }

      await logAction('CREATE', 'blocks', blockRef.id, { name: blockNameInput, blockCode: blockCodeInput, assistantUids: createBlockAssistantUids });
      toast.success("Táº¡o Khá»‘i má»›i thÃ nh cÃ´ng!");
      
      // Reset inputs & close dialog
      setBlockNameInput('');
      setBlockCodeInput('');
      setBlockPrefixInput('');
      setBlockDirectorUid('');
      setCreateBlockAssistantUids([]);
      setCreateBlockTeamSearch('');
      setSelectedTeamIdsForNewBlock([]);
      setIsCreateBlockDialogOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'blocks');
    }
  };

  const handleOpenEditBlockDialog = () => {
    const block = currentActiveBlock;
    if (!block) {
      toast.error("Vui lÃ²ng chá»n má»™t khá»‘i Ä‘á»ƒ chá»‰nh sá»­a!");
      return;
    }
    setEditBlockNameInput(block.name || '');
    setEditBlockCodeInput(block.blockCode || '');
    setEditBlockPrefixInput(block.teamPrefix || '');
    setEditBlockDirectorUid(block.directorUid || '');
    setEditBlockAssistantUids(Array.isArray(block.assistantUids) ? block.assistantUids : []);
    setIsEditBlockDialogOpen(true);
  };

  const handleUpdateBlock = async () => {
    const block = currentActiveBlock;
    if (!block) {
      toast.error("Vui lÃ²ng chá»n má»™t Khá»‘i!");
      return;
    }
    if (!editBlockNameInput.trim() || !editBlockCodeInput.trim()) {
      toast.error("MÃ£ Khá»‘i vÃ  TÃªn Khá»‘i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng!");
      return;
    }

    const newCode = editBlockCodeInput.trim().toUpperCase();
    const newName = editBlockNameInput.trim();
    const newPrefix = editBlockPrefixInput.trim().toUpperCase() || newCode;
    const newDirectorUid = editBlockDirectorUid || null;

    try {
      // Check duplicate blockCode if changed
      if (newCode !== block.blockCode) {
        const q = query(collection(db, 'blocks'), where('blockCode', '==', newCode));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast.error("MÃ£ Khá»‘i nÃ y Ä‘Ã£ tá»“n táº¡i trÃªn há»‡ thá»‘ng!");
          return;
        }
      }

      const blockRef = doc(db, 'blocks', block.id);
      await updateDoc(blockRef, {
        name: newName,
        blockCode: newCode,
        teamPrefix: newPrefix,
        directorUid: newDirectorUid,
        assistantUids: editBlockAssistantUids || []
      });
      await logAction('UPDATE', 'blocks', block.id, { name: newName, blockCode: newCode, teamPrefix: newPrefix, directorUid: newDirectorUid, assistantUids: editBlockAssistantUids });

      // If blockCode changed, update all teams belonging to this block to matching blockCode
      if (newCode !== block.blockCode) {
        const affectedTeams = teams.filter(t => t.blockId === block.id || t.blockCode === block.blockCode);
        for (const t of affectedTeams) {
          await updateDoc(doc(db, 'teams', t.id), {
            blockCode: newCode
          });
          await logAction('UPDATE', 'teams', t.id, { blockCode: newCode });
        }
      }

      // Update director user profile if specified
      if (newDirectorUid && newDirectorUid !== block.directorUid) {
        const targetUser = allUsers.find(u => u.uid === newDirectorUid || u.id === newDirectorUid);
        if (targetUser) {
          await updateDoc(doc(db, 'users', targetUser.id), {
            assignedBlock: newCode,
            role: 'gd_khoi'
          });
        }
      }

      // Update assistants user profiles
      if (editBlockAssistantUids && editBlockAssistantUids.length > 0) {
        for (const astUid of editBlockAssistantUids) {
          const targetUser = allUsers.find(u => u.uid === astUid || u.id === astUid);
          if (targetUser && targetUser.role !== 'admin' && targetUser.role !== 'super_admin' && targetUser.role !== 'gd_khoi') {
            await updateDoc(doc(db, 'users', targetUser.id), {
              assignedBlock: newCode,
              role: 'tro_ly_khoi'
            });
          }
        }
      }

      toast.success("Cáº­p nháº­t thÃ´ng tin Khá»‘i thÃ nh cÃ´ng!");
      setIsEditBlockDialogOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'blocks');
    }
  };

  const handleRemoveTeamFromBlockDirect = async (teamId: string, teamName: string) => {
    const block = currentActiveBlock;
    if (!block) return;
    if (!window.confirm(`Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a phÃ²ng kinh doanh "${teamName}" khá»i Khá»‘i? (ThÃ´ng tin phÃ²ng kinh doanh nÃ y váº«n sáº½ Ä‘Æ°á»£c lÆ°u Ä‘á»™c láº­p trÃªn há»‡ thá»‘ng)`)) return;
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        blockId: 'unassigned',
        blockCode: 'unassigned'
      });
      await logAction('UPDATE', 'teams', teamId, { blockId: 'unassigned', blockCode: 'unassigned' });
      toast.success(`ÄÃ£ xÃ³a phÃ²ng "${teamName}" khá»i Khá»‘i thÃ nh cÃ´ng!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'teams');
    }
  };

  const handleCreateAndAssignTeam = async () => {
    if (!newBlockTeamName.trim()) {
      toast.error("Vui lÃ²ng nháº­p tÃªn PhÃ²ng Kinh Doanh!");
      return;
    }
    let finalCode = newBlockTeamCode.trim().toUpperCase();
    if (!finalCode) {
      finalCode = extractTeamCode(newBlockTeamName);
    }
    const prefix = (currentActiveBlock?.teamPrefix || '').toUpperCase().trim();
    if (prefix && !finalCode.startsWith(prefix)) {
      finalCode = `${prefix}${finalCode}`;
    }

    const nameDup = teams.some(t => t.name.toLowerCase().trim() === newBlockTeamName.toLowerCase().trim());
    if (nameDup) {
      toast.error("TÃªn PhÃ²ng Kinh Doanh Ä‘Ã£ tá»“n táº¡i!");
      return;
    }
    const codeDup = teams.some(t => (t.teamCode || '').toUpperCase().trim() === finalCode);
    if (codeDup) {
      toast.error(`MÃ£ phÃ²ng "${finalCode}" Ä‘Ã£ tá»“n táº¡i! Vui lÃ²ng chá»n mÃ£ khÃ¡c.`);
      return;
    }

    setIsCreatingBlockTeam(true);
    try {
      const docRef = await addDoc(collection(db, 'teams'), {
        name: newBlockTeamName.trim(),
        teamCode: finalCode,
        blockId: currentActiveBlock?.id || '',
        blockCode: currentActiveBlock?.blockCode || '',
        createdAt: serverTimestamp(),
        createdBy: user?.uid
      });
      await logAction('CREATE', 'teams', docRef.id, { name: newBlockTeamName, teamCode: finalCode, blockId: currentActiveBlock?.id });
      toast.success(`ÄÃ£ táº¡o vÃ  gÃ¡n PhÃ²ng Kinh Doanh "${newBlockTeamName}" (${finalCode}) vÃ o Khá»‘i!`);
      setNewBlockTeamName('');
      setNewBlockTeamCode('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teams');
    } finally {
      setIsCreatingBlockTeam(false);
    }
  };

  const handleAddTeamToBlockDirect = async (teamId: string) => {
    const block = currentActiveBlock;
    if (!block) {
      toast.error("KhÃ´ng tÃ¬m tháº¥y Khá»‘i nÃ o Ä‘ang hoáº¡t Ä‘á»™ng!");
      return;
    }
    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) {
      toast.error("KhÃ´ng tÃ¬m tháº¥y phÃ²ng kinh doanh!");
      return;
    }
    if (!window.confirm(`Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n thÃªm phÃ²ng kinh doanh "${targetTeam.name}" vÃ o Khá»‘i "${block.name}"?`)) return;
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        blockId: block.id,
        blockCode: block.blockCode
      });
      await logAction('UPDATE', 'teams', teamId, { blockId: block.id, blockCode: block.blockCode });
      toast.success(`ÄÃ£ thÃªm phÃ²ng "${targetTeam.name}" vÃ o Khá»‘i thÃ nh cÃ´ng!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'teams');
    }
  };

  const handleDeleteTeamFromSystem = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Báº¡n cÃ³ cháº¯c muá»‘n XÃ“A VÄ¨NH VIá»„N team "${teamName}" khá»i há»‡ thá»‘ng? Äiá»u nÃ y khÃ´ng thá»ƒ khÃ´i phá»¥c vÃ  sáº½ há»§y gÃ¡n khá»i má»i tÃ i khoáº£n liÃªn quan.`)) return;
    try {
      await deleteDoc(doc(db, 'teams', teamId));
      await logAction('DELETE', 'teams', teamId, { name: teamName });
      toast.success(`ÄÃ£ xÃ³a vÄ©nh viá»…n team "${teamName}" thÃ nh cÃ´ng!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'teams');
    }
  };

  const handleAddBlockBudget = async () => {
    if (!blockBudgetProject || !blockBudgetTeam || !blockBudgetAmount || !blockBudgetMonth || !blockBudgetImplementer) {
      toast.error("Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin ngÃ¢n sÃ¡ch!");
      return;
    }
    const amt = parseVal(blockBudgetAmount);
    if (amt <= 0) {
      toast.error("Vui lÃ²ng nháº­p ngÃ¢n sÃ¡ch lá»›n hÆ¡n 0!");
      return;
    }
    const selectedProject = projects.find(p => p.id === blockBudgetProject);
    const selectedTeam = teams.find(t => t.id === blockBudgetTeam);
    
    const existsInDb = budgets.some(
      b => b.teamId === blockBudgetTeam && b.projectId === blockBudgetProject && b.month === blockBudgetMonth
    );
    if (existsInDb) {
      toast.error(`Team "${selectedTeam?.name || 'N/A'}" Ä‘Ã£ Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch cho dá»± Ã¡n "${selectedProject?.name || 'N/A'}" trong ká»³ ${blockBudgetMonth}. Má»—i dá»± Ã¡n chá»‰ Ä‘Æ°á»£c Ä‘Äƒng kÃ½ 1 ngÃ¢n sÃ¡ch trong 1 ká»³.`);
      return;
    }
    
    try {
      const docRef = await addDoc(collection(db, 'budgets'), {
        projectId: blockBudgetProject,
        projectName: selectedProject?.name || 'N/A',
        teamId: blockBudgetTeam,
        teamName: selectedTeam?.name || 'N/A',
        teamCode: selectedTeam?.teamCode || extractTeamCode(selectedTeam?.name || ''),
        implementerName: blockBudgetImplementer,
        month: blockBudgetMonth,
        amount: amt,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        userEmail: user?.email?.toLowerCase()
      });
      await logAction('CREATE', 'budgets', docRef.id, { projectId: blockBudgetProject, teamName: selectedTeam?.name, amount: amt });
      toast.success("ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch thÃ nh cÃ´ng!");
      setBlockBudgetAmount('');
      setBlockBudgetImplementer('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'budgets');
    }
  };

  const handleAddBlockCost = async () => {
    if (!blockCostProject || !blockCostTeam || !blockCostAmount || !blockCostMonth) {
      toast.error("Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin chi phÃ­!");
      return;
    }
    const amt = parseVal(blockCostAmount);
    if (amt <= 0) {
      toast.error("Vui lÃ²ng nháº­p chi phÃ­ lá»›n hÆ¡n 0!");
      return;
    }
    const selectedProject = projects.find(p => p.id === blockCostProject);
    const selectedTeam = teams.find(t => t.id === blockCostTeam);
    
    const fb = parseVal(blockCostFb);
    const gg = parseVal(blockCostGoogle);
    const zl = parseVal(blockCostZalo);
    const post = parseVal(blockCostPosting);
    const ot = parseVal(blockCostOther) || (amt - fb - gg - zl - post);

    const matchBudget = budgets.find(b => b.projectId === blockCostProject && b.teamId === blockCostTeam && b.month === blockCostMonth);

    try {
      const docRef = await addDoc(collection(db, 'costs'), {
        projectId: blockCostProject,
        projectName: selectedProject?.name || 'N/A',
        teamId: blockCostTeam,
        teamName: selectedTeam?.name || 'N/A',
        teamCode: selectedTeam?.teamCode || extractTeamCode(selectedTeam?.name || ''),
        budgetId: matchBudget?.id || null,
        implementerName: blockCostNote || 'GÄ Khá»‘i ghi nháº­n',
        weekNumber: 1,
        year: new Date(blockCostMonth).getFullYear().toString(),
        month: blockCostMonth,
        amount: amt,
        channels: {
          fbAds: fb,
          googleAds: gg,
          zaloAds: zl,
          posting: post,
          otherCost: ot
        },
        note: blockCostNote || 'GÄ Khá»‘i ghi nháº­n chi phÃ­',
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        userEmail: user?.email?.toLowerCase()
      });
      await logAction('CREATE', 'costs', docRef.id, { projectId: blockCostProject, teamName: selectedTeam?.name, amount: amt });
      toast.success("ThÃªm chi phÃ­ thá»±c táº¿ thÃ nh cÃ´ng!");
      setBlockCostAmount('');
      setBlockCostNote('');
      setBlockCostFb('');
      setBlockCostZalo('');
      setBlockCostGoogle('');
      setBlockCostPosting('');
      setBlockCostOther('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'costs');
    }
  };

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim() || !onboardingTeam) {
      toast.error('Vui lÃ²ng nháº­p há» tÃªn vÃ  chá»n team cá»§a báº¡n theo danh sÃ¡ch');
      return;
    }

    if (!user) return;

    try {
      const selectedTeamObj = teams.find(t => t.name === onboardingTeam || t.id === onboardingTeam || t.teamCode === onboardingTeam);
      const targetTeamName = selectedTeamObj?.name || onboardingTeam;
      const targetTeamId = selectedTeamObj?.id || '';
      const targetTeamCode = selectedTeamObj?.teamCode || extractTeamCode(targetTeamName);

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        fullName: onboardingName.trim(),
        teamName: targetTeamName,
        teamId: targetTeamId,
        teamCode: targetTeamCode,
        updatedAt: serverTimestamp()
      });
      
      setUserProfile(prev => ({
        ...prev,
        fullName: onboardingName.trim(),
        teamName: targetTeamName,
        teamId: targetTeamId,
        teamCode: targetTeamCode
      }));
      
      // Auto-fill form fields across the app
      setImplementerName(onboardingName.trim());
      setSelectedTeamName(targetTeamName);
      if (targetTeamId) {
        setSelectedTeamId(targetTeamId);
      }
      
      setShowOnboarding(false);
      toast.success('ThÃ´ng tin Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t. Team cá»§a báº¡n sáº½ Ä‘Æ°á»£c tá»± Ä‘á»™ng Ä‘á»“ng bá»™ khi Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const names = newProjectName.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    let successCount = 0;
    let duplicateCount = 0;
    const existingNames = new Set(projects.map(p => p.name.toLowerCase()));

    for (const name of names) {
      if (existingNames.has(name.toLowerCase())) {
        duplicateCount++;
        continue;
      }

      const projectCode = extractProjectCode(name);

      try {
        const docRef = await addDoc(collection(db, 'projects'), {
          name,
          projectCode,
          region: newProjectRegion || 'ChÆ°a xÃ¡c Ä‘á»‹nh',
          type: newProjectType,
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'projects', docRef.id, { name, projectCode, region: newProjectRegion, type: newProjectType });
        successCount++;
        existingNames.add(name.toLowerCase());
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'projects');
      }
    }
    
    setNewProjectName('');
    setNewProjectRegion('');
    if (successCount > 0) {
      toast.success(`ÄÃ£ thÃªm ${successCount} dá»± Ã¡n má»›i`);
    }
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} dá»± Ã¡n Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua`);
    }
  };

  const handleImportProjectsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingProjects(true);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length === 0) {
          toast.error("File Excel khÃ´ng cÃ³ dá»¯ liá»‡u.");
          return;
        }

        const batch = writeBatch(db);
        let count = 0;
        let errorsCount = 0;
        const errorDetailsList: string[] = [];
        const existingNames = new Set(projects.map(p => p.name.toLowerCase()));

        for (let i = 0; i < rawJson.length; i++) {
          const rowData = rawJson[i];
          const rowIndex = i + 2;
          const row: any = {};
          Object.keys(rowData).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
            row[cleanKey] = rowData[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
              if (row[cleanPK] !== undefined && row[cleanPK] !== '') return row[cleanPK];
            }
            return undefined;
          };

          const name = String(getVal(['TÃªn dá»± Ã¡n', 'Dá»± Ã¡n', 'Project', 'Project Name', 'tenduan', 'tÃªn dá»± Ã¡n']) || '').trim();
          const code = String(getVal(['MÃ£ Dá»± Ã¡n', 'MÃ£', 'Code', 'Project Code', 'maduan', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const region = String(getVal(['Miá»n', 'Khu vá»±c', 'VÃ¹ng', 'Region', 'mien', 'khuvuc', 'vÃ¹ng']) || '').trim();
          const type = String(getVal(['Loáº¡i hÃ¬nh', 'Type', 'loaihinh', 'loáº¡i hÃ¬nh']) || '').trim();

          if (!name) {
            if (Object.values(row).some(v => v !== '')) {
              errorDetailsList.push(`DÃ²ng ${rowIndex}: Thiáº¿u tÃªn dá»± Ã¡n.`);
              errorsCount++;
            }
            continue;
          }

          if (existingNames.has(name.toLowerCase())) {
            errorDetailsList.push(`DÃ²ng ${rowIndex}: Dá»± Ã¡n "${name}" Ä‘Ã£ tá»“n táº¡i.`);
            errorsCount++;
            continue;
          }

          const projectCode = code || extractProjectCode(name);
          
          const docRef = doc(collection(db, 'projects'));
          batch.set(docRef, {
            name,
            projectCode,
            region: region || 'ChÆ°a xÃ¡c Ä‘á»‹nh',
            type: type || 'ChÆ°a phÃ¢n loáº¡i',
            createdAt: serverTimestamp(),
            createdBy: user?.uid
          });
          
          existingNames.add(name.toLowerCase());
          count++;
          
          if (count >= 450) break; // Firestore batch limit
        }

        if (count > 0) {
          await batch.commit();
          await logAction('IMPORT_PROJECTS', 'projects', 'bulk', { count, errors: errorsCount });
          toast.success(`ÄÃ£ thÃªm ${count} dá»± Ã¡n má»›i tá»« Excel.`);
        }

        if (errorsCount > 0) {
          setImportErrors(errorDetailsList);
          setIsImportErrorsDialogOpen(true);
        }

        if (count === 0 && errorsCount > 0) {
          toast.error("KhÃ´ng cÃ³ dá»± Ã¡n há»£p lá»‡ nÃ o Ä‘Æ°á»£c thÃªm.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Lá»—i khi xá»­ lÃ½ file Excel.");
      } finally {
        setIsImportingProjects(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || isAddingTeam) return;
    
    const names = newTeamName.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    setIsAddingTeam(true);
    toast.info(`Äang thÃªm ${names.length} team...`);
    let successCount = 0;
    let duplicateCount = 0;
    const existingNames = new Set(teams.map(t => (t.name || '').toLowerCase().trim()));

    const targetBlock = newTeamBlockId && newTeamBlockId !== 'none' ? blocks.find(b => b.id === newTeamBlockId) : null;

    for (const rawLine of names) {
      let name = rawLine;
      let customCode = '';
      if (rawLine.includes(' - ')) {
        const parts = rawLine.split(' - ');
        name = parts[0].trim();
        customCode = parts[1].trim();
      } else if (rawLine.includes(' | ')) {
        const parts = rawLine.split(' | ');
        name = parts[0].trim();
        customCode = parts[1].trim();
      }

      name = normalizeTeamName(name);
      if (existingNames.has(name.toLowerCase())) {
        duplicateCount++;
        continue;
      }

      const teamCode = customCode ? normalizeTeamCode(customCode) : normalizeTeamCode(extractTeamCode(name));

      try {
        const docRef = await addDoc(collection(db, 'teams'), {
          name,
          teamCode,
          blockId: targetBlock?.id || '',
          blockCode: targetBlock?.blockCode || '',
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'teams', docRef.id, { name, teamCode, blockId: targetBlock?.id, blockCode: targetBlock?.blockCode });
        successCount++;
        existingNames.add(name.toLowerCase());
      } catch (error) {
        console.error('Error adding team:', error);
        handleFirestoreError(error, OperationType.WRITE, 'teams');
      }
    }
    
    setNewTeamName('');
    setNewTeamBlockId('none');
    setIsAddingTeam(false);
    if (successCount > 0) {
      toast.success(`ÄÃ£ thÃªm ${successCount} team má»›i thÃ nh cÃ´ng`);
    }
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} team Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua`);
    }
  };

  const handleImportTeamsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingTeams(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length === 0) {
          toast.error("File Excel khÃ´ng cÃ³ dá»¯ liá»‡u.");
          return;
        }

        let count = 0;
        let duplicateCount = 0;
        const existingNames = new Set(teams.map(t => (t.name || '').toLowerCase().trim()));

        for (let i = 0; i < rawJson.length; i++) {
          const rowData = rawJson[i];
          const row: any = {};
          Object.keys(rowData).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
            row[cleanKey] = rowData[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
              if (row[cleanPK] !== undefined && row[cleanPK] !== '') return row[cleanPK];
            }
            return undefined;
          };

          const name = String(getVal(['TÃªn Team', 'TÃªn phÃ²ng', 'TÃªn Ä‘á»™i', 'Team', 'name', 'tÃªn team', 'tÃªn phÃ²ng', 'tÃªn']) || '').trim();
          if (!name) continue;

          const normalized = normalizeTeamName(name);
          if (existingNames.has(normalized.toLowerCase())) {
            duplicateCount++;
            continue;
          }

          const rawCode = String(getVal(['MÃ£ Team', 'MÃ£ phÃ²ng', 'MÃ£', 'teamCode', 'mÃ£ team', 'mÃ£ phÃ²ng', 'code']) || '').trim();
          const teamCode = rawCode ? normalizeTeamCode(rawCode) : normalizeTeamCode(extractTeamCode(normalized));

          const rawBlock = String(getVal(['Khá»‘i', 'MÃ£ Khá»‘i', 'blockCode', 'block', 'khá»‘i', 'mÃ£ khá»‘i']) || '').trim();
          const matchedBlock = rawBlock ? blocks.find(b => (b.blockCode && b.blockCode.toLowerCase() === rawBlock.toLowerCase()) || (b.name && b.name.toLowerCase() === rawBlock.toLowerCase())) : null;

          try {
            const docRef = await addDoc(collection(db, 'teams'), {
              name: normalized,
              teamCode,
              blockId: matchedBlock?.id || '',
              blockCode: matchedBlock?.blockCode || '',
              createdAt: serverTimestamp(),
              createdBy: user?.uid
            });
            await logAction('CREATE', 'teams', docRef.id, { name: normalized, teamCode });
            existingNames.add(normalized.toLowerCase());
            count++;
          } catch (err) {
            console.error('Error importing team:', err);
          }
        }

        if (count > 0) toast.success(`ÄÃ£ nháº­p thÃ nh cÃ´ng ${count} team tá»« Excel!`);
        if (duplicateCount > 0) toast.warning(`${duplicateCount} team Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua.`);
      } catch (err) {
        console.error("Import teams error:", err);
        toast.error("Lá»—i khi Ä‘á»c file Excel.");
      } finally {
        setIsImportingTeams(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpdateProject = async (id: string, newName: string, newCode: string, region?: string, type?: string) => {
    if (!newName.trim()) return;
    try {
      const updateData: any = { 
        name: newName,
        projectCode: newCode || '',
        updatedAt: serverTimestamp()
      };
      if (region !== undefined) updateData.region = region;
      if (type !== undefined) updateData.type = type;
      
      await updateDoc(doc(db, 'projects', id), updateData);
      await logAction('UPDATE', 'projects', id, updateData);
      setEditingProjectId(null);
      toast.success('ÄÃ£ cáº­p nháº­t dá»± Ã¡n');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleSyncProjectCodes = async () => {
    setIsSyncingProjects(true);
    try {
      let count = 0;
      const ops: any[] = [];
      projects.forEach(p => {
        if (!p.projectCode) {
          const code = extractProjectCode(p.name);
          if (code) {
            ops.push({ ref: doc(db, 'projects', p.id), data: { projectCode: code, updatedAt: serverTimestamp() } });
            count++;
          }
        }
      });

      if (ops.length > 0) {
        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(db);
          ops.slice(i, i + 450).forEach(op => batch.update(op.ref, op.data));
          await batch.commit();
        }
        await logAction('SYNC_PROJECT_CODES', 'projects', 'all', { count });
        toast.success(`ÄÃ£ cáº­p nháº­t mÃ£ cho ${count} dá»± Ã¡n`);
      } else {
        toast.info('Táº¥t cáº£ dá»± Ã¡n Ä‘Ã£ cÃ³ mÃ£ hoáº·c khÃ´ng tÃ¬m tháº¥y mÃ£ há»£p lá»‡ trong tÃªn');
      }
    } catch (error) {
      console.error('Error syncing project codes:', error);
      toast.error('Lá»—i khi Ä‘á»“ng bá»™ mÃ£ dá»± Ã¡n');
    } finally {
      setIsSyncingProjects(false);
    }
  };

  const handleSyncTeamCodes = async () => {
    setIsSyncingTeams(true);
    try {
      let count = 0;
      const ops: any[] = [];
      teams.forEach(t => {
        const normName = normalizeTeamName(t.name);
        const normCode = normalizeTeamCode(t.teamCode || extractTeamCode(t.name));
        if ((normCode && t.teamCode !== normCode) || (normName && t.name !== normName)) {
          ops.push({ 
            ref: doc(db, 'teams', t.id), 
            data: { 
              name: normName,
              teamCode: normCode, 
              updatedAt: serverTimestamp() 
            } 
          });
          count++;
        }
      });

      if (ops.length > 0) {
        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(db);
          ops.slice(i, i + 450).forEach(op => batch.update(op.ref, op.data));
          await batch.commit();
        }
        await logAction('SYNC_TEAM_CODES', 'teams', 'all', { count });
        toast.success(`ÄÃ£ chuáº©n hÃ³a vÃ  Ä‘á»“ng bá»™ tÃªn/mÃ£ cho ${count} team (quy táº¯c MAYxx.xx)`);
      } else {
        toast.info('Táº¥t cáº£ mÃ£ vÃ  tÃªn team Ä‘Ã£ chuáº©n hÃ³a theo Ä‘Ãºng quy táº¯c (vÃ­ dá»¥ MAY14, MAY79.56, MAY36.01)');
      }
    } catch (error) {
      console.error('Error syncing team codes:', error);
      toast.error('Lá»—i khi Ä‘á»“ng bá»™ mÃ£ team');
    } finally {
      setIsSyncingTeams(false);
    }
  };

  const handleSyncBudgetPermissions = async () => {
    setIsSyncingBudgetPermissions(true);
    try {
      let count = 0;
      const ops: any[] = [];
      
      budgets.forEach(b => {
        const implementer = b.implementerName || '';
        const emailMatch = extractEmail(implementer);
        
        if (emailMatch && (b.assignedUserEmail !== emailMatch || b.userEmail !== emailMatch)) {
          ops.push({
            ref: doc(db, 'budgets', b.id),
            data: { 
              assignedUserEmail: emailMatch,
              userEmail: emailMatch,
              updatedAt: serverTimestamp(),
              updatedBy: user?.uid
            }
          });
          count++;
        }
      });
      
      costs.forEach(c => {
        if (c.budgetId) {
          const parentBudget = budgets.find(b => b.id === c.budgetId);
          const budgetEmail = parentBudget?.assignedUserEmail || extractEmail(parentBudget?.implementerName || '');
          
          if (budgetEmail && (c.assignedUserEmail !== budgetEmail || c.userEmail !== budgetEmail)) {
            ops.push({
              ref: doc(db, 'costs', c.id),
              data: { 
                assignedUserEmail: budgetEmail,
                userEmail: budgetEmail,
                updatedAt: serverTimestamp()
              }
            });
            count++;
          }
        }
      });

      if (ops.length > 0) {
        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(db);
          ops.slice(i, i + 450).forEach(op => batch.update(op.ref, op.data));
          await batch.commit();
        }
        await logAction('SYNC_BUDGET_PERMISSIONS', 'budgets', 'all', { count });
        toast.success(`ÄÃ£ Ä‘á»“ng bá»™ phÃ¢n quyá»n cho ${count} báº£n ghi`);
      } else {
        toast.info('Táº¥t cáº£ dá»¯ liá»‡u Ä‘Ã£ Ä‘Æ°á»£c Ä‘á»“ng bá»™ phÃ¢n quyá»n');
      }
    } catch (error) {
      console.error('Error syncing budget permissions:', error);
      toast.error('Lá»—i khi Ä‘á»“ng bá»™ phÃ¢n quyá»n ngÃ¢n sÃ¡ch');
    } finally {
      setIsSyncingBudgetPermissions(false);
    }
  };

  const handleDeleteProject = (id: string, name: string) => {
    setProjectToDelete({ id, name });
    setIsDeleteProjectDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete.id));
      await logAction('DELETE', 'projects', projectToDelete.id, { name: projectToDelete.name });
      toast.success('ÄÃ£ xÃ³a dá»± Ã¡n');
      setIsDeleteProjectDialogOpen(false);
      setProjectToDelete(null);
      setSelectedProjectIds(prev => prev.filter(pid => pid !== projectToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'projects');
    }
  };

  const handleBulkDeleteProjects = async () => {
    if (selectedProjectIds.length === 0 || isDeletingProjects) return;
    setIsBulkDeleteProjectsDialogOpen(true);
  };

  const confirmBulkDeleteProjects = async () => {
    setIsDeletingProjects(true);
    setIsBulkDeleteProjectsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedProjectIds.forEach(id => {
        batch.delete(doc(db, 'projects', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'projects', 'multiple', { count: selectedProjectIds.length });
      toast.success(`ÄÃ£ xÃ³a ${selectedProjectIds.length} dá»± Ã¡n`);
      setSelectedProjectIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'projects');
    } finally {
      setIsDeletingProjects(false);
    }
  };

  const handleBulkUpdateProjectRegion = async () => {
    if (selectedProjectIds.length === 0 || !selectedRegionForBulk) {
      toast.error('Vui lÃ²ng chá»n dá»± Ã¡n vÃ  vÃ¹ng/khu vá»±c');
      return;
    }
    setIsBulkUpdateRegionDialogOpen(true);
  };

  const confirmBulkUpdateProjectRegion = async () => {
    setIsBulkUpdateRegionDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedProjectIds.forEach(id => {
        batch.update(doc(db, 'projects', id), { region: selectedRegionForBulk });
      });
      await batch.commit();
      await logAction('UPDATE_BULK', 'projects', 'multiple', { count: selectedProjectIds.length, region: selectedRegionForBulk });
      toast.success(`ÄÃ£ cáº­p nháº­t vÃ¹ng/khu vá»±c cho ${selectedProjectIds.length} dá»± Ã¡n`);
      setSelectedProjectIds([]);
      setSelectedRegionForBulk('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleBulkUpdateProjectType = () => {
    if (selectedProjectIds.length === 0 || !selectedTypeForBulk) {
      toast.error('Vui lÃ²ng chá»n dá»± Ã¡n vÃ  loáº¡i hÃ¬nh');
      return;
    }
    setIsBulkUpdateTypeDialogOpen(true);
  };

  const confirmBulkUpdateProjectType = async () => {
    setIsBulkUpdateTypeDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedProjectIds.forEach(id => {
        batch.update(doc(db, 'projects', id), { type: selectedTypeForBulk });
      });
      await batch.commit();
      await logAction('UPDATE_BULK', 'projects', 'multiple', { count: selectedProjectIds.length, type: selectedTypeForBulk });
      toast.success(`ÄÃ£ cáº­p nháº­t loáº¡i hÃ¬nh cho ${selectedProjectIds.length} dá»± Ã¡n`);
      setSelectedProjectIds([]);
      setSelectedTypeForBulk('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleDeleteAllProjects = async () => {
    if (projects.length === 0) return;
    setIsDeleteAllProjectsDialogOpen(true);
  };

  const confirmDeleteAllProjects = async () => {
    setIsDeleteAllProjectsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      projects.forEach(p => {
        batch.delete(doc(db, 'projects', p.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'projects', 'all', { count: projects.length });
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ dá»± Ã¡n');
      setSelectedProjectIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'projects');
    }
  };

  const handleUpdateTeam = async (id: string, newName: string, newCode: string, newBlockId?: string) => {
    if (!newName.trim()) {
      toast.error('TÃªn team khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng');
      return;
    }
    try {
      const updateData: any = { 
        name: newName.trim(),
        teamCode: newCode.trim() || normalizeTeamCode(extractTeamCode(newName)),
        updatedAt: serverTimestamp() 
      };
      if (newBlockId !== undefined) {
        if (newBlockId === 'none' || !newBlockId) {
          updateData.blockId = '';
          updateData.blockCode = '';
        } else {
          const block = blocks.find(b => b.id === newBlockId);
          updateData.blockId = block?.id || '';
          updateData.blockCode = block?.blockCode || '';
        }
      }
      await updateDoc(doc(db, 'teams', id), updateData);
      await logAction('UPDATE', 'teams', id, updateData);
      setEditingTeamId(null);
      toast.success('ÄÃ£ cáº­p nháº­t team thÃ nh cÃ´ng');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'teams');
    }
  };

  const handleDeleteTeam = (id: string, name: string) => {
    setTeamToDelete({ id, name });
    setIsDeleteTeamDialogOpen(true);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      await deleteDoc(doc(db, 'teams', teamToDelete.id));
      await logAction('DELETE', 'teams', teamToDelete.id, { name: teamToDelete.name });
      toast.success('ÄÃ£ xÃ³a team');
      setIsDeleteTeamDialogOpen(false);
      setTeamToDelete(null);
      setSelectedTeamIds(prev => prev.filter(tid => tid !== teamToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'teams');
    }
  };

  const [isBulkDeleteTeamsDialogOpen, setIsBulkDeleteTeamsDialogOpen] = useState(false);

  const handleBulkDeleteTeams = async () => {
    if (selectedTeamIds.length === 0 || isDeletingTeams) return;
    setIsBulkDeleteTeamsDialogOpen(true);
  };

  const confirmBulkDeleteTeams = async () => {
    setIsDeletingTeams(true);
    setIsBulkDeleteTeamsDialogOpen(false);
    console.log('Bulk deleting teams:', selectedTeamIds);
    try {
      const batch = writeBatch(db);
      selectedTeamIds.forEach(id => {
        batch.delete(doc(db, 'teams', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'teams', 'multiple', { count: selectedTeamIds.length });
      toast.success(`ÄÃ£ xÃ³a ${selectedTeamIds.length} team`);
      setSelectedTeamIds([]);
    } catch (error) {
      console.error('Bulk delete teams error:', error);
      handleFirestoreError(error, OperationType.DELETE, 'teams');
    } finally {
      setIsDeletingTeams(false);
    }
  };

  const [isDeleteAllTeamsDialogOpen, setIsDeleteAllTeamsDialogOpen] = useState(false);

  const handleDeleteAllTeams = async () => {
    if (teams.length === 0) return;
    setIsDeleteAllTeamsDialogOpen(true);
  };

  const confirmDeleteAllTeams = async () => {
    setIsDeleteAllTeamsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      teams.forEach(t => {
        batch.delete(doc(db, 'teams', t.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'teams', 'all', { count: teams.length });
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ team');
      setSelectedTeamIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'teams');
    }
  };

  const handleAddRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionName.trim() || isAddingRegion) return;
    
    const names = newRegionName.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    setIsAddingRegion(true);
    console.log('Adding regions:', names);
    toast.info(`Äang thÃªm ${names.length} vÃ¹ng/khu vá»±c...`);
    let successCount = 0;
    let duplicateCount = 0;
    const existingNames = new Set(regions.map(r => r.name.toLowerCase()));

    try {
      for (const name of names) {
        if (existingNames.has(name.toLowerCase())) {
          duplicateCount++;
          continue;
        }

        const docRef = await addDoc(collection(db, 'regions'), {
          name,
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'regions', docRef.id, { name });
        successCount++;
        existingNames.add(name.toLowerCase());
      }
      
      setNewRegionName('');
      if (successCount > 0) {
        toast.success(`ÄÃ£ thÃªm ${successCount} vÃ¹ng/khu vá»±c má»›i`);
      }
      if (duplicateCount > 0) {
        toast.warning(`${duplicateCount} vÃ¹ng/khu vá»±c Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua`);
      }
    } catch (error) {
      console.error('Error adding region:', error);
      handleFirestoreError(error, OperationType.WRITE, 'regions');
    } finally {
      setIsAddingRegion(false);
    }
  };

  const handleUpdateRegion = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateDoc(doc(db, 'regions', id), { name: newName });
      await logAction('UPDATE', 'regions', id, { name: newName });
      setEditingRegionId(null);
      toast.success('ÄÃ£ cáº­p nháº­t vÃ¹ng/khu vá»±c');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'regions');
    }
  };

  const handleDeleteRegion = (id: string, name: string) => {
    setRegionToDelete({ id, name });
    setIsDeleteRegionDialogOpen(true);
  };

  const confirmDeleteRegion = async () => {
    if (!regionToDelete) return;
    try {
      await deleteDoc(doc(db, 'regions', regionToDelete.id));
      await logAction('DELETE', 'regions', regionToDelete.id, { name: regionToDelete.name });
      toast.success('ÄÃ£ xÃ³a vÃ¹ng/khu vá»±c');
      setIsDeleteRegionDialogOpen(false);
      setRegionToDelete(null);
      setSelectedRegionIds(prev => prev.filter(rid => rid !== regionToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'regions');
    }
  };

  const handleBulkDeleteRegions = async () => {
    if (selectedRegionIds.length === 0 || isDeletingRegions) return;
    setIsBulkDeleteRegionsDialogOpen(true);
  };

  const confirmBulkDeleteRegions = async () => {
    setIsDeletingRegions(true);
    setIsBulkDeleteRegionsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedRegionIds.forEach(id => {
        batch.delete(doc(db, 'regions', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'regions', 'multiple', { count: selectedRegionIds.length });
      toast.success(`ÄÃ£ xÃ³a ${selectedRegionIds.length} vÃ¹ng/khu vá»±c`);
      setSelectedRegionIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'regions');
    } finally {
      setIsDeletingRegions(false);
    }
  };

  const handleDeleteAllRegions = async () => {
    if (regions.length === 0) return;
    setIsDeleteAllRegionsDialogOpen(true);
  };

  const confirmDeleteAllRegions = async () => {
    setIsDeleteAllRegionsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      regions.forEach(r => {
        batch.delete(doc(db, 'regions', r.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'regions', 'all', { count: regions.length });
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ vÃ¹ng/khu vá»±c');
      setSelectedRegionIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'regions');
    }
  };

  const handleSetProjectsForRegion = async () => {
    if (!regionForProjects) return;
    
    try {
      const batch = writeBatch(db);
      // First, remove this region from all projects that currently have it (if we want to overwrite)
      // Or just add it to selected ones.
      // The user says "Set dá»± Ã¡n theo vÃ¹ng / khu vá»±c, cÃ³ thá»ƒ set nhiá»u dá»± Ã¡n cho 1 vÃ¹ng, khu vá»±c."
      // This usually means assigning a list of projects to this region.
      
      for (const projectId of selectedProjectIdsForRegion) {
        batch.update(doc(db, 'projects', projectId), { region: regionForProjects.name });
      }
      
      await batch.commit();
      await logAction('UPDATE_REGION_PROJECTS', 'projects', 'multiple', { region: regionForProjects.name, projectIds: selectedProjectIdsForRegion });
      toast.success(`ÄÃ£ cáº­p nháº­t vÃ¹ng cho ${selectedProjectIdsForRegion.length} dá»± Ã¡n`);
      setIsSetProjectsDialogOpen(false);
      setRegionForProjects(null);
      setSelectedProjectIdsForRegion([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || isAddingType) return;
    
    const names = newTypeName.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    setIsAddingType(true);
    let successCount = 0;
    let duplicateCount = 0;
    const existingNames = new Set(types.map(t => t.name.toLowerCase()));

    try {
      for (const name of names) {
        if (existingNames.has(name.toLowerCase())) {
          duplicateCount++;
          continue;
        }

        const docRef = await addDoc(collection(db, 'types'), {
          name,
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'types', docRef.id, { name });
        successCount++;
        existingNames.add(name.toLowerCase());
      }
      
      setNewTypeName('');
      if (successCount > 0) {
        toast.success(`ÄÃ£ thÃªm ${successCount} loáº¡i hÃ¬nh má»›i`);
      }
      if (duplicateCount > 0) {
        toast.warning(`${duplicateCount} loáº¡i hÃ¬nh Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'types');
    } finally {
      setIsAddingType(false);
    }
  };

  const handleUpdateType = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const typeRef = doc(db, 'types', id);
      const typeDoc = await getDoc(typeRef);
      const oldName = typeDoc.exists() ? typeDoc.data().name : null;

      await updateDoc(typeRef, { name: newName });
      
      // Propagate change to projects
      if (oldName && oldName !== newName) {
        const batch = writeBatch(db);
        const projectsToUpdate = projects.filter(p => p.type === oldName);
        projectsToUpdate.forEach(p => {
          batch.update(doc(db, 'projects', p.id), { type: newName });
        });
        if (projectsToUpdate.length > 0) {
          await batch.commit();
          toast.info(`ÄÃ£ cáº­p nháº­t loáº¡i hÃ¬nh cho ${projectsToUpdate.length} dá»± Ã¡n liÃªn quan`);
        }
      }

      await logAction('UPDATE', 'types', id, { name: newName, oldName });
      setEditingTypeId(null);
      toast.success('ÄÃ£ cáº­p nháº­t loáº¡i hÃ¬nh');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'types');
    }
  };

  const handleDeleteType = (id: string, name: string) => {
    setTypeToDelete({ id, name });
    setIsDeleteTypeDialogOpen(true);
  };

  const confirmDeleteType = async () => {
    if (!typeToDelete) return;
    try {
      await deleteDoc(doc(db, 'types', typeToDelete.id));
      await logAction('DELETE', 'types', typeToDelete.id, { name: typeToDelete.name });
      toast.success('ÄÃ£ xÃ³a loáº¡i hÃ¬nh');
      setIsDeleteTypeDialogOpen(false);
      setTypeToDelete(null);
      setSelectedTypeIds(prev => prev.filter(tid => tid !== typeToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'types');
    }
  };

  const handleBulkDeleteTypes = async () => {
    if (selectedTypeIds.length === 0 || isDeletingTypes) return;
    setIsBulkDeleteTypesDialogOpen(true);
  };

  const handleMigrateType = (type: {id: string, name: string}) => {
    setTypeToMigrate(type);
    setIsMigrateTypeDialogOpen(true);
  };

  const confirmMigrateType = async () => {
    if (!typeToMigrate || !migrationTargetType || isMigratingTypes) return;
    setIsMigratingTypes(true);
    try {
      const batch = writeBatch(db);
      const targetName = migrationTargetType.trim();
      const sourceName = typeToMigrate.name.trim();

      const projectsToUpdate = projects.filter(p => (p.type || '').trim() === sourceName);
      
      projectsToUpdate.forEach(p => {
        batch.update(doc(db, 'projects', p.id), { type: targetName });
      });

      await batch.commit();
      await logAction('MIGRATE_TYPE', 'projects', 'multiple', { 
        count: projectsToUpdate.length, 
        from: sourceName, 
        to: targetName 
      });

      toast.success(`ÄÃ£ chuyá»ƒn ${projectsToUpdate.length} dá»± Ã¡n tá»« "${sourceName}" sang "${targetName}"`);
      setIsMigrateTypeDialogOpen(false);
      setTypeToMigrate(null);
      setMigrationTargetType('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    } finally {
      setIsMigratingTypes(false);
    }
  };

  const handleSyncTypes = async () => {
    if (isSyncingTypes) return;
    setIsSyncingTypes(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Get all unique types from projects
      const projectTypesSet = new Set<string>();
      projects.forEach(p => {
        if (p.type) projectTypesSet.add(p.type.trim());
      });
      
      const uniqueProjectTypes = Array.from(projectTypesSet);
      
      // 2. Standardize current projects (trim types)
      const projectsToFix = projects.filter(p => p.type && (p.type !== p.type.trim()));
      projectsToFix.forEach(p => {
        batch.update(doc(db, 'projects', p.id), { type: p.type.trim() });
      });
      
      // 3. Standardize current types (trim names)
      const typesToFix = types.filter(t => t.name && (t.name !== t.name.trim()));
      typesToFix.forEach(t => {
        batch.update(doc(db, 'types', t.id), { name: t.name.trim() });
      });

      // 4. Ensure all project types exist in types collection
      const existingTypeNames = new Set(types.map(t => (t.name || '').trim()));
      
      let newTypesCount = 0;
      uniqueProjectTypes.forEach(typeName => {
        if (!existingTypeNames.has(typeName)) {
          const newTypeRef = doc(collection(db, 'types'));
          batch.set(newTypeRef, {
            name: typeName,
            createdAt: serverTimestamp()
          });
          newTypesCount++;
        }
      });
      
      if (projectsToFix.length > 0 || typesToFix.length > 0 || newTypesCount > 0) {
        await batch.commit();
        await logAction('SYNC_TYPES', 'system', 'multiple', { 
          fixedProjects: projectsToFix.length, 
          fixedTypes: typesToFix.length,
          addedTypes: newTypesCount 
        });
        toast.success(`ÄÃ£ chuáº©n hÃ³a ${projectsToFix.length} dá»± Ã¡n, ${typesToFix.length} loáº¡i hÃ¬nh vÃ  thÃªm ${newTypesCount} loáº¡i hÃ¬nh má»›i`);
      } else {
        toast.info("Dá»¯ liá»‡u Ä‘Ã£ Ä‘á»“ng nháº¥t, khÃ´ng cáº§n cáº­p nháº­t");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system');
    } finally {
      setIsSyncingTypes(false);
    }
  };

  const confirmBulkDeleteTypes = async () => {
    setIsDeletingTypes(true);
    setIsBulkDeleteTypesDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedTypeIds.forEach(id => {
        batch.delete(doc(db, 'types', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'types', 'multiple', { count: selectedTypeIds.length, ids: selectedTypeIds });
      toast.success(`ÄÃ£ xÃ³a ${selectedTypeIds.length} loáº¡i hÃ¬nh`);
      setSelectedTypeIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'types');
    } finally {
      setIsDeletingTypes(false);
    }
  };

  const handleDeleteAllTypes = async () => {
    if (types.length === 0) return;
    setIsDeleteAllTypesDialogOpen(true);
  };

  const confirmDeleteAllTypes = async () => {
    setIsDeleteAllTypesDialogOpen(false);
    try {
      const batch = writeBatch(db);
      types.forEach(t => {
        batch.delete(doc(db, 'types', t.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'types', 'all', { count: types.length });
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ loáº¡i hÃ¬nh');
      setSelectedTypeIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'types');
    }
  };

  const handleGlobalProjectAssign = async () => {
    if (selectedGlobalProjectIds.length === 0 || !targetGlobalType) {
      toast.error('Vui lÃ²ng chá»n Ã­t nháº¥t má»™t dá»± Ã¡n vÃ  má»™t loáº¡i hÃ¬nh');
      return;
    }
    
    try {
      const batch = writeBatch(db);
      const targetName = targetGlobalType.trim();
      
      selectedGlobalProjectIds.forEach(id => {
        batch.update(doc(db, 'projects', id), { type: targetName });
      });
      
      await batch.commit();
      await logAction('BULK_ASSIGN_TYPE', 'projects', 'multiple', { 
        count: selectedGlobalProjectIds.length, 
        type: targetName 
      });
      
      toast.success(`ÄÃ£ gÃ¡n loáº¡i hÃ¬nh "${targetName}" cho ${selectedGlobalProjectIds.length} dá»± Ã¡n`);
      setIsGlobalProjectAssignDialogOpen(false);
      setSelectedGlobalProjectIds([]);
      setSelectedProjectIds([]);
      setTargetGlobalType('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleSetProjectsForType = async () => {
    if (!typeForProjects) return;
    
    try {
      const batch = writeBatch(db);
      const targetTypeName = typeForProjects.name.trim();
      
      // 1. All currently checked projects get this type
      for (const projectId of selectedProjectIdsForType) {
        batch.update(doc(db, 'projects', projectId), { type: targetTypeName });
      }

      // 2. Any project that PREVIOUSLY had this type but is NOW UNCHECKED should have its type cleared
      const projectsCurrentlyInThisType = projects.filter(p => (p.type || '').trim() === targetTypeName);
      const checkedIds = new Set(selectedProjectIdsForType);
      
      projectsCurrentlyInThisType.forEach(p => {
        if (!checkedIds.has(p.id)) {
          batch.update(doc(db, 'projects', p.id), { type: '' });
        }
      });
      
      await batch.commit();
      await logAction('UPDATE_TYPE_PROJECTS', 'projects', 'multiple', { 
        type: targetTypeName, 
        projectIds: selectedProjectIdsForType,
        removedCount: projectsCurrentlyInThisType.length - projectsToUpdateCount(projectsCurrentlyInThisType, checkedIds)
      });
      toast.success(`ÄÃ£ cáº­p nháº­t membership loáº¡i hÃ¬nh "${targetTypeName}" cho cÃ¡c dá»± Ã¡n`);
      setIsSetProjectsForTypeDialogOpen(false);
      setTypeForProjects(null);
      setSelectedProjectIdsForType([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const projectsToUpdateCount = (current: any[], checked: Set<any>) => {
    let count = 0;
    current.forEach(p => { if (checked.has(p.id)) count++; });
    return count;
  };

  const isWithinRegistrationWindow = () => {
    if (isInternalStaff || firebaseUserEmail === 'thienvu1108@gmail.com') return true;
    if (!systemSettings) return true;
    
    const now = new Date();
    const day = now.getDate();
    const start = Number(systemSettings.budgetStartDay || 15);
    const end = Number(systemSettings.budgetEndDay || 5);

    if (start > end) {
      return day >= start || day <= end;
    } else {
      return day >= start && day <= end;
    }
  };

  const firebaseUserEmail = user?.email?.toLowerCase() || '';

  const checkBudgetActionAllowed = (bMonth: string) => {
    const roleStr = (userRole || userProfile?.role || '').toLowerCase().trim();
    const isSpecialAdmin = 
      isAdmin || 
      isSuperAdmin || 
      isAccountant || 
      isMod || 
      isGDDA || 
      isGDKhoi || 
      isGDKD ||
      roleStr === 'admin' || 
      roleStr === 'super_admin' || 
      roleStr === 'quáº£n trá»‹' || 
      roleStr === 'quáº£n trá»‹ viÃªn' || 
      roleStr === 'administrator' || 
      roleStr === 'accountant' || 
      roleStr === 'káº¿ toÃ¡n' || 
      firebaseUserEmail === 'thienvu1108@gmail.com';

    if (isSpecialAdmin) {
      return { allowed: true };
    }
    
    const currentM = getMarketingMonth(new Date());
    
    // Check if bMonth is previous period
    if (bMonth < currentM) {
      return { 
        allowed: false, 
        reason: 'NgoÃ i thá»i gian Ä‘iá»u chá»‰nh cá»§a ká»³ trÆ°á»›c. KhÃ´ng thá»ƒ Ä‘Äƒng kÃ½ hoáº·c Ä‘iá»u chá»‰nh ngÃ¢n sÃ¡ch cá»§a ká»³ trÆ°á»›c.' 
      };
    }
    
    // Check if bMonth is current period
    if (bMonth === currentM) {
      if (!isWithinRegistrationWindow()) {
        return { 
          allowed: false, 
          reason: 'NgoÃ i thá»i gian Ä‘Äƒng kÃ½ hoáº·c Ä‘iá»u chá»‰nh ngÃ¢n sÃ¡ch cá»§a ká»³ hiá»‡n táº¡i.' 
        };
      }
      return { allowed: true };
    }
    
    // If future period (bMonth > currentM)
    if (!isWithinRegistrationWindow()) {
      return { 
        allowed: false, 
        reason: 'NgoÃ i thá»i gian Ä‘Äƒng kÃ½ hoáº·c Ä‘iá»u chá»‰nh ngÃ¢n sÃ¡ch.' 
      };
    }
    
    return { allowed: true };
  };

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !budgetAmount || !selectedTeamId || !budgetMonth || !implementerName) {
      toast.error('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin');
      return false;
    }

    const checkResult = checkBudgetActionAllowed(budgetMonth);
    if (!checkResult.allowed) {
      toast.error(checkResult.reason);
      return false;
    }

    const project = projects.find(p => p.id === selectedProjectId);
    const team = teams.find(t => t.id === selectedTeamId);

    // Rule: Má»—i team chá»‰ Ä‘Äƒng kÃ½ 1 ngÃ¢n sÃ¡ch cho 1 dá»± Ã¡n trong 1 ká»³
    const existsInQueue = multiBudgetItems.some(
      item => item.teamId === selectedTeamId && item.projectId === selectedProjectId && item.month === budgetMonth
    );
    if (existsInQueue) {
      toast.error('Äá»™i Ä‘Ã£ cÃ³ Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch cho dá»± Ã¡n nÃ y trong danh sÃ¡ch chá»!');
      return false;
    }

    const newItem = {
      projectId: selectedProjectId,
      projectName: project?.name || 'N/A',
      teamId: selectedTeamId,
      teamName: team?.name || selectedTeamName,
      implementerName,
      month: budgetMonth,
      amount: Number(budgetAmount),
      tempId: Math.random().toString(36).substr(2, 9)
    };

    setMultiBudgetItems([...multiBudgetItems, newItem]);
    setBudgetAmount('');
    setSelectedProjectId('');
    return true;
  };

  const handleRegisterBudgetMain = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If form has data, try to add it to list first
    if (selectedProjectId && budgetAmount && selectedTeamId && budgetMonth && implementerName) {
      const success = handleAddBudget(e);
      if (!success) return;
    } else if (multiBudgetItems.length === 0) {
      toast.error('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin Ä‘Äƒng kÃ½');
      return;
    }

    setIsConfirmingMulti(true);
    setIsConfirmBudgetOpen(true);
  };

  const handleAddBudgetToListOnly = (e: React.FormEvent) => {
    e.preventDefault();
    const success = handleAddBudget(e);
    if (success) {
      toast.success('ÄÃ£ thÃªm dá»± Ã¡n vÃ o danh sÃ¡ch chá»');
    }
  };

  const removeMultiBudgetItem = (tempId: string) => {
    setMultiBudgetItems(multiBudgetItems.filter(item => item.tempId !== tempId));
  };

  const confirmAddBudget = async () => {
    if (multiBudgetItems.length === 0) return;
    
    try {
      setIsDeletingBudgets(true); 

      // Pre-merge multiBudgetItems to consolidate multiple entries for same project/team/month in current submission
      const mergedItems = multiBudgetItems.reduce((acc: any[], current) => {
        const existingIndex = acc.findIndex(item => 
          item.projectId === current.projectId && 
          item.teamId === current.teamId && 
          item.month === current.month
        );
        
        if (existingIndex > -1) {
          // If multiple entries in the same submission, last one sets the amount or sums them
          acc[existingIndex].amount = current.amount;
        } else {
          acc.push({ ...current });
        }
        return acc;
      }, []);

      for (const item of mergedItems) {
        // ONLY merge if project/team IDs are present
        if (!item.projectId || !item.teamId || !item.month) continue;

        // Find ALL existing budgets for same Project, Team, and Month from the main budgets list
        const existingBudgetsForMatch = budgets.filter(b => 
          b.projectId && b.projectId === item.projectId && 
          b.teamId && b.teamId === item.teamId && 
          normalizeMonth(b.month) === normalizeMonth(item.month)
        );

        if (existingBudgetsForMatch.length > 0) {
          // Update the existing team master budget record
          const targetBudget = existingBudgetsForMatch[0];
          const targetRef = doc(db, 'budgets', targetBudget.id);
          const duplicates = existingBudgetsForMatch.slice(1);
          
          // Build/Update subBudgets for targetBudget
          let currentSubBudgets = Array.isArray(targetBudget.subBudgets) ? [...targetBudget.subBudgets] : [];
          if (currentSubBudgets.length === 0) {
            currentSubBudgets.push({
              id: `sub-init-${targetBudget.id}`,
              userId: targetBudget.createdBy || '',
              userName: targetBudget.implementerName || targetBudget.userEmail || 'ThÃ nh viÃªn',
              userEmail: (targetBudget.userEmail || '').toLowerCase(),
              amount: Number(targetBudget.amount || 0),
              note: `ÄÄƒng kÃ½ ban Ä‘áº§u`,
              createdAt: targetBudget.createdAt?.toDate ? targetBudget.createdAt.toDate().toISOString() : new Date().toISOString()
            });
          }

          // Check if this user already has an entry in subBudgets
          const userSubIndex = currentSubBudgets.findIndex(s => 
            (s.userEmail && s.userEmail.toLowerCase() === user?.email?.toLowerCase()) || 
            (s.userId && s.userId === user?.uid)
          );

          const newSubEntry = {
            id: userSubIndex > -1 ? currentSubBudgets[userSubIndex].id : `sub-${Math.random().toString(36).substring(2, 9)}`,
            userId: user?.uid || '',
            userName: item.implementerName || userProfile?.fullName || user?.displayName || user?.email || 'ThÃ nh viÃªn',
            userEmail: (user?.email || '').toLowerCase(),
            amount: item.amount,
            note: item.note || `Cáº­p nháº­t ngÃ¢n sÃ¡ch tá»•ng dá»± Ã¡n`,
            updatedAt: new Date().toISOString(),
            createdAt: userSubIndex > -1 ? (currentSubBudgets[userSubIndex].createdAt || new Date().toISOString()) : new Date().toISOString()
          };

          if (userSubIndex > -1) {
            currentSubBudgets[userSubIndex] = newSubEntry;
          } else {
            currentSubBudgets.push(newSubEntry);
          }

          const newTotalAmount = item.amount;

          await updateDoc(targetRef, {
            amount: newTotalAmount,
            implementerName: item.implementerName || targetBudget.implementerName,
            subBudgets: currentSubBudgets,
            updatedAt: serverTimestamp(),
            editHistory: arrayUnion({
              action: 'UPDATE_TOTAL',
              editorName: item.implementerName || userProfile?.fullName || user?.displayName || 'ThÃ nh viÃªn',
              editorEmail: user?.email,
              timestamp: new Date().toISOString(),
              oldAmount: targetBudget.amount,
              newTotalAmount: newTotalAmount,
              note: `Cáº­p nháº­t láº¡i ngÃ¢n sÃ¡ch tá»•ng dá»± Ã¡n cho Äá»™i`
            })
          });

          // If there are legacy duplicates, clean them up safely
          if (duplicates.length > 0) {
            for (const dup of duplicates) {
              const affectedCosts = costs.filter(c => c.budgetId === dup.id);
              for (const c of affectedCosts) {
                await updateDoc(doc(db, 'costs', c.id), { budgetId: targetBudget.id }).catch(() => {});
              }
              await deleteDoc(doc(db, 'budgets', dup.id)).catch(() => {});
            }
          }

          await logAction('UPDATE', 'budgets', targetBudget.id, { 
            oldAmount: targetBudget.amount,
            newTotalAmount,
            userEmail: user?.email
          });

          // Send notification to team members and previous registrants
          await sendBudgetChangeNotification({
            budgetId: targetBudget.id,
            projectId: item.projectId,
            projectName: item.projectName,
            teamId: item.teamId,
            teamName: item.teamName,
            teamCode: item.teamCode,
            month: item.month,
            oldAmount: targetBudget.amount || 0,
            newAmount: item.amount,
            editorName: item.implementerName || userProfile?.fullName || user?.displayName || 'ThÃ nh viÃªn',
            editorEmail: user?.email || '',
            reason: 'Cáº­p nháº­t láº¡i ngÃ¢n sÃ¡ch dá»± Ã¡n cho Äá»™i',
            originalBudget: targetBudget,
            subBudgetsList: currentSubBudgets
          });
        } else {
          // Create new team master budget doc
          const initialSubBudget = {
            id: `sub-1`,
            userId: user?.uid || '',
            userName: item.implementerName || userProfile?.fullName || user?.displayName || user?.email || 'ChÆ°a rÃµ',
            userEmail: (user?.email || '').toLowerCase(),
            amount: item.amount,
            note: item.note || `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u`,
            createdAt: new Date().toISOString()
          };

          const initialHistory = {
            action: 'REGISTER',
            editorName: item.implementerName || userProfile?.fullName || user?.displayName || 'Unknown',
            editorEmail: user?.email,
            timestamp: new Date().toISOString(),
            amount: item.amount,
            note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u cho Äá»™i`
          };

          const docRef = await addDoc(collection(db, 'budgets'), {
            projectId: item.projectId,
            projectName: item.projectName,
            teamId: item.teamId,
            teamName: item.teamName,
            implementerName: item.implementerName || userProfile?.fullName || user?.displayName || 'ChÆ°a rÃµ',
            month: item.month,
            amount: item.amount,
            subBudgets: [initialSubBudget],
            editHistory: [initialHistory],
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            userEmail: user?.email?.toLowerCase()
          });
          await logAction('CREATE', 'budgets', docRef.id, { ...item });
        }
      }

      setMultiBudgetItems([]);
      setIsConfirmBudgetOpen(false);
      setIsConfirmingMulti(false);
      toast.success('ÄÃ£ hoÃ n táº¥t Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    } finally {
      setIsDeletingBudgets(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        budgetStartDay: Number(adminBudgetStartDay),
        budgetEndDay: Number(adminBudgetEndDay),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      }, { merge: true });
      toast.success('ÄÃ£ lÆ°u cÃ i Ä‘áº·t há»‡ thá»‘ng');
      await logAction('UPDATE', 'settings', 'global', { budgetStartDay: adminBudgetStartDay, budgetEndDay: adminBudgetEndDay });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    }
  };

  const handleOpenHistory = (target: any, name: string) => {
    setHistoryTargetRecord(target);
    setHistoryTargetName(name || `${target?.projectName || 'Dá»± Ã¡n'} - ${target?.teamName || 'Äá»™i'}`);
    
    let rawHist = target?.editHistory || [];
    let hist: any[] = [];
    
    if (Array.isArray(rawHist) && rawHist.length > 0) {
      hist = rawHist.map((h: any, i: number) => ({
        ...h,
        id: h.id || `hist-${i}`
      }));
      
      // Check if there is an initial registration/creation action
      const hasInitial = hist.some(e => ['REGISTER', 'CREATE', 'URL_IMPORT_CREATE', 'IMPORT_CREATE'].includes(e.action));
      if (!hasInitial) {
        const earliestTime = target?.createdAt?.toDate 
          ? target.createdAt.toDate().toISOString() 
          : (target?.createdAt ? new Date(target.createdAt).toISOString() : (hist[0]?.timestamp || new Date().toISOString()));
        
        const firstEntry = hist[0];
        const initialAmount = firstEntry?.oldAmount ?? firstEntry?.changes?.amount?.old ?? target?.amount ?? 0;
        const initialEditor = target?.implementerName || target?.userEmail || target?.createdByEmail || 'NgÆ°á»i Ä‘Äƒng kÃ½ ban Ä‘áº§u';
        
        hist.unshift({
          action: 'REGISTER',
          editorName: initialEditor,
          editorEmail: target?.userEmail || target?.createdByEmail || '',
          timestamp: earliestTime,
          amount: Number(initialAmount),
          note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u: ${Number(initialAmount).toLocaleString()}Ä‘`
        });
      }
    } else {
      const amt = Number(target?.amount || target?.actualCost || 0);
      const editor = target?.implementerName || target?.userEmail || target?.createdByEmail || 'ChÆ°a rÃµ';
      const timeStr = target?.createdAt?.toDate 
        ? target.createdAt.toDate().toISOString() 
        : (target?.createdAt ? new Date(target.createdAt).toISOString() : new Date().toISOString());
      
      hist = [{
        action: 'REGISTER',
        editorName: editor,
        editorEmail: target?.userEmail || target?.createdByEmail || '',
        timestamp: timeStr,
        amount: amt,
        note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u: ${amt.toLocaleString()}Ä‘`
      }];
    }
    
    setHistoryToView(hist);
    setIsHistoryDialogOpen(true);
  };

  const handleEditBudget = async (budget: any, newAmount: number) => {
    if (!isWithinRegistrationWindow()) {
      toast.error('NgoÃ i thá»i gian cho phÃ©p chá»‰nh sá»­a ngÃ¢n sÃ¡ch.');
      return;
    }

    try {
      const budgetRef = doc(db, 'budgets', budget.id);
      await updateDoc(budgetRef, {
        amount: newAmount,
        updatedAt: serverTimestamp(),
        editHistory: arrayUnion({
          action: 'EDIT',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          oldAmount: budget.amount,
          newAmount: newAmount
        })
      });
      toast.success('ÄÃ£ cáº­p nháº­t ngÃ¢n sÃ¡ch');
      await logAction('UPDATE', 'budgets', budget.id, { oldAmount: budget.amount, newAmount });

      await sendBudgetChangeNotification({
        budgetId: budget.id,
        projectId: budget.projectId,
        projectName: budget.projectName,
        teamId: budget.teamId,
        teamName: budget.teamName,
        teamCode: budget.teamCode,
        month: budget.month,
        oldAmount: budget.amount || 0,
        newAmount: newAmount,
        editorName: userProfile?.fullName || user?.displayName || 'ThÃ nh viÃªn',
        editorEmail: user?.email || '',
        reason: 'Chá»‰nh sá»­a ngÃ¢n sÃ¡ch',
        originalBudget: budget,
        subBudgetsList: budget.subBudgets || []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const handleEditCost = async (cost: any, newChannels: any, newNote: string) => {
    // Note: User requirement says can edit actual cost too. 
    // Usually costs are edits are less restricted by time window unless specified.
    // For now, I'll allow editing if they created it.
    
    const totalAmount = Object.values(newChannels).reduce((acc: number, val: any) => acc + Number(val), 0);

    try {
      const costRef = doc(db, 'costs', cost.id);
      await updateDoc(costRef, {
        amount: totalAmount,
        channels: newChannels,
        note: newNote,
        updatedAt: serverTimestamp(),
        editHistory: arrayUnion({
          action: 'UPDATE',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          changes: {
            amount: { old: cost.amount, new: totalAmount },
            note: { old: cost.note, new: newNote }
          }
        })
      });
      toast.success('ÄÃ£ cáº­p nháº­t chi phÃ­');
      await logAction('UPDATE', 'costs', cost.id, { oldAmount: cost.amount, newAmount: totalAmount });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'costs');
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = Number(fbAds) + Number(posting) + Number(zaloAds) + Number(googleAds) + Number(otherCost);
    if (!actualProjectId || totalAmount <= 0 || !selectedBudgetId) return;
    const project = projects.find(p => p.id === actualProjectId);
    const budget = budgets.find(b => b.id === selectedBudgetId);
    
    if (!budget) {
      toast.error('KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin ngÃ¢n sÃ¡ch tÆ°Æ¡ng á»©ng');
      return;
    }
    
    const [yearStr] = costBudgetMonth.split('-');
    const year = Number(yearStr);
    
    // Automatically determine period based on current date
    const now = new Date();
    const day = now.getDate();
    let autoPeriod = 1;
    if (day >= 21) {
       // Start of a new marketing month (usually counted towards next month)
       autoPeriod = 1;
    } else {
       if (day <= 7) autoPeriod = 2; // Rough estimation or just use time-based logic
       else if (day <= 14) autoPeriod = 3;
       else autoPeriod = 4;
    }

    try {
      const mktReportData = {
        totalLeads: Number(totalLeads.toString().replace(/\./g, '')) || 0,
        contactedLeads: Number(contactedLeads.toString().replace(/\./g, '')) || 0,
        unconvertedLeads: Number(unconvertedLeads.toString().replace(/\./g, '')) || 0,
        unconvertedReason: unconvertedReason || '',
        convertedLeads: Number(convertedLeads.toString().replace(/\./g, '')) || 0,
        conversionRevenue: Number(conversionRevenue.toString().replace(/\./g, '')) || 0,
        startDate: mktStartDate || '',
        endDate: mktEndDate || ''
      };

      const docRef = await addDoc(collection(db, 'costs'), {
        projectId: actualProjectId,
        projectName: project?.name || 'N/A',
        budgetId: selectedBudgetId,
        teamId: budget.teamId || null,
        implementerName: budget.implementerName || 'N/A',
        teamName: budget.teamName || 'N/A',
        assignedUserEmail: budget.assignedUserEmail || null,
        weekNumber: autoPeriod, // Still kept for compatibility but auto-calculated
        year,
        month: costBudgetMonth,
        amount: totalAmount,
        channels: {
          fbAds: Number(fbAds),
          posting: Number(posting),
          zaloAds: Number(zaloAds),
          googleAds: Number(googleAds),
          otherCost: Number(otherCost)
        },
        note: costNote,
        mktReport: mktReportData,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        userEmail: user?.email?.toLowerCase()
      });
      await logAction('CREATE', 'costs', docRef.id, { 
        projectId: actualProjectId,
        projectName: project?.name || 'N/A',
        teamId: budget?.teamId,
        teamName: budget?.teamName,
        month: budget?.month,
        period: costPeriod,
        fbAds: Number(fbAds),
        posting: Number(posting),
        zaloAds: Number(zaloAds),
        googleAds: Number(googleAds),
        otherCost: Number(otherCost),
        totalAmount,
        note: costNote,
        budgetId: selectedBudgetId,
        mktReport: mktReportData
      });
      setFbAds('');
      setPosting('');
      setZaloAds('');
      setGoogleAds('');
      setOtherCost('');
      setCostNote('');
      setActualProjectId('');
      setSelectedBudgetId('');
      setTotalLeads('');
      setContactedLeads('');
      setUnconvertedLeads('');
      setUnconvertedReason('');
      setConvertedLeads('');
      setConversionRevenue('');
      setMktStartDate('');
      setMktEndDate('');
      setShowMktReport(false);
      toast.success('ÄÃ£ nháº­p chi phÃ­ thá»±c táº¿ vÃ  BÃ¡o cÃ¡o Hiá»‡u quáº£ MKT');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'costs');
    }
  };

  const handleSelectEditingUser = (selectedUserObj: any) => {
    if (!selectedUserObj) return;
    const name = selectedUserObj.fullName || selectedUserObj.displayName || selectedUserObj.email || '';
    setEditingBudgetImplementer(name);
    setEditingBudgetUserId(selectedUserObj.id || selectedUserObj.uid || '');

    // Select team according to user
    const userTeamName = selectedUserObj.teamName ? String(selectedUserObj.teamName).trim() : '';
    const userTeamId = selectedUserObj.teamId ? String(selectedUserObj.teamId).trim() : '';

    if (userTeamId || userTeamName) {
      const matched = teams.find(t =>
        (userTeamId && t.id === userTeamId) ||
        (userTeamName && (t.name === userTeamName || t.teamCode === userTeamName || normalizeTeamName(t.name).toLowerCase() === normalizeTeamName(userTeamName).toLowerCase()))
      );
      if (matched) {
        setEditingBudgetTeam(matched.id);
        toast.success(`ÄÃ£ tá»± Ä‘á»™ng chá»n Team: ${matched.name} (${matched.teamCode}) theo user`);
      } else if (userTeamName) {
        setEditingBudgetTeam(userTeamName);
      }
    }
  };

  const handleOpenEditBudget = (budget: any) => {
    // If not Super Admin, check regular time window rules
    if (!isSuperAdmin) {
      const checkResult = checkBudgetActionAllowed(budget.month);
      if (!checkResult.allowed) {
        toast.error(checkResult.reason);
        return;
      }
    }

    // Match user from allUsers to select team according to user
    const matchedUser = allUsers.find(u =>
      (budget.createdBy && (u.id === budget.createdBy || u.uid === budget.createdBy)) ||
      (budget.userEmail && u.email?.toLowerCase() === budget.userEmail.toLowerCase()) ||
      (budget.implementerName && (
        (u.fullName && u.fullName.toLowerCase() === budget.implementerName.toLowerCase()) ||
        (u.displayName && u.displayName.toLowerCase() === budget.implementerName.toLowerCase())
      ))
    );

    let resolvedTeamId = '';
    if (matchedUser?.teamId || matchedUser?.teamName) {
      const userTeamObj = teams.find(t =>
        (matchedUser.teamId && t.id === matchedUser.teamId) ||
        (matchedUser.teamName && (t.name === matchedUser.teamName || t.teamCode === matchedUser.teamName || normalizeTeamName(t.name).toLowerCase() === normalizeTeamName(matchedUser.teamName).toLowerCase()))
      );
      if (userTeamObj) resolvedTeamId = userTeamObj.id;
    }

    if (!resolvedTeamId) {
      const matchedTeam = teams.find(t => t.id === budget.teamId || t.name === budget.teamName || t.teamCode === budget.teamCode);
      resolvedTeamId = matchedTeam ? matchedTeam.id : (budget.teamId || budget.teamName || '');
    }

    setEditingBudgetId(budget.id);
    setEditingBudgetAmount(budget.amount !== undefined && budget.amount !== null ? budget.amount.toString() : '0');
    setEditingBudgetVerifiedAmount((budget.verifiedAmount || 0).toString());
    setEditingBudgetMonth(budget.month);
    setEditingBudgetTeam(resolvedTeamId);
    setEditingBudgetTeamSearch('');
    setEditingBudgetUserSearch('');
    setEditingBudgetUserId(matchedUser?.id || matchedUser?.uid || budget.createdBy || '');
    setProjectSearch('');
    setEditingBudgetProject(budget.projectId);
    setEditingBudgetImplementer(budget.implementerName || matchedUser?.fullName || matchedUser?.displayName || '');
    setEditingBudgetReason('');
    setIsEditBudgetDialogOpen(true);
  };

  const confirmEditBudget = async () => {
    if (!editingBudgetId || !editingBudgetAmount || !editingBudgetTeam || !editingBudgetMonth || !editingBudgetProject || !editingBudgetImplementer) {
      toast.error('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin');
      return;
    }

    const originalBudget = budgets.find(b => b.id === editingBudgetId);

    // Permission check for modifying budget month: Only Super Admin is allowed
    if (!isSuperAdmin && originalBudget && originalBudget.month !== editingBudgetMonth) {
      toast.error('Chá»‰ Super Admin má»›i cÃ³ quyá»n thay Ä‘á»•i Ká»³ Ä‘Äƒng kÃ½ (thÃ¡ng) cá»§a ngÃ¢n sÃ¡ch!');
      return;
    }

    // Check window restrictions if not Super Admin
    if (!isSuperAdmin) {
      const checkResult = checkBudgetActionAllowed(editingBudgetMonth);
      if (!checkResult.allowed) {
        toast.error(checkResult.reason);
        return;
      }
    }

    try {
      const budgetRef = doc(db, 'budgets', editingBudgetId);
      const newAmountNum = Number(editingBudgetAmount);

      const selectedTeam = teams.find(t => t.id === editingBudgetTeam || t.name === editingBudgetTeam);
      const selectedProject = projects.find(p => p.id === editingBudgetProject || p.name === editingBudgetProject);

      const targetTeamName = selectedTeam?.name || teamMap[editingBudgetTeam] || editingBudgetTeam;
      const targetTeamId = selectedTeam?.id || editingBudgetTeam;
      const targetTeamCode = selectedTeam?.teamCode || extractTeamCode(targetTeamName);
      const targetProjectName = selectedProject?.name || projectMap[editingBudgetProject] || originalBudget?.projectName || 'N/A';
      const targetProjectId = selectedProject?.id || editingBudgetProject;

      const reasonText = editingBudgetReason.trim() || 'Admin cáº­p nháº­t thÃ´ng tin ngÃ¢n sÃ¡ch';

      // Update or synchronize subBudgets to prevent rollback by subsequent auto-merge or registration routines
      let updatedSubBudgets: any[] = [];
      if (originalBudget?.subBudgets && Array.isArray(originalBudget.subBudgets) && originalBudget.subBudgets.length > 0) {
        if (originalBudget.subBudgets.length === 1) {
          updatedSubBudgets = [{
            ...originalBudget.subBudgets[0],
            userName: editingBudgetImplementer || originalBudget.subBudgets[0].userName || 'ThÃ nh viÃªn',
            amount: newAmountNum,
            note: reasonText,
            updatedAt: new Date().toISOString()
          }];
        } else {
          const oldTotal = originalBudget.subBudgets.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
          if (oldTotal > 0) {
            updatedSubBudgets = originalBudget.subBudgets.map((s: any) => ({
              ...s,
              amount: Math.round((Number(s.amount || 0) / oldTotal) * newAmountNum),
              updatedAt: new Date().toISOString()
            }));
            const sumScaled = updatedSubBudgets.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
            if (sumScaled !== newAmountNum && updatedSubBudgets.length > 0) {
              updatedSubBudgets[0].amount += (newAmountNum - sumScaled);
            }
          } else {
            updatedSubBudgets = [{
              id: `sub-${Date.now()}`,
              userId: user?.uid || '',
              userName: editingBudgetImplementer || userProfile?.fullName || user?.displayName || 'Admin',
              amount: newAmountNum,
              note: reasonText,
              createdAt: new Date().toISOString()
            }];
          }
        }
      } else {
        updatedSubBudgets = [{
          id: `sub-${Date.now()}`,
          userId: user?.uid || '',
          userName: editingBudgetImplementer || userProfile?.fullName || user?.displayName || 'Admin',
          amount: newAmountNum,
          note: reasonText,
          createdAt: new Date().toISOString()
        }];
      }

      const updateData: any = {
        amount: newAmountNum,
        verifiedAmount: Number(originalBudget?.verifiedAmount || 0),
        month: editingBudgetMonth,
        year: editingBudgetMonth.split('-')[0],
        teamId: targetTeamId,
        teamName: targetTeamName,
        teamCode: targetTeamCode,
        projectId: targetProjectId,
        projectName: targetProjectName,
        implementerName: editingBudgetImplementer,
        subBudgets: updatedSubBudgets,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
        editHistory: arrayUnion({
          action: 'UPDATE',
          editorName: userProfile?.fullName || user?.displayName || (isSuperAdmin ? 'Super Admin' : 'Admin'),
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          reason: reasonText,
          changes: {
            amount: { old: originalBudget?.amount, new: newAmountNum },
            month: { old: originalBudget?.month, new: editingBudgetMonth },
            team: { old: originalBudget?.teamName, new: targetTeamName },
            project: { old: originalBudget?.projectName, new: targetProjectName },
            implementer: { old: originalBudget?.implementerName, new: editingBudgetImplementer }
          }
        })
      };
      await updateDoc(budgetRef, updateData);
      
      // Update related costs
      const relatedCosts = costs.filter(c => c.budgetId === editingBudgetId);
      if (relatedCosts.length > 0) {
        const batch = writeBatch(db);
        relatedCosts.forEach(cost => {
          const costRef = doc(db, 'costs', cost.id);
          batch.update(costRef, {
            projectId: targetProjectId,
            projectName: targetProjectName,
            teamId: targetTeamId,
            teamName: targetTeamName,
            teamCode: targetTeamCode,
            month: editingBudgetMonth,
            year: editingBudgetMonth.split('-')[0]
          });
        });
        await batch.commit();
      }

      await logAction('UPDATE', 'budgets', editingBudgetId, { ...updateData, reason: reasonText });

      // Send notification to team members and previous registrants
      await sendBudgetChangeNotification({
        budgetId: editingBudgetId,
        projectId: targetProjectId,
        projectName: targetProjectName,
        teamId: targetTeamId,
        teamName: targetTeamName,
        teamCode: targetTeamCode,
        month: editingBudgetMonth,
        oldAmount: originalBudget?.amount || 0,
        newAmount: newAmountNum,
        editorName: userProfile?.fullName || user?.displayName || (isSuperAdmin ? 'Super Admin' : 'Admin'),
        editorEmail: user?.email || '',
        reason: reasonText,
        originalBudget: originalBudget,
        subBudgetsList: updatedSubBudgets
      });

      setEditingBudgetId(null);
      setEditingBudgetReason('');
      setIsEditBudgetDialogOpen(false);
      toast.success('ÄÃ£ cáº­p nháº­t ngÃ¢n sÃ¡ch');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const handleOpenAdjustBudget = (budget: any) => {
    const checkResult = checkBudgetActionAllowed(budget.month);
    if (!checkResult.allowed) {
      toast.error(checkResult.reason);
      return;
    }

    setAdjustingBudgetId(budget.id);
    setAdjustingBudgetAmount(budget.amount ? budget.amount.toString() : '0');
    setAdjustingBudgetReason('');
    setIsAdjustBudgetDialogOpen(true);
  };

  const confirmAdjustBudget = async () => {
    if (!adjustingBudgetId || !adjustingBudgetAmount) {
      toast.error('Vui lÃ²ng nháº­p sá»‘ tiá»n ngÃ¢n sÃ¡ch má»›i');
      return;
    }

    const originalBudget = budgets.find(b => b.id === adjustingBudgetId);
    if (!originalBudget) {
      toast.error('KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin ngÃ¢n sÃ¡ch tÆ°Æ¡ng á»©ng');
      return;
    }

    const checkResult = checkBudgetActionAllowed(originalBudget.month);
    if (!checkResult.allowed) {
      toast.error(checkResult.reason);
      return;
    }

    try {
      const budgetRef = doc(db, 'budgets', adjustingBudgetId);
      const newAmount = Number(adjustingBudgetAmount);
      
      if (isNaN(newAmount) || newAmount < 0) {
        toast.error('Sá»‘ tiá»n ngÃ¢n sÃ¡ch má»›i khÃ´ng há»£p lá»‡');
        return;
      }

      const reasonText = adjustingBudgetReason.trim() || 'Admin Ä‘iá»u chá»‰nh ngÃ¢n sÃ¡ch';

      // Update subBudgets proportionally
      let updatedSubBudgets: any[] = [];
      if (originalBudget.subBudgets && Array.isArray(originalBudget.subBudgets) && originalBudget.subBudgets.length > 0) {
        if (originalBudget.subBudgets.length === 1) {
          updatedSubBudgets = [{
            ...originalBudget.subBudgets[0],
            amount: newAmount,
            note: reasonText,
            updatedAt: new Date().toISOString()
          }];
        } else {
          const oldTotal = originalBudget.subBudgets.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
          if (oldTotal > 0) {
            updatedSubBudgets = originalBudget.subBudgets.map((s: any) => ({
              ...s,
              amount: Math.round((Number(s.amount || 0) / oldTotal) * newAmount),
              updatedAt: new Date().toISOString()
            }));
            const sumScaled = updatedSubBudgets.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
            if (sumScaled !== newAmount && updatedSubBudgets.length > 0) {
              updatedSubBudgets[0].amount += (newAmount - sumScaled);
            }
          } else {
            updatedSubBudgets = [{
              id: `sub-${Date.now()}`,
              userId: user?.uid || '',
              userName: userProfile?.fullName || user?.displayName || 'Admin',
              amount: newAmount,
              note: reasonText,
              createdAt: new Date().toISOString()
            }];
          }
        }
      } else {
        updatedSubBudgets = [{
          id: `sub-${Date.now()}`,
          userId: user?.uid || '',
          userName: originalBudget.implementerName || userProfile?.fullName || user?.displayName || 'Admin',
          amount: newAmount,
          note: reasonText,
          createdAt: new Date().toISOString()
        }];
      }

      await updateDoc(budgetRef, {
        amount: newAmount,
        subBudgets: updatedSubBudgets,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
        editHistory: arrayUnion({
          action: 'ADJUST',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          reason: reasonText,
          changes: {
            amount: { old: originalBudget.amount, new: newAmount }
          }
        })
      });

      await logAction('ADJUST_BUDGET', 'budgets', adjustingBudgetId, { 
        projectName: originalBudget.projectName,
        teamName: originalBudget.teamName,
        month: originalBudget.month,
        oldAmount: originalBudget.amount, 
        newAmount,
        reason: reasonText
      });

      // Send notification to team members and previous registrants
      await sendBudgetChangeNotification({
        budgetId: adjustingBudgetId,
        projectId: originalBudget.projectId,
        projectName: originalBudget.projectName,
        teamId: originalBudget.teamId,
        teamName: originalBudget.teamName,
        teamCode: originalBudget.teamCode,
        month: originalBudget.month,
        oldAmount: originalBudget.amount || 0,
        newAmount,
        editorName: userProfile?.fullName || user?.displayName || 'Admin',
        editorEmail: user?.email || '',
        reason: reasonText,
        originalBudget: originalBudget,
        subBudgetsList: updatedSubBudgets
      });

      setAdjustingBudgetId(null);
      setAdjustingBudgetAmount('');
      setAdjustingBudgetReason('');
      setIsAdjustBudgetDialogOpen(false);
      toast.success('ÄÃ£ Ä‘iá»u chá»‰nh ngÃ¢n sÃ¡ch thÃ nh cÃ´ng');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const handleUpdateBudget = async (id: string) => {
    try {
      const budgetRef = doc(db, 'budgets', id);
      const updateData = {
        amount: Number(editingBudgetAmount),
        month: editingBudgetMonth,
        teamName: editingBudgetTeam,
        projectId: editingBudgetProject,
        projectName: projectMap[editingBudgetProject] || 'N/A',
        implementerName: editingBudgetImplementer,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      };
      await updateDoc(budgetRef, updateData);
      
      // Update related costs
      const relatedCosts = costs.filter(c => c.budgetId === id);
      if (relatedCosts.length > 0) {
        const batch = writeBatch(db);
        relatedCosts.forEach(cost => {
          const costRef = doc(db, 'costs', cost.id);
          batch.update(costRef, {
            projectId: editingBudgetProject,
            projectName: projectMap[editingBudgetProject] || 'N/A'
          });
        });
        await batch.commit();
      }

      await logAction('UPDATE', 'budgets', id, updateData);
      setEditingBudgetId(null);
      toast.success('ÄÃ£ cáº­p nháº­t ngÃ¢n sÃ¡ch');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const handleDeleteBudget = (id: string, projectName: string) => {
    setBudgetToDelete({ id, name: projectName });
    setIsDeleteBudgetDialogOpen(true);
  };

  const confirmDeleteBudget = async () => {
    if (!budgetToDelete) return;
    try {
      await deleteDoc(doc(db, 'budgets', budgetToDelete.id));
      await logAction('DELETE', 'budgets', budgetToDelete.id, { projectName: budgetToDelete.name });
      toast.success('ÄÃ£ xÃ³a Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch');
      setIsDeleteBudgetDialogOpen(false);
      setBudgetToDelete(null);
      setSelectedBudgetIds(prev => prev.filter(bid => bid !== budgetToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    }
  };

  const handleBulkDeleteBudgets = async () => {
    if (selectedBudgetIds.length === 0 || isDeletingBudgets) return;
    setIsBulkDeleteBudgetsDialogOpen(true);
  };

  const confirmBulkDeleteBudgets = async () => {
    setIsDeletingBudgets(true);
    setIsBulkDeleteBudgetsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedBudgetIds.forEach(id => {
        batch.delete(doc(db, 'budgets', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'budgets', 'multiple', { count: selectedBudgetIds.length });
      toast.success(`ÄÃ£ xÃ³a ${selectedBudgetIds.length} Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch`);
      setSelectedBudgetIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    } finally {
      setIsDeletingBudgets(false);
    }
  };

  const handleDeleteAllBudgets = async () => {
    if (budgets.length === 0) return;
    setIsDeleteAllBudgetsDialogOpen(true);
  };

  const confirmDeleteAllBudgets = async () => {
    setIsDeleteAllBudgetsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      // Save snapshot in audit log for recovery before deleting all
      await logAction('DELETE_ALL', 'budgets', 'all', { 
        count: budgets.length,
        snapshot: budgets.map(b => ({
          id: b.id,
          projectId: b.projectId,
          projectName: b.projectName,
          teamId: b.teamId,
          teamName: b.teamName,
          month: b.month,
          amount: b.amount,
          implementerName: b.implementerName
        }))
      });
      
      budgets.forEach(b => {
        batch.delete(doc(db, 'budgets', b.id));
      });
      await batch.commit();
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch. ThÃ´ng tin Ä‘Ã£ Ä‘Æ°á»£c lÆ°u vÃ o nháº­t kÃ½ Ä‘á»ƒ khÃ´i phá»¥c náº¿u cáº§n.');
      setSelectedBudgetIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    }
  };

  const handleRestoreBudgetsFromLogs = async (logToUse: any = null) => {
    if (isRestoringData) return;
    setIsRestoringData(true);
    
    try {
      const budgetMap: Record<string, any> = {};
      const sortedLogs = [...auditLogs].reverse();
      const limitTimestamp = logToUse?.timestamp;
      
      sortedLogs.forEach(log => {
        if (limitTimestamp && log.timestamp && log.timestamp.seconds > limitTimestamp.seconds) return;

        if (log.collection === 'budgets' || log.collection === 'nganSach') {
          if (log.action === 'CREATE' || log.action === 'UPDATE' || log.action === 'IMPORT_BUDGETS') {
            if (log.data) {
              if (log.docId && log.docId !== 'bulk') {
                budgetMap[log.docId] = { ...(budgetMap[log.docId] || {}), ...log.data, id: log.docId };
              } else if (log.data.snapshot) {
                log.data.snapshot.forEach((b: any) => { budgetMap[b.id] = { ...b }; });
              } else if (log.data.items) {
                log.data.items.forEach((b: any) => { if (b.id) budgetMap[b.id] = { ...b }; });
              }
            }
          } else if (log.action === 'DELETE') {
            delete budgetMap[log.docId];
          } else if (log.action === 'DELETE_ALL' || log.action === 'DELETE_BULK') {
            if (log.data?.snapshot) {
              log.data.snapshot.forEach((b: any) => { budgetMap[b.id] = { ...b }; });
            }
          }
        } else if (log.action === 'FULL_SYSTEM_BACKUP' && log.data?.payload?.nganSach) {
          log.data.payload.nganSach.forEach((b: any) => { budgetMap[b.id] = { ...b }; });
        }
      });

      if (logToUse?.data?.snapshot) {
        logToUse.data.snapshot.forEach((b: any) => { budgetMap[b.id] = { ...b }; });
      }

      const toRestore = Object.values(budgetMap);
      if (toRestore.length === 0) {
        toast.info('KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u nÃ o trong nháº­t kÃ½ Ä‘á»ƒ khÃ´i phá»¥c.');
        setIsRestoreBudgetsDialogOpen(false);
        return;
      }

      const batch = writeBatch(db);
      let restoreCount = 0;
      toRestore.forEach((item: any) => {
        if (!budgets.some(b => b.id === item.id)) {
          const bRef = doc(db, 'budgets', item.id);
          const { id, ...saveData } = item;
          if (!saveData.assignedUserEmail && saveData.implementerName) {
            saveData.assignedUserEmail = extractEmail(saveData.implementerName);
          }
          batch.set(bRef, {
            ...saveData,
            createdAt: saveData.createdAt || serverTimestamp(),
            restoredAt: serverTimestamp(),
            restoredBy: user?.uid,
            restoredFromLog: true,
            originalDocId: id
          });
          restoreCount++;
        }
      });

      if (restoreCount === 0) {
        toast.info('Táº¥t cáº£ dá»¯ liá»‡u trong nháº­t kÃ½ Ä‘Ã£ tá»“n táº¡i trÃªn há»‡ thá»‘ng.');
      } else {
        await batch.commit();
        await logAction('RESTORE_BUDGETS_EXECUTED', 'budgets', 'bulk', { count: restoreCount, point: logToUse?.id || 'All' });
        toast.success(`ÄÃ£ khÃ´i phá»¥c thÃ nh cÃ´ng ${restoreCount} báº£n ghi.`);
      }
      setIsRestoreBudgetsDialogOpen(false);
    } catch (error) {
      console.error('Restore error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    } finally {
      setIsRestoringData(false);
    }
  };

  const handleSyncProjectNames = async () => {
    if (!isAdmin && !isSuperAdmin) {
      toast.error("Chá»‰ Admin má»›i cÃ³ quyá»n thá»±c hiá»‡n viá»‡c nÃ y");
      return;
    }

    setIsRestoringData(true);
    const toastId = toast.loading("Äang Ä‘á»“ng bá»™ tÃªn dá»± Ã¡n trÃªn toÃ n há»‡ thá»‘ng...");

    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      // Create a map of project ID to current project name
      const currentProjectNames: Record<string, string> = {};
      projects.forEach(p => {
        currentProjectNames[p.id] = p.name;
      });

      const oldName = "Vinhomes Cao Xa La";
      const targetProject = projects.find(p => p.name === "LUMIERE HANOI SEASON GARDEN");
      const targetId = targetProject?.id;

      // 1. Sync in acceptances
      acceptances.forEach(a => {
        let needsUpdate = false;
        let newName = a.projectName;

        if (a.projectId && currentProjectNames[a.projectId] && a.projectName !== currentProjectNames[a.projectId]) {
          newName = currentProjectNames[a.projectId];
          needsUpdate = true;
        } else if (a.projectName === oldName && targetProject) {
          newName = targetProject.name;
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'acceptances', a.id), { 
            projectName: newName,
            projectId: a.projectId || targetId || ''
          });
          updateCount++;
        }
      });

      // 2. Sync in finalAcceptances
      finalAcceptances.forEach(fa => {
        let needsUpdate = false;
        let newName = fa.projectName;

        if (fa.projectId && currentProjectNames[fa.projectId] && fa.projectName !== currentProjectNames[fa.projectId]) {
          newName = currentProjectNames[fa.projectId];
          needsUpdate = true;
        } else if (fa.projectName === oldName && targetProject) {
          newName = targetProject.name;
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'finalAcceptances', fa.id), { 
            projectName: newName,
            projectId: fa.projectId || targetId || ''
          });
          updateCount++;
        }
      });

      // 3. Sync in docProcessing
      docProcessingStatus.forEach(dp => {
        let needsUpdate = false;
        let newName = dp.projectName;

        if (dp.projectId && currentProjectNames[dp.projectId] && dp.projectName !== currentProjectNames[dp.projectId]) {
          newName = currentProjectNames[dp.projectId];
          needsUpdate = true;
        } else if (dp.projectName === oldName && targetProject) {
          newName = targetProject.name;
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'docProcessing', dp.id), { 
            projectName: newName,
            projectId: dp.projectId || targetId || ''
          });
          updateCount++;
        }
      });

      // 4. Budgets
      budgets.forEach(b => {
        let needsUpdate = false;
        let newName = b.projectName;

        if (b.projectId && currentProjectNames[b.projectId] && b.projectName !== currentProjectNames[b.projectId]) {
          newName = currentProjectNames[b.projectId];
          needsUpdate = true;
        } else if (b.projectName === oldName && targetProject) {
          newName = targetProject.name;
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'budgets', b.id), { 
            projectName: newName,
            projectId: b.projectId || targetId || ''
          });
          updateCount++;
        }
      });

      // 5. Costs
      costs.forEach(c => {
         let needsUpdate = false;
         let newName = c.projectName;

         if (c.projectId && currentProjectNames[c.projectId] && c.projectName !== currentProjectNames[c.projectId]) {
           newName = currentProjectNames[c.projectId];
           needsUpdate = true;
         } else if (c.projectName === oldName && targetProject) {
           newName = targetProject.name;
           needsUpdate = true;
         }

         if (needsUpdate) {
           batch.update(doc(db, 'costs', c.id), { 
             projectName: newName,
             projectId: c.projectId || targetId || ''
           });
           updateCount++;
         }
      });

      if (updateCount === 0) {
        toast.success("TÃªn cÃ¡c dá»± Ã¡n Ä‘Ã£ Ä‘á»“ng bá»™ sáºµn, khÃ´ng cáº§n cáº­p nháº­t thÃªm", { id: toastId });
      } else {
        await batch.commit();
        toast.success(`ÄÃ£ Ä‘á»“ng bá»™ thÃ nh cÃ´ng ${updateCount} báº£n ghi vá»›i tÃªn dá»± Ã¡n má»›i`, { id: toastId });
        await logAction('SYNC_PROJECT_NAMES', 'multiple', 'bulk', { updateCount });
      }
    } catch (error) {
      console.error(error);
      toast.error("Lá»—i khi Ä‘á»“ng bá»™ dá»¯ liá»‡u", { id: toastId });
    } finally {
      setIsRestoringData(false);
    }
  };

  const handleSyncTeamNames = async () => {
    if (!isAdmin && !isSuperAdmin) {
      toast.error("Chá»‰ Admin má»›i cÃ³ quyá»n thá»±c hiá»‡n viá»‡c nÃ y");
      return;
    }

    setIsRestoringData(true);
    const toastId = toast.loading("Äang Ä‘á»“ng bá»™ tÃªn Ä‘á»™i (team) trÃªn toÃ n há»‡ thá»‘ng...");

    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      // Create maps for matching
      const currentTeamNames: Record<string, string> = {};
      teams.forEach(t => {
        currentTeamNames[t.id] = t.name;
      });

      // 1. Sync in acceptances
      acceptances.forEach(a => {
        let needsUpdate = false;
        let newName = a.teamName;

        if (a.teamId && currentTeamNames[a.teamId] && a.teamName !== currentTeamNames[a.teamId]) {
          newName = currentTeamNames[a.teamId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'acceptances', a.id), { 
            teamName: newName
          });
          updateCount++;
        }
      });

      // 2. Sync in finalAcceptances
      finalAcceptances.forEach(fa => {
        let needsUpdate = false;
        let newName = fa.teamName;

        if (fa.teamId && currentTeamNames[fa.teamId] && fa.teamName !== currentTeamNames[fa.teamId]) {
          newName = currentTeamNames[fa.teamId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'finalAcceptances', fa.id), { 
            teamName: newName
          });
          updateCount++;
        }
      });

      // 3. Sync in docProcessing
      docProcessingStatus.forEach(dp => {
        let needsUpdate = false;
        let newName = dp.teamName;

        if (dp.teamId && currentTeamNames[dp.teamId] && dp.teamName !== currentTeamNames[dp.teamId]) {
          newName = currentTeamNames[dp.teamId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'docProcessing', dp.id), { 
            teamName: newName
          });
          updateCount++;
        }
      });

      // 4. Budgets
      budgets.forEach(b => {
        let needsUpdate = false;
        let newName = b.teamName;

        if (b.teamId && currentTeamNames[b.teamId] && b.teamName !== currentTeamNames[b.teamId]) {
          newName = currentTeamNames[b.teamId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'budgets', b.id), { 
            teamName: newName
          });
          updateCount++;
        }
      });

      // 5. Costs
      costs.forEach(c => {
        let needsUpdate = false;
        let newName = c.teamName;

        if (c.teamId && currentTeamNames[c.teamId] && c.teamName !== currentTeamNames[c.teamId]) {
          newName = currentTeamNames[c.teamId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'costs', c.id), { 
            teamName: newName
          });
          updateCount++;
        }
      });

      if (updateCount === 0) {
        toast.success("TÃªn cÃ¡c Ä‘á»™i Ä‘Ã£ Ä‘á»“ng bá»™ sáºµn, khÃ´ng cáº§n cáº­p nháº­t thÃªm", { id: toastId });
      } else {
        await batch.commit();
        toast.success(`ÄÃ£ Ä‘á»“ng bá»™ thÃ nh cÃ´ng ${updateCount} báº£n ghi vá»›i tÃªn Ä‘á»™i má»›i`, { id: toastId });
        await logAction('SYNC_TEAM_NAMES', 'multiple', 'bulk', { updateCount });
      }
    } catch (error) {
      console.error(error);
      toast.error("Lá»—i khi Ä‘á»“ng bá»™ dá»¯ liá»‡u tÃªn Ä‘á»™i", { id: toastId });
    } finally {
      setIsRestoringData(false);
    }
  };

  const [isMigratingMhToMay, setIsMigratingMhToMay] = useState(false);
  const [migrationStats, setMigrationStats] = useState<{
    teams: number;
    users: number;
    budgets: number;
    costs: number;
    blocks: number;
    acceptances: number;
    finalAcceptances: number;
    docProcessing: number;
    efficiencyReports: number;
    hasRun: boolean;
  }>({
    teams: 0,
    users: 0,
    budgets: 0,
    costs: 0,
    blocks: 0,
    acceptances: 0,
    finalAcceptances: 0,
    docProcessing: 0,
    efficiencyReports: 0,
    hasRun: false
  });

  const handleMigrateMhToMay = async (execute = false, silent = false) => {
    if (!isAdmin && !isSuperAdmin && user?.email?.toLowerCase() !== 'thienvu1108@gmail.com') {
      if (!silent) toast.error("Chá»‰ Admin má»›i cÃ³ quyá»n thá»±c hiá»‡n viá»‡c nÃ y");
      return;
    }

    setIsMigratingMhToMay(true);
    const toastId = silent ? null : toast.loading(execute ? "Äang tiáº¿n hÃ nh chuyá»ƒn Ä‘á»•i MH âž” MAY..." : "Äang quÃ©t há»‡ thá»‘ng tÃ¬m kiáº¿m mÃ£ MH...");

    try {
      // Helper function to query a whole collection safely
      const fetchCollectionDocs = async (colName: string) => {
        try {
          const snap = await getDocs(collection(db, colName));
          return snap.docs.map(dDoc => ({ id: dDoc.id, ...dDoc.data() as any }));
        } catch (err) {
          console.error(`Error fetching collection ${colName}:`, err);
          if (!silent) toast.error(`Cáº£nh bÃ¡o: KhÃ´ng thá»ƒ táº£i danh má»¥c "${colName}" do giá»›i háº¡n phÃ¢n quyá»n.`, { duration: 4000 });
          return [];
        }
      };

      const convertValue = (val: any) => {
        if (val === undefined || val === null) return '';
        const strVal = String(val);
        // 1. Replace MH followed by digits (e.g. MH01.1 -> MAY01.1)
        // 2. Replace MH with separators like MH-01.1 -> MAY-01.1
        // 3. Replace standalone MH (e.g. "MH" -> "MAY")
        return strVal
          .replace(/\bMH([0-9.]+)/gi, 'MAY$1')
          .replace(/\bMH[-_\s]+([0-9.]+)/gi, 'MAY-$1')
          .replace(/\bMH\b/gi, 'MAY');
      };

      // Let's retrieve all docs from the relevant collections safely and independently
      const allDbTeams = await fetchCollectionDocs('teams');
      const allDbUsers = await fetchCollectionDocs('users');
      const allDbBudgets = await fetchCollectionDocs('budgets');
      const allDbCosts = await fetchCollectionDocs('costs');
      const allDbBlocks = await fetchCollectionDocs('blocks');
      const allDbAcceptances = await fetchCollectionDocs('acceptances');
      const allDbFinalAcceptances = await fetchCollectionDocs('finalAcceptances');
      const allDbDocProcessing = await fetchCollectionDocs('docProcessing');
      const allDbEfficiency = await fetchCollectionDocs('efficiencyReports');
      const allDbSupport = await fetchCollectionDocs('supportRequests');

      let teamsCount = 0;
      let usersCount = 0;
      let budgetsCount = 0;
      let costsCount = 0;
      let blocksCount = 0;
      let acceptancesCount = 0;
      let finalAcceptancesCount = 0;
      let docProcessingCount = 0;
      let efficiencyCount = 0;
      let supportCount = 0;

      // Prepare batches
      const batchesToCommit: any[] = [];
      let currentBatch = writeBatch(db);
      let opCount = 0;

      const addUpdateToBatch = (ref: any, updateData: any) => {
        currentBatch.update(ref, updateData);
        opCount++;
        if (opCount >= 450) {
          if (execute) {
            batchesToCommit.push(currentBatch);
          }
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      };

      // 1. Teams: update 'name' and 'teamCode' if they contain MH
      allDbTeams.forEach(t => {
        const originalName = t.name || '';
        const originalCode = t.teamCode || '';
        const newName = convertValue(originalName);
        const newCode = convertValue(originalCode);

        if (newName !== originalName || newCode !== originalCode) {
          teamsCount++;
          if (execute) {
            addUpdateToBatch(doc(db, 'teams', t.id), {
              name: newName,
              teamCode: newCode
            });
          }
        }
      });

      // 2. Users: update 'teamName' if it contains MH
      allDbUsers.forEach(u => {
        const originalTeam = u.teamName || '';
        const newTeam = convertValue(originalTeam);

        if (newTeam !== originalTeam) {
          usersCount++;
          if (execute) {
            addUpdateToBatch(doc(db, 'users', u.id), {
              teamName: newTeam
            });
          }
        }
      });

      // 3. Budgets: update 'teamName' and 'teamCode' if they contain MH
      allDbBudgets.forEach(b => {
        const originalTeam = b.teamName || '';
        const originalCode = b.teamCode || '';
        const newTeam = convertValue(originalTeam);
        const newCode = convertValue(originalCode);

        if (newTeam !== originalTeam || (originalCode && newCode !== originalCode)) {
          budgetsCount++;
          if (execute) {
            const up: any = { teamName: newTeam };
            if (originalCode) up.teamCode = newCode;
            addUpdateToBatch(doc(db, 'budgets', b.id), up);
          }
        }
      });

      // 4. Costs: update 'teamName' and 'teamCode' if they contain MH
      allDbCosts.forEach(c => {
        const originalTeam = c.teamName || '';
        const originalCode = c.teamCode || '';
        const newTeam = convertValue(originalTeam);
        const newCode = convertValue(originalCode);

        if (newTeam !== originalTeam || (originalCode && newCode !== originalCode)) {
          costsCount++;
          if (execute) {
            const up: any = { teamName: newTeam };
            if (originalCode) up.teamCode = newCode;
            addUpdateToBatch(doc(db, 'costs', c.id), up);
          }
        }
      });

      // 5. Blocks: update 'teamPrefix' if it is "MH" or contains "MH"
      allDbBlocks.forEach(bl => {
        const originalPrefix = bl.teamPrefix || '';
        let newPrefix = originalPrefix;
        if (String(originalPrefix).toUpperCase().trim() === 'MH') {
          newPrefix = 'MAY';
        } else {
          newPrefix = convertValue(originalPrefix);
        }

        if (newPrefix !== originalPrefix) {
          blocksCount++;
          if (execute) {
            addUpdateToBatch(doc(db, 'blocks', bl.id), {
              teamPrefix: newPrefix
            });
          }
        }
      });

      // 6. Acceptances: update 'teamName' and 'teamCode' if they contain MH
      allDbAcceptances.forEach(a => {
        const originalTeam = a.teamName || '';
        const originalCode = a.teamCode || '';
        const newTeam = convertValue(originalTeam);
        const newCode = convertValue(originalCode);

        if (newTeam !== originalTeam || (originalCode && newCode !== originalCode)) {
          acceptancesCount++;
          if (execute) {
            const up: any = { teamName: newTeam };
            if (originalCode) up.teamCode = newCode;
            addUpdateToBatch(doc(db, 'acceptances', a.id), up);
          }
        }
      });

      // 7. FinalAcceptances: update 'teamName' if it contains MH
      allDbFinalAcceptances.forEach(fa => {
        const originalTeam = fa.teamName || '';
        const originalCode = fa.teamCode || '';
        const newTeam = convertValue(originalTeam);
        const newCode = convertValue(originalCode);

        if (newTeam !== originalTeam || (originalCode && newCode !== originalCode)) {
          finalAcceptancesCount++;
          if (execute) {
            const up: any = { teamName: newTeam };
            if (originalCode) up.teamCode = newCode;
            addUpdateToBatch(doc(db, 'finalAcceptances', fa.id), up);
          }
        }
      });

      // 8. DocProcessing: update 'teamName' if it contains MH
      allDbDocProcessing.forEach(dp => {
        const originalTeam = dp.teamName || '';
        const newTeam = convertValue(originalTeam);

        if (newTeam !== originalTeam) {
          docProcessingCount++;
          if (execute) {
            addUpdateToBatch(doc(db, 'docProcessing', dp.id), {
              teamName: newTeam
            });
          }
        }
      });

      // 9. Efficiency: update 'teamName' if it contains MH
      allDbEfficiency.forEach(e => {
        const originalTeam = e.teamName || '';
        const newTeam = convertValue(originalTeam);

        if (newTeam !== originalTeam) {
          efficiencyCount++;
          if (execute) {
            addUpdateToBatch(doc(db, 'efficiencyReports', e.id), {
              teamName: newTeam
            });
          }
        }
      });

      // 10. SupportRequests: update 'teamName' or 'userTeam' if they contain MH
      allDbSupport.forEach(s => {
        const originalTeam = s.teamName || s.userTeam || '';
        const newTeam = convertValue(originalTeam);

        if (newTeam !== originalTeam) {
          supportCount++;
          if (execute) {
            const up: any = {};
            if (s.teamName) up.teamName = newTeam;
            if (s.userTeam) up.userTeam = newTeam;
            addUpdateToBatch(doc(db, 'supportRequests', s.id), up);
          }
        }
      });

      // Final commit for remaining operations in the last batch
      if (execute) {
        if (opCount > 0) {
          batchesToCommit.push(currentBatch);
        }

        // Commit all batches sequentially
        for (const batchToCommit of batchesToCommit) {
          await batchToCommit.commit();
        }

        await logAction('MIGRATE_MH_TO_MAY', 'multiple', 'bulk', {
          teams: teamsCount,
          users: usersCount,
          budgets: budgetsCount,
          costs: costsCount,
          blocks: blocksCount,
          acceptances: acceptancesCount,
          finalAcceptances: finalAcceptancesCount,
          docProcessing: docProcessingCount,
          efficiencyReports: efficiencyCount,
          supportRequests: supportCount,
        });

        const totalUpdated = teamsCount + usersCount + budgetsCount + costsCount + blocksCount + acceptancesCount + finalAcceptancesCount + docProcessingCount + efficiencyCount + supportCount;
        if (!silent) {
          toast.success(`ÄÃ£ chuyá»ƒn Ä‘á»•i thÃ nh cÃ´ng ${totalUpdated} tÃ i liá»‡u tá»« MH sang MAY!`, { id: toastId! });
        } else if (totalUpdated > 0) {
          toast.success(`Há»‡ thá»‘ng Ä‘Ã£ tá»± Ä‘á»™ng chuyá»ƒn Ä‘á»•i ${totalUpdated} dá»¯ liá»‡u tá»« MH sang MAY trÃªn toÃ n bá»™ database!`, { duration: 4000 });
        }
      } else {
        const totalUpdated = teamsCount + usersCount + budgetsCount + costsCount + blocksCount + acceptancesCount + finalAcceptancesCount + docProcessingCount + efficiencyCount + supportCount;
        if (!silent) {
          toast.success(`ÄÃ£ quÃ©t xong! TÃ¬m tháº¥y ${totalUpdated} báº£n ghi cáº§n cáº­p nháº­t.`, { id: toastId! });
        }
      }

      setMigrationStats({
        teams: teamsCount,
        users: usersCount,
        budgets: budgetsCount,
        costs: costsCount,
        blocks: blocksCount,
        acceptances: acceptancesCount,
        finalAcceptances: finalAcceptancesCount,
        docProcessing: docProcessingCount,
        efficiencyReports: efficiencyCount,
        hasRun: true
      });

    } catch (error) {
      console.error(error);
      if (!silent && toastId) {
        toast.error(`Lá»—i trong quÃ¡ trÃ¬nh ${execute ? 'chuyá»ƒn Ä‘á»•i' : 'quÃ©t há»‡ thá»‘ng'}: ${(error as Error).message}`, { id: toastId });
      }
    } finally {
      setIsMigratingMhToMay(false);
    }
  };

  const autoMigratedRef = useRef(false);
  useEffect(() => {
    if ((isAdmin || isSuperAdmin || user?.email?.toLowerCase() === 'thienvu1108@gmail.com') && !autoMigratedRef.current && user) {
      autoMigratedRef.current = true;
      setTimeout(() => {
        handleMigrateMhToMay(true, true).catch(err => console.error("Auto background MH->MAY migration:", err));
      }, 1500);
    }
  }, [isAdmin, isSuperAdmin, user]);

  const [isRestoreAllDialogOpen, setIsRestoreAllDialogOpen] = useState(false);
  const [logLimit, setLogLimit] = useState(50);
  const [logSearch, setLogSearch] = useState('');
  const debouncedLogSearch = useDebounce(logSearch, 300);
  const [logTypeFilter, setLogTypeFilter] = useState('all');
  const [logUserFilter, setLogUserFilter] = useState('all');

  const uniqueLogUsers = useMemo(() => {
    const users = new Set<string>();
    auditLogs.forEach(log => {
      if (log.userEmail) users.add(log.userEmail);
    });
    return Array.from(users).sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = 
        (log.userEmail || '').toLowerCase().includes(debouncedLogSearch.toLowerCase()) ||
        (log.collection || '').toLowerCase().includes(debouncedLogSearch.toLowerCase()) ||
        (log.docId || '').toLowerCase().includes(debouncedLogSearch.toLowerCase());
      
      const matchesType = logTypeFilter === 'all' || 
        (logTypeFilter === 'WRITE' && (log.action === 'CREATE' || log.action === 'UPDATE' || log.action?.startsWith('IMPORT'))) ||
        (logTypeFilter === 'DELETE' && (log.action === 'DELETE' || log.action?.startsWith('DELETE_'))) ||
        (logTypeFilter === 'SYSTEM' && (log.action === 'FULL_SYSTEM_BACKUP' || log.action === 'DEEP_SYSTEM_RESTORE'));

      const matchesUser = logUserFilter === 'all' || log.userEmail === logUserFilter;

      return matchesSearch && matchesType && matchesUser;
    });
  }, [auditLogs, debouncedLogSearch, logTypeFilter, logUserFilter]);

  const RenderLogData = ({ data, action }: { data: any, action: string }) => {
    if (!data) return null;
    
    // Specical cases for bulk actions
    if (action === 'DELETE_ALL' || action === 'DELETE_BULK') {
      return (
        <div className="flex items-center gap-2 text-danger font-bold">
          <Trash2 className="w-4 h-4" /> 
          ÄÃ£ xÃ³a {data.count || data.snapshot?.length || 'táº¥t cáº£'} báº£n ghi
          {data.snapshot && <span className="text-[10px] bg-red-50 px-2 py-0.5 rounded-full">(CÃ³ snapshot khÃ´i phá»¥c)</span>}
        </div>
      );
    }

    if (action === 'IMPORT_BUDGETS' || action === 'IMPORT_COSTS' || action === 'IMPORT_UNIFIED_URL') {
      return (
        <div className="flex items-center gap-2 text-success font-bold">
          <FileUp className="w-4 h-4" /> 
          {action === 'IMPORT_UNIFIED_URL' ? (
            <span>Nháº­p tá»« URL: {data.costCount} chi phÃ­, {data.efficiencyCount} hiá»‡u quáº£</span>
          ) : (
            <span>ÄÃ£ nháº­p {data.count || data.items?.length || data.snapshot?.length || 'nhiá»u'} báº£n ghi</span>
          )}
        </div>
      );
    }

    // Standard recursive renderer for small objects
    const renderObject = (obj: any, depth = 0) => {
      if (depth > 2) return <span className="text-muted-foreground italic">...</span>;
      if (typeof obj !== 'object' || obj === null) return <span className="font-medium text-foreground">{String(obj)}</span>;
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pl-3 border-l-2 border-indigo-100 my-1">
          {Object.entries(obj).map(([key, val]) => {
            if (['snapshot', 'payload', 'items', 'counts'].includes(key)) return null; 
            
            // Highlight changes if old/new exist
            if (key === 'oldAmount' || key === 'newAmount' || key === 'amount' || key === 'oldName' || key === 'newName') {
               const isOld = key.startsWith('old');
               const isNew = key.startsWith('new');
               return (
                 <div key={key} className="flex items-center gap-2 text-xs">
                   <span className="font-bold text-slate-400 capitalize">{key.replace('Amount', ' (VNÄ)')}:</span>
                   <span className={`${isOld ? 'text-slate-400 line-through' : isNew ? 'text-emerald-600 font-black' : 'text-slate-900 font-bold'}`}>
                     {typeof val === 'number' ? formatCurrency(val) : String(val)}
                   </span>
                 </div>
               );
            }

            return (
              <div key={key} className="flex items-center gap-2 text-xs overflow-hidden">
                <span className="font-bold text-slate-500 min-w-[80px] shrink-0">{key}:</span>
                <span className="text-slate-900 truncate">
                  {typeof val === 'object' ? renderObject(val, depth + 1) : String(val)}
                </span>
              </div>
            );
          })}
        </div>
      );
    };

    return <div className="w-full">{renderObject(data)}</div>;
  };

  const handleCreateCheckpoint = async (customNote: string = '') => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    const toastId = toast.loading('Äang chuáº©n bá»‹ báº£n sao há»‡ thá»‘ng...');
    
    try {
      // Helper function to sanitize data for storage (limited to avoid huge payloads if needed, but let's try full)
      const prepareSnapshot = (data: any[]) => {
        if (!data || !Array.isArray(data)) return [];
        return data.map(item => {
          const newItem = { ...item };
          // Convert any complex objects to strings if they aren't standard
          return newItem;
        });
      };

      const snapshot = {
        budgets: prepareSnapshot(budgets),
        costs: prepareSnapshot(costs),
        projects: prepareSnapshot(projects),
        teams: prepareSnapshot(teams),
        efficiencyReports: prepareSnapshot(efficiencyReports),
        regions: prepareSnapshot(regions),
        types: prepareSnapshot(types)
      };

      await logAction('SYSTEM_CHECKPOINT', 'system', 'checkpoint', { 
        snapshot, 
        note: customNote || `Checkpoint tá»± Ä‘á»™ng táº¡o bá»Ÿi ${user?.email}`,
        counts: {
          budgets: budgets.length,
          costs: costs.length,
          projects: projects.length,
          teams: teams.length,
          efficiency: efficiencyReports.length
        }
      });

      toast.success('ÄÃ£ lÆ°u Ä‘iá»ƒm khÃ´i phá»¥c há»‡ thá»‘ng thÃ nh cÃ´ng!', { id: toastId });
    } catch (error) {
      console.error('Checkpoint error:', error);
      toast.error('Lá»—i khi táº¡o Ä‘iá»ƒm khÃ´i phá»¥c.', { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreCheckpoint = async (checkpoint: any) => {
    if (!checkpoint || !checkpoint.data?.snapshot) {
      toast.error('Dá»¯ liá»‡u khÃ´i phá»¥c khÃ´ng há»£p lá»‡ hoáº·c bá»‹ thiáº¿u snapshot');
      return;
    }

    if (isRestoringData) return;
    setIsRestoringData(true);
    const loadingToastId = toast.loading('Äang khá»Ÿi Ä‘á»™ng tiáº¿n trÃ¬nh khÃ´i phá»¥c Ä‘iá»ƒm thá»i gian...');

    try {
      const snapshot = checkpoint.data.snapshot;
      const collections = [
        { name: 'budgets', key: 'budgets' },
        { name: 'costs', key: 'costs' },
        { name: 'projects', key: 'projects' },
        { name: 'teams', key: 'teams' },
        { name: 'efficiencyReports', key: 'hieuQuaKinhDoanh' },
        { name: 'regions', key: 'regions' },
        { name: 'types', key: 'types' }
      ];

      // Deep Restore Logic:
      // We want to make the current state match the snapshot exactly.
      // However, to avoid massive bulk deletion that could hit limits or be irreversible, 
      // we'll use a "Synchronized Merge" approach:
      // 1. Restore anything missing from the snapshot.
      // 2. Update anything that differs.
      
      let totalOps = 0;
      let batch = writeBatch(db);

      const commitBatchAndReset = async () => {
        if (totalOps > 0) {
          await batch.commit();
          batch = writeBatch(db);
          totalOps = 0;
        }
      };

      for (const coll of collections) {
        const snapshotData = snapshot[coll.key] || snapshot[coll.name] || [];
        
        for (const item of snapshotData) {
          if (!item.id) continue;
          
          const docRef = doc(db, coll.name, item.id);
          const { id, ...dataToSave } = item;
          
          batch.set(docRef, {
            ...dataToSave,
            restoredAt: serverTimestamp(),
            restoredBy: user?.uid,
            restoredFromCheckpoint: checkpoint.id
          });
          
          totalOps++;
          if (totalOps >= 450) await commitBatchAndReset();
        }
      }

      await commitBatchAndReset();
      
      await logAction('RESTORE_CHECKPOINT_EXECUTED', 'system', checkpoint.id, { 
        checkpointId: checkpoint.id,
        timestamp: checkpoint.timestamp
      });

      toast.success('Há»‡ thá»‘ng Ä‘Ã£ Ä‘Æ°á»£c khÃ´i phá»¥c vá» phiÃªn báº£n Ä‘Ã£ chá»n!', { id: loadingToastId });
      setIsRestoreCheckpointDialogOpen(false);
      setSelectedCheckpoint(null);
    } catch (error) {
      console.error('Point in time restore error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'system');
      toast.error('Lá»—i trong quÃ¡ trÃ¬nh khÃ´i phá»¥c.', { id: loadingToastId });
    } finally {
      setIsRestoringData(false);
    }
  };

  const handleRestoreFullDatabase = async () => {
    if (isRestoringData) return;
    setIsRestoringData(true);
    toast.info('Äang phÃ¢n tÃ­ch dá»¯ liá»‡u lá»‹ch sá»­ Ä‘á»ƒ khÃ´i phá»¥c toÃ n há»‡ thá»‘ng...');

    try {
      const dbMaps: Record<string, Record<string, any>> = {
        'budgets': {}, 'costs': {}, 'projects': {}, 'teams': {},
        'regions': {}, 'types': {}, 'efficiencyReports': {}
      };

      const collMap: Record<string, string> = {
        'budgets': 'budgets', 'nganSach': 'budgets',
        'costs': 'costs', 'chiPhi': 'costs',
        'projects': 'projects', 'duAn': 'projects', 'du_an': 'projects',
        'teams': 'teams', 'team': 'teams',
        'regions': 'regions', 'vungKhuVuc': 'regions',
        'types': 'types', 'projectTypes': 'types', 'loai_hinh': 'types',
        'efficiencyReports': 'efficiencyReports', 'hieuQuaKinhDoanh': 'efficiencyReports'
      };

      const sortedLogs = [...auditLogs].reverse();

      sortedLogs.forEach(log => {
        const targetColl = collMap[log.collection];
        if (!targetColl) {
          if (log.action === 'FULL_SYSTEM_BACKUP' && log.data?.payload) {
            const p = log.data.payload;
            if (p.nganSach) p.nganSach.forEach((i: any) => dbMaps['budgets'][i.id] = i);
            if (p.chiPhi) p.chiPhi.forEach((i: any) => dbMaps['costs'][i.id] = i);
            if (p.duAn) p.duAn.forEach((i: any) => dbMaps['projects'][i.id] = i);
            if (p.team) p.team.forEach((i: any) => dbMaps['teams'][i.id] = i);
            if (p.vungKhuVuc) p.vungKhuVuc.forEach((i: any) => dbMaps['regions'][i.id] = i);
            if (p.hieuQuaKinhDoanh) p.hieuQuaKinhDoanh.forEach((i: any) => dbMaps['efficiencyReports'][i.id] = i);
          }
          return;
        }

        const map = dbMaps[targetColl];
        if (log.action === 'CREATE' || log.action === 'UPDATE' || log.action?.startsWith('IMPORT')) {
          if (log.data) {
            if (log.docId && log.docId !== 'bulk' && log.docId !== 'all') {
              map[log.docId] = { ...(map[log.docId] || {}), ...log.data, id: log.docId };
            } else if (log.data.snapshot) {
              log.data.snapshot.forEach((b: any) => map[b.id] = { ...b });
            } else if (log.data.items) {
              log.data.items.forEach((b: any) => { if (b.id) map[b.id] = { ...b }; });
            }
          }
        } else if (log.action === 'DELETE') {
          delete map[log.docId];
        } else if (log.action?.startsWith('DELETE_')) {
          if (log.data?.snapshot) {
            log.data.snapshot.forEach((b: any) => map[b.id] = { ...b });
          }
        }
      });

      const batch = writeBatch(db);
      let totalRestored = 0;

      const currentStates: Record<string, any[]> = {
        'budgets': budgets, 'costs': costs, 'projects': projects, 'teams': teams,
        'regions': regions, 'types': types, 'efficiencyReports': efficiencyReports
      };

      Object.entries(dbMaps).forEach(([collName, itemsMap]) => {
        const currentList = currentStates[collName] || [];
        Object.values(itemsMap).forEach((item: any) => {
          if (!currentList.some(cl => cl.id === item.id)) {
            const docRef = doc(db, collName, item.id);
            const { id, ...dataToSave } = item;
            batch.set(docRef, {
              ...dataToSave,
              createdAt: dataToSave.createdAt || serverTimestamp(),
              restoredAt: serverTimestamp(),
              restoredFromDeepScan: true,
              restoredBy: user?.uid
            });
            totalRestored++;
          }
        });
      });

      if (totalRestored === 0) {
        toast.info('KhÃ´ng tÃ¬m tháº¥y thÃªm dá»¯ liá»‡u nÃ o bá»‹ thiáº¿u Ä‘á»ƒ khÃ´i phá»¥c.');
      } else {
        await batch.commit();
        await logAction('DEEP_SYSTEM_RESTORE', 'system', 'all', { count: totalRestored });
        toast.success(`ÄÃ£ khÃ´i phá»¥c thÃ nh cÃ´ng ${totalRestored} báº£n ghi cho toÃ n há»‡ thá»‘ng.`);
      }
      setIsRestoreAllDialogOpen(false);
    } catch (error) {
      console.error('Deep restore error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'system');
    } finally {
      setIsRestoringData(false);
    }
  };

  const handleMigrateBudgets = () => {
    const aprilBudgets = budgets.filter(b => b.month === '2026-04');
    if (aprilBudgets.length === 0) {
      toast.info('KhÃ´ng tÃ¬m tháº¥y báº£n ghi thÃ¡ng 4 nÃ o Ä‘á»ƒ cáº­p nháº­t');
      return;
    }
    setIsMigrateBudgetsDialogOpen(true);
  };

  const confirmMigrateBudgets = async () => {
    const aprilBudgets = budgets.filter(b => b.month === '2026-04');
    const aprilCosts = costs.filter(c => c.month === '2026-04');
    setIsMigratingBudgets(true);
    setIsMigrateBudgetsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      
      // Migrate Budgets
      aprilBudgets.forEach(b => {
        batch.update(doc(db, 'budgets', b.id), { 
          month: '2026-05',
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid
        });
      });

      // Migrate Costs
      aprilCosts.forEach(c => {
        batch.update(doc(db, 'costs', c.id), {
          month: '2026-05',
          year: 2026, // Ensure year is also correct
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid
        });
      });

      await batch.commit();
      await logAction('MIGRATE_BUDGETS_AND_COSTS', 'budgets', 'bulk', { from: '2026-04', to: '2026-05', budgetCount: aprilBudgets.length, costCount: aprilCosts.length });
      toast.success(`ÄÃ£ chuyá»ƒn thÃ nh cÃ´ng ${aprilBudgets.length} ngÃ¢n sÃ¡ch vÃ  ${aprilCosts.length} thá»±c chi sang ThÃ¡ng 5`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    } finally {
      setIsMigratingBudgets(false);
    }
  };

  const handleDeleteCost = (id: string, projectName: string) => {
    setCostToDelete({ id, name: projectName });
    setIsDeleteCostDialogOpen(true);
  };

  const confirmDeleteCost = async () => {
    if (!costToDelete) return;
    try {
      await deleteDoc(doc(db, 'costs', costToDelete.id));
      await logAction('DELETE', 'costs', costToDelete.id, { projectName: costToDelete.name });
      toast.success('ÄÃ£ xÃ³a báº£n ghi chi phÃ­');
      setIsDeleteCostDialogOpen(false);
      setCostToDelete(null);
      setSelectedCostIds(prev => prev.filter(cid => cid !== costToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'costs');
    }
  };

  const handleBulkDeleteCosts = async () => {
    if (selectedCostIds.length === 0 || isDeletingCosts) return;
    setIsBulkDeleteCostsDialogOpen(true);
  };

  const confirmBulkDeleteCosts = async () => {
    setIsDeletingCosts(true);
    setIsBulkDeleteCostsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedCostIds.forEach(id => {
        batch.delete(doc(db, 'costs', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'costs', 'multiple', { count: selectedCostIds.length });
      toast.success(`ÄÃ£ xÃ³a ${selectedCostIds.length} báº£n ghi chi phÃ­`);
      setSelectedCostIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'costs');
    } finally {
      setIsDeletingCosts(false);
    }
  };

  const handleDeleteAllCosts = async () => {
    if (costs.length === 0) return;
    setIsDeleteAllCostsDialogOpen(true);
  };

  const confirmDeleteAllCosts = async () => {
    setIsDeleteAllCostsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      costs.forEach(c => {
        batch.delete(doc(db, 'costs', c.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'costs', 'all', { count: costs.length });
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ báº£n ghi chi phÃ­ thá»±c táº¿');
      setSelectedCostIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'costs');
    }
  };

  const handleDownloadCostTemplate = () => {
    const headers = ['ProjectID', 'TeamID', 'Month', 'Period', 'FBAds', 'Posting', 'ZaloAds', 'GoogleAds', 'OtherCost', 'Note'];
    const sampleData = [
      ['p_id_1', 't_id_1', '2026-03', '1', '1000000', '500000', '0', '0', '100000', 'Note sample'],
      ['p_id_2', 't_id_2', '2026-03', '2', '2000000', '1000000', '500000', '300000', '0', 'Note sample 2']
    ];
    
    const csvContent = [headers, ...sampleData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_chi_phi.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTeams = () => {
    if (teams.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u team Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = teams.map(t => ({
      'ID': t.id,
      'MÃ£ Team': t.teamCode || '',
      'TÃªn Team': t.name,
      'NgÃ y táº¡o': safeFormat(t.createdAt, 'dd/MM/yyyy HH:mm:ss')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teams");
    XLSX.writeFile(workbook, `danh_sach_team_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch team thÃ nh cÃ´ng');
  };

  const handleExportProjects = () => {
    if (projects.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u dá»± Ã¡n Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = projects.map(p => ({
      'ID': p.id,
      'MÃ£ Dá»± Ã¡n': p.projectCode || '',
      'TÃªn Dá»± Ã¡n': p.name,
      'Khu vá»±c': p.region || 'N/A',
      'Loáº¡i hÃ¬nh': p.type || 'N/A',
      'NgÃ y táº¡o': safeFormat(p.createdAt, 'dd/MM/yyyy HH:mm:ss')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
    XLSX.writeFile(workbook, `danh_sach_du_an_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch dá»± Ã¡n thÃ nh cÃ´ng');
  };

  const handleExportBudgets = () => {
    if (budgets.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u ngÃ¢n sÃ¡ch Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = budgets.map(b => {
      const teamName = teamMap[b.teamId] || b.teamName || '';
      const teamObj = teams.find((t: any) => t.id === b.teamId || t.name === teamName);
      const mainTeamName = teamObj?.name || teamName;
      return {
        'ID Dá»± Ã¡n': b.projectId,
        'TÃªn Dá»± Ã¡n': b.projectName || '',
        'ID Team': b.teamId,
        'TÃªn Team': mainTeamName,
        'MÃ£ Team': teamObj?.teamCode || extractTeamCode(mainTeamName),
        'GÄKD': extractGDKD(mainTeamName),
        'ThÃ¡ng': b.month,
        'NgÆ°á»i triá»ƒn khai': b.implementerName || 'N/A',
        'NgÃ¢n sÃ¡ch': b.amount
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Budgets");
    XLSX.writeFile(workbook, `danh_sach_ngan_sach_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch ngÃ¢n sÃ¡ch (Excel) thÃ nh cÃ´ng');
  };

  const handleExportFilteredBudgets = () => {
    if (budgetReportWithActuals.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u ngÃ¢n sÃ¡ch Ä‘Ã£ lá»c Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = budgetReportWithActuals.map((b, idx) => {
      const teamName = b.teamName || '';
      const teamObj = teams.find((t: any) => t.id === b.teamId || t.name === teamName);
      const mainTeamName = teamObj?.name || teamName;
      return {
        'STT': idx + 1,
        'Äá»™i (Team)': mainTeamName,
        'MÃ£ Team': teamObj?.teamCode || extractTeamCode(mainTeamName),
        'GÄKD': extractGDKD(mainTeamName),
        'NgÆ°á»i triá»ƒn khai': b.implementerName || 'N/A',
        'Dá»± Ã¡n': b.projectName || 'N/A',
        'NgÃ¢n sÃ¡ch Ä‘Äƒng kÃ½ (VNÄ)': b.amount,
        'Thá»±c chi (VNÄ)': b.actualCost || 0,
        'ChÃªnh lá»‡ch (VNÄ)': (b.amount - (b.actualCost || 0)),
        'Ká»³ (ThÃ¡ng)': b.month || '',
        'NgÆ°á»i Ä‘Äƒng kÃ½': b.userEmail || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Budgets");
    
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 20 }, // Äá»™i (Team)
      { wch: 15 }, // MÃ£ Team
      { wch: 20 }, // GÄKD
      { wch: 20 }, // NgÆ°á»i triá»ƒn khai
      { wch: 25 }, // Dá»± Ã¡n
      { wch: 22 }, // NgÃ¢n sÃ¡ch Ä‘Äƒng kÃ½
      { wch: 18 }, // Thá»±c chi
      { wch: 18 }, // ChÃªnh lá»‡ch
      { wch: 12 }, // Ká»³ (ThÃ¡ng)
      { wch: 25 }  // NgÆ°á»i Ä‘Äƒng kÃ½
    ];

    const monthsStr = reportMonths && reportMonths.length > 0 ? reportMonths.join('_') : 'all';
    XLSX.writeFile(workbook, `danh_sach_ngan_sach_loc_${monthsStr}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch ngÃ¢n sÃ¡ch Ä‘Ã£ lá»c (Excel) thÃ nh cÃ´ng');
  };

  const handleExportAdminFilteredBudgets = () => {
    if (adminFilteredBudgets.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u ngÃ¢n sÃ¡ch admin Ä‘Ã£ lá»c Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = adminFilteredBudgets.map((b, idx) => {
      const teamName = teamMap[b.teamId] || b.teamName || '';
      const teamObj = teams.find((t: any) => t.id === b.teamId || t.name === teamName);
      const mainTeamName = teamObj?.name || teamName;
      const bcNT = baoCaoNTMap[b.id] || 0;
      const rate = b.amount > 0 ? (bcNT / b.amount) * 100 : 0;
      return {
        'STT': idx + 1,
        'ID Dá»± Ã¡n': b.projectId,
        'TÃªn Dá»± Ã¡n': projectMap[b.projectId] || b.projectName || 'N/A',
        'TÃªn Team': mainTeamName,
        'MÃ£ Team': teamObj?.teamCode || extractTeamCode(mainTeamName),
        'GÄKD': extractGDKD(mainTeamName),
        'NgÆ°á»i triá»ƒn khai': b.implementerName || 'N/A',
        'Ká»³ (ThÃ¡ng)': b.month || '',
        'NgÃ¢n sÃ¡ch Ä‘Äƒng kÃ½ (VNÄ)': b.amount || 0,
        'BÃ¡o cÃ¡o nghiá»‡m thu (VNÄ)': bcNT,
        'Tá»‰ lá»‡ (%)': Number(rate.toFixed(1)),
        'NgÃ y Ä‘Äƒng kÃ½': safeFormat(b.createdAt, 'dd/MM/yyyy HH:mm:ss'),
        'NgÆ°á»i Ä‘Äƒng kÃ½': b.userEmail || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Admin Filtered Budgets");
    
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 15 }, // ID Dá»± Ã¡n
      { wch: 25 }, // TÃªn Dá»± Ã¡n
      { wch: 20 }, // TÃªn Team
      { wch: 15 }, // MÃ£ Team
      { wch: 20 }, // GÄKD
      { wch: 20 }, // NgÆ°á»i triá»ƒn khai
      { wch: 12 }, // Ká»³ (ThÃ¡ng)
      { wch: 22 }, // NgÃ¢n sÃ¡ch Ä‘Äƒng kÃ½
      { wch: 22 }, // Thá»±c nghiá»‡m thu
      { wch: 20 }, // NgÃ y Ä‘Äƒng kÃ½
      { wch: 25 }  // NgÆ°á»i Ä‘Äƒng kÃ½
    ];

    const monthStr = adminBudgetMonthFilter || 'tat_ca';
    XLSX.writeFile(workbook, `admin_ngan_sach_loc_${monthStr}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch ngÃ¢n sÃ¡ch Admin Ä‘Ã£ lá»c thÃ nh cÃ´ng');
  };

  const handleExportUnbudgetedAcceptances = () => {
    if (filteredUnbudgetedAcceptances.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»™i phÃ¡t sinh chi phÃ­ MKT chÆ°a Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = filteredUnbudgetedAcceptances.map((item, idx) => {
      return {
        'STT': idx + 1,
        'Dá»± Ã¡n': item.projectName,
        'TÃªn Team': item.teamName,
        'MÃ£ Team': item.teamCode || extractTeamCode(item.teamName),
        'GÄKD': extractGDKD(item.teamName),
        'ThÃ¡ng (Ká»³)': item.month,
        'Chi phÃ­ Nghiá»‡m thu MKT (VNÄ)': item.acceptanceCost,
        'NgÃ¢n sÃ¡ch ÄÄƒng kÃ½ (VNÄ)': 0,
        'Tráº¡ng thÃ¡i': 'ChÆ°a Ä‘Äƒng kÃ½ NgÃ¢n sÃ¡ch'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Phat sinh MKT Khong NS");
    
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 25 }, // Dá»± Ã¡n
      { wch: 20 }, // TÃªn Team
      { wch: 15 }, // MÃ£ Team
      { wch: 20 }, // GÄKD
      { wch: 12 }, // ThÃ¡ng
      { wch: 25 }, // CP Nghiá»‡m thu MKT
      { wch: 22 }, // NgÃ¢n sÃ¡ch ÄÄƒng kÃ½
      { wch: 25 }  // Tráº¡ng thÃ¡i
    ];

    const monthsStr = adminBudgetMonthFilter ? adminBudgetMonthFilter : 'all';
    XLSX.writeFile(workbook, `doi_phat_sinh_mkt_khong_ngan_sach_${monthsStr}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch Ä‘á»™i phÃ¡t sinh MKT khÃ´ng ngÃ¢n sÃ¡ch (Excel) thÃ nh cÃ´ng');
  };

  const handleSyncReportNT = async () => {
    if (!inputReportNTUrl) {
      toast.error("Vui lÃ²ng nháº­p link Google Sheet");
      return;
    }

    // Extract Spreadsheet ID
    const match = inputReportNTUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      toast.error("Link Google Sheet khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng. Cáº§n dáº¡ng https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...");
      return;
    }

    const spreadsheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    setIsSyncingReportNT(true);

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("KhÃ´ng thá»ƒ táº£i file tá»« Google Sheet. HÃ£y cháº¯c cháº¯n link Google Sheet Ä‘Ã£ Ä‘Æ°á»£c chia sáº» cÃ´ng khai á»Ÿ cháº¿ Ä‘á»™ 'Báº¥t ká»³ ai cÃ³ liÃªn káº¿t Ä‘á»u cÃ³ thá»ƒ xem' (Anyone with link can view).");
      }
      
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("Tá»‡p Google Sheet rá»—ng hoáº·c khÃ´ng há»£p lá»‡.");
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const dataArr: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (dataArr.length < 2) {
        throw new Error("Google Sheet cáº§n Ã­t nháº¥t 2 hÃ ng lÃ m tiÃªu Ä‘á» (hÃ ng 1 vÃ  hÃ ng 2) vÃ  cÃ¡c hÃ ng tiáº¿p theo lÃ m cÃ¡c báº£n ghi.");
      }

      const row1 = dataArr[0] || [];
      const row2 = dataArr[1] || [];
      const maxCols = Math.max(row1.length, row2.length);

      // Save headers
      const headers: string[] = [];
      for (let c = 0; c < maxCols; c++) {
        const h1 = String(row1[c] || '').trim();
        const h2 = String(row2[c] || '').trim();
        
        let headerName = '';
        if (h1 && h2) {
          headerName = h1 === h2 ? h1 : `${h1} - ${h2}`;
        } else {
          headerName = h1 || h2 || `Cá»™t ${c + 1}`;
        }
        headers.push(headerName);
      }

      // Read records (Row index 2 and onward)
      const records: any[] = [];
      for (let r = 2; r < dataArr.length; r++) {
        const rowData = dataArr[r];
        if (!rowData) continue;
        
        const isEmpty = rowData.every(val => val === null || val === undefined || String(val).trim() === '');
        if (isEmpty) continue;

        const record: Record<string, any> = { id_row: r + 1 };
        headers.forEach((header, c) => {
          record[header] = rowData[c] !== undefined && rowData[c] !== null ? rowData[c] : '';
        });
        records.push(record);
      }

      // Check permission: settings can only be saved to Firestore by isAdmin or isAccountant.
      const canWriteSettings = isAdmin || isAccountant;
      if (canWriteSettings) {
        // Helper to match nested/combined/loose column keys in each record object
        const getVal = (recordObj: Record<string, any>, possibleKeywords: string[]) => {
          for (const key of Object.keys(recordObj)) {
            if (key === 'id_row') continue;
            const cleanKey = key.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '');
            for (const kw of possibleKeywords) {
              const cleanKW = kw.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '');
              if (cleanKey.includes(cleanKW) || cleanKW.includes(cleanKey)) {
                return recordObj[key];
              }
            }
          }
          return undefined;
        };

        const findProjectMatch = (refObj: any) => {
          if (!refObj) return null;
          const cleanRef = String(refObj).toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => {
            const pId = String(p.id || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            const pCode = String(p.projectCode || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            const pName = String(p.name || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            return pId === cleanRef || pCode === cleanRef || pName === cleanRef || cleanRef.includes(pName) || pName.includes(cleanRef);
          });
        };

        const findTeamMatch = (refObj: any) => {
          if (!refObj) return null;
          const cleanRef = String(refObj).toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => {
            const tId = String(t.id || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            const tCode = String(t.teamCode || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            const tName = String(t.name || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            return tId === cleanRef || tCode === cleanRef || tName === cleanRef || cleanRef.includes(tName) || tName.includes(cleanRef);
          });
        };

        let updatedCount = 0;
        let insertedCount = 0;
        let skippedCount = 0;

        let batch = writeBatch(db);
        let opCount = 0;

        for (const record of records) {
          const monthRaw = getVal(record, ['ká»³ thÃ¡ng', 'thÃ¡ng', 'ká»³', 'month', 'thang']);
          const month = normalizeMonth(monthRaw);

          const teamRef = getVal(record, ['mÃ£ team', 'team', 'mateam', 'idteam', 'mÃ£ phÃ²ng', 'maphong']);
          const projectRef = getVal(record, ['tÃªn dá»± Ã¡n', 'dá»± Ã¡n', 'project', 'tenduan', 'projectname']);

          if (!month || !teamRef || !projectRef) {
            skippedCount++;
            continue;
          }

          const project = findProjectMatch(projectRef);
          const team = findTeamMatch(teamRef);

          if (!project || !team) {
            skippedCount++;
            continue;
          }

          // Parse cost metrics
          const fbDigitalChuaVat = parseVal(getVal(record, ['FB Digital ChÆ°a VAT', 'FB Digital C.VAT', 'Facebook ChÆ°a VAT', 'fb digital chua vat', 'fb chua vat']));
          let fbAds = parseVal(getVal(record, ['Facebook Ads', 'FB Ads', 'FBAds', 'facebookads', 'facebook ads', 'facebook', 'Digital (VAT 10%)', 'Digital VAT']));
          if (fbAds === 0 && fbDigitalChuaVat > 0) {
            fbAds = Math.round(fbDigitalChuaVat * 1.10);
          }

          const caNhanCost = parseVal(getVal(record, ['CÃ¡ nhÃ¢n', 'ca nhan', 'CÃ¡ nhÃ¢n cost', 'ca nhan cost']));
          const fbVisaCostChuaVat = parseVal(getVal(record, ['FB Visa ChÆ°a VAT', 'FB Visa Trá»±c Cháº¡y ChÆ°a VAT', 'Visa ChÆ°a VAT', 'fb visa chua vat', 'visa chua vat']));
          let visa = parseVal(getVal(record, ['VISA', 'visa', 'visa cost', 'chi phÃ­ visa', 'Visa Trá»±c Cháº¡y (10%)', 'Visa Trá»±c Cháº¡y 10%']));
          if (visa === 0 && fbVisaCostChuaVat > 0) {
            visa = Math.round(fbVisaCostChuaVat * 1.10);
          }

          const dangTinCaNhanCost = parseVal(getVal(record, ['ÄÄƒng Tin CÃ¡ NhÃ¢n', 'dang tin ca nhan', 'ÄÄƒng tin C.NhÃ¢n', 'dang tin ca nhan cost']));
          const dangTinCongTyChuaVat = parseVal(getVal(record, ['ÄÄƒng Tin CÃ´ng Ty ChÆ°a VAT', 'ÄÄƒng Tin C.Ty ChÆ°a VAT', 'dang tin cong ty chua vat', 'dang tin c ty chua vat']));
          let posting = parseVal(getVal(record, ['ÄÄƒng tin', 'Posting', 'dangtin', 'posting', 'ÄÄƒng Tin C.Ty (8%)', 'ÄÄƒng tin cÃ´ng ty 8%']));
          if (posting === 0 && dangTinCongTyChuaVat > 0) {
            posting = Math.round(dangTinCongTyChuaVat * 1.08);
          }

          const zaloAds = parseVal(getVal(record, ['Zalo Ads', 'Zalo', 'zaloads', 'zalo ads', 'zalo']));
          const googleAds = parseVal(getVal(record, ['Google Ads', 'Google', 'googleads', 'google ads', 'google', 'Google / Native']));
          const tiktokAds = parseVal(getVal(record, ['Tiktok Ads', 'TikTok', 'tiktokads', 'tiktok ads', 'tiktok']));
          const other = caNhanCost; // Map caNhanCost of other/caNhan for backwards compatibility with budget charts

          const totalCost = fbAds + caNhanCost + visa + dangTinCaNhanCost + posting + zaloAds + googleAds + tiktokAds;

          const existingAcc = acceptances.find(a => 
            a.projectId === project.id && 
            a.teamId === team.id && 
            a.month === month
          );

          if (existingAcc) {
            const ref = doc(db, 'acceptances', existingAcc.id);
            batch.update(ref, {
              projectName: project.name,
              projectCode: project.projectCode || '',
              teamName: team.name,
              teamCode: team.teamCode || '',
              fbDigitalChuaVat: fbDigitalChuaVat,
              facebookCost: fbAds,
              tiktokCost: tiktokAds,
              zaloCost: zaloAds,
              googleCost: googleAds,
              postingCost: posting,
              visaCost: visa,
              digitalCost: fbAds,
              otherCost: caNhanCost,
              fbVisaCostChuaVat: fbVisaCostChuaVat,
              dangTinCaNhanCost: dangTinCaNhanCost,
              dangTinCongTyChuaVat: dangTinCongTyChuaVat,
              caNhanCost: caNhanCost,
              totalCost: totalCost,
              beforeAcceptanceCost: totalCost,
              afterAcceptanceCost: existingAcc.status === 'TrÆ°á»›c nghiá»‡m thu' ? totalCost : existingAcc.afterAcceptanceCost,
              updatedAt: serverTimestamp(),
              updatedBy: user?.email || '',
              updatedByUid: user?.uid || ''
            });
            updatedCount++;
          } else {
            const ref = doc(collection(db, 'acceptances'));
            batch.set(ref, {
              projectId: project.id,
              projectName: project.name,
              projectCode: project.projectCode || '',
              teamId: team.id,
              teamName: team.name,
              teamCode: team.teamCode || '',
              month,
              fbDigitalChuaVat: fbDigitalChuaVat,
              facebookCost: fbAds,
              tiktokCost: tiktokAds,
              zaloCost: zaloAds,
              googleCost: googleAds,
              postingCost: posting,
              visaCost: visa,
              digitalCost: fbAds,
              otherCost: caNhanCost,
              fbVisaCostChuaVat: fbVisaCostChuaVat,
              dangTinCaNhanCost: dangTinCaNhanCost,
              dangTinCongTyChuaVat: dangTinCongTyChuaVat,
              caNhanCost: caNhanCost,
              totalCost: totalCost,
              beforeAcceptanceCost: totalCost,
              afterAcceptanceCost: totalCost,
              status: 'TrÆ°á»›c nghiá»‡m thu',
              createdAt: serverTimestamp(),
              createdBy: user?.email || '',
              createdByUid: user?.uid || '',
              updatedAt: serverTimestamp(),
              updatedBy: user?.email || '',
              updatedByUid: user?.uid || '',
              breakdown: {}
            });
            insertedCount++;
          }

          opCount++;
          if (opCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }

        if (opCount > 0) {
          await batch.commit();
        }

        await setDoc(doc(db, 'settings', 'report_nt'), {
          sheetUrl: inputReportNTUrl,
          records: records,
          lastUpdated: new Date().toISOString()
        });

        toast.success(`Äá»“ng bá»™ thÃ nh cÃ´ng! Cáº­p nháº­t ${updatedCount} báº£n ghi, thÃªm má»›i ${insertedCount} báº£n ghi nghiá»‡m thu.`);
        if (skippedCount > 0) {
          toast.info(`Bá» qua ${skippedCount} báº£n ghi khÃ´ng khá»›p TÃªn Dá»± Ã¡n, MÃ£ Team hoáº·c ThÃ¡ng.`);
        }
      } else {
        // Fallback for demo / non-admin testing who want to trigger local sync:
        setReportNTUrl(inputReportNTUrl);
        setReportNTRecords(records);
        setReportNTLastUpdated(new Date().toISOString());
        toast.warning("ÄÃ£ Ä‘á»“ng bá»™ cá»¥c bá»™ táº¡m thá»i. LÆ°u Ã½: Chá»‰ Quáº£n trá»‹ viÃªn/Káº¿ toÃ¡n má»›i cÃ³ quyá»n lÆ°u cáº¥u hÃ¬nh liÃªn káº¿t lÃ¢u dÃ i vÃ o cÆ¡ sá»Ÿ dá»¯ liá»‡u há»‡ thá»‘ng.");
      }

    } catch (error: any) {
      console.error("Lá»—i Ä‘á»“ng bá»™ Google Sheet BÃ¡o cÃ¡o NT:", error);
      toast.error(`KhÃ´ng thá»ƒ Ä‘á»“ng bá»™: ${error.message || error}`);
    } finally {
      setIsSyncingReportNT(false);
    }
  };

  const handleExportCosts = () => {
    if (costs.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u chi phÃ­ Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = costs.map(c => ({
      'ID Dá»± Ã¡n': c.projectId,
      'TÃªn Dá»± Ã¡n': c.projectName || '',
      'Team': c.teamName || '',
      'ThÃ¡ng': c.month,
      'Tuáº§n': c.weekNumber,
      'NgÆ°á»i triá»ƒn khai': c.implementerName || 'N/A',
      'FB Ads': c.channels?.fbAds || 0,
      'Posting': c.channels?.posting || 0,
      'Zalo Ads': c.channels?.zaloAds || 0,
      'Google Ads': c.channels?.googleAds || 0,
      'KhÃ¡c': c.channels?.otherCost || 0,
      'Tá»•ng chi phÃ­': c.amount,
      'Ghi chÃº': c.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Costs");
    XLSX.writeFile(workbook, `chi_phi_chi_tiet_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch chi phÃ­ (Excel) thÃ nh cÃ´ng');
  };

  const handleDownloadBudgetTemplate = () => {
    const headers = ['ID Dá»± Ã¡n', 'ID Team', 'ThÃ¡ng', 'NgÆ°á»i triá»ƒn khai', 'NgÃ¢n sÃ¡ch'];
    const sampleData = [
      ['p_id_1', 't_id_1', '2026-03', 'Nguyá»…n VÄƒn A', '50000000'],
      ['p_id_2', 't_id_2', '2026-03', 'Tráº§n Thá»‹ B', '75000000']
    ];
    
    const csvContent = "\uFEFF" + [headers, ...sampleData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_dang_ky_ngan_sach.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBudgetsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingBudgets(true);
    setImportErrors([]);

    const processBudgetData = async (data: any[]) => {
      try {
        const batch = writeBatch(db);
        let count = 0;
        let errorsCount = 0;
        const errorDetailsList: string[] = [];

        // Pre-consolidate the incoming data by projectId_teamId_month
        const consolidatedDataMap = new Map();
        for (const rowData of data) {
          const processedRow = rowData as any;
          const normalizedRow: any = {};
          Object.keys(processedRow).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
            normalizedRow[cleanKey] = processedRow[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
              if (normalizedRow[cleanPK] !== undefined && normalizedRow[cleanPK] !== '') return normalizedRow[cleanPK];
            }
            return undefined;
          };

          const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'teamid', 'id team', 'mÃ£ team']) || '').trim();
          const monthRaw = getVal(['ThÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'ky', 'ká»³']);
          const month = normalizeMonth(monthRaw);
          const amountRaw = getVal(['NgÃ¢n sÃ¡ch', 'Amount', 'ngansach', 'ngÃ¢n saÌch', 'ngÃ¢nsÃ¡ch', 'sá»‘ tiá»n']);
          const amountDecimal = String(amountRaw || '0').replace(/[.,]/g, '');
          const amount = Number(amountDecimal);
          const implementer = String(getVal(['NgÆ°á»i phá»¥ trÃ¡ch', 'GiaÌm Ä‘Ã´Ìc kinh doanh', 'GDDA', 'NgÆ°á»i triá»ƒn khai', 'Implementer', 'nguoiphutrach', 'giamdockinhdoanh', 'nguoitrienkhai', 'ngÆ°Æ¡Ì€i triÃªÌ‰n khai', ' GD']) || '').trim();

          if (pRef && tRef && month && (amount >= 0 || !isNaN(amount))) {
            const key = `${pRef}_${tRef}_${month}`;
            if (consolidatedDataMap.has(key)) {
              consolidatedDataMap.get(key).amount += amount;
            } else {
              consolidatedDataMap.set(key, { pRef, tRef, month, amount, implementer, rawRow: processedRow });
            }
          } else if (Object.values(normalizedRow).some(v => v !== '')) {
             const missing = [];
             if (!pRef) missing.push('Dá»± Ã¡n');
             if (!tRef) missing.push('Team');
             if (!month) missing.push('ThÃ¡ng/Ká»³');
             if (isNaN(amount)) missing.push('NgÃ¢n sÃ¡ch (khÃ´ng pháº£i sá»‘)');
             
             errorDetailsList.push(
               `THÃ”NG TIN SAI Äá»ŠNH Dáº NG HOáº¶C THIáº¾U: (${missing.join(', ')}).\n` +
               `â€¢ NguyÃªn nhÃ¢n: Cá»™t "${missing[0]}" Ä‘ang Ä‘á»ƒ trá»‘ng hoáº·c chá»©a kÃ½ tá»± khÃ´ng há»£p lá»‡ (Ä‘á»‘i vá»›i sá»‘ tiá»n).\n` +
               `â€¢ CÃ¡ch kháº¯c phá»¥c: Äiá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin Dá»± Ã¡n, Team, ThÃ¡ng (YYYY-MM). Äá»‘i vá»›i NgÃ¢n sÃ¡ch chá»‰ Ä‘iá»n chá»¯ sá»‘, khÃ´ng kÃ¨m Ä‘Æ¡n vá»‹ VNÄ hay dáº¥u cháº¥m phÃ¢n cÃ¡ch.`
             );
             errorsCount++;
          }
        }

        const consolidatedItems = Array.from(consolidatedDataMap.values()) as any[];

        for (const item of consolidatedItems) {
          const findProjectAddress = (ref: string) => {
            if (!ref) return null;
            const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (!cleanRef) return null;
            return projects.find(p => 
              p.id === ref || 
              (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
              (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
            );
          };

          const findTeamAddress = (ref: string) => {
            if (!ref) return null;
            const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (!cleanRef) return null;
            return teams.find(t => 
              t.id === ref || 
              (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
              (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
            );
          };

          const project = findProjectAddress(item.pRef);
          const team = findTeamAddress(item.tRef);

          if (!project) {
            errorDetailsList.push(
              `KHÃ”NG TÃŒM THáº¤Y Dá»° ÃN khá»›p vá»›i "${item.pRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: TÃªn hoáº·c mÃ£ Dá»± Ã¡n khÃ´ng tá»“n táº¡i. "Dá»± Ã¡n" hiá»ƒn thá»‹ trong file lÃ  "${item.pRef}".\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Äá»‘i chiáº¿u vá»›i danh sÃ¡ch Dá»± Ã¡n trong há»‡ thá»‘ng Ä‘á»ƒ láº¥y Ä‘Ãºng tÃªn hoáº·c ID.`
            );
            errorsCount++;
            continue;
          }
          if (!team) {
            errorDetailsList.push(
              `KHÃ”NG TÃŒM THáº¤Y TEAM khá»›p vá»›i "${item.tRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: TÃªn hoáº·c mÃ£ Team khÃ´ng tá»“n táº¡i. "Team" hiá»ƒn thá»‹ trong file lÃ  "${item.tRef}".\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Äá»‘i chiáº¿u vá»›i danh sÃ¡ch Team trong há»‡ thá»‘ng Ä‘á»ƒ láº¥y Ä‘Ãºng tÃªn hoáº·c ID.`
            );
            errorsCount++;
            continue;
          }

          const pId = project.id;
          const teamId = team.id;
          const assignedUserEmail = extractEmail(item.implementer);

          const existingBudgetsForMatch = budgets.filter(b => 
            b.projectId && b.projectId === pId && 
            b.teamId && b.teamId === teamId && 
            b.month === item.month
          );

          if (existingBudgetsForMatch.length > 0) {
            const targetBudget = existingBudgetsForMatch[0];
            const duplicates = existingBudgetsForMatch.slice(1);
            const bRef = doc(db, 'budgets', targetBudget.id);
            
            // Calculate total existing amount before merge
            const totalExistingAmount = existingBudgetsForMatch.reduce((sum, b) => sum + b.amount, 0);
            
            batch.update(bRef, {
              amount: totalExistingAmount + item.amount, // Add to existing total
              implementerName: item.implementer || targetBudget.implementerName,
              assignedUserEmail: assignedUserEmail || targetBudget.assignedUserEmail || null,
              userEmail: assignedUserEmail || targetBudget.userEmail || user?.email?.toLowerCase(),
              updatedAt: serverTimestamp(),
              updatedBy: user?.uid,
              editHistory: arrayUnion({
                action: 'IMPORT_ADD_MERGE',
                editorName: userProfile?.fullName || user?.displayName || 'Admin',
                editorEmail: user?.email,
                timestamp: new Date().toISOString(),
                addedAmount: item.amount,
                prevTotalInDb: totalExistingAmount,
                newTotal: totalExistingAmount + item.amount,
                duplicatesMerged: duplicates.length
              })
            });

            // Cleanup duplicates
            for (const dup of duplicates) {
              const affectedCosts = costs.filter(c => c.budgetId === dup.id);
              affectedCosts.forEach(c => {
                batch.update(doc(db, 'costs', c.id), { budgetId: targetBudget.id });
              });
              batch.delete(doc(db, 'budgets', dup.id));
            }
          } else {
            const bRef = doc(collection(db, 'budgets'));
            batch.set(bRef, {
              projectId: pId,
              projectName: project.name,
              teamId: teamId,
              teamName: team.name,
              implementerName: item.implementer || 'N/A',
              assignedUserEmail: assignedUserEmail,
              userEmail: assignedUserEmail || user?.email?.toLowerCase(),
              month: item.month,
              amount: item.amount,
              createdAt: serverTimestamp(),
              createdBy: user?.uid,
              editHistory: [{
                action: 'IMPORT_CREATE',
                editorName: 'Admin',
                timestamp: new Date().toISOString(),
                amount: item.amount
              }]
            });
          }
          count++;
        }

        if (count > 0) {
          await batch.commit();
          await logAction('IMPORT_BUDGETS', 'budgets', 'bulk', { count, errors: errorsCount });
          toast.success(`ÄÃ£ cáº­p nháº­t ${count} ngÃ¢n sÃ¡ch. ${errorsCount > 0 ? `Bá» qua ${errorsCount} dÃ²ng lá»—i.` : ''}`);
        }

        if (count === 0 && errorsCount > 0) {
          toast.error(`KhÃ´ng cÃ³ dá»¯ liá»‡u há»£p lá»‡ Ä‘á»ƒ nháº­p. CÃ³ ${errorsCount} dÃ²ng lá»—i.`);
        } else if (count === 0) {
          toast.error(`KhÃ´ng cÃ³ dá»¯ liá»‡u há»£p lá»‡ Ä‘á»ƒ nháº­p. Vui lÃ²ng kiá»ƒm tra tiÃªu Ä‘á» cá»™t vÃ  ná»™i dung.`);
        }

        if (errorsCount > 0 || errorDetailsList.length > 0) {
          setImportErrors(errorDetailsList);
          setIsImportErrorsDialogOpen(true);
        }
      } catch (error) {
        console.error(error);
        toast.error('Lá»—i khi nháº­p dá»¯ liá»‡u');
      } finally {
        setIsImportingBudgets(false);
        e.target.value = '';
      }
    };

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet);
          await processBudgetData(json);
        } catch (error) {
          console.error(error);
          toast.error('Lá»—i khi Ä‘á»c file Excel');
          setIsImportingBudgets(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processBudgetData(results.data);
        },
        error: (error) => {
          toast.error('Lá»—i khi Ä‘á»c file CSV');
          setIsImportingBudgets(false);
        }
      });
    }
  };

  const handleImportCostsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingCosts(true);
    setImportErrors([]);

    const findProjectInternal = (ref: string) => {
      if (!ref) return null;
      const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!cleanRef) return null;
      return projects.find(p => 
        p.id === ref || 
        (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
        (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
      );
    };

    const findTeamInternal = (ref: string) => {
      if (!ref) return null;
      const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!cleanRef) return null;
      return teams.find(t => 
        t.id === ref || 
        (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
        (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
      );
    };

    const processCostData = async (data: any[]) => {
      try {
        const batch = writeBatch(db);
        let count = 0;
        let errorsCount = 0;
        const errorDetailsList: string[] = [];

        for (let i = 0; i < data.length; i++) {
          const rawRow = data[i];
          const rowIndex = i + 2;
          const row: any = {};
          Object.keys(rawRow).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
            row[cleanKey] = rawRow[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
              if (row[cleanPK] !== undefined && row[cleanPK] !== '') return row[cleanPK];
            }
            return undefined;
          };

          const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'idteam', 'id team', 'mÃ£ team']) || '').trim();
          const monthRaw = getVal(['ThÃ¡ng', 'Ká»³ thÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'ká»³']);
          const month = normalizeMonth(monthRaw);
          const periodValue = String(getVal(['Tuáº§n', 'Ká»³ tuáº§n', 'Week', 'Period', 'tuan', 'tuÃ¢Ì€n', 'ky']) || '').trim();
          
          const fbAds = parseVal(getVal(['FBAds', 'FB Ads', 'Facebook Ads', 'Facebook', 'Chi phÃ­ FB', 'QC Facebook', 'Ads FB', 'chiphi fb', 'facebook ads', 'ads facebook', 'facebook ads']));
          const posting = parseVal(getVal(['Posting', 'ÄÄƒng bÃ i', 'Content', 'Content & Design', 'Content/Design', 'dangbai', 'chiphi content', 'posting/content', 'posting & content']));
          const zaloAds = parseVal(getVal(['ZaloAds', 'Zalo Ads', 'Zalo', 'Chi phÃ­ Zalo', 'QC Zalo', 'Ads Zalo', 'chiphi zalo', 'zalo ads', 'ads zalo']));
          const googleAds = parseVal(getVal(['GoogleAds', 'Google Ads', 'Google', 'Chi phÃ­ Google', 'QC Google', 'SEM', 'Ads Google', 'chiphi google', 'google ads', 'ads google', 'sem/google']));
          const otherCost = parseVal(getVal(['OtherCost', 'Chi phÃ­ khÃ¡c', 'KhÃ¡c', 'PhÃ¡t sinh', 'KhÃ¡c (PhÃ¡t sinh)', 'chiphikhac', 'phatsinh', 'chi phi khac']));
          const note = String(getVal(['Note', 'Ghi chÃº', 'Ghi chÃº thÃªm', 'ghichu']) || '');

          if (!pRef || !tRef || !month) {
            const hasData = Object.values(row).some(v => v !== '');
            if (hasData) {
              const missingFields = [];
              if (!pRef) missingFields.push('Dá»± Ã¡n');
              if (!tRef) missingFields.push('Team');
              if (!month) missingFields.push('ThÃ¡ng');
              errorDetailsList.push(
                `DÃ²ng ${rowIndex}: THIáº¾U THÃ”NG TIN Báº®T BUá»˜C (${missingFields.join(', ')}).\n` +
                `â€¢ NguyÃªn nhÃ¢n: Má»™t trong cÃ¡c cá»™t báº¯t buá»™c bá»‹ trá»‘ng.\n` +
                `â€¢ CÃ¡ch kháº¯c phá»¥c: HÃ£y Ä‘iá»n Ä‘áº§y Ä‘á»§ Dá»± Ã¡n, Team vÃ  ThÃ¡ng thá»±c chi.`
              );
              errorsCount++;
            }
            continue;
          }

          const project = findProjectInternal(pRef);
          const team = findTeamInternal(tRef);

          if (!project) {
            errorDetailsList.push(
              `DÃ²ng ${rowIndex}: KHÃ”NG TÃŒM THáº¤Y Dá»° ÃN khá»›p vá»›i "${pRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: Há»‡ thá»‘ng khÃ´ng nháº­n diá»‡n Ä‘Æ°á»£c dá»± Ã¡n nÃ y.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Kiá»ƒm tra láº¡i tÃªn hoáº·c ID Dá»± Ã¡n trong danh sÃ¡ch Quáº£n lÃ½ Dá»± Ã¡n.`
            );
            errorsCount++;
            continue;
          }
          if (!team) {
            errorDetailsList.push(
              `DÃ²ng ${rowIndex}: KHÃ”NG TÃŒM THáº¤Y TEAM khá»›p vá»›i "${tRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: Há»‡ thá»‘ng khÃ´ng nháº­n diá»‡n Ä‘Æ°á»£c team nÃ y.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Kiá»ƒm tra láº¡i tÃªn hoáº·c ID Team trong danh sÃ¡ch Quáº£n lÃ½ Team.`
            );
            errorsCount++;
            continue;
          }

          const pId = project.id;
          const teamId = team.id;

          const matchingBudget = budgets.find(b => 
            b.projectId === pId && 
            b.teamId === teamId && 
            b.month === month
          );

          if (!matchingBudget) {
            errorDetailsList.push(
              `DÃ²ng ${rowIndex}: KHÃ”NG CÃ“ NGÃ‚N SÃCH ÄÃƒ DUYá»†T cho [${project.name}] - [${team.name}] thÃ¡ng ${month}.\n` +
              `â€¢ NguyÃªn nhÃ¢n: Dá»¯ liá»‡u nháº­p vÃ o chÆ°a khá»›p vá»›i danh sÃ¡ch dá»± Ã¡n/team hiá»‡n cÃ³.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Vui lÃ²ng nháº­p NgÃ¢n sÃ¡ch cho dá»± Ã¡n nÃ y trÆ°á»›c khi nháº­p chi phÃ­ thá»±c táº¿.`
            );
            errorsCount++;
            continue;
          }

          const totalAmount = fbAds + posting + zaloAds + googleAds + otherCost;
          const [yearStr] = month.split('-');
          const year = Number(yearStr);

          const docRef = doc(collection(db, 'costs'));
          batch.set(docRef, {
            projectId: pId,
            projectName: project.name,
            budgetId: matchingBudget.id,
            implementerName: matchingBudget.implementerName || 'N/A',
            teamName: team.name,
            teamId: teamId,
            weekNumber: Number(periodValue) || 1,
            year,
            month,
            amount: totalAmount,
            channels: { fbAds, posting, zaloAds, googleAds, otherCost },
            note,
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            userEmail: user?.email?.toLowerCase()
          });
          count++;
        }

        if (count > 0) {
          await batch.commit();
          await logAction('IMPORT_COSTS', 'costs', 'bulk', { count, errors: errorsCount });
          toast.success(`ÄÃ£ nháº­p thÃ nh cÃ´ng ${count} báº£n ghi. ${errorsCount > 0 ? `Bá» qua ${errorsCount} dÃ²ng lá»—i.` : ''}`);
          if (errorsCount > 0) {
            setImportErrors(errorDetailsList);
            setIsImportErrorsDialogOpen(true);
          }
        } else {
           if (errorDetailsList.length > 0) {
            setImportErrors(errorDetailsList);
            setIsImportErrorsDialogOpen(true);
          } else {
            toast.error(`KhÃ´ng thá»ƒ nháº­p dá»¯ liá»‡u. Kiá»ƒm tra Ä‘á»‹nh dáº¡ng file.`);
          }
        }
        
        setIsImportCostsDialogOpen(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'costs');
      } finally {
        setIsImportingCosts(false);
        e.target.value = '';
      }
    };

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet);
          await processCostData(json);
        } catch (error) {
          console.error(error);
          toast.error('Lá»—i khi Ä‘á»c file Excel');
          setIsImportingCosts(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processCostData(results.data);
        },
        error: (error) => {
          toast.error('Lá»—i khi Ä‘á»c file CSV');
          setIsImportingCosts(false);
        }
      });
    }
  };

  const handleImportCostsFromUrl = async () => {
    if (!costSheetUrl) {
      toast.error("Vui lÃ²ng nháº­p link Google Sheet");
      return;
    }

    // Extract Spreadsheet ID
    const match = costSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      toast.error("Link Google Sheet khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng");
      return;
    }

    const spreadsheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    setIsImportingCostsUrl(true);
    setIsImportingCosts(true);
    setImportErrors([]);

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("KhÃ´ng thá»ƒ táº£i file tá»« Google Sheet. HÃ£y Ä‘áº£m báº£o file Ä‘Ã£ Ä‘Æ°á»£c chia sáº» cÃ´ng khai.");
      }
      
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      
      let finalRows: any[] = [];
      let foundHeaders = false;

      // Scan all sheets to find the one with cost/efficiency headers
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const dataArr: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let headerIndex = -1;
        for (let i = 0; i < Math.min(dataArr.length, 20); i++) {
          const row = dataArr[i];
          if (row && Array.isArray(row) && row.some(cell => {
            const str = String(cell || '').toLowerCase().replace(/\s+/g, '');
            return str.includes('chiphi') || str.includes('fbads') || str.includes('zalo') || str.includes('idduan') || str.includes('cÄƒnbaÌn') || str.includes('idteam') || str.includes('dá»±Ã¡n');
          })) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex !== -1) {
          finalRows = XLSX.utils.sheet_to_json(worksheet, { range: headerIndex });
          if (finalRows.length > 0) {
            foundHeaders = true;
            break;
          }
        }
      }

      if (!foundHeaders || finalRows.length === 0) {
        // Fallback to first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        finalRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      }

      if (finalRows.length === 0) {
        toast.error("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u há»£p lá»‡ trong Google Sheet.");
        return;
      }

      const batch = writeBatch(db);
      let costCount = 0;
      let efficiencyCount = 0;
      let skippedCount = 0;
      const errorDetails: string[] = [];


      for (let i = 0; i < finalRows.length; i++) {
        const row = finalRows[i];
        const rowIndex = i + 2; // Assuming header is at some index, this is relative
        
        // Normalize keys
        const normalizedRow: any = {};
        Object.keys(row).forEach(k => {
          const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '');
          normalizedRow[cleanKey] = row[k];
        });

        const getVal = (possibleKeys: string[]) => {
          for (const pk of possibleKeys) {
            const cleanPK = pk.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedRow[cleanPK] !== undefined && normalizedRow[cleanPK] !== '') return normalizedRow[cleanPK];
          }
          return undefined;
        };

        const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'tÃªn dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
        const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'idteam', 'id team', 'mÃ£ team', 'tÃªn team']) || '').trim();
        const monthRaw = getVal(['ThÃ¡ng', 'Ká»³ thÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'thaÌng', 'ká»³']);
        const month = normalizeMonth(monthRaw);
        const period = String(getVal(['Tuáº§n', 'Ká»³ tuáº§n', 'Week', 'Period', 'tuan', 'tuÃ¢Ì€n', 'ká»³']) || '').trim();
        
        // Cost values with even more expanded aliases
        const fbAds = parseVal(getVal(['FBAds', 'FB Ads', 'Facebook Ads', 'Facebook', 'Chi phÃ­ FB', 'QC Facebook', 'Ads FB', 'chiphi fb', 'facebook ads', 'ads facebook']));
        const posting = parseVal(getVal(['Posting', 'ÄÄƒng bÃ i', 'Content', 'Content & Design', 'Content/Design', 'dangbai', 'chiphi content', 'posting/content', 'chi phÃ­ content']));
        const zaloAds = parseVal(getVal(['ZaloAds', 'Zalo Ads', 'Zalo', 'Chi phÃ­ Zalo', 'QC Zalo', 'Ads Zalo', 'chiphi zalo', 'zalo ads', 'ads zalo']));
        const googleAds = parseVal(getVal(['GoogleAds', 'Google Ads', 'Google', 'Chi phÃ­ Google', 'QC Google', 'SEM', 'Ads Google', 'chiphi google', 'google ads', 'ads google', 'sem/google']));
        const otherCost = parseVal(getVal(['OtherCost', 'Chi phÃ­ khÃ¡c', 'KhÃ¡c', 'PhÃ¡t sinh', 'KhÃ¡c (PhÃ¡t sinh)', 'chiphikhac', 'phatsinh', 'chi phÃ­ phÃ¡t sinh']));
        const note = String(getVal(['Note', 'Ghi chÃº', 'Ghi chÃº thÃªm', 'ghichu', 'ghi chÃº']) || '');

        // Efficiency values
        const salesCount = parseVal(getVal(['CÄƒn bÃ¡n', 'Sá»‘ cÄƒn bÃ¡n', 'Sales Count', 'Sales', 'Sá»‘ cÄƒn', 'CÄƒn', 'canban', 'socanban', 'units', 'sá»‘ lÆ°á»£ng']));
        const revenue = parseVal(getVal(['Doanh sá»‘', 'Revenue', 'Doanh thu', 'Thá»±c Ä‘áº¡t', 'Tá»•ng doanh thu', 'Doanh thu thá»±c', 'doanhso', 'doanhthu', 'thá»±c thu']));

        if (!pRef || !tRef || !month) {
          // Skip truly empty rows without error
          const hasAnyData = Object.values(normalizedRow).some(v => v !== '');
          if (hasAnyData) {
            errorDetails.push(`DÃ²ng ${rowIndex}: Thiáº¿u thÃ´ng tin báº¯t buá»™c (Dá»± Ã¡n: "${pRef}", Team: "${tRef}", Ká»³: "${month}")`);
            skippedCount++;
          }
          continue;
        }

        const findProject = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => 
            p.id === ref || 
            (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const findTeam = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => 
            t.id === ref || 
            (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const project = findProject(pRef);
        const team = findTeam(tRef);

        if (!project) {
          errorDetails.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y Dá»± Ã¡n khá»›p vá»›i "${pRef}"`);
          skippedCount++;
          continue;
        }
        if (!team) {
          errorDetails.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y Team khá»›p vá»›i "${tRef}"`);
          skippedCount++;
          continue;
        }

        const projectId = project.id;
        const teamId = team.id;
        const [yearStr] = month.split('-');
        const year = Number(yearStr);

        // 1. Process Costs (if cost values exist and match a budget)
        const totalAmount = fbAds + posting + zaloAds + googleAds + otherCost;
        if (totalAmount > 0) {
          const matchingBudget = budgets.find(b => 
            b.projectId === projectId && 
            b.teamId === teamId && 
            b.month === month
          );

          if (matchingBudget) {
            const weekNum = Number(period) || 1;
            const docRef = doc(collection(db, 'costs'));
            batch.set(docRef, {
              projectId,
              projectName: project.name,
              budgetId: matchingBudget.id,
              implementerName: matchingBudget.implementerName || 'N/A',
              teamName: team.name,
              teamId: teamId,
              weekNumber: weekNum,
              year,
              month,
              amount: totalAmount,
              channels: { fbAds, posting, zaloAds, googleAds, otherCost },
              note,
              createdAt: serverTimestamp(),
              createdBy: user?.uid,
              userEmail: user?.email?.toLowerCase()
            });
            costCount++;
          }
        }

        // 2. Process Efficiency (if efficiency values exist)
        if (salesCount > 0 || revenue > 0) {
          const docRef = doc(collection(db, 'efficiencyReports'));
          batch.set(docRef, {
            projectId,
            projectName: project.name,
            teamName: team.name,
            teamId: teamId,
            month,
            year,
            salesCount,
            revenue,
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            createdByEmail: user?.email?.toLowerCase()
          });
          efficiencyCount++;
        }
      }

      if (costCount > 0 || efficiencyCount > 0) {
        await batch.commit();
        await logAction('IMPORT_URL', 'multiple', 'bulk', { costs: costCount, efficiency: efficiencyCount, skipped: skippedCount });
        toast.success(`ÄÃ£ xá»­ lÃ½ xong dá»¯ liá»‡u Google Sheet.\n- ThÃ nh cÃ´ng: ${costCount} chi phÃ­, ${efficiencyCount} hiá»‡u quáº£.\n- Bá» qua: ${skippedCount} dÃ²ng.`);
      } else {
        toast.warning(`KhÃ´ng phÃ¡t hiá»‡n dá»¯ liá»‡u chi phÃ­/hiá»‡u quáº£ má»›i nÃ o Ä‘á»ƒ nháº­p.`);
      }

      if (errorDetails.length > 0) {
        setImportErrors(errorDetails);
        setIsImportErrorsDialogOpen(true);
      }

      setIsImportCostsDialogOpen(false);
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, 'import');
    } finally {
       setIsImportingCostsUrl(false);
       setIsImportingCosts(false);
    }
  };


  const handleImportAcceptancesCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingAcceptances(true);
    setImportErrors([]);

    const findProjectInternal = (ref: string) => {
      if (!ref) return null;
      const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!cleanRef) return null;
      return projects.find(p => 
        p.id === ref || 
        (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
        (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
      );
    };

    const findTeamInternal = (ref: string) => {
      if (!ref) return null;
      const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!cleanRef) return null;
      return teams.find(t => 
        t.id === ref || 
        (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
        (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
      );
    };

    const processAcceptanceData = async (data: any[]) => {
      try {
        const batch = writeBatch(db);
        let count = 0;
        let errorsCount = 0;
        const errorDetailsList: string[] = [];

        for (let i = 0; i < data.length; i++) {
          const rawRow = data[i];
          const rowIndex = i + 2;
          const row: any = {};
          Object.keys(rawRow).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
            row[cleanKey] = rawRow[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
              if (row[cleanPK] !== undefined && row[cleanPK] !== '') return row[cleanPK];
            }
            return undefined;
          };

          const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'idteam', 'id team', 'mÃ£ team']) || '').trim();
          const monthRaw = getVal(['ThÃ¡ng', 'Ká»³ thÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'ká»³']);
          const month = normalizeMonth(monthRaw);
          
          const fbAds = parseVal(getVal(['Facebook Ads', 'FB Ads', 'FBAds', 'facebookads', 'facebook ads']));
          const tiktokAds = parseVal(getVal(['Tiktok Ads', 'TikTok', 'tiktokads', 'tiktok ads']));
          const zaloAds = parseVal(getVal(['Zalo Ads', 'Zalo', 'zaloads', 'zalo ads']));
          const googleAds = parseVal(getVal(['Google Ads', 'Google', 'googleads', 'google ads']));
          const posting = parseVal(getVal(['ÄÄƒng tin', 'Posting', 'dangtin', 'posting']));
          const visa = parseVal(getVal(['VISA', 'visa', 'visa cost', 'chi phÃ­ visa']));
          const digital = parseVal(getVal(['Digital', 'digital', 'digital cost', 'chi phÃ­ digital']));
          const other = parseVal(getVal(['KhÃ¡c', 'Other', 'khac', 'other cost']));

          if (!pRef || !tRef || !month) {
            const hasData = Object.values(row).some(v => v !== '');
            if (hasData) {
              errorDetailsList.push(`DÃ²ng ${rowIndex}: Thiáº¿u thÃ´ng tin báº¯t buá»™c (Dá»± Ã¡n, Team hoáº·c ThÃ¡ng).`);
              errorsCount++;
            }
            continue;
          }

          const project = findProjectInternal(pRef);
          const team = findTeamInternal(tRef);

          if (!project) {
            errorDetailsList.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n khá»›p vá»›i "${pRef}".`);
            errorsCount++;
            continue;
          }
          if (!team) {
            errorDetailsList.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y team khá»›p vá»›i "${tRef}".`);
            errorsCount++;
            continue;
          }

          const totalCost = fbAds + tiktokAds + zaloAds + googleAds + posting + other;

          const docRef = doc(collection(db, 'acceptances'));
          const finalPayload: any = {
            projectId: project.id,
            projectName: project.name,
            projectCode: project.projectCode || '',
            teamId: team.id,
            teamName: team.name,
            teamCode: team.teamCode || '',
            month,
            facebookCost: fbAds,
            tiktokCost: tiktokAds,
            zaloCost: zaloAds,
            googleCost: googleAds,
            postingCost: posting,
            visaCost: visa,
            digitalCost: digital,
            otherCost: other,
            totalCost: totalCost,
            beforeAcceptanceCost: totalCost,
            afterAcceptanceCost: totalCost,
            status: 'ÄÃ£ nghiá»‡m thu',
            createdAt: serverTimestamp(),
            createdBy: user?.email || '',
            createdByUid: user?.uid || '',
            updatedAt: serverTimestamp(),
            updatedBy: user?.email || '',
            updatedByUid: user?.uid || '',
            breakdown: {},
            editHistory: [{
              action: 'CREATE_IMPORT',
              editorName: user?.displayName || user?.email || 'Unknown',
              editorEmail: user?.email || '',
              timestamp: new Date().toISOString(),
              changes: {
                "ThÃ¡ng": { old: null, new: month },
                "Team": { old: null, new: team.name },
                "Dá»± Ã¡n": { old: null, new: project.name },
                "Tá»•ng chi phÃ­": { old: null, new: totalCost }
              }
            }]
          };

          batch.set(docRef, finalPayload);

          const finalDocRef = doc(collection(db, 'finalAcceptances'));
          batch.set(finalDocRef, {
            ...finalPayload,
            originalAcceptanceId: docRef.id,
            totalActualCost: totalCost,
            finalizedAt: serverTimestamp(),
            finalizedBy: user?.email || '',
            finalizedByUid: user?.uid || '',
          });
          count++;
        }

        if (count > 0) {
          await batch.commit();
          await logAction('IMPORT_ACCEPTANCES', 'acceptances', 'bulk', { count, errors: errorsCount });
          toast.success(`ÄÃ£ nháº­p thÃ nh cÃ´ng ${count} báº£n ghi nghiá»‡m thu.`);
        }

        if (errorsCount > 0) {
          setImportErrors(errorDetailsList);
          setIsImportErrorsDialogOpen(true);
        }
        
        setIsImportAcceptancesDialogOpen(false);
      } catch (error: any) {
        handleFirestoreError(error, OperationType.WRITE, 'acceptances');
      } finally {
        setIsImportingAcceptances(false);
        if (e.target) e.target.value = '';
      }
    };

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const buffer = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet);
          await processAcceptanceData(json);
        } catch (error) {
          console.error(error);
          toast.error('Lá»—i khi Ä‘á»c file Excel');
          setIsImportingAcceptances(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processAcceptanceData(results.data);
        },
        error: (error) => {
          toast.error('Lá»—i khi Ä‘á»c file CSV');
          setIsImportingAcceptances(false);
        }
      });
    }
  };

  const getCurrentPeriod = () => {
    const now = new Date();
    const mMonth = getMarketingMonth(now);
    if (!mMonth) return 1;
    const [year, month] = mMonth.split('-').map(Number);
    // Budget month M starts on 21st of month M-1
    const startDate = new Date(year, month - 2, 21);
    const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays < 7) return 1;
    if (diffDays < 14) return 2;
    if (diffDays < 21) return 3;
    return 4; // Ká»³ cuá»‘i lÃ  nhá»¯ng ngÃ y cÃ²n láº¡i
  };

  const getPeriodRange = (monthStr: string, period: number | string) => {
    if (!monthStr || !period || period === 'all') return '';
    try {
      const [year, month] = monthStr.split('-').map(Number);
      // Budget month M starts on 21st of month M-1
      const startDate = new Date(year, month - 2, 21);
      const pNum = Number(period);
      
      const periodStart = new Date(startDate);
      let periodEnd = new Date(startDate);

      if (pNum < 4) {
        periodStart.setDate(startDate.getDate() + (pNum - 1) * 7);
        periodEnd.setDate(periodStart.getDate() + 6);
      } else {
        // Ká»³ 4: Until the end (20th of month M)
        periodStart.setDate(startDate.getDate() + 21);
        periodEnd = new Date(year, month - 1, 20);
      }
      
      return `${format(periodStart, 'd/M')} - ${format(periodEnd, 'd/M')}`;
    } catch (e) {
      return '';
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse text-slate-400">Äang táº£i...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md border-none shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto flex flex-col items-center gap-2">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-slate-100 overflow-hidden">
                <img 
                  src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 80' fill='none'><path d='M50 15 L88 53 H74 L50 28 L26 53 H12 Z' fill='%23E45A1D'/><path d='M50 28 L64 42 L50 56 L36 42 Z' fill='%23E45A1D'/><path d='M12 53 L31 21 H43 L24 53 Z' fill='%23E45A1D'/><path d='M88 53 L69 21 H57 L76 53 Z' fill='%23E45A1D'/></svg>" 
                  alt="MAYHOMES Logo" 
                  className="w-full h-full object-contain p-2"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-4xl font-black tracking-tighter text-slate-900 flex justify-center items-center">
                  <span className="text-[#1A4BAC]">MAY</span>
                  <span className="text-[#1A4BAC]">HOMES</span>
                </h2>
                <p className="text-[10px] font-bold text-blue-800 tracking-[0.2em] uppercase">KhÆ¡i nguá»“n cuá»™c sá»‘ng tinh hoa</p>
              </div>
            </div>
            <div className="pt-4 space-y-3">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-800">Marketing Cost Control</CardTitle>
              <div className="space-y-4">
                <CardDescription className="text-slate-500">Há»‡ thá»‘ng quáº£n lÃ½ chi phÃ­ marketing chuyÃªn nghiá»‡p</CardDescription>
                <DeveloperFooter className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <Button onClick={login} className="w-full h-12 text-lg font-bold bg-[#1A4BAC] hover:bg-[#113273] text-white shadow-md shadow-blue-200/50 transition-all rounded-xl cursor-pointer" size="lg">
              <LogIn className="mr-2 h-5 w-5" /> ÄÄƒng nháº­p báº±ng Google
            </Button>

            {/* Zalo / WebView Auth Helper Panel */}
            <div className={`mt-4 border rounded-2xl overflow-hidden transition-all duration-300 ${isWebView ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100 bg-slate-50/50'}`}>
              <div 
                className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50 select-none transition-colors"
                onClick={() => {
                  setShowAuthHelper(!showAuthHelper);
                }}
              >
                <div className="flex items-center gap-2">
                  <Info className={`w-4 h-4 ${isWebView ? 'text-amber-600' : 'text-slate-500'}`} />
                  <span className={`text-xs font-bold ${isWebView ? 'text-amber-900 font-extrabold' : 'text-slate-705 font-bold'}`}>
                    {isWebView ? 'âš ï¸ Lá»—i ÄÄƒng nháº­p trÃªn Zalo / Messenger?' : 'Trá»£ giÃºp khi gáº·p lá»—i ÄÄƒng nháº­p'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isWebView ? 'text-amber-500' : 'text-slate-400'} ${showAuthHelper ? 'rotate-180' : ''}`} />
              </div>

              {showAuthHelper && (
                <div className="p-4 pt-0 border-t border-dashed border-slate-200/80 space-y-3.5 text-xs animate-in fade-in duration-200">
                  <div className="space-y-2 mt-3 text-slate-700 leading-relaxed">
                    <p>
                      Máº·c Ä‘á»‹nh, cÃ¡c á»©ng dá»¥ng chat nhÆ° <strong>Zalo</strong>, <strong>Facebook</strong> hoáº·c <strong>Messenger</strong> sáº½ má»Ÿ liÃªn káº¿t báº±ng trÃ¬nh duyá»‡t tÃ­ch há»£p riÃªng (WebView).
                    </p>
                    <p className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 font-medium leading-relaxed">
                      ðŸ”’ Äá»ƒ báº£o máº­t, Google <strong>ngÄƒn cáº£n Ä‘Äƒng nháº­p tÃ i khoáº£n (Lá»—i 403: disallowed_useragent)</strong> trong trÃ¬nh duyá»‡t tÃ­ch há»£p nÃ y Ä‘á»ƒ trÃ¡nh nguy cÆ¡ giáº£ máº¡o.
                    </p>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isWebView ? 'bg-amber-100/50 border-amber-200 text-amber-900' : 'bg-blue-50/45 border-blue-100 text-slate-800'} space-y-2`}>
                    <p className="font-bold text-slate-950">ðŸ’¡ CÃ¡ch kháº¯c phá»¥c nhanh trong 5 giÃ¢y:</p>
                    <ol className="list-decimal pl-4 space-y-1.5">
                      <li>NhÃ¬n lÃªn gÃ³c trÃªn bÃªn pháº£i mÃ n hÃ¬nh Zalo, nháº¥n chá»n nÃºt <strong>Menu Ba cháº¥m (...)</strong> hoáº·c biá»ƒu tÆ°á»£ng TÃ¹y chá»n trÃ¬nh duyá»‡t.</li>
                      <li>Chá»n <strong>"Má»Ÿ báº±ng trÃ¬nh duyá»‡t"</strong> (hoáº·c <strong>"Má»Ÿ báº±ng Safari / Chrome / TrÃ¬nh duyá»‡t máº·c Ä‘á»‹nh"</strong>).</li>
                      <li>Há»‡ thá»‘ng sáº½ chuyá»ƒn sang trÃ¬nh duyá»‡t chÃ­nh thá»©c cá»§a Ä‘iá»‡n thoáº¡i, giÃºp báº¡n Ä‘Äƒng nháº­p Google thÃ nh cÃ´ng vÃ  an toÃ n.</li>
                    </ol>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('ÄÃ£ sao chÃ©p link á»©ng dá»¥ng!');
                      }}
                      className="flex-1 text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-100 h-9 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" /> Sao chÃ©p Link chuáº©n
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        window.open(window.location.href, '_blank');
                      }}
                      className="text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-100 h-9 rounded-xl flex items-center justify-center gap-1.5 px-3.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Thá»­ má»Ÿ ngoÃ i
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/50 transition-all duration-300",
        isScrolled ? "py-1.5 shadow-sm bg-white/98" : "py-3 shadow-md"
      )}>
        <div className={cn(
          "max-w-7xl mx-auto px-4 flex items-center justify-between transition-all duration-300 gap-2 sm:gap-4",
          isScrolled ? "h-11 sm:h-12" : "h-16 sm:h-18"
        )}>
          {/* Left Side: Collapse Menu Button & Logo */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className={cn(
                "rounded-xl transition-all shrink-0 border shadow-sm touch-manipulation cursor-pointer flex items-center justify-center active:scale-95",
                isMobileMenuOpen
                  ? "bg-indigo-600 text-white hover:bg-indigo-750 border-indigo-600 shadow-md shadow-indigo-100" 
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200",
                isScrolled ? "h-8.5 w-8.5" : "h-10 w-10"
              )}
              title="Menu"
            >
              {isMobileMenuOpen ? (
                <X className={cn("transition-all duration-300", isScrolled ? "h-4 w-4" : "h-5 w-5")} />
              ) : (
                <Menu className={cn("transition-all duration-300", isScrolled ? "h-4 w-4" : "h-5 w-5")} />
              )}
            </Button>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "bg-white border border-slate-100/80 rounded-xl flex items-center justify-center overflow-hidden shrink-0 transition-all duration-300",
                isScrolled ? "w-7 h-7 sm:w-8 sm:h-8" : "w-9 h-9 sm:w-11 sm:h-11 shadow-md shadow-slate-100 hover:scale-105"
              )}>
                <img 
                  src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 80' fill='none'><path d='M50 15 L88 53 H74 L50 28 L26 53 H12 Z' fill='%23E45A1D'/><path d='M50 28 L64 42 L50 56 L36 42 Z' fill='%23E45A1D'/><path d='M12 53 L31 21 H43 L24 53 Z' fill='%23E45A1D'/><path d='M88 53 L69 21 H57 L76 53 Z' fill='%23E45A1D'/></svg>" 
                  alt="MAYHOMES" 
                  className="w-full h-full object-contain p-1.5"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 sm:gap-2">
                  <h1 className={cn(
                    "font-black tracking-tighter leading-none transition-all duration-300",
                    isScrolled ? "text-base sm:text-lg" : "text-lg sm:text-xl"
                  )}>
                    <span className="text-[#1A4BAC]">MAY</span>
                    <span className="text-[#1A4BAC]">HOMES</span>
                  </h1>
                  
                  {isScrolled && (
                    <div className="flex items-center gap-1 sm:gap-1.5 ml-1 sm:ml-2 text-slate-300 animate-in fade-in slide-in-from-left-2 duration-300 shrink-0">
                      <span className="text-xs sm:text-sm font-light">/</span>
                      <span className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/60 text-indigo-700 text-[9px] sm:text-xs font-black px-1.5 sm:px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                        {getActiveTabLabel(activeTab)}
                      </span>
                    </div>
                  )}
                </div>
                
                {!isScrolled && (
                  <div className="flex flex-wrap gap-1 mt-1 animate-in fade-in duration-300">
                    {isSuperAdmin && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-purple-200 text-purple-700 bg-purple-50/50">SUPER ADMIN</Badge>}
                    {isAdmin && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-indigo-200 text-indigo-700 bg-indigo-50/50">ADMIN</Badge>}
                    {isMod && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-slate-200 text-slate-700 bg-slate-50/50">MODERATOR</Badge>}
                    {isAccountant && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-amber-200 text-amber-700 bg-amber-50/50">Káº¾ TOÃN</Badge>}
                    {isGDDA && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-emerald-200 text-emerald-700 bg-emerald-50/50">GDDA</Badge>}
                    {isUser && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-orange-200 text-orange-700 bg-orange-50/50">USER</Badge>}
                    {isGDKhoi && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-violet-200 text-violet-750 bg-violet-50/50">GÄ KHá»I</Badge>}
                    {isGDKD && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-teal-200 text-teal-750 bg-teal-50/50">GÄKD</Badge>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Developer & Zalo Info - Inline and horizontal with Logo */}
          <div className="hidden md:flex flex-col lg:flex-row items-center justify-center gap-1.5 lg:gap-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-1.5 px-3 rounded-2xl border border-blue-100/30 text-xs shrink min-w-0 max-w-lg">
            <div className="flex items-center gap-1 font-black uppercase text-[9px] lg:text-[10px] tracking-wider text-slate-500 shrink min-w-0 select-none">
              <span className="opacity-65">PhÃ¡t triá»ƒn bá»Ÿi:</span>
              <span className="text-slate-800 truncate">ThiÃªn VÅ© - Digital Marketing Mayhomes</span>
            </div>
            <div className="hidden lg:block w-px h-3.5 bg-indigo-100 shrink-0" />
            <a 
              href="https://zalo.me/0854642555" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-0.5 bg-white hover:bg-slate-50 border border-blue-200 hover:border-blue-400 text-[10px] lg:text-xs font-black text-blue-700 rounded-lg shadow-sm transition-all duration-300 whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current text-blue-600 animate-bounce" />
              <span>Zalo: 0854.642.555</span>
            </a>
          </div>

          {/* Right Side: Notifications, User profile, logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell Button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsTeamNotificationDialogOpen(true);
                }}
                className={cn(
                  "relative rounded-xl transition-all duration-300 touch-manipulation flex items-center justify-center cursor-pointer",
                  unreadTeamNotifCount > 0
                    ? "text-blue-600 bg-blue-50/80 hover:bg-blue-100 ring-1 ring-blue-200"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
                  isScrolled ? "h-8.5 w-8.5" : "h-10 w-10"
                )}
                title="ThÃ´ng bÃ¡o thay Ä‘á»•i ngÃ¢n sÃ¡ch"
              >
                {unreadTeamNotifCount > 0 ? (
                  <BellRing className={cn("transition-all duration-300 animate-bounce text-blue-600", isScrolled ? "h-4 w-4" : "h-5 w-5")} />
                ) : (
                  <Bell className={cn("transition-all duration-300", isScrolled ? "h-4 w-4" : "h-5 w-5")} />
                )}
                {unreadTeamNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white">
                    {unreadTeamNotifCount > 99 ? '99+' : unreadTeamNotifCount}
                  </span>
                )}
              </Button>
            </div>

            <div className={cn(
              "transition-all duration-300 flex flex-col items-end",
              isScrolled ? "hidden sm:flex" : "hidden lg:flex"
    xœì}moÜÈ•î÷ýåÞì¨•¨[­W{´’½ø¶4ÎX3™¬1Øa³©n®Ùd‡d[R}È.÷‹ÁÞà"X,vœÙ Hî’l²X\Á~ïüýƒûî9UE²HV‘EvË–3&’±º›¬*V:u^žs!ìš=½ùg$u­ˆéA°g­Óm6<7lu=§GBë(lŽZ­w;âXFÏvû­ÐîÂÆ±ƒÇ¦ï9ŽÕ#·HƒÞ|4Èÿ;6 »“q`ùížŒã;9]ŸeqrMhëwÒƒb­=YX}Lèà†VÏÅá­t:Þ•54l‡vršêe}¾g?»ùgéï¶Æaè¹ä™áÛ†n4ú/$°ýÚ¦ç6ˆçn;¶ùtãÄñúÞ8<ÍN—0Še˜¤÷Ìò×è—¾X­Õø»nŸ}³Ò!¾7v{V¯uäÐ7ÜÀmÏmŽCzcß –à²S<hÝ ‡­tŠ­…|Xè4$kúÐë¿7s#­ÔÕ2´¾Ì»Z¿W #233§lÅoù<K?®Ï€†,?^†“ùo“\ûÀ†^?´üÐ6‡ìøÆ¡å“=ã™Ý§#$ïÁüùoÏGkzb»^×v¬]Ë¿7²\$›fÒ+t*’Ð}=Øn`…­ù!®Ác5ÄãX¶óiÏ÷FBOqs©7W¶«ï˜ùUøÌ[lu±{B\pod˜vxœZ	b¸öŸ·]r sÿ6Ò]ÇÙœ%7	t{?3ÍÃ	¬Yñæ³oÊ'ù‘áZŽìm…ô-x!û™E§(á`Ô34ŽZ‡°ßé—-ÓsðÍvh‘»#=ï°µD.¼SàØô¥Z¾7l9ÖA˜~}\›FšÊ„áÞ£ä“¯d¹q °CV	Œg´LËá±¿¡}pÜêZá¡$3:Êîz>4ÙêF°Õ[èK¹Ò™ÏJÑiª¿¾1j-æžË?	{šàÞŽg%?¢ˆo8}’ï-z;þyÎ0°{=xÙ`àÛîÓVþ=èˆìaŸH¾'$ðÍFÏ5XÂ¾5<ëçhèüå8<¸1·Ÿ|rƒ™AŽÖæçÛ‡KmÏïÏ/v`À3ä™mnyG3Ò!ø"7:3äÀvœ×s­™›ë##ÞÆÌ.ìÌ…òðÆ²²Dî]_&á›Åäáâ*ýfa‘üUôì_,.Ý^^Ù\Ø™™O·€÷¯.“åEúôÊ*y¸´ŠŸJž„¶¡‹‡KdqÜ[†?—ñ›’ÇØX®¾K[¹N^_U?†3r³!ŸlÃ3hwóû÷ÞÛ½ýXqOŠnèFãûÍëþe†°ÝÐ€6j-4¤øÖåû–ÿÈ6r¼Ñp½Vô•ìy	ý¦Y|üu02ÜÔŽ ’„0+J 4ŸÆ²á²F–oÕ¸¹k¼¡GžL4žÛ‚²D‡zn|ÙS>wƒxìç~¬ÅvÙ%L	?ÂÅœca!Ùö¡76­!pÑÑØ¡¬2»P’Åø(M)+@&+üjÊŽp¹°„l˜‰F×±ÈÞš ±»ÑbÈ­…„'·Œqè‘Ñ1ˆÀ…—¬®iÁ×9ö„Ý>ò=ØI¹ïx¹¾ò½Ñ¡í%ä¨¶Û³ûòðå„â¡”f²ü6˜nà[dØÕbÜr–¿$g±
¦‰îád¼(7RÊ`'B)»Ïî5q7ó~˜â¬Œ~«m3lvfÉ~Df>˜Éµ’ä_uÇý¡²w‰°bEï»&|ˆõ<BpÅzÚ†²Û'Ô122ê/¯`èÏ‰œQI6£wÆWÈž+"1•9W“P—þRÆ°N$£U3±¿TÝ½oCq\;¶Š}&JöàiCDÅDÒUt´©É^áè^_l¯¤Ô*	¥ÕŸ<SEZâü 1'ÕØõäâØ†îBr“t¤ôJìfú©üx£šøÍb´»é§ð‰KË 4K[[£­Åâèj'-.2eC ÜUéQ’o<w\Õåz° r¾·e9Îû°O³ê(¨—ÕÌ˜9Í)'8¶/ÐéZ´¤.ÜbZ‚Ñ!RÄ%Ú*$öç€!uÏŸ{$€jùòó‹³ŸÚÄíŸÿdåóçæ@.r(·ø‰rð)Í43‰Ö²B¿|²H¹øÐvïÏ!ÜÌÀésµ,CeçŠt‘ýC¿Q’·“
òYËÑÙú|—E©FÑ+$V—ä¨‹%ËCÐ3ƒ§YH ;›{÷ÈîÅÙ¿n“ÝÛ{H¸x–£œs'¿=4FÍ&®ƒ‚Ÿ‚0Þ‡¶½á%Xÿºpm”)óœ‘=`›&U¯7ˆAÿØ7ºdcƒ?ùÌ ’Ï?ê[áØwåt¥8ðzjoœ$íÊPëàÀŽƒÍh¼Í¤MéÑÁï¯pØHÏ¼JÏ¼^Ëù!=3ðŠWXñ{tXÈE?~2{Ñ_‰¨ªPñJ3DÉi°"9ð’è/²C¯ÉÚBz·”ŸñTF'cZðº”MÏñ|ç§RîÄ¶ è1
rr†EïVI¸h€Ä&ºF¯o‘k°Y‘rl—Ù¯…ß
€x<ÒC U¶×Ìô3ï)ßj–—”šÖŸ»=Ë
N¡‰€¼Zè(°QÝìÑ®8î¶B£ží[fè£EŽ 8ÝA9`òt‘£_“Ò'iö;c`Ã3tõ€ìh/ ¡á¹ÇþØ4M< \úùîÎÎ&ûë>.‘k8Cãà`VN ë:ªÓ 5:")cÀõÚ!œjež¶ðŠŽÏï~pñâç{dÿý‹³ÿ¡P†4Þ/ÖûÉÈ‘(ÿ|a2Z¸¡Ô¤\t0²+{òÑ3þñ¸‹§ÜLwû ffÿ²è8S]ìÒ:ÀØ¥>Æ8cMŽ¯œE)>¼¨'¯öÙÅ.#™¶7¢‰à'— ç.PiêŸFì’rv©—ü{ð²V˜¶º,µÑ†ÿõqA[¡Üí»ã‹_ºÄ9ÿ#Ù+×âgUB®pËäT9ò=4ý¾%Ëd&®6]nmMW‹Ó&Í‹³ß‘óçîÕ Ë´Å·DÉ§ájSäåÓ¦F´\J4LÓ fZoÉQ˜‹«M“w`}¶ˆ«Ó Ë½þÀ¾8û»!(c²û`_Ÿ0U¿+5¹›V"ÝA¡ð^.UœEÆ[Í§ájodÐÛ¶o‚;m.=8ÿÂgöù¯¯ˆÜ ŸCŽÞRf2W›8óaN…4·Ï¿°Ñóâ?C2 Žûâìs·?Ú<Á#ËÚA ‹ÑœØAèùÇmÄ'ÍòaÚA)ekÐ6ïr"Ò®DÜWˆ¼%MÇ«¡ïB
/¦qXþ{l¬yDæ/Î~bHpqöéÿ»òÉKYp¹d¢–AðJÉ!™ý@—§=Š¿	ÚVÏgf_ÍÖú}»=¸=C˜’7a‹<Ø–ÓÛt,R«[´MÐØöƒñ1îòÌ°ašÏÿ}J›Dõh%_†ð“ý.ó´
aÇÎw</Ô :sH˜‡
ZË¥ fPR¶S•[‘…E4é¦,À\¢7ÁS‹Äk™µ–Þèæ$4BðÛf‚W`Æ[£Œ2Jy%¥ôËhöåg/ÿvï.ùèƒ‹ÿªÐ3a—Ê/R&O!cˆùÝÎÁ1Oìà»c/4n™–ÕcÞIu˜õ?Y ®£á‡i!L3„wÎFÐ^bZ%A@‹Æ°$ºÒéÌ/Äð¥ÅèäÇÅŽé¥åÄ7ÿdÑ·†G«
|˜ÿ•<¿RSs³p?Qª‹#œþýÛ÷9)[!œÚðK!ª ‰s¹JÄ@À2UèÑœ—xÄ°­ñK§¼»ÆµôOùô>nÐ~V­¤pa×[«øÏ µ*'xHJéç£;4€’i°œs_ÂÖ\—
_¥Ï¦€ÍžŽúáxm.^üýŒ¼wpàØ®5¿c=øêüK¢YþbÚÓó¯€ÞÅ‹ç¡ô@,kúe#é!°†6åY¢#n0¨(}«†þõs”"ÿ…ô.Î~C4rqØÏ‡dxþócr×ópyïØ¾ÕÅi3/Î~i.ßeo÷ìëß^œ}Â!{þ4.üÞíÃ?ð–øÎo’!4úß\2œEÐZÐGœÜÇ¤)‡ü=×‹`4j/&Uz2!¤©N‚¸I­ÆfE\¼qóŽoY¤gØÎ1A »vÀP§‹35N„³mòò³‹³O©òøå_ñK/¥BÒ¿‚ÁsS 3>ÿƒË—2^ßÐÿf +ŒTù‹9rqö+ø&÷ð0s€âÈ§ð$ÎÜ?Á×@Ï}bÊ¢‡¤‡>Ìü/LÐXó¡‡¡nA¡0úÖl[JHr„q‰?¸¹¢¤›]XZÁ°VçÏM²ýþ;¤¹?8ÿõpŽ<†y2æÈGç¿7fá¥^üÞœ’‰Iœ¯;†éÁw|vþ¶D(%¾–ð†nß8FYí×8—çÿæ€Ã¬ý]˜"À!´ð”a1ôísJ”ýÍ¤_?Ãy4¯éNPÒ:ó¥z)æ¡ 9ÑOp Ðx>ÊöÿÈÎ¿”DÎ¾ºžfàüD¤°öüEõª‰HÅaã¥Ø¢tñ¾·½ùÜÙ|øpksûÙÜÞ¿ÿámÉTÒ·Ð˜ÌšrËúÅ‡è«H©Á
ò
(mÝˆÑá³„'YôÅ¶Â]«ô®e\R˜ãñÝ«t‘£s‹ÅÙ&òº ÓŸÇ°<õ¿g9¦7LKBëC‡ØÎDÚÀÆlÃÙ8¡b´(8qdóÆÉIZLX*µFfp:fÒš$$]#éï‡†ß·Ý}o´F¢xY˜šexñ²·<I‡©{oÀ½«Â½)Í;Yn´k¤Ó^Lß(l„L\b"‚§è§tof%.D(‘a˜Ç­Ëõ³ÁbŽ‚09ì±ÐíÅxo•G¯Éå˜ìÁ-ó¾ù=£Þœ,òþ´Ãæ™™m¼Qsö”ü¿ùü'j…7×÷„må˜ÆÍ}ŒçÚùÏ‡ù»é«%ÀÓ(/h†Ós>Â·¨¡ðƒEÉ·ÊèýhzAðÉÙqý•ç3–S{ž€¾P{aº@V°	žr8þ`©l]<ÉÑ`·køO­ÐfÇytŽ©'({DÉŽ¢ô'ä,{ç/¨ñûÑƒöKâ8@ÿÊp<~¤öìX^ÉsZ]2UÙ®ÞÀ·`zÂp¬ÍÏÿ:m­ùÎ•åÕåÅ••êÔ—¾jþ_Ã†qŸÊî ™cM½‘åÂöu½‚˜ÓÒCyA0Êáßp’ö}áŽVèµ|BƒËyìèýI ?z“ß’œž€¬ÎDÆA;üä¾]ŽoIÐ½áz'e¡ìêÓŒG¬ $ÏYÉM’„Â×w­  a²ØKˆÉ-s3ï†Â Å˜šÑŽ$¹yŽÙ7îÅ„© ûõy£ŒìsBrN
V±õ}„ôÒ¸‚ž{J<÷Cün¶E~CNejç²xò¯6Rv7×:î¶h@ëçs@±}À!³ÁN¦ VÓb•\vÀK-?à¥’!ð*’#ðRÉxQŠEžý}X2†mÃ¾E: +àÞÉ<–³Õ§YãæÓcòÃÖR¡á†çe·A;ð–‚¼’Àð×$+!“„1qfuyt47Ï¼»
½Lƒˆò7Ðh¿TÞße9©qk1c²‰,[‘q·•ð0¥$±Ë$¶šÌ}É®á£ %Cøëê?,ÄréÁ¬ÍVBY”vèèŠŒÈ'E0ä™À2=·g 3–“ÆøÏH,ÒÑÅ‚ýÑc¢¼EÐL>88µ9S}$Q¿¾U<6 óØp•¡=tÈikÏÌé'jGL>¦®j¡À‹žÇL}jhç	æoŠ h¥EfÞ~¯¿ä"Ä·öš_Ò’§ÆVÐ5åUO`à5–]
IÎ­|„/~õËƒh¯Úš'ƒý‘c½ªçøê«ƒûæV:ã}õž†©^µUÏŒ–ÞZ¾áô^ÕÚ‹ˆæ ÅÖJ}3[‹
äît9D%þ¶
ƒCàPdµ¨~"“GjÀl/C2‰1¥Wr“ÅszãÕ,G×dWyµ6G®”«½zN%‚4¯Új§Æöª<ÁñÖXs¦4·âV´æºO	-¥™"ªU‰F‡l&%qx1Ý\ŸÝ”RNŒ’­	H–@5s´# 0Õ+\B=Šñ)¼ü—S†c–dZ•FV#É2rœP«ÊMP¬VÒŽÓ”Æ•¸Ncw+ÿÈ¸Å–)^"pUÞ†òØQ &sÔšÂA*ˆNM«’Qé:ÊÓ–ÙT“Y#jh„ÍÕ‹Ì“aÖ{¤k9Þ!M¹db*ë¦Úzy¬4;®v²ÖÊ´ïúç9#˜Ù¯Ã­~‹ËY«_Ææ'¬Iß·{ÿƒà° -c½5ñ£Ó>®00Ú)Œþ
¬Jüf’â†Þ?WÒi»2«³mø=	"T4
N‡Ø`¸ÒI²Íf3Åöa‹Ž"§Hdñm·ž´–iz<mtLžGwÍa6Ù!¾¢$5%¾Ïø+bß0K[(<²c¦ohJ7ûfÖi“°ùëÒÔO:íÄ 
ØEæ3y˜w%ûgÿsï.ZU~KÎ¼'Ù£™÷Q¼ñ¾¦Ec:´¥"'vãæIÏ]§·ÍÍG,³ë™¶›çÉºdYþ’þîO‰Z#ÿJ‘«`w˜”^eé2bÝ»{þ·{äñù·ï‘,íaPƒ‡4ŸÒ”‰˜ºD†kåMÒØ]VÁ*Ÿ,´>Æµ'š9qáÔºï†N{oŒ¸¬;žŒº9óÌn}¸73Û>`Ÿ3¯ÎlíòØ )Ø‚x)¥1—·~xù¹L0ÙžüSÚŠžžß«µù˜¦°÷}ËEŠý`¤ÚŒÛ÷î“G÷ÎÿþJîÄt¡ém5”ÙSÅ¶ŠöQ K}Ç4·ÔÛE‡W²³8jæ
í« réâØöK8à¶@{…»ªDH›ÚÞ	Ç
*ožåxól¿ü´ åöÚ¶Ö“ý# ¦´‰p¢(]f;ÝÀsÆ°…Q‹ƒ‘¶°RÏêóðŸ$"®±½‡@$‡(ÿ«ðOˆÿÐQ·b{v±£îuùÖ-Ùõœí0ìLçÕÙý&ïrÔH{s>¾8ûì
­ly.ë\õ­g–;¶*p¾(¯âl¿I3¦§{»Ÿ';Ñ{4fÌM%Œ$¢°FÒ05Y¦Œ™¦KÑòYKMú=²)E±C	Ð/ç‚¬…ÏÇ¶écß« Þ¡uºe/`nSQ»´GŠq—Æþæ¢?“c@UdbËð· .ÉâÅLÂò¤ªªDÀÌ,ÒÀ{,âëˆœ lŒxò7‘ÒFÍ5(x$	©x1f}pþÜí£Ñ“Ó×È	h¥1V}9W™Ã4Ùœ…­Ž¿¿o<dù¶×k>2+«yQ³7ih‚ª–'±ÂÇùÇ9†vVâ¢Bþ)‰	®ˆ,3—4A8§…Ã¤Ój¾ÆB~©·6&ûxñ_!+@`âÖ7}ß;|Ÿn0­hój•{h¤ö‡v0Æ¨CË¤§qYvŒÁ{!má^¢3r£TÁ€‡àþž­Dü!#¡öÍ“¥E&ª({¦Pš˜Ð—§“Ê{ÀW…È†Œ"3:K§d1Í_XHIbôO<dÓòX%‰dþ“Ì©R‰«Îñq#™Éb¼›7W—mâ÷Sii*	©a	AÒV÷õo¿F^÷ƒ1ˆ*"Ï]Ÿ§½)F2XÊ£XõÂ]J#žŸd9ºŠ?§!Ä¿3IÛùR¥ÓBr½ªJÇ^¿â ¢ÐJP)QÕ Jâ`’<…›¤#©Y¸ì+â²7n&3^˜ë¥ Cÿ«›®(õþeÎHFÃÀÞˆ@ëMP•JU2ýñÉÒ
;×!5xÇûV0ò€S>³¶YBXC»6ißà¡)ü“bÓbÕ£ÂÁÂ”'ÖÁmÚ–kÓoA^1Ú «›V³3G:ù¹Ikp»€Lrº ô½§*†ïÇ%²Ô Ïx]Ú(Ö†ß¶Ñøóƒ…ƒ•ƒwV}ý£Í#;Pypø,¬ÁheÂPtÐÊC˜¯xÊ;1˜FÿNt±c@Ø™ùów—¥î™9JŒA
[ƒ©cŸ¾ÇC†þ#Kò¿ÎñÆÉBG¢PÏÒ÷é,å^2÷.5†¼Ê†ŒO2]v´Gÿ¤ÝÕ
¡Ô´ïyNhÃ=öÏ»?¸q`˜3Ø>¯ƒ¸q²~;¦ÅhÜ±zQó7‹úý$!“Ö§¤ÅCÊ–—V€:0Àqlœ<Y#ð?xÑÎÇ§¤køøæ'K‹EÍã<’ðx„ÐÏõ@l„ãþ¸ A\º¹ÞÛHˆ}ù`yÕZ‰¾øÝ·'Ë§ ã„8)þ*šv3¬Œp÷YŠ>ÓÙ;8 SÇ4ä¸•Ù›²àCŠ]ŸO±9Û“°!M6(/Ø§’‰dÇxß /E,èÇÑY°eÅà˜3«äá‰¸Å„áe’X;ò–ÌXJ–Z4Q½—ÈÍ+:r³BWÕ§Æ£'Nß ³GÒ§µë£$F…Byôý÷îaß¥iNž^œýž¸ç_«KOªÌÐCƒÑ‹EÉK¬¤¥YfHJî}Ò,®÷…«XzÐø6ð(²Adg¯oõÆpø6ÓœC¾éÓváùýHyÀ¾”¥Â2]½ÏØSÝÞ8w+ë—TK^Žl¦†0Ÿü>Û½;Xû½¹8‹P²ÎŒºõÓÙfAºA™¨„F‰Ú’Øc7jV´ÊUÑ©?Ìˆÿ £Í/©lmŠ=¶ï1n»Êš÷³Ù¯8	GÜå†º?BÛg¿"q6"3RÞºgÿ Gç\:Ôó5=»8ûñ[ª¿lª—¤KmNXÍ1+k1ÌPªÇæ¨Õé˜£ŠÏŸ’Q£:Wƒ§HBÿ)Ù÷FDP‡îâ¹»R_ªHÔûôX½(žsFYÏ8¯÷-v½OuÈNC×ƒfÙ–R’Kn) ï¬‚wãö)
M°]ìû\Ø^Uª3xy #Å·Þ(¼udô¹mbªE¸·èÖX,§^*uˆGQDþ•YùRPRüã9xÇžuD9Fqväõmä8Z5ôþl}ë„>zúÉ)SONhƒ¬îbþ×lA0Çú<Œ²`‘ÓšX¤l5O¸ö0Ó{ìxFXN3·H“'öxçø¹äÏ¶c¹ýp0[Ø)¬Àš»šã,IòÂä
ÓÇþ^xaEéäÎö¬#é
Ì%û`Õù¬<é|ÜFåP]O½¬ëtÏ™©äÛ41yÜºeUeµ:.²FWáiX´-ù‚»Àõ
Ž¼"%|¾˜iª¦ìË¹ˆæÃBÉNE@*ÆÑ¦QÌ0hç¬Àð©†Ù5•ø„¹€…dÕªÃW–Çºh©Ën1¥—6¢¼1'4KKŸþ¶lô++\GY?)ðqÉæT˜‚ßÕ—Æ®	_ž*ñc'½h‡–åF¯e¦~,–{lC‚LØÌ“J,•Îu™<ú.»ÅPŒp[˜%ßÆÄª‰Ù™=ý|îE[»èWù¹SÅü­Îx™s³>‡†ŒøÇR;ZëCD³ÖÂœCi¶ÔS‹v¥(µY^ì-u"*\­RF¥†BUÊ¼(xÒè‹øH)êBÜ\qUä,åã‹¿‘#ÖË{‚ê¹ÝÁÅ‹¯\ý¶
Ž3¢Y”Sõs †¶A…ŽUŽÆa£åªE…¸Ñ’Ly¸Çí|ï,	Š*êRŒ; q‹JãNÅzi<å·4Þ5å„œ~i§½@ÊÙˆÓ8ë%BH±§rŽ†I®f·ÿ%elê0Ð	™Gˆ½žuŽ:¥K-¾ñkZí‚”Kê¥®Ÿ;“FNÆÓéÙ&‡´à/yˆ°(Ú)­xìá÷½Ã”¹!BaÑ%4k¥pXª-ñPªé@~ž‘ÁFPÖ µ°H[«Àè÷÷×çãž4Æ¢p¦8H:>æ­l<›žÔ4ÛB'å}¡"o 64íPún=?lŽ|ëUNP òGitfŽôlŸ‰AkoiÃlsÑß©æ_Ç·ñKIw¼¡I7ýâTmD(°há@T&v!Ïýdšßís´Þ£ïÐMë"’^“ÂZG…’íÕ#/ú‘º¯¥±Ì"Zãw\	j‹ÄfËíiPžlñ-Õ])ªCNÍÑßß@ŠÛg*
ºÐ¾áÇ§ïÊPâ+"9vÃ•¢9í##ï~Ó©îŠ±9îH."»è–+ExzÌN@v¿%; »‘©8W‚ö<»îàç7æ1veˆß Š·ÜÕ$èôjËëË›/Ã×0ÀZhõÐ…@6È“v»-¼|ÜÆ»Ð·@º%^^Öèa†žŸÂÏÄ¤¦ –ZÂ@íÞCç±¬µ'œýÃF„Ä!-ÒCmÉ·ùð&è‹Ê—bGøí…&Ê˜F\m;a_Ñnxê›itDmb7ø:ŒfffÛÖÊ³ÚkøV³+þ6¾™Ð$vN¿¡¯ÈÒ&L£äUÅ Fµpß&Ð,_M†ÆJhh>úatÊqdÐÖ´ÕÛê
muµÚŠæ…Ž¬EÕ™µ/7¨ìôTé£çO&ì"çÁ<ÕÈ˜çˆÝ;Òbð60CøŒ8I´a¢âß«ÀßXv€·Ø®I÷Dÿf›HÝŠÎ$12÷{ï(å€ó^ˆ9÷2Y$Ø; Ó¨¶æ„(ñ)ÓQPÀèSD“©2·/œÔ¸‰ƒ&ß!§üÀÁft»+ƒ…èÙÿTxñ‚–N>‘G³—*C9çPp*|ë$E|Œ gÒQyÇ•oÒ¢YjžÑá Ú!¬gd¯mŽÝÍóå³¢º!j_pî¾”KVíV…ÆESŠD½Ž&l© 2•!\Ñìx‡| Q4¾FO¤ §)x>áÔÐ£ÁD§Zú‹·Iß6>õWÝÙãþ#˜%›­}:0ìÂÜÌñdèÌ™ÖâkÜTcßç–Ši0Jf“©MLÙNv&päÙ:¬(Årc¢TœnxñŒ¸Å‡QTiÖ•ˆQx&þºÖÖ–¾%K¦vékÂ8^é–àsã±{¹‘q$Fé.c&}q=åMÑ¥¥±”„¸¡°Æ~e[‹
ƒp´¾üTU '™9iéÜìMÓ%yY
Û,¹Q¶(#‡8ÐôF…¦„ò…/ÒñC´jÃYžm3;M²€ÇûÄÀÓÂÀñ:=$°î8ž¢P<Knn´C(`u7r5Ðé÷IñgZ=ª….3à4n¦àM¦áñ±–ññéqÞb;»”r»J¢WÅEñÎäfþ£¼AÎŽF¬@n“fÒÏãVåøÔ$0*ƒ“K|…ˆ«˜çQMC€Ëè%¼É’›’b}j»`QÔáGÖ„Þù.«ï^0³óó5HÏ.Î~‚‰2žÛTÏèëd»¡Ö/e¦Jx—eÉ²S“\©†ÔC”Ò¢¤a¹¢¡[Ž»k¸F!7¤IÇšw_~F`˜ð…låÐL}‡.6UáEC@!¥ïûÞÃãäã&<$åEukÉÒžÑ~[Ãþ0”&?»1ÜgùìgI¿Òh$_ˆ‰ævcx¢ûî—¯u,¯”~f{Ž²Ú\žx ‡R«ÒM.ÐðGeæ¡ú9‡’ì?ÓDÊ³M(]|.CšAdÔCü»0µP‘r]¤æÓTöËd‘Jq¥èôD¦xŸOXð¥ÑiãžF*Éc[^i„/,dùø²I Ó®¬Î½på†µ–ŸLœŸFš÷@Ôæ›XHë(|»ò¯ÍÎÆø¨r

ý´“”°oæï…Sªù-Im:ÛÛ^Ï:E¶±=øú·Xqýâìï]>öFI@ƒ<›ûEI]	û,Ç¢n‚¸òó¼PÉ9Ïoøó×b^]P!*WˆEp-²Ä9âÏ.©oJ"áÔPœƒKé@T¦èTaD+¼Žù€Å5Š(îáù“pÑá<¦3^\4‹ÖûfKcõèBÝ§e¶›t$Á“ÎÇ·Úvû 
+ee*…7¡íH˜zœnŸþT³ÞkjØx?}¸TR}MTOÄ~b»´ÞMÌÅò;ëœ¾&MhZhÀò7|† ®…ä)]©v»]®’å´˜(àˆÑË	k°D QBÊ*Œ.xûèbtÎ6à-ÙŽÝ`ÃÚ@¶Í.6ÖEb@£©K3³…a€ÑÅmïÙ”q¾èÆÛ‹¾”ð<é*•¯(©DtiƒÍT¬¦è\cGÄ¢sQÿ'|=©÷¦«•7äæó@
8û,
„íU‰deKÝÅÅ…ž„Õ,]ŠdÐÅEJ'í”Îmt£úäTžUBæ¤Vó¬¯s×ÒhÅ8Ñ07ž—-jï0³“h@}Äð©óßƒ6ê³TŒƒ1ì“ï9òíÜCxçÏCÐD_~
’ÚSxÒM´säÙù<6ëü?lA1‡yá?g¿£y,~†©E.^|5b\Àœ.Î~icjKçMjG—ÉTêº~YQ“2%2ù¡oŒ˜ ]zh¨âÑç£Z| )§sS²,¤LQäüã]JÍbbÎæÝó/#Q•s,x(ô=œîÌcì8Mv2Ë?^,\B›´±;áJN˜¸köm¬ˆ$ú9ÁiÜ“l)N*:žùÖ}túí	¦UùSÅJ…{Áãq—„ _³(o™É M"ñYoÅ
9žf…Å€óýègÝ$oØþC;3T“˜G‚.ºHab¬U¤‚ÒmûƒÉƒ¡‹HÜLYu¨c0eÖ(“æ­¦äšNYMSŽ´ž!–]dF›ãbÒå–FêtK×EGoTÝ@ñBDR“ž§¾&X“VhØ¡PM	A©\e8
õÌ1·ß›9wÊÊmÉä½ü,>…’éN!úßÌ	,,"¥À(ûîtgÐßÈé»c;À5-`Šfo¯?@/Ö¥xþÈîƒýêsÈ~F&+Iò…§ÀþæYX#û'ÑÜœÿz8‡U]¾2æÈGç¿7bC¹½^X+©=ÏjÓ§‚x¶ˆpúœ`ÏY½é—SÉÅŸÌÇCÔ×1.°XÏóI)T=uIûÐk¨-•[Öè	øÙõz†C"boÞ‰ÌldžˆŽÕh2²K¼©÷P$ÙÈ%r{—‹êÉ³e¬ˆÅ(ÑD^1kFv5J6êlÅîoUj…ƒ°ÆA­ÇŠs\RÐ@d¨Ü”ØŒÌÜ—X®V&øÈÍ“¢U.“®ÓfN²ÿ7°ÔxÈ¨~JŽ@Eí]œý†8ÌGß=ÿµKz)üOv[£.TúmJ×;³a­èç’ýÀ;Ø±Çëod¹'v°í[@²Ü¼¿¼? $Œÿ
‚ð}ÅÁîŽ8€ çw”‘/©'‹‹Ù§¯Œ³\Ç¾ˆW$ã#ÜwGã°93£eF%³öÃL›ªýødðüì^ÅÇ#û7ž‘÷{pæ=ë¶Ù|ò±fC§:@Â(ÈQPã^¼Òz“à¼AÌü»ë”+PaI³,ðl ‹íu¨Rréá8¿Cö/^<÷Š=€âU”¡%{gjïhïµH\OñáO¶ÒIáß–’êGbú)TK9ìEžVšç8]£$‡dtê`"å#5REU®ö‘íù‘3¶mßLwœ*–P&¯ ˜ÐÙEö¯÷ŽóÂKVš–¢³,“wFÌ¹YÂ5íßìÚP»g88ÿHÌ¡íR{ë¿Øàãqã+5«ömLM¢çÿŽ:gœ+c—’YKÕó£}ˆ¦‹ÈMç…è:Ì1H{ñ¤Q[ö ¶ÒÊ³ÁÇÉÎ8ffœ‘_ÿ§îPš°Q^X¯Êøu‡CÛ»‹SÞ“lZÀÄ|[êþÍuG>½c])ç‡;käöÝÎÂÙÝê,ê0õèíñù­wš±Ë‹Å£¦¹”3Ò€Õ¿o…,b;ô>@Ázëf±'{¥20ÇŽáÂv	vT»ŸÂŒ—â¥ñÁo~MD¹bøë£J~0âŒÎ„	h4P§B£‰¸›¦ÑK¦Ê×K‹rŸâÞ‰©¶Ífœ9(š“Œ	Õ&MÒÜ>ÿ=õL~Ê
àqú¹ÛŸ­HàUÉ[ÂrIs_tŠôazè£yþú=Ât/^ü°/~9Æ¿ƒ{oßÕ§qš’>™*·€¨wM‰Q¿
6­¹1®>­³²ßS’¿kŸ?²4kf=®½þØ2|s@ãDÅ¸o–¾DŠ”ëB”YúR¸ÅÆ´Û2‡:Æ6N¢¿ôŸµ†£ðøCf²Ößqô):óV‹0H&•éç	7‡Æ˜´ZßpŠÝÞû%BcËeÂœ9‚ÕEÇÇÄí#ÿþg»2ŸÎt0¢®FÓ@CfbÃ‹Ûr¬@Sœ¶¸·'n´>‘¿JÚj¯ÔVÄêäÎV¶]ƒrï¨äM2fQs÷j‹ËEéäUqé©”¸Ô*‡îMÌgJÖ¯?
ÌÒ	"Û{k$Æçí›‘oAÿ5#£»'PTU‡!‚Y–;yË+°-Æ©Õ¡^BN¨2
”Cß%ÍŠQa)$˜@ Ð‚${#4³¦*ô½Ð` `ªTv‘@Cµ:±–—fd?»0gG•·`Ó€ÀT*ÕVð+°+JB}ãVl¢´]Ó÷¬€öÕ¶{Ú¶|vé¤É\ëe'EË;.)ß‘ð)O6¢òÜ©´#ùzKØ]‰ð—›´tQÛvUAr±J¬&RE×;ªbH.“Ñuâ±?«èîÉ%(H•<gÙ3 ÅC)-ŸTp»¦
6ÐíÀ’61à&ÿ^¾í¥Š›)¹N‰åÖ¥½&;S¿Ò\4~]œdüµžÓôëe¯<t)½£—"¦/øô<s¬ù2àß²,æKÀ2ñ¿u¶‡¶ùH¼TbŒ 
°†¶DÀŠ*ñ°Ú\qžÆMÆQyš*"„0¨*Â„ð˜ŒóÑÔ„)þW‹ó±·Âÿ ©[u cA!¤ÄÇ»"#™(©EJ€™Zï•·z» îR+â.Ê.6äØ‘qiëÁòU¬¤²W¬f…øé­Aß¿ú‹Pk“®Ï;ÕÔ,¼*¥à)¡]Ý—®no×¾QBpÇóÂ4×‚áþÑÁwKŠ%ä„¾	:ê# ªæ"Æ«‡î(Æ3¨mƒÖ»Ú›ùÞÅÙ/©wB“FtÁ0ôî*ˆ0nÏ±„É×¥ö©"‘ÄéÔê_wÎ+ªÍz„£`{N´¤û™Ü^Y™@tK‘¼lÔƒé0KD	‘§‘©Úf‘©šB8Î†C^~NËÑ˜‚SjÑ1~¨ŒŸ‹äe‰¡Çjb^$¡¾úàv±=²Aò¡i·¢ pÿÕa¬Õ÷Ê`Î]n|f‘åcÝ¸=Ž[í%þ„ÞŽÛ²_´˜/ë™ÎPØà–&®Á†T(ww[1ëµVã·T2Q’ÐdDI,vUÝTeeÀÖ´…!ý¢éêÁBB%¥31KW’!¶²
Àº9íîÂ® ÜÝ"QIš¿g•àß-&!Êâ{òk$‰+r†èŒ}š™uUtÍ…¼n–Á²ÚÇ’œÞ Åq»‘¦?X®ï;©D¸@º‚Ž–Io@d¥_EŸ<Sš¢ºÕ”ÐÓàt#õö¬VÿÌje+Ž®T†«àÒ©I½ŠtÃ+Ž,Òÿˆ£C+é²*¾Ü"Þ©ä-"$Iz·¦Œ1ËHÇ‡.HOÑßpŠÆé5ð|¿GrÍ}iÛ¡)Ø™l4¢¾yP;~:Sî/™–ŠÆE®ÑÈÆÙ¸ù£‰[œÎÂlýVüb¬·.‰H§rÄ8MwpþK)_î´^†eACb:ÕH¢SÚ›†~¢‘¯E– RèAñ†_
…°9…†Úºdpþ…; ï°ÐWF
èD}¬Š/¥Iß
.+ŽÒ§¦¦9I f¡{3ItÈß§Ü~¤—ê¾vØ¦*<s¢˜—Š›9‚Ó°hjÖ
ÕÜO"SÌˆëEê²¸*Fdj2n™*}±ŒI
Í·{v(XËE˜8š®ôÎ´ù*1ÙÇ2|’ƒº^‚äÊ†¦A8-‹irŒ“sv¦Eyz¶.]’ÚŠ”Q{RõH«©©±®ðP$Ý,‹ŸL…îa/©ð!s¬2¥J’ƒH¿¢G…Ò$¯hÂÄP©	æ+ãüÌ¦ôËüD^¹´Hà@5ŽÊg½Â oèB6hN‘©¯«( fä¢¹-÷æ7gÞÔÍk+™8Ñ©³6™Ãã­¼¾3Êd_ó¨6Ý&›G\|žŠ¸Ð›ç*\cÑªä„Ìöe{É^Q™ð‹oÕt¨r«:ŽŒfˆ…?$6¬9ƒY2h¦ØäÍ›·lèŒC'+,Ñ©í4µ. ´0‰¾%kÌ
Öp„`“Mß7ŽÛv@ÿ•$-ob0Ã,¬iÙ=‘cpt4Ú›M™‰?¶âñ>µ9råWçíw¿Y)^Ú&uÂv^#Aˆ ÁJxÆ'Æy.ø”O~Ì)ÆœÀWÉ7ÚxŒÊÀk^ìª‚úÕÆ•‚Ðˆ´˜V…Ç¥Ð‡ïzœÊ\â{Êf 1&†R¿„PƒK{`•<c¤Åq–S<xœØ’ÇU"ó´j|%—.*G²¥Æ Á$,”U¿µúiÐg9ÏÔ±˜V©H­šUZÕÄ¦ZpÍˆùÉ;„ÆIñ©(²òðÔD©6”ÒŽ^«³Ü¶p…lÊÌ:jkcR_"¿:¥Ôt™ùáJ_–QÖ“‘wñâ?M¶¹ÜVNÙÃðäs\–"§r~¹×næÂýö›ßÍ5]cóÃg£x£Ñ±)QJòBcºz–ƒÂj)ÒúBi®Ú¸)¾RD­;Tv?Òh5C,Õ¯Z-…S•”©tÔÂ—¼{­&& Qy[vË ÉLï ç±õ.«bøZz‡n.“Cäí^¦ÇlÚ]Y	•Á¸ß·DƒÅÆîóˆÉ1;Î‘å·²–ž™Ùt¢Š6ÈÈÃ¦v¯Åûù>y%øp-þÔaÜƒïÙá€ß<[%´+3ót‚@3f-~ë$îçôíqWÈ’"îX¿[=ñMï¶L¢Áá•oÐhF+ÆI¤ôX-WLŠu ­›sŽ&Ëó×[[Ú¹_$¼¢
ÂG–÷%GSÉûRº˜²x%½YÐMo0Xü¦ÛÃì}'G÷ÕA±Âä½8“,È‡ñ#“º–eõœIévC­¾‰$åñd[iéEâz;|]^hYÁ_©5@]eQ:·ÈÌËÏ°Œ*…{·ÛmZ<J?Ê”—½‰­†ÿ×sLÍ®/?n­1ŽÜË0y.ja¦wþ«sñâŒ<å TÉ I$ÎÎ¨é T§ ¨&RÓú¹lš˜H)(}Ï9=NÉ­/½Ös1U<¤dë§àLrì0ë]Ëµ|ÛÔ•¢p7r3ESFÐJfúr
Ú9Ã¶ÝÓGæ¢#|]!ó‰£!LsQHì9Ãó/gNg?ÑoÞ„FpHQƒº’’þÑÉÏxƒ<·ì 9jÓ?ç³É¶6'h-£úü…x2§œ®ŽUú´5¤±GbãwÏÿƒ„4™	cU˜-wÁÒÊ‡Ð{….hÚ®]+˜†FªL-gz&4žb†D4E9D?ÜS+…W"a\“Q	Ò¸ô{Zoã¯é¤hž‰5Ã:™µÙ£±˜ûžé­)X•(O!ëçx¯”š]W€¹4ùŠKS¾í>miE
èq÷ï0­jZ\A,úS"bf}`ºŒæöØ!Fn±‰(¬‹*&¶¿vàh-ìðŽïY±Þž˜|èô¬!?ñ›²Y öØyãKÁéíÉú;˜ÙH}/°‡ý”ÚÑô›•ŽÖFHh•]LHˆ–ùÆG‚¤Žvo*šÿƒJõ5=¶°¾ïÁ ‹.m¯°´3ÝóN¿ŽÃkr{Õê«Ø»x	e•4%®«ðˆj7LòMðÑôMO~ÜZMtËc¾K”Ç6qè~à(SõBŸg†æ2#+ZËa,L$D|\+}åÉCTä©³{ 2/Ô€Šûê–'súk¦ç´Kƒ	@"ï”ºþíTè·ÀI[Nõrbvú•ª™T³ì`ÒÚ¿ÙËJÄFÕ”¢"‹@	Z›JoK­k²7Ù5Ó1Hƒ.“¼Ì&ÍæÓË¶rÊ‰½Ž=8S²Ï40²Ò§˜þ3<b	< l;<n-ÁW]VO±¬U	ôc¨J+ÁöO±éQ1vA—Â?JO®r¼JvYâüüõó¡ùÕgyepÃšÞ—ßÛ"!\×¶²¦Þ÷u¥’¨ç¼6	ØcóøÖ)5MÝ¼—Ò¶xb”–$\¨b7üv­¹šÖJXCïÞòzÇZàÉï¡Å&PFc_…ù‚7Q']•æXÐŽ£¥ío[Ž“[êƒR¤‹ 7ú»à$)/×ZùKUM\¹ìJlBÌŽ£zâ8™Ãð¶¤ÕéUõÉ¸oÄi$;‰_¢çŽ®
©0ë¤GN™›{ó›UÒ<èRô|LÒSØª$žÚåŽe×•ÝúøšèÒÙ2ÍD¤ŸÆ‘ñºJdŽ¦¥+LÙ©CöuQ­Ìé)äÛ®oˆ®ŠEG“+g†«Ú@^»´†–o8½ÄÌ}Á£5£+4ãy|ü'_ƒ6p½j"äØlÇ®Iê¦÷Î@ÓtiÕ“U§Ñh×dÇyí–C¦eNâz)ÈCÏÂ¶åûžßüåm¦/¾´¥å¬ÐqÇµ%¡RW#F¹5®écÛÄ‹…•T²zöÚÐ?®5WÆ¡a‡d<êÁ	ºã™Íþ¿;GfX…û8yùì\ÍôéÌ¿-;Ñ8Œ¨J«äŠ$–|ÓŒÌhÓijªÑÏi­Ugsêx}Ü_žÛœùàÑÎæþí™ü¬Â¤LÐ\É[ÖÛÁØ4­ h6hÁçëßŽÑÎøÕ6ü^kÔj["fÜï5Ý±ãÔhÔ)Z’®	[¹'`Ž§;¶o¡ç[·)K€ÖæÈ{@®ÎþñÈj³Š×§ÎX+>Q19µÃ–ÇÆ3}I¯j9|ã§^×©ÎÓ8×?Ó3ÉÙ&9™›*;¢üË]jš¬ùÒ×ºbvôªâ¹®ØY­mùÍ&Ñ<#Ü•33Ñ,?‡ðÿ‘®û6¹jB’K¾êCR´GÕÖXãQSi™Z†rö­_2s—¦UªèøZû&rþB"ùnê[Šc#z/žÛ"‚¹²'ÜL¸yßÂp#T]‹eÌx³\òI´þ‘‚&TÊ
‹­I¡—x`]šµ§Š×Æ¡­ííà·NêûSItP9Pv®† à Y aù,YÊ=Ø€!ÞÈr1Â%“¨s÷ÂÆÂøñ}é}ŠH•JH×¸7`…•Š< K‰ãÙõ\+B+ ?zÔZ‹å%úv¯g¹$0}Ïqº{L`#*õÔ³ÛäH†8o ’¡Ü$(;´=¬dJñÌ”gÿ%ŠŒ§ä(¼Té«Å‰g
œ2w{ÅPémA¡&a:·e—FÃ› ¼‘ééÙùä,J³Ü„v>ß½8û§°°îk0›Á¨ãÍ£éÑˆ5n¨Hu›"¨f™[KÉ<Eµ'V;Ï•KOà†ß2Û$÷Ý](ø‘¥½-)©•«ášÆŒŒàeò¸‘|ˆzôþeqêëƒ•ÂÔ8œ2C:oê`ŒU+%ýO'Mß$E¼ëAS/êÆ/iûáR#,Øµ³0Gv·:‹:¢šà¼ÛŠ²/Ò¾uD•Ã.ÝÒä~ëL «œ"éÅÙÕŠ-9M”¤ì’-•õò)‡ë!ÁÕ!5|«éZÜRÏpuâz5ä£S›îeˆbêÒØÕõjxcBeÆéªÐÖUá‹ªÜ#ð¥éFuI-‰ÑŒžÏvuH0KK;B"Ð[·ÈÌŒVf½|¬émIƒ:$¥$Ü8‰þÒyŠF‚Ñ!l4XX˜Î>¢7Ò™Þh´ZDˆž'/?£a>mµ®.OÕ'Ó:Dúˆ&Yý.¢ä#²l¡…l¡Ûç¿§ÁŸFÁ.ÆXüxLÜ>:üÿÙÖ‰Ï’òf”ð’—X*JÉ@Ê›bÊÌr*â4Èˆ¸bSÕ‰¸„xJI§äu¦>ý±Ž}‹ì®Ñ·†hty%¡¶j7õ\ÓTEÓE’«;Ÿ/QDR®YevYU,ž¿RT¼M©$
™bv]Ø£Ž¢óŸë$áÕáV´£ÂJ::°“J‹ä
Ë€h=`ÆåNÞ‚‘(iËCÌ45\ŸÕÐW™¼Ê)g¶/?§InØ™47
RÉÛ°21L¿¢‘¬TÏÁœÃù‡ººªÛŸö——	yq¶" qqcSoÞç”®[©›	¥”÷Tone¸=I3òKËXTÁºf2£ÐB	ÚŽ›J…Ì¤/^(D\ªtT¥^Z…dÕ}…ÌQXÍK¨_Ãˆ]®æSÂ(Š]'¹&ò5æü»Ò¨xzŸnò/µ+tèÓïèå ñòÜ#üô²
kÑ×l8²„&t×Í^=ß¢.i©¶7Ì3gÃY§™+ûe¡#µÙë'üÒV?X7”>±MOï³*à:x&âü*d.ÕìôTœI²yU©Â€é^8°|uík¹:Úyi^¯°vµªÙÚ»}’äe´É˜áÅ“˜%3Y+m©r3¼.9^5s™áU!Ÿ^YSST:™å‡bùfª´W`tš´éKÊv†×+Èx†W:ëÙ>è£!j¥BÃÐ	¥vH^Óo\hT	-TMK¥ŽšEM€Ó,ÈuV8¸J È2¯’©œ²j®Ù)”×ÝB‰Ì…&¨p¦çx~P1¯RÞw¸p ™&¯jÈÏu­Í¤U¬¹<w°¾ºöÊ1³:tÇóÂtn	*aà1­ñ•–êÔÎŠ€µYÀk>Ü@
RkN *\©Ú‘,o¡ BÃÐúöê!—Ò‘Z8“Ðú‘F_®ˆV¦XWœeE3õc¨öÆ1õÈü´¤V<_ôŠÑ˜
6™‚Ê”ìöÛ¾¢§Ñ n'÷;­­³¹E×ÈÖ¸‡É}«opxàùJÜºÐ.—¨ôîV—¶4Ô•ÆYûÇã.´ÁR(¦žœIl÷R!½Ä™¿@œþZòq‰j67Û ßÿåg/?EIêüêœVSÈI¥•O­fú©ÆÍ½…#îõÑMö˜æêÚ¹8û9ÿ±«—ÿ)[¥F˜h¥ú‹³_™Ä¥ðd`¬/î’ÞÅÙOèGOÌ&¦)jkWÁÑÉCUZù¦ˆ×ÊÎL7“-Õ³k)}\ÍùÞßÀLÉi)y¨Ö4ÔºX‘%ŠÜ¨Í;L[^Ë8¦²¥/|¢TOãšåŒ=bM?–WÀ¶*¶Ò³8¢Gû¹[ªðhjRÚí¥U¦ý‰Ê_;ñÇqKEÍÈs%¢ÓD;„e®«\Ji’Ý¢péìCˆ†é£ÒvÑ´pÔØ+åuA
7Jùã²]Byý´¶ˆ^c¥ûƒ6s7‡¢`²Š³_`Ìž¢â‰ÚŒoéÿ·¯ƒYÑAù¥ŽK
tî#pyùytÚ—NžðîG…jX~ýå[ÒvªTåêP8êô(B
--’HêULVû8úd×ðŸZòªåÐ‡†Ç#.~–Ù4òT±Ú ÌPB´ª`åµ®ÖînÙð'§ {d¹Ac2"xŒáá…Ž2EZ1‘ éUÃ.œ§‘Í!Lv)X¸„HX#U©äu¯xÙÏ•*›½ž0)šv•ÃVZ€)ûŠ î(3°ŒŽijù4®%ÑŠ£¿øH=3×J€V*¨ºcJ\g²c×J‰ýúa“¤R½ï£žè);Ù‹3Ö6bn¶{gÿH‚¯Ÿó…g3ÎŒq=,æW¶Ä0½ÙÓ`UC!Î%WÛ®qó!Hßˆ«Ã£M$É±øŠƒú¹ÓbA¼SGýíûv¿Ÿ&=L ºœ
™*1b2(—cÈZÁØ3}©ÎÂf,°|ê=4ßZbœJÞUÿîiEÆU
ü§ÔÒÆÞ$#Þ®à0ž¶CñíÉ¢òDÉúY’ÅR$åð4"­áéMøµA•{ð£ö4²Ï'7Ot>O5!~gz“ãÈÒ
Ó»û•dÆ—¨ý,è>ÑdSš5Íœj¶eÞæÍ¿Ryó/)gþÝ—Ÿ=Ø™~³;Üþz	Iþ¹*ÿ`úmïÑª Ç.ÚŸ.ã%¨I©oân¼œªp*ÂÆÍ]ê›4‚·5
/ùqDE€nÐÃwöì ¤¬cZyƒøVà9‡N“¹u©½û~oŽ°¿ðKMxPªyôã$Ís¯ï; X'£ä'Í~*áFI¶<Dwªµ!ˆ~bütô‹RÖâ´Fêò½GÀûJ™OàIß0Ã»;všÂ˜+à8_ÍÛ‰57NJœúäŠ…? «n{HÍ§Sì&]ë^Èxë™´_;1ÂïE)©ƒëÒ†¿¹0*´ÖÏ!°«²[½ÍpŽÌÜ»·6’^o~wwþ®™Yú6-í¨¢©RYr^IpIII‹l:®€*2¢Äø¬¸Ö!¹ï†N{oŒ()>A3ÏìÖ‡{3³íƒhÂj==…£úµÍJå²UâpÅ€·éeåéeùwSI†™Nï&è`SÉˆ‰0HŠŒ¤2H+o³±*®«B…zÙX£h½ÉéÞÉ­ ¯©>–Î8„-æ¶A¤=°ýa³±E1u4m.^üÆdÿ¸d8Æ¨jr¤~	jº¸Õ¨[>£f)‰¨ðAÖyN“ˆ`›(|Û=½P-UóB]…Ûo³º
é°¬‚wðïšEre(ÍˆsÎ¿p±ÜéÜ~Íj	“8Ð/qÀæJ˜ªz#®üÌ+Œ0•ªÑBs—ŸJ¿Ny©J)‡µ‚6nö63qî‡‰QõKkdŽP–j¤.žÞ„ê éés¯KÏq!æ Anç_MPObW¹Z|¿\lý]xúb.Ù†?á‹íbŠšzÈúTâàx¦xÍ*ì~ýÛ¯Ñ§ÐWp‚<£épRÈ{šY8Û¿Z|}QŽ¤zYÁ”!ù·˜ûôu©˜{dV“ îµŸ‹·~žöŽaü$Û×[ü=».t_}¯÷ð[ì½Òºˆ_3geÁn]¶SÃÚf‰k2,uÜÂÕARââu9hêIúâì§°ÐòKmÍ—Ÿë%­±æÖ‚Wã’O®Nš¸h5Í­ …<¾û
p×Êßi¢HXÞc[CòØ¤ØKÌ&¦*…^©kK,’a¨NTœ44«È¬e¥$åØõá00³À*—ôQåðÄd»/?g!­P%-žxA‹7”b‡w42i*'Q©›w¶Èf/ÐßÛñîNmßN#·#ïtO‹÷Ûnn¯eë°G´äôKíY:y6.oïz^TíË™IÖxÉl²›þtfô¯Ç»¤ùÄ¦KfoùÓ™ËGðFÀ ç#3Çô§”÷P2«ü®W:±žSWXÑ¾fÎ_ÄbÕ”Â^³+²ç…VÍ Õèñj¢PŠDvÏÿ@BDî/Î~aÆïZ*ØMG .W»Ô¿×EÃY«ˆ–C-$ßé¢1JÙq]±<[±™±¬˜É D¡‚ù{dö™Åkûò3jqÿ-îÛÔ ¾uf>ËÄ’!%‹yò¿‘áb±¡$X,{ßÛP±‚¾ßŒP±xIßŠå¾¼@1‘í¼Éabû¾'¸Ûÿ`”ÞÝ¯+T¬g€Ë<º!;ác‹ÞÛ@±o` XÑ5ÿ ­]oV\×þ`|L-uCôøÍTS.5Ø*²KÇçrƒ­›÷§gÅ¸9=?Í)GY™q”•yIQV¦ee¾ò(+óe¥gøÎ´”Õ1òoPÃT	«ˆuÖÚ&Èú®åeõÕÊGª¨¶eÇ’›U w¶ÖtC_’witÑªú£‘Îì)ùQUÀûÝ»uúìSãtÒoµ¹¬ºr¯1°.Ùf^^d[FÆ:l¨@®0óÇ®	?Ñ!¸pF^^d›ä•˜ ²“—Ùe¾±‘]uÂ]j»LêR/Ð%6WÔŽt™JTJÝ˜QOª…R7EÂ Î(–Ô?)ˆ>bOÌú±'²È“xR';™<è¤rÈ	›Ÿ:c­øDµû+…šTŒ™f˜Iõ “·1#E†–7=fdelo…†kFe}òy¼~à{.t=4$€>ez~/ q%[5âJÜ°FP‰–F”$£/L;Øìmwã„ÿ!_7;x<¶ßš|RÝ¿ëõðFøGu#<÷OÄOòûÇåoœàå¿Ó‚vi´¢!×þÁ˜jìZ·G	Ih‚ü>¬×üÆ	ÿC~—/
O>D•øŒ"eƒpõSˆïÀZòhnJ+Ñ½ p¥„oKÅR’Öi¾‰¢ö ~«z½CËß6eŸ¸Ã½ü¯ú#È×¼E}ä[öŽ*=ÆäôøëXmÛ5qÏ
$-
¦Ò&¿…Ö ’ß£âÈ¶k8›"	d¿yKß:À~wÑÆ	ÿ£óÐ“¿”E•MVXÝ<ºJ}–?ƒ9'£\åÔ§¸q’ûJþ¤L60'éouFKDÙ!Ó/U'ÇýáÈóqŒ©½$ÿ^Þ­ì%oFùSñh„“BaÉ ¤?—ŽMÑhÙE«–{lûñ‡ÑÚÉ~“·E¥˜¬ü¦"·È“ü·“5þŒ¬½ù‰d6ök^Ê×ÒË4i6uŸð‰J„hîgræd"(Ž51kÖlFÚƒ™YþÐª¿âÿëa¶ŸÙÖáÌlÞ^+“ñ©>%oÃµ‡h¾°‘ýôè¿cÓ?Z¾7lu=Ðe†­eÒ3]QšÎ	$\¡X¶Œ»‘›•s‚&N÷OÞw<‰ä+),Ý÷ž/Û
½–Oèp¡c‡šlà+˜`ßpz¬”½€¸|²´›¨îŒ#¢Žâüæ´¬K½Ôîìør$vàì^Ïr%6°ìa=<g„¤fDø÷°µºª%ü^‚Ž`~!ñÓ3Øœ3ö[K0 ÖÐo-¬Â?!ü#ÕD³Æãý!:â‹KhIMÚezæ°Ša^ðw9ÒKa\/Pñr`¨xJSÐ@Ñ¹ b“ZÂñé‰ÌFØ®c»V‹ÇG(5Ëƒ1iÿÎ$;Ì~3ðÈ]ûüùÖÍýÜdÁ˜¬š7Û½Jí³™µž¶9Ðw\ŠÁÌÒ?¤6h$ƒ‚q—Fuçü”Ñ¬å§§ÆÇ9 =T7Ù–ŽvÊìáë%4­‹˜2¯[»™û:‰åÌÿ”ŠíÄÀNàáV^Úd¨,¼­qZ2YóƒÅŠj¼Àr™m4kÔ®]x9\5 Ç
H“êŸó‰âH¬ÐÌòc¡Íkv@Ÿ.ð˜e7´®‹Eæº·=È¤ :°Þ=øeÃ^ïJõ…y¶¥(§[LÅ	ÔÇÒ[»­…ö
î°D[Æ+‘ÛCL[ðŽà‡–"3bÂÙ… š&UÊŸt>¾…ª%£ÙÓbür
ÈØ„¶#ø÷f¦}ú›ÚÈTe­À9F+,º°ntbH# í,Ô'.ƒ‘–A‡g?©Š€pÇRk]•Êýkœ×:Ùù° E€ÑuÒÔwj0øç"ðŽ A) ´Z·—QJ›º£çHàÊX¦‘éñïr/ú^Áî$k2­êËèßyZŠ±‘Ú˜×õ
°Ì“0Î&Ðµ ¦9˜iH#œI„YôHC]‰>ã\ÙT3…eFè@¥p×ÿ  ÿÿì}}oÇ™çW)s½á0!‡/z±Ã¥ä¥(É,*Z‘Q¼§3NÍ™&§¡yÛž‘Á!8ÁEXq@t‚a8»A|ñ‹aäjý=øM®žzé®ê®îzª§gHÊÓ€(r¦»ººú©ªçõ÷3Å©®è4W[ŠkÁvhì@¾<›Š)c"3yL~E®a2EÓxwE;i&å2™ô¬€pN:û<Q´š=`xÕÕÐÎçÕÔO%ìÆ”·èìÍ_™îÖM Ò9Ò¨q¿æ‡Þâìä×TCè¾¢S“çÂ©¹:+nÝ8‚†tRã°šKs@KÙîˆd¶}“æ],ÿTF¹3ß”´¿­|›0´þ `­Lù¡ËÌ„ZÖ•Oce»Ô$p@ViAQÑº6œ`6>à–rïÔìUÒ tˆ,e³¤zÈU^¤l®`ó5½È[x:ˆèß7ø¦ðÙj¼›¾Lƒª*	‹:íUÕ7ÏÔùù€ö\$‚­w•€Çc‰P’”;°ÿ¨Ž˜?yÃ÷5,Ï¹ÃšÅ»,ƒš—mžY^x¨ÇÞÙ0W:&BôË2”&~—Ì0>Ìgra­uX’$‚‰«üðÒ§zíË9¼½ k›þ&‡v=½^žVéð†Ž^Êá½å…t›£+¶–Áì=ø¯É- ¸Ø ?Ü‘›bAxy•ˆU›ÔX­é<Ù ìyÂ2Š¼³w!ßƒkØSñýD#P]°üºIƒFB#<ù;úóW yNˆ‘¼ŠXlÜOØÃŒ y‹*™d0¤² úgŸ)§/¼ TÚ¿p}UcrÃuV¡À2Mx²(‘EœÇ#Ñhß£¦1‰mWNkDçÐÿ#YvKÞPÓ°Ù]ŸOuxFwÜ‡êå——ÛéÕ‚vû9wóþwr§ãmR“82ÜÝ*AÑ™	×Aú¶ß}HßÆÖðï÷ õF¯Ð.û¾YÇGxáìúÈ"Ö1H¥Z’÷ãGJ›µµPÞQƒk¶h8‘%Þù>W¹Šc
ÌÊË+).7”–CÜÌM°Z™ú’ìÕ‹Ô
P7¡9—²nÃöšÏÀâ&µœPÚ¨·xîž¨À®7?‰Ç7êPhn/3¯_ 	OïiÛT=
ƒNñ$½§¯gâ{R9Op÷YÞøÌ“a@Ú§‰ls}È^æWƒ¶UŸ-õªò‡È~ç®÷â³,«&‹$–ÔuƒdB’1woñØXêM•+æœ.0­¾hç€É—Q’'2N˜‚QFÚk<öwéò‚
¯Ù„Bj€ôCb
«×€Ud0;7ð@Tþ!ƒ 6É©ò—ÈºÖQš`Â©\¬N=ÍÐÞ–L\MIýJˆ=+€=Í~QÌ†¶JŒð…nŸšÝ~Í§°W·djf6ßYç53üÏq…39¯rÞ<ÀóùceDS•7ÛYƒ“ƒï³YçVˆ“Q×gí1YÏñ"xìjÛuIU}I2×ÿ¤«ø«N¦rùÕ¥°NÇ'mÅ5uì,8XýZÚ¡”PM¤ò¹ÊAˆ­=jóœz+Ò£Ÿ½½`¢àb8ÿKÒ˜%…Œ]?nÌ±ñ ‡ŠøvÖq—uÀàÃ6qgQ£jˆ²]¼ÌÐC†ÛDP‡D N}ûžÃÆÀ“iaˆC€Äÿ*â20]SÀ¡‹8Äœ?b®Æê¡{¸‡KóhˆNçê[Mü6S¢õ‚C[L9rûŸGÒ@8üúJÑpÐX81>gºDB,Í÷yV^üTÖM&Õu­‚~ÿ¡Ò	»ƒ>}˜ü·wô]Yô#ÿ¬å«É—âáP“nß:ôC¼;iÞïH|¤ßðéÌÃÅu|ŸÑV¦W#ž„™¨e€bœk4BÞZšÁ£Ýý|f§î±WÎóÙßIâÌëÅWç¥îÖ¼Ý¡ŠMµékì*©6÷j³ƒß—ÕÚpâÐ¯¸áQÝø™[¸àÇš/ßZ»vËkîù	nQoAÖ¤–éÑðúAäµƒ_úéœ~È\!å8#ä9–ÿÌ¼Q.;ÝÚ"{"‡›ø¶PÈªÊeÔTv'+êÄ3íž±|,µŽd]F²mEê¤ò!îòÏk¬63Ö’“Ikáƒs¢…kØoz),éuåa1‰«>¥%£ƒ&¦C‹ÅTÙ0¤Ô‹-•CôÊÄA~þèv*¿=’ƒyóƒT4¦±kþ'á§¬€ò^Wàî7k]ú¨ÅŒ¿*lÃØWÇ+œpÉ\‘ÉÙò^¸I~’ûsÜ:Ê 5f¡“k”å¿f°ü¥Ð÷-ß;;ùêpì¯ÙeÖY—Eª5PLœž¸,ºN5«ª5
¼¨ŠYQ!ÂhFÆÝ—àÌ¬H”÷5Öà\C;AuÛY Ýhé87=æÕz]0åtk˜ŠoefD1’¯ŠÝ›Ž:’ç­³“ÿH°»÷_‹€%8K¢û–7l
~³¦M)µè×¨¬Úob·—ÓÄÍ ¿J‘qª÷è*s	èßÒJ³»Ú|áíJA€'£ŸÍsæ/l§ðŠ[œâ£qƒWV	TzVøÒhùÀ9ß˜¢AŽÿ=á’ÁmºÁõ0ú–'`·Þ‘B¨LÈ}5Ÿœ~GTÎJºS—+#Ly€È€Ôà5Wt;z™+ç~W!040ÉÖeõUNIÌ	Á~Õu/Kâp0ƒHp'åám¨§\ÈÒ¤¦ DÃ€A‘à ðUüˆ±°9²S4æ¾DvJü¯Ú c-õËE0<&f[²c'%a@+zÒyu%CÈÒ‘úÈL¤¾R_ÅWbÜ¤ÿuy¢>öjS&ZdUõ*"d,)Q–|Ò÷‚³“ßŒ°¸ðŒ²¢µEœq±––m†¨Ä%1.fñ£!s¯ìTé¨S¥£û¬TwÐá|{Ñ§z^¥”¿DðºÜÔ,œœ*'§ub3Óó4Ë<9L¹„Ûj®™„ÚœûGz,lnÚœS¸¹x“Å-Îc«6Ž×ÌÚbºöö%5 ûÂÓëÜ‹)Ñ]âeÇŠÈˆÌ:cmEfx®Bƒ 3ñüO‹áF“Û
&á#¶¡„§¯™ýŒ7Ïd¦„­OíNkEJ¦"®wZ´eæ`w9…S
R&`»)|jL}ëôÛK“oA`lW,Pk2[6gÚ.Õ¯Ùµ…"Ðá™›wo‘õæ 5aã)«ÍÉ¥™ô»Ë@óçÏÝÌÜI§’*)¤vÍÅê¤ãðIð”Š‡7[<Œüœwg(ÿ“×îU>Ðhñ0ÂïÎ >¢OD—¯E¡wV:–¢íâá'MtDGÜÜ*7KuÆøØÛWãp˜§oªBUJ½ ¦wGEÚV®vÓi4qÙ<;ù’aó*ÁVå¬¥ØŽ¬”ÿýø`_>±÷tTûˆ"ú'¢­J<˜D@©î–`3O¦‘¤ï…ÿ‰×®éƒaé#/£×¯Ý KŽC²aB¡îÓÑyM‡êìä‹.i}ÿªK–&8ÂE£áào-¾o±m°HÖ¡æøAÐ}N8Z,¢›ˆxó³iWÌ.ïéôt§.ºßØaYíä1ÆI $¸.(ç
Ö*ã8×nÊ&Ð(c„áÙÝ1ÉñÝ«üðË÷öL—suÙÄ/Û¦&@•A6Ð‡P¦¡	±}#[éÛøYÔ‚uh`Ê.Àx-ÀS/@¿Ø½éPwÀá	ŠdL6~,±«iqµ§Æ‹kyn¹ø#	‚0®{{#|Áý•é%i1 µræoFkYðI¢[:ý6#Cã™€É8ñÉƒ)gb;ŒÖ¾ï?8„û®’eûé‡¾2à"r›*5}m¨Óá¸K‡àéIYj‹®(TUEE°åfU_kìWylg[…%E5³®ß¬¢’‹vw¨¥´JÿÃtì±¥…]°·‡¹à—t!a§ÿ!/„Mh:«ìÌ=X!` Wé¯ÖóíMv©òš¼Pe™Œ1xC!¶#ä¯à}õ­ÃUFsüQ}4íWÁ©w8d¿ŠG§vCK+#¡‹ñå4….V°pj‚n[?Ê‰¥ÉD@±}• K¹qq `š•ävÉÝÇ„cÇí"æÆp»DšêÖ«Æo&vîKoÆ½Ð¹7-²é¹ ßb¬;ÛáÙÉçŒÄ0X±Å(k¨yLZrR)À²w¦LÍ{óÕ<x©·¿;}Mx˜H+ÛàçOV-Ê§¯P‰+.3ÊXåÌD Æ6b\±$!^z’ÊO' È¾nö÷ßÁ­ð9Hƒ³“?M‘Æ.
Ò˜JdP5Z×m‘å¶(Âƒ•cŒ)¹U·-½ÒãAc$Ë|ÑL;á¦Ðf…‡¶‚³©FyT³Æù šéLÀB]Ñ-„ØP9þ“Ck¦XV—ª„7‰=â	R{ïT.B›‘6u1¦³¬™d+Þ¦ëyïÞZ%@Aîw£v»`€GÈ£Ó‹`áÉÃÙ¹ú.ÿ;yŽ:sKÀˆ,Í“ÿêV*øñÇeîû6Ä]]Fñ¢”÷N¨^Zƒ»¾Ç•Æ‰DŸ.s†l™mÎ:Ð•î•1ÌY¶]d´ï¸f4‹(˜ÄgÚ<+gÜ³A…ùíËI¿ýr°H%ªƒKUP|>ÁTW7¨Ý÷çÿ¯«ÕÇVƒ,†–ƒR¡
ÕÂ¥êËÕçÖK×_£d	pAù¯Ú´¬üm”-úM¹™ù­õˆ5¿£Öû:×ú¢<a†~:ïr¶C}¯SQmuu½®5½ÓºÛÔµ—¡îöÊ*ÙîE^›¢Tª„¤sHÀ6r+¿51­b
pÅuÖÜ‘Ý™ˆ’×’^KVH‚Èï°€†&`˜¤×HÂ<æPÑ„…œ€jò·%RI~Ä
©d}o/ô÷ØR8Ìò#¿yÛ‹<Ià@6¼Nßöºƒ¼°ÂÁš)×Íí5ã©å¨§ÃÃ³“ßpÖ€—¯ãhòÏO¿#ƒøø¢O^ ùh>ß}tvò¯ôšxûoöø€pÚˆd½îˆ¥‰Ï>yBkÿíNdŒ9ÿ] |È£øUçq¡Ò›¸d#Æ-Ü†wFÇŸŽ8«9÷+÷ÑÒá70µ,Šj±+vÌnXŒá~Eºzqþ/œ_ôW]¡¯Žþ¡“GÎÅË(êƒ8_úf½ý›®Ÿœ~7î»ŠÒSðtº{|©§é’t R»ýý7TÜßü)š«þv±'õìäß!¤ñÆ¤³ëK`PAß«E9xSñžTÓRÆœ©Ô	šH+P$£»ŠÖ¬ó.®–,Ð¿AwgÙµwÞ3 2MÝd+ë¦µêl­ Lš&‹úÙsäÇ„.°$-ÙoË3WQNÆ”ç˜RUŽã/WÖe¬y\›ªÇÕÝåäìp’P`i/pN#ý-çhrýen“kNlb]Å‡R Gl®±Y¢»Žfè,P‘G?¤9p`‹ÞÞÍˆA³çV7ðŽNC#N¨f+˜ACGˆ®ì/,_Oô¾eVã±+H,S'ÖžZA³éwIÐHóQ‘é,qò’(×èºÄeà˜iñþ«3ã
»Í÷‡›°Àƒ¬Ó‘Šg6•tùí‡òK„V~;£á¯;¢&:âê¢Ã6¥#²4!AöÙûGlûêÝëå<Û£Žÿö™\œ“È)Š“ÒIYŒGìIŽÿÖe:;õËqî»x¥¬þÄc+JÕ²:«Šíªœ´2›ƒJuNUâhw¨s!í J=z!ùøíï>¹íæjm8»šÄu“F{{ ÀQ½ö°CÍ&áf›¶[^’Ðµ%ÒßY¸*Mä[¹ÀI&S»…D(šá ¸»Ïh/~áµÛ~¤o{œ¨6­àg­j´r¨…B¦¨Å}ëRgŠüÆPa±)K-Ù×}ÒbÞ©ÎÙÉ×š×‹“¯v[§ßvÔZÏ‰bÕ]%ýˆþp9KÏ*l{¡×è¢ÞÂ}Éa¯#ß
øô^=úá>½[®ÿF\C…Ä–É
Ca£³/¥:LãÍÀ^Æ¥Î'¼÷Šlœ~»jß­ÖüUfD¢]4GÐñv¤R½´éÀøMX{o‰Cúç°á×jƒagžìðJåa‡ü„ÔvDDžg{ÌÓ6…œŽ{ÌÂdÙ(¾9+í¹ËúDÞƒu™>è¬=?Çüî„2‘òw*¹¥L¾¬NÀg'¿•X‘!`lî­B$’ÿÌ<¶¿çÂPÉÒx‹ö_$ÊWUQž¹¹`>m–=Ë8å:ƒà~F‘3ñi~Èìa“œÉøÂKÉßk…ÙºeÑíª«mžjÌ\M6Õ+¥tîX²C­–¬Œýj¬õ^…\	Ýï½HÊ/ùcô”Çå‡¸Š2‡ÇÌ'!T á1½õ²U6(›LØÛ7ë;~´ïSÃ4•«1Š’%Æ0îö{g'ÿLß¿[¯2Ñ€„kEÓsdþvŒ‹Ãïfž©RƒJO(Ø²Y-úno?ôúÙµž¯îˆyLL`•Ùý ³2{¢ÕmŸ^	yW¯ÁÎ¦¨Dr, =Kè9Ã[;v.3¨#ýg%Ø–ÄÄ£É4¦í³7_BQÕ›×<šÌŸÄLóÈ{ámX¶R/ÖG“4M Ët‚ÄÄ$À8qbØ>­Ð?•ÖTå/R—¹¶Êd§N ®J]
?À4§ÿÖä‰7_
L±;»Êæ¡–_)ûÈ´Øê¢[±ø¢,‹º\Q“´\qvò¿²xª µk“ys—Á¥­Ž2­ÅlûÛ)_%µs¾URZÈ{'¯ÈhŒÅ%;ã*.Q—}]EfwXA˜¹:êšSuÔÑÀÛõ…3k§„Ì“Ù{÷V;Òl.nn.Òc– Í. 	»ÇWK£ÊšR<“Êg-ôÜµ–fš°}þ	ÛWEÍkDC¯=ZM´áG×MãhŒ£Å%[ÕFÑ6zA7•†®Ñ’ Å›DDî±èUŠÒi²a´6÷Gž™üœg‚ÒÃß¾<}­AT)x+ïJLMä®@D­‚WÊQcWœS<$¶»€€uiÕFÓâ‚ÇqÆÒÖÙÈÑ´xZC§É
×1ÄÓb ¼‹MKuñ‹¥ñ_"eugLM•7WkŸ½ùª«Üÿ2„×¢/Î­!]‚c¯Åë@’ß7­Mckåbk©ÂgS`Í0G§Á5yÿ&8{h-}Ú4°VpïËX‹_ë4¬–ýzlaµìu™Ckãõ¢DÖL°ÈÓ°ZrÞ4¬VqÛ¬ï±[f¬a;á`i	Ø1ÆÓ’¢ßw"¦®¾—r‡Øw‘Úr‚iòI§m¯N$’–Ò›Æ#6Æ%Ëç.?\Ü4Ä5±—éËlÓk…-Õrn«ô<å/p¡¬7;AÜ&)§ÉQ-ðïè<
›½&ÿe½Ñ ó¸7||ûö:ÿí>Ì¼®×ÞŠ¼ÝÝ¹¬ËÕróà±6õ8ò¸J†ÝØµ9®ÝLì-yTÙƒõÐ÷HØYÈ/ ”tÎà5J«ˆôú…}£Ó…=œ4¹XÏx„ÐdÁ¯«_£=¾óq©«Tf|®“ìÎînÐünãlz]o­‘†7®ŽtÒC>Ö~ÜF¡/=Ïcj~"qMŽw­ÛëúÒ±F×ÔTq¶µx\¶$*‘¢únØ2M?Rª8yƒÅ4Êwé=°©‡fÖ&²-‘ÖãxXñd*ï%F“Ë½W€¸XÃ6 .Ñ¦$¹ÀM¹bˆe%É#q°705*SÅ‡äŸ ¤Q©DzQ]·ÆhS‘¿Ý_í'£o¼ýu—ì P×‹Ó?ðŽ
Îq×‹›ÉÙ‹q D-¿c|¡C·üé0þ¼G…ž	*	]íè²Ñ	¢GŽr½ÙLÖmµËd>tš«*[µ–q]ø½ù¡ê<)4WÂð™Eü·f_ñU-'¡Ó†IüÉÙÉ·ðŠ{à-ì!ir­	#+(O·hJø›QJŸØÊ¨š¼?ÎúÉ~XôÛUOfçž.}FVÉìì1î>©í±öp†pr9º‘ˆS‘†¾v"Ôå˜¦mnžÌB¾ÜÂæ& •ßêé<é|Fb
IåÉ±íPàa¦—µgïÑg?^xÿ¨süÙ
á©äç†èî¹l
°ÚDZ„·°sƒßþºƒfuh÷F-mÉqôteiåê<¡?¯±Ÿ×ÙÏØÏ?cŒC¼ÿBéHâº?Œ]÷‡
càñMú…›Ÿ{ŒõÃÅ£¯_rŸåw|ñ9ÓÒs¬??ø¥‡;¤/äâ³†ÞaÌ–Úá¡ªU²¼BŽçIí¿Ì“€{Nò²¬’Öû^“åaT[¡’·4;7ÇÖ©Îˆë”bn|çH#?.Ä…³UP']4Ý3	ß`µÎ-ß-ð¼%‹… ßÄ/ä¦e\4‚Z ³®“‡e›’¬ç7Žäo.—mzýøBú;âÒŠ,ã‹&H±Mˆ …Ñ$Z¨B|Ðí€©=àù98©3™Èˆ_~¸ò²¥97ð’s¿Û¢$:ìÓ¾uYŒƒ;¨mõOn¯’k˜«Ì!yMaªŠ’WTVº·¼¶?Àì†½®lŸeW§¤›µSóëtßßó£:»b—}GåðvâQ«=yx{nl’ý(%‡Ë×æ—––ä¿óJn´ðàã/‚¨µÑët¼AM“ÕÇþ¿‹+«¸Š¦R[}6PµÅÿ\_Ü£Êë,FSœ€c$O‹ÅEgÀ§¨w¤yæö«´”¤o>a±bŸ|$)·÷äoì›•¥%UB7oØÒ›7Ž B±ÅÃk½• ’m˜þkýÝÐ´6öMµY^7 Þú~‚.é„<­¬’µGí¡±˜KžƒÞ@±U' l	O&È°SÑîË·ÚD…Ùôì„1Dâr#dWËDÈâš¬Ns5N—§¿Û3æ‰“¹A(½\ª9»ÃÝ íoõC:ƒ–Ÿ†?IÇ×®¡âkDeQÏ‰xYE+z',>¿¬v™Œ	 {Ã¹QK%§t\×ÕVœ¿{0{ªÄ¸^‘¼ò60AÂv\Xc¾@ÎH·Èûƒû~/Œ’uðvàµ{{?ëûÝZ¢¶^”“D3ñÕ—IN2ßgáGrç á·+[3É&IŽ‰!$ç^HÇ›We)‰ƒÃIêàÈ“<žJæ7yÑ–(Uõ¹Æ8K±Äñ`í­aûùmÆÐè²£ó#Ñ
x¾›¯Ä}ï7S™õì-³;i›ü-à?ÄÝŸÈgàþKIöQn_¨Ö1ûöwTmeLõz}–jÏ>ÖÇÚû…z<÷ëÒta,+¿M@—–?5yY.¹L®·Û£ˆ¥¯Ø°¦ê"Y±Ô­·ýBTtt…"#|L˜¢¸”¨r™Éæ
fLÆfjë}joRi"û×íÊk{ÕF¼A¯=Œ|Òöw£…+$êõ–WÈBz]nÐ²4 †„_£Y»íïP	løM´-Ÿ²Ï·¡”E¦ÙÌ3÷+XCµ¤ª½m˜Æzù9£f*N 6ä8ÙNt™¢X¦ÄAÒT•MÆ3¶d—Ôè©P‘ü//NòKÁT‡®"f=·»7fáé‡Ì÷hŸÆ'¥SÙ©Ö‘iŠÌ4EF?ª[²Î7eæZ².fÔø/]ˆ5ëâæÖØ‹üË,,ÓŒ1/™EëÒsDo¸ãdTk•Ë$UcªÆSXd†Ù2äãƒçº  pW¢‰¹Ä±k°`!šE¾ôäøT_N®ÐãJ9c^ïÚxE•V“µe=¥LÅ„.+¶Òc¶,r˜¦ë +q%XÑœHCâ²aç
sàcûc±Õ„<Vì“ê8ˆfn§ò|s¿»ÛÃ’$f«Â®’ý…þQç.JŒ«mÝòš{~â©øT]izááLJö ú q³¿—õÑSÆ¹qçzÈŽÉöÏ¶×Çw6~öøöj	gO5®çWÃ.©ÐÌè£ Á	îäŽÆÝû¶ï<¾s»Ê¨.ùtä-Ñ öòô§y0ˆLG"îN8q‡kÚM8Ù.øE—™_ôIàïÓ)O¢ÁjÑS×ÉÏéRð)‰zdÐêíª¸ÕnA˜±î>˜MÅ13h„½vé>Yè0¾ÄºQ%¬£X™ýªúöÛ€ûz(±$‹½¹Ü4Œ›[ÛUÄ0P$	|ˆ	S‹Æ¼Y¦õ4Z~ãùNï \å*ó}KXFmÃ¿Bç ×€'©ÈÅÞúAÛbGn’%X5¬1=ëª‰Wt¥gÁwò+ì’$}L<áœÃõÌ¾ß2=h-ÿéÀ,¡Ÿa=hÎ¡=	Ôò'~›J{%Ý{ú™Ë‘g"Ù³q!G¤¢dÎº†XÌŒÚùºdzS£«Ó
xˆ½p¡ß˜2—²ð–yå¹nÔáfžÕŒÛ¢BUë‡þféÙ¾Jfruvž4ƒ¾|zÏU§Ôé—}Ó”}Ÿ&`2YˆcÓ§m@øšpŒ3à‘k,JÆÅmàå*d‘áú“µõ0ìíÿ¼»·ßµX¢Wœ,Q$_úå_‚ð¢I1ÓäŠÄ˜Ÿp¡åXÇ‚wkáq›Jó» Í¨¯(’f~Â»+ÍIiÏT šÈ]4yyF‘DËS.…LûÝ¦«Ö‘Ô]^‰Óê!ÄîEÛny=¾j8u!è=ê<zÔ÷ö‚.P§Ý-4çj!ûcžÍ< ·ŽDÊ›ÀÀ‘¦¹‹c#Q™r±ä:Sôcñ–e~±îgN"j'•×ÞžOÈòù1YY"?¡‚¦;ÔfîSŒß=SÚA3â¤1;_‚n£=¤ó¶Ë2êÇn–*-¾¹1=­×ëðû<‰ŸÏÅËQÊÁ‚èÛ÷¸;¨4áúx†’·àÖK¼ß{*z3ªdª‚Ã?Asð!—,Œ:Å­«€‰‚ÙðT¼ ñÉýæg_¤Í£7isgl±M‰(±d¿àO½Sð‰{N®HÔ¤(Z<WIŒjëÍñR˜
9ÆÅ=ÆØ;*ä
ÂG÷+üVEÕ1ÌNÜ€z§cfN¡ß3:ÄZí›Vñ¯M œøyˆZó–—×8”ZèP]>Ò#–]½P5~qt®î#â½Vo€+—¯ï	½®Óešîó!Õ}>L«–\ÍÕ bSåè:*­ÃÍSÆ­óæ~§èe^BØœöì,ŒÛÈLh%£oÄHx}jŒÔþýF~e©“ƒWcð³ÎèaªvïJ*¥éO´ÕÍZrª²cW¼ssQV‘æ•Nx&&8L=^ßWz*Þ¤‹V/¢,›
Q'#ÌãS	]˜!0n@{>¯Æ…—IZáJO¯½Õ÷º7Ž®ëœ…++šÇ$5Û¡àØh}ÿG§ßBqáŸI›ã7äÀ8F«Gžˆt÷ô‡çþ6íqh×:‘»Ænz·×‹ò3ž>Œ•ø(á[sá4T½}&ïóèõ=(2)áË“’wõ8ef3—ÞUC™Þ­Ë¨rétãìä÷@ÙËX+ß¾dÌ½@>[¹M½.í!Ða_TeÛI¯fŸÁ¼».=¡<»TO°æ$+®:ä€ÒÂi@ž^g8Ðƒ§Á—üÙ^£1Ï*–Ø.Kÿ"?a*Z&Ph;™ŽŽÆã¹ù¸¥É„anÆí~Hå-™GËVvTy¤íÐÞŽPÐ9»ù$.	Ô8ef¹ÂñÕuääYk«Uê€Üæé@ò–þ§lzásæ¡2ßäQÝˆ[¡-{YG!wlF?xøÈå5zeTÆè9T™6-¯€jœPà¥‡mŽIíU0~ÝeÔ"ŸžÏË€®ÿrš§¡WÄ$ELÍ¥òŸËJcÌ*¡—žõŠäÄzfÊÖÊ°ƒ**„µ-*	‹©z»l_0²1þ;Z;µ>|¼éE­zÇ;¨-Ï“>×Y×"Ä"°Ñò_„½î7…`›ð~.}QŠÅ«¶ˆÄË{gÁª¯Ý )aØkU²Òg%¨£‹ëoÊcžîb”6—”JDQ¾‡à—Fc(:ßC'ÞK¶‡ñè–ÍÄ£'AÍ‘TzñÝ3Do²¡Bš7’·V†Nx®°×†EY´k—C«$²’Ì•@NW‘ÎU+°ª#¨bNÌÚnÇÀ4èàPÙm‘ÎÙÉ—r[c#CÁJ;‘š…ýõ†Œ`¼}ú‰z§ o™·¤™@cJð&`"ÿ2¢ê7~ì²(<ýc—Pmè7L'zÙÝs¢Rc€ªÌå0	[iêàÑ.‰|ˆßEáÐfØO‹vÒT09.©§Qym•Õ“àÜØzI¦DH›
Û½t-Z	§IXòé	-tÓÍ=üÃ”	"Ñëp]R¯9+5.]„ƒ.»lªëyí»Ø8ýðÆÑZ;ƒŸJ ÎîÔü¼Š¸FÖFžß
ÌÍÄZEç–ÀÜÅ˜³z¥·˜
¸1HµØùçòt@ªˆë© ’cùúTúëíÁÁ<üœ¯7/f”d:¾zð1’´±õäë‹q˜¸<Ä…]vØÉHF'r&„Ô4,F–W<¨Ê|5ãÍgrf¸Œ¢]‘68w¨²ùc‚Öˆô½iä4¨¤Ag•ZÝà!¾Æa—ä \IV1UK]qÁVâwÅeGg.+£Ûéã	ZÞA<`8õ.Õ‹E¯HÁ“àÓ­ÓÿNªBiturëìý
"k Ñýšsíånpvò«arqãôÿAäôMƒÔè“ýK \`ô÷ßÓê…suù°ê`üÀ‹e^W.“nLxe2°Üâ,ù–šKÂAñ³¤ãS©Dt5\Jž)ÐÈ›®¬eJ·à&0¼;%¤•kô´èÃ\eO#¨6äl^‰gsÖ	¬j!°Æ)€Ô&Íè%á`5†8áBZÝ•?âåS¨_lqIÙ0°Î<	º­^Çi—šä‘>ÿÑß,/ý]üù]ÛèÌ¾qJMQÙ)éµnmYc”æ2G.Í;¥\Œ”l$mv™¬UM×±MØ'l!]$Ÿ´†äP–—˜´$FÀÌˆÎcÎ–c3¥›~ŽÛInbží‘žàÀ½ãø”`7èžõ[ ‚§cÊ€¦$U´]91Ó5ƒn“U“qPd’ã(d/NÁÒÈ †¬’JHEX¼ƒã›ò¾Ð¡F<ª;@aöb§‰ì¶”\ø™ÿ Gu­€´Nÿ­ÛªvÒoS{¬xÊ³3Þ	ßfCù˜ñ`ióùç{¤Î÷HÎ÷è‡0ß]Oç.'C»Pú:÷œ‘Xnoþ+«ˆª&çº…çÓÓWnËAú‚³/žÜ=|±Ì(Û‰Û²wp‚ÉÅº€P"5*ØÝÈð¨Þt~DådDdÔþJJt¹áfJÍ®úB\ƒn‘ÚgêÕÂ²Ì\ù‰B™Kµ²G _×
d5º±­€ŒY‡˜‰JU‚¨t•ª,©Š %jù=æ²IÜ;-º¡þ{ƒtN_—ækYŽ©5ù
gŽ2+›d¡‘ŸoÕ;Ñ¼ô%{Iz—G®×WEëRŠy&ÏvòèÊ$ËoÐìCjP+×óÎEÎ¸¥²Œø<]¾ëä9Õ´¸m¥B bÖÞ¦×¿ßè¥1Qd‹1fƒm:Ÿ4 †à'Ï¥wa+ÎúóØuf;)A2"î þGÃnðOCÿ±ÝúNLo°ºK(àÎJ7VÑ>ÏõŒOÜj¢œ9]Kâöx‡~8(\J<`ÇBÒVœÓµÄ0(%–“	õç¹¦ ­¡ÓIÕ¼HV-Á“"÷ªNîø¤å‡þ<	¨’ÙôAù%:„vlQMÍO¡4~œ½gn*.ÿ2^­°´á9i“z!Ø “ðÓßíüß9¤žÛ)LNÅ-{ÅÀyÄàN¡K&žciíÖ0h7©Ùª#VÈÃyr«%3Õ*¾“«ìÈO9mï‘|dŸÛÙÜN"s,é„‚Æ¨'›©ÂžäÚ!iºaqÑQ•z˜Ë–aûty¹@M¸šÊ²}qúÒoþoé³.LÇpÊ¦µæé³¯s¿/ŸcëêS=‰[KXXÎæ:füQöéÄ}‚¤×÷»®ŒÞ?ï7éå\ÍO€@g…ÿ•õ~ÑéˆýŸe†ÙÞKe¦º o8ò[§Ê~2“&½L]ÏAÂIà6R."×dT	øH"š¹3Z#_œÅbñ@Q¹ <Q –ßûãâªCv;×|=L®ÞÕJsõJäé£·!²Ûèázå³óÔ|²˜ø$x² ®(xßÉÞñöåékz64V6ëÎ=ã.½N÷!—NÆØ±9:£Çè'•—#8õ)/ˆ|—ÂKÚaß09A¶Œ':ÞŠ=!ê†™e6UvM§T›Ò‘ô	ÅÐ³ù2xJP¥›e²kîƒÅ=`=*“w‹Æ;xo°'ºG…¥V“ª7Jô®T¾Û…Çk;vG¾'‡*ÇÀ¼c˜=	±;{˜û,„ªÑÂvDÁsi%Éh>uòTMEyï¬
_ìŽW4x5áoªÈç_2²"¯gVN^ŸWãSUþÜUù™×QÏ¢“v^=íjðª°^E>1QÇÇ×¦j¼vâøÔxžÁ>Uâ-çNH‰/>«8®ÀÎÁi´Î0	h=6¡@™e,Í\dOe,²ÚlKR`ë°Û¢³ÑkúVpY®Eã*X_º	’àèYJ£]!ïgof*\c2›=~EüäíïÎNþ ò _fóôµE¦ä$xÅJ¢‰KÎ(ú§&T\|t™‚E•ã{c!7*²¯¬2Vˆè |zú­7‚„•"\5@•6¾ƒ…/ ‡Ã_Á\èdã»
2FáH*½ÇšéV#ãYoû!è²T3×íÊ|©‹âä.ä&‰T•'m†;á#˜àjÑ>ˆ9[áåmð{§ fžÌ£ ÈwH¦øNt©ä¬ l1œüs™Áp0à€ô[ ÕVÎ.wµÊ5íZ}x€ÈuÂ-+äkRæ:S®“œœSÅññÍ{g'_–ÁÉ2¯cÖ~0AËèëbÏœIïx|·[o·ãOJ6³é¯ðOà¦c;iØýÚb‹åÚ˜˜¢²Ü‚²…"C(SdeÍ½I¼aÔ#tÒôÚmHg´€IZ‘®‰ÂàšÏ[p‘þƒå%ÈI‡Ä£â’ÂZ˜{F¿ígãÆûY’õSS.ÆÃù™aü4ë­ƒ^˜|C‡ÞüÅM\ ŽhAG'U|És×RÏÎ2XìHµY‚ÔÜ¡§.4¤ØG’¹@úãx™î=ódMÁ2–^ j@œ–õ†À<.	Çû‰Ÿ M:ŸŒeÇE¸p)ËÛGâ¡W5ÆbÞl^kJý+Kõ¼yú:ÆÕµq“£ypˆÀNßãð_O%¤øÐðÒ~x"Â3¢¦BR|$9€?8o*Å‡_¾l2êprkãáøY":½ªú$H¬BaÑŒúÞÕ˜‹W‡bYž”&m^‚5<½_Ÿs4™´x,£˜´,ÈÝgAn5¦Ã&‚œ$·àï}“ytí!ï³+èìWÀW–fè20“_¼²4süµ,Œn3“Æ/WcÙÕ\.m0OÄd.6šõ·ŠÏdÁ®ÂÎ3=û¡ÿzó´^¯ÃïóÌ
v±GKÙÁ¶îÀÿuÎ_Tšð	ýùÝI]mt¼½ì@Ó‹.îwâßÃ•¨›',~®ùœ¯<t¦ À°Ò
›.´ÆQ•DbÞ"XßÇ”Ý;™³²H»©h[–ˆQI“Mç(‹ë<¸Ã]…ÑO*ñ5R]Î&è'P(©Â£Ï"[@û§’jãÓ­èî¦xE`§˜]˜ÅÊ¹§'aÁ>øÂK; NI;~%ÌÌ5~µƒ}â½ìttvššæêh‘QÁô‹3½$H(´ó]Š…]ðò}/½5€¸™ftÎ‹MhŸ3‰F	}‡§ºžÏ¬7™~Çt^5Í?ußûôÌæK´<­>Ô/›ÐŠ•q!-×¯€zÉµ×e3ñƒ»g`?¦Öp¡aÍFëûo<r 	Ýòy·å âLW½âU/2ýNö¬éŠ‡<¦eÚecXïRšÕÑ³¬9&Ò5¯€§+)bÅïãõåZ¿/“­C³sõ(:6 §ÿxUÏÞ|ÕÝc¾*²1£FÊøÁÒÄª¸åvëìÍ—ýÔ]%ä¡
€èzOqKÞ`Â†¨m,°¡äiËœn¸VáÇ¹>ùq¤ŒßTü(‡- ¯&OvˆÂ"-Ü61ðv¡Ô®ãETz¡¾óõè£zÔ»M¥ïUùT|Xƒ	×õ÷	ÿcžÌ6›‹››‹‡ô˜ð@°`GüÀ>uòÝI"úÝ&W\|2UìÙ¬g.ëy’qÊàª—ÍdªäSíû²ª}/ôý®^WÆ?º¦Õ®Ç ™(*ÏCÕJÙ˜}žd*éÏÀÛþŒYéOAÁUµÙ —º!¶àLšâN1ê‹Iâ©XÒ²†*`ŠjßI‰a­K÷¾£÷éyÜšÃ=\´Ööù½BÝÁ“©©+x©n!ƒ«
‹°¸XŒ1?&÷CÞó6fÙ¤¸áèwä«KM³2gGo–']{skòØ}rBVtÑƒ¢Và3©åÍ…X8sYEØ1©¶«ž®²v1]¬¨NVg.ç·m¬ å…;—qe.Ÿ8ºŠñþ®äÆ™Ê•}}ëÅ”î…^9=)Qø•P7¨}øçÿ¯K:Ã³“—¢$-ÉôL%4ùV€‰Sa†HœFÄkË´*±+/ƒ/G!?V£rf0G¨!Ë´xjÊ¬}O™ªákuÕBÃÛr¶æ¬ü³•ãOK_]’±Ï}?sÒT/…ï›ÿ‡q$™«ŒX%4ÎR_Ãv&9™ûzí-ºxÝ(ð|D> ¦ÃõT$úºpÎðèÉ(|'1‘q@üéŠ8•½—Ž~U÷w–ÅWn—¥‡3(MWÜhW\x+ó0¶\3k}L0~ææ'bgãqgo¾<L¶OºõõÖûeo*=~ÙÚí×‡l+ýýé²8×ÿHtvò¯°ÑBù.'¦cÜí³“ß6zá0Ò`IãYMl¤’¨$bqZA1oñc2NžƒzØ-/,`EÁ„_Ó#b*FÙšá>UPh),+Ì‰$Ä,\ªwÙ2Y¨qAå^BVÐ 6Xí^@¼.ÎÏA _T:=²²OŠ"4qÈè´ B²WFw³œC‰XÎK­Šy¤Ð+ö$ån¼¶S.ÛvÙÜ²h‚çÎozQ«N­²Ú2UÚÈY¶íÝÖ*–ÿ"ìuø»šñ'ù@”a‹pÉŠÂï¿9;ù¢a™â¥ñÝ{áf%iíQ%áÇtÞU }òúòG{÷ü•¼a,YáŠIÚÆ¸¨=Ì{ÇQ½ä}i%ØÊ'×²Þ8ï;Ã ¯©l[Œ&Ø|¸ƒ’NØ.}gp­ÐkŒ{ÐšJÝ%hÚDÂÕŒIaâÌUœ–pk¸Í²Ð²¸f6QÈ.òôr½M?@Ç,,³Õ:Ky2èqH¯8²0#ø‡3§W¬Úwš	·ýÝÊ-Vt'ó½€šyÓ:M‚…—¨,cN~œ½ùk‡d¸"Pø²#ÒU…ªÚFLmHÄµ[:Î4ÕLíÃÛdüÔœ(¥öäö*N­?u	ÝÂÅo+õz}Qc•FÒå\ÕE ºêÆÆ	¨ãéVHNMÇkq%ƒä's»U}ÔÚi™åÉV,û´Æ\ýØáRëe%q´œPðÕ(Ùçå§KÕ1jÁºž‘)øs·vˆÇ¼ž«ƒ†×¦fü52
ÙìÚ£ö0…kÏø¹*Û:ý£aåCØÀ8gè1f]±G]®]X0½•â°Š:¾³|bzbÉUòàÒæ«¯ðÀÄ\Uu²yvò/ižþl›ï¿ùþýÿìäkúsYðM0M€¨s ’˜pëÍ¦&V™£7F„·›B÷Å,YUM})â5Ì9ÁÞ¯ÁÝ½Ð÷Jà|±U‡®á-ú|×Ù
 ouËÃ‹Óœ¸à:”™ôú¾IØ^ÛÛÝ¥û›XNÕa55|\«yji®
SX‘ª_©Û¹þ¡º­ë_«™Û 'IƒvU pt{¬Ô½}¿™|×£"D‡Y¸_l·¦()ZÑOô7ËK·Ý:;ùŠ!/Ý`HM	]‰.ÔŽ®¿Ïç¯D^œ-Ž}¨¶“­‹Eµ[%|Âž÷Øb3£ï’“€ª× Àé"GÅÓ±"+uSVfÕœö¬Môxì<Q‘Åg8¢88^ VÐ>ýŽ*ÿøÎ»D\ £nVè¶¿ÿf¨lÈìñâúÃÎgÕ–ªÆ&-pœUå²¹O¦Dë;‰ÖeÑš;×º±îÍ´.˜e/Íº¬R½|,ë è|N‡¼»×zûµÇM–„QÌ–W1¿ú˜Õó¾®˜X½lLpÊ’!Ž\–¾§” Éà¦92øëfMÇ:Ö¨ä,HâŒ£Ì}¡¤M(L§ßzTY‚*¶gœ`ãýÜ9ž{fËC˜Rl\Š}åž2lL60ý(áÜ6’hdIìíÆäË°Î¾xû5=ùEpvòßJR[N)4&G¡!7¬²™§Üé«¦ÜSîŒqsg(v{iú£F›Ò/è¨§>¹„|ñƒÖ2èLáDy2’ŽLi2r‘Ëé-€/Åa|Ò»^®zéFâ@È†/’y5(á[g'/ÁÇvòšŽ‡Ìí¾0Ý›­h],þÖQ”`Í¾CíÅ E½½}?Ü ƒU›K ´kjÎ–ñÜ¹bSv_ÈŠ®Õ¼y²ƒÞ-ô"²ë5¢í®}á[¦kÞÂ2fë	ýhvIÍÓž¿Ýƒœ£^”½ÚŽúù±è‡½u§+Œx‹Æú˜©8Î&È7*¨±Swð°r@pz£ŽËÚqù½¸v­”?QÚbáLþ„°
X~8ª"•Áó³¶!úá(ÓÇd4tq¯|=]åxL;8Fí‡£
à~8Œúp»?tÆî‡£~¿µW¹þ®æƒè¤Óùh(8j³ÍàÀ—sÀŸµ&»“/E¬Úîøb&às5ß)å¿(™)åïgŒY¤O¹ˆ´7e¾²¤g¼qâ8¡ ÊÃt!ŠDµÙfb&áÿ  ÿÿì}ÿoÇ•ç¿RæzÃa–3$G¢¾-EEÒ!QVÄ‘“]¯agZœ^Í7O÷Hâ1ÖçŒl¬}¹ ‡ØñÁåÖˆ³I°ˆˆÅý0Bþþ÷'\½WÕÝUÝÕÝ¯zš¥°Ëœ™îªêªW¯^½ú¼ÏËx%:g€µ OÍQ‹…ØÛ'¸%“þ¿,O«	¡•­;÷8êÁ"aBÉƒQY$\*aäÈH9:ÂÈò;¥q$ö@I6\ŠdIl^I:hW5>rV¸$%SÛH¥’ŒV{6C|¹Òø ±´â$7¯”2¬‚´ø¥PCbI;Ñ†x.[Û ëxµ#{zt‘p…îd¾8fedmÎË¢’)Àx±Á”ÖåÂiºµ
·¼0ÜÝ'¥ï~@4Ê<<d>À
®ÏÜò—À`(F *›Ž¸ï¬(ž„JhdÓŸ€Æ•Ø¨­©©,ÜÔX¸ÀôËžÁ®rY<±Äâ²QŒÍSyôD=±ü×‚Õ®BR`„9N+Ö02c¯˜åSiCq¦O¥ÂlŸêô—Óó}*í) EÛÉüÎøøèç-¥i~öôøècæ€H:'_ºÆD:åÐuâ»LIÙ©ôG‰´XêÀ²‘ÚuZôÚ¦jT>{'¾ÜTžj	…X<ÕN|Saã¶ŠÁ;IÏ“ÛA9ÁÌ%5!µÏ è2ß^<g Í®ÎÜöæR€Š•(µÃuõi?ðâiDx‹ó'ì£ññ‹¯úã« qÎ9?sn+®V;œX;
²¾Aþˆ¢œo˜rÎŠñŸ8q¾7|§’ØÞ
ºeéÓtmýlÔJu8ð³sg›Û‡½Q] ­C…Å÷r9.eJLmÁÖ6:pLRµÝÅ¬i¬3ù·~g*–¶øÙlÙÙN•j­«tT­V³#VNµE§š*Èð7™ùfi!Þ³ùÁg={ý©Í2éLŠrŠ…¹u…XL§„5¶$N1:£Xþô/ª&Ü(É.(D–t«¤1{©“=´²²‰½4ýPÀ{bç'Iåöy{ËýE*vp:^/±D	.mÀb\jwÙðpY²p¥qpÕM\½¶qCTX$É§%Q'õDæÜZ.‡sKnG–ã…©í¨ÛòmÑp—	z--ñ,RjEÙoåÖöÆ{D iÄ­2lÁ¬eäÕ
Ê(ÄªEØ¨RÃ8l½]T6­éWÆTÏžo¿ÊØ'Ù†¾æ8Y¸ó~±¯'LÜ„û sÚ&F³¦m’Ù¶íY›î6÷‘‰îõ/•´Iß*¾ÜMèÊx™›î+	Í…A*l(H¶ò¿!Ù°\Hæ&8ÖûªüM©¿—Là÷¬¼QTN&ÇŒ¢‘¤dËo4B'ù‘Óé‚%§ÓÎ~¿—“ëÁCÜ¤$<—N¨F‚ª¦‘_êô9	Ì<—2	çG«›R]^EÛOùî˜ÅC#–z-'DhÈª¤ÁK&Tã4SŠ+Sð‰·ºƒÝf7B)V¼p‘p 
N7Ü‚ˆâ04)4µ6¬yž»×·0æ„Eå.àI•Ä
‘}®o²7oŒ Ÿ’>Kµ0<'è;%.¾ËžÞ–sŽ½ÌëŒqì©ö9ÃÞ9Ã¥¥1ìi^úsr½×˜\O¬bçÔzÆ{þB¨õè¼zÏÏÉ‘ã]$vÊBN™/h£0ïÁLÔV|Þ™Úç×ñN¾bE¼„›ùÐÿTÙî‚FœsÝ™¸î¡¬†´‹ÉˆV„ºdÓßùò–WA~7c8%'pÌ,\¹|o'FÏö:’ª¡†É}ó€<µPÅ'QªE`°WH¨–3•^/:5ß®àÝóÈÔ*ÃÜŽÐÈí¦â]eüåÄ‰ÖüÒˆÖ+!H_¡YÏ1ÎYÖôë´YÖ¢c§)IÖÌÃýúS¬FX’`Íekñ6¥Ò«ÙÚ«²‰V÷ŸÓ«ùòSïø%‘«E€·Tjµt<XM9bÖ”òëD«¦œ“XÕüsVµWÀª¦ÚBçœj:§šoäTóÏ9ÕˆS¸fm¯Âœu•¢Þ¤¨ùuA^¶é|E»Šñ‘³ÂÊ†Ð_åd–­sF¶âŒlB¦ÎùØòêxµãzê|l *›_*›˜ÊêR~Ll²žsB¶´'Ë–OÅ‚6 M3dThùmwoªù¹°Ï×;ãýã£OúÌWŽé§# ó|¦¥Å“+‰?=)^¸õÏ)ñŠ¼Æ9%ž¼Î)ñÞLJ<›u&™ñ-<'È‹—zðh¤vAž²¿õÏéñÏYîñÎéñà"Ðã%AÖg”ïâ•Oå»¡äÍ•íxƒ¹ò’!Å	Tyñ…ö„óº	š˜sâ¼xQ¦Õ:"#î­Ä)\(£êËtÿ§Ã0`P„©¼æÐv b	Ž		ã$dy¨DeSG‹8´Ó
ÆÏMfZÔ±à4%,MÝèMqx`„?½ÁŸÞ2B¡æŠ’	K¼£APÞ«Õ²*‹¹I‘Í
¥U(¹©ý)2|Þß³h%Fò/~Óiö
Óoòg³è7õ%é8¡„Ùtƒ/mM¿ÆÆsÅû˜o-áÿíñ¨‰ÚûB†á‚ï<2­ì3iÜ4,&A¡µpe‘@Vj›l÷G
u^6Û.ÀÝüAuÄ½êp<vÑ¦{ê6èËE®ò²f”#èG>—AfQ×äY­½vD¢ÃÿÎ'ÑÉã½(*ÇTÎ°Z¯-ÃØÈ.»p±ˆNR¶Ór${íà/ùDd¯<ôÔ:—øý…Ñ“b\åóê˜^¿(·–•Î¯“í-û^d•"×·X¿n	³Àîw.ïÎ†ß¶FXúÔCìÈÏW"@P4ˆ:"¤‚ÏƒEþ?mK$Cª]€ª,\åñS¹K<mÔózÛÖóáÝI¯©§©:ãøÄ:Éÿ~žõ&_aÌ³'°F»às<ú]KIÜñ…´8w~Æúø§Ço!ôƒ±ãò8ðž’Ù}BG_î',ßÜ'Â0úÜ;c!«›Ï‡ƒ‘Ó3—u!+þ>aŽGT“Šì]N¢F–µcEOGœffDuñÐÇ—v‰xÂòƒ1‹o>o9Ý\$‘:ð»q
l=XŒ²ú XŸ0—BŸobÅf?ä2X{ÞõžÏ3øÿ·å=¥<¬JŠ`í#<……lnõBÙ\ßyâUùžÄÓp¶Kn
IfL#ød¾Ž¸}d>M.¹1§^ÆœÉ`i-8‡õÙ©Iœ±µ¸!ÿ•Þ¹dXàÊÝØ¸õô‰¨1`±Øýˆt´ÕÊ;.`ý2šS°aEäøª©3g_~Ö„lHæ\«Õ0bSR;£ö™%ƒÀiæåBWðçÝG=I‰ášÞzÇíÂ$éK$\ôE®¼Å­Y}¯Î3ùÝe}ÿ±i SÏ=°¬êÔÕ.A<bF3T-Ù*È@¬€÷*mïœ(Õæà9‰6:lšÍÖlØ3*t¬Ö*®hx•½Øè`£Ýû/ò=½Ø8{lC6’!íœƒøbjâŠa°‡äÓóøÅ´Ô}I¥§²ó¿îãžd®ÆÖ'¿Gçá'loòÇ õÀÚ±Ò´½ŽWeÛ|7®,àO5«^³„PÄ”GRéòy›Óèò}²tNG™%˜3»Žæ¸ƒ9¾£þWì»dúXs@¨O>‘SˆÚyå·F~6÷)ÙÚeA‰è6rÁ*5ýÁÌ{“oàáëkÿÐzfIýPçB{ÿÎFýúÒ½;zâ€I²|§1C¯x4xæ]?¸H ÉåžÃÍƒË#dÇ	ãôZcÏ;@Ë >„®Oˆ¾–?è¾žåÀ×#Î2è¡Á#ç£±;rÚÄèÚÉó^ÉSW8kûøÅŸ×ØMP^x"-[[0VºÇG¥
la¶µîäEKž#s… µoISp «ˆÌKxï«Q7ºêŽðZU“?í³ÿð“¾Ml…ˆ<ˆ)”›ÝAëÉVbaßƒ”ÜE÷ô;,@¢¦À¾ÖLÛ¥ÅäL¸cÒsŒeT‡Í×“f¬cG§»ü¬P«+Ú+YwEx˜|r‹ÛpÁñ¦¬Z­VùMþÀgŽpX†¢ç¸íÁ«VƒæÂÃ6uìÂX‹à“Š &±‹R´»H{!E?ØÝ"ò‘Ý¶oÛ<‡¬r |Ä³íÓ›|5KàÑZ^°Ëæ,VÍ Ki;Õ–dB~8ËƒÅÖ.-å
ù)Õ…ÆJé•@˜ƒb!IŒÃ4VB\SÀ.œúÖtqÔ;Å’*!ÛùeMþ]ÖœyIÚè5Ó% ‘‡<9m Èö€cJrµd¢n¡ÁŽ§M:¨n¦ÞI¨õö¢˜Øns”ƒ`YÉFcHØt´AIáfñü‘ãó7  ò°éu/™séMˆg*ORÊŠ)G=Éœ£ÁÔ%çµÎ9Ê$Éa.É<¹r¤&ó4ï¡a	E¶Ðš‰ªf‡…†qåãÐ•$­…?Iü-Ž®!ªå¬eÃ®îVÎ;Î!lN	c£t6™v—nHX(£¡™¥rw(]Ê)B é‚ªq…Ì/%zØ`˜TÄ¥pea—¸Bå#™I¶e\‘H‹Šk¥gÕål`—,@ß©"H/Ü‰ŠõÁ´_]3ÝGê¡âûU}Ò¨;zª33uóz—ï][Bˆ-y¼­÷ªEv©†ýi³ÛYm„”õáÎT‡"ÍÙoµuûMÌÎâ´ƒà±~¢×©Ò{¾å‹ãV{nŠ¶L±G.uwœ¾/N¾yøâr…Šà1_Ù?‹ïÃÏQYîQéýHÛ8[o™©›åéUÙÅ+S¨2 nMè°ÊÓk|—µ,ekêÍ•§D6ä3©ËvŽ_üvÈžs+gxæµÌªjÓk©G>•5Ve_ŽæÂòéZ«àïykåT g‚â‚sÂRÛßsz»ÎÈ“¯pOºé#Ä$î¢¿öK©h®dEx<,Oö å1{ùùäWû¶Õœ´B™ê–|¥$¶Ê‚AˆÝlÂnoM°?ßÌÙ05^@sÊEBÉ3°J‰pkÂÇpN¶«œ{¥Ÿ­©Xç ªq³l­°ÞÌÇCV´ÆÍ‘cÚÙªxˆËÔkœ•S×¸ C–{•x ÷ò3>áÅéPÚh²4œ0(ˆ.r¸@IcCö9Ûc–í \ÉèŽÞýl‚bðÄ¢•RÀä™arnÅ„1áœ^¢lJ)’vóøè_¤¤D‡ŒÔ²O•Œâ¤Æ4‘Ù¥fp¬0x±CüÆ|¤@y	ÒŠ˜›Jp‰h³!MªÞAï_³¿*[nÊXy3æf,*2Ó‹- ²Ù	æ±Ì˜
Œ%ƒ*5Tn÷å…§_1AºÍNõdDE‹§$Zª«ü4Œ%5Ø ‘ÀÖQ,ÿ©y âhw#N(Žo§µ"H ¶øN;Ü(ÆM:ÃÈ}áˆOT=Ã ÑwZ8µÀ´)D*§®çrááÍg×M¯«g˜¢óæð )ÀÚhÔÜ¯A¬k8£w¿å.àDMú`ŽNÜi¾ þþ¼¼‚åvE9}‘Lð–Ö¢Z§éU 6z?î#åF âÓgIâzê¢i9«Á¿*¥®uJ]Û“OXcsm»¬$PYµ1.`À³W_©ú“¾‡•Nööä¿ß»…µ§×¥K¢!wn}¶ÅŽ¾]gÛþuýT¢²2ñ!»4³zïöä¿Ýc;¼%§Ò ^é­É?ýk¿øâÝÓ{mAñ¬Z¿‚|\n¯½Ë“mºþÕfK_VW35Ø•ÃDçK‰š˜¢Py:½—sñz¬'ó“Ä›I–¼ª·â¬‹pq%¡ËjZ•„R” IÜ}pQî‹-‰%GV.CÖEÂnÃò¥ž’ÿð‡Ìtà‰i‡f›Ýî,¹T±z’ªëøèþosÖ??êÑÿaO:˜cZA È˜•]ØÝ#±t!ÅAžMÍ×T8fûøè·¬ë}*áÜ ÿºÇf¢ˆ ™ ê5pFâÂw_üÖ‡¿_üz\›¥³’õ b3¶©Ï,‘‘Å¼UÁev(®8uhHñ·,å€½"zäoíÒUÅÉŠß8yøD.×·‹¾ŠHÄéƒiI8JÜF½r;F3eWQÌnû¹e6K×Ï2®glGAewoA¹’8¤FÁREªQ½8qâµ<zL<¾}ã½/Ëû ÏÔ?Â‘þ¼hQ)î8mœj¼V‰:xìöÛ•]èe<Å_'8ßçuT¢/ðhŸëªÝØI¿~lÎÍ*–ý’8MDŽLÑ‘TE¢$Ólõéêx&É2d_¼’'×¥8†õ¬8ZËÕ!äÅ.<C„sÃuéË9<T/3‡ž­¯N–E÷Ø‰«ˆßN\gÃ{'Ûøð"	±Y?§LèYN:Ï¿’ÌS*GËœ³yZ¹ª‚\žry±m¡ÅÝ¶‘±bØÌüF£œ©ÒrúƒbLú&ˆÛìoØR!2q‹A1EzÁ*'0BŠä,µ’ÅX~Sþrˆ´*Ã„sßÔ,/—Û–|l–É‘õóÔ¤FiIÓNÉ/,¦Gf«y\%Î¦}'•`ŒÞYàÄ 	ˆ X6:Û`œk08qà¶™Q›úR`ÀåEš-?”¡Ð žÃ ÍjµJÞÐcOØe*-šœÀBŸD ¾7Y¡ØOÀ•£P¦# €+Gó›~ÉåÍÑY^`Ë	ž’PÚÄAÆò„sÞ:;4\âñ.:ù¡NÛ4¶Æf§S]h«ÑŸ¿=>ú%òM~ß»–hM¡W:{ÙX,ž‘NáÌ*?€¯h´æ‹Íä]–³$…¯áÀ’êÅŽå7Qe†u²¶ÂÔJ£
fGÊ¢À0Äüç½€kjî‹x‹Kâ¿m3ÆúØ7oŠþ±!ºPë*B}bExã+¢æ0µT„”jÎÐ…KržÊoK[~£“zfEDî] ÑGØØd^£gÕ€ÖD¬¦Ö°e«Uq¨Êöe!´·ÜmÍœ4T}l}RÑ$UˆíR~âKío•ZóŠ|´8pEÎ/=§5è·›£ýb~Z+¿>\ñYÚœ‹ê[øñáROVÙ¢¥ú¼Þ§çŒšÝ(ÿOð9R 	~±à‰	®k,‚ï.é€Ü‹v¥Y¨|+ýnÀ„(
LU[ê­exÁå‹~‡=uù®Ðæh×FAÓ÷ö û©d+ËË :‡l1(µÖÈá…´×|.°^ó1¤¼çš¿¢ÿ6ÏfÛí…íí…}~Í‚š¶rãv´tšÀŒñe±½F¢ÛRM€ÔNa’ô °œ~ l DXƒ5Ì.%gµå“±×–O§eeôž£¨MÅl²¬Ñ˜iöáBLa£ÀæYÌë¥}Fö…ÜZÇŒùÀ]|}æîŸ¿«À,»—²ÞPáaoq*¥¤Bywß“¾h‹miò©»!¶Ú•>7YŠŠ&‚>aÙš‚¢F)¥€\ÙúÇÊðžžkî”i±¼˜–î#‹ª)sC®Óé¦-r€%'œî,«(<éˆŽ½¦-.:E£³M]¡\â\™ šÍ‚3nÖºx+ (\R‡óGÀ¥|ôM,|Ds»EN}¬uôFJ€ìùÒi¸¨K§0ÄÍQÏ'«„ùÅsGæ_4s

*B‹OA(3ã¶ÏäÊ[h‡hñ 1Þ† ²r‰¯rÞ¥ä|½©¿Ã¾XÒ7ïŒ{½æhß*î<Æ–8ŸüdbV=r(É=šBà’â È'øÈÏ)zÛ=>ú¤±-?N;–ŽÒ®  -=¾+8ÊåÊf kßñÿyàƒµ)ß7™M²’;“´R‹QöåY±ÎI\2
g…Z{­Û-’ò²ŠnŠŸÑ¤/Eñõêr¾'•iiRá¡'”–öW›ˆt±2B-š¾ŸŽ8#7×¸ù×Ô¤7¥	¹#›ý–3U®ð¨˜"	Ã3‚ïç&¬ß|êîaq.«#v¯Á<¿ëxY9ÂËÍŽñ#Ä<d=3¦ÏYÒ’£f,l%$ÕÆüˆ—&·N¸sfSþ‚³Ò¹p"ïFXS
`B3 `÷ö€,ïS?+9*ú÷ws+9m1åíYL3¡‚ƒ˜T ÛÅ'Ð¶g.p(Aà>ä(Û…–ølCÙ”@b¦d5 óÖ`°×uØNÇqüœˆË\¶øl[Ç(2èoó=þrFG—ÓgÕÇ®Ÿ-IÎix"nÌVýIOÞrhÞó…ú¨Ì¶Ý‘Óòóø©•ƒÐG±1ë9,R)<R7PÍn7%A ôäÛy®“‘ö2BÊÊ]­n°YfT=ÁF/”_ä56›î
í²h"d—xø(kLr&e*U }[äTç\æ”Ê'÷>máÞCPõ@#¼A"®½V©‚îá~ãµ’tXyw†#¾¼a•ö—Ÿý”/ˆ­®$S‰|Žá™µÊd(·ì×ÊZhn7ûM€}f¼$êáæ¤HcÄÿÈ
×Ûs‰ˆ>e?µ=ÀøBþ¿ìûxÃ5[·õSÖSc2?Â¿YwážUÄõfnÓÆ}÷£± Uä…F²žŽÿÈG…?ü•u÷ÈÙãjß,ÿÈº7²ëùýÊ‡¬g»ýfwM}0þM^?m7‡¢§ø„÷ÆÛ£¿3Û†Žõñhäô[û¼eÚç¬'÷?4S·¹Vé\?H|•õ¼Ø®¿Ã§çFÎæh4›xý[zû1˜%þøe¶”‡iÌµQ2ŸU_ð¶R
Ký‰Ò2åv‘šéÝ¡Óhü™ØÎ”¢óîÈÙÄÃë;ïãkú-«D¿¾.aØéw¦®(ÜÒ°QêÚrž£ÚÁU¡aÅŽ“ÁFkyHâÙqÛm¾{£€ò¶1˜ñÞˆo¹ÁRõÕ¢A78¨r-Ñ…?‡|—g)îÌKoUº›€DÉMp‰6Ù†LçÁk^]ž.×yšAÉu®"’&òá¸ëQŠêVZÛéâ'4~‰hÉ¦ç:	ð.#]•0;ž¹>ûbDÑ[ HÀ¨	îoó7CwüçÂyþ;|ÃŸóÚ›‚¡£úîÛ©¾ì”.€8Ùþ…vjyý˜|^|Ù¯±Û“/x5Kì;¬Îº“/x?ó‡EO,‹àU~5Ž¹Õ™g|êVþK~³ÏB‘_qÙî¸jó3X§HÇf9?:­q·éùÅÖ¦Æ4ª)ä<á¬=ùTÒÉÁ N—ç:wSÊLjŸÇ|—Óù Kð“©oüìEËLÇ'jø©ŒxñÂÂ)®¸0ý—À We˜ô%–>?(ØDp¶†Í–ëïW//Ï¬ÚÄ¤¿¡Ú­fùÖLCG.ÚTkqgJðäbt‚w~‚²wç> m‰ã³ŽîLÄé_3KùVwÅà13ýŠ‹;ßQóŠgù­ÂND¦Þþ{ÅðÈÜ<›½}ûZ¯Çâ¨æ{kÑ´tE´>%i€Ü#æ©³‰¤'Ñ¼Äò*dIu;NNP„CøÔ°º¬%ÕÑìˆt»…œ:"''»‰à4Õñ”êi¢é·»nÿIŠ%vpN49î–L\,û{cX‰	òIL-Ÿ=*L †Ú#tÆá¸„^¢¡m´ÈØÉ—}¾°óÞ×z©…¶Á“NÓce cÒ^u|è][XhZ^Mì!j­AÏûÐ$ñÚµZmŽÖ Š4XÒ“Úx8êd_‡=]¬¤b$±1UM©ÃT‡¦ÂŽ ¬L¡#—ËDÀÕ
$°”N¢%³ ÈÅð;ûýVÐa´ÞQÓÃÓ\Ø +ÌÌ ‡XöE=)#Â-±eAª›H8®ìS4ÃàÄœéíñO¡‘¤—ðŠ´Õ>Ù}a5+Œ15¥æ2G"8À«K¡­ˆþ Q"ì°9‚µR#´AÚ¡)µúò³flWÄõ…]ðé
±R´»M‡>p¯³þL_¸ìQÿA(;Äþ^sÿ„zƒfÄ‘ó‘Ò]•’NËA“}[†ƒÌªòhÀ®Ü·ùbÃÄ!HføÜLp6gŸö2€9I Ž|Fñâ%ÙŠCsû¥4ø¸ ¦7[HyàÉôL¦¼@Ý€#¯~oŒ~Œîä?!òÉç‰˜^~þò°t&ÿ)$G<‘Wî†ãµFîVƒUDŸIêîçßA5¡5ô•Ú„“¡ipÄ!jSË)v–—	ÉA—ŠžídIÒAdÞÂ³o31N©Ð½z´¤¸‰/êªi ¾Z^¤’dÇìÍçèš‡iôŽÄÂŠI›yP1Õ‰°†id?#^9Þ…$æ‘pStòÔ]®ÛÔ1ÅÏÚâ7y”À»UÜ}gÔs=/ïdÓh¸Z•#;×é¶ãþôƒGZ|ÿÛunB5ÎfÁû2{øèÄF3oÇGãýã£³¬þ×WrTÆ™8P9•xæ‚*Tò;“i#akã¶ë¯õÛÛß@.^©/Ö/4….fðl8ÔS	7¾Ÿ ô5U²Ô®Ùöv¢úLùz0ù‚yƒÉ—>û»ÅelÈ¯TáßHñŠwV’À(.Gdõ¤†X¡èlŒ‡üÞér*9†ø‰ÈiËbPM#„D5tüÑäOý½7W^š@²¢Š‹øB“ñ•¥°ä!òDR„ÁhÈ¥
rýI›?`ôÆ”oH ‘&aˆ´ßAš„Ýšüu‹@õé².-÷…$Ý4=¿æ[-Çó*3(4£¯Ùß˜6]œFrëçÓ·fr[E&EW;K¤F4$-ÞïÐUµ‡1râEŸ5G}>]*Jb¥­8öþÿê©k7ÒÞ¸o=šg¡Gé[^äâsH¨¼›+AÌW	ß_B°º?
+æ˜áº}8chƒŒñRö+ás•·‚¾‘Ò5¸¾ªt—·=æµÏ‰çQzMAÝˆ·ˆ 74ÎÏÖœ™ÑÕ9
²nâLËýÜ£sP;¶ïò.Ú|ÏÊNô–všE9ZJ?ÇÀ$õ"FyÞ5N&Caz>!ÎÑàl×’*²à88ï(N&°RÁv×y‰–üÁ°º´PgÂ›‰ÍÜÇ/´töYXž'oeÃÙå=ÒrÚxì‡ZˆQ6£Âp J8õDðõ<W”@ºû?a’
 œÅÔjµœÅK[¾†]ð†‡l3d=æÖ§ä‘ú¡„™ :>Ï¹ÖÉ´èOgÇ.åúË	Èt­û‘¢2Úfþ¡æqÑ¯ÌVgçÞ_ü@˜Yy5Å¨{+¼f"û‡X"[ˆ…¬N)ýá€ D º½M!¿½?Ïzðjd…Ê»’VŒ5cë*Þ>ào|X}û wø(áÈ–°\?v*§1WTWƒ+m¶iØ˜q_{*¿ñ½—ŸôG–DÆ¶ÔÅ\Y×/Î3þï2þ{	ÿ½Œÿ^ù -”}*«p‚Gx?$Þ¯ùƒ„·ðMÔ*ÿÁŽÔ7ŸÆ×Š¸—FÕ{jzcéÓû'¢5öAg€êxµZciéªF‡[{g@q({³&v×ØRÎ³Ê‡óÌ\ä.äFšS&mØlï ¦²Rç’µ8;7‡:¦WXÇôBÓ;\½ÃøŸ¯ƒ~¡8Ly·]&1§	—U„Åæð-çÃ(’‘–)z6/Ê2Wdq÷M½©³ùN`’;®0
Cæ­¦0É«å¥;°«bæÃÏÕÇîs§-Ày{1%3y
<2¸eçù|È÷qŸ¶Èþ+ ¤r/ >JÈ¡Ð™Wc(]Å¨“š^ÖIIÜÌ9ãyÿ]X†ê‡Ïï¼îÛ¥l)ÅË
I{()XÉDàýxV½@Ãò…Yƒ\¶b®‚ƒJñ"®KùägÕ¿Ye‹áTÖÃi@*yÃW¬o«P˜¢–N?hòÑØˆ÷é™&i}L¢+$À$ÕL«éD¨]›q¨ô0¯›Ž¿5¤¥+5°×‚FJfÇÂ,8L­1ž©ÞŽ7Yf¥75oå‚‹¤+È$­jÐ•¨U`ÔBñwØÖ†>Móñ·¯qsK —‚^ Ôcü&uÄ?‚mÈkÁm+ÜZ<{84yiã'z^‡[ŠOªèÅãû"ñèÆàYßöá¹ðé‡ÃÌç#½©>NÝÑÂOiñÆb´på‰Ó×i5ÿUÆäÁ7?Ÿ9gmæ\y&P%¿N“'È]\ÞÂ8ŸDgmIÏØÙŸE{í'í×iÝzùÙ’Œ7|õó©s>umê¸½a$œÑë4ƒîÕÊ©|9SIíŠóuæfTÝèÄ;Û³«òÓŸWjü·Õ´º&ìÉñÑïYåÿw®œ™%ºá|Nµ9u%6¥D6º3=£š= <ý)e›VI.SØ¶œ™$_ÿ|*O¥Œ‹6•v›ƒõæà^ãu™L7'_ |sÀî5Ê™MaœÏ§37Ÿ_»ù4âURæR˜£©q|ô#»`Í®3U¼Ù‚'ßÄ³0=Ã·)gnbožÏË³6/¯.¾~»°0gôk´	º_~v§œÙuÁù”:á)¥Ï—ËÁ|©g­c3«¤>±¨“šmN)26ºBJ×Á°¹çöQ¢ø†
eÞmñ5ï:ì±íæð}Àí| æE*LV(¤&6I˜ŸŒ;–½~=Ç¾Ë ¢wRðÈñÇ£>É"àÇ
Í?Ôb|ß6 ²Ü~«;n;^QJ¼µ3ÃÂ2—èklfæÀÇuƒ²LÀ÷Fƒñ0®kã÷è¨|Œ©ê!ç°8ô\…tp•Ž¢ÃBÓ‘túÀÑstËÁ5-`.#^m8ržBcÞ¯Õjð÷<¢æè 6¸¬‘s¹­ÿÁ¯"¬–ÿûFQÛ@ú°qä{É‰‰d_öYDÓf`	éS/—¡t±¶,ÉµƒÏy¼Eq;o2Me˜™Ì—‹â¸ô3r¤d–x_	œÇE!üµ®Òoµ£tK}±+™YÎ­]ì7wÇÝæ¨Ú÷¼™Õ­kì@ipÍï
ÚàÊâü•9ËÖZdÂ-O,—ÌQ1	#/Ý@ä$¶-ìªpÔeú>Ž>¦@—ƒèË$æ‡«¹wœèËõýAÆkªD%uÃ@’ò}œnÁÚïôv§›LÃŠü>èE?â—=âcþhüº’Ócss7´<î³$žéS“¢ˆü8!DKv'ÔßÚ¸³‘×'¢ˆKûÉJœÓvÇ½Ü®¨ÛuÅ.èš€_àÿÊç(`É‚
B šüyºÕ¦DCyA²Q£/Î`U™È§Ì”UÆ¡DÄ
¢>cÞêm™óÑâ}Œþ`å¸íBš¢ýÊî<ã‰‘ãºOûÑºVQ‘y}É›;dU>Óâ]	Ä~^Õ‡¬òÍ¹æ·•]‘0Ã×fúã£Áý½QÞ#ôušßCÏyúö»Žæõ€Â<ÒÓ–™é…Oæÿýòó¯õ‰ò¯¯fm^,à”¡>`C¤ËÀNŽ -¡N[ïüùÛ&Mþ˜ŸëOVzú:°DK7Ï-·H¤ƒ—ue˜ƒÆUë¢™²?01äXpÃôÈòOà$òât»îÐs½‚Ê®dÒ´×v›û`?ÊÕ‚4,¦¿µ¨‹Å!I¦EJòµG1`Å"Aù®g·Œ²~!š½öÌê÷ùŒ}æ8OîìÐrÆ½J›Zø
ãV§)Å³F‘¦í0¿WÍÜ´š]'ämxùù©·XÝd4¹u¯q&š«Râg´¼½ï@`neiîð¯Ko¨ÔWQKÓw¡±=µÖRªmè5;ïæˆÝZxt`ÎPKJõÔ÷ª7}º…"~èi¹Ð‚þÕË’ @½€Ë-å¢Vr§z™[¥—ãG(
1€2Em©7õ‹hËêî4U•­|a{´{|ôcnzÇGß0¿ÓÜG®ÃŸ”é)_©hb­,2ñpTdþ^˜‹˜jWü%Ñ£%eSa/ÖS	vaÑ¶îÛŽò:~¥ŠöfÛõÅÖ ²k%¹¡ì¾üÌENÎß8ý¨¯ØÛ´ÑFzùpC»ëeHoùµè¨sQ'‹:¼h¢.)_Jõ§ë4Êx–p9}Lãeƒ8AqoŒš^çìËûÉí=¨à¸òÉ¹r_HàRâ(•Ó˜˜5”ÞjÝvtwø^õúÁRýPŸEê:ŒI·¥RN×oòI zc‰&âIù«°«Œµš§’¼;“?	:fú ÒÆœ>â¹‰(‘ÌA_•CnÃ»íø0ÈÄ>’ó.^:ÿsÜr*•f«5„uX<ÿÄþ†Uàs€\ÉÜ<ÿ/O¸Õª%:¥På*´ [l[ñ@ \ÔÎ@½‘ê- 2äEÌ¯w?•\Jq‰…Ìê	/‡)•`Ê†ˆ/*	gÍTûÑ@§\:4ïM#ïLŒìJ-èÙ;É[ÎßÅpÒ9­+Y“Le?¬t¯•ÅÙg$Õ&ÑzQå¬iŠ7•óùŒ¿k"Od¡—}w¤ü³¸~h«ll(y¯P–¹p¶Š>œËN\"ëÊå;LûÒçÝðN@ßl‚ßqÄ‚£bS½°dëÈï`YHb‡~õ"0×_Dð¬}}`¶Å¨éæß í¨à’ã}á²ÊmnÎ­¸£Ãæç.ß«4Y}‘µ'ÿŽ‡›¡-—¥mO‰%–ˆ6q“sHFšg®è	\2’öæ•åà‰wKžûqéÍ°‘•e»éwj½æóÊÒ<²*[Ê£Í…d¯wœ§£Aÿ®ó8–ÀB¤5XùòGpfü‹¬”Ôíå›7ÜY›‡•€¾¥á»|N/Cd6žnüÅ°zÍq(	p­4‰BWˆÂÔcOã¶Mû17¡kÌÕø#¬ûb(œ6[kµœ¡ßì·¤‡ò¦.M[/Ò›F¹œ”,N€¤;…d§l¸[½`‘ %Hê’U(I£‡¹QKÝ.l-bèÑsWÓÓmçSú®uðs¡Ö+}†i¾—ãÉ¸Ô8œœ²×!	+dRü¹>/}®kú¶ÞÁß°í;Öïüù[>¤¥5ù},ulà'Ì™B¤”²4tB(!œL|¼ÏDva1‘+‘›#`Ç$  g>ÓKMM·h¶Eû=8ãú¹»d²ÉS.y8ˆ|[%–A7ÕÝr£þr^v#J†¦ê	z$Š,x;	ExZðôù†÷øèSxjÌBÈ‹ÌµåJy)\-ÄBM÷»Ã§úŠd©6]-³ŸJË$œa•rÄoN··d€4eˆ{,ñžðñ9Ry?÷², c†`£Ä§¯Ó™âš88 @;­WoÉœÁBx^~v'c´³ðÓN(–Ê\.ºÚ ¥°Ø?ÏF’œ&‹}$lËû»|øÞE	î¯ÒøíÃÕxû‹Ëz(i‹·Óh”«’vÏÄY¦Ë„]ºFÂÎ ÿ.[@9å_UŠJKiù’R´¤n,¥ÜÅEó€X¸J©ï‚)yfuý>·¬Ô%óN9ò¤vœV¡fÇA„{)•ÕSzsœà¶Ì¬Qƒ¤262wF­Í–DZWÀ¸Ÿgnû¹Uú(¾v·ÚÏÙuV‡eãŽ\!¸­æ{b^*ìŒO2Tš‹–†“¥ôˆçHí_2¤ü…Àérà…ê©°94)Tì¼%tg·ìúÓMž`iýÔ#H¯æG¢hi‘¢ÈŽäÓô—±ÄÆkUmµ­1L'¤j…­ÁˆVýmâA­Và»~<Ðš|­’*kí»˜*‹ýÆRÕþØiw]ÿäj„ŒXÜË±XÜ”@\c ¸wÜ>l®¹5?€`€x¸î²]ôMÔãA„­DmÈ¯*ÚØêífÉ)IóÉ„ìNÑK¥¿·-
Á¿ßJÆÄ[1q2Ý1à;V{»h† ß"ö3ÆƒÑEÐ"ªêdÂ@2âxB,¬âÛ¢K È¡ºŽéO[ûB›¡¾>ðüSÌ|oCbHÆ";u„ÉTS++(3æ“Qf‡*ÈŒtèÞÇOQ¬¸ø\bÇi1ýá·Š“ùÞÎ˜c§¦œgœ*2øjlûY¿˜Ü†ú¶eaƒáCœÛ„àÄ‰‡õ&_gã…<ß@¯/h?ëÀ"ìˆ3Ž &IIa(qT*èpveW—ïÐbmM ÀzËÀÚF¾‹Ùx[º¯;ªñ,âm—Sð¶Ò³LÂÛŠ·@ÛÒâUBø­6Ics²Rì°ö´!º)&„¾î%Ïa%-l:¦ÝY1bXÁ³j0ƒTÅ•RUÐHâ2­J]^ê¹6ˆ=îuŠ™àÉ„¶Fû?ëC‚[uŸÿ![`ˆl9n·Bê™Þ3¹K}®›­ti‚¤Ã 	@HÜ&ÙÇñãÜZ#Ðdì‡„“5#jåDËR¢2O1KÅÌž‹ˆi¦¯\g1Ñ¢€n©’EÞR„©lø-|“Ë¾!õÕ-ð¹™•®à‹ªÁUØ+Hü·Ï²_QŠã³¦;æ]>V6ÍÍ —.¡NHïñ.VÐÏã³Q+Æ×KCæ€\¨ðÔ@átr6¼/£~oŒ±y]p Iî8Öžü©¿GB¬Æ—«÷;àøh¼|ôqŸ=|Áö ¾a%;ƒ£N­‡ ZÌ†Çf7¡Ý§{V½”‰LÛqš#€xFrÑtÇ\½uùb ,ÿƒaui¡Îª@Ë|¿&±îãÌœÎ+Î.Ý–ÓÞÊ#$òŽÓá{Bgt}¦Ûz¿Õj5*šrØ…ýr§z5K!‹ir B/ú$KFôá K	¤öIÆ¨æ£Wrõ’ö0
ù¢ƒVrv™ Á`—G‚vNQU«ñ©LEw¾×t¹¡3ù÷bO#²®ÂÕÄ¤ÝÙ°Ž)¥„ø?Ô"ÐÛƒv±ÂÛ‰ktš|Ûm“ô‚¶™%ã°¨(¬ƒf·‹Ü¢9¯pÕÁ¨©ŒkN¯év%0†ï>sFëMÏ©ÌEé*Ñ¼7Þ‰‡œ¼,€É*¬Ä…‹Ëó2! L¼ i€C×\TøÙ{‘…@²I§£¢î•ô®×Ú‚3Æ–Ú:~ñÍÈl_|ãÏZ±²›A‰àTl	
ŒEév‰lˆ^~»Ùh4FÁJWº¢sAZgiOúïÁóaú^šÂHôpØæ=	³ô/¼2FN"~Ë<RÞõî^Ÿï8 Éƒªßÿ€äx$Ž±è…Wl{újwÂÈ
‹ÃBY.¾7=ß„Ö«ÈYÑSžÚâvr`ì{ã¡3ú-ú™ÕøÀpÿ´
î¢xYp™Eöí™U¾¶•ÕÂp‹4³zçøÅÿåV,_AK*|¯ÝnÎ¬ÞÚØXc•[îäËž!|ÞbÁr=WZE>é\D»³;v×k_–Wß“¶„ÖÇë#–ö Ùï”UhOPct|ôlÁJ*ÔÙÌ*(!ûƒ',æ`ðÈ«^ÀÚ€GàÅÁü,´&ØÁ‹Á5&0¦ÆEš-
Ä3'Ì²!ò‘dœEACŸà@TäÂ*3®·g…A}é¦ÄO Y’÷3Åp;êÃ÷OÚ³sä”éæ2¡‹
6xaÑê,neÃmv{ðsñ@°†÷Ñ‹!¼\Fcçœ>8‚ Í$–/
·ŒQ5ªHI<õT…6Àê[š7§r´jnÎZ ;¤&ã‹/honÝc¦ÐÄÞ59jíFM)–F“ò¨ðÝJø¿¶~`o«©ùk¾¬f-}Pƒël`Ž~Ò±Ôaw ˜ˆ=‘‰‚˜!#NÄçN¯6kGP
×µRjÛÃ•;¥ÙZ]¡+¸Ò^ååçà.úªx’_õÙîñÑÏØŸ¿3ßü¼¹‹¸Ð¥÷Z¦ŽArƒºFŸ‹+˜D§Bð¸ý¬¯!{#·Íàpx|ýÀÓc\E:>Šû2è5;ŒÚtçDÞâ116'Ãxø[ò\š n•ÿ—Hñv÷,_[b™¦3º
'ìŒ.·}ýàôfõmáEâÿÇyd'‚â
svšVÈÐO6´ËÚ]SåïTZ‰(Äâ¢ y˜æ¤°Éq/½Ïm^t<ah‘!‚ëf•MžgÐƒ,êZðæÇ´â¶5ó]æùÄQ*Ö^!¡Ïç±
•NNª^”µ:EýãAkì]ƒ>	Hê-©»á²¢²×ÊÝæ®Óe¿×}g0J›	Ÿ¦×0¤>`þº¦i±§êÅkì[E_†o²€¯b[§El`påca¦¨ XmÝs6{ r›è)È(®oNú™Õ{ktß7¡Ãn¶ÓÎ«ŠžWÄÌP'eb‚Y
f1ˆA–žžíhDéd¨Ê+¢/°žã¯µ`ÛÎ‡²2‹¾âYGP^À¸íú–ÜìÁjóŽ<;Lë"„K­2K¯œ¼$)rÄiBÖ;ƒã_ú‘Þß£Yrã zã7¹é‡69,'N¡Y`=Û¬&ÍÈiÓgLF†ÅÐê²HR*±qûëw\§ÿt¼´´xå¿ìÁ×µÖ GÚ)Rqî‰Äv¢BÒzg±‚PöÙ–)4*;Ÿ‹ìÉ°#T8!5{¿Ã8Œ°pÎž"Ñ„0DEm…0ªýÍF&¯nzIn|)«ÁñÑ§È‰øyA4brk`âàg%PÎý7€²=ù£«æ”‘Q¾7-Ý
À"Õ¼pú²—5-Æ»{!å} ¿V“EJQ	¾
ŠE(Z¼MðÈÉªñÿ?åÿßåYœ;@Pèå†üžŠ‡F “÷•sU.éY9cÑïjJ}¸£:ÔÔ/#È"‰µR]×1iæ:¸\p\™ÅÄnŸôØ“ÎäÖ{|ôugÙ¯¹Ðþ¡¿—j>Z]ï¦d|8,È‚iNVÜ—’ù2g±mðY3à"›|Ÿ1Í[—Ïº4¥ÑÊ$™cL¹ç-%IÈÐÎ~¿µÖíòAæñ³*ðxY\çàƒQ_Llb¥çñ®<p¯³þ,]ÎX³ïö`eð†n?GèòÝ9ì®tùÎœˆ@Yjj0ù¢/þŒÖÏi&A
š>›oõt¡ôV`zœ~6ólkcž­º áËVªÞˆ«çÿ óÜ2ÎWõ0DµÔhS/D¢tƒíwö®Fâß¥<“C
-5Q#Ãa
wBd¢Ò‹aç.R;7º­B5™!ówžÒQŽ6ØF\è‰ÈúÜ:~ñU"ˆ†Šó:÷ÝÆŽqj(wÖ¬µÒ.<0È…@"Ä§Õƒ Ï@mSÞ^”Øsù8´¤7ö‡N¦+7L'ÁKdõPT‚ïÂ6Â•¶ûñÑOZgVx;|¹ê›ºœJþþƒ­Æ&–ÍMÁï°u?U¹›w7¡`Ì«ìÝ¦*tçïv›ÛÀ«¬nli–6J¸ÒVÂjzSÜ˜ˆË)ˆçÕKˆƒ`óäkùF¡Wå{K¾Nï6³¹Â8b´6=nÆ:•ÅyÆgú]·çús¨ïø§<ma"øÍqTÄŸ¬C†*NÏoŽ|Ü±^dÃjDêU‡h³ l:-ìLìš!_¿—žžîžü¬ÙP@ ¦°óùÆÚãrRÀ‰®%¹CÏ¯.EYTr=ŽúÓž…V‘k—NE!?¾ÀCÑD3M¸ÏÖl®56gÖ”í™åF»uéB ô*úéF‡Øû¾ëw*ò–j
M yP½ôªúáýåÅä©»~,ÏËµ.VèŸ×oo®ß¹ÿîÖ½FPƒ)~ŸXÇ¬º )æ;<žóðá#ôô }ÐWîwÇž!5z=uÄo˜3sOWx4¦¦,÷e4üÃµ»w±ü¼„I¢ûj¶¶ï¿û ñáÍ‡·6;XìuK¬Ã(£fWÑTõllnÞÿPVö`s§ñî16)îu|V¶ú)?çAQˆhŠqÕ€ÊWL‘éÄZwÇ‘ï™ÔA4:œdA+©”°	§÷Á#s®ÕœŽ¨×:"s'¸yz»¼“ë\´µ&t¨+N^’Æ7UQpÁ‰XBéê7¬:Kì2mI0•³ôÄ™YT­?a!ç3­LZ„àÊXˆfÉoz¬w|ô—Üû«Ïì&?]+^2Žê~hÚ–Ë¶Ž5ÞüÓ=vóøè_©#EXNfïÝ>~ño÷ÙæÖ7ï.×,k÷ooMþZüâW÷
²jÌÞ¹=ù[ì>ßØý¯uèçè9
(Á‚Pwe˜<Ôì¥§¥IÏ‹²™ÉZºR¥q2âDÄÍw@Ýð†aë4a4WË#DÑ¿ü|ò¨•1Ÿ}t'XÎç¬	ý|òûæ%)3ºÅ{ñG}qpŒEÎjþJZ€Æ¡ éž? ¢××Ô°‰×šo\Ã¸s‘Vèt·¢–„©I{¥Ëh¥nxø‹^Àd6ZÍÔ~€0%¼(v‘ïö¾ü÷†7jþ`æñæ5;ï iE»EÞQ™›çóíöµ^ïšç±v{a{{aŸ_³pp5[«QjhÃAêeKûü&1ŸIÐ×¡Ã4Ñ¯Ë¶uLUÍ9Î›…vÓoà·ß'±¼§XÝERñmÄpÞìm@C 5ÂÓ21÷¯+&Ç!-ª—$÷	KÆ°`ÿXAIGáÑ¥ôô€o\Ÿë1zUá¾EÃ/r~É¯•ãñK†ÓðUXøä’'î8õ"ÉçøEÕ“Õë‚s2ôÆ…Bøë
¡%©‹–çøÂ½ë´PP2D——°å=p`?­àBDÿÝ¡Ó¯@1±4Ü—¶¾ÜQá(O>f|1ÿÕ>Íz"b-sA§eìÎóH3Aôj‡„ÀWÛ–˜/X—tE™–éâÿ  ÿÿì}}ÇyçW)-ílÌ}çRÔf¹ÄrI‰ŒHJæ®d„ öÌôî483=î™ár³!pŽq†Fpg¹HVã3œX	“üÇêü=6Ÿäêyªª»ª»^žž™å‹¬$ÎÎtWWWW=õ¼þ~f3´Å^39¨U‚Z[^½ÁUV…ü¼-G«1ÈâGˆ÷	ÿ~‡m„ÀƒC’ØGhj©ìë;[ÌßÙÖ:ýmŸu!dç/ä¥Ìï0²g½¹Eb¼°bBKë‚O±µ•òö­„èz{¯;åJ´0C€Ý-¸ºÁ‡5]mƒ(JO’÷š‹ëÁ,nÓÌrë‚î:€õf¥ëJz¤œpUýé/ŽÜÏAçô÷éúÅ  ÚNÞú"Ó°·J]º~À®@·<ÔÊ»—„¯§L½6’¯)™ÒÛ{QÊºPw? áwÒÜ÷*w4VI®¥‡éiÈz~µ¸%·x6~û¿ä·×ÙÐ ^ª‘êû|YÅÁxÐÂe¦„ÉÝ™š&§Ü'†‡ÓŸãf‘°?gynû6¼»ÓÿÜ­ä±QÛ×åBl±[?%\mÇ¹/?T¥·ÕM¶¯!Osëìé—}E ‚;Ñ€¿ó§ÿ†Âç³„=„4ó/úêÅêÂß!Þû(ƒ´oyÒõ,yó7ÎoìÅMc:=ýO–»QòIU™M êñÿcº¼øzôÇý#¿=û%°u°_¿ÂLGÞûC};öÝñéçðXÿ·ß)Ð& £?ä}€õñ†ç0áê&©ßù4ïs¾ÇÉ¥sÍo-=•:¡<»0‘/ž¨¨å
Òð¸ßz{Üíî¹™@A¬™ÿ‡Y­p˜qƒÜ´ÈÄW¦AæSï	nZÇPÉoœRzz¶0dò®1Y¦dMNu¤ç{,ŽDÆÆ B¬Ý_D**ûúS*/¶ˆ¥¥¯Vyç-”úiÊà\‹²ÝN”Ö¼	ˆ1Åò­Mß€ÈÍvºÝ’MðYüùƒý9òOûN\9yç½÷Þ¹}ã“½›7nìòÁ½Ûþy/à.®Ì}Â5ÇþC¿½’ÅÝ+sý4åö7€~qÓü Î2n‘QW–¤‰fÙXv?½ª”Cdn¡ÅÒÅK‹e[ZÉ2û'`L¾˜ý¹ô¥9vçìÙ?Z“QÎä!ÑÔâ´7GÕ:Í}2|9”1tùjäŽåoJsyÕ3¤'1¿J/ÅðëhŠhãzs} y	Ç¥
Þz²zÄN'`äØl †{*Û‹G#¾!ÊJe³k†ò¢Z–º(XT‚«êµ7‹?×Pé¸ä«1ZId?y¹kÌÝ@éµ>@‹£t1cYÚ“éÈ,›.¦À»"Ê;Bû*Í4#QBt±Š‘²f(“ñ²¶v‘¼švTJÚ&}‡ü—aèdµ½…‹d$€LvAíæ"úéïFl¿ƒÅ‡\†rMGq’¬Þ¼K¾Ê_ˆéû\	ôü»cQ¨û#n"<ìŒÁdÒ:Ál#ï—hñfe2TÈt‡Æ€Ïšl8ÞAìMgx»;^k7¼ËÅˆ–šD{Bp‘5XKŽÄ;Vv«ÜeÖašY`Iø¸í´½³Ë¦/$~?ŽÛ5Èî|n#’¡Ê°½ûÇÏa.=ýC©$<äQ˜±OA˜ÍX$¦¶f1o5·õõÙÜÆ®þ®?ìêË ³ð/Ä!Zõð;·Çù¥×Îžþ÷é—c¼>þ¡_œð.–Õó…ô´¿LÿÜ+ñ?ù­¦³Åý1_‘àx„÷ûþ8’k“5><ý5'¿Ødz_ôn®n¨“ÿÛ¦uK¸Ä©üfÏ¾ÌGP€ÿ+NÈ=¿{˜jnS"ã‚8ý5ø5ð•`b¹*…ÐÃÕ®A•ôW¹|Ü%Æ=#€Z ï¨y“r±(&Š¢||Õ7|L¦ŒlÊb g¿d]; œ¦¸s¼~ªÔ$¶’VäWƒìM¨5$ØhwÕl”rHºD*\Ä"Lbá9>`&š‹€C7Qí/^H¨Â…C@uöÇ °Røô»2·J91z|enr¦,ÿCåùÒ îÁt=:&p€T7^—ÙR#Ç»Ä»ðŽìäP•˜˜ÜÒ9á»‡ÍËˆ¤æŽJó¤‚À&(,»ÈTá7ßyâ${‹ð6è.®[²%<ãbüˆÿ=DÓ’‘ãÈà²'X‚vrÌ,Ý‰rJ5Sv××˜§ýûðú&»ëØŒhñÃWHt[þ·’ŽªäºÑoÏDn‰v^©…œïßÊ¬o¢ÌZÙ°(ÄÓ¥=ÔÕè£ Âz½Ø™È‰ÅÂÓ§}dí‘L>Ôü$¹V[’p‘nCçÓÅ‘ß_ÍS,VdÉ×/«Œ[Q7æ¯wieõã)<Ã0"·0z„1J®ÛbzÂKáž¡—³”5«T‘Ê‚ÌiIv\†e9AíÇÖ^'‰»"Ç4äqÙ:÷3ÈP~°„ÝÄJÌH<ï2èú{Þn.wpMå™KG˜X¬F»£  œC„±×^ô\.Mðo›c^¸+7Ã[ÇI‚å†Iÿ^|˜GGà{üm§G0«’¤ÐV0i½Ó——£Ì"$þ~®Ò+>ÂXCq( VÌ;«€Á¸Ë·ä°®ñõ§;wß åÿlÆÁB0þ˜müQ«**Eá/cäóß_†aÇÎ”Çœ4Ê§?dïÞ<ýéÎÔ£ìÞÀëjyQ¶‰w.:c53O•l®`€Ö}p‡§ÿ‡5Þãï=ãç/l-w.ž‹?«#X¯ŠFdœ$Ö†÷·õn’µÊÈ—êS¹o…æÔƒ´zz]æeÎhy	Ùšf´¢¶	´p¾w‘gû3èPƒ7>À‚ç6*‚FL³ZïÐ{§R¹4Kïƒ‰ûÒ@½ÏebY¡ÑÏs‚éÁ #£¸q“«^­”óÂsšgç`+æÉ{•9éŸ{3–ç¢ja{K	ZgÏ~ÁL1¿ŸXˆ“ëûjAââQµËÆmu¡…pÌeµlCÐËÁ²=*®$É‚Ç3³ê©³"×‹¿d(ÿ\\¹´4R­¿þ½4xV_üõò³@‰ºž‹êó@ÓDáM°FâÁ	GÃ)°H0ÕÙ·Œr2)Fç¶Ý}H|WÖ$‘i¿§ ¦ñâÈÛB–>ÔgÀRÕ“~'å3Š}tú»±7²(ËþœÝ÷’8‹d†¾È¥31ò)]¦	ÏÚÉ²ôè¤óØ’ µ! Z1½v· ¯ƒjmÁâÇƒ4ë…U³Â!ô§$Ä<ß“ˆ°}Éwý§#¿´°èK/¾d_ÉÒ¾ùYÂðV)Z—ë¾t&ðÇñÞ«”,M¹¬íÁâÂ Á´Aû‡ˆV‘cn‘H“V'ùV„9Î³©¦=¯~ª¡ÁéRêp+(Žt½ð´ÝêlPÔ\57œz®‹ze•'ÝÕ|è|i9kÚön<(?ì+6—ÞéÖkÜ¹©öç;;ddæšúFxP)†X™Ä¦”œH4-5.ãšÆ0=ýÜ¨5¬9Èþ•©bøHÀÒ_†á©a0&˜2·5Ä|¿í;7·–åGpEîsþÓÎ_¿iùw[q_¶²º´
½ÏRvS–îsué7=m¼çl-ó6rM© žÔïD°$	†à7¡r*òPè÷“^r(¼é{£h4\êDÃ{ã>l¥,rÿ	8Sœ>-ùVŸIy*èÒ†˜FC.³ä§¸—”]¡ºØ¢“Ä=LUå²ASX·«zrÀœL÷DæqþÿÓ_ŽÌÙxˆµ®B}'Ç:ÐšÝG…Dî›÷;§¿WÌûáÂf5RcgoÁ My2`

«5+öÄðÃ4 c}Úþ`÷ç®–~ÚhbŠÉ´’­L>D¹šÁ­t8u°‰{ó.LeÞ“&”uL=4ØÈÄ}eŽ÷Eì ¨ÕŠ£¨ßŠ§í–ÖÒäãtúŸ¬»ïßò®$ý¨»3³þ•››b ¡8÷1 ztü¥‚oˆ·8*ñé:i´5q¯~žÂö—
 À±­Óõ,>8HZIÜoß‹i6Éb¨q&ÑJ‰GFª×–1²¨TeÀ·§Šù}®å-”«Ìfßa6ÑYýZ
°ê(I,çãª®~¯-«êå9]=Ã˜PÕŸ«oUdüË¢m3ÑÒ€eƒª“xÑ³³ì|pFª!“àÎ’M!L3ÊÃÕ+þ•G‡G9¹
;X«D ¬Å·ÊD:•ÄtåÀùa¥¼ƒÓ(¾ÓÙOïDÇƒ¨;¤$2Ó³$ZáS¶Ch€´’¿[U"×³cÆõï ÕFÉ=+N¥O›óœåp™@hAA”9H½v	ÊâP„#Ÿ ‰°Zx†Ékab—ýƒ$ë5ævA…í°&ß«6ÙM)H ·hZUÔXvEÅœŽ/†(7ÐÛˆ›‹†ç\À!E£¨ã%&1tÀzl‰ú¬7†‰’'«‚ÅxunaNEÉÈ¾<j ,2Ò"¢Q¯?¥Vv–¨áŸá2£ìás¦Š×ÄpÞ™Š«Vùð
 O&á#˜ °£Èß f¤ðâ[Q@þÕÈÐ¼¨¡V}y?[úeoh Pê”·+=¡vÍI‡&ÛdŠ“*)³®lé²¿¢ZÓîKµÂa\âùR-ÿ£˜1è$ ²Ðu~Õ9µÇE}vì?M@ÈÍ¯!X×Ù³÷KÌÂ."@¼ŽŒULVe®’Ö×™^±\P]vðåÂ>Tûù,/Cë^apW/™)$·?YW½ù ¦€:Ñ·\ìÚKýsø
ÓÙXyXB LÅe-<áž\Ä¸ öÆŸ{0=ÄH¥únÄÌ§ø†ì,Kð¶]Ú‹n=-çI™èœ.‚d-M^ùU´qºBÃ[,±Ý2ùü0—Ö•Ö™¼‚û0ÁÖñ~}®òŒq%‹ß@wú=ÿ|ëú’Ç”s €Þé¿›²S‚vÕ÷9qIØ½®WLA5»uyƒxu	aG‡W—"¡I«WžhÉ ¾ÂtbÛÊúMkþÑ™´.\¢mõ…«0Þ§¿öÝÅ]VïÓä–òvšŽLÊSÌÍÄð¤{mËœŒ2X´Ë
V.­L£ìÓR…œ›_ÃLþ»’L±Z¿•NZv5<Ar…
¢CÝkÁYm¨€wÓeî¹'§-Âô…ÂöÛÜG “pJš
‚sïó¿&µ¡‰ÉgW±í³zŠ:Á¡Z+}úš\¶õõjy%M©®ž<¡Fm¡ýV¥Öw=2…{èÝµýE(ØžÇ· ê‚ž,±QW4‚²a 	-±Ç	_–¿-´õo¾UÖ$¦ÏPnÐp; 0ryzŸ¿*I„/nXI„‹Ôd $+™DoEº'ìy40éÍÜ½Ö8¦Ù¢¬—ù}¯Ÿ¼¦vˆÛ Ç2%p€¯‚ãXNáÁ²ø5ñOá¯CI[IÊ¥Ÿ`X«T…Œ7êö§1’ÏÑè»]çŽW³êÒCèDã	Øã_Vü:Y|v¦QZSY„w5"ˆ{ñ ËUq€¹¥Tí“³¥ÙVroBn–’_
É 3l.—À”â©ÒHÎûŒ|šÎµ
ÞxÃR¼#jMmÇ,MTïÌmoYJš×y³ë:ø4ßKDÇƒe€Þ‰vmÀÃRÅÃ<6k–Ž¨ï{QoJž^ôXN…q•ZÃ•+|î‰­FßTt;´8¦ñ“hÜN€ fèl}IÐ äÜð&C¤:ZÎÐZþ½õ÷¢Vg^°Wøh4ŽWãçkÜ~×ú{™.ÓrŠ¤¤ÌÏYp‡¶–†\VÄ•luÃsV/äCâŸ¡ž¹õ0>\fIÛc˜áÖj•)WùýqœDW^ú–¾Õÿ—»:å½Sí¶îB³ú%á“LÉMâ‡0äNÇÌLàÉõ|SŸÓåä€0•(‘;¹Â7Xáþ*Òô“?×"Õ%}0„~0¶o²ëšŽ†êÙ ñ»_Dq©z' }s¬\üž*†`ˆÌ©´zä	ÒÎ'Á»²Ö.c‚±Éœóÿux.K÷rÍt6E¸)½¨jG_ûÑ`ØIGW'ß]Þ™RèÐÔÑ¦>TïKË
¯ØÅ#ˆ¸J)ªj\>0zU§Y*k#óE}“«	­´É&„ª7†] <ø—ÄùØ]HcOÄŽÌÙ'ê&z )‰ÐM¿8&·ž-CÍ„p§c<§\*Ò5½˜m*®Vj¡‚ô0Ã Âs T7" øhmí©‹EJwÆ˜/j"ßÈÛYÚ#­a]^ø’,á	/¡e=åöùó@•ÒÌõ8ŠŸÊG B”š7ðÐË\¥S¹µE3å‹ð ˜˜þ<AˆÇ ëñ…wÌ¿M–šUdG+~Oám£›éeÌ›Ú×`û‹\Qê¦åLiŒÂfîòx´HË…™¿”ÎÛ
?/fY`]öÍ˜Ñ×?9ýB$x@€‡5TÊÃ¬o½ GË.ä¹Ø£¥GKâÆ>±Vçô)bQF¦^žXÑDô$.BÚ’+ÆÎë€(×EêÔy0¹Ç…’£^6{ƒÏ$'
DÖ69ïe`Þ`BrÐò»1$öý[+|¡…Å9X T†/VóÝ‰²‡1¤0+ŸæáëíÅP|‘À³§Qß›’óJ$Ë˜,rR¿=—$C‘Ñë2§þ%JvåwŽ¹-†‚$Dø¯F’Ëu®hóQ’8VlWÔ`ÔÖ†D3²•€Bä:wbè¹ë<àÍ½ä-ˆ÷%š¢ =ºî‚›¯»³ÕW<ù%ÕôT™ñ)¸ž:¨‡Œx7óú˜Ó¯ì52Fÿs„‡™O¹ŸŠ·~u©ÏGáIŽúÊhŸ‰ŽàqÄý6›DçQ6ì˜â¦¦Jàü–HÍÆ-d´(n+Ë¦Œ[>ÙþH!!ãðíÌH¶ LÊt‚š I•Ò‰ßŠýWUœ ˜L.Jà¯?I9bNêó"p?)Aàã’×ÆÝ‡ºN,C ¥âÉBé¸î³¿•&*âú\¥
ERäBB9Ž¡ƒ·ÚCº{¢APLA{S¤¿^­#µ¾™RÆ9ãÏSÔ”n
òÆœk/Viáæó”RG4ÄÛ¡çÉz2g÷ìéÏïÞd×NðÞ&+e†¼hm}v†ÀÙ?{úÏûØç’ˆ	µ½ºúÐ7Z±©Î÷óWnÔ=«‡éïò…Èž÷ã¬—‡ü]Ù¨Æ=XàûQ“©Ån•<L€$œMÍ¹iàÞ¸	·À¼)íºù"Å é­²îáfñçEAk~«øiÒg|vÂ¿Ãn‚²´·ØLGP²±ÆÚc¡VÇ„¼ŒØ êÇÝMv/å2ãÖ1Ã zuDZþ ‹ïÃŸÍJòT¢þ"×5ç¼7‡YÔNø[\¥‹Ã!((¶ÿr0Î]ÁŽxŠkŒbF0¤é%À£PŒYk#TÂ÷‘tÏ›r,Œáúa”@ÉòoYãä½&8E–ÆÇÃÆ½÷nßøäîÎ{J9tg8ÈäˆùÂƒ*ˆ¤åìŠÒ«Gª"P×2²q»ÕX
þc|ŠËG‚©:€Ç%zJØ×fÁ™¶†ˆ£\Ù<öÎ%5ð¼™,‰Í±‡¼òÆýŒ/Òwãã> ÃëÇAô .Îù¢N†*š]aJë‡5_Q”hò> Ñ`'iaõ½C&®Ô$òm.J–†i/ndèb6X‚3ô›xá|²x4Îú!ê®&;
Óéå=C«‚²V4Bsrg››ÛPÏº¹–‚Ýê‡sç‚u,ÏÞº!ys ug Ì]öA›WÁs»Êæ—\P[P°ÿQn¶™ßlšŠƒÐ$¼Ôºiü\¿àöˆ U"ÁîÑs˜6VPqs·áJ_¿Åoî‚þþøË)ƒkMD§0¶%"¥Zj{.¸–†ƒn2jÌ³ÆüÂý•)™äN&k:s/í§z*¯^†éˆƒÃÕuÈØõÔdå2d–Iä¤2ÐwTk(OA'%	MÍ®ÉFy9‡É¾ìä.ç»ô2¢õ,," è.–!S:N­4 `,–Þ
I£<èù&[š’°a¦4C„/+-_Ÿl…¿Ä^]]ÉM‰&ï)×Q†4ÍU$æ:Ñ¸ðµžBž·Ek]CJË5•u/ä48	r¹³Î§h°9AYvö´f[Ï£Á<ñ¤qNG¬Œ`(Ç¥é¦©p-V´â@¾¦YòW|À›Çì Ž¸>§µît³ÎBIx^f4ä¤Y§MéiÌºT—&n¹üáX¯½‰Ÿ³ô>û¹‡¸töÚ‡!
>·ýh¦›ÏÞ~ä7¿Í7>¾¡uR«QÜ³°¡ƒéÖïw GM\–Ú¢2ÀÌ™¼^FìIa÷Ü·[*v`’-J³F¬ÑS ’ø·÷OÝê(„Ãì„ï~Ù’‰« ¥è¨#äú1ÉÈˆiPxYU
œÐGY4¨Ë
J"«É–ãøúO+ÙW¡:SÀÆU ¸Q°‡&f¤6mÙë”ù'à{úÎˆ oÔ—9mW@o¹Áx£Í_G[3›×o¼½óÁíýOÞ¿qïÎ­½½[ïÝuö*ìîL Å¥ãã`˜7æ¾þôô ¬û| r¦Õ“³ÄÎžþsŸÍ#º_ëìé/Æ"×u^:_¤3c+ÌksÁîøwð *¯½àÈPZrØîœÛÝB*W1óä7¥êRO_’ÕÆ«6×Ë$o÷:ÿÿüC8wôq÷Š´0Ú/i¹×ŸžvÊ-	¾ÛhÕÿžÊÄyÜ!_[Kïžsrâ®YPõp+dÃY®µºA-×
)åÜèú ?D³–Ã°§wŠîÆŠQ lq[”^c9 ìˆÄ€è§#xÒô(®¬‡ÕßÃkCjA-“)PgÙP¦øL|…iÚê<·º48Dj4ˆN)v8l®„ªÒlÏ=Õ¢'ˆã×L5ÞnÁ†Ê:.Jkˆ[Œs6²ý(£ä/êÉ× ¤Îô¡‚KP¼{‰I´¶Ë+V´622sŒ¥·¦ÓÎ<? ã	mÌ‚óÌÉT(n‚.Uìšzhœl5‘+s¿ŠTEŒDl•1áŸŸ$pî?$E$J  M>‘{l«¹=Wž×s[ËÍmå^‡§_µ0õE"•©S®Š—_ÿð5Šeãæ>²ÜÌe?Ìw¡‹~òÎ½÷>xO„£0FpA„
nµ”t:Â¸Ù9dWÄç%œØh${(’¢)¾¡Â°VÞîRÌWÌqã!´—5ì¥¤ßêŽÛñ°ñptbÙn‚Á-Â=`Å½VtÔKB„JµŸvãw¿é
‘D,¤¢#ey™ñ§@óÆš%’my2ÛfÅ Ÿð¯ÂÃ|­U}äÂ¶‹»Ã˜ö3Šû|ßîÇGl/5à3|ñùÃ|¼¶ÎæÐŸû™›HQR¹î1ªë“ª«¯Êˆ«{õdQ¨²—–×-±²eSn¥Ý4N ™î¸a¯pÇñÏþ@g¯ßžüÐŽ†¸]5Ão/«û€×Òžî7#Z€”HÅÍw.V+¯{—âåŠKqn[Ì•%éH†¨Wç"iœ¨u´è½8êÄåÅQ2A5yI"þqa;9¨š»Mÿ6a¬=wwR€ö’O´Û‘×ÎžýòBi ØÙ-ËúÓ¯¯AP³†ƒQgú°%µóBq½öf™nÖçk×†¥¬V4àc¢-•4Sìûž=Ú&h,fÛbVbûÍô±PÎÉ¹:`CÏ;Yƒg«æöü½vå
Ë“JÃEßžIÝ*öXÕŠïSö„t^h·Uq×UGîÓ<p›VOø„~]IÞ™3‹öüpÔŽz«CßE¾ªHƒ¶³mûaI…®&b*ÆHŠ‡«£X¹5.²ä'­)DÓU#©v.RqØ²’Œd¤\5¡mspÐX#uSÃ‚“·¢%¡PÙ`mmÕœWÕ¼
5‡Î#¡¢8Š)DÈ¬ÐÝ³–,
GÞYî’¥¿jj¾EqœL¼¨ŸmQu–'8Ýž'WoN*×£v¡_0g…;]®œ!÷æÊdÈ	¹Þ…ü·'4‚_{ç]h£àÝW=î&j×^«hµèW]Zµ{Q7¿n]Ï¯[ue×eªOÉÙuZŸêÌ¤'“”wšOÍ{Rœ×¾ù:Bp[¿@^N[=NG yjqÊGµ6G¶1ïöxÓržÜ	La¿žà³}[£‹0j&ª›ØÞïÄ)kŸþGRõUC-DÿÈ'þ11ýÚçVø@ÏGQïÑoÊòþÚÊ`?¿­Ž¤ïðÝºêE¦£èwusøÈjã´I5åe"W%ÖT ÁwïÝØÙ¿@Ýíø wGˆ¬4Œ¹uÙŽø¬¯‹4>3(ï‰Óžùö@‡¿·nˆÊ½EÆÚ¶lhØP“!óº
±ñ¾—2êœþÂþC‚/Fg°œbà`é«ˆ[v¢ Ï ï´”ùê8Z*°Cyëú¦ÄåN[·ørûkñW€Ö8¥B [“ýµÞƒÛ ÀÕól.PŠbÚr¡å¡ÚÇª¥9«þbï½»K\õæÚ7^
Úü9jÁS\˜ÕâÐdµÄ~‡å°.9(¿}i¼¸X+)·P	ˆè™§_yÈ—ÂOó"T¥°fdkN°F[{YE-.ÝÔyC3hlÓÈ²øëS\S§ÄO",*ÏU1u±U+UKŸŒû×: êünÊ­ù]¤Ø¶O't©%ƒEúÆÊò[z¹øÛ\ÖxâZ)úåŽHéJD(:%bE2½¥ ;P¹M‹AÙãYÕ±Zùöj·s`žËþöÚêS>BoÐÖµ¸Û½`£–Ür³ÅÕrC8W©-ìU²ðólv—Eê&…p
õ}Éþ8©º6Þ/ []‚¥²ùÃÍÁå%‹§|^®r¬0K‡²RÂÍA&\Už¼!Û"|"ô§pt+%îÐ¡GûÀWt¹„­\ŽNìòAbØ•ºÂM#4+ësjØ$ŽWÚÁ¼¡žHí×yq€0·m²à±uöìËHìO g‡Êâ”ôö¯¯¹"ªyÊ¯å7âH>"Iå‘†92ÊÆvn³f0—*yš ~ãÂ›Í5¯Îâ[0ë/ZD™¥@6"v¡~ŠåÃ¸{€ ,\ãç2H¥ãÖa¿q\Ê6[Ï·E· üŠ{ú±¼&{F¡åõ•Ó¶(¾‰5mh”2
Ô¹ò*Åª–`­‘p5òwë,¿r—]ÙÜ7Äm2;ì¦¡eo3!Ì«ÞµY}/âöÕÈ¶UÑ€4Ü{•»Äk­F×Üö×Ÿ*ÄoCæð	ø¹ªrø\â"Tüäà°t`F'Ú’¤hNsñ×êˆ/ÚBUïåàãB6AˆR>G”é€ª>ß·1¹xÛ7{ÉHEFwÚmÁŸò„î]¬›ª``ù¬,×Äs¸ÇÖŒZK|>–Ó»už*Ç=‡ÀÅV÷µ¼Ò6ÈQ%œ.ÿiÿCøMCmÛ«œäqŠ“÷³äðÐ U—œa‡·ÆÃMÔJuŸï>‹«~o’¼v—ø:Œ;|ÈâìŠJ™Q›xÀ˜¯ŽÂÌªH,ŽöÈŒ\±
XúN4¸_é'¥œÒqO
ï/‚PsÛÕáÒ—¤„„(þ¯J®.ÉówÓvunu/‹3í?!1H“ë+*3Â_M M,_I1×ƒkÂR<p´xÿ¢¨àRˆÿqIþÐ†÷ßÚxtôqô»¼yr£õð˜ïõƒEÔ'é ”	öW‹«ùÂkÖ$7Íb>9 k.ø:öâ(ƒzZ­D§9L»c®Ò@&øéÒŒ[)œ|=~·ƒRþòq¿'äJnÝêÆ£àÄ7äÂ>Ä¨9°´´ŽÞëƒÛ]¼:nø")\åÌCv	¦9Rf#Vêüûzxie|û[Â¼ŒiÿÝøøzzÔÏÛŒ—†üðfÑ!š`3¡rŒÐ
Ÿ Öfx$µ&.«8”6bh#«åüÂÒ(½ÅÙ.ßDE*`Ãx[Ö“=Óò¶âÐÒ UžâNÌØã{ÒÏ†‹YþG.‡·úïÇY’¶—:Ñ°”ä®‘í&ßÁ-¾‰ÐÛ oj&Ã“åF‡!®$=GoãÝ4‰À„øêŒosúÆåÊ+õ£VÊ±Œo’d­ÛT""åÝ3C—&@Eo@×âu„ß6¯2ÓªºÀa`T›åáÂ©Ñ3(º$ëÓ¯>9ë£Q1†ÔAÎÌ«3lBÝÒÇ-W‰KŠ~íhµ~ð¹,µ(ú3ÔŸÉ8ô¢‚åB…Ï—çø—0EìHê´@…:Íå`õ0i¹L22OPúú pfiž
~¯i
¾ëaœñ-ïÞñÕ%@—†ûë^ƒ¦–î)`â^‚Ý7MNög'‰žC|‡”ëøSK>ÊœÚ€”Ø4†$ÿÜõoHp+_üÔî6äŸAƒŸ¨†êˆ_Á¤}8‚ËFÊ>„vÜë\sMˆŽ4üçCÍÜj¡|%Œ)þ‚Ê€³…'/½ß£¨fV¥Dü¡¨Þ1†ì*{ð:RÐèñâÖKWþæCC´`}§æ¹b+gÁüü“…€‡P¹ËÕê¹Yoà VÀyZ÷ßZëŽ[Mj­ã²<oKn2™¾Ÿ_ÿ­.V>Ñ@GÑÐ‘ôâ%Ù­sø–7eŠ“É›#û£zÆ>ìüûbÏkTt[h¯år²¼ñsY	­e4É£z/¥W	/oòWq±Š=ÐìPõ\›nRÆóõRŒt/Åè9y)(N}yÔÅNF¹“¡˜žT·:N´ÙSË¬ŸÂ¨/tã27t~»°	ˆ(ÇÅÏ¤ÏËh%šôß¬ÏÓ`¥‘y7/œÈ€NÀ"£$­¯<	]Æ'‰KjÌ¿ô‹š@³üüØ[z:­ñÀ ìäS~¤ÀLzƒ.2ïÄš•¾NjO¬RÌ«+š»5¶bº @ä’\ eX8¥ÅfÁ­kPcW—×˜
_ùeˆÐ1‚,Œ+g³{öô\3?{ö+€{ý)þñsŠeï¼
hÉap¨Ú×½ÄKÕùœïž=ûJdí!k}csd\¢±^¶C“GîðÞvly×´ŸŸ›¥¯²çfeñ?4Ç¯wú™ØT~î×?Q©HÞùxæï‰Ü÷0[hØ%aé`D(	++~ü*!gríOû¦:Eƒú^.Ê{–mÏ÷•]|Ó·á=>Ñ ,‰ÞýúÓ…±Ü!è´w³5VÓÊùïËkZÍQilóÚµðÎ}€%XwÇVû^2êì¦½^4l·Óƒ\hß¬oç"µN4…ƒ*~hä1ÜœOŽ”ó5·f×Ä’¢¯â·¡&Ü¦áÆãdˆ	bØì¦(Jf×¢~ŸË}ÃI,¯¾fbC’¦G‹©”´µµÂ*wƒ
·._¶ãz–«` ¡¬ªw	Òy"d7‘ \FuËû	 àoµêTÏ¸[ÉëhÔp
iûÈ–š&Õlä0°)¡ÜofÄD¤ÌD³""Ÿ,*¯Æ·räöL!ÍøÖ@rÜÕ’‘%„ëˆk,‰t	¨t­ÍpwI0wöp¡vkâbÀcäÏdCægUÎâÇ8ŸJ!D¨F·¬Ðu$F£•™
i¿;Î²¸ß:n¸%ÌR$e5a¬fG„*C¾´R«¨8TN³§Äº…Ê—ÕƒUE:³ªÿ¯ÿösáŒªs¿¡2ãFhèxPY<·Ôíê‹xíg!°Ñ‚5¯%*Ÿ½ÅD|1­c%±¨ÊË4ñ/ÓÎiÕ¨Ò9O!*íÑRdßBÌAI•
Öÿ—PýUÿ{'àˆ+
BöQ”ts=ã¶ÑÛ¬­åãUÖÕêšlÔRÊÛì"t£Ë„þnŒ&üJNÄ®Üý×2:‰Y[“Ãí •âôçÇ¾Í#°6jh%üýâå
î{EÏ¦åÅ_¼Y ‡>V
¼¹¼|,4×}Sa5;ðy“Eýã,i?Þd}´ H –2y#éÅ{£Œ]aØV."(ß8‰R#~@‰`Ó›åNÕë CãíK­LÜ›ù;X_Š“q>	 GÄ
¤œ¤*w*Ç®™çå›¦„æÆÅÅÉ@¡Ý¢‰‚c»>D„U3"ÜÙßÂmV¼{€M3}û¦Fìôë„¦fàÎ‘×¶ê*Ùµ
v*÷­k$ç¾Î$óÕÇõf¹€‘<zrtŸ{7Þ¹µ·ãÂüh%™ý×|.7ôë>xÿúÎþOößÛß¹×îjZ¹éœ=ûûþ!Âí°AÔñ¬Ð¬“ƒkƒ ,Ï£KÚ¤ï§#‘@á|Te–ÍÓÉ@ˆÚl>‘»õ.ôà­À}Ru³ïé:¼¬¹±Ìe®2,½®ó([ƒr¾R?ìqi 'áD@iÐføB¯Ua@ÇÁä-/Ž:\i:ìÔXñ»ÿï—›ŽÑÉ{O—lÔIMj‘8+I§òü°–!J‚™Ø­˜]K×²N6"é0qøEŒDbC8Ô $zSÃÈQþŠ@øÖ¡ò„=æºp‰ŒàB@Ö"¾›µü›“ßöX°ûòZØBüæq®ðy—Ûl"8Ù¸C-r$ Y Ó¤w*˜V~ñÓÒÓëÍ[ëž~ÖS(3Ûw+cSò8`2ØøVâ”±CnŠ&Æ(ÈÉ§N?ëwØ£2?p°è´u½3MV?³\àEÑÖyí]Uþ`ÎÊ¬Ö,7qøóìNw¬Ãm/Ù2Ú÷i%ì}U;'S¢ÄSBUÁÄ _€Òæ÷Bor5ÜP%»\q]
zøû«K+k3à&¿{k#¶Ž²Sð*¹Bž©äF_ÁEI aâàšùßÜ}‡½{úìî;§s—íþ`÷¦s²ú™ÿf5Ojð$—¦TZ²Ÿ‚Kï½~÷¸þœr3!­WIs]¹fÒæº•÷&÷Õ‹-ÈœlÅ`ž¼ßm»n/ãæ;T>]ã2˜Ç\LZEäÃÿ{¢YàÆ÷qAtiQƒNzãî(oS÷»0±±*Vée-;€?-)µêsvU~“8j¶:ëÀŒÍžñ~ëz4Š0@y
ól] ¼Ûœ[;õú&Ýp½jO’îÖrgÝ3jµŒ_\}N€Ãdq	3·ýÎÙ³/®óm²‚4´¡úèM?k{ú{þW¯~6â
ÑÓÖ’G—ð+
!ÙZƒ¡ëv<Ð;0ú¯ÎgîèW‰wUàÜ¹¯ó0•›Ñ«‰öñrÁ>†ú-=C©ºç´§‹ü‡Úb™}
+Â‚õ™ô‰½‹ dHWÖC·Ç­¸ÑˆZ­ î'Bü/öüSº$.°•…_jûÖNÆÃ{(j%M„>I~êïÉÅ¨Xä+ÈœÝÛ
v@Àß«@{&+£_*b÷Ò£€Í–ßÉ%‚´é«	S.u §\ƒË}~7Eä/âÆ¨ï¹ßšnI#¯rÊ®-®ñ§"6"OóN3­)o²0žu-m{…+²Æ$¤
«Þj|lü¿Á-“G¢Jº>I´KÜm7îv=NœBâ›ÃºbÌ‘‰*2²”·3ÙK&€¼ÊM‘ƒ'¦äŸËÍKTÌ¡=vO¦­ÌâžÂ_ï!ö”7.íe‰î1Ÿº'âaçnH[*ŽÜØ<ì¤Cú²:JpÒò±ÅQÒÌ²¸Ç—ÃsÙ5´¥CòrÛgÄEÓÎÌ1®ó(¿Ñæ:Ü(:Z¼®ß&Ez>ª_Œ#¯8ŠóˆSˆ"JCµA*O™-\õøy¨…‚ñ%Ä¤ŠŽÅìL RW‚[òû”kðW€ú®¬ÖCÉü›—ßÃ™VÃÂaàùe³ @A^-Ymƒ¨;,U ÙyÄã°·)à+‘0ˆÐ€QÖ3Õª¸¿¾Ô~oEI™5í–7F4;¥Òº¯ÒÂYU'Ð*D? I¯¯A^×Zþ|ËšíƒUÓ‹€¼}‰ÿ3‚šÝqÏë‚cvTƒ &†Ë#"ÆŸ†Õlº#25šA}iåÆóÖ²Ö®÷Î>,f1ˆËPÌ}5	“EXø_ÿ„Ï}g@ñ›_wº.r  ¬Ì•c¡X¶ãYŸçqQb4Þ„hFC‰#£AW€¥Ìœá0§”r¶!t0É¹8Î˜ÈæS ­å”¾ŸÂÜÎŽÒÞ"Ø´ÛmFîºFJ‹éw½ÖŸç¥{z)¦lì ŒÅ8«§7ÔY-%eã>Ø›YÝºò,õYc¸1À¼ÆjØ¼jáj9bþÎ3!9ò*Àë'¦Ê-RÍÑªd¦Z<MXoY-¶WdU­ó¼•€v}nqJ·šT#H9+9ÙmÁ”5µ:ÊÂX-Pçáó[óö,L6…~ìðôrÝ{?L#?–?qÇqkUAõõMçè›¶ Ïòš¬žè&‡;Jd ëÁH„#«¥–ø¥%ÃÚÄŒ•ˆ4‹
·9Ò‹D`Ç&ŸíU7mCƒWRÚV´ãE:ñË•Wô5
è9½BKµÒŸàKOïÇ¸R°5é¨ú´óéNNS7[^(iD‚Wˆo|RÓ©29ô‹ÀKÒtcÍ7°Õ.¬[öE+¨²1Šy³ÆÞ«àxCPÎíÎF6é°‹„±õvšŽJ\MÜ@Ò¾ÕaoÓ«Õxè¥ç²ì–´±U½.Âb-Zª“^Â1›nž=ûò˜5ÏžýÕ¬t»ë¼ÞWbœ\EÃrÁr§æ@7´,‹ù(yšZ^fb"Ž*­2‘g4deÍu“áhÉÛ°Ìn°£˜EYÌúéˆ%}Ñë¥íøüÒ¹Š<G~ofüýwYÔn£Þ}ÄF>—d¯ÜY‹ünü°£(áªbï˜¹îX$`ìá>üæÉîO2‹q¶~ÿÄm1‹l€Ç‹—EJ 5 #ø‡-²/	»çŠõ£ãZkDùn„8©88—gÙï+~Ü®O„Ç­|ç]>b\PWùïì,ue”‰\™õ•y°ïâŠÀÄèmÚù½ü­ÝÃ"£•žÐ—R7ùŠìàI8/·p„8¹—úT]g¦Ž:S}Ú€-c4”©¥û8¦¨ ôõÎÍùW#ÉÍ«±jhŽ¼ðC,>Ç4pªè¡TÇIÃhÈfo#ð.VñÌó÷`åu6nC/ñ[-4º
¸~@4TÏìz0åntG±âïP¨‡:¦”æ=Ào_wµøä¿€&P¡7NŸõ§Ñ£	µQñ;::sSàcB áG¬]ÌG³‚¸xOÎ;úbñÑæ#ü‹T`|!Ê àRpÁsér Œç_Ý‹¹’/PP5§/<YxÀ/iF)Ôaü´'îVÀ ˆ’xß)òËÿ®e”…, (ÞCãh	˜“ÎÅóà»ô¾J‚üV9;%û	×KwÚ\'E‡öp§Õë„¯×…:˜SõssŸÔ:Û”Œèüö”„ˆ\î€å—12á&ûOÓsøXµâ­øOÞ&K™ÿ×ÆÝ‡×ù b1<CŸ`	¥qeÑ°³æÂÓ€ðª 5>ý*r¿•'¢IÌv¿ä=ø2j½Öp9³z¥EÊ¥bÂ¿×|)îzq”Þ»xç;Ý.áµ3ÖN†®ÑVð¤ùÙº2Å”ÁjÇ}çÃr½£kæ|ŠÙá¯³^QÒ1†1·èÚQv<g7Áî]¥°ÑôxÀ…´WìŒÝ
®‚¸}OÛŽŠ%Uì;Ó+;ì×ªÊpÜ»ÀšÂ{2î±ï0åc’1ç+"²âØ“œêHÍ ;¤éÈMOb&™®Ev¤CKUÖ²TÃl¥°3¡(ÿÆ$T“Â†ÀX„5PïX`b-uã>©ýÞ žT@jO)·JÁþáÚ"Ÿ–|åx—
Gxö^>«÷î’Þð6(Û›¨ Ø¯|ÅwzêÔÚ¸ZîÙ[¡·ÔÏâïsŠºËtˆÜù”³ƒÛ0Ã4[¤‰ˆ1CUœ£AsoçQ”t1M°xJ‘qÒÕá(¦ål¼ÂznËWšCÂ0ÚJ…Qƒ©-½Ê¹dñ8)zx•=ø¯ÿõßU2ÅëÐL£b÷-°Ef51zO ê~¹çÔ8tê4Ôá«KòiUr¤ÄÍq“RªöV¨|%N*Bñ»c®æ°¿÷à”UN`L]a¢„œäQ?uøß'Ã<xëÍõ¹)ìÖ=7.œ?8ÑGç µÀ>¡R
{¸DŠµƒ4É¢~ÄÕ\o†»¥ì ¶nÎøMÝ0ëÑ\4‡îq,
Å=tC»Ë«t‚ªâ{éˆËÚÝÖQiÇËù+¢€5N¬ïÅY£¶µÜôè».HÔ!D²‚Ò«Ž’Q‡›èb¶øñ_mâm„E7ê7M`Z¢þv/Grêßhç%Üò™È¿¿º!2
UvFý…áß/
ˆ“ÐŽ•S®äæ^§Ž¾£×å79¸ag¿ÿz‰—ûc†ÉËóOs·×P=œ'…pª}ò^Ê-n¹ê÷£æpŠuž­È´a´gŸÇ†Ï*×z‚IËè¤Õ÷Í"Âö§U™ÛÕÜ¯Vjë¸æÆöÎÏ«l.·¥ð&Nýml²¹’¿^+Ž*@žë{ÞÜ³\[÷TÊöZéÀáÏ˜l|þS­•Å|¬Ú¯îtSPsÊ)’—{Æþ{"0ž'9@›ð¦›KŸp“†$Í^µ¹8´_í¹¨ æ\, Ü_úÉhàÂÕ™“àÐ¼zsJM^Ý	‰½¯9ã^œEÝöK?¿þôìÙÏ»É&gùÙÙwb„jŸnJ†*-¿€j+#¸ô—	;]lÙY*AÑzíÍ£Å{í^_%6÷Ø¬&ç¹›‘ÊgÓ&~:2ŒÌyN•û\Yiîdr¡ €™^bt‹â8™Ïu9ÎñÇJ`¤fç–®¿Õô_X^ÀâÖÎÀÑ¶’É­Q³­éèaËkêRÓK¶QÁir¼s’X^…?GBî7Ï† ß×¼o#0ÞR‰ä¾ŸŸÍŠñPà‰;ïê-¯øÈáÌsT`óuFOéQÜ¤þ7þO™¿ÆëŠsDáVœQ8O	E6·ýQÜ;‡ nSxçðú’t1SÌðßM&/É¡8ðÞœÂ7­“îduåÉöêJØkUºlmãÉöÚFíË6øÝ6jß­ìIœI¼‰üƒõk‘—§ §Ê?j`%f‰Œ-ãœ;i3éÆìÃ$>ÚdpµÝ{WÝ@¾#®˜È¹o˜]~1¯c[÷äïU–‘1ï­Y$|Ø³K†|Gˆ+X¥ÑA¹ÛôEE¸õï¤íäà˜]aZna#~£¢n#CD—ïñ-2=jˆ\CÝ‡+t#*ÿ{oÜ„w’%\l‹ÓøuÀüÓ¤h.ÒÛéQœírA»ððß®.ÅðëUóg~¸¬âÁøÝh'#Á\Ä{_hôHÎup•=xý¤z¾Æ#Ï~‚x2 ÔØ×ÐÁç1õU#²\Ÿ“™ÜCóëìí&Ž¨0ëwF&¹‘öC¹I<PÝ.CGËÁ°>®ÏæŽ&H*IÀ:û”/1K9i)ˆÙ‹ÉŠ¸Ç&Æb0íÚ®ì³b«f[&ýVwÜŽ‡xÎ´Te]Š¢næÔÀ ;'õQƒ1xyue¬Ó
$°§/ž°h‰7j€sê®š)`B¢!‡Ì"[9o‰Êîh"	6^DÌ ¾Y*iê¨(î.ïèfH×9É09t*ì¬ü$CÂM	ÔÇ‰	,00šâ‹[„¡ŸÙ¸Óªd´Ê˜rþE5—UÏuÝXÄY *Œ>IU"ÊÜ¥è£V³€ !<;‘ŒÊC€ä)Çw¤®àÓ‚Ç¤Ñuf÷._$’èÂƒËI2‚I2*&‰@Æ„91€Å×ð@|êÀG5ošÆ_³œEÁ0¶Œ¾0®Ët’Ã7ä/×š‘·ÉJêŠ[Ôªšµø×å"ÿ^[ñÎÙŠë˜HótW¹¿0¶Dé?u .OUvšÌIô0Š6„‡û9Œ¡`Á¥ñÚæO1óa,Y ¨ñÒ;æ_Kš1BQÞ;ÛÆÙ «MSù·6Êò›óæ¯€(èô«A••Ì|V"…Ø¬^…f>ÀÇd5gùsuÇy«·6ÓÇlÛ*ÌD•/…¿bþ¢ðÿÕ
f‹S¸Hkßº
Õ<!³ üÒ+î²// R‘ûÅdg|ú1q©×A?‚›ß_ZZ‚Ïtÿã 8‚°ä»Ã¿*ûö6ãÿ·i>–´ÎÏñCˆ#€L¡Þ«a‡•ÐÉÖ$_/·».ngøÆI/=qôÁ„pB.Y©LÊ(÷&—	¤ÈÃ<]-;˜@Àèµ.'6J<®a@rÊ‰†Ýð)F«ž 
·ÅçaÔ¡¯¥AöcJíKúÞS^Èä0Hª¬}”™RµÔøY58‡žæ2b:ˆ£ºÏyY	ÏpbWJß
‘(«IúS ÏTjI%^°:ƒÂØû¬²Çºü(C„Á
´ÆQ­-¬m®-“œgý&€’‚øˆXlRQ[÷|ø_aÿ›U’•I›%ìDa¨eiâa'JGç¼â8éñéÙÃGÈ}j»?þkÄ²Óÿ˜'Éi¢à{)†s*ÂòYiîé4p¤‹ø:Adþêµã"²±øMïýŽöaé˜ZSv±ßã^bŸÍFŒFŽo9F³|Ìù…÷‰£˜oußO™\9÷‚l¬,_ÊmoÓç7±+_êP…î‘¿Ž$®¸=~1"¾ÍðâQ¾¼r.Ë•£-Qm$¼°›n ¯¸ß.jÍœµýb
íI4œšØ dt;>H¨’½J¦êÌðô×tÜê,ö¢~27­JúÑ°@/K)]S 4eP¸Ñ¼ BÑ:-kÞý(8åÍÌ1[G·‰Â)Cv†)unŸ=û×Û‡|1¢>Û7ÙÕÚ×Ë?ÞS@Â)H¿”+²(2Žö©ÏéDÕpg6ôÙ­gJçó[}©‡Ä³5Ø6õÕ9Ì~8œ+`§bI‚|6	¦Å:ÙÚë‚±9ôMu,%þúSÁ¤
øIÿ£ß¡ÐHôQ¯ì<Êk‘òI¤’Ì„ß¾i	=Ï¹[ð¬g´¹œ7¨{Ìl¶l…çé·§ÎÔ	æiYJŸ£9ÚWÝ«ÿžŒµ¦¢u"êpp¸`¦„'&A–T¡â¬³ ¿‚S2%)ªèD?;¼úOœ> .§VQÃ¶Ç”íJÆ{îƒ'Ôàñ`ðˆÒ+¿«@ÎÆÿg²UÐá= ¿!­þýîxhÞò¿ã%}´Ö‚ÚaØ#raôJšûÜö»’ÆJiF`ók`m:É sú{Æ7õ/aûÌ40'ÇÜöÍÓ/Ž`õ×X½ó÷€Kúìg¬{öìÇ-	}"°IGgÏ~p¤€¿]}˜œ=ýC/Hõ3!S„uµúK¾®ÇÃ‡£t S¢‘\’Xõ%s¡{íM‘#|? çŽ¬p/s6…7û’w½åÁzOÕî`Iý¯¢‰{—Ä4¬‹®ùþEô1€—nÐp³aC/0¾>U\“Öw¢Qg‰£DQœy­màÀz…ÿ¶IS/G¼=ÓÏŸ¶Èá¯üž:Ÿò?÷(;‘¶Ü¯–Ôah'VUáêÔ©¶hìêç×(fo°;§_¼ø¾XB/¾[˜uÐ<ý<½ôE÷'è~ÑÃUŠC½Áx'?;½øÞíêº«ÿEwM{¯PûK³¥\Ûû¼EêZ˜6\k¦ÊÝb>Ÿ:üåªDƒã[V<ÜÄip¼ZUipœWe4ÐÙ\ÿè!´R58j”«Á1W-8»d pÃ?Í†ûƒ›ìð2>ÁJ <Ž`‰ŸãsFMZH‡Ÿ2¼4R½ÃÝ¸Û5ŠzÉæ¶A4‘à¨m&Á1S	š]N1Ù9pLcëÀ1óüb8jY6Á^Ì Ï;E:/h	Áªæ»?,‡)ã|+‹’ŽNŠ£-M*ü-±ƒ–ÿ”SÏ“¤‹ã<Š=±ÇÄä½5K ‰Õ5Øbùf‘H•ö]Þ=ÛÑ˜ìœÈW•þ×Mb5!ŽI'{©â–8–Õøaœu~z™Ÿ%†›3±ˆ$ïr%Õ¤åSpÔ®öÃ'¡ÖIÁAÜ0'ªüÃÎ¸«ÿ6V*)q¥â¿sÙIj ñyÎmpgYˆ=õÔn˜%ÚØ%ç;ø3­ÄÇù‹!J8Òi†~òÜõ‰õ†‰Šú‹´À*¬”VIV1j•ì×š¡²ýj!”¿d­”¾‰ÓVí¿ØºýøÏo°JŠ³|~3È¥
G¸râ¥^Ó†M®†‘-Õª÷»¬ãaŽ³eŠ÷Úìhñ ¡•Aá¨‹òÁN=Švn/2¤vÚW~øŠ®¡Zl”¸OSBÅ!ÞbDê›´
;HžvçUˆ½¨wYT(’•°$bÉãFªp|éµª|þ×Qg¦¨C[ÇjI-ªFòÇ‰ƒZÔöœ¥õä¾”I*È^M	NQqôÀÚU’ÌÌfzx®¨?•¹~QTŽQ]ÕèÜÕ`üïj  8s'exÚlõ]ˆþ`åÕ"Z)FÃe”+cÖO4¥!ÄIš¤´T®˜DÝ¤5·}-¯¦v™ W0c-L¦EL¶é¥ŠšBš©O.ÀÑJ;épDŠâ†¤•öëG¡ÄáH•9X×5¿Lý(ìóÂ&§…ŸK¢:ä¦þ@/4	[*%ÈŒý„uAUŠƒ(¦¬u,ŠPßˆ-ÐjÅQ¯"QÞ€*kMj8&šØpÔžÜpÔšà„’ÅºSŽÙUªCrŸ–jõrjïèe{cI‹­Ëåùß éå­dœéÄªY†¨9­våt"œÁH¸$Æ(ó¨1§,µç;£B…â•7ŠcÚü"ìO½ù=áìž`n×šÙÎúÇÉföùT5ªCGC-T^ªEëyNÚÊ#ëMì:Óú\œ=„=¹ÂØ-?½óÇ)K,±ƒ”þ™fCÚÝãvË•“·žÔ©ÏœQ~ÒÂK{“ç_~)ï;“"LÙ1òû’d:zó‚Ê2ÉCH\Ð”åì!±düËl?z¨v$Žù£ø©zùÑU¼û0oMûªN¯©ªvwŠNK%§[ÚµŠ›(Ã(Õbd„èhÞ%õ“L®Dmüwš3ÿ°x¥=>{¹\ïñí g¬¾A“¯Ò2<‰Z@HýÂòˆüÖó6ùg1Ù—"ßöÛ·6ûÑ£äP ¤<ñptÜu »ûåV¯½‰Ÿ³ô>[%‹Näa`ÉZ™T\`²C{‘–„á¢Ùz;á«r‹âLˆ¹ä™¨t«³^M¨Ü±W÷@Vh7ŽÚPÒ$`sÛÚÌä‚ëìÙß‚4³†>c¶–;ëÎø!7Ë© R{£ÅUW‘×6·÷Qn6¡7#výìÙoX>ù™gÏþK3^öèô3`•Ì}'M»1ÛëÄñÈ	«9S¨u(1I›WÌ'¿ØM÷SèRtml‰°nïŽöÆM¾–óí$ãJ«Û¬Uz<<†rƒãÅ5:ÄÈ)ðÃÛ–(ŠœÙJìuwv{f<€Fò!<ÛÊU6oæ#iÜ#ùêÖžÁ×Ö&Ðõà¦6
Ýb.»Úzâpã9WJ‰½ï£,6eEÎôêÑwî"ª¹<³ßË¢ûæä!.ÒÅ!,ÒW|f2›ù9eiÿð¥œ °•í2¾yà×Ÿ¤@ýS®1£ŠªËêÚ3ÕO¨XÕN<bÅeàmí´Zñ`õ[ñ¨òYbí¦ôÌ\9‘ìƒ
)Á|ræ§¹Î¿“¶áDþëŒÂ„7Ïÿ²Ÿ©WNàÿöß11ñŠÈOt´ÐO¾?Ž÷ÅyÚö³U	Ä•¼Â~^ýP¯âûYQþ2ø™Úö³’~ÔÝÑ/)ãƒ;Ñ@Œÿà}2<±øìè‰‘‹s¥”›c¿æ0æíecHP»yiWN*_Ù¯þ«·ùÄ†¨O|#ËRþÎmßRz{

Ë]Æ/]3òVOæÕcoÿÞÞß/n9šqþäïvâõ$ê¦‡à¶.:eý9Ø7G£¡3|o­rÙîÞ‡êÝÙ~³·…ÀD|°Ä¿¶s,ÒÙæ"³ŠLc¿s
N°œRr¸Øírð$‰ª¤6H—¶\&¨=\<Ì¸Ã÷ïÅQº˜1´xó 1ãß©‚Ÿ·´ÊµÇEî¶›¤z¶vi 2Íë5±˜x\rPÐ½eõÂQ\~.cvö*µr?ÆÝatÅéFœag‚Û*W
ÐKÔdo=&)þ^5K•ºhb–Ê”É i*R—Ö‡xWnòÇ@÷ÛOÀP9ð8?ãvjG ÅÀÉ?2ŒVÓ¤ÅèBÖ{È¿å£¡+^gÏ¾ŒDºç»yú¿Í*{ƒ­±îég|PùÅbX ›@×£
¯q•£suðªu¼ù?ñ“¸Vs_j\ò¾wEÀmèöÊKÑ³;ŽD™Z;è†¯Š”&ðF›|…´³t !³×pHÖ44ç›DŽ¥ ’P–¯ü‹0XvífÈ€ø(wêð¦ÎùJ3ùrä›#‹šÃ´;æÖFÒG†wÙ4zëÄ?e¾Ê> GM:ˆZÉèxñÍ¹í	Yò§Ò{`ÜS>)32Vh7$Nº.;Ç!G™Ž#R>½ŽÒ³iŸºWY,çô€Ù~Å•[}ü–ˆH#²þúñ»ÎoX.Y°'ÀnŠ‚ìüCc<é_¾7½ó:’¿›ÚþRNsÉù:ÀÿÌ/>H¥«½ÏBfŽ³®‡WÔ">J ù•‚8äyXÜ0<ÌªŸ¡ÍÞ_ €D½5ã®sk«Ìé7}pN“VnÝNú€º8ú·-›¾²þáöPïÅÁð—w¸‡½B‹Ã¡?9@¡ e0¡hÿ€¿®¸ÃUnœÏ]?ý¼Ï7]>²Æ8´pß„9P$R¾[Ÿþü K—Xg47——Ûik¸$Ôó¥VÚã‹;W†Ëíå¥¥¥…PWDÔéad¤Ïnÿƒ¬ŠøWàWÀ*µQÀ¬àM‚Y¥÷Å²
' V™ª{Ð€íÒÜÚ7
xÝ*˜Ûáº¿DB¸×|®Rmt„;Tr{Çý–—Ð ´“!D3Ñ×ñUK½Ô”džlÚ7Õàß¤&A´çÑŽ—é^[}*Ì(§ždû’;6N„B›qu¤H•¤Ô² QúÖ+\LæÜ¨¹¹¦>ˆaUD3¯®QsqqËþúÓ¨d_ðÕM¯i	CËÛ§Ù½ø ‹‡Ý#s«¸ãUó™5kªÏðy©\,¾s(¨ðd D”º
öE™7U‘:’€R<À´qU´4òÇh—U“—Dq!„‘DÜ^+i8Âr¼ÿ_^QÅžÑ\A½_“Š< Xƒ½J²2(Ùn¤:ÁË`üìv’ˆÏž>Ów}TÁÃ”Ÿ78~ÓÿôMu«_ðÿØÌpÆøpê„{Âa•Ëª¡ƒsÛs× sTäñ¾´N¿2Üègã×àÚø!{÷æTW;ýcðú%£ŽPlZü¾’øhÁçU d…OøÓžÉÿ  ÿÿ ‹ùxœì}msÇ‘æ÷ûeœÎ˜‘93 HP$ ƒ)’'Ò ×{\†Ù˜iÌ´ÑÓ=êî! Ãˆ°O|w+Å®c×áØ°eÎ±¶~Ñml˜ß~ Cÿ÷K®2«º»ººªºz0 HŠã0…é©®×¬¬Ì'³2½`»5G†Ik®½8sma¹œàÚ †ÏrÏ{f.AË@5¤ë;q¼æÝ•™­0HZ›¡ß#‰»›´bßIÜÖ•¹¹™k«ÇÏ?“$:zÞ%dpô‹ Oïè×còâ“ãÃ-ñ.‘»øË<yvô^j¾ÒÿÆ×MHÿøð“.‰Ÿÿ™$Ç‡À·JÝ>~þï	~6"ÉàèÿÐGC/àïÑ¢Ï?áù/è£dpüüté{IZ4ñ(ùüSô¼ãÃ$:úWúh? Å?OÚæÉêTÌVEãÏüGÍ¯û‘;
£dmãQä“o~“4ôÐjÄÅÂ%z<??Ú}BpábwèÉ‹·87G¶|w—x‰;Œ[]7HÜˆôQk¾½HF»­yº<ã KËÎ'@&•Í~Ëº‘ã÷h¬Åôû;´ÍÍ0êÑ†Ø²_æé/£= bhzDá8è¹½ÖÖØ÷	Ï\6K<ˆ< þ™k/>¾±v‡Ü¿wô?×È{ÇÏÿïFõ6XvÈ r·VÄI> ‰õÝdeæ»›¾lÏÈõWf‚0¹írÒ7Ü(r£™Òl{AÏë‡­Ëtƒð™-A÷#ß\Ý$g³Ë†4ƒÿåö¼ñÐ8çEâ80Sðí]Úfàø÷él‰ýÞi]$ú/ÀnfÓI:fzw&¤öæŽÒeúå´‘¤DÂHd¸×º<s­bßtÞ&Ý.}5&¾'$v»‰äíŽn¦äPêéº­½Ö%Ã*Èïà2Ã?­nè“x¸„Gáü]X~úý{ã8ñ¶öZ›n²ãºR„©1®½<¸T"ËxÈ7Œït·%ÖMÆ£‘uØ¥¤Hö‚~kÇë¹tÆÔ$»PA“œ\»yüü3:¤e¹Ç‡¿£k@ù.œGŸÑ¾ú½Cü£_6'­ð¦Óë»wá{m>ÛkÅgâ~¼’1œVR"OÙŠßgÅvcq~ó0.T9TJg[žO§Æí­mprkûnÐO¤wôÇ _5´Ž­bM;ƒK%F¥E§ƒVúðy‘¯lývH¶=z¬áÄ<ügô=ÊÂáï?tIÒÃ‘lÒC”t>¥ß£¯~OÁYš©ÂA¼ÜYœ”]ÚHeâ#Cg·µƒÛa§Bìú[­8‰Ü¤;€=…ßqV¬ÜeòNâ=cŒº5_Mäë®Ñ&…*œÍ8ôÇ”•ûîVBYjÒÓ£lÐºD{{IZŽ
‹mÜFã¤’G”lÝ=ÝheF\W$@aÁÚíöLemÏìæ'"¦ùpO¬œ Oßl¸M²r.Lò°PGÃm³“µM4«ëævä·®’QÔº;sžNéÕlïúÅb!Ýý”H(Aä°;Ž—xIÎ`*zQ¹HÒL™e´ô³¼9N’0¨,‡óê{Ým:­šYµ˜I¢¤ÓÈë$Ñ”T%ŽÁ«ðð2²˜Èpœ€À€µš¨ªù(“ïå’K¸q(WÏþŒÑç+]GÈ´«×[ª’s;%Å@û{F\Å³…¬¬¬9rÝHiT ú¯n’8q’q,r	*ÕåÄ™HS`É© Ã¿ÂÖ¼çç¥tG.¤ôªßõ$Qn1_¾ØÅÙº.vRÕ\“— ;ðO:raQV@Á¡|ðH£”%ýá&¯xCèú&m°kV•°Çïz¾»>Š\§ÇôÞå_¡”¥’Œ+i„ÁÅ²ú®bbì1Õè ¤u¾$Ý¯>¥ùáÏ‚ÜÍ#ªqwáŸ5ªhO(Ÿ,¦òI¦¤²ƒžöi˜P†ïÓ™Ñ”j_CÇûY1Óß{TÒü#Wô¿ÑþS¹“ã	wÂ°ï»d– ÎeÓãÃÏº¤;ð "é(áüÜ8ÂŒàÏGÏ“²î+SH®­
ýžyñññáßÓŠQÈ
úÎÞL
’d Æg¬Åm*“ýÜã(‡¸ B“w3¦ôZ…`ØÈgºŸ›d‰èä\[^ÄGw8Jö&gFS@v³Pà—ä}£©â&eZÍ¨2z2sí=._àØÓç{tISÝg48ú‡­žþñð7tA¾tØLT«XžL`°T{Mê¿©ÀýVà•(rQ¶~QÔœttæÚw`pHÕþñáßv‹ã¬>v-h±ŠÔ'è9QôC*o†ôð£KRØIè´;›tÏ×¢:$@õ…tö
óY&Ó|ö:—çDÁV¥˜A	åc
^a•ßYœ«Á1í4±y+í¸ÄwWà¿šÃh2=NGc?vê±	Räa9FDùÚƒãç¢gÔd‘mÍJ5Ø¯t§zðkw0f qtô©G¶þ…ÊNT¥!Àø7Ór¾Œªðg	ðì îŸãçÿÖåuÐýþÅ¤=Xx[IÞÚ·ÒÎð–Ú–ðGõA¯˜i.5C#9k âêd ew0/ùT‰saew¨Dº¹($*ø;Õ:ïÌàc[~¸Óx½ÝtÔ;J¸$8½d	;Ú¯$3„Œû(; è°å¡»uPýª0ª¬»€V ¸3h=¦Äw£Ð÷7¨•<º¬ã(£V?r6‰Ó˜bIx´éùÄõÝnb¥ŽYì#™ÿ±Êp,6=}g¤¸ï†Ïmà±ž»Tö£K^„ÿÒ˜ª7ô<ÜCvŽ|ŸxJ›%"±j3mõa¸SÐ)RÕ3‰(9e…–õ‰ãxá%0ûÎ\Aÿ!â€ù¨{àr6ˆ@Át,Ì¥Ôÿxa´ûÝ¹ï.Ò[ðgÔßtsðí¹Åæ“l›QÎBR$e·ú É?w~¸vÇvŽ:Ù$Ù6°ÿþæ÷(]¶·Ý½¸!iÊçž4­ûÙfÂmcdªmò*ÑÎz½ïFáÎlJ†Î¨Ñ ±¾çî¡|¶oý6ea'Ä‹×é0¨ª¼B‚þ|×s)g!;«ú/&¨õƒ(ü­“ýA'V#ôu’PV³‡Uâ_“W¹É8
,P3ñ#l©ZïB©ee?ë©Ï.~$	|@EMßÝûp 
³`Ì‰Ÿœ9ì?ƒ`¢QîH<·Áfº‡ÿáGÃ(ô˜¡)?2/ì`-‡²ãÞ8rðËÂœ‰¯,–7T¯Ì¥g‘ÈAáKïÓ“{DÞª³Ø'Û×ÉlAt^,Š/WSÉ–>£'!•af©z0[D,gk6@{œ’÷u^B¥yÝÀ_g&YƒoÅü Ý8Mh¦fáNäŒ°­¡´v`½qÁ"òx}ÛŒ\g»µ¼®ö ŸÖ#L{†Ï>’ø@iYcü.ÌsªÙ¸[Äô{œ8ì§u»¡Š3_Øj•µ§ÆsFÇmÐR‚éÂ†ì†~Õ9]óÏ¾°_ê±ÑôÃÎš[^Ä­äpÞÌ:qwvâéü¬ÜgTóy4*J=Q¼˜šµ;!w´ž¯úT!6}¿îçÔû	Þš|ÄË7"*í<)Æ‹î!Ù^¤C)§òª(h;}:ŸO†@ßü×	'¤öY
å$ûÚJÛ–_©-ºÂ§†t`9|Þª»X©WA¿²×Çn†½=»qîœ¾P¢Pc”’#ürD÷z»µe&|2ÞSæS´B0	÷¶+P[DÍuÈ’)›š6ë!ˆ	0Gµ¤T•ÖšKP‡N†·yÙ¢Sÿ-È†î37X”ÐÎÅÅj£oú©³'Ø¼­ºT8•WK\åDY”%Ë’Øóºôü¤4wfLý(kìe:h !o‘‹µX!ßã0£u:°/l±“*¶é®íÒ>|\?èže£{œUú¤ŽÂxZí)èµi•[`³L˜NÏþ^ÛÀyhd3R³Þ‰4æÂæª}˜žPk.ê¶¢ÑBTc³Ýj¬z—Î«„æI1’-õDSA1,¡x¢«sIµ#ßèÎüÜìd]XJ7À„2.‚ÒªyUÕé	ûHÊê¸¨¹*mþç¯ ¯«ÕÖ×këk¶àï™îæºmMÈ‰kÉ‰ö’¢Ð#Ki±FWì:Á›·'yá)ØÊl}¶Œ•€{ùL¸uùÑ=JÉ!H!®O·vÄ?sÞÊ4=ÇÁ3¶Ú{\ÕlÁ?@sCÄBt¹ë~Ä¼‡ÿFso(—ßäËC´²ÿÀIí¡4t~(H#Hè’¸¤Eæ›ämÂ¾­{ßw©Ð4oA‘©ûMë¼Àû/v½F·“lÔÉñáOÀx|øIíaè}ÙÓ6rÇt–Bÿ»9-§æðmåˆõÞ´u´}æDž$+3Ü³ÕF¿‰é
­ÌÄC›²=/Ö[ÙçËÛ¼Ÿ,ûü¬aQä>ƒ'Œ´œÝÆü‚Ï`Ôõ
´®T_Œ¸8WßtøYéàõ+7]R-Ÿ¼@nC‡§¢û1¢J÷P­‹TnWå°þ; åX1üP8áÙOÂÄñÄ6,Âf¾ô»¥Þ ­7åÉbÍ|}ë%ßCëÎxjÛgŠR“îgíTÞ[î¬:Qo•ÎÝZª"¬@ù—RcËæ\(€¢eœ5#þ"üÀ/ÆÌÄã@Œ3*ÿÀË* -ö=ü£µ…CÊiè‚[—r| ªÑ&e+ØgÖUÚfáÏªn˜,¯³8%á¨Ì½øFúÊ>ÿC¡Àƒ:Ü[A‹œB·¡ïu»”´Øõûâ·rÙqìF+ûð¯¢xLµV*j¸¬ÿR®†ø¡ûáØ“xe_zP~ƒãßõ"ús¹·£(¤Q=•ß}Œ¢°ëÆqk¸}4"4®¦“ÛÉ¬LJ*Óy/ôÆAÿüÏÚWÿVè=
ú“OAñqú}¹3t¼ › Pß6CÊ›À5ï–çøa_P—ù¸QN©zîä¥è©õ>}žÝ¦ƒBäÚé"€äáÞHCÞ=µpÑJ¼ G¾›¸¤ÑÝ¤OÐ/ ËA× „g˜›éëo›ñzJÃÚò\üÞ„_š†Ì!zÀ®Ã:Ÿ8,ø|
R
Ie¸Äa K‹ˆåƒ__ÉµS¸ÍËAwÙ±¿|)½°7)©"
Å<%kdÉ›RlF»ùñ!¨­güÇ/)úA¢H ~¬ZäÍþÖõò#º,qÑZ{™
©—Y•éHaˆdï¾à˜BTŒº˜¥³Rè»f\·Ü¸y#Ä>J—%2³‹Þa0¿•Ó;6 ú$I@…k/]øÊºá<~—
ž
 ƒ’žH|ôiw oý‘‡Oh}ÌG{5ÔÁ½£?“ ôË€•¾P,^Ž4ÒÕÌT‚Ý}AÛÝ¥5É÷mÒi¦F¢—Žž`Šb¤l`}¼9ô’ôüZwž¹"›Pq×ÒL×¹È +«¾ð¿|ßÙt}2H†þ»ôIùE9(Fv­L.½°Ã]XuXð„;Ù?ÿÕ.Ç¯–;ØŠ²}ýÝh¯'tGY¢pczÝËiO 5íéâmÃ•ƒn®ï±³Ü_ÃM¹¨»vÌï^‡Ù2CjÁYußúýÂ{v÷­ùñÐSü¨ðÓÐë'¥¥JðGÂ;5J3§ÉÚXæ0‘HdJ¬¸{QàÅÛßÌˆAí¢ `q¼auóøùï²	w0ºz/­fµ¼Ž.¡erƒ‰ m’)}‹•H‰F3¬úÈë÷‹~û“mmà$Ö3)¶ô*;9õºæG‡Öi¹SƒqœýK•DŠ…â:£pNñúB¨3©Ã­9vLUÄŠuÄŠ!-@é‘jN}$ÎªÐ@ÕA+Ê+p¥ð\GÌ¯T>«YQŒ7§¯š_P½M”3ÇÍk©ç"Þs÷Àë.«ÖmS5uDÅí‘ÓG¨a¬Â°6aÇ4?2Ò¾ƒþÛÂó[JL2Ï¤ò½ª+=û°À±a©“VRí\Âœ*>$+¤¡ZDPXfg›í$¼î¸Ñª»ú-ò†
ë%*A¦jDærÍ/¤nI;àšR¹aªŠùãž7hÅ?ø®ÕÁl­†½iVéõ*+3öÀäŽŠB¸rfNU÷èÉÎüI [éŽd³Xéå][XH#u}L&¹¸ª• ˜åŒw¾ÖEÕRõ¹K[)Ììk\¼Ÿ]–ôñ-ò€y”³/ÑâZçÆ¬µEr sN1¦’M=uê{Ëx’5ã9%¶S“éœË™:Ã9)»9hcKT„T*KX—ÊŽ¡i¸‘’4£Šß€âHºarÓ†pŒšM£‘ƒ±ÔÆ”å2Ì,D’½Z4 g˜)IÈ2Sy=S_2b|’ÝRe×¬sn%D0àèœßOÿJµù.¿Kwßm=žk_½¢²Þÿê÷c•ù&aº¢²ALmþZî ¾R@ýŠS–5Òš¤0ïº›î{
v¾ˆ<tû ŠU`¾^L_Lßc¿ è+ƒ¿TÂ¼§)YJe×Ê‹ø¨ÁËkwŽ>Åè	 ðGw’gG
úKà¡C}7ŒÒî]OA-€X†¯q]£fÍ0um8Ý›ôá	†ÛÁ–Ipô‹½6Y-¼ðâCÝ¡JÌËm "|yTÝÃè¬ì‚³´+0<=‚WbA{”éÀ6kíÍ2Æà|g°ké(ìáƒ4~ZeÐÁå[.ZÕCÅ­ŒåèÃòÉ­üZQ1›W ^\î1êÑ©`¡¸>0•íÈû¼Äå™çêÌÅ9•:“ŠP)3öÐÍ.]Õ²™Ž¤¬ç¤BÆeä‘ÍÙÝ(L‹²°BêAI|¤“Äqø(xPð6JÑlœ(YÒÿK÷…ÈmtZl/1.{j
cvunw{3ÜUPûx½•ý§09­·Ø0´N¿å"E¼é¢>ú#ö¼OØåi·Ç	ï^/¦üŽñø|­ Z! è…L3ð€w¡iJÁâ¦ïaæçò˜nQøû®>1‰^ÄõcwmÂSº§Ò }Bÿ…ËW8[¦.h~9Pÿ CðŠö	™ddÚoÍË×æ9t¬U“öÙ6>°@ó›ÀC ð}—ž¸¯óH{xÍ4M
”É&¢–Se7¦R±òvÎ½‹.Íå¢cÉLám¥‘][¥±æ~~µ§Òx3Å /z9Thž›Ëò–3Ú,aß….e÷{×™Ÿ{Ò¤–‡‘Êò<Ö0o¹hÆçb%}cËƒûV2&{—½Z!djŠÖ4ØO,e–¶ODO–Ë5¬áË7|7¸žŽIŽ<x6F…-¬÷îÑ—Ž´‚uÄV©ý›(°b´LZýïºì?™qI3ÆÅçM}&;óŸ¯Ëçß]Ln‘Z©Af¢í6S†°…‚}Žô«ßƒE» )eäR=Ý£?¢‚…ÅÚÊ‰ª/%‹ÛA\#Ú›ü!#Sõ8Žšë°œ¬‚Q-Úê²-(¶spM&¬©rö˜Á?ÜtüTáD}sƒJMÕœ€½Èß»Ç^¿Š!˜ß8[íó~ˆ©[G¿¥; 4Ð[œ˜§ i‚ß/Ö_R=ÏI+Ô›Ì™h“Gœl Ù{™€ÉÈGeñÝË(Ð§¢‰´Ò+Î2ªŒk•fÖjë>¨q•ÂÎò£øfØYå^ä©A<…À6šH÷idMa?ßËoö4u4cob>˜Â¨˜ª(ƒ:3²dQ´P(0jXW]¨-±µ¡xq†ðE€qþFˆacp £Û²/µ¬@Á
`£ÄìPZ¸Æ$ÈFg;9°amØ5:1²a²FjÐƒG	áÐÓÒÉÑŽãÐ+íÀ#—‰€‡ò0˜‘Ë§´
>;,Ä(QŸ	&¢èÁpÓ®BTàÆX¸P’ ír¶¨JÉlg§FA%xÇÞvW~áMx¢,¾Ädè³´ã®js^¡¸U¯ðÊãÞãÞãÞ+cÜ³†OÍÂœúe¶ïAÿÎÖºWhñe³íŠÈ;]Lâ¡ôšZùJRÎ9ûjJ¤åž†>D'1óYH£Ê‚oL|bWOhâ+ˆ™¥XÁ¹ÙùJ²¶ÑÜW é•s÷[ý&ç<ul~Œ½œ‘Ås¸é=W€­¸‚Tð5ç
$èc>kôÀ¾}¶L¢ØvÎ& ÊBÎ&Ü¡ãùõøßÓpeõ#zjBï¤tSýØÇEZ<­}­œò>6òÍ±¿îæyª·£¡
Vƒ¥ç¸ñ…×~‡¼ãÃuBÜ)ïñlS—¥L!¦"Ï(À^GŸñ°×¿ÛÝD ÓßöåÖDô›Ÿ˜Fb¿–0 rrÌ¼øØá‚‚eKdF&ÆY5;}s{kËëznÐÝ›˜ËäUXóå+_N“G=gV“/‚’Ûä1\,‹ô‡cú„l{”¿ôB¹Ì×•©è÷4QÞžšå¿ßt’îÀÄ‘¤¢/câ<é†ïOÎ—X´
k¶d~ãuçJÇÏÿ×Äýúåù°£÷~¸Fß8ü'²ïfÀ²•OÄ•ÊAy,˜S—ŠV]²}|ø%U»Æ{XùGCôú|õù–‘ÀOKm*4WÖŸHrüüó,²Ÿ7¹7"Ç3&÷ÃÊ‹^Ì^aoTpMÑIŒõiRç+sÏOH!Àÿùp’w=ßýK'
 b¤†¬1#:DÍóÿÑck;ó§OŸÜCñ‰ð3™ÆVC¡8aÁÂFÞ=>ü‚ø´÷Œ]`DL1 Û”v·"Ik¾dd‚§ „#PÙV5ÉÌ1F7C_”#ž¦Ó2¹Qtx<‹Z)Üifö ‡˜lfQÄd<>)ÄÞ¯…]·=Ë¨ïY:Ï¯‹ùdF‘Û‚Œ2!7ûHãiÒ×ŒÞóxÚYÊÍ4ôe!~Ze°vÁ’§´Â¼A$p•¿·Ò
§&uÝtéÚñÈ÷’Æì_³M¶žÀí/ßœÉP07QÏþ¿þ’¬ÑÂgà\·4ÛÔÛ–y‘å£ÿžD8/Îp“®æ;é„Ýž7’aãÙ‡æéN]S{Õö\M¿W1Œç6)FtÞ=yïÅLyd
è½”	èÐ‡œp&ZUŸ´ñ^ÕÙêçYÌãy2Ü¬žnUºÛØ M)Ú±ÉF\b r¤¥ª45<æ®­Ì“%¥™0Xl˜XÈÛ&òÈï…^À¶—<qóÌë;Iµ»¾7Â€>íˆŽ`ƒVÓ€ºJ¯$¡'íxÜ…àÑª^Q59vBˆ
û/#1"-žœß˜‘*8(©oË«áhO—^vÑ#Žäõ¬	¬·RcÓÔ3šSK“jÁ'#éh¿„8˜§]=õœIïºBì}«û®†âç¦æABmå¹›cÏ‡ózÁF+,8I>;S³W¹éÎö`Lž¡r–Pm+ÁXÓð2°V‚Ðþ«S†×_j-OOª§á[#tRW¬+|¾U÷_ÅÅ>v1ÇL>¯máWˆQÜwöJ¡â-¸„èr>Ì¢à½¢ãÌ}ýŸPÒéùs‰²ÇÌYðˆ^?š?ðW-˜ƒºdMÎ°85Î DµæÝ­È«;:ö°:ïavG@VâQ1°ÒÍãÃŸž‚qý–GwoOÑC‡D$·;¾B²ß»&2¤¯'ªË"§J €Bï)ëú¢k`ˆ31HÐ#]
à¢˜ø¨˜^+@ _&@¡ÜN)n€R•/„„ÅP¦àÚ.Q“×SÇœ=ÿHÅ6xn¦™k;Ç‡ŸÂfú»ÂD7ÍML'¬=¬0ÅóPÉšë†2ÈP8N›Žü™|>JõÈÇ¥ÐOy1E“0ß†A
J¹ÏfábqÁÌñq•E¸[dôgožÐ1.3LYúÅ™Ê¿ffa°ÿ®Ý%7~ôþ•óvásvË;¢Áß{µÆÞ³p•+5Vß¿sô÷7ˆ¸~§ïÏÆ†É]fùûÖžlåò¯gÐº±-4¨vac³¯ÔÒeøðëë¬V"ÑÓôTã©ÝÔÒîiéþ}IÝÒ&c/›´ã.†â¯s1ŠçÈ`T2GÉñFôÐ‰gÀqä¶Î]ð`úÓ¤b¾m-tÈ¥_3® 9ÎÅÎ –<`	”r‡³}M…‰DOSä`@‡Rà`?Äõx©„IXJÆm8Š¶ðkÆPŒbÆù3•´Q4h¾5t¢Æ©ó™bKç"fp–psÜë»ÉDü€½jÅJE_3^ ¸âŸ%}?Ûí¯N<þ¾™É›¸,'‰òºlz™@OkË³vÎçæ?k{ru‚¿o­P”Ë¿ö»þ%»ŒËV@©QhøÄ×W·(Qëij¼1µ~‘þhÐ0Ò­ü’ê“qšL(²c4†â¯Ÿ1jç&i˜üB­†Ï¼Q>´ÊÇ0"¹­sQ@¼·AØlr»ç%îQ]É&l'ìµ
þ *W1,N1¤W¾j1æó¦à
Ä	¼!Ü§)e ¸yôiAøBrW¼ÂN'yz\aUtŽâöué>O rsVŒ/ÑhÏ,ÔA¶!²xe48ú‚_MU“%MrzuÞûTÌYãäÝ0¢NÄFùi›G<†
›ô„œ=P…?š§e?òzþËÖ1e°¾—È¨Úí’–oAÇÄhÐíEó5½‹üšžL=,N­Lˆ<r¬rV)½“ñhäF]'v5dªºNº¼êPù²çDERÍo“¶À"N6‡®OùÙL©W„]~ Û¥~SsEV.Ê¦ïj)îîbñ†*®ÅÆñáoà¼ûÅž6CÄ²6‘P°Ø¡&XµÐ­Aëj–džu$BÍk©ïívw=q(s¤¨KçÁ¥]~J=^ÌJcÍMeEJZõýee¬c:.9ÎqÒZÌ)xæä_ÿ÷@ÑøŒ–üÅÇÐ‰—~Ño½I–œ¿6Õ×gD1òH1NéáÎý	=«îS&ŸÊCi¦3Ò¬)[OhÉœÃ` )¿l³à¶>§(ÀWz+•km7èÿÒK«ápèÄJ aâø0´Xµrùâ³ÀÖ¬û¡ÁèÁTKýL	§»œëT·`‹‰È†ïAˆP;^ýÅÑÕAçÄZUÓË»¨]Þ¾è:þê/í£€*jÏÜh‹[]×Ë»¼|ÍVwujk[UÓ‰V–äÊÈ),ò-Vm0–×—é‚˜( o¯½øX›%ôT–\î½ ¹Ÿ"5ÄTÙ|è>sµPU Œ•½Ä4qÿèÏ¤žS¯ZÞ5ŒÌ7ôR°*—ÀfüÐuâ00®µ ƒ—^¬”Ä«Öùô2²(€·É¯‹ÀYv×M¯¤¼Î3³8ÏÜ¬3×
ðU†8œ²9P¨‰ì ð¢•D*øšÙ>Ê!hèžµq57iä=Ð¸UtéŠ¼qª)ó´ÌÐÊù8T@Ë“»SàÛÖÎré×}›¿l®0ÿÍ¾ðõu£èô4(°)µûÉà@Á¶îKê>1	_ÉLº6lE[ø5ã*FÇ‰ó$ìü&fòÆWBë+qêÜ¦ØÒÙùI°ïÀÀú’ziWr(lå–­,h³ûùÖ¿ºølç	bŽc)2j]NãŽ_]€¸ãRPê3‰@'†hÆü~™Àh#WBL ÿU¿pÈ‹3¦µi8[©,œ¢=±”º®óÂR2¦9Þ’ÈCpb{àxh½c 1 ¬	ÈWäü™ôD¼@üÉì1O†½%¥£„|\Ÿ
j¨J¥3^Rò)µiEW/÷Íä±+T1­n«Ê)l¦…0SÊpº‹så°çƒÖü|†h)mÐU¡°RBÒ$'VŽ“ŠROßJÓ”?pFU…ž@Jâ4•y{ËzÆh‰8Á²vHžLVVVˆêÝæõ,·¹zžYó¼ê‘Mü•Õ°ÇÓ¦4Ÿ‚(O…2ÒUG˜I•Í»Vœ°"/z|å
g°™P:|)ìË*”#¾Áy›Ðãl$!=s!öø(O&ßà3õ+ÒeU—êƒÀüxLª‹ãˆ0§¼ðŽ³‡þ˜
¶¾»•Ðþ@GÐ1èÙ¡ÿGJÒ½ÖV¹}Œ„®Œ»Æ›@ÀWó£Øn@R‡t	A¼×¾&NšßºB{wU_˜owN:lÈºÜâŠíqFìÕ’k¨ê=wïV¸du¹í˜N(­näôQQhh_×¥3×ºªh`d{‡®ÔH–è¹‘«éàÏ?Ù–Õt:†‡{¹1ÊXÀìl³„÷Ã7Z¥œºÑÌƒú7
ë¢,ÜTGÏãñóFúøyÂðóz#1†~ÑÑ.¾^éº¦Ž[ÏŽFíÎã•+'™X1s-Ë)âÆgNŸÕ}Ó¡¬S! k>ôŸÃ].žVÒQ[Î=Â3jTŒ§±ðÏæNw°×ÆÑÑyú³9"|4ôd:3p÷èÏŒI"žæ°¦I‡åsf¸H£¹6Á«³Z—–U™'Ðj¸¨Ò†`Ø÷ºEñ»ä¤ŠºEê¡ªžÀTT^qŒ¨ójä»DRh`È±;ôpØiÈcÈ²KNØQ´Ÿ…$3Åä7X|^¡3ÀgÂ#è#,±A5Å@TÌ@íÁÇàR*‰ç¿¹áø>|ã‚Úî¸‚"ßü&¾•¤·{Ã‘ïq½›XÝ¸Ýóbzòïåo‹Œ4!š*?%”ÆØ‚ôÞ Ó¦Æa‰@† Ñ¥B'Q’Ë£´"huÜçš¥¤ð¼5¼R]VnîÄÅàÚ´œ½¦ÌÛRzv ?z‰täYe ÌJE–›ª)ÚŸr©;_‰ÿâAâW„èÎ*|ù%~à¬´+óÒJ"'`T±‡ÎL	`ä3pC’ý:¸@0¿=CDjé£ˆ)1W)	%8‰ºp[]Éù*ò.ËûØ ?o"JjÈ˜ï+¦Ÿ`!–1“.cû(F¬N±•~?[Îè$~JŒTü¨v
åƒŠ­"]`®0ÂCF¢| Ÿ9£4üxdØÀø6H{þÑÐÖÔuÏ…ËutÏô|®Ð=ÇfÚb§þ‡D’1rj‘U*KM¤Çý7>l¦9Ý’hìêóB¢ðdÖŽ?‰©B·’ªéÔˆ,wJuß¶êšnæŒÀ¸&0æ"$
s =Uh8#•RUhI¥`¥Y\Q×Ïfê gnHPÐ]¦“êU‚™6Sº½Y¤ÙÉqŠQÞÔ,ö¢0?Yo­áŒ«2šÁ#í§p†xŸKWüÉ‚ hˆ×Õ*ûVŽàÀ¡Tƒð1È¬#‚E*5Ùü€¢|+èÂ]6XhÛ•<[,F8¬xýt9}>\~Ú<~zþäüý ÉÝ´P±ž31E’œËŒ”Å$½¥+¨†Mü·È
	¥Ç”Btíë)^]åðC­>UÐ£î†ÇÏÿZÓx‚U0™R­R)E‚
^pÙþ¶æÝjeÈ¬ÈïÖb¾a©&µc}	}lM@Y³°Äévi“!	Q1m~­ ØØˆ¿fg+ (5Hë~C¡W™wºˆ(:KàqG¼	¼f¬4:çøgú)
4õ( Øûë“Ô‚é©¡ã<•‡y)‰µˆLçÑlÁéô#ûÄmƒHŒr‰ì‹ƒ®ŠL"†%
šM\@‡P~å YFJŒØ¸ŠçÁ +=C°ÐKÁÂÜ[á­¸„è¯”œAàgô_ùÖË³•vÖ¥™ñWù»Î9„ÍsƒuDlªq‚¶šlëé\FpšÞ€Ç¯xœd,	Å„†GŸ!t”wbè8¯äå‚Žó~½¦Ð±0ño cé­W:Æó¤7N&ÂsR9Ü8±ñ¨²CeéT<qu™Y~Úð®ÕÂx1œ(¬ƒ^Q|ëÕÕ/Ò§µª­ÊÀ÷¾ïnð§œŠ¤uÂöËe•â¼ü*Š`|¥î©ýÒ•‡=RI÷&6V‘#wR,ÿ„®²Cü$ÕÛáøõ‘ü,_°R×ð²½e…Õgh½›/j£%Õµ¬~
¸Õ]!¬h¯VÀ<WPYÔÊGz\¯Ðy;|¾¡·ÂèµN ÚÄCH)\0q¨”ûaORíyñù¹¹ÎåNœpOµÎÙêI°pV­š(S‚2€æ€ÑXÊ:&%ûo04šÕß¦Á.åÛVaõ9Ö)r«ÚüÅ#”GkahªaÉòz‚u… AÎ‚Xs"Ð×0/•Â ßNUwŒÄZM¨®‘aÕÂètEÑ	[ÓC§*„žD}Ù,PaŒGïÉÏF/±1ªNÐÊË/©qD5›²
£\´(ªyî|a÷ƒ£Oƒ~u* ­énô†^ !µU­ÈP–ÉcìÛ•\c.Ê²X&jÄ§GµpVMÈ°[?
ö“`G—È‹1€^zOŽþ´G`ô8Ž>%Û”öÿ…|“$_ýþ+:!Äw<Õ1®× t¸a*l]I¤ãÅ„Úk×“Å¡“áñáÏ<Œ;ð!ŸLæ¢Ö5¶éi5…è÷¬@K€<]ÌË]ÙfÄ
. \i…a+C¯ëÄœeÓ¹{Òðé›~ØÝæ±¡×^|4Ôî6Þžî*EúQÉvh7²O;>lÇ#ßK³­Ùæã¹'@¸»C0„s³M½K%µ¿¢g;œæá:=Ðƒ~£i„íïA¤&VtÇQDyßYºHûÞ0w~e¼Ù¹ùYŒÜOÿkB/dà«k<}kŸö÷ õÖ~Ú™ƒ§&A7Îd”Ãàt%Š&åð“Jé·ªP˜ì€à*`×
k“Ô†& §ZSúÙ¿EÎ^{+
‡}Â£%2¿@.Æw/IIK¡¤EÉ·h)‘TÉÛ‹ÌžšÂ r<g/ÊÐøÓt²Wj°0Ïª©ÐFm”Mð]Ó×S!LÉÅŒ—}Ï—2qäüØáüÎHN‘ÛýÕ„Ün¹«¦c°(6¯LÇ øækÎ+=¾jÜÒl±äWÁtáQÖ9/ÒD{äô0ƒGcáÝf{ä+H×™-Æs
ëà
‘èzxðÔ\‡…¥ >¥Óe˜.JÔÍeôHàý}˜Ë4ŽäóÙ}Èb>ç#l‚ÃM‹¼Uãväâ>htx‹Ýûé\À‹°OY–¤J$Öî\3 ©ð98£cOûƒ…^ÁÏ»y=r~…ér"+k1Wæ2]ÇïƒÂ{aXP ƒ«U
1"š×PÙ…ÄjB Ê¥4â\i<æŸ‡Ìš¹VACåŽ»§Øö[Šùài.Ó„…Z.ä+[+DiîÐˆ—ˆª›ú¾éò©«QmLu+­¶0Æ"må~‚V
éNMu5™ö(ãŒÃ¨„IËñýp‡N*³ÊÒGÎ½‹äéÐ’=	•äÔœœ
Û¶*òÑL÷Ô‰‰þ0šÄ"Áƒ»¼ÍcOòàŽ
(HÆÅÈo¤”æ>JãQbj¿ Ù^î(_Õ~Ã§Nß=Qp·5eä»Š”ö.ŽúT_ÆÜU#
¤vcH‰4Qgá²JqÛ¶6[7côrTåÒ(ø—P¥“·²äòv±ÂáMGh;yñ‰u”“—…`ÙQ›b_ªŽžUƒ]ØQ3H¬uq®pKñmÝÕÊÃaH ñâá;½Q$ð£v»M›ÇÏ—ÍññáO»M}VÂ†¨‘Tãvù=‹ìvæ}€óÈLºãxI|º˜=FšqøS˜¬%‰å›¶ÏÉ2}œRˆ^U€ÙÉ³€d’² øD›ÿƒGïÍ;QºH¡‰¢*Íä©Dô½ÑË:¦/+nÕWSTèeÝ¸¾g›Ù*rïºïõJ×ÈòØ½/>.²•â1Oe¶ü¬—{z!|KÞ°ôÈ>c€à¢ÂËmyƒPˆèÁ}ÑÐè9¼N¦Î[øsßAòÊÝU™7ªÊ7–!0›d…òoÌ0Î<`aÅ¡0ü7õv*U*aèN²ÙÔßÊÒ 5º3Z^Xõ‚Ò”x±`¯m—%ãe®²ï]iqwõY-¨-)¨>y¬b“z¤Xïdu
—÷…¾›iÐÈ{=„ó6Å¼Ú¹Š_Kå™ÒàÑ©®ÃT!³ÓTgb3¿}H›¢_‡©¢7Ù¸Å¶…¼ß#ˆ’Ë)()	Øà_	—’•u‘£šÔrý¼Õ"‘Ÿ,l:eå{ˆ3ê ÊÞU]ÇwSx÷€ €^w^upžýuj,=5­’qr£B©ê^Å½9SéJå>fSâÇ&¥>VjæzuLB'Ö4ÙG¥–ÏcíU?]XåóÐ^±á—ukL¬¿Âç¾Ze<±6Ë¦F¿3[í5[øðM*íF­~Ÿ²Ž{Cõ¶Uwã&<5>'H-_+Ù-þ3V‰ÕÚÙY§Æäª±Ø™’r,f¹‘ˆù,ä^?bi¯¸Ž\/{ÝeïV¥ÂÒ¶QšO%VUz›²FüÐÝŠÜx°º£Ó‰ÅõÌ2ÖöŽG|ðÆ“+Âr_*`e'˜vj“r@AËÕ'’ãÃßäY³˜­úRž3+†nÒÏ‹y¾M©ƒŠTYññsÐ¢E<èøùç	<úLèj» `™…¹…Ë­¹K3€ A½üÁâÌ+”LK·Î­+v¤˜Ø³„ô$Sæö“ËéýŽ¿€ÃY•â/%ÉÓLóÇ»ˆéC‘¡ÝBJâjVÆÊÙq2]ÙšŒ¬/dRF&ºTâ}e®ö®ç»F:–Æ%.‰M?9W¤\”Mx”Ä~-Úor{·ëúÕõo§áB.!zÁ6¹†´p}àRR Vôþû÷”R‘#ŠƒeÇ)ñÈ€19ÃHý[€ÀKôç.“veï…üâhåå“Ç„Âr5~:W¡-¶\¸RÃãç¿«ÍÙåZÓkXù%œ‚d‹{}YžCWòsºªØž5lµƒ2ñ¾øäè9-©ëZÊÕòùØû>îêRJtˆäâ‡N/½á7I<Õ FzêÞ)»8‰±N3nŸß;0ÅªRËi·Š»ýÆøFTæÁ`p¸hÏ¨4ZšåÙTž²âïT''=wËûÌ/”’7]¨™b'àNk™8áÝû^\`¢§—`Ü•ªÛ]•„©n*3û`#©›ì3MË
¸à`Ös§õ8Nh›+f¸|²”- êG™o«Ê˜’³íZî[¶œïf|’tå”
ÍN˜ »éGþË=;÷ÿWÍŒx>Ô›ö#¦ü‹Š€SA@G[™ÉÄÂZ2pT¸@[ýr<@@"ú3@
;$l%#Nsù«ÈMí]?Þ½@ÚÝøÙ$Ð+(b£ °l.5Eœn×Qv½»Àz
ÿjËËkAÒ£;G¤Š4{I «ÁWî÷7
ñHÃY^’žeä®‰8ˆïPÂ¾ÄþbÎ®ø×nú¬2ŸðªæØ·lÃ—b¤ VZ<pò7„3‹LRá"®î*f#:”?Šü:w¿3Ø¨HßÊO[0ûèE/þ5Ïa
ë`ˆxCX¿xär\SH½ÚÇíýiKÓø[p5ùH˜„©©ÃYh%TÍýîÓcƒ÷KZEZ ³ñ¢•R¼7‡	2s?	$É(^êtza7n÷±ƒín8ìÄ£ˆê%1t5îô:¨—kkäP8ó$ÀáÑmU/âÍÂ»öÑ'‰®ZÉUqS‰Þ48Qœ/œïFáfFÿ¶é< VõƒoØNsqj©HVŠ°Ož‰Å»TïDáÜd£iXÏÙ4cº®eyL½YJ_Kd¦.(#ºâŠ)uü×za
ër@ö“½³_NØ„q¢F	5èR
„¨|9Ó-ùt¯½øøèK¸ø9E`M@ÖVi×kâjðŠª&—<7L­Ê80]D­;ð jÌ¯œ–ŽèUÅÒxBÐ2’¦Mý9u[š
Š–&[}E14`
¶Zf ‘ñ3üa¡d+yƒ½šØYÆŸß gS›7¸ÙÜlJ¸ÊrµQ3|ëuÂÌÒc&/ŸQE¼,•,¦–á,ÊX>|õ‘²”½½ÁÉ,K¿ÁÉN'ëÒí4J¶*¼ùºadÈd&DÈ2ø˜ÝôNàu6ÈX6–W
3í@Âoe	ª±6ždz–ÑBz!e+TÍGQcÍÖj˜à$í= sL‡Œ|ºÍÑaš
R»iÐÍeÂôs÷è3T†Ÿ6D7ÅÉsü~ Û:F®<<,/õ¡lÜDGtot˜«£ïú²×Aã`úâ@|DvÝa“ëáôûñé'<ì+?þmW$•¶†˜ÁÔñÑâÃšq6Ä`Ì ‚•ämrÿ«ßÉÑŸ—ÈLZzï&¸@žý"ê4 "¡h6}ügža|¦óƒU@[ÝÁÑÁ€ìÒßeD«0­§‹
KèèËƒ	ßÞÚòºžt÷\¯Æ…¡TþR4¬-|Vè0ªqy2ÖÜ/yÀˆéÃ1%¶¹snÉ3^€•*[H/tè¿pS¹Ç)>c7iX†|~®«o‹’Ë¨az1»w©¾85ô0[¢“{käde‚ä:Ü'ëÒÔŒ›Á´á /ÓióèîN>MëŽï*Ôò¥ µÒ[U²^U€‰	&ç’^¹k|{í–6ÞŽqzð–£nr4×söÐ}æJá¶bÚø‹ÒÄåõþºÝéc$½Úsy"N]‘CÅ®NÃÏ¿Ô&Š?õèÙšw¢¡Øì^ï)¶ô,[¸kxò&g‡¹:ƒ£ä–ë»T\¯<LX9ëãÄP¼æ2½»H‘kŒ×QÞÝ7|7‚0©t\Åê¸]ºŽ´{ô¥3¹yQn¿âú4&ÜèIF#?†²uØÙÊè0eáìÐº®ÞÉ®„èé¬'ÈÚx%#Š_jORËígRªéóÊYÞìz_|ëààšLm§Å!¸ïÈ(ìÜ¬9„¡x=qÆQ}˜ÄïŸÜ7¡°añZ ZÁ&ç÷„R÷PÐÖ{ðøQŽsrï"²pVŠ P ßìÇ6¹+jÒx)‘6ôwX+&N…ìKHŒ7Pã‡jø1½Öè³¤?ðÎR÷«OAÖú¹^Ÿ¦}9“¡/[ÊÐeÜxú°6újg…Í,Ž"Aâì–På>aKÒˆ)ëÑäŽ|t°²Splá—{:¹ŠkFoÓÀ|¹g€KùJïÙ`ÑJà6¯JÙº*š€\.8x&Ô»ŒO†^ \xžqaõ¤”ì|0)Œ=Ñ4 ˆm³6*XN_ëpò,äkJù©"Ø¸BVƒ€5A=Í¦ <ô²(l#ÞeØj7ÃTgêã§32ZBBm"jcULKüPÅuäø*ÜCGžj^iûT¯–Î ÖJL€ÇSÈ­–;XIœ^Xð‹Ê¬¥a‰ éYt—ù&E'ÄiFŒÝ:j]Ig/÷ÕsâÛ+D”±gäÁÑa¸™«yK½%e»¼YgML~6g!«nç¢2.gtÅ.©8 Úefž–îí/{&„Gã’9‚poµˆÈ°½^Ïe¼ÞÊLÎ[ãxÒ)Ê©]IòY-s¯
N\Ñ‰ñQ*Õ;H†þ»ad×m‘âdÏØið¸Ú•£KZÊ¢ÄS?ËF<•‡UÞ|ÚZ•©õ4gÊ<z.“=ƒ]N>fJuj“øÉr,~Eÿd%å·c‹~Áì¨Œ0'îYüPIåœõÜà_ñ:à+3£ÆX¦“j¦!•ô#9Ä×ÕT²ÙÄèwz’)â(("í6RˆÔŸÜÊÕÔPÇ›=ÐY
õþÅ‚9Õ­þ‘.=¶±¿ë`E}d»¨BÁ_öqí—;~Yª¯ô›Õ)@’{ÔZ¬6b—ÏüÁ%[)3<+¦ÇsíwøÄô3Ã~™Ÿ&Î[˜ü½£_!ÎÎ¯Æ¥Ù\²õdWöH%Îíî—%Ïs&Î\+s»T8M$»­`v%	„ù1“ñ>ñ4‰&ÏR©H’ù¹¶¢NSaáç ˜ UzR•ÀÅò¸­âÄd
öp#È#Ûi6¬FóÅ£h'rFÆ@€ôå.dwÖ¹è®¨ÌÌ-Q¿!° Ø@çÐGãiR>}Û'wÙyÙHW8ƒ^-R•-ËçA0¹wšD£{láEµ(èö	0Ó·e@5¿KD·ZîLó‰GâðèÓ¤Íø}eE6O‚#‚¬Åˆq7Ä{ ã°ÛÝD:AÖ†ÊPÐ'Nþ]y9Gƒ~•íJR“Q@¯6ŠÚ!Ñ8Iinbå¢fv«ðbiþkÜ™Ê¯·ñÛMiÝ¬¬d•>T&{ÜKàHÞSw½8	#³/XaÍ*—ªgÄº|9 O¬yåÊ³Áz¬Ì ®-ª”¶˜Ò/)º¸¢·AÊ7ABççS9¼?¥ä~äôèê%­$lQÝ:
‡9¼Bå!Ð.•‚5Ö½Z	õiäv¥·}Yí]B¶]ž+oÌÔW9½ÃÂÿÊã€©ÅØ”xÔ>ëƒ@wœïLç"€l2Bõ5Õ{ˆÌ­9ÌWÄ0÷›ä>y»Ìë®x
è"¦cÒZ&£¨È3"Ø5îŒ¬ÂQGÿêýa n\5ÄÚuÆ§ÊX€zÎÏ=<ÀÂ¥xÖ ,ÆÍ|'2Ç
ÃØ¾Z=Ûæ¬,š'öIdó¨`çA2–±×rÆIHºtÇÁîF¡ïo:24ñ}úÊ3ÏÝ!ëãáÐ¡„}3ÜX¢ºqt…T šÔ‚b–PÀ€G‚W¢ÂRj–P÷Ë¹ÿ¼ž»±Œ5n éÈÏ˜˜±ÔJ!ðSUîFÐ@êQR<úrhˆònÇ$ó™«—?c¨a0¦´ÔûÆ7Ð¶ùÐíÒ™TH¹¢(!%a1”€þÜY(‚.IYÝßã¦Óë»
APfq®6²-²ŒN¡^Qs®@H×Müf˜¥ÔA«iÈuLå)¸ºWª>1¿¯UÐ¹L·¥éŒé»Ar‘Â„Êéo¯*’òàªr	K5Q$‡á‚~j&¸ÍXÉb˜C"œÑä¬¹æ:útÄõÇ“rÐ³SVì:¢çD¢:>®ý	Ôy’'ÛT×YZ#Ø4³­Iv…qîµàëD}¼Nð·7|àF^Øk¨hyÈ2›öù4R?«)3¸Iäuò-		ð0ÄyÏ¾^ª!Îç†mÌ­5)äºç¨ 9á.“Ø”” Æ"Ó”a1”¶:;ºCXÎpÎ6‰³9ö¨Œ‡ºlêûìÞ€Š˜®·YÒ*Ø!sÍrêªŸ(©ÈÖ¬ôÊ­!@cÿA•(k¤|V³Ör³Œò\C¿©4Õ¿¨Þ´¢fÞpä»Cd±P7²¯ÕÁW¿wHtô¯³%¯¾Ê“TõuZÝ®mŸJ)L¬¹²RÚuM °ËZáD½@ÝÈ¥¯õn$  ÆÎ–û.^õQrþ¬ì2Ûëu<èìÑ¹{wi8œmòSOõa÷Ú.í}ÔóE-¾.Û•y­ úV-gømª9_oûnÐg¢ÆÜ0Ù)úêŸh1,½²àh^o¶x’R²I©e›®@ YGG‘ø(Ÿ×j¢ŒÇ›B(àQäìµ½ÿ«$Ì¼|^0Igê™S©eŒî¶™d¸!3«[IõáJ¬EI½å<ryÎ½ÿ¶N|~—²7ù-â¿øXÊ±Ë“ü<CÏNæÏÁ‡†R…*-àA¡Š¦’Äµ›Ð<e%™ÏÎjIgãøð'AÉ$ñL&ð¨ÇaÉ:éWªˆµöÿC ÖwUWËR…ß²9€O›r:ªVqèŒú}‰8ÁÞßëí.vIWyß‰}X2dúÚaBVŸhú½0±òm'ñÝ$L¿ðvÕ2™ju¡¢¬N`*ô mðv²_šämBg–ü]o×í5æñ œ›UW®ÉÃ\XâmwoeFNÚO˜Àƒ"ç‚“²:0f9Õx¨
ÎvTS
#ÍgÝ©`êÞ«Ë–²zäí¬€¯ä@Ù<ÞØÂÉÇ¹hš~¿=t<ôíŸÝXxÍéQ½ô³_¬„ž0&éB–$Å×š¼I}p¿¢È½ß¢E/—PÆù¢Ç‚±;tè¶8øOæ>›p´ˆ6Â—0×A˜ >hui!wl˜¹vòÐŽž/åõ _¤i®±d.3`I>K÷šL®¯œÚü ¥ýf÷òá>¹E«jz×TŠé”¤óÝaÃÛ‹¥ ÍB¹³…$ÅJx"³îUÙégŸqlË9´™!'ÅÀNu*¨|m¶”…õ‚Â†7tgTšÝr/ÛQ¢p×š†Hk§"å¨†æžbTSÌ]^Å,õ¹k<²ˆ¸¹…[0Ì¼“W–fÕêZ%<,sŽ¯?ÿÝˆìÒŽ–ÈœÝú<!p±5‰èig¼¡#£²…¡ˆ*>5.ÕÕ=‰eW™6]ÊêÜ¥ìâÿž¬d_}w+aêû¾ƒîwüKøëì7ÅQ´czH¸f;r©xÃ_(±R:Š¨¸êõv«¥ÔÄ1“ŠˆÊiA=&ñÒ‹ïÓ.Ç cÒ’dee…Ì™Ëß¨Ðæøô±yúÞü_”ÍBðétÈ-—î!ì~ˆ ®V^<¦u`.Ñþ˜åV¾ì»	‡‰ +š	¡%ÁÁŸJ¼«wÿûÚ]²~|øÛ³4¥Qäd§ÒØªRèïbÄomEÃ²ºe‰õlz[¤‘Ï%Ý“¸ìm>=0³oß¹·¾qûá¬úçÕ‡·olÜžmj'ÄnÚò‰£ÿ[»CÞ;úgróÆ(ËÏÿ÷#í¸S(¸Ð¥w”.…†:Ùl~àãU/êú®¦ fRˆëS&s[ž¯·þó£õ)Î×[îÁ4Ý;>üá#ÂÉÎn¾FãhäçDÇ¿
³ÅŸØLÖºGQ<Å™zpûáÛß½që–†òRÂÄ"§CÇ‡ÿ@ÖÑorçøðŸ>°›Öîžd“Š_„)Åï¶Ô7ÅÙ|ôÁ-ºO¿»ñþÆûSœ­Õãç¿ý€¬Ý¥ÿÙ \èÖîØMR·Ê©Ê.üMúVß_[ÿþ½[ÓeqHKdõèG«|è—käÎÝ{ˆ
þÓ=»Ésà´ËæŽ}¦Ž=°™¹;^òÀúÓap×Û^ÐõÇ=7nÌÞ{ðÁû)››Þ¤!} 4ökrû;«·ïÓM¹~÷öí»)K\ÇÏf¿†ßmæKºnYsÚÔ‚	“hnàtÜëý‰sÓ††õ"ÍªãwÇ îŽäõ¼­-7rƒ.®3QñîëÅ|ï}-…%Éè>ˆVð½àÀÖ¾‹þÙqjâ¾Þ8êtÌºE…­Êš² ÑÊè%ëgŽhjå•BM*qšŠÐ.jÐÎiÓ¢7ØÌ–ÆÄKÐö”%²C‹Ø`ðh¹”iƒhœ·¨i£4þl¶Ãvz=W9ðIú+T¦k_MàÖð°'aÂ™B5ò[WŒ	&à(AôÂ²ù®Ô¨xG>SÖP-[ IÁ¥Åd#…Kày ‡Ô"Ány£Î¶Ûšï,Tç"¢:¼¥çž$W­ €CáhEO}@.±ÿdG2‹å š/RÞ¨mC¡Á8a;èÌ6ÀSÑ„ÎŠW
Òð™¢qôñÞõ‚Ú^‰y³rãÐDSm„àØÐ4	Ñ;Wç„{¸,ó¥Õ1V¿TˆÓ¦/Ù;ûá:öcâµÅ$zNÔ#üŒiãLÉíŒ=Úk5U;‡îJpÚÞqUáÍ‚›Bnª¢c‹*€Ö"¿kYÙ5Bþã~Žˆ˜Qp+ë„åx÷Ÿ*ýHuØd:¤º£Di%¶
¢ã}$&uÀµÊ*
-£œ9¥ùÊùX¥åkUyíŠ÷!¿]Á¾•Orjé²¢R@B«;g7äJƒK…«å•Ü•5xoÕ²0q$¡G}œ8ÃeÅ²eI*¡²--Å±ÉûKs•µêÊaD0ÉD=ËÒ@UZÆMîúÊ'fžR=;­Ë”€/KR’=VŠG’Yœ‘ÅÎØçËïâ„§ÖrñYn14Û­"º‘4ÐÛágV Ð«™Hå^ÐßZ”JUGÛ‘Ü²¬!¦›‹Ò´¨fe6óâ…ËòèroìŠ-Á†o´½*ÚÌ\ªYéD¦èrcºÀAÅÏ4Vº²ˆàªÚF&­ÖåL®vH‰b:Ñ4ê“%·Ø?! «	îeC5£³Â!´¡9”æ%ŠÒ;°?‚`28úõp)ík’œÓê·öuªµÞ×NC9\ÏŸÊi‘ÎjÚ5sV}˜Ÿ!‚¸’{*A•RËóp’I°ØÛ %Ø ËÐº†a’m½ÒxÅ£kwŽ:ÒÒ¡|†9Fñí=ð¸·
KpßåÎƒW3XîðÊýXç	Šzã=.‰ªÃ`•ûkç&#Øþ é4’Ð®ŽœL›¨²w–$1ƒëiðÇéòÃ¢h¾VHJ•ùvMÌp¬VÞò¬b‰±f|eZ÷¹¤M“ÉÔ¥„êlšâG/˜IÇÙJ*ÁþnCm&Àk4g±7­eÇ3(ìÚI¯üÖ!`¬Ùr.–]¥?_®ÃÖ›RÓ$@C­d@…Çþ@+u]”-›’7©Òötý:‘éŠ>šp›ò!Ö›Qî<Ä[çedJö…¶ªx½µDë²@ö©˜cÀJ²9Îw¦øHÜ‹g9÷Vš5¤`®vOK6MÙ@¢†h¸VFkBñ#tü­ßKí5}£ê4°$vn¹^çÒîEaœ;"á¡cø½n¯Š–”]o)~¬Ðéô³/­Ûuòô[o	Uã)íùÓÊBÕg/ûXâ·ìS‰h°­v™ì‹­ú`T¤d€Iï]Ê»9³±-
ü	öîû›Â¦Ï=ÈP(þÞloy>=YÇÛOÐ¥u÷ý,›æÙfÅ}IåDÈ J‚g¶:Ó‹”ã(–yÿdƒB_ÞÇ8¹HÏõçÉy#]€iO.î=£“oùÃ<V°RxX /§õ²ÿ^3úõÈŒ·A·,ÆMI0´¬ÁGþððEôý4ÊS—!lO-’…ªñ¶p÷I„E#*L}`Òäµ=s#Î,—\°Â‚²q£­9•ÚÙ¢üáŠØîŠ°°Œp0þe[_…ßFù“{rtåë}_}î°y~Ð‘KÓ«ûu~'ë ¦¨¬lÄ .Óv8ËÇ­‹â-^×‹0>ílÓêªžÔ¾N:]@§Œ…TéÈ“¡ØK¨ö“x¥<8+O6¸âŸæîQù£º4qËÓ0ë°3<t¸ÒBÀ×ˆ•­¾(…O™ðÈ ©»*8·0“Âÿ  ÿÿì}koY–Ø÷ùÕBïœ©‡-Û­ö#¶lwc»{ÚêžA¡]"Kb­I‡U´¤ÑÈ`>$ù°È6 Y¦w0XÌì6v“	¤Å~Pgÿ‡÷—äžû~ß[%Û3&`‹¬ºï{î¹ç},î×Üh×JÞj>ýe•NªHßÙ„& ýŽtr_€`HlÌ¤ì#0}ÞŽ9	‘j;çYºý2]rzZ†dÔ-¹Ý“Ÿ„Pz^©Q€ÄüWë8’+!ñ;¹Cò£y-.¢æi—Z,n¨	¢Tù†ÎœåŒOã85UTô@	²š„¡ì85¼H·;:ûõIäü5NGltù‰+8:ÎããJW¦¬IX@FÝªÃ'´Ó–€ª9º$Ö¼K¡#_ÀßL¡Ä1½:µ•6oiËÜ»ÜˆáY>>6r‚‚B—kã¸˜8æ`ð"Ë»ØC°G3‡:r•@XsOqiÌ1ñÍ¯*ñÍ7^k|snƒjdåX@ürGðno:aPïøHç<ÝÈ3Ô9Tiw½¾—*íÁ3œÇa9Š( ÷
dÞ?ûF!d§‹z>ŽÀ…ÃÖÞúÄ1Ö®3‘äxšäN’ë][µÅñÅû4sµá|§À
üe×6~—Ì¸Z½ÑÖk®E–ñh	,%ÊüøX{ó¼ÓÉó»ƒOy·D„}ÏF—„ƒfñøªÜ0œù#“ªWr`¼+ð=aŒ!Ùãô³îsüŸƒ<§ÙÀÎ¾!ÉÀ~;…ôÄ¿¡Áaå¿ûå(Ù³Â†h†d¾ðúC[ÄùÄ*úÖŒ\~×U,#x™ÃW/¿…²¯¾ûçÁ?"Ù»‘Åž÷sš7–#†ˆÌÝJ	¸øbÙb²“î›Ùxæ¸²Ø„ÞÜ·“^À MF‚Òl¤ƒ-¸‹¤uéŽlHl	Ò´B¦¢5h-çAõøPS`.Ù$y#eŒÄLÆiÅaw“ùCÕ¶›;~ØÎ=è3DxH«.Ãâ8ÀN3N³ec1Í³¹ÃOVÒ<žèÔ
T§‡ó¸¹²oOÆ<÷î|¹ àò`˜0è<°Áqñ[ „Ù’.àÅ‘GäØW²³<Ùº%åª®wµî•w·èÎTtëòÎ,Ñµ§„òÊÒKËVØJÙX‰ûòZh™E¾áÉWTÍR¾(X¯ç¸éµÞìÇ“˜Ðð¢gÿ;w eª¹4{Dé3%Æõ·’&Dã»ÓÉ¸‡CƒXm1·†N5É‡M«Š45Éºù¸DMíZ—¬Óé@àeÞöÓ"ú/›£®y°Ê–ý\º*Ž'Ù‹¼˜"ª÷0/dj·Pa›>¼¥-²êžm²T¹Ef+B…»6·Ôu‰ÃÖI.T¢¾°¯<†êÈn”ÈŒ¼þôüÐð{÷pÖxù'nƒÒ4·yÙÏZõÈ……$n’’!71é	Bæ¦mÚi³iU•/è01Í:œÜ¬÷(Ç±ênvSÖ„ãà¥hÃ,[Äbl;‰*³vX7kB Ï5Úb‡ç=Òx|ÊÝãAg"8Hì7Þ¦úIþ\rÒº¼XDe›ß<H‹c}iÉ-¨ÍxBkU“i¦ŸµŒ¨. üòÙgòxÏõ;‹âgmÝ§ùñeF·5xíõá?E1ä0¸»ã·9<ÆÙÙŸb×Q§^Ö£lóßÔl°4÷ÇD|CÄ*B’3:ûuáNíO(/™y8&|êgI÷°0È.“‡ÙÁá3„ê­
KñÌ$Ï±Ðq¦C²®‚cŒ3fhš)l+ç[³á5ÁÑÔFkQ·4r7`Ä5ä¸	èˆ¼‘¯jìUäkÃY®"¶P[ä‚øtê©IŽ¹b²€;‰èø\”ñr÷†>ë¥¾¹ÀÞÕ+L{¤_cŽí‚ðhààKnànuÂ Øì¬E¬µ­Ò´‡á¶µ´™èm@¿óÁ /]Þf¤s¤…fË>GÃæ`Â}9¦ŠPì—¯^þ]š`¾æ^ÿ‰‘Õ¤~¤u%¨×ªÁ‹¼Î,øµ­ñ5`]ltIºÈ­º£Á|–ââ'Yb“è\.YÊ)¸-ÿ%™é¶°ÖBæº#*15®‘š^|d1¡â¦ œgÅ&êÕ†(Žú2¬àlñ’ÌÄ¿ÑÍáêô¹}Ôöy¶ëa´Ü D°}©çe­y*dÖw,SµÏ–ºåC@†¹»pJUNFŠ±Õì1g—;Bü»¦+º™p˜Ašf"àÂIn11ùœö„;ÉÍI6‚€_ŒUÊ˜çI×Fë¯€v¦Âð}c•Ö½ùStn³ÊÑxØ.t„SjØ9 ØKlÎì*þˆüÑià¥}c„OµŒeCÜcá¼á„x,MqŒ#Ë<±Ì¼Ì$Ç-9‚ÙÕNfÚ<–+`|M»$Yb/xÝbƒ¯Í½rx—²lÚÿ‚W06rÝå»Ç-O‰~›[\Æ22:'fÝëqÀ}ýözrÔ^7Âhqmr:Ê‡pÇSõ:àË”&H]’5¸A3÷sº ØE/îà<dU9š†ÂQðÏÊ2=Äèõ™â@Å´gï›¸xÆ)Tä!ét¼î–^Sñkp×Ûùòž$˜^%×é¨À×!÷`pó”r…îÜíîëÇ7)zÄV1£Ãþ$Ÿ!^Íé7°€8¡j8«ÝTÓšLu#ì,þx±ŒØ†½ÎæÉ@{¡©¶¶¦ˆ!~bg>ƒŽY‹‹€`÷”Aõ'©‘ñó:qÌ³M@c®ƒ 6¸Ò£ÍTØÇŒkIhK»Ë°çex$–'ÀÕ\ìˆ…Y·žnüüˆÊ‘€ƒ»¶	ð¶5Ã~ímãåã´êwÒý’”BÅü¨Ö¿qÎ«)€i¡±¶–r —¯^~›Ö?ÐF¼5Kttô«‘ågóe€ô©UB7A—xPÔBýV„˜X†ì+o¬³8ÒÊm®Í>a³möñ™o³fnÆÜ\ËO¹›L*ç%·êÀÄÆªiÎm·ùn_7í»Ý³ñòé6ƒn|'í5fÑý·õ>mÆaÁÍ>îsØWƒûp–ïª¶§ÞPñI“ÂeË¿ù>7å€óu¬
´ GòE†-ü&Xu”MÞ:ÜFƒQÏÛh¨¡§Ù ýÈzŸ±§F©¸V1ïŠ[$9”Ãoå¯ªHËªSN»]Ä4Ÿaàêö!pÂ¯FI…#_{¹€gžÖgî“wygÁ±Ô:ˆžëãÁ‰îò¬ÁŸeCYùëÄû¾Cè¼¢UÀÚ“YK¥\Ëƒó
¬›+‹é FÄÐ:3¡\<5Ü6ã´üª»¦Ï°^VØ«Ý{|/µÞBˆÎ…Þl.œA”3Ó{·0üÔ‰èªÄ—©}_¶Ï'ùMÿàÈDè<&AîH •ÏOÓ÷j‘J¤ŽÓëÓZÐâiñø¤îžn¼8ÚK†=êþy¼e-Þžlw¯¬XÒ£0*FÜÌ™šîEå£ä íá¿¿(Š!üíÑ$™8.ˆ×§ªÜª¹¾ÏÈ¸.ZåýÓ‚¯ËÓ*­Ê>…jrU2,ëÉ™a˜Dg†1ŒÞ5²’çìd=qªè/Â‹`ÓtE$çYY[U%jmÀ™×ÐŸ
þ ‚i‚ÝfMÖÙå~Q½é*É®ƒ(úS`ˆ´t: C«öpþàN­}†öVç›ô„#±VïpÇÅûÀ%ëP¥IsrøØ¸ô—S4¸*×VuS4î¯R2º>8hÈ ÎC=lI[ »‚Ô7CÛ”>Å²çäU†o}ê+ˆJŒûgßZ/V»*.`JZÉ’ÜÉÃ¥q$˜.+.ø8ÎzŽåú8?ûfDE²LÉœ0D×oÕÌÉ“Oäb¨Ã~Ò+Rô?Í)P¡…±ÎÛ–$Úá.m;n!]ŒNÂîÄÐ*yue5áÞ.†‘Êør»¼uDØ%îÎ_@¼úî›¡uiœºˆ7zjGéd„ Œ:to	ø¯3ÇØ,ñ6!…éêƒ«\c.×W! BÈÀœ³Þøá$ï%ðÜ€%ZF È«ölÝ»NÇz#.'–7t·¡À±—„ÂÂ\Ò.‘2é¡Ò`	¤]å‚ÿØ]¿!ˆÝ¼‡°0”¨BF7h¯Dc›–Ä|µ;AÅ»é !]ã„g12,½Ôïu©y´f¿ê]k¾üÐMdßƒØÝ»èhçÂ³XQmb"×UÈxm´Ë^ùÖ“‚£·ßàmÉlJžö!œ .í(¡bô/sÀØ£¿aÆß²šxðÀ!–ÛS0@=eüàæJ#Ðwœ‰Ù;…”ÖFö°Óg‘àa§ž-ˆ³
¿ßÐ´bUD²˜ ¹>9ìçg¿¢¥~õò/G‡Ä~]Ü
Á4C±‰ílúNõ*–ã8ˆ$Ã4uò¿þû¿¡Óìaþî	@‰Ø„@ó¾¶%™Í—”…¢¹þ4º^»fÔ"›,øi>”4}ÿghg°3êe{tòêúø×ÿø? i£`§*æˆžm®µf6¯‚ßEz¨ožÜ¤6	²óêåÿIˆ8V#úœÓÎÀþ2òÕˆ–+S³N\"îtî€r¤Ø†d¸œç^ÿ}¢ç{¹îÖîË¡£ož‰fÓt¡B÷1=×ò£ŠšÇüíZûÂþu!•PüÒS´¤®½ÀJ‹@DÖýêåŸônmõÏ~îeÀVõÎJÜ†eÇ Éa‚?¾K×å]’L·c/¥Y‹Í‚Tˆ˜.¸jÒN$@˜÷™;_µìá[O›V¹ñ2%¹7g¾¨N]º•¾ d-H®éŠÎW’Ð…"=zýØ¢¶þPi®b…l£Xc]Sæ¯±³–FÉ!#Ì-úo&­4½œ–P~àè_1,Ýº‹•Yºý%¸x&Ä$%U¾!ŽæŠ³këÝçŽYšMÅq)œ}¥èRLÖI“‰‚üïùìå/§ÉèÕwÿsH°ùÌ7 =ëPåwcwú8÷1Îê9„ErXX·Ö1¨f4C¥Er‹¦U™fý¡ sØÞÜVSÌµoÉ1ëgßu“Sî'òûì#R’¥$,‰sj+ácÓ<ÚtfLçhiBš² º.¶êCÕø…ŸÂüJçG¾€ééß„—ƒ&K±eÅf	ÓþpÃs•2»Sm
6 ý¢H©+vÒdå_kzQ—®ÞLESŠÊjQþT¢?JŠ-±ö÷UH¬yŒŠ~§#Ä‰Aâ§†ÔV®Ž‚tØÓ¯Ðö…ôŸºút!úPU <ç)·	-Ê0P'®	½ú29ÉöÄ aÉß$xJ
/«šáiVUàR®ê:Ø²ÔŠs»UcÜµXWlÌa›7>¨†‡Ñ­'AÅÌF@Tµt¼ª~:-Ú×Ê‰·FñŒZ]»•¦Ë!ïn1 Ç*l cv-Ñd÷
4Z2?¬­*~ºL­Fâ-lÝ
—Â½J~Dn1|STî\ô¹²¡9ÏPå>é³Mu™c_ìñWàB¸î$ç¯•kÕï™àÉãÕš¢ÀG©>J÷³y
Ä¹<¬*Có(<áÔžr4qGµ5î†¸|É¥‘üÉð]aeR¹ÇÈ)áJ˜¥þ$+ûèäÏþÌ§’ušÌå£ñ´²Kæª“1È‡kÒá¦<ÌG·–6\NÌèj¼µôá†ãmYecTÙncø"LÑÝì˜©µJÁoôfÆÈ¸{ÖúÍq:)³íQÕÌh’î¯å`© Å¶/§›‘y¼Áa’"ðJÑ¢aŸ(´™jLIDªÁ)‘R¿(<ž¥ûÑö«8XA˜™)¢Y7bÎù’O¤+ 9|õÝ?Œ eº»YeHºõŸÞýüÉö“Y*"šq[ÔÚ‚x<NG9B Ø¾ ‚RÝÅ98:Vèu›aÔ¿+„Ø}S0æ¹î‰¹/
2Â?íkÂ«â•n
*Gõùv…/
hd®kâKìÂ©„V_èuaèÖçº*¶¨ôùõßî (ø²XsÞ%ñ·…9Ùš×…ÑÀÂî¶›µo
ärWP¨ZÜMñüìÛn?éèHT Vÿ
äÙÌýÇÖçÛ;Û[w±›§˜¼zùwð­ 
0b'‚òº·„õa€+ÑÔë4T5Í€W¼ëû£ËC«ñ¤¼—š ÇŒauÏò‰†M4f–8%c6ˆ¹÷êåN~>M-›årûð¬®oÕœA·k/§î2s= „Û]í|xc/j†üÃ›rÅç×Ø»S‘ê¬Ôy~ÙXæú=Q
ìn[§%Ûö?ú—œ&?LÎ~9¦¦ºÑpàšË‚rF¥šÉì?XùÑ~€Óh7W€ÉÒNp$„—G¼~0ê¦ãr
¦D«”Iå“*ÝOPëe¦£^òÅ6ZqHØ;Ap“  Ã:=(oÊ¢¯ä:¤‡›ýhå$dÛ§îeã¤ÒìVa6,šÍS8yy·‡îÔeôåéõÀ=.zð5z4„v–q¨¾eœ}‡ŠÜ[fiŒÙÏ”÷Èžä£tp×xm<NÇpyÆ[Ð¸Tíår~uéäy¢:ì`·œ ‹·7Èæè~­ŠIö`2)ÐðÔŠÛ°8ËxžÛh&P]Î29öW¬ŠôP8)5í%P¯dˆF¡­§_.ãòói¶ÃWó35H(ÙÈ]±¦OÑßí/Hõá^‚)‚þ3k6È¹¢±û²}´Ý¬§W!5îÓ×M³›+««R;Ò8ðò“ ¯Ú`¤7êˆpkcÔùÒÚœò.¶AXPkkâElS[èýa19±6§¾´6)ÚDÄX…PÉA~ˆ[yÊÊõnž‚Ió&ÍFþQÒCÝÏ7“FZvÉ_$t‹à/# g·›´JƒEžj,›ÕfòPDÂ  ¢£ÔŸtU@ø4wç·È‚ºÁVL®ƒÚÃwøûÃ&ÒÞM7„Z¢¥—´Ò:¹	”#3–fIÝ0gÒ¡ô6º!»)‰êŠêàtà	:aô+›5ª-æm™„ÔÀx(x+ä‹ñýâh¤Òè"!5Î.WŒÓn^ ª	¸J2!Ú†]’;Œ@gô“bôÅx»[ø{ÓÜu©á²ÖŒyž–ô–Î„†dœÚé`ønŒI$?LøfÈ‘õ·›ü…|áfê)8™â\ý±röõB›Àf+ô§Ê@¾Ý„#¦Ž‡VzÈFNÇ£?ö'/YAã21_ø›’^ÁêêH¿pNµ·²’<1Øš¡;º‰uã@zTý¼D½Qâž¤/
ÄÏÜ1IdGËyGØn÷M¥ápöŽªK/Ò~—”Ê2°»w»¹»‡[#kqÿd”	<6%ÍD®¡e%MR3ç”ˆx@¾kø<ï	tÞE¨w”Äƒ”VÒƒ¡ú»Jïˆ_<,ô,/1™ n=Ý/ŠA–Ž>¢Tn=á¸¼ôÒ ²æË¼Låâ9¢ZSWnM†âA2ÃË„
™Žƒƒx—^1ÄÔŒâÊµböÉ›×[Ëbâƒ´‹èâycYL¾?†â;š4ùÂçK~’ao&ø,‹1KOÐ€é/|sìµì(ë)¶¨Ôé(üP…°	0-ÿÒbŸ!:SÈžŒ³‡©n1	ösâOÂØ;ZD¤ú`«(+­UöØs^ …"»Ofù¥ø­ÀççY±÷ô,S ºˆŠ™ÜZ¬³Üà}åÑmv'C¹½-þsŽ¶JÆC,Ñv4ûÔöÆ 8’¾êV&ŠÖÇ#hRÓ@Ïä±ePô¼Úî¡{ÓÁsÇøl¯B÷)ï	Ç|µwþ5–O™ùCû»zÓÇul„ù"ò*&à%]ÁèA1QãÞ$KŸ÷õ%ÈuK™ÐÐ^Åƒ9ï„%–`º°!DÚyŒùy‰’E—ØöA’b>!Æ„‘åä(CíM-LÚKöOp¡ådZaa0ùÉdc€ë¾Ì2ün>TeRVÖÁ£¬j –ûÅQr+.
àDÔ[âÍÈÔ–ÐxÊiÖ‘éaVÓ™ËÉ.û­`ð´×ƒKöziªâîmBF	x.¨ð}ù­¸©öþe‚¶óEÆ'+ˆÿ´7l<c!(nÞJÖäl<tÑwßŠÅaB&äƒæG“Še0ù¬ƒ ¸5‚Êä§ã:o–u]fLaƒNs(tnäûE3ÃùÄð/2/ú•Î‰þBóAÇº=ŒeñÌÀZLëžbOÁ…­Ñ.îÞ&i4™!N/kÓE4|K·È¤v
4&˜8ä­Ì?]`JÛÒU×–š6€&cáá;D0Ùl–S„W€~ÖÄÐdx/ð`°Rìá H+â¡@51 (k®ü»Î
ÚDß´p(Ì´FÐf|©·CBoX&»pcŒ/Ÿ“ðÀ> -sð[NV¥Fèïî´*ÚåÉ¨Ë œ"Y`åŠ‰´€£>88@¯š¼¥n½|œ3”ä*ï™ìŽÈY#•mYŽ=ƒ!å\Â´¬ç,cg©Åp³Ùõg"Ÿ<øé¦´0_n?½»œÜßþx{çî£ådëóÇE”	x(÷’‚ÀÙ‰X:÷záeÐ¹v&•ù³mÅ¨®	èžƒ~rÔÏP'¤xdÇè&ƒï|ëŠÛjP”ðaˆ”¨ô€²#8Øøì”›‰vWÖê6[¤Ö¢8 ~E„.¢*áZÊ:â¤Ý¾
9ôÞVêùÈb=bæËêœ.Ú
E>0šp›ì½Rlœ÷@.ÃûD_‰Ÿ{ÂþJ¸%ó=ªE)|ø@/|ÉÆ€aeôDAè- vQa Ýš–§$Îd¦­Qxh°!·iyhAQqr£@´×¤ÑRÀIîG{híc&Ý£„¾ œš”n5@ºW·B7®®ñé>l/ˆjKuOZúþ²q³e°è‰š,;–±¹­]­?e¿Œ.{µº4÷ÞÕ+ß=£Çn­U(hñ$MªÈ ÉVŽÆàÿ›=£€`è›]ù%\ \jf“Ù^âdÇãtd
?0ŸGðošRd§8<òJÕRª“Hñu&¡m‰tÔäz„âÙî3Á›t‡Q„ÜíB›Bˆ¨«Q¯ÙLu˜2²Oî²%T.@ ð»O»®8«	ç.{T¶³ÏÎ¤VäÒ»t{¢]ŽiÖ<,	½…Ù+kÍ=©i\x—.…§Í’ g5`kžO«ÖîHbNÀU˜7šRKÃ´%Úé¨ïXhr©ÁMHÙe‚•”D©Ž’è¾ijã%÷+B¨úzm®¶ û@!Á°d.Ö5e‹Awˆ%6»ô(ÍSs¿è6{ðo3.´Ë*-K÷‡‰M¥k¾4Ý»"élò"›€·\Y¥Ãq“Ñú"ªi"ÜïTó­á«—¿ÅÎòÌþc†X•ªÛG¨ðé)`ã´iùIÁåäÓqFìRAÔÚùâ³ûwwhóg]h¼iõÁÒpûç<ëË	Üÿîø{ý3«œD¾ÌÖù‹ëž,Ä@ rƒó„^M˜ù$Ù\ÔãÐ?¼“e™„À]µ^Ù¼{qeƒ	† ;µ!îñb…Ø’Çºð6ªŽ´XX*ÆlèY†ÙGË{|#"L¦½ÚÄÉèLBaNBñR‘Tª®¨F6]«s¨MwJ€€çÀ!½Jž×ˆä*'As~RÆK2)ÍófysÁß\Ž‹…Å”Óa6É»oËkøZÇ˜ù²Ô¯±
LÂ¯šËÙÄûjyã6Á¢:ù>Q%6ð"	u›nû0ÊÞ+™Už~ •ÜžŒŸ®fj$Ô[ò*>%É0j‚g<Gý­¢_ß:;lµ ,±dåFv êýtm“l|êÍ-W;–èá¤ öÂÒe$·gm…¼£›ê¨¿¥´š2mµ)eâ|ÕmDxIùOé©’pš½¶÷ËŠ¶ÂÝZ–õ®B¦e8ðÜ“›7·×	&Înžw@úþ³Ž5ñ=KÐ¨	®ÕrrÏ¬ì€/Q'¸ ŽYR#‘`EO·Pä‘šD_‘ ÔÔ—‘œ±Té?|´6çæüƒPö“Ã¶K!"0ö›`w“bZb‘8•$1}m[™A¬²µª•l¬!™­‘S±Ad§´Cõ2àð¹µÿkóHãð}q-w'CÖ0ú*ÚýÈßª²äyù±˜„Åf!â€Žoàü1Š½k—jtÔKC¹çÄovˆ'øÜŠŸ|¿£`ãÑ8Ìj&µhçß³Àr[F×Ð6˜º1†ìÍ^@$Îr²¯8Àš¥„¦KwÕ~÷‚úH*¹OJîûK2MÜ‹Ú¬6!.-Þ)úcÇ€Rõ}³:‰¥ºTwr—jE›·×·ö‘ÞÌíšÍ@+í5–VM»¢,—Ý®ËvêÈ"6_ÈæýK}a`o³¡yhz¥D‘ÙMÃAÊî^ëÍ-×Gs¿£¹ßÑÜïhîw4÷;š»Vû¯ƒæ¾`âø=ü'Mëôâ›Dsª˜:ßS)¬¢4%ní‰:F½“¤=þ°mÆÔ!
µ0-ÚÀŠ$¦•ÁšR˜èÝpa‹~G­v°Oêì“
Ì:Ù,YåÏ«â9þNÇƒ¿›å‘
R¾‘²ðÍ,yX‡ƒŒ”%ßIiòÝ,?.°"©@ô‡Y›t‘
ø+)Ž¿š…_`k(ßHQŽQ•’=f~…éR^FïJ•.ØgCqô…e8£G Œïéö¯.³½Eß`»Ð¶è+Yfô…­"úÊ}§3GßÈ´V—Å¨Ñw<œUåÐ@ªqÔQ³Äë,ã`¿Ÿ¡=ó²ýà&îv«©m3ÞAÿ;è·B¿°Ê ÚË»=éŒÓ—l“†	Ÿà/²Q%‹{Ö g÷³ƒt:¨ØÎÌRä“6ê-L3ntŸZLÚwWÁØ×mëKBû%:QÓc­y³ñå4OgÿG\‡”LàkùÝßž`—Ë¿Mvúgß€âøû¿zõò¯s#êìÛ
ëô[Ò_WÉ}šu[D©‘XfÜTÒtHo‚ý	­%ÛBÎŽò‚ÌôG²ð¨LÓX7«›P'PìM¦*°E=æ)i¡-9°•ìåÓ ð
ß \á/VøF¾³ã=…H³ØìëÄþ€ƒ\2‘QðµÌoñBŠÌe»g ¬è®!øì«vë’cì.oo/ÞM„4S<¡¶­ºÉž£yÀ+jÓÂ[v®fµöÑMqËîÔ{ÞÒGEogM
!F=|w8kah2êÐ;ÄY‹ÂžQ]%ÎŠTšäNqÖ£æôz-ýBg&`ø.æW,½=ùÅ(.<Ü¬Þ(¾+¸«–€ô§R SÉƒ%$Šç9)¹%Ì“ÒîoŽð­ŠA6ísáY;„BfÊ0ØX`°±‰Á¤SÚ²À%Â¨No#AÆPé!Â¨÷è™0ˆØÇ”˜ú”4e½{ÂpLr2Àe®ã†v8v-ÍllóÃ·4÷8òñ8ÉÑx8àzCœ
™hëìÄƒƒzåoTwåu«¥Ž€;5O•‰pÔäCXÖKPƒ©:žBzØë³¶§ÞŠbË™Y­¿õ*Šqhæ1¼£½%fØæˆ—*srö+ù¯JN>žâØ¹UrÜÁÅ”R3Y<k™g0=AkÛã`-UÆªM] ‚ˆk75êB/²ÌMüíNJ6P/zVJÕû,«gˆùZ‚¥,éžþp€¾&ƒàe¥§f™7ÚDXZ™ç‚6éwù-ã{6ñ7ùàq6éwe‚ŸÙd?ä÷œÙ$_åwŒcÙÄßä7o²É~Èï)C²	_”9¼–ÝËemÌjD5«5®¸Òä¢ÄjA†
˜EnN¹ÒÌ²ÎëðŽ~šç\²,6ñ¼\Ðg+l)wïdQ¸ÓÉ†i>0Á—û<ÐIÑiÞ#ÅÉ—>ÐÑfø©–zW´`HnIË/›˜8³u™eÃâ•…®xÄâÒ.Ë+Éß)&J•f·µáG[ŠG6¾œè7 … Ö±2ƒD i˜YžéL9Ynñ}œ¨54Ç­&>8Ù©ÐÂ87É7\yúîQòo¶Xj">
/cFIÓâÌóû^r†Ãé ÊÇˆ|fd§Jöƒ¬3(›K„Opñ6#VÅ2m.Ù¼MºêßJŽ&y•Ýƒh½m„+ÖäÊVÊ"Š%CDaˆ zT±¤ìž]æ`†í•ÅdÓøWË îÐsÑþãÜDïÑz-¾g©±ùŒ)ÓŽr´hÛ÷“÷OQíY2**1&ÉE„˜$LÒ“gJÛÒWP§µ%Ð1£ØÑ6µâYŽY¿rœuóˆ×>8IÒ²ÌX„à»ÕròéçÉa6³ý¤)âÙl÷`'Z®u¢Á¯ °ïÉî˜ú—ä–õ3z¡Ü ø˜èÚ #X$¢¤£º‡ï}ÉÅIn4Ž—ÒÝÈÔez-¼ÓG–áuÉ‰Gd"W<g8¹©5!Ÿ`hòáN¬0—(ðÆ˜`X+µŠ\>°•Ó+9¸l²ÀÔÂ7?_K–;šµÙ w»'^7ÌÏú8T<„x&•äSié8VUcVIŒ0e¾	ØŸÚ(#D¼ÄI€%Æ|	“©]œF£·„£ŒãÐaLBEœwÔ†ŸU†Skw}Õ]ý²T½„ôƒáó”Ä[':9¨üàîÖ'h;¢|M¢8ó©ø–¡‹îçÙPƒÝb@ãç˜„¡ºEABŒ!FŒ+H¨#JP„	è†´¾‹Ì%>Ð
J¢ó=Ë‘—¥j5*7·UBµ
šÛ*È²µ
•˜Û*)"
µ—ÛªI’µÕYª†S'“‡õj›Š(Ä§Ž©Ý2¢¸41µ[”Ä/æW‹Ú¥/¡Z5„/qâ—‹ÀÔÁ$±GaxÉ F*i
bÒiÕïtI¬/T	ÚF¬p(^<äyÆ%_Ä2ÊÇÜl±*MrgØD3wKä¤z·óª)SeÏ0Tý³ßÿæä‰g’4Ä)hÜçXqp4lKŸáÁYdã%DS
&…ß{;aÚ§ÆtüÚÜåðM§3ùºI})…mR_ÜÕŽ½76¶¹9èüûƒ_/,<ÂO?ß†è¦°!$S²™lÚã(ò{ ,7Â"{€ÞØfdcêJB§ôÔp)ŽÐÆ²‘	÷€N$¶ gÎ8À,BÏˆ¶NŽÏþŠã×étØtÍp=AÚ-kDctEÇø™Ò*AdyÙH3ƒkk2-kälYÖè…!&s¢Â7R;!%×¿ð®âîþƒG\ñ84“¤¸)ð¯ðnt!|ŽÑ¯†,ùùôäÕË_Žh6H’å§eê8Ð±¨	Ã¬!®zÈQÀÕó¥Øb¬kÐ…Bó3	šß?õu?S ý™ÚcÄ½ö˜ K–’Û’œŸ˜Ã#N€ï¶e¢)Å7gé¬X£ßËW íÇË*ŸY´Æ¸_i1ŸŽ±-½
w5Î)4FñÑë=¬	,Êa2À	)cNîåœV)@ÿ›xÍÈ:¯ºWŽEé¹wøZ;»{´DæäH`0ï-„›[<x+g‡ñG¯^þ×§ÖölÚ¥@ñƒc-CžäŸÊ¼Ò*Ý)HYÅ
”e›"Ü(Ï2uÇRiÓiÓOFÈˆÜC§gCÝ³?€âî’ÐÅSLç"2½ž×–XLÄzrç —}Ë¹¼A™›Ìš1’n½¼©ºßòÑqéY
ì‹¶
¿dÂ<¥z%¿5ef‡”=BÔK‰ËÎ	¢#b-É
j>	¼Ø¿[JVHqFàE>&v–¬æƒÀ‹}ÿWßÿ
ð{N'¯9ðr[Ÿ?Æd#þœã·ŠwØê/	%t1s’¸Â	ì«³oG}²…µôOÐóÝ?fÛV†ä0n*‡k	pEm±‹;rðN©K^àÉáÙ¯OÔÄ®èÒI²‡ØõÏ…$7õz+¯œ OòÉ'›Ãaƒ¹L´”H–GÅäyÙÏ28è?{ôôgi•ÊÎŸ—Åè«ªø
¿Â'T¹› †8¥<ùj”1‚JÙ³G=Ú&kbYaæhr¹¸L4>Ì™Tñ”Î†_¡²_ÉÂ'šB¼ñ¿ücú˜|]a®v’ýž¡Fˆ+0D§KîC.›^É¯?þ
V²ÑšuŽå1§qmW#F@€û²äÁq7XŒ;LÄÌøgm&¦‡»0ƒ“rŒª¥×Ú®äŽ£,^½üÑ\ÿ”uIJô?C²?—Ï…ƒÐ Ô¾5UB£"à
p¥¾è>#R3E_b3="ÞA²vBhTh°
Mæ'iS˜‹½¥Ql°2O,z¡Ia¥lŠÕ S5C°”ÝáEŒ²¢s"EU¢`ß5×µ ë@˜#š¥¬÷>h–‚²F¸ÁY
*JÉKÍRTR„pï4K1¡ü`~i–BŠ6CrI³åê	êŠf)"I×÷M¡º†ú%¯Có¢µj&ðAr¹7J[Ï¤qq9/–Kål¶”¢`ØÂO?ø++ÉZ[ U…‘ÅZá\Ò^ï¾EkÒàË
i™®wÈqÍ±
è«ù•>câéó¿Ó˜5¸¸ŠSÄ©Fbìfg–eÝe†Îpu$‡ìi6*§“R¬dYpÈ\Œ™ŠÕ/ŒdåUÓG{fµŒ‡›µÜsà©¨ÜuÊ-þž‡Y«É”¢¹œŸ!¥Òøúü¨9sYâì)¢Yš×fO%
DæÙ9ñCÍ¥šøñÍ^þBÎ•\ŽÑMÕ>ißXºMÛ„·9„ÞÜJ'=¹Â~1ée“ö¨eIÙOn¯Ø×<ÍÚë««+×V“ýÃöQÑ’INÉÁ ½îç½^6ZÍ›ê·×:Põp‚H¥lTµ«¢=I&Å¥pÞX]EkÓO'ãA	“£öš9äu–[†¡’¥h¸rãýö5eæÙ1±ÔjwÑPýÃtÜ¾’÷ÛkZU³ò¸½ÃçcM&`ñ™õÚƒC£.ÉcÝ}þôçÓ\%‡5d°Þ°¥®Öû_Q6LšûN^”FqcÇ`'„–u zð#²kÂ²NÐCIí*?ìWK·9“°ÓŸÞ\ájËgŽ ÷?+»“|Œè£ ]ÂNâÁ³^>’ï9¬8êºÙ/ˆF^å;(êÕ!ºV°T†J1+,6 c”:V bE@„([¨kHm9¸ ë’£§Óýa^Ý:µ¸žÏbÚqŸÆ¤8Ê®[Ê¢ÒÒ}ÄéË¾»¶:>Þs ÀU´SÄ8Nº)¬1P€¬ØŸi ÀÿãW/ÿìŸ}S ôüMÁW÷f‡6êÃ	ºÞà¿6¢.JtTàdÙ§€*¿+ÄNxKâF‰‹þÝÐ«SŽyÕl´-â€ßhÌ\m$é¶Ý»uÚ|t,²âC5Ä€ÁŒð‡Í-¬.0¹íÇe{Ë»Ë	NN{&ã®i&)o>{ÿÍeÖ~ÿt8{æ¬:›Y_Ø·‡oÐ¢îU,‹Ðø AvÎùÞ`‘£¢bÐs€€Ô1&ÄfI}T!›ÜZzòý¯†”È+®(ãÌ‚b ÷8Nw×W×¯.'èÿüÿ5üÿuüÿ=,ÓÄFâMg¼³m°þ}žÜ:=™1@>&­Ùmô‚
»‡ÕjÙ7MÌß;3VèÒŽàÚÛwOs OàøÁ)ü£9€DX‰Gð.8Ët€lž&Dƒ±™¬­ƒ±ó«å$'Ê„<ù Y“,žZqÚ{Z¥“ª¹Ž6~µÑjáÓ:¬}Z‡ü´g·ÉìôõµŸT+ÈGWíÄD-ÒãâˆÛ¦‰ÃÇxˆ¼o.ÝÈ®½¨ZMtUb•a½ç¬ˆåÜ:Å¼…§cR}q´ž<4¼9;ÉtyI“Z2Î±´æcð–ˆØÖò–Åˆ3´·¥usƒµ™oß­S{ŽûPE¼ïâ»³87
¼uúÞ{†·¬ÙÔ˜‹A&{ýçÓ²ÊNÚûYu”e£d|la´ic‹†È¥Û[‚Å|Þ/°É â:ý yoZUˆ­uÝ“1ˆJp™%7TNòtTÝZ*¦Õ eÎ‚eþXã¡³@1ÚäÝçÀ{=œ¹ÉuÍ(ôÁ™ Ô•4¬ƒ(@•<$}âl*’}µé&ˆ¥æn­³±T¦ùl0-·òIw ID®t@&‚þzžý~(o˜ãÎ$;åúhòŠ(O™C,6kÀ	ÀÁ²ç¸å£/p'˜¨À:à!¬Ÿø8e*€·¯Ê4ÝŠ$]Zç›Èö’”ZC[—Žò!|ÏGÉAÚÃËAŽ¿´±`­*@jÕ›AgûÊêª¬{œ=m¡¥3ñ–ênfæÃ^ÃÎ³ž6ícl¯%lAÄ8D“?j#–`Ö;DÜ í|x¾{p§?E$M—›­x‘Ž4ÿ}'>” ! ¦éE·Šø¸X±©H×dÀqóXeèÙIí²Ohš~þæC!`V —„Ù×ß™àÖKã°q@Ø¡‹ßÄäû¯Á“à7]!ªŠDN”4ñMAìjo±§VDØ­ZKøêoW5›Ð®âõZ‘,b›ã¸Dc?‚ü¢QsräT,¡ãžng'>ŠçS‘öÈ‚ãx:Ø?Ê¤ÊUüXÏ6W|ÁŒñåB‘þqý@˜%MôM²m˜µêÎØÍÕJ#ŠáoÍâþrN.‡Ì7°8¥ÏU E]ÜQ½¦€
N{†‡3!0» ;Ú/Ž„¡øä½[§ÏÀF£ý¾ 7ž…7w‘õ8¢ºå‡ë#Ò”^™çâ ÍBÄŸN•N³ªCû -iÝ)ÖW¯ƒ+Zö èNËMI:E;•*>NûP¡_èÐ[×»ß²¡PÝé¤,&íqAd`ªE/ÏÉÛÁÔzè¼@¬‹X3Ù?6P¶.ü"¡ùþöÇÛ;wý©tw2</0Ë±LÈ¨Õ?: 6{‘ ¼õùãÅ o @èuœ-‹ìõ6›¼v5‚MŽdK¦”ÅÅŠcIk2¤´ñ(v4’ç~Í¬¨›ýñÙïGýN§ãQÆñFê±[u™-«Åì¡—nË4õ8K³ÄÚñqÜ×æÜMKë¥ÛÂéæÜM‚÷Òmæèsîæ¨á6¨Ã˜ÃÏ¹ÛÄ6Þ‡Å7U‹«‹áéÂ¸Ñ*×¡¥í˜\•ê Ã”Tg¿Î¹€y%ù[qž}‡ÏX ±¹±Ãq)4òôZTEóWÂ£‚_iŠ_ƒè5†8 MÊäî2€`½h©öÎó;)™dh5ó!ì9<cÝ*èKÙôa1*È“	˜_&ãIûªA‹P8¸^†ƒ!…b[³…Ícº'x™›dœ4ÐÖ•ãT1!M÷Ëb0EK;Èªö•ôk+ëI»š¤#²Î'ø|ãJ”ÜfwJ_¾ÿúæ
t±p ]½` õöB­°	¨
¿I!F+6S®™<ÚäbÀ5÷Àäz&?ôƒ$ÙÙ€%WMÖRŸùÕÛì¥æf®î>ì#&Xœ(½ónDËšVûýÓ–è®	ô%áä¸>›>á]	Â H4îÄ¥’Qk*(ž—Ýxœljð>:vGí«A*ß§øfÏ½påyi?UnM»ÍâªÝ4ÜaÓUN[%8óP:Ñ°q¤}"ÚrÀ´„ºÂc'áï?Ööa=”€„¢AJ—w=WÍ©Š›?(‘¡³€Å-';¬Ô ÎÁü:n›Yî3­…‰ŽJ¸ãkV‰#þ ©ÜåqØh¡¦{ëê@9·˜JÆ <×Ê°Ýpk-;(ÉsÊm’@¬®xP»ÑaP%@¸	Zšå„IÏ˜ ~±•´êªƒxÈ"Ö’!à²F”o>0¶hO‰¶Tä5ïå&8cÍú†b!B$ÅØØpô’„Œ…\K`—Ô­Û½ÎBa—¾†KµK.BRä@‰kn)é‡2ŒEH´$;G62ƒ°e€í
+B´Ô\Šp‡½MñóJŽí­J†J1BÁ°q§Ñ…(›Z ÁyíBx¯ðBýîe­WÄ]G1-ðQwÆ(ë1ØðQ]Vc\L>F[É¿2b”y±GyŽ1ŽÑø-¸)$£%‘p~ôk9ÁlÆ05u&<†	qð ¼V …„³ì"ÀûbÝ
±Î âó­w÷Ü†áv‹àÙŸOÓ$V]ˆ»ü“YktúùÀUŠý¶€êyUÅ¾qº#š“ˆ€!!‘ƒmç`â¦™{iÙ×¸Ã¥|M^F;SW½&êð1r‘Iž¾p$â`vîàŠÓÎ±änÆÑYÏí­UÛAÁEiÖõûº8Ï/%ö^ˆI¤ö†[	Ù>ózàÑ2A¯Ööõ©ì·`Vò’x™²hÅ}¼ÊÞ¢¶Â‡³<ŽU[º1‚6F[{×|¤:àéî‘Þ çË”äõ÷‘Â+'ä“„Î·­ýðÇµ.èœ?‚¨Ò¹¶™AzÇyâ!ø’ÿ¼ãQöIžVŠÅy©7rîƒÒú9õìq,'Ïž·Bý)ÏkY„x:“’„I]IOã;ªax6;ñ|øhPèI}V—fŠ;¡wF•,¹|Fe:MžìÄÙ2F1&–s&´;¦ã©qØ¬ª	²36Ž¨+6Oå¡ÂÔ°ËUSSsmÏwsÁ*ë \}º>Çcó¹ÎGT./rŸNšh¢KË±¢Óg$^\‚¡Ñn%Î0*s|§æn I$ëeº³ÞIäm®Ô×…þ@œ4•É†Ù$ôÔŠì¡T“=‚ªÖ¡¹ŒË{ˆñÙ€Eyn$²Õp¸@›•ÁÑTŸg“¬ìoÙ‚Þ1Ê¨ç#'=þŠ¶µvu©æâL‰.·ïlëÑ¿üã4¦ûqkæO­ÎÐöa,4ß(CÙ#|t†ØÄE½niähF³šp«—cR°[êS²[kéšÑômâ¶¤mö¹_B79ÿZ`Ü¶ŒlÖ*ŽmÖ²î¬mÑD¦k´“ÀÍüÔŒÎõÉ«—{‚ÅOÿiÔ9ì·©ƒõtc
±Gü\úA}J^ZˆdòB<Ñ/ç›Z1Q`ÃGüU5®…daÆeuèÈqåIqT7è„>+e –ú“)¶‡xþO¶×7Uê½~¨T½s)ˆÏiÆVæ¤otÔTBlK:¯·‘÷þŠŽ£ë1ÆÇÐ<Ÿ5€ÍºCTM~*dŠ3a—vâ«k{¨%’uãŒUñ´ØMÈÞñÅX½¶¯bk<rF*n€ÂÌ~çÐ¨I°¼ÛDÿ×HøTc¿îG#œ‰ÃÜ1¼A?#™NòL'uÉJoNÃÛTÛü0ÇYCòòé-Ÿôû.!#Ðv¶æ&I9<€b2íb£ø¹£^-.KG¿MPu-jÒ/
}\Gäºó:µ'4ÖÎ$-ûëN0œg±	$A‰8. ~ˆ`Çm™Çvé§"ÇÏ¦p	BÌé³/f"HCÀ¡+.õ—#›@MŽy{õro¸}¿MˆºkŒ¢ÉGP¤pž&…†®ÛÇ“x7PÅ\ÄŠAÔÜCCU{ýB»ˆ‡Ñt;ýÃÞ&§á]ö‘zÌ‰*ñ¸|Ò0¡syŠQ¿
ÝÆÀ.ó>â®§hóz¸æPú÷Cn°ŒÍ¿íØÿû[ð,KEpÃÍe‹ãÈ˜ju¼|vØ"l•wV±,\$žs7œá¤X°T â‹:`Ì‘ÖyˆÃq9âøÔŒ1õEøWöÍ¾¦Žh¯¯g1mq’ã–ÊÓõ¨½œ¡ºJ¨dg	%Nòù–Ï¥€ÞBGî°˜œ°÷MJ+ëXx·*Ú0ïæ¹Ž»ã–v¢PeýÖg.|VO«JiK)Ê¬–<È?\Y—œ‚Ó‚!£‘]æ%Ï)¸Nq¡_¶t	fÞþ>—n³ýÞ¤¶óstCmsã{âñ’æè¬;Æw"¨Žw+áçËâc›\pÎ“víOÚ«—Ù%žR•/wBíWëÉgƒ‰ Cp$§^€4O³ª)eè32:ÓôÍ­V«S“ª	¾{/²I™5iXËa8¬åâÒ/¸üRç\[Ê+Gv©Ä™_jÜ6mXcLsµôKŸ'\;n§Óª`ùÑ,óÛ«_®JÃ"¯‘¸ÈIïÛùqÖs·ÂÚ1…ýr°êv‹]RõóâH?š.£˜Óª”!käÒ<qû)›$ûè"bÄÕŠD­Ø™£ö¿5=gÉ¯Éÿ¼2B€Aw~³Á:4Ã~ÅðœËFä¹`-¬á{j›DÓ6r_AÄ]Ÿ1|fI6(³óŒÅ«ü¥xß;”äã6º¹ÂÞQÆed?)²¹>œšzj,iôXÛ4¬É‚“ötg'<ZiTÎõÐø q²Ï9F-úŸ`B²ó‘Œ‡ºÅ ˜”î³ªIˆˆJá)Ü›,ª:LÃ%ò…“ªè¤l,7¡Çm4nZtà³AÝSb @­BC„ömž»òVnKj~A»† í;Æz^Àv9¯ÉkìÀ¯ÉaÎ}öÞ{óÆ´“?ß)ž¿yã‚‚oÞ¨HäÄ7o\r¸Ä7ml`9õæŠÚh½yÃ2‰¹uc5~Pˆ!QÍH¶5Ì™iÈñ~.k¬Â²ƒV¶öŽ—ÚÂƒÁÒÂö›Ò‡çÇÀâ/8÷È®o¨\Ý¢®†ÎÎÙ7ÝÀ¸èkÄãÚ$ëìbÐï½«]G€±YNQ“o&£)À¬GÖróó,íV‡“ôpb
,mIq¦/§òí§Ï+‡:9•"®vœ¼šÓ‘f5¬&ô¬ÚÍ£–®­kcfDßyæqüZ¸€Ïx+(®8µq¢‚ÚÁä&.vq OP“†CÜÍÁùÏÏû{8næî¿Ëýaða6¼·Ñ;üeY€ †Ñíýÿ…õ°à!$È‚ÎA¶çprã
AD­ˆKÆØî#.Hã;‹›çlŽƒv³e‹8ð!3¤V'„±ùU€yc51·×–Y@›Ñ‘XçÙmíw8 „>.ÒýËÊY`&ë;¬Ú«âdûþf"ÆIŸ ¦"˜äV°º|­é%l=™€!%—„ÅHq9ò¤³Ý¢åàêr¨l"H»ój	6qÓ³ˆbólÙ—dP1ÃD¸Û’h‚[©âñ`½ÊÅnŠImJG×–ƒQ‹0™v˜;
x‘ˆŽäû¯ËFëœG|Áƒ%I`¨8²ä?^H/ðV,,I­ðV•æXx+Æ

o´RC‡·gÀÝÉð²+ÖýñnŽ‚Å1KÁÜ’¶¯;°^AwÅ>Çñ¥Ü4ªã–@ò›Åï@méõr'1V1=@„–df_OàbÛÞ0f¿à1Zí{iï0SØ{‰œ±ÒY¸} ¬8Y5ì)Æ4ŒjÆ?Àæ6aªËts:Ø“OpwÜÒÅ¹~muÕ `Ä?Ÿœ*Þ ?dvpò™ùð‰>òôÉŠ3~ôÃUxG/Ž’G¹V~1¼ùÌ3õ°Qøj0cd–æ} Öô=çš.õ²ƒt:¨– 2ñV±Ý!¯öQ¤díëŒ‘8ë‰’Î‘‹"p@àœq„`#*zž…æ3ÕºêEqUÍÕ 9Ì„dÁÄ‰¦ÆSöØÈ#!r„ì+p¹$1ÀØ`gÛªCÎ9¼KUú¸èéP]B”ˆâÎãNaí µR€hÞ€×÷~]g¸­€ŽE´B¸-|E!â³Æ£`†”µ«ãðD|±Ý«_]„«DC1RS3D¢4a²J£Zèü„[ìR)Q«Wƒ/©Ñ±Z¶^§
oÛaD’Hã >%‚µA»{É­dw/¦Â§ýI–>GÈ|'€O’O÷aÞçÙI©Tï UxvûM–í3ò ±¡Óc„ªà¯Üò.mp¯;DøØàCl*Ìã[MäïŒ§e¿Y§rR+ÖK­†éëUâqc`=Ô4‚5¢1g<'tÁ3Ô¡³P¯‹*=·O³ÈÔnœŸæMYF^¯¼Ü*Fùd˜õè‚JOxöæzmbwÑ»Ci“¤'u‡èš~Ì9(ž7¦çZ¯½p“¡X2)ÕufâðjÝ²1aÈcÛ‹i+mËHHè‹ ÉÝ1ÈÓîÉC0',áÖˆ\“S0PãO½ XPU É,X{D&/ZÓdôõ¡¹hŽ‰Ðë·CdÚ¢%!ã®ß:‹Æ$)týÖpJ_ÑþY§¥(:!Q …ß¡u/øp	Žu®ñs]·tÙòl@Õ©)â´}‚˜@šôk †:M„oZ¼Ðõn@|¹6B¸ø¼¹T
­gÁ’àsG*Ä{_d¾e¶²þP|Êð0xLŒ0wðÒŽÜè»ºQñœ]xCÛr&È&3±‡I’#ÄÇG²;)ƒ1_U1ÞLV—“ý¬Ÿ¾È‹	ZÞrX Ü×ˆ£€	MX¬“$7ó_WÅÄð*&%HŒ' yz'æ¹^3ãì‚d<ÒY*Ht'byN¶K{H¨ËS3’Ô¥Âéù­W|Fµäã·.õÂ¼Õ)U1F]çNâU[‰færXSã†y5#’n¥<EÃ¿UÃ~õN²¶Ž.­µ5-•eH×iæò¹Æ&w,"ç‰ÐÔ`Ó;„¶™Tþ/¾‰¼¨^8ÁV Áâ:VÝˆHÔU;IN º'?g(€¿³Í¥éd­÷¯ÖKp#2,,Šˆ‚¿%ûˆàqDo®ô¯Æ­fLf6ëñ,	É0=n÷ÁAO‰;¹Ÿ'÷ñéNË
;Bì§!klñ9uÈ.á”ÎHÈIzº.µé`szZ}f›\8Ã«2X«†º»G£+p)ær’GØÿ‡GŸÏf8÷Ý'Fì—äýSCü¥ªâ‰Ë Å9’~žÅÃ×ctp'€ÆŒ©&”†BHÿîXˆ9#ÝZ&ff°T_ŠAÓ¾câ¥ÛÊ‚ÊþZ3e±Ûæ˜ŸË|W‰Û#!%b $KcoëLvj›CÏÑ*¤;D¥ˆ”0leè–]‡-Ê
[Æ$ÏíE$%ºl'cÛå¥Û$¼Ù×8æÙ5nžÃ»ÆÐÇÓÉx‰¡ÓßqCçñŠ1z×¹ËF'bÜØÕpþ1Ç_{ç¯6_¥(¼I2y[Ž4r67®GÛ /ˆMËª>º…ûI®Ú¼:iÇ¡Ön4)i­"‚Z[äŠ)ƒÅŽ)…Ã)ÉÛÔ´Ž5Óš%;ý)¢ÕZcÎ²ÛCO5s8†728]Û_:>Ö©KŠ/lOƒítÐrZ_E‚žaÂÃ(°™(ÊÈ]w8×NÏ¹¤<¸Ê1FLãèßrvÜùŠáäPŸ”j2uÑ3Lz“°P®P’1hd3‘â]îª³Äd,‹›	{Ók6ÇB?Þ˜xµVëNg„&‡ybåÅ|sÎ›8æ½ ¢Ð¶”ÓPÃ=8ÔRòrz>Ì+´}jIÿlŸÚòFÛG5Î¼–Ah@;Ñmg`W{…£Ñ£E»íÃ†Œö&Á¬ŠÃÃAzŒ:L,ÂòI®¥@œá\Øì|³²lŸþ/ÍÏÎ¾é’Ì\£¨ìÞú'N é¨\Ýü(’œuÄMvgp)ÂUA&?-É³c¥› ‘f»ÇÄ8e¹ûì}âÖß~ŸsŠèk>{†ñnÈ†æ2/Ú9i*-×b=,ñ!f •¾“>ÞÀDýSQm£¤$õ"G½{ó6a¨³8µ™í3÷ìñ1M2Ð¶&˜³ ÒÂö‰•|JŸËbjW©Ðµl8¶ÍP>\QÐ!¨5ÓxEU)¸Ž±RÁA®DåÅö÷”cÖ ‰nês§éåY´!o=	‹«\>Yæ&Žø÷öÄ¹	¨¤>†&ˆê~ÑmöàßþrÒ¢7HlÖrrZ÷FWgñi=SEÔ„iÉ°I®%e´º†èr”¼/±w‰¥Z#©cïX1×Awî¸Û"ä6$i	g]GìŠã Irºz¸»Fjv­fDíÖN#Ó¶[ë^N÷ø®˜Ò]ë4>Á»½bôuPç¢ý£¼bvòW/9b©Ðç¸i,	GÈéf){jÎyØ1Åˆå†#¾›æ .ë]b0Ðx‚ˆŒZ£¢÷i”x=ÚQé½OGƒ“:«TËÕ:ÑÔ")mf{çö%•IÞ½æ“³á5 ýYÞE4Ú«—ÿ¡ÛWó¬Ö>DÚà¨§½*@üþ©Ž’¶LK´’›Ø¤•Hž&E™©™ËätfAtõÙ?1©m|@ãöE­:<S5¯aád{ÉRWÎj¦mï·×ÖeÑ¤âÏ-Å>º%´Øy‰¼™J,ÕUJÅcÏ^^‚\ïÖi^ÒTîèÜqÓ½x˜Ã®“}4ûN–Q>ÒWje›MaCOö‰%Ñã°}eÑa½ùyv0ÉÊþÖ‘
>`¥¶ÁíËq>Â)G7}Øç-Õh©¥â7l¼*H•þu2 gx{*CãSK ).qéÌä¨†Î˜n8ß$¹!xÌ ‡ Š/žlÜt?9ûõ¨O’¢Ýýú-Ùwÿ„žœý=À9^•x4Í)iÁ»}t_½üÕ’þ]ë¤L¡6ONiÂ
Ýk¨<D2Æ~×C›1*´84Q*X$.¶IÐ¨Ø<7WÔ º¶êv9]DfGÈ^‡²y—›(¯Ç«úÎkƒ|!…+3»å‡+)s»‚£j¿ü/O>N¶^½üoO>Ž±w&³›-èTÍÌ´$KÙ9Ø
	véã"“oæØÀýòÍqç|3ÇF½CßÌÁA7sd4ÐÇ›9¸îdx™yŽCØ£XØ’©¦ÞW|&'Þã2%ºŸB˜ñô6¬9WvS®Ïnkú©ŒÚTvï .êÂ_»NG3UwuÕE)C4z&<qîý‰ôº‚¼Ùˆèüî·'
¥ªÐ¶ãþÙÿMaú›ñ¼{Y{Gh[búÊlÈB¢B(È…¥s\L2ÇËLåø.³Ü»Ìrï2ËÕß¸w™åÞe–{—Yî×»Ìrï2Ë‘lm5u¾lm?Qµ„	Ûn\LÂ¶'‡ ïb=Ã›—Nîµ'’ÃJ¡óg“ãŒ€È#§ðqYâæYŸ/ýÔ»ÌSÖq‘îßežú#Ï<µÐôR¯#¹Ôy²´¼]ù¥.;»ÔÛ0V)øæ[0Z9ºç[0ÜE¤™zË’L½E)¦ž_éÜÙ•)¦îv«é\‰¦°ÁœG®€"—’ð(ŽÈK§ðt"ž­þx@çYÞÈÄ?ÞÀBt-²QÏ ÏCYÜFÐ©ý´L²‡Xš Æz½»ÕrÒèõV?N>ùds8l´°'T(oWˆN;•º¸w¶þtLX‡HM½&Óâj‡QÔQvÊñ ¯šÓhí®î…rÑ„VÀ—F8B¢|éª'¦ò‡j‹2Ò­³ :BÂ…¤À©iB;gêl'K+2sÙ^œ•ì92æœ#[Î"2å\r–œ×’!'ðú\‰jæHR³è5NNs‰iÎ%ÿBbä×NF³D4œ„æÂÐœ7ùÌ¢Ïx“ÎD¶ëž¼¨ÀÿávBmD ¢ó¤]™;åÊ"Ó­,4ÕÊ"Ò¬,*ÅÊâÒ«,"µJDZ•ó¥T™+ÊÜ—Ä\ó¥P9gú”Å§N©“6åÍÁtoqŠ”s¥G¹àÔ(s¤EÑ¤eDQfó—¥á²BCXh²¯CbÀQË– ¥³©':X÷1n~5L—ÃÂ—z¦#CÖy¨E68bÑ„¤GNwB=¼…G/~bU­+	ƒ¨íE‹ ]³#¨› EJ‚[ªí:ò˜»Z¤DÂié‘za¢°€=;ê÷ÿ  ÿÿì}{oI’çÿþi¡±’z$J”ü¬>·Ü~`ÚoK6ºaíYy&Yœ"iY§p‡¹°ƒÝßÜîb0X =ÆnoßÍÜõ^pX‹ýCÞþºOr‘™•‘¯ª"EJv[l‘UYYùˆŒŒŒÇ/Ü«aãD#öO<"Qy‘8R„awÕéÆæZO2mì©„Õ´“4ªy'l8TãN>Þp¨æBÈáPí;é¨Ã¡w
‡Cµol±‡¦!s2!~WÊôhbA~ËòíÀ“ˆô)pOÌK³Àœ¾ÞøþÛˆÕ¿3B÷Þ¼8|e¢%MHÊ9~Ôž#„u®.¬GiÝ¨—Õo=hU²,á’, ÛØ ÷¹°H¦7M Aj’õÉ6¡hîíµ3Iÿáòº,Ï/êÌYf½w	æ³ôÜŒ´-£Wþ
¿z²]¢KŒœM(¦PïKþl‹H7ôñZ+N”‘›	G&
'Þ¹èˆïiÛëO)›‘¥$sÒXvÓ`´–zpì¥þ!Sk=?ü.úhu¡±ì¼ÃE¦áóò~ÈBm= 1R‹Ê²_òS#/Àú¼‡c–Ÿ,³’›K£sS\¡#HU T4‘Ý”}õ'ÑD‹ÆìþÚ­£ƒ¿ÿ‚}|tð¡³˜jW‰V(‚u×A´,§¹‘sV.âúÄoj3w
ó.}~ø›kþÎ8d]X]08…æNârA}<h=-Å¤¼ÏÕ—Q}±gÛ¬Õýqrªy…Î© ªùŒ¾Á¬“¿B–È8½Â+…B¸]W"Ò¾ ¿bÛ¦4 ÒçÏ;ïGó-¥·‘«	Î¥[KÖÓ`U^uaŽ@e—<cV?hfeœ8ÆÇ­éY–ä:(X!ëyóâûo^Õd´a…=€PMp1Äëk~Õ¦pÙ{ïbX~Eý[È±D›Ÿøm¶0fÂgI±Œ=xówo±·þãÝ“e|.¾¨—ëyŠý Xž¶0Œ‰ëM	ÏÓ/}{Ùž¦:f¶ç ›R­P£”Ÿ99û£
!ƒ3¿+ŒÏµ‚†°~t-–!„aÈ©åßß'¨ÈçÏSôÞa8¬Óˆr,wD¸èÂ%(p¡ÝVåœÕ0in­®Ïê¶GQ«¤«]4á“G@M†Iv´Îgò×›&ó²OùNòŸï;ZÊ“ÜXn·»IJˆ´W°Ãä•/³ÕôÚ+2Jå‚ ÔÊ¶œ‹ãÝrHÔvW±t™@½˜Ñ”ÈŽìæ¶ZÎÒL€œ¬/Ûf+ÞèBš‡^#Žûž]Èã€àõXõzÈ)Ø°€üfjí.h#»Ãþäy-n)êÁJ<¯pw;õ¹‘ >œg¡Ý‡A[îŸÇ®ãÛ+
‡o²ÊK"]H*i0ói¨G|Ú²0@ÒmK„²0ˆPà d8ú¼®n8ÅÊjÓ¨ôw»@µœœ¦X³.¾Íº­$ªÏ£<Ë·î^?Iãº±Šµ5Er)
Vë,ðõûJlE[q‹5úíÖ$-ýV@-ËíÆ¶Z	P¢Kcyb¡Ø¨ŸSi‘ä6Àaž³Ñ«E¼Õª1øì~DÄûØë I¢°|E' ÿ¢öS}b¢ÿ¼Ã`^Xÿèà°öáË]Ö„w¯±ÔÏZpš‡^m‚mÜH’¾	0ÙÉÀèŠ°ãïìÅhËvÒÿÎwFÍÙ›ÔI•6FÑ)n&E]‹,†e	Ìœ « ._ 0Àç÷mâŠ›Šabë¿ÏCÍ¥Gpà<·ðá‡çØ‡ìzR»—&¼Ë=ÞÈ;Q'‚|lë	NA2¾J•.È3õ¸¥}€±ç29ç1µ¤SR©'µ\íUøCçDØ‚·ö«LÀá·ãv2ƒÎä*£7FvÍéw¢.¿´‡žó{gÿÖ:ÍŸ0LO_Ãå×6d7­»~J0³û*“ ~Tß¼Ñ”,ê“4MR¬Íð5€+ZÊÜˆ£´Ö€kõx‹b*§õMÓC9»™á‹7Ð	À)oÝ‹ìèÃÀcÎ]"ó¡<eÞÒ¬óÛNÒÝÀcîmL‚#¾ ®üš9áâ$Æœ
Ò§1ÐöòÜ¾æ&í!ßú»´=¯ÝÈ~B¸à ‡>ßñªÒçs\Æçôœz…MG½Ú4û›æ«¿`öâýµ™+RÆ¿(lÍ9qÕ©àœð³×ízÖŒwø»n-Î‰¨N}ÁhïÔš>ßÉÇc;^vÎE[\ßØºb¿îa›ú·ûðžÑ.ÊÎ$gÝDGóª¸.Ž¯Š¢'¢9ÐƒþòÓ¹“U+2eB:r…Ü”/µï³˜³í‘_‚5ùß=‘ïÀÿb›A#„%å÷ÉpÂ[9WŠú‘÷;È­±TÎ>¼ˆýä\6†ç½½øÅ/Øy³ã³œW÷i'«Ztÿ“wV*u÷QŸ™‰æØ–¡Ó€ÖE0õuôÐ|Åù,~	
m‰B[ÁBòtDÑä‰¬&@Ÿõ*þ§ÒO>0ªu¾ÇÎdJòø–û¸jDðqR¾jËfƒ•O‡üp?_|óŸØÕ¬YÔ2ŸU#ŸZ”t&HhŽ=ô‘Â£¬/¼Å7?Ó'[ðœÚ{¹\á“ç 9á™˜¡µô©ÂûIÔëWbØFg¦%ª»ë(ÏG¯ÿ®¯ƒiÄ©…ˆD»bl‘\^¤ˆU˜EIûà
U£ø!ä¶>C°c€¢[aSw®}±x©R½ÂînCv¤ÿÔa›°;Ãÿ_ïN±ù5]FEMˆ&ÁðÝãB2ÚWî#"RyVah0Ý?ý$"á]Õ•<\|$³HXÖ=NolnN¯°²P§M+èíi§K  I©;‡¯px)ÕrWÞ1úCno€f9³·«‚ /‚[Ü@ìî²ìì¥Â†mÔ6RVàüª’ª)(Åª”SF» ÂYU'Ì`VRîžŒU£es‘’?ÃèOYNÇ~Z¥Ö?»£ÊPx':AÂX•²áHI@‰PÅÜÚÏêÛû˜Í5ën’¡=Ð¢)øWlcJ°&®½M¾Œ_ö³‹ñx—Fò€½VÅ:ü¬bâOßÝ«çßò’¨7Bg¶¬b‘½»þñî'í¨ÙÏÊG÷5'$K}ÔçŸn|^ô›­^åßö’Î—ýäKÔ‹ÍhF •|hË|èìËN¼£¶ûVÔ…ä ²Î­9þÖ96u=i~¹‘Dý/o%üï}v'm‚}°céÇ¼$¼•l$_~°Ç_Äx“bƒ¼½ñ3Ñ—q€M¢SyÞê=,kL²7¨ÇŸ™æçÄW’ŠC:rßiGÎ¨Ó]B8=²IIfÉ€A-ž]¹d—5~¶Ñ‚÷Œfà}òÏKSªâ<žòš"TñLF¶òõ[•&Ô/ ËA>C.©ÇäÒ¨uö#6ƒåX5õáNâ)rA½ˆ\’4	ùäqXœ#\œ3ÛÏgãßW.’½^Ï†±í"ð~%Q.l"ð>ã'"ùUIæ¼w'&Bðy¾ã™„²zoÂ;÷»×“ÃÖÞn!èè2kðI7ª5û»óË‹†îK]¶’{ÊË ¼òŠü^Á^5g½?K“Îý.v6Ô ž¬Ì«¤xo½º>ÚÛFCõ¼X´²á¼o+/=çUp$7,®±£×¶M"¹¶ÐnmÏo§Q½wúóýd>eOÒ¤­qjù'óÝAÚm	G™+ÆÔPbãÜ41Ý­B¹‰ûÖ®¯àw>¬ð=/ÛsIc‹ßHãš†}Úü%°W' ÷«wae>ˆ†½„ÙÆ6™§Ö>?:ø#kþ3»utðÖûþ%{ók-ˆ†€aG6â:__i³‹ÎqÈtŸ" '®7mÃ9@¾­Öh½þ—än­ÂdíèàÎà Miv=ªLëÕŒÒjë€™ÌO¢;iÔ˜‚¶,,Žl´|´ÕKZƒ>@F>é+JºóÕ…%&L8¤»xagþ"IšànäÕëê¸ˆøþ€s„ál$-¾–¯NmBÊ-uz˜ÃÓA¥R	„ªÓÅÓ[¤{‚¬M2åT¯½?„9—š³(+#ÊvÇ0èNµ sn€ýáÔ	µRÛ‡fß#Ã­S+3@õBa‘O:x.»­'º]0¬?€ûÞ6Ó‚˜(ñŽÍ´¹½mrfœ2Ô¡Ùp§ áUŽóæA¬s^Òâ²w”š£ö"Üž2QŸ³•§ï8|Mcöã¼‡sâíWŒ1ÍwWòbgO·ù€Jš™Š`vX¿×ìp€àç°W2ý³ê	ÔzéžÀ³‰€KŸB§³Â–.€Ä:óåk€@È“	@Ž^eú,Fl€¢Nå»m«_³lž¿0ü¬xY$eûÁ±*Á¡™­t£úF?Jû3Kslz1²ETºËÙ¯WU{ƒK@_ðKy=>Cuäãö †ýùöÚûÃÏ2¡ÿCÉ óið7ì+&‚ßs	BEUˆ5ÀxsDÓÊPý7öƒ©°¥àe„²È±øl’­Ü]Á¹K*BÅûÊí%†î4´¥„yt‰Ç•1ôêžú–[îNÔÍJòïãß²ÂCIFÒ´3 Zç<üh=‹6â«{ø'\GP~y+v|ÓRš¿é[eû¾èÌdwýO!2­ÉÖï½Ç?Fç5Ë°zÏKAÅ•ÿÖ©5E+ìÁík#¾HªÏÊ¿ëúí›·7¯}:âëji»ü«0%\Ñk&²é…ÑÇ¬<b¢óq7Ç÷ÝS&aÐ4\KÊ{3Ëha‡
ðqÄÕïú0ºï*U‚Þ¯äè›ƒ!>Ÿ:ŒgÔ¾ò¥|HµöËQŠyiÀqBÆAuRœž÷¶¯³VùeþvjhÓKtˆÑ‹â¼.T}2S´¨Q{º˜-úâ0Ù¢Í`GºQ
<Õ¤œœÒ9)¥V«Á<P¾“Á¬ÛâTÉ¨U¾àj¹dÒÅ)‰ÇÙÊR)ˆ…ç°	(¨ ë^ ¹ÇK'äÑÅI‰ƒû¿•c´ûþôÒ¡wç	 gÓ[:éô$æ–d¢&óJ“POvRÇ9{!‹fµçŒäf£8Qê‰4êiTÙ½'Þ°RO¼UeŸH£®jóèà¯@ëwŠí’çAš2F«ÑW•×ÿRœƒ÷dY¬ÕfÉ1ÅxGd·Ôgì,×
|ÉáÀÔ.èrbÚÈw‹wS.Ð)áwiÑ`ÆèäÄþ„}ztð«Z¨ÿxj‰™þ•ì£±b Vs1 ™ÓÍkeY/Ã¯'Â“çV¬—46¶·øYS¹\,åëŠ¼q‰†Åacs‡õQ‹TËÀ3›tçð«Ä‚ú jéÖJìr (sWIFE#ƒ!²• ÁØþ³ÈÆ†Ì÷Msh¡ÀJ*øÿOã]ðÀzœòCê"¹6ED‰,£¾$pí?GÂpÉ“a™7æ^¸’Ÿú.=N~(š¹<Ç‚GIÄ«cK"oæQ´7‡¸×Dt`©r17øÃ,Tó;|4{YJqcÂàMûkžk…©Åýiª,šdaç73‹[4u‚ÉÄKMT ïÕ*éüxÒ‰cq:‹æô3?µF^™9<Æ8Iµ$m‹„¬¹à{†f 9AŽ¨)Ã—#A6÷Ò¦Ž}8\dçùé„sFÏÆG½+“ù‡ÓÛÂ´Õ?œ®¥‘~;Vô°»ÕEÜ´ý=&.Ù¾¿y1aV&EÙœ¿T"—Íå—‰dzí¢r†hY1¿Â#”‹_aoQ™XæzÌ¶ž{ÙÇÒ§a³b‚sh–æpYýd×Â,ÔöåvŠb`ñhUDî¦s99Z’>E´„’3cºÌc‡#ôg¿ BËCa’¡i…'˜~ÆÇæð1{žºDùsm€5™žî$u'µÓqè&ìJ±÷XäU&2iÂ›wRÂk3ž…é"æÅ–<ÓŠQ?ågÓßu³*„N›y†å”¯ái¶rŒ·a4çSÿK³äSFhÉ×M°7Æñª(?6Í®å0R”Ç©œˆSùXÝAœÚ©/ƒ»”]×çÐJ|EÜçËùæ4É¢Âí±©’6Ðªm­óQmÙFfè£F}5ÓÐî#NÙÉœdS©íî$kªýÀýOåt™Ðý±¤˜¢`‚v= °Ñ>þµ6è­€†€‹®äy8O^RP4|Ï”B'
ž3¶jS[”ªs|"£1ÙÆ^¼Ax;C¨!ÙÈKåœYlp7#%J$,ƒ¢œE[…œA+Æ¹0É$*ÅJªÄœ”< 3X’U–ª„
$NÙÈû½8õ»	EJµLRÄà(©Øè#b£Ç«HËÈrs+×P&/T®¾’,úÔðÞ´O®g¤T‹™nüŠ¡<ts.fž|ÇÈ¸¨ÔâË—ÕDYp®—*ƒ6a¥†¨¿ßfÆêc% ƒfåéù…RÑ7xYû„w]±öw×ö<áøÃèÇÕu¦ÉQ¯CG±"ì¸“@œcÎ˜Ùú_W‰bqõÓ»Þk¥`|º,o]¥Øvy].Ô4Ž§ãM0xììwþ„w*ßú½Gñðì]l•Ëz×ã>ßò%Ö´Ù”®5Øz)Ðò3XHoˆ xVßm È«{öë¤òµ7¯Úo2(éªEYVa)´Ò6~qnsAnò?î“™hg¿hA-Íî«Ù9'f,jÌºÑHvz¬Ž÷{,y"F• ‹EÊ"ÖëÆµæH DøÜ¥Ønâ†/C°“s’{QÎ4~·'/–‡êTè“ìœ‚¤ßôÀ± è¤Dg„“‡Fe¼]7 % ‹€@ô<¢²©—Õ!~¡2âP˜ ¦9Ø>öIœ¿™™Hw,Òç*TáYg-X­‘<i‘ûâB[ãÎó@ÇaÀ-ôfW‘–Ó…û:9¼1Nè=A1&
PÄl˜(äÓ˜aþÈ!FÃD¹„X.Ô-@P¢E¼øG´@†O&ŠøáÊÄæVëh«¬‹Æ½¨÷†’þmKãgqg+œ%üa u¸ëB‰µ”ðÝ¬¹@€Ã(ø&_Ÿ<yÂ)yÆF)ÌV±VNH¤Îë%êRÔ,û‘g¥X´Uü€AgÅÅ-Š+~À&½â'§€Â'LÃzaqÃ8]XÚ¤SfNt|LR¥
(“t9
l3V©Tà×œKüð‚ýÙìbGÝ—¼¨eÎ¾©éÂ¹¥(À¹¡çÚ¹EfÕ¹ç`£yfÊ¹!çÄ¹ž¾¾ƒ‹‡ÿò1ùèY,y|ÔÛíÔ¼œ^< µv¼$ØêÉŽRãÍL‹”à]Yk½þ_5ñ§ÃÚƒ£ƒKdx„¬B±M’@SÁ÷ßðyëèà·ìÙÑÁïšÚ¨RÐWbìÊ¦Ìf°£x«ŸîZC(®îE»ì•Ðš¹;å	|è•C4ðÑ»T„°±d§Ê!)ø»UÁÇØ±òˆ>z×
’ ¦Ú¹Bô²{…É{n/â0wÐÑ]Œ”×—uÑl'#åä5]Hìf¤\Ð·”"×ua©½ü(NŸÅéf³Í¥Ü¨ÝQzÅýŸ(¡~a	Eº-ÊûÑNÔT„ËÅn8àÎÔ·æØ´-ÉM#R0Has&ÏÒwmðEÞH“daÚiö,átë0 Aai5°·Ùë÷GYD>EÓ¸RÖM—ž^~Àa|‹>œ§­ž3îFO¸4LPŠèº
‰²Þñaãhw£~s«ÙjöwIõûÔüïÈjï ÌÑ^ÃÆ>«EýZƒïü6?íÌ:ã“´b	µ<³é|“ó„»âúÊ”xÔD^’í{JØ£Bº‘œÌB-]§L:s’ï`Ú˜HÃÍ:‚mÕÝðèD™9ö³nœ¢¹gs·Wîß»~mó	«Wœó£.)®ÎŸß*3™•åñsf6s)(J’øðÇŸí<b­m™Æêòó–“òÇkù÷g¶"ýåE¶ÕžÖÓ¤;¿Õ¤ó†·@äL<Qê‡x|ÖŒÆ£B|lvžâwÞcíqþënÙÖâòáGØqDHG
Òóèä³Ã¤vNR y9	eF¦IÍpÌŒÝÏÆ4‘Ñ+›ñsÈ 2]*…4V…P"Ù	¾Š"µ{‰{1`sÓ€‘Æ)£sÂª[aKüÈˆ@`ÿïßÿ·ìFæÓÎE~[›âf÷YìX–k'jr¬É¢¬E’ñ„òI„Åê"r+ü„„&ª´ÌVž\?®~îA0õ&™óøA:é)8FK!ïèÏ/æógÑ.gþS®·×ÆÉ cøft€‹¥ÖjuÌÒXB1S+D9JŸ|§MÆ_Ž­)+Ãˆïsžò5†ì¤srMñDLO­Ýøø”póæ)7 ò)œr6›OO¹â”› Ð§Ü„R “mBD…É¶ 3}œV»VÞ1%0BÆÛ‚pINÈ›_žV£q=‰:‘ÿâäZ¢P.J6-=;Om:( ºF	ë¾¬c(ä¹
à (!œ
ÖGn(ƒVÜ¸Ð>íÅ¥‹‹.ªŽPðü4¿ëóséÑVè·<tÀµœ.¿‹¶, )þHy=ÎOÏ>¬>Úgó¡›‹Š«=£tf‘TqhµWD“ø!ý)Ýî.\›.ä]ÆÎÃH#nM^6œwgÐ©RT*gªËbÙ`‡½8…º Sê7z¢~d¹¢ŽqÜ—­ãmRÕù‚Ú[Ž-À4ø=¯ŠÖÃ^f BŸ±†ƒ %y§r ”òGŽûbˆÞÅ¸O­},²Lüë7+Žï—×§ÀçñU†.d+KE7È¡Å»B7A¼Áõï•J$ÀçÌÎÌåâªEñ£ê#–­B¯mñ!‘±òà¢® Å§3¦U­¥½øv§?WúQº÷+Ø¨Yœ§ $¹õ)á¦^ÊÃ<ˆ©bÔäã]Ôƒ±êølbø÷D)3wœÎØÆHlÃö9cøq™†¨	±jY¿Æ˜hòŒ]ŒŸ]˜>`gÌ?.³PÃ4!V¡=kÞoF1j<cãg¶ïç£ÀË(ô@MˆUPïº÷›YŒ‰&ÏØÅøÙ…ãù}Æ/ðãò2Rb†íûÍ1ÆE–g,cü,£äË°üÝ'Ä2Oû÷›eŒ‹,ÏXÆøYF!¨ê¿ Q/b:Òæýæc¡Æ361~6aEqžñ	ü¸|"§	1
F÷~sŠñäÛÀ*Ž³àýl¦NïÍãÒszàŽÁ1Jr‘Á¹6¸F9–j÷1ÀÚÃñ‡°8‚3¼{Öá2®L“÷)*Ì)„Ÿwn/\GÊö aœä&Gs+I7¸·dÓƒ2¡MŽFsÿ@v9ÂŒ¶xó}¬hd‚{6±wt{v/
nóVÉ¹oc4¡åŸ!4üðÖ>ÅE·—ÿ„hq¼Üarl †#Jã¨Qñ­˜ÂAæ…»¤×½äÔKÛì-WŽN{Rfõð;*ˆµµÍdŽ„(µ¨Üø"eÈyØµ$LŒõSjå-›ÑÖƒáÔ¯¹3„6Kèk#»™tš_Q2*}+‘‚²âô ñýh[ÿ¢³—d“Ý…OZÔF5€
²	dÕ•Ê’”}Ê¦?Ê>Övi$F!E¿5ÐùÚåá²B°Ž"¬õñ'þ•HZÀÆËíS¥†•>?|YÈ,RQ˜íˆnÖlØƒšlK¬³¢È€?ëùq] œ±Îá­£ƒ¯wÇ;{c”a† ‚Q(`¸é÷Í}~Ú27¥÷eƒ$D…ÊEwÕ/•]õþ%¯RË¯ù±æý(I~«ÐÄ¥@65L£¶qtðÇ¨Á•"Íco‹ÅÉ<oÛA=ÁŸú·@¹‘$}3ÉÊdlì›q§nA¢0&bœEJÊðÃf=îõm!gø–wejíÍ¯¿ÁèÈP—#:®®««x¸º¿ ŠZ#Qoð†&iÿŽ€Æ3¨¯µZ€Dq= 8ë¶ÚÍ>'û^_U,‚5÷àô³KQ§­Š¯²Ïâ¨Ö¯´SyO‚B¨h‰M—Ó¾Uü/Mž4[ñ?VùYüsþþ>Ÿ}(f!xix¤d‘O#@ômóE‰žyµz1—NE!„_Â§?#ŒG§§=ÏÉù OÊK%žåw¶“t×xX^3ŸþéÑÁ?X Ãùjº—6“´Ù7jR×Ìš6Ó {þ¡ÓÑºø\#b¿¬Fýta¶m„n$| ½–ýÌ~nzú}â·ûÔ92IVvTã¦Z ÅçéÜg?oNšÆÍ@|øoúÁ ÉZ‡ÿ›
|]€C}ýµ@Hýš/ÛÃÿ.2Óÿöìð+Ö9:øm“Õœe¨ð}ßÅAU ‡Q½è†µ¤éÈšIG€ZëazvÎ€)ÄóØ
3è–Ü®‰¾eÒ"’ÆtEˆ¤PW’OV(£1R¨‡Óµù0þ–=ç{ºž¦e`­ß®¯àßÊ Y·ïa,¶¼Ãw» ðãÊ2>ª€öAEŸãƒ|Oï¶¢]ãZì&F¢U«:†¬#øi=õ¸ËE6Ž¹Q“ÂNSGà—5ã¹ZJ!(F2(Þò‡ÅÂÔª3oIª°nZŒ“0K$<­ò&Ÿì&Û…ÕPãëaÿ†ÓùÑÁ«	aV®ö‰À¬tVˆYIy…fFaF¡ùWYž —=ë6Ð2è~ÍÒ< qj÷mŽi¾,€e	Éš½B¾€^¹<	«EbäRÈ+³Ù©—/È+æ_’òvÕ–Aß5(VO’C¯ªó¹Ð©Ø£m¤HßtŒ/µ$ímÇ}1à"WÖU6£&C$» Ivš”€}3mÎº¢àX½I¸¢öVœêLÓâçezbÓ%(’*&iìîBÒÉìÌf$é!í ¾%mŸÊÐõ£o~ñuR²h©Ëº€¿Œd÷ÇÔ³q¡Ø&¿J–uC]¸ìÓ“µ3VCsúóæœE
z¢Õ;RŒG4Î>ˆÆÙ­¯ÇO¢A«Ÿ5XBpý)%[Z¤	®AUÄY…QR0PÞlÍjHðw–†EŽÃÔª|5E‰Æ¨Ü^†\4X iŠf Em!¯´‰ÓÙßuK™ˆš4GSOasðm£P„	`°|_ÊtÅ¹y)nr~év}¿§É|ÏÃpö 2»øÄ«%ÇH±4q ³©ÙåA–Š
þ¬U€0¥… Ð^¶µ­¾ik ÇÀ±z‡oíÑv¼ÞLk&
³„×%Æ/Ò®G7{¯BÜ--ªþ	»Ùäì²É~>ØE”æœÌ:â€gýBcÉšŒn³øÙfíþ|Õ°‡
“ÛÔšŸû"[Gÿo$G¯ÿoM`Ëf ³¬ÅF³Å¥ÎÎö¿~Ã›‹L:ñ+öŒJ;«]ƒxìþÓ{>m³«·Ïýt[Š?5}	Vñ%‹,lmñeÓ,DH×+nÒJuÑ@«‹ø–"^Ð«E­˜ï,•Å¥G,âçég±¼öã‹Å¤‰V6‘‡‹)ëv}eG€“[p¯ÅEjebEó¢aö¼zÅh8~ï~ˆr&CÇ›G¯¿úÐë_³ÍÏŽ~ÏöL5QUƒêôÌµëwnß5Ì«>#¡Sñj/üí´Ygðð³§e©Kd¹îY±JÁ¦ÐEË
Š(øpÂzÔkÄuµ'¸yvm}¯™Àâ«$Éb˜3çäo7Q#Õ.á"æ»Œr	åÒ¢—¿<\þ¬QñiÂ–¼Àø~põ!Ã‚üO$ÚJsŸ¢ ê9ÿ¶Ë™á÷ß"G{¢_wÈ7*ŽkxœÝBdlÎ=¿ÿ6B¿Â¢sø°W@Õ~U©‘ÐØëi…gØüy=³úŠm,\lœéŸKCÿ\v–"|œåˆ`¢iüó0˜¨X•ˆÊËðCiÆMÇDø·©]&ì°ä‹•,['ð0.hV‹Ýâö”]2sM7ã Û#ãˆù/¾3x¨û.ÎàÈ»ì“7°W{¾¢­^Ò@¢ë¤É¬AÄB°xÈ˜	3²$Æ!(ê4ÛÐª._°2=¹fsó…xwŸ6„µCU•©¬À1Ež2£›ô×š*q>¸h&t-f¢ÙŒ<wÂ‰bjçU©¼‹Rˆ³=ûàK§’ývÕ7€=S4£‰Ì[W°&¤:.N‡Åÿ'!-ýS±Ä‰Ñ(	Œã‰F²†zØ·‘ØÂÛEÏ¾­ò\ˆu^ÍÙ‹±–ÐqÉ¿Ed#¬á9B\—¸ ñ” -Ñâ}Ÿƒwc>'¹ð¹úÌÆp>!ÿ-Ã.jWØ¹ÌÝeÓ•ÓàtERNŽcÛêý^œú$œüÊeþ‘³ã¥“{~Ïk'C7«Ø²Öã+)LÁ8ó‚—æ´É×—bÿÁ@W®
ËŒ4- ûœßTÉG´ñ·×Â†8Ñe øÝá/ìjUCÂ1ùÔ¾™wËßg3å×xÎ"ÙëEOâèÂŽ;KfSœcÓõúÂ;»üÃnÝZi·Cná™²=rÈ{áeÚâôuµ	²\$%ÃuÔT)ÂU‘»z¸¥LžsÄL%añsò¾ÝÀß^«‰_æ1“HlKæÙ»,‹0¤¾E)õ	ÿô„ïM\N˜¸XY¼˜é¸ºÑhÆ­úz#æ„`žßd¶5;ta¬nA.ßÄa9ù6 Pæ¢Z×¿ŽÉº{ÃÅ°ØÇµ¨—²^eJ—Ç£¬õ•Y?ÕúÊ_ZbnòaþÌ¹¢ŒêI–áytÖerºf-àPóòÞ‚WZCX˜Ñ‘¬©50Aï‘Qÿxw˜M&8²aÜ<n•‰^a^e*±´îª¼Þ‰jœº»ÎÑž6u½•ØŒƒèÄu¾„6$—Ì‰+ñÐX®Ø¨ÄLSk–M8@Dá)òœ‡C*ñqOó¹jRßü»éõ.ØjG¿<NAWàÔm)Ü÷‚«ÕôƒàK‚¤›õ”%ÎÖ>ÎÓù7<zX=³bn´j%35‘mÐ–²›Ø²7–ŒÆd¦0â`ŽiDtfCSä÷<Ê[ŽÜI{ÿpÝ½Åÿl²{üÏïï‚ºþ¿Þžæ|fš^`wo^û"÷”ç×X&Î"±•XhÖ45e÷LAooáCv7ÞaÊ½òNRZìÃ…¬´‘ØrÀµS»V$@ÎÜkËÀ­mM2CäþÍ1xd
ëªp©ÌTòec~yÉâäAó²ãÔ‰«..T­ãó|;¯^âúð3ƒA‰™]©07s­m*6mÃ|¯¨êÿ;¾° {Úë—	Õ”·~×ÌIZëÙP¨åŽÊ,Rc¼ÑQÇäl6|UýÌ€ù‚ï9ý£ƒRþC+ðÁbû|'¨|A¶Ú—CÙJ}á
s‚´•	¨ 
Z‘îsŠ­ó£èƒFP`lþYVRtÄ[	Igþ‚¬©4™ZÛÞE7 –2z½Ã)}¶¢Îä†Òã£\~à|úý°ØpjÙ¾–‚ÊC¯ðaW?¶b7²wô‰aíXC‰›Èê¾Ãûö|ûUì¹åo›%ÆŒ“ÝÒŠ	„[Ëz7ùV²mZˆT¦öŒïÐ]“ˆI.¥¨û]ˆx1¶:t¬X]0Z—ÛÏÞOéßñ‹w›¯\9âS4r3òe¿T+¡ôþé`—S8ÅM­éï#Vvwûð÷ÖãË®ì3û1bu¸€y/˜Ó²¨
U"x¨ÒE|¦¯Púv¬Í;GßÔ„0À¾ÿv€1;¡W©2æ¬Ò¬ÈÙ*=Ö*¾ÚÇs$ê'þª–óêHÕ­G‰ôÇ=ù…ä×¼³¸&µ´6Iø›v¥	®­0¢ê48EÇéÕ©õö)º9>â:$´ÿe…û_±z–³¸R©xØG]YÊŒ+‹´hÅÔ¢ù”&¯ØÙÃ}Ð1Fx–…²äÖòÛz‰CŸµô‰1LyàCA°¡ê6ÒVËúfùá$3þá¹––¢•'*Ö*çðÿðëëWì)H$$˜O§¸¨è*Ï`ê-k¡.%K’2UtàÈ´é¹”{JÈÕËàéá’lP‘Z…a½d¾
jHó >ÊáÌyO±ó´¦´ÇÐ]SÂéàà/±õëƒƒc÷}Éíû¨žÚaNPÞo;g=QÞÅwóèà·Ù‡vŸ­½þûû¨ou¹Îµ4Mv>C…—Ç|Â™Ï^â{‡ÚHhƒ¾lh\…±B¨•ó5®çÏëˆP[Ý:EÏÃ7°ux‚(ßB¬ö95læÁ´XR;iÝ+5‡ÂÖ0ÊWË?ÚÝã‡V¿>\¬,ÅíGvä$D¨¬ Oœ"¶´çÒÔ	)\ó¬µ™Däw{ÝO¢Œ§kD¶ÂÐ¯J`±ßêjãBXèñ@³^ 9WÊiJ}æâªXÐxr½LZÉü({ñxõŒ§"§ Ömƒ1âe“ÆC’q¾jt9Çcgï¡m=ç÷7c€‰(î‰ÛÂ]0pˆÆQGÈ*ìŠIÔÞœã="{PÄçÅaÅv´¾|6ºSÐˆ¡Áò¬Á¦<åúE‘›rûl×=‚’ˆ[«.^œÎ{ß
¾XÊ5A:V%)ÚÙ ¬Óê÷û'!ìˆ˜3í«[Aã¶HìS‰ÜõCŒûÜ{qˆsïçÜ[ áË©Wr'NÀwsTD˜vQ¯ÒºX?ü§Îvþé7ß³Íwò%>3§têõì\ïà©×9j¼ÇçÝÂîµ ™†N·Ž?‘Ë]<.Å§q´5žpBþïÿ  ÿÿ QH