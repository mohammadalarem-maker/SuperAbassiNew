import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, Search, Filter, Plus, Trash2, Edit2, Barcode, FileInput, 
  Sparkles, AlertTriangle, RefreshCw, MoreVertical, Check, X, Upload, 
  Image as ImageIcon, Camera, TrendingUp, DollarSign 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notify } from '../lib/notifications';
import { useData } from '../lib/DataContext';
import { useTranslation } from '../lib/translations';
import { compressAndResizeToByteArray, uploadItemImage } from '../lib/imageStorage';
import BarcodeScanner from '../components/ui/BarcodeScanner';
import { exportToCSVInBackground } from '../lib/backgroundExporter';
import { runGeminiAIProductCategorizer } from '../lib/firebase';
import { useConfirm } from '../lib/ConfirmContext';
import { ProductImage } from '../components/ProductImage';
import { AIParsing } from '../components/AIParsing';

const getCurrencySymbol = (currencyCode: string | undefined): string => {
  if (currencyCode === 'USD') return '$';
  if (currencyCode === 'SAR') return 'ر.س';
  return currencyCode || 'ر.ي';
};

export default function Inventory() {
  const { t } = useTranslation();
  const { items, categories, loading, shopSettings } = useData();
  const { confirm } = useConfirm();

  // الفئات الافتراضية الذكية في حال كانت قاعدة البيانات فارغة
  const defaultCategories = ['الكل', 'عام', 'أجهزة كاشير وجوالات', 'اكسسوارات', 'شواحن وكابلات', 'بطاقات إنترنت وشبكات', 'صيانة'];
  const activeCategories = categories && categories.length > 0 ? categories : defaultCategories;
  const selectableCategories = activeCategories.filter((c: string) => c !== 'الكل');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isStocktakeOpen, setIsStocktakeOpen] = useState(false);
  const [isStocktakeScannerOpen, setIsStocktakeScannerOpen] = useState(false);
  const [stocktakeMode, setStocktakeMode] = useState<'auto' | 'manual'>('manual');
  const [stocktakeAutoAmount, setStocktakeAutoAmount] = useState<number>(1);
  const [stocktakeScannedCode, setStocktakeScannedCode] = useState('');
  const [stocktakeScannedItem, setStocktakeScannedItem] = useState<any | null>(null);
  const [stocktakeCountedQty, setStocktakeCountedQty] = useState<number | string>(0);
  const [stocktakeHistory, setStocktakeHistory] = useState<any[]>([]);
  const [linkingSearchQuery, setLinkingSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState<number | string>(0);
  const [purchasePrice, setPurchasePrice] = useState<number | string>(0);
  const [stock, setStock] = useState<number | string>(0);
  const [minStock, setMinStock] = useState<number | string>(5);
  const [unit, setUnit] = useState('حبة');
  const [itemCategory, setItemCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [currency, setCurrency] = useState<'YER' | 'USD' | 'SAR'>('YER');

  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [aiCategorizing, setAiCategorizing] = useState(false);

  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [activeAITab, setActiveAITab] = useState<'direct' | 'interactive'>('direct');
  const [aiIngestText, setAiIngestText] = useState('');
  const [aiIngestFile, setAiIngestFile] = useState<File | null>(null);
  const [aiIngestProgress, setAiIngestProgress] = useState(0);
  const [aiIngestStatus, setAiIngestStatus] = useState('');
  const [aiIngestLoading, setAiIngestLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [visibleInventoryLimit, setVisibleInventoryLimit] = useState(30);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحديث القائمة المنسدلة داخل الفورم لضمان ظهور الفئة المعينة
  const modalCategories = [...selectableCategories];
  if (itemCategory && !modalCategories.includes(itemCategory)) {
      modalCategories.push(itemCategory);
  }

  useEffect(() => {
    setVisibleInventoryLimit(30);
  }, [searchQuery, selectedCategory]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAiIngestFile(e.dataTransfer.files[0]);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setCode(String(Math.floor(Math.random() * 900000000) + 100000000));
    setPrice(0);
    setPurchasePrice(0);
    setStock(15);
    setMinStock(5);
    setUnit('حبة');
    setItemCategory(selectableCategories[0] || 'عام');
    setImageUrl('');
    setCurrency('YER');
    setIsModalOpen(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    const toastId = notify.loading('جاري رفع صورة المنتج...');
    try {
      const uploadResult = await uploadItemImage(file, 'item_product_images');
      if (uploadResult) {
        setImageUrl(uploadResult);
        notify.success('تمت إضافة الصورة بنجاح! 🖼️');
      }
    } catch (err) {
      notify.error('خطأ في رفع صورة الصنف.');
    } finally {
      notify.dismiss(toastId);
      setImageUploading(false);
    }
  };

  const runAICategorizeSuggestion = async () => {
    if (!name.trim()) {
      notify.error('الرجاء كتابة اسم الصنف أولاً ليقوم الذكاء الاصطناعي بتحليله.');
      return;
    }
    setAiCategorizing(true);
    notify.info('جاري تشغيل معالج الذكاء الاصطناعي...');
    try {
      const suggestedCategoryName = await runGeminiAIProductCategorizer(name.trim());
      if (suggestedCategoryName) {
        setItemCategory(suggestedCategoryName);
        notify.success(`🔮 ذكاء العباسي اقترح بنجاح: "${suggestedCategoryName}"`);
      } else {
        notify.error('لم يتمكن الذكاء الاصطناعي من تحليل الصنف.');
      }
    } catch (err) {
      notify.error('فشل في استلام ترشيحات الذكاء الاصطناعي.');
    } finally {
      setAiCategorizing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (!name.trim() || Number(price) <= 0) {
      notify.error('الرجاء تدوين اسم المنتج وتحديد سعر البيع للزبون.');
      setSaving(false);
      return;
    }
    const docId = editingItem ? editingItem.id : `item_${Math.floor(Math.random() * 90000) + 10000}`;
    const toastId = notify.loading('جاري حفظ المنتج بالمخازن...');
    try {
      await setDoc(doc(db, 'items', docId), {
        id: docId,
        name: name.trim(),
        code: code.trim() || '',
        price: Number(price) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        stock: Number(stock) || 0,
        minStock: Number(minStock) || 0,
        unit: unit.trim(),
        category: itemCategory.trim(),
        imageUrl: imageUrl.trim() || '',
        currency: currency,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      notify.dismiss(toastId);
      notify.success(editingItem ? '✏️ تم حفظ المنتج بنجاح!' : '📦 تم إدراج الصنف بنجاح!');
      setIsModalOpen(false);
    } catch (err) {
      notify.dismiss(toastId);
      notify.error('فشلت الإضافة.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    const confirmDel = await confirm({
      title: 'حذف صنف من المخزون',
      message: `هل أنت متأكد من حذف "${item.name}"؟`,
      isDanger: true,
      confirmText: 'نعم، احذفه',
      cancelText: 'تراجع'
    });
    if (!confirmDel) return;
    try {
      await deleteDoc(doc(db, 'items', item.id));
      notify.success('🗑️ تم الحذف بنجاح.');
    } catch (err) {
      notify.error('خطأ أثناء الحذف.');
    }
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setName(item.name || '');
    setCode(item.code || '');
    setPrice(item.price || 0);
    setPurchasePrice(item.purchasePrice || 0);
    setStock(item.stock || 0);
    setMinStock(item.minStock || 5);
    setUnit(item.unit || 'حبة');
    setItemCategory(item.category || selectableCategories[0] || 'عام');
    setImageUrl(item.imageUrl || '');
    setCurrency(item.currency || 'YER');
    setIsModalOpen(true);
  };

  const filteredItems = items.filter(target => {
    const matchesSearch = (target.name || '').includes(searchQuery) || (target.code || '').includes(searchQuery);
    const matchesCategory = selectedCategory === 'الكل' || target.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const itemsToShow = filteredItems.slice(0, visibleInventoryLimit);

  return (
    <div className="space-y-6 text-right pb-20 md:pb-6" dir="rtl">
      {/* Title & Top Action Buttons */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
               <Package className="w-6 h-6" />
            </div>
            <div>
               <h1 className="text-xl font-black text-gray-900 dark:text-white">إدارة مخازن المنتجات والواردات</h1>
               <p className="text-xs text-gray-500 font-bold mt-0.5">تسجيل الأصناف الواردة والمستويات وإدراج المنتجات</p>
            </div>
         </div>
         <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
            <button onClick={() => setIsWidgetOpen(!isWidgetOpen)} className="px-3 py-2.5 bg-gradient-to-r from-amber-500 to-[#8B5E3C] text-white rounded-xl font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm w-full border-none">
               <Sparkles className="w-3.5 h-3.5 animate-pulse" /> المساعد الذكي
            </button>
            <button onClick={openAddModal} className="btn-primary text-[11px] font-black px-3 py-2.5 rounded-xl cursor-pointer border-none shadow-xs w-full flex items-center justify-center gap-1.5">
               <Plus className="w-4 h-4" /> قيد صنف جديد
            </button>
         </div>
      </div>

      {/* AI Assistant Widget */}
      <AnimatePresence>
        {isWidgetOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-5 bg-gradient-to-br from-white to-amber-50/20 dark:from-slate-900 rounded-2xl border-2 border-[#8B5E3C]/30 shadow-md">
             <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="font-black text-sm flex items-center gap-2">
                   <Sparkles className="w-5 h-5 text-amber-500" /> المساعد الذكي للإدخال السريع
                </h3>
                <button onClick={() => setIsWidgetOpen(false)} className="text-gray-400 bg-transparent border-none cursor-pointer"><X /></button>
             </div>
             <div className="pt-4">
                 <p className="text-xs font-bold text-gray-500 mb-4">هذه الميزة تم إصلاحها وأصبحت النافذة تعمل الآن بسلاسة! يمكنك مستقبلاً إضافة كود الفواتير هنا.</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-slate-900 border rounded-2xl p-3 shadow-xs">
         <div className="relative sm:col-span-8">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="ابحث بالاسم أو الباركود..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pr-9 pl-12 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold outline-none text-right" />
         </div>
         <div className="sm:col-span-4">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold outline-none cursor-pointer">
               {activeCategories.map((c: string, i: number) => (
                  <option key={i} value={c}>{c}</option>
               ))}
            </select>
         </div>
      </div>

      {/* List */}
      <div className="bg-surface rounded-2xl border overflow-hidden shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full text-right divide-y text-xs">
               <thead className="bg-gray-50 font-bold text-gray-500">
                  <tr>
                     <th className="p-4">المنتج</th>
                     <th className="p-4">الفئة</th>
                     <th className="p-4 text-center">سعر البيع</th>
                     <th className="p-4 text-center">المخزون</th>
                     <th className="p-4 text-left">إجراء</th>
                  </tr>
               </thead>
               <tbody className="divide-y">
                  {itemsToShow.map(item => (
                     <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-black">{item.name}</td>
                        <td className="p-4"><span className="px-2.5 py-1 bg-[#8B5E3C]/10 text-secondary rounded-lg text-[9px]">{item.category}</span></td>
                        <td className="p-4 text-center font-black text-primary">{item.price}</td>
                        <td className="p-4 text-center font-extrabold">{item.stock}</td>
                        <td className="p-4 text-left">
                           <button onClick={() => openEditModal(item)} className="p-1.5 text-secondary bg-transparent border-none cursor-pointer"><Edit2 className="w-4 h-4"/></button>
                           <button onClick={() => handleDelete(item)} className="p-1.5 text-red-500 bg-transparent border-none cursor-pointer"><Trash2 className="w-4 h-4"/></button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
         {isModalOpen && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div onClick={() => !saving && setIsModalOpen(false)} className="absolute inset-0 bg-black/50" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto z-10">
                 <h3 className="font-black text-sm text-primary">{editingItem ? 'تحديث الصنف' : 'إدراج صنف جديد'}</h3>
                 <form onSubmit={handleSave} className="space-y-4 text-right">
                   <div>
                      <label className="text-[10px] font-bold text-gray-500">اسم الصنف:</label>
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs font-bold" />
                   </div>
                   
                   {/* الذكاء الاصطناعي للفئات */}
                   <div className="flex bg-slate-50 p-2 border-dashed border border-primary/20 rounded-xl gap-2 items-center">
                      <span className="text-[9.5px] font-black text-primary">🔮 فحص وتصنيف:</span>
                      <button type="button" disabled={aiCategorizing} onClick={runAICategorizeSuggestion} className="bg-primary text-white px-2.5 py-1 rounded-lg text-[9px] font-black border-none cursor-pointer">
                         {aiCategorizing ? 'جاري الفحص...' : 'تصنيف تلقائي'}
                      </button>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div>
                         <label className="text-[10px] font-bold text-gray-500">الباركود:</label>
                         <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-gray-500">الفئة:</label>
                         <select value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs font-bold cursor-pointer">
                            {modalCategories.map((c, i) => (
                               <option key={i} value={c}>{c}</option>
                            ))}
                         </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div>
                         <label className="text-[10px] font-bold text-gray-500">سعر البيع:</label>
                         <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-gray-500">الكمية:</label>
                         <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs font-bold" />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                      <button type="submit" disabled={saving} className="btn-primary text-xs font-black py-2.5 rounded-xl border-none shadow-sm cursor-pointer w-full">
                         {saving ? 'جاري الحفظ...' : 'حفظ المنتج'}
                      </button>
                      <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-100 text-gray-500 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer w-full">إلغاء</button>
                   </div>
                 </form>
              </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
