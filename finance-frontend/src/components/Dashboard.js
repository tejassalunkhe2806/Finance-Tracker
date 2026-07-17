import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// Custom SVG LineChart component with Interactive Tooltips
const LineChart = ({ data, isDark }) => {
  const [activePoint, setActivePoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
        <svg className="w-5 h-5 text-slate-400 dark:text-slate-600 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
        </svg>
        <span className="text-slate-400 dark:text-slate-500 text-xs">No activity recorded yet</span>
      </div>
    );
  }

  const padding = 35;
  const width = 600;
  const height = 220;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const yValues = data.map(d => d.value);
  const yMin = Math.min(...yValues, 0);
  const yMax = Math.max(...yValues, 1000);
  const yRange = yMax - yMin || 1;

  const getX = (index) => padding + (index / (data.length - 1 || 1)) * chartWidth;
  const getY = (val) => padding + chartHeight - ((val - yMin) / yRange) * chartHeight;

  let pathD = '';
  let areaD = '';

  data.forEach((d, i) => {
    const x = getX(i);
    const y = getY(d.value);
    if (i === 0) {
      pathD = `M ${x} ${y}`;
      areaD = `M ${x} ${padding + chartHeight} L ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }
  });

  if (data.length > 0) {
    const lastX = getX(data.length - 1);
    areaD += ` L ${lastX} ${padding + chartHeight} Z`;
  }

  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const axisColor = isDark ? '#334155' : '#e2e8f0';
  const strokeColor = isDark ? '#f8fafc' : '#0f172a';
  const fillGradStart = isDark ? '#ffffff' : '#0f172a';

  return (
    <div className="w-full h-full relative" onMouseLeave={() => setActivePoint(null)}>
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillGradStart} stopOpacity={isDark ? "0.08" : "0.05"} />
            <stop offset="100%" stopColor={fillGradStart} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grids */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke={gridColor} strokeWidth="1.5" />
        <line x1={padding} y1={padding + chartHeight / 2} x2={width - padding} y2={padding + chartHeight / 2} stroke={gridColor} strokeWidth="1.5" />
        <line x1={padding} y1={padding + chartHeight} x2={width - padding} y2={padding + chartHeight} stroke={axisColor} strokeWidth="1.5" />

        {/* Shaded Area */}
        {data.length > 0 && <path d={areaD} fill="url(#line-grad)" />}
        {/* Main Line */}
        {data.length > 0 && <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Interactive Hover Nodes */}
        {data.map((d, i) => {
          const x = getX(i);
          const y = getY(d.value);
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="7"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setActivePoint({ index: i, x, y, label: d.label, value: d.value })}
              />
              {activePoint && activePoint.index === i && (
                <circle cx={x} cy={y} r="4" fill={strokeColor} stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth="1.5" />
              )}
            </g>
          );
        })}

        {/* Labels */}
        {data.map((d, i) => {
          if (i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) {
            return (
              <text key={i} x={getX(i)} y={height - 5} fill={isDark ? '#64748b' : '#94a3b8'} fontSize="9" textAnchor="middle" className="font-medium">
                {d.label}
              </text>
            );
          }
          return null;
        })}

        {/* Y Axis Labels */}
        <text x={padding - 8} y={padding + 4} fill={isDark ? '#64748b' : '#94a3b8'} fontSize="9" textAnchor="end" className="font-semibold">₹{Math.round(yMax)}</text>
        <text x={padding - 8} y={padding + chartHeight + 4} fill={isDark ? '#64748b' : '#94a3b8'} fontSize="9" textAnchor="end" className="font-semibold">₹{Math.round(yMin)}</text>
      </svg>

      {/* Floating Tooltip HTML Overlay */}
      {activePoint && (
        <div
          className={`absolute z-20 pointer-events-none p-2 border rounded-lg shadow-md text-[10px] space-y-0.5 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
          style={{
            left: `${(activePoint.x / width) * 100}%`,
            top: `${(activePoint.y / height) * 100 - 15}%`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <p className="font-bold text-[9px] uppercase tracking-wider text-slate-400">{activePoint.label}</p>
          <p className="font-semibold">₹{parseFloat(activePoint.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>
      )}
    </div>
  );
};

// Custom SVG DonutChart component with interactive slice selection & Tooltips
const DonutChart = ({ data, isDark }) => {
  const [activeSegment, setActiveSegment] = useState(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
        <svg className="w-6 h-6 text-slate-400 dark:text-slate-600 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
        </svg>
        <span className="text-slate-400 dark:text-slate-500 text-xs">No expenses logged yet</span>
      </div>
    );
  }

  const size = 180;
  const radius = 60;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 flex-shrink-0" onMouseLeave={() => setActiveSegment(null)}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Base track */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke={isDark ? '#1e293b' : '#f1f5f9'} strokeWidth={strokeWidth} />
          {data.map((item, index) => {
            const percent = (item.value / total) * 100;
            const strokeLength = (percent / 100) * circumference;
            const strokeOffset = circumference - strokeLength + (accumulatedPercent / 100 * circumference);
            accumulatedPercent -= percent;
            return (
              <circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                onMouseEnter={() => setActiveSegment({ label: item.label, value: item.value, percent: percent.toFixed(1) })}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          {activeSegment ? (
            <>
              <span className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold tracking-wider truncate max-w-[80px]">{activeSegment.label}</span>
              <span className="text-slate-800 dark:text-slate-100 font-display font-bold text-xs">₹{activeSegment.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              <span className="text-[9px] text-slate-400">{activeSegment.percent}%</span>
            </>
          ) : (
            <>
              <span className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold tracking-wider">Total</span>
              <span className="text-slate-800 dark:text-slate-100 font-display font-bold text-sm">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 w-full space-y-2">
        {data.map((item, index) => {
          const percent = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-400 font-medium">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-800 dark:text-slate-200 font-semibold">₹{item.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span className="text-slate-400 dark:text-slate-500 text-[9px] ml-1">({percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PALETTE = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#14b8a6', '#64748b'];

function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Theme State
  const [isDark, setIsDark] = useState(localStorage.getItem('theme') === 'dark');

  // Tab State
  const [activeTab, setActiveTab] = useState('overview');

  // Core Models
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [tags, setTags] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [household, setHousehold] = useState(null);

  // Search & Filter State
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchDesc, setSearchDesc] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sortBy, setSortBy] = useState('transaction_date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals Visibility
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);

  // Edit State
  const [editingTx, setEditingTx] = useState(null);
  const [allocatingGoal, setAllocatingGoal] = useState(null);

  // Form inputs
  const [newTrans, setNewTrans] = useState({
    account_id: '',
    to_account_id: '', // Used for transfers
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'expense',
    category_id: '',
    selectedTags: []
  });
  const [newAcc, setNewAcc] = useState({
    name: '',
    type: 'savings',
    balance: ''
  });
  const [newCat, setNewCat] = useState({
    name: '',
    type: 'expense'
  });
  const [newBudget, setNewBudget] = useState({
    category_id: '',
    limit_amount: '',
    month_year: new Date().toISOString().slice(0, 7)
  });
  const [newTag, setNewTag] = useState({
    name: '',
    color: '#64748b'
  });
  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    target_date: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0]
  });
  const [newRec, setNewRec] = useState({
    account_id: '',
    category_id: '',
    amount: '',
    description: '',
    type: 'expense',
    frequency: 'monthly',
    next_date: new Date().toISOString().split('T')[0]
  });
  const [householdName, setHouseholdName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [allocateAmt, setAllocateAmt] = useState('');
  const [allocateAcc, setAllocateAcc] = useState('');

  // CSV Import state
  const [csvAccount, setCsvAccount] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [csvMapping, setCsvMapping] = useState({
    date: '',
    description: '',
    amount: '',
    type: 'expense'
  });

  const [loading, setLoading] = useState(false);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const accRes = await api.get('/accounts', { headers });
      setAccounts(accRes.data);

      const transRes = await api.get('/transactions', { headers });
      setTransactions(transRes.data);

      const catRes = await api.get('/categories', { headers });
      setCategories(catRes.data);

      const budgetRes = await api.get('/budgets', { headers });
      setBudgets(budgetRes.data);

      const tagRes = await api.get('/tags', { headers });
      setTags(tagRes.data);

      const goalRes = await api.get('/goals', { headers });
      setGoals(goalRes.data);

      const recRes = await api.get('/recurring', { headers });
      setRecurring(recRes.data);

      const houseRes = await api.get('/households', { headers });
      setHousehold(houseRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else {
      fetchData();
    }
  }, []);

  // Category A Smart Auto-Categorization Helper
  const handleDescriptionChange = (e) => {
    const descVal = e.target.value;
    setNewTrans(prev => ({ ...prev, description: descVal }));

    // Find last transaction with same description to pre-fill category
    if (descVal.trim().length > 2) {
      const match = transactions.find(t => 
        t.description && 
        t.description.toLowerCase() === descVal.trim().toLowerCase() && 
        t.type === newTrans.type
      );
      if (match && match.category_id) {
        setNewTrans(prev => ({ ...prev, category_id: String(match.category_id) }));
      }
    }
  };

  // Form Handlers
  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post(
        '/accounts',
        { ...newAcc, balance: parseFloat(newAcc.balance) || 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewAcc({ name: '', type: 'savings', balance: '' });
      setIsAccModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating account');
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        account_id: newTrans.account_id,
        to_account_id: newTrans.type === 'transfer' ? newTrans.to_account_id : null,
        amount: parseFloat(newTrans.amount),
        description: newTrans.description,
        transaction_date: newTrans.transaction_date,
        type: newTrans.type,
        category_id: newTrans.type !== 'transfer' && newTrans.category_id ? parseInt(newTrans.category_id) : null,
        tag_ids: newTrans.selectedTags.map(id => parseInt(id))
      };

      if (editingTx) {
        await api.put(`/transactions/${editingTx.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEditingTx(null);
      } else {
        await api.post('/transactions', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setNewTrans({
        account_id: '',
        to_account_id: '',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
        type: 'expense',
        category_id: '',
        selectedTags: []
      });
      setIsTransModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving transaction');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post(
        '/categories',
        newCat,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewCat({ name: '', type: 'expense' });
      setIsCatModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error adding category');
    }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post(
        '/budgets',
        {
          category_id: parseInt(newBudget.category_id),
          limit_amount: parseFloat(newBudget.limit_amount),
          month_year: `${newBudget.month_year}-01`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewBudget({
        category_id: '',
        limit_amount: '',
        month_year: new Date().toISOString().slice(0, 7)
      });
      setIsBudgetModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error setting budget');
    }
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tags', newTag, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewTag({ name: '', color: '#64748b' });
      setIsTagModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating tag');
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/goals', {
        name: newGoal.name,
        target_amount: parseFloat(newGoal.target_amount),
        current_amount: parseFloat(newGoal.current_amount) || 0.00,
        target_date: newGoal.target_date
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewGoal({ name: '', target_amount: '', current_amount: '', target_date: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0] });
      setIsGoalModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating savings goal');
    }
  };

  const handleAddRecurring = async (e) => {
    e.preventDefault();
    try {
      await api.post('/recurring', {
        account_id: parseInt(newRec.account_id),
        category_id: newRec.category_id ? parseInt(newRec.category_id) : null,
        amount: parseFloat(newRec.amount),
        description: newRec.description,
        type: newRec.type,
        frequency: newRec.frequency,
        next_date: newRec.next_date
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewRec({
        account_id: '',
        category_id: '',
        amount: '',
        description: '',
        type: 'expense',
        frequency: 'monthly',
        next_date: new Date().toISOString().split('T')[0]
      });
      setIsRecModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error setting recurring transaction');
    }
  };

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    try {
      await api.post('/households/create', { name: householdName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHouseholdName('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating household');
    }
  };

  const handleJoinHousehold = async (e) => {
    e.preventDefault();
    try {
      await api.post('/households/join', { invite_code: inviteCodeInput }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInviteCodeInput('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error joining household');
    }
  };

  const handleLeaveHousehold = async () => {
    if (!window.confirm('Are you sure you want to leave this household? You will no longer share data with members.')) return;
    try {
      await api.post('/households/leave', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error leaving household');
    }
  };

  // Savings Goal Allocation logic (Math integration)
  const handleAllocateSavings = async (e) => {
    e.preventDefault();
    if (!allocateAmt || !allocateAcc || !allocatingGoal) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Post a transaction representing this savings allocation (Expense)
      await api.post('/transactions', {
        account_id: parseInt(allocateAcc),
        amount: parseFloat(allocateAmt),
        description: `Allocation to: ${allocatingGoal.name}`,
        transaction_date: new Date().toISOString().split('T')[0],
        type: 'expense',
        category_id: null,
        tag_ids: []
      }, { headers });

      // 2. Update current saved amount in goal
      const newSaved = parseFloat(allocatingGoal.current_amount) + parseFloat(allocateAmt);
      await api.put(`/goals/${allocatingGoal.id}`, {
        current_amount: newSaved
      }, { headers });

      setAllocateAmt('');
      setAllocateAcc('');
      setAllocatingGoal(null);
      setIsAllocateModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Allocation error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete handlers
  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Delete this account? All associated transactions will be removed.')) return;
    try {
      await api.delete(`/accounts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting account');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting category');
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Delete this budget target?')) return;
    try {
      await api.delete(`/budgets/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting budget');
    }
  };

  const handleDeleteTag = async (id) => {
    if (!window.confirm('Delete this tag? Mappings on existing transactions will be deleted.')) return;
    try {
      await api.delete(`/tags/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting tag');
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await api.delete(`/goals/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting goal');
    }
  };

  const handleDeleteRecurring = async (id) => {
    if (!window.confirm('Cancel this recurring scheduled transaction?')) return;
    try {
      await api.delete(`/recurring/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error cancelling recurring transaction');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction? Your account balances will update automatically.')) return;
    try {
      await api.delete(`/transactions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting transaction');
    }
  };

  // Edit transaction prefill
  const openEditTxModal = (tx) => {
    setEditingTx(tx);
    setNewTrans({
      account_id: tx.account_id,
      to_account_id: tx.to_account_id || '',
      amount: tx.amount,
      description: tx.description || '',
      transaction_date: tx.transaction_date.slice(0, 10),
      type: tx.type,
      category_id: tx.category_id || '',
      selectedTags: tx.tags ? tx.tags.map(t => String(t.id)) : []
    });
    setIsTransModalOpen(true);
  };

  // Toggle tag selected in form
  const handleTagToggle = (tagId) => {
    const stringId = String(tagId);
    setNewTrans((prev) => {
      const idx = prev.selectedTags.indexOf(stringId);
      if (idx > -1) {
        return { ...prev, selectedTags: prev.selectedTags.filter(id => id !== stringId) };
      } else {
        return { ...prev, selectedTags: [...prev.selectedTags, stringId] };
      }
    });
  };

  // CSV parsing logic
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
      setCsvHeaders(headers);

      const rows = lines.slice(1).map(line => {
        return line.split(',').map(val => val.replace(/^["']|["']$/g, '').trim());
      });
      setCsvRows(rows);

      const mapping = { date: '', description: '', amount: '', type: 'expense' };
      headers.forEach((h, idx) => {
        const lower = h.toLowerCase();
        if (lower.includes('date')) mapping.date = String(idx);
        else if (lower.includes('desc') || lower.includes('particulars')) mapping.description = String(idx);
        else if (lower.includes('amount') || lower.includes('value')) mapping.amount = String(idx);
      });
      setCsvMapping(mapping);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!csvAccount || !csvMapping.date || !csvMapping.description || !csvMapping.amount) {
      alert('Please configure all required CSV mappings and select an account.');
      return;
    }

    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      let successCount = 0;

      for (const row of csvRows) {
        const dateStr = row[parseInt(csvMapping.date)];
        const descStr = row[parseInt(csvMapping.description)];
        const amtStr = row[parseInt(csvMapping.amount)];

        const parsedAmt = parseFloat(amtStr?.replace(/[^\d.-]/g, ''));
        if (isNaN(parsedAmt) || !dateStr) continue;

        let dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) {
          dateObj = new Date();
        }
        const formattedDate = dateObj.toISOString().split('T')[0];

        await api.post('/transactions', {
          account_id: parseInt(csvAccount),
          amount: Math.abs(parsedAmt),
          description: descStr || 'CSV Import',
          transaction_date: formattedDate,
          type: parsedAmt < 0 || csvMapping.type === 'expense' ? 'expense' : 'income',
          category_id: null,
          tag_ids: []
        }, { headers });

        successCount++;
      }

      alert(`Imported ${successCount} transactions successfully.`);
      setIsImportModalOpen(false);
      setCsvRows([]);
      setCsvHeaders([]);
      setCsvAccount('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error importing transactions.');
    } finally {
      setLoading(false);
    }
  };

  // Export filtered transactions to CSV
  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = ['Description', 'Account', 'Category', 'Date', 'Type', 'Amount', 'Tags'];
    const rows = filteredTransactions.map(t => {
      const cat = categories.find(c => c.id === t.category_id);
      const tagStr = t.tags ? t.tags.map(tg => tg.name).join(' | ') : '';
      return [
        `"${t.description || ''}"`,
        `"${t.account_name || ''}"`,
        `"${cat ? cat.name : 'Uncategorized'}"`,
        t.transaction_date.slice(0, 10),
        t.type,
        t.amount,
        `"${tagStr}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ledger_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload();
  };

  // Global + Filter + Sort aggregation logic
  const filteredTransactions = transactions.filter(t => {
    if (globalSearch.trim() !== '') {
      const q = globalSearch.toLowerCase();
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchAcc = t.account_name?.toLowerCase().includes(q);
      const matchCat = categories.find(c => c.id === t.category_id)?.name.toLowerCase().includes(q);
      const matchTags = t.tags?.some(tg => tg.name.toLowerCase().includes(q));
      if (!matchDesc && !matchAcc && !matchCat && !matchTags) return false;
    }

    if (searchDesc.trim() !== '') {
      if (!t.description?.toLowerCase().includes(searchDesc.toLowerCase())) return false;
    }

    if (filterAccount && String(t.account_id) !== String(filterAccount)) return false;
    if (filterCategory && String(t.category_id) !== String(filterCategory)) return false;
    if (filterType && t.type !== filterType) return false;
    if (filterTag && !t.tags?.some(tg => String(tg.id) === String(filterTag))) return false;

    return true;
  });

  // Apply sorting
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'amount') {
      valA = parseFloat(a.amount);
      valB = parseFloat(b.amount);
    } else if (sortBy === 'description') {
      valA = (a.description || '').toLowerCase();
      valB = (b.description || '').toLowerCase();
    } else {
      valA = new Date(a.transaction_date);
      valB = new Date(b.transaction_date);
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Calculations
  const totalBalance = accounts.reduce((sum, acc) => {
    const val = parseFloat(acc.balance);
    if (acc.type === 'credit') return sum - val;
    return sum + val;
  }, 0);

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const currentMonthTransactions = transactions.filter(t => 
    t.transaction_date.slice(0, 7) === currentMonthStr
  );

  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const monthlyExpense = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const savingsRate = monthlyIncome > 0
    ? Math.max(0, Math.min(100, ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100))
    : 0;

  // Chart Data: Expense by Category
  const expenseByCategory = {};
  currentMonthTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const catId = t.category_id;
      const cat = categories.find(c => c.id === catId);
      const name = cat ? cat.name : 'Uncategorized';
      expenseByCategory[name] = (expenseByCategory[name] || 0) + parseFloat(t.amount);
    });

  const donutChartData = Object.entries(expenseByCategory).map(([label, value], idx) => ({
    label,
    value,
    color: PALETTE[idx % PALETTE.length]
  }));

  // Trend Data: 7-day net cashflow trend (Overview Tab)
  const getTrendData = () => {
    const dataPoints = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      
      const dayFlow = transactions
        .filter(t => t.transaction_date <= dayStr)
        .reduce((sum, t) => {
          const amt = parseFloat(t.amount);
          if (t.type === 'income') return sum + amt;
          if (t.type === 'expense') return sum - amt;
          return sum; // Transfers do not skew net wealth
        }, 0);
      
      dataPoints.push({
        label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        value: dayFlow
      });
    }
    return dataPoints;
  };
  const trendData = getTrendData();

  // Category A: Historical Net Worth Growth (6 Months)
  const getHistoricalNetWorth = () => {
    const dataPoints = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const endOfMonthStr = `${y}-${m}-31`; // Approx
      
      const totalAtMonthEnd = transactions
        .filter(t => t.transaction_date <= endOfMonthStr)
        .reduce((sum, t) => {
          const amt = parseFloat(t.amount);
          if (t.type === 'income') return sum + amt;
          if (t.type === 'expense') return sum - amt;
          return sum;
        }, 0);
      
      dataPoints.push({
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        value: totalAtMonthEnd
      });
    }
    return dataPoints;
  };
  const historicalNetWorthData = getHistoricalNetWorth();

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} print:bg-white print:text-black`}>
      
      {/* Sidebar navigation (hidden on print) */}
      <aside className={`w-64 border-r flex flex-col justify-between p-6 shrink-0 z-10 print:hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="space-y-8">
          <div className="flex items-center justify-between px-1">
            <span className="font-display font-bold text-sm tracking-wider uppercase">Finance Tracker</span>
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg border transition-all ${isDark ? 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
              )}
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${activeTab === 'overview' ? (isDark ? 'bg-slate-100 text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm') : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
              <span>OVERVIEW</span>
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${activeTab === 'accounts' ? (isDark ? 'bg-slate-100 text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm') : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
              <span>ACCOUNTS</span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${activeTab === 'categories' ? (isDark ? 'bg-slate-100 text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm') : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l4.318-4.318a2.25 2.25 0 000-3.182L11.16 3.659A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
              <span>CATEGORIES</span>
            </button>
            <button
              onClick={() => setActiveTab('budgets')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${activeTab === 'budgets' ? (isDark ? 'bg-slate-100 text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm') : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-1.971-.659-1.171-.88-1.171-2.303 0-3.182 1.171-.879 3.07-.879 4.242 0l.88.66M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5a2.5 2.5 0 002.5 2.5H20M4 19.5V6.5A2.5 2.5 0 016.5 4H20" /></svg>
              <span>BUDGETS</span>
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${activeTab === 'goals' ? (isDark ? 'bg-slate-100 text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm') : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-1.971-.659-1.171-.88-1.171-2.303 0-3.182 1.171-.879 3.07-.879 4.242 0l.88.66" /></svg>
              <span>GOALS</span>
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${activeTab === 'recurring' ? (isDark ? 'bg-slate-100 text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm') : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              <span>RECURRING</span>
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${activeTab === 'tags' ? (isDark ? 'bg-slate-100 text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm') : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l4.318-4.318a2.25 2.25 0 000-3.182L11.16 3.659A2.25 2.25 0 009.568 3z" /></svg>
              <span>TAGS</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${activeTab === 'transactions' ? (isDark ? 'bg-slate-100 text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm') : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12" /></svg>
              <span>TRANSACTIONS</span>
            </button>
            <button
              onClick={() => setActiveTab('household')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${activeTab === 'household' ? (isDark ? 'bg-slate-100 text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm') : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.902 0-5.54-1.088-7.532-2.887a4.124 4.124 0 00-1.557-4.103l.003-.001A4.978 4.978 0 013 14a4.978 4.978 0 014.184-1.897m7.816 7.025A11.95 11.95 0 0110 20.75A11.95 11.95 0 015.008 19.13M15 13a3 3 0 11-6 0 3 3 0 016 0zm6.5 0a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span>HOUSEHOLD</span>
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg text-[10px] font-bold tracking-wider transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
          <span>LOGOUT</span>
        </button>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 min-w-0 flex flex-col print:p-0">
        {/* Header (hidden on print) */}
        <header className={`h-20 border-b px-8 flex items-center justify-between z-10 shrink-0 print:hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <h2 className="text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200 uppercase shrink-0">
              {activeTab}
            </h2>
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                placeholder="Global search..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-1.5 border rounded-lg text-xs transition-all focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-850'}`}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className={`text-xs font-medium px-3.5 py-2 rounded-lg border transition-all ${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
            >
              Import CSV
            </button>
            <button
              onClick={() => {
                // Trigger Printable PDF Report
                window.print();
              }}
              className={`text-xs font-medium px-3.5 py-2 rounded-lg border transition-all ${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
            >
              Download PDF Report
            </button>
            {accounts.length > 0 && (
              <button
                onClick={() => {
                  setEditingTx(null);
                  setIsTransModalOpen(true);
                }}
                className={`text-xs font-medium px-3.5 py-2 rounded-lg shadow-sm transition-all ${isDark ? 'bg-white hover:bg-slate-200 text-slate-900' : 'bg-slate-900 hover:bg-slate-850 text-white'}`}
              >
                New Transaction
              </button>
            )}
          </div>
        </header>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block p-8 border-b border-slate-300 space-y-2">
          <h1 className="text-2xl font-bold uppercase tracking-wider">Aethera Finance Report</h1>
          <p className="text-xs text-slate-500">Generated on: {new Date().toLocaleString()} &bull; Account Base: ₹{totalBalance.toLocaleString('en-IN')}</p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 print:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20 print:hidden">
              <svg className="animate-spin h-6 w-6 text-slate-900 dark:text-slate-100" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <>
              {/* Tab 1: OVERVIEW */}
              {(activeTab === 'overview' || window.matchMedia('print').matches) && (
                <>
                  {/* Hero Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className={`border p-6 rounded-2xl flex flex-col justify-between h-32 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Net Wealth</span>
                      <span className="text-xl font-display font-bold">
                        ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">Real-time assets minus debt</span>
                    </div>

                    <div className={`border p-6 rounded-2xl flex flex-col justify-between h-32 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Monthly Income</span>
                      <span className="text-xl font-display font-bold text-emerald-600 dark:text-emerald-400">
                        +₹{monthlyIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">This month</span>
                    </div>

                    <div className={`border p-6 rounded-2xl flex flex-col justify-between h-32 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Monthly Expenses</span>
                      <span className="text-xl font-display font-bold text-rose-600 dark:text-rose-400">
                        -₹{monthlyExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">This month</span>
                    </div>

                    <div className={`border p-6 rounded-2xl flex flex-col justify-between h-32 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Savings Rate</span>
                      <span className="text-xl font-display font-bold text-indigo-600 dark:text-indigo-400">
                        {savingsRate.toFixed(0)}%
                      </span>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${isDark ? 'bg-white' : 'bg-slate-900'}`} style={{ width: `${savingsRate}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Analytics Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:space-y-6">
                    {/* Trend Line Chart */}
                    <div className={`border p-6 rounded-2xl shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} lg:col-span-2`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Cashflow Trend (7 Days)</h3>
                      <div className="h-56">
                        <LineChart data={trendData} isDark={isDark} />
                      </div>
                    </div>

                    {/* Donut Chart */}
                    <div className={`border p-6 rounded-2xl shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Expense breakdown</h3>
                      <DonutChart data={donutChartData} isDark={isDark} />
                    </div>

                    {/* Net Worth Growth History */}
                    <div className={`border p-6 rounded-2xl shadow-sm lg:col-span-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Net Wealth Progression (6 Months)</h3>
                      <div className="h-56">
                        <LineChart data={historicalNetWorthData} isDark={isDark} />
                      </div>
                    </div>
                  </div>

                  {/* Recents & Budgets */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-6">
                    {/* Budgets */}
                    <div className={`border p-6 rounded-2xl shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Budget Limits</h3>
                      {budgets.length === 0 ? (
                        <p className="text-slate-400 dark:text-slate-500 text-xs py-4">No active monthly budgets set.</p>
                      ) : (
                        <div className="space-y-4">
                          {budgets.map((b) => {
                            const spent = parseFloat(b.current_spent);
                            const limit = parseFloat(b.limit_amount);
                            const pct = Math.min(100, (spent / limit) * 100);
                            let barColor = isDark ? 'bg-white' : 'bg-slate-900';
                            if (pct >= 90) barColor = 'bg-red-500';
                            else if (pct >= 70) barColor = 'bg-yellow-500';

                            return (
                              <div key={b.id} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-700 dark:text-slate-300 font-medium">{b.category_name}</span>
                                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                                    ₹{spent.toLocaleString()} / ₹{limit.toLocaleString()} ({pct.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div className={`${barColor} h-full`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Activity Log */}
                    <div className={`border p-6 rounded-2xl shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Recent Activity</h3>
                      {transactions.length === 0 ? (
                        <p className="text-slate-400 dark:text-slate-500 text-xs py-4">No transactions recorded yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {transactions.slice(0, 5).map((t) => (
                            <div key={t.id} className="flex justify-between items-center py-2.5 text-xs">
                              <div>
                                <p className="font-semibold">{t.description || 'Scheduled'}</p>
                                <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5">
                                  {t.account_name} {t.to_account_name && `➔ ${t.to_account_name}`} &bull; {new Date(t.transaction_date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`font-bold ${t.type === 'transfer' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                                  {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '⇄'} ₹{parseFloat(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Tab 2: ACCOUNTS */}
              {activeTab === 'accounts' && (
                <div className="space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Accounts portfolio</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className={`border p-6 rounded-2xl flex flex-col justify-between h-40 shadow-sm relative group ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-base">{acc.name}</h4>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide inline-block mt-1 border dark:border-slate-800">
                              {acc.type}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                        <div className="mt-4">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Balance</span>
                          <p className="text-xl font-display font-bold mt-0.5">
                            ₹{parseFloat(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: CATEGORIES */}
              {activeTab === 'categories' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Categories</h3>
                    <button
                      onClick={() => setIsCatModalOpen(true)}
                      className={`text-xs font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all ${isDark ? 'bg-white hover:bg-slate-200 text-slate-900' : 'bg-slate-900 hover:bg-slate-850 text-white'}`}
                    >
                      New Category
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categories.map((cat) => (
                      <div key={cat.id} className={`border p-4 rounded-xl flex items-center justify-between shadow-sm group ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div>
                          <p className="font-semibold text-xs">{cat.name}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 inline-block ${cat.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {cat.type}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: BUDGETS */}
              {activeTab === 'budgets' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Budget targets</h3>
                    <button
                      onClick={() => setIsBudgetModalOpen(true)}
                      className={`text-xs font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all ${isDark ? 'bg-white hover:bg-slate-200 text-slate-900' : 'bg-slate-900 hover:bg-slate-850 text-white'}`}
                    >
                      Set limit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {budgets.map((b) => {
                      const spent = parseFloat(b.current_spent);
                      const limit = parseFloat(b.limit_amount);
                      const pct = Math.min(100, (spent / limit) * 100);
                      let barColor = isDark ? 'bg-white' : 'bg-slate-900';
                      if (pct >= 90) barColor = 'bg-red-500';
                      else if (pct >= 70) barColor = 'bg-yellow-500';

                      return (
                        <div key={b.id} className={`border p-6 rounded-2xl shadow-sm space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm">{b.category_name}</h4>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                                Period: {new Date(b.month_year).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteBudget(b.id)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Aggregate Spent</span>
                              <span className="font-semibold">₹{spent.toLocaleString()} / ₹{limit.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className={`${barColor} h-full`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-right text-[9px] font-bold text-slate-400 dark:text-slate-500">
                              {pct.toFixed(0)}% consumed
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 5: SAVINGS GOALS */}
              {activeTab === 'goals' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Savings Milestones</h3>
                    <button
                      onClick={() => setIsGoalModalOpen(true)}
                      className={`text-xs font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all ${isDark ? 'bg-white hover:bg-slate-200 text-slate-900' : 'bg-slate-900 hover:bg-slate-850 text-white'}`}
                    >
                      New Goal
                    </button>
                  </div>
                  
                  {goals.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-500 text-xs py-4">No active savings targets created.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {goals.map((g) => {
                        const target = parseFloat(g.target_amount);
                        const saved = parseFloat(g.current_amount);
                        const pct = Math.min(100, (saved / target) * 100);

                        return (
                          <div key={g.id} className={`border p-6 rounded-2xl shadow-sm space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-sm">{g.name}</h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                                  Target Date: {new Date(g.target_date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setAllocatingGoal(g);
                                    setIsAllocateModalOpen(true);
                                  }}
                                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                                >
                                  Allocate Funds
                                </button>
                                <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-400 hover:text-red-500">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Saved Balance</span>
                                <span className="font-semibold">₹{saved.toLocaleString()} of ₹{target.toLocaleString()}</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className={`bg-emerald-500 h-full`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="text-right text-[9px] font-bold text-slate-400 dark:text-slate-500">
                                {pct.toFixed(0)}% reached
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 6: RECURRING TRANSACTIONS / SUBSCRIPTIONS */}
              {activeTab === 'recurring' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Scheduled Actions</h3>
                    <button
                      onClick={() => setIsRecModalOpen(true)}
                      className={`text-xs font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all ${isDark ? 'bg-white hover:bg-slate-200 text-slate-900' : 'bg-slate-900 hover:bg-slate-850 text-white'}`}
                    >
                      Schedule Transaction
                    </button>
                  </div>

                  {recurring.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-500 text-xs py-4">No active schedules or subscriptions recorded.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {recurring.map((r) => (
                        <div key={r.id} className={`border p-6 rounded-2xl shadow-sm flex flex-col justify-between h-40 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm">{r.description || 'Recurring Item'}</h4>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                {r.account_name} &bull; {r.frequency}
                              </p>
                            </div>
                            <button onClick={() => handleDeleteRecurring(r.id)} className="text-slate-400 hover:text-red-500">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                          
                          <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-850 pt-3">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide block">Next posting</span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{new Date(r.next_date).toLocaleDateString()}</span>
                            </div>
                            <span className={`text-base font-bold ${r.type === 'income' ? 'text-green-500' : 'text-slate-800 dark:text-slate-200'}`}>
                              {r.type === 'income' ? '+' : '-'}₹{parseFloat(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 7: TAGS */}
              {activeTab === 'tags' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Manage tags</h3>
                    <button
                      onClick={() => setIsTagModalOpen(true)}
                      className={`text-xs font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all ${isDark ? 'bg-white hover:bg-slate-200 text-slate-900' : 'bg-slate-900 hover:bg-slate-850 text-white'}`}
                    >
                      New Tag
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {tags.map((tag) => (
                      <div key={tag.id} className={`border p-4 rounded-xl flex items-center justify-between shadow-sm group ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: tag.color }} />
                          <span className="font-semibold text-xs">{tag.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 8: HOUSEHOLD SETTINGS */}
              {activeTab === 'household' && (
                <div className="space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Joint sharing settings</h3>
                  
                  {!household ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Create Household */}
                      <div className={`border p-6 rounded-2xl shadow-sm space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h4 className="font-bold text-sm">Create family group</h4>
                        <p className="text-xs text-slate-400">Create a household to share all balance tracking, categories, and goals in real-time with family members.</p>
                        
                        <form onSubmit={handleCreateHousehold} className="space-y-4 pt-2">
                          <div>
                            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Household Name</label>
                            <input
                              placeholder="e.g. Smith Household"
                              value={householdName}
                              onChange={(e) => setHouseholdName(e.target.value)}
                              className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            className={`w-full text-xs font-medium py-2 rounded-lg transition-all ${isDark ? 'bg-white text-slate-900 hover:bg-slate-250' : 'bg-slate-900 text-white hover:bg-slate-850'}`}
                          >
                            Create Group
                          </button>
                        </form>
                      </div>

                      {/* Join Household */}
                      <div className={`border p-6 rounded-2xl shadow-sm space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h4 className="font-bold text-sm">Join existing group</h4>
                        <p className="text-xs text-slate-400">Enter an invitation code provided by another family member to link your accounts together.</p>
                        
                        <form onSubmit={handleJoinHousehold} className="space-y-4 pt-2">
                          <div>
                            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Invite Code</label>
                            <input
                              placeholder="e.g. A9B8C7D6"
                              value={inviteCodeInput}
                              onChange={(e) => setInviteCodeInput(e.target.value)}
                              className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            className={`w-full text-xs font-medium py-2 rounded-lg transition-all ${isDark ? 'bg-white text-slate-900 hover:bg-slate-250' : 'bg-slate-900 text-white hover:bg-slate-850'}`}
                          >
                            Join Group
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className={`border p-6 rounded-2xl shadow-sm space-y-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-850 pb-4">
                        <div>
                          <h4 className="font-bold text-lg">{household.name}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Invite Code:</span>
                            <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                              {household.invite_code}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={handleLeaveHousehold}
                          className="text-xs font-medium px-3.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950 text-red-500 transition-all"
                        >
                          Leave Group
                        </button>
                      </div>

                      <div className="space-y-3">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Members</h5>
                        <div className="divide-y divide-slate-100 dark:divide-slate-850">
                          {household.members && household.members.map((m) => (
                            <div key={m.id} className="py-2.5 text-xs flex justify-between">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{m.full_name || 'Family member'}</span>
                              <span className="text-slate-400">{m.email}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 9: TRANSACTIONS (LEDGER) */}
              {activeTab === 'transactions' && (
                <div className="space-y-4">
                  {/* Filters Header */}
                  <div className={`border p-4 rounded-xl flex flex-wrap gap-4 items-center shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="text"
                        placeholder="Search description..."
                        value={searchDesc}
                        onChange={(e) => setSearchDesc(e.target.value)}
                        className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-850 text-slate-100 focus:border-slate-650' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-800'}`}
                      />
                    </div>
                    <select
                      value={filterAccount}
                      onChange={(e) => setFilterAccount(e.target.value)}
                      className={`px-3 py-1.5 border rounded-lg text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-850 text-slate-100' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                      <option value="">All Accounts</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className={`px-3 py-1.5 border rounded-lg text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-850 text-slate-100' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                      <option value="">All Categories</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className={`px-3 py-1.5 border rounded-lg text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-850 text-slate-100' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                      <option value="">All Flow Types</option>
                      <option value="income">Income Only</option>
                      <option value="expense">Expense Only</option>
                      <option value="transfer">Transfers Only</option>
                    </select>
                    <select
                      value={filterTag}
                      onChange={(e) => setFilterTag(e.target.value)}
                      className={`px-3 py-1.5 border rounded-lg text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-850 text-slate-100' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                      <option value="">All Tags</option>
                      {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button
                      onClick={handleExportCsv}
                      className={`text-xs font-semibold px-3 py-1.5 border rounded-lg transition-all ${isDark ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'}`}
                    >
                      Export CSV
                    </button>
                  </div>

                  {/* Transactions Table */}
                  <div className={`border rounded-2xl overflow-hidden shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`border-b text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/40 dark:bg-slate-950/20`}>
                            <th onClick={() => toggleSort('description')} className="px-6 py-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                              Description {sortBy === 'description' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="px-6 py-4">Account</th>
                            <th className="px-6 py-4">Category / Tags</th>
                            <th onClick={() => toggleSort('transaction_date')} className="px-6 py-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                              Date {sortBy === 'transaction_date' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="px-6 py-4">Type</th>
                            <th onClick={() => toggleSort('amount')} className="px-6 py-4 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                              Amount {sortBy === 'amount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="px-6 py-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                          {sortedTransactions.map((t) => {
                            const cat = categories.find(c => c.id === t.category_id);
                            return (
                              <tr key={t.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10">
                                <td className="px-6 py-4 font-semibold">{t.description || 'No description'}</td>
                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                  {t.account_name} {t.to_account_name && `➔ ${t.to_account_name}`}
                                </td>
                                <td className="px-6 py-4 space-y-1">
                                  {t.type !== 'transfer' ? (
                                    cat ? (
                                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200 dark:border-slate-700 inline-block mr-1">
                                        {cat.name}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-600 italic mr-1">Uncategorized</span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600 italic mr-1">&mdash;</span>
                                  )}
                                  {t.tags && t.tags.map(tg => (
                                    <span
                                      key={tg.id}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wide inline-block border border-black/10"
                                      style={{ backgroundColor: tg.color }}
                                    >
                                      {tg.name}
                                    </span>
                                  ))}
                                </td>
                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(t.transaction_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : t.type === 'expense' ? 'text-red-500 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : t.type === 'transfer' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '⇄'} ₹{parseFloat(t.amount).toFixed(2)}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => openEditTxModal(t)}
                                      className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-1"
                                      title="Edit transaction"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTransaction(t.id)}
                                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1"
                                      title="Delete transaction"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
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
            </>
          )}
        </div>
      </main>

      {/* Modal 1: ADD / EDIT TRANSACTION (Transfers Support Included) */}
      {isTransModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-xl space-y-5 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider">{editingTx ? 'Edit' : 'New'} Transaction</h3>
              <button onClick={() => setIsTransModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Flow Type</label>
                  <select
                    value={newTrans.type}
                    onChange={(e) => setNewTrans({ ...newTrans, type: e.target.value, category_id: '', to_account_id: '' })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Account Transfer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Source Account</label>
                  <select
                    value={newTrans.account_id}
                    onChange={(e) => setNewTrans({ ...newTrans, account_id: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  >
                    <option value="">Select Source</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (₹{parseFloat(acc.balance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {newTrans.type === 'transfer' ? (
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">To Account</label>
                    <select
                      value={newTrans.to_account_id}
                      onChange={(e) => setNewTrans({ ...newTrans, to_account_id: e.target.value })}
                      className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                      required
                    >
                      <option value="">Select Destination</option>
                      {accounts
                        .filter(acc => String(acc.id) !== String(newTrans.account_id))
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} (₹{parseFloat(acc.balance).toFixed(2)})
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={newTrans.category_id}
                      onChange={(e) => setNewTrans({ ...newTrans, category_id: e.target.value })}
                      className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    >
                      <option value="">No Category</option>
                      {categories
                        .filter(c => c.type === newTrans.type)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newTrans.amount}
                    onChange={(e) => setNewTrans({ ...newTrans, amount: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Date</label>
                  <input
                    type="date"
                    value={newTrans.transaction_date}
                    onChange={(e) => setNewTrans({ ...newTrans, transaction_date: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Description</label>
                  <input
                    placeholder="e.g. Transfer to savings"
                    value={newTrans.description}
                    onChange={handleDescriptionChange}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Apply Tags</label>
                {tags.length === 0 ? (
                  <p className="text-slate-400 dark:text-slate-650 text-[10px] italic">No custom tags created yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => {
                      const isSelected = newTrans.selectedTags.includes(String(t.id));
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTagToggle(t.id)}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border transition-all ${isSelected ? 'text-white border-black/15 shadow-sm' : 'bg-transparent text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'}`}
                          style={isSelected ? { backgroundColor: t.color } : {}}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransModalOpen(false)}
                  className={`px-4 py-2 border rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-white hover:bg-slate-200 text-slate-900' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                >
                  {editingTx ? 'Save' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: ADD ACCOUNT */}
      {isAccModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-6 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider">Add Account</h3>
              <button onClick={() => setIsAccModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Account Name</label>
                <input
                  placeholder="e.g. HDFC Bank, SBI Wallet"
                  value={newAcc.name}
                  onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Account Type</label>
                <select
                  value={newAcc.type}
                  onChange={(e) => setNewAcc({ ...newAcc, type: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                  <option value="checking">Checking / Bank</option>
                  <option value="savings">Savings Account</option>
                  <option value="UPI">UPI Wallet</option>
                  <option value="card">Bank Card</option>
                  <option value="credit">Credit Card</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Initial Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newAcc.balance}
                  onChange={(e) => setNewAcc({ ...newAcc, balance: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                />
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setIsAccModalOpen(false)} className={`px-4 py-2 border rounded-lg text-xs font-medium ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Cancel</button>
                <button type="submit" className={`px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: ADD CATEGORY */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-6 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider">Add Category</h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Category Name</label>
                <input
                  placeholder="e.g. Subscriptions"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Category Type</label>
                <select
                  value={newCat.type}
                  onChange={(e) => setNewCat({ ...newCat, type: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setIsCatModalOpen(false)} className={`px-4 py-2 border rounded-lg text-xs font-medium ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Cancel</button>
                <button type="submit" className={`px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: ADD BUDGET */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-6 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider">Set Target</h3>
              <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddBudget} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Category</label>
                <select
                  value={newBudget.category_id}
                  onChange={(e) => setNewBudget({ ...newBudget, category_id: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.filter(c => c.type === 'expense').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Target Period</label>
                  <input
                    type="month"
                    value={newBudget.month_year}
                    onChange={(e) => setNewBudget({ ...newBudget, month_year: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Limit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newBudget.limit_amount}
                    onChange={(e) => setNewBudget({ ...newBudget, limit_amount: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setIsBudgetModalOpen(false)} className={`px-4 py-2 border rounded-lg text-xs font-medium ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Cancel</button>
                <button type="submit" className={`px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: NEW SAVINGS GOAL */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-6 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider">New Savings Goal</h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Goal Name</label>
                <input
                  placeholder="e.g. Travel fund, emergency stash"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newGoal.target_amount}
                    onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setIsGoalModalOpen(false)} className={`px-4 py-2 border rounded-lg text-xs font-medium ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Cancel</button>
                <button type="submit" className={`px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: NEW RECURRING TRANSACTION */}
      {isRecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-6 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider">Schedule Transaction</h3>
              <button onClick={() => setIsRecModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddRecurring} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Flow Type</label>
                  <select
                    value={newRec.type}
                    onChange={(e) => setNewRec({ ...newRec, type: e.target.value, category_id: '' })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Source Account</label>
                  <select
                    value={newRec.account_id}
                    onChange={(e) => setNewRec({ ...newRec, account_id: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  >
                    <option value="">Select Account</option>
                    {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={newRec.category_id}
                    onChange={(e) => setNewRec({ ...newRec, category_id: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <option value="">No Category</option>
                    {categories.filter(c => c.type === newRec.type).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Frequency</label>
                  <select
                    value={newRec.frequency}
                    onChange={(e) => setNewRec({ ...newRec, frequency: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newRec.amount}
                    onChange={(e) => setNewRec({ ...newRec, amount: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newRec.next_date}
                    onChange={(e) => setNewRec({ ...newRec, next_date: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Description</label>
                <input
                  placeholder="e.g. Netflix membership"
                  value={newRec.description}
                  onChange={(e) => setNewRec({ ...newRec, description: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                />
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setIsRecModalOpen(false)} className={`px-4 py-2 border rounded-lg text-xs font-medium ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Cancel</button>
                <button type="submit" className={`px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 7: NEW CUSTOM TAG */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-6 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider">New Custom Tag</h3>
              <button onClick={() => setIsTagModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddTag} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Tag Name</label>
                <input
                  placeholder="e.g. Travel, Work"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Tag Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newTag.color}
                    onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs font-mono text-slate-500">{newTag.color}</span>
                </div>
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setIsTagModalOpen(false)} className={`px-4 py-2 border rounded-lg text-xs font-medium ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Cancel</button>
                <button type="submit" className={`px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 8: IMPORT STATEMENT (CSV) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-xl space-y-5 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider">Import Statement</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Target Account</label>
                <select
                  value={csvAccount}
                  onChange={(e) => setCsvAccount(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Upload CSV Bank Statement</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className={`w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:text-xs file:font-semibold ${isDark ? 'file:bg-slate-950 file:border-slate-800 file:text-slate-300' : 'file:bg-slate-50 file:border-slate-200 file:text-slate-700'}`}
                  required
                />
              </div>

              {csvHeaders.length > 0 && (
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Map CSV Columns</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Date Column</label>
                      <select
                        value={csvMapping.date}
                        onChange={(e) => setCsvMapping({ ...csvMapping, date: e.target.value })}
                        className={`w-full px-2 py-1 border rounded focus:outline-none ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                        required
                      >
                        <option value="">Choose Column</option>
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Description Column</label>
                      <select
                        value={csvMapping.description}
                        onChange={(e) => setCsvMapping({ ...csvMapping, description: e.target.value })}
                        className={`w-full px-2 py-1 border rounded focus:outline-none ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                        required
                      >
                        <option value="">Choose Column</option>
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Amount Column</label>
                      <select
                        value={csvMapping.amount}
                        onChange={(e) => setCsvMapping({ ...csvMapping, amount: e.target.value })}
                        className={`w-full px-2 py-1 border rounded focus:outline-none ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                        required
                      >
                        <option value="">Choose Column</option>
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Flow Type (Fallback)</label>
                      <select
                        value={csvMapping.type}
                        onChange={(e) => setCsvMapping({ ...csvMapping, type: e.target.value })}
                        className={`w-full px-2 py-1 border rounded focus:outline-none ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setIsImportModalOpen(false)} className={`px-4 py-2 border rounded-lg text-xs font-medium ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Cancel</button>
                <button type="submit" disabled={loading || csvRows.length === 0} className={`px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'} disabled:opacity-50`}>Import {csvRows.length > 0 ? `${csvRows.length} Rows` : ''}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 9: ALLOCATE SAVINGS TO GOAL */}
      {isAllocateModalOpen && allocatingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-6 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider">Allocate Savings</h3>
              <button onClick={() => setIsAllocateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAllocateSavings} className="space-y-4">
              <p className="text-xs text-slate-450">Allocate savings directly from one of your account balances to **{allocatingGoal.name}**.</p>
              
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Source Account</label>
                <select
                  value={allocateAcc}
                  onChange={(e) => setAllocateAcc(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (₹{parseFloat(acc.balance).toFixed(2)})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Amount to Allocate (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={allocateAmt}
                  onChange={(e) => setAllocateAmt(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setIsAllocateModalOpen(false)} className={`px-4 py-2 border rounded-lg text-xs font-medium ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Cancel</button>
                <button type="submit" disabled={loading} className={`px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'} disabled:opacity-50`}>Allocate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;