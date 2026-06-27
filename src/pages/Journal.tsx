import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Plus, Trash2, Check, X, RefreshCw, Calendar, FileText, Search, CreditCard, DollarSign, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notify } from '../lib/notifications';
import { useTranslation } from '../lib/translations';
import { useData } from '../lib/DataContext';
import { useConfirm } from '../lib/ConfirmContext';

export interface JournalEntry {
  id: string;
  referenceNo: string;
  date: string;
  description: string;
  debitAccount: string;
  debitAmount: number;
  creditAccount: string;
  creditAmount: number;
  createdBy: string;
}

export default function JournalPage() {
  const { shopSettings } = useData();
  const { confirm } = useConfirm();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  const [referenceNo, setReferenceNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [debitAccount, setDebitAccount] = useState('الصندوق الرئيسي (1101)');
  const [debitAmount, setDebitAmount] = useState(0);
  const [creditAccount, setCreditAccount] = useState('المبيعات الدائنة (4101)');
  const [creditAmount, setCreditAmount] = useState(0);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'journal'), orderBy('date', 'desc')), (snap) => {
      setLoading(true);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JournalEntry[];
      setEntries(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingEntry(null);
    setReferenceNo(`JV-${Math.floor(Math.random() * 90000) + 10000}`);
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setDebitAccount('الصندوق الرئيسي (1101)');
    setDebitAmount(0);
    setCreditAccount('المبيعات الدائنة (4101)');
    setCreditAmount(0);
    setIsModalOpen(true);
  };

  const openEditModal = (target: JournalEntry) => {
    setEditingEntry(target);
    setReferenceNo(target.referenceNo);
    setDate((target.date || '').split('T')[0]);
    setDescription(target.description);
    setDebitAccount(target.debitAccount);
    setDebitAmount(target.debitAmount);
    setCreditAccount(target.creditAccount);
    setCreditAmount(target.creditAmount);
    setIsModalOpen(true);
  };

  const handleDelete = async (target: JournalEntry) => {
    const confirmDel = await confirm({
      title: 'شطب وإلغاء القيد اليومي',
      message: `هل أنت متأكد تماماً من إلغاء وشطب القيد اليومي رقم "${target.referenceNo}" الحسابي؟`,
      isDanger: true,
      confirmText: 'نعم، احذفه',
      cancelText: 'تراجع'
    });
    if (!confirmDel) return;

    try {
      await deleteDoc(doc(db, 'journal', target.id));
      notify.success('🗑️ تم شطب القيد المحاسبي بنجاح.');
    } catch (err: any) {
      console.error(err);
      notify.error(err.message || 'خطأ أثناء محاولة شطب السند.');
    }
  };

  const handleSeedSamples = async () => {
    const toastId = notify.loading('جاري توليد قيود محاسبية نموذجية...');
    try {
      const sample1 = {
        id: 'jv_seed_1001',
        referenceNo: 'JV-88201',
        date: new Date().toISOString(),
        description: 'إثبات رأس المال التأسيسي النقدي بالخزينة الرئيسية للمؤسسة',
        debitAccount: 'الصندوق الرئيسي (1101)',
        debitAmount: 1500000,
        creditAccount: 'رأس مال سوبر ماركت العباسي (3101)',
        creditAmount: 1500000,
        createdBy: 'النظام الافتراضي',
        updatedAt: new Date().toISOString()
      };
      
      const sample2 = {
        id: 'jv_seed_1002',
        referenceNo: 'JV-88202',
        date: new Date(Date.now() - 3600000).toISOString(),
        description: 'شراء كروت شحن شبكة وتغذية ميزانية المبيعات الدائنة بالصندوق',
        debitAccount: 'مشتريات البطاقات السائلة',
        debitAmount: 45000,
        creditAccount: 'الصندوق الرئيسي (1101)',
        creditAmount: 45000,
        createdBy: 'النظام الافتراضي',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'journal', sample1.id), sample1);
      await setDoc(doc(db, 'journal', sample2.id), sample2);
      notify.dismiss(toastId);
      notify.success('🎉 تم تحضير وتوثيق القيود الدفترية النموذجية بنجاح!');
    } catch (err: any) {
      console.error(err);
      notify.dismiss(toastId);
      notify.error('فشل توليد العينات: ' + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (debitAmount <= 0 || creditAmount <= 0) {
      notify.error('الرجاء تعبئة مبالغ الصك الدائن والمدين أولاً.');
      setSaving(false);
      return;
    }

    if (debitAmount !== creditAmount) {
      notify.error('❌ خطأ توازن محاسبي: يجب أن يتطابق اجمالي المدين مع إجمالي الدائن تماماً!');
      setSaving(false);
      return;
    }

    const docId = editingEntry ? editingEntry.id : `jv_${Math.floor(Math.random() * 90000) + 10000}`;
    const toastId = notify.loading('جاري حفظ وترحيل القيد اليومي...');

    try {
      await setDoc(doc(db, 'journal', docId), {
        id: docId,
        referenceNo: referenceNo.trim(),
        date: new Date(date).toISOString(),
        description: description.trim(),
        debitAccount: debitAccount,
        debitAmount: Number(debitAmount) || 0,
        creditAccount: creditAccount,
        creditAmount: Number(creditAmount) || 0,
        createdBy: 'Admin / Cashier',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      notify.dismiss(toastId);
      notify.success(editingEntry ? 'تم تعديل القيد الدفتري بنجاح' : 'تم ترحيل قيد اليومية المالي وتوثيقه بالصندوق 🎉');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      notify.dismiss(toastId);
      notify.error(err.message || 'فشلت معالجة القيد.');
    } finally {
      setSaving(false);
    }
  };

  // Filter lists based on search
  const filteredEntries = entries.filter(target => 
    (target.referenceNo || '').includes(searchQuery) || 
    (target.description || '').includes(searchQuery) || 
    (target.debitAccount || '').includes(searchQuery) || 
    (target.creditAccount || '').includes(searchQuery)
  );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Title */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-xs flex items-center justify-between text-right">
         <div className="flex items-center gap-3">
           <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
              <ArrowRightLeft className="w-6 h-6" />
           </div>
           <div className="text-right">
              <h1 className="text-xl font-black text-gray-900 dark:text-white">إدارة دفتر القيد واليومية العامة</h1>
              <p className="text-xs text-gray-500 font-bold mt-0.5">ترحيل قيود المدين والدائن المضاعف، تتبع حركة الأموال السائلة، وتأكيد التوازن الدفتري</p>
           </div>
         </div>

         <button 
           onClick={openAddModal}
           className="btn-primary text-xs font-black px-4 py-2.5 rounded-xl cursor-pointer border-none shadow-xs"
           id="add-new-journal-btn"
         >
            <Plus className="w-4.5 h-4.5" /> قيد ترحيل يومية +
         </button>
      </div>

      {/* Filter and search */}
      <div className="flex bg-white dark:bg-slate-900 border border-gray-155 rounded-2xl p-3 shadow-xs items-center gap-3 shrink-0">
        <label className="text-[10px] font-bold text-gray-400 shrink-0 block mr-1">بحث سريع:</label>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث برقم مرجع السند، الحساب، أو الملاحظة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-gray-50 dark:bg-slate-800 rounded-xl text-xs font-bold outline-none text-right placeholder-gray-400 text-foreground"
          />
        </div>
      </div>

      {loading && entries.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3 animate-pulse">
           <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
           <span className="text-xs text-gray-400 font-bold">جاري تحميل وترتيب القيود الدفترية الأحدث...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="h-64 bg-surface rounded-2xl border border-gray-150 p-6 flex flex-col items-center justify-center gap-3 text-gray-400 font-bold">
           <ArrowRightLeft className="w-8 h-8 opacity-40 text-[#8B5E3C]" />
           <p className="text-sm">لم يسجل أي قيود محاسبية دفترية لليومية العامة حتى الآن</p>
           <button
             onClick={handleSeedSamples}
             className="px-4 py-2 bg-[#8B5E3C]/10 hover:bg-[#8B5E3C]/20 text-secondary text-[11px] font-black rounded-lg border-none cursor-pointer transition-colors"
           >
             ⚡ توليد قيود نموذجية تجريبية للدفتر اليومي
           </button>
        </div>
      ) : (
        /* Double entry daily table */
        <div className="bg-surface rounded-2xl border border-gray-155 dark:border-slate-800 overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
              <table className="w-full text-right divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                 <thead className="bg-gray-50 dark:bg-slate-800/15 font-bold text-gray-500">
                    <tr>
                       <th className="p-4 pr-6">رقم القيد الدفتري</th>
                       <th className="p-4">تاريخ الترحيل واليوم</th>
                       <th className="p-4">بيان ووصف القيد العملي</th>
                       <th className="p-4">الحساب المدين (Debit)</th>
                       <th className="p-4 text-center">المبلغ المدين</th>
                       <th className="p-4">الحساب الدائن (Credit)</th>
                       <th className="p-4 text-center">المبلغ الدائن</th>
                       <th className="p-4 pl-6 text-left">تعديل</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-foreground">
                    {filteredEntries.map((jv) => (
                       <tr key={jv.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/10 transition-colors">
                          <td className="p-4 pr-6 font-mono font-bold text-primary dark:text-amber-500">{jv.referenceNo}</td>
                          <td className="p-4 font-mono text-gray-405">{new Date(jv.date).toLocaleDateString()}</td>
                          <td className="p-4 font-black">{jv.description}</td>
                          <td className="p-4">
                             <span className="px-2.5 py-1 bg-[#8B5E3C]/10 text-secondary rounded-lg font-black text-[10px] block truncate max-w-[130px]" title={jv.debitAccount}>
                                {jv.debitAccount}
                             </span>
                          </td>
                          <td className="p-4 font-bold text-emerald-600 font-mono text-center">
                             +{(jv.debitAmount || 0).toLocaleString()}
                          </td>
                          <td className="p-4">
                             <span className="px-2.5 py-1 bg-gray-55/10 text-gray-600 dark:text-gray-300 rounded-lg font-black text-[10px] block truncate max-w-[130px]" title={jv.creditAccount}>
                                {jv.creditAccount}
                             </span>
                          </td>
                          <td className="p-4 font-bold text-red-600 font-mono text-center">
                             -{(jv.creditAmount || 0).toLocaleString()}
                          </td>
                          <td className="p-4 pl-6 text-left shrink-0">
                             <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(jv)}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg text-secondary border-none cursor-pointer"
                                  title="تعديل القيد الدفتري"
                                >
                                   <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(jv)}
                                  className="p-1.5 hover:bg-red-50 text-red-550 rounded-lg border-none cursor-pointer"
                                  title="شطب وإلغاء القيد"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Journal entries Modal dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div onClick={() => !saving && setIsModalOpen(false)} className="absolute inset-0 bg-black/50" />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-slate-900 border border-gray-150 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden z-10 p-5 space-y-4">
                <h3 className="font-black text-sm text-primary">
                   {editingEntry ? 'تعديل قيد دفتر اليومية' : 'ترحيل قيد محاسبي جديد'}
                </h3>

                <form onSubmit={handleSave} className="space-y-4 text-right">

                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-gray-400 block mr-1">رقم مرجع السند (Ref):</label>
                         <input
                           type="text"
                           required
                           disabled={!!editingEntry}
                           value={referenceNo}
                           onChange={(e) => setReferenceNo(e.target.value)}
                           className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-bold text-left font-mono outline-none text-foreground"
                         />
                      </div>

                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-gray-400 block mr-1">تاريخ اليومية والمزامنة:</label>
                         <input
                           type="date"
                           required
                           value={date}
                           onChange={(e) => setDate(e.target.value)}
                           className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-left outline-none text-foreground"
                         />
                      </div>
                   </div>

                   {/* Debit Section */}
                   <div className="p-3 bg-emerald-50/20 border border-emerald-150/40 rounded-2xl space-y-3 text-right">
                      <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-450 flex items-center gap-1">
                         <DollarSign className="w-3.5 h-3.5" /> قيد الجانب المدين (Debit / آخذ)
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-1">
                            <label className="text-[8.5px] font-bold text-gray-450 block">حساب المدين المقبوض:</label>
                            <input
                              type="text"
                              required
                              placeholder="صندوق كاشير مذبح"
                              value={debitAccount}
                              onChange={(e) => setDebitAccount(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-gray-150 rounded-xl text-xs font-bold outline-none text-foreground"
                            />
                         </div>

                         <div className="space-y-1">
                            <label className="text-[8.5px] font-bold text-gray-455 block">المبلغ المدين المقبوض:</label>
                            <input
                              type="number"
                              required
                              placeholder="0"
                              value={debitAmount}
                              onChange={(e) => {
                                 const val = Number(e.target.value) || 0;
                                 setDebitAmount(val);
                                 setCreditAmount(val); // Suggest complete match by default
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-gray-150 rounded-xl text-xs font-bold font-mono text-left outline-none text-foreground"
                            />
                         </div>
                      </div>
                   </div>

                   {/* Credit Section */}
                   <div className="p-3 bg-red-50/20 border border-red-150/40 rounded-2xl space-y-3 text-right">
                      <span className="text-[10px] font-black text-red-800 dark:text-red-400 flex items-center gap-1">
                         <CreditCard className="w-3.5 h-3.5" /> قيد الجانب الدائن (Credit / عاطي)
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-1">
                            <label className="text-[8.5px] font-bold text-gray-450 block">حساب الدائن المدفوع:</label>
                            <input
                              type="text"
                              required
                              placeholder="فواتير مبيعات الأجل"
                              value={creditAccount}
                              onChange={(e) => setCreditAccount(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-gray-150 rounded-xl text-xs font-bold outline-none text-foreground"
                            />
                         </div>

                         <div className="space-y-1">
                            <label className="text-[8.5px] font-bold text-gray-455 block">المبلغ الدائن المدفوع:</label>
                            <input
                              type="number"
                              required
                              placeholder="0"
                              value={creditAmount}
                              onChange={(e) => setCreditAmount(Number(e.target.value) || 0)}
                              className="w-full px-3 py-1.5 bg-white border border-gray-150 rounded-xl text-xs font-bold font-mono text-left outline-none text-foreground"
                            />
                         </div>
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-450 block mr-1">بيان وإثبات شرح القيد الدفتري:</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-xs outline-none text-right resize-none text-foreground"
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                      <button type="submit" disabled={saving} className="w-full btn-primary text-xs font-black py-2.5 justify-center cursor-pointer border-none shadow-sm">
                         {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                         <span>تقييد وتوازن القيد</span>
                      </button>
                      <button type="button" onClick={() => setIsModalOpen(false)} className="w-full bg-gray-100 text-gray-550 py-2.5 rounded-xl text-xs font-bold border hover:bg-gray-200">إلغاء</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
