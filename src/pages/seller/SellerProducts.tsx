import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { supabase } from '@/lib/supabase';
import { slugify, formatBDT, discountedPrice } from '@/lib/utils';
import type { SellerOffer, Category, ProductCatalog } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import { Plus, Pencil, Trash2, X, Package, Search, Link2, CheckCircle2 } from 'lucide-react';

interface ProductForm {
  name: string;
  brand: string;
  description: string;
  price: string;
  discount_percent: string;
  stock: string;
  min_age: string;
  max_age: string;
  material: string;
  color: string;
  safety_info: string;
  origin: string;
  warranty: string;
  category_id: string;
  image_url: string;
}

const emptyForm: ProductForm = {
  name: '', brand: '', description: '', price: '', discount_percent: '0', stock: '',
  min_age: '', max_age: '', material: '', color: '', safety_info: '', origin: '', warranty: '',
  category_id: '', image_url: '',
};

export default function SellerProducts() {
  const { seller } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState<SellerOffer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [catalogMatches, setCatalogMatches] = useState<ProductCatalog[]>([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [linkedCatalogId, setLinkedCatalogId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!seller) return;
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*, sellers(*), product_catalog(*, product_images(*))').eq('seller_id', seller.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
    ]);
    setProducts(prodRes.data as SellerOffer[] ?? []);
    setCategories(catRes.data as Category[] ?? []);
    setLoading(false);
  }, [seller]);

  useEffect(() => { load(); }, [load]);

  // Search existing catalog entries by name+brand when adding a new product
  async function searchCatalog(name: string, brand: string) {
    if (!name.trim() || name.trim().length < 2) {
      setCatalogMatches([]);
      return;
    }
    setSearchingCatalog(true);
    let q = supabase.from('product_catalog').select('*, product_images(*)').ilike('name', `%${name.trim()}%`);
    if (brand.trim()) {
      q = q.ilike('brand', `%${brand.trim()}%`);
    }
    const { data } = await q.limit(5);
    setCatalogMatches(data as ProductCatalog[] ?? []);
    setSearchingCatalog(false);
  }

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setCatalogMatches([]);
    setLinkedCatalogId(null);
    setShowForm(true);
  }

  function openEdit(product: SellerOffer) {
    setForm({
      name: product.name,
      brand: product.brand ?? '',
      description: product.description ?? '',
      price: String(product.price),
      discount_percent: String(product.discount_percent),
      stock: String(product.stock),
      min_age: product.min_age != null ? String(product.min_age) : '',
      max_age: product.max_age != null ? String(product.max_age) : '',
      material: product.material ?? '',
      color: product.color ?? '',
      safety_info: product.safety_info ?? '',
      origin: product.origin ?? '',
      warranty: product.warranty ?? '',
      category_id: product.category_id ?? '',
      image_url: product.product_catalog?.product_images?.[0]?.image_url ?? '',
    });
    setEditingId(product.id);
    setLinkedCatalogId(product.catalog_id);
    setCatalogMatches([]);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seller) return;
    if (!form.name.trim() || !form.price || !form.stock) {
      showToast('Name, price, and stock are required', 'error');
      return;
    }
    setSaving(true);

    const offerData = {
      seller_id: seller.id,
      category_id: form.category_id || null,
      name: form.name.trim(),
      slug: slugify(form.name) + '-' + Math.random().toString(36).slice(2, 6),
      brand: form.brand.trim() || null,
      description: form.description.trim() || null,
      price: parseFloat(form.price),
      discount_percent: parseFloat(form.discount_percent) || 0,
      stock: parseInt(form.stock),
      min_age: form.min_age ? parseInt(form.min_age) : null,
      max_age: form.max_age ? parseInt(form.max_age) : null,
      material: form.material.trim() || null,
      color: form.color.trim() || null,
      safety_info: form.safety_info.trim() || null,
      origin: form.origin.trim() || null,
      warranty: form.warranty.trim() || null,
      is_active: true,
    };

    if (editingId) {
      const { slug: _slug, seller_id: _s, ...updateData } = offerData;
      void _slug; void _s;
      const { error } = await supabase.from('products').update(updateData).eq('id', editingId);
      if (error) {
        showToast(error.message, 'error');
        setSaving(false);
        return;
      }
      // Update catalog image if provided
      if (form.image_url && linkedCatalogId) {
        const { data: existingImg } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', linkedCatalogId)
          .order('sort_order')
          .limit(1)
          .maybeSingle();
        if (existingImg) {
          await supabase.from('product_images').update({ image_url: form.image_url }).eq('id', existingImg.id);
        } else {
          await supabase.from('product_images').insert({ product_id: linkedCatalogId, image_url: form.image_url });
        }
      }
      showToast('Product updated!');
    } else {
      let catalogId = linkedCatalogId;

      // If not linking to existing catalog, create a new catalog entry
      if (!catalogId) {
        const catalogData = {
          name: form.name.trim(),
          slug: slugify(form.name) + '-' + Math.random().toString(36).slice(2, 6),
          brand: form.brand.trim() || null,
          description: form.description.trim() || null,
          category_id: form.category_id || null,
          min_age: form.min_age ? parseInt(form.min_age) : null,
          max_age: form.max_age ? parseInt(form.max_age) : null,
          material: form.material.trim() || null,
          color: form.color.trim() || null,
          safety_info: form.safety_info.trim() || null,
          origin: form.origin.trim() || null,
          warranty: form.warranty.trim() || null,
          is_featured: false,
          is_active: true,
        };
        const { data: newCatalog, error: catError } = await supabase.from('product_catalog').insert(catalogData).select().single();
        if (catError || !newCatalog) {
          showToast(catError?.message ?? 'Failed to create catalog entry', 'error');
          setSaving(false);
          return;
        }
        catalogId = newCatalog.id;
      }

      // Create the offer linked to the catalog entry
      const { error: offerError } = await supabase.from('products').insert({ ...offerData, catalog_id: catalogId });
      if (offerError) {
        showToast(offerError.message, 'error');
        setSaving(false);
        return;
      }

      // Add image to catalog if provided
      if (form.image_url) {
        await supabase.from('product_images').insert({ product_id: catalogId, image_url: form.image_url });
      }
      showToast('Product added!');
    }

    setSaving(false);
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
    setLinkedCatalogId(null);
    setCatalogMatches([]);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await supabase.from('products').delete().eq('id', id);
    showToast('Product deleted');
    load();
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">Products ({products.length})</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="input w-48 pl-9 py-2 text-sm"
            />
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first toy to start selling."
          action={<button onClick={openAdd} className="btn-primary mt-4">Add Product</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((product) => {
                  const finalPrice = discountedPrice(product.price, product.discount_percent);
                  const image = product.product_catalog?.product_images?.[0]?.image_url;
                  return (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                            {image && <img src={image} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium text-slate-700">{product.name}</p>
                            <p className="text-xs text-slate-400">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{formatBDT(finalPrice)}</div>
                        {product.discount_percent > 0 && (
                          <div className="text-xs text-slate-400 line-through">{formatBDT(product.price)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${product.stock === 0 ? 'bg-error-100 text-error-700' : product.stock < 10 ? 'bg-warning-100 text-warning-700' : 'bg-success-100 text-success-700'}`}>
                          {product.stock} units
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {product.rating > 0 ? `${product.rating.toFixed(1)} ★` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(product)} className="rounded-lg p-2 text-slate-400 hover:bg-primary-50 hover:text-primary-600">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="rounded-lg p-2 text-slate-400 hover:bg-error-50 hover:text-error-600">
                            <Trash2 size={16} />
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
      )}

      {/* Product form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 animate-bounce-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Catalog search when adding new product */}
              {!editingId && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      setLinkedCatalogId(null);
                      searchCatalog(e.target.value, form.brand);
                    }}
                    className="input"
                    placeholder="e.g. Mega Building Blocks Set"
                  />
                  {/* Catalog matches */}
                  {form.name.length >= 2 && (
                    <div className="mt-2 space-y-2">
                      {searchingCatalog && <p className="text-xs text-slate-400">Searching catalog...</p>}
                      {catalogMatches.length > 0 && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-medium text-slate-500">
                            <Link2 size={12} className="inline mr-1" />
                            Similar products found in catalog — link to share reviews & images:
                          </p>
                          <div className="space-y-1.5">
                            {catalogMatches.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setLinkedCatalogId(cat.id);
                                  setForm({
                                    ...form,
                                    name: cat.name,
                                    brand: cat.brand ?? '',
                                    description: cat.description ?? '',
                                    category_id: cat.category_id ?? '',
                                    min_age: cat.min_age != null ? String(cat.min_age) : '',
                                    max_age: cat.max_age != null ? String(cat.max_age) : '',
                                    material: cat.material ?? '',
                                    color: cat.color ?? '',
                                    safety_info: cat.safety_info ?? '',
                                    origin: cat.origin ?? '',
                                    warranty: cat.warranty ?? '',
                                    image_url: cat.product_images?.[0]?.image_url ?? '',
                                  });
                                  setCatalogMatches([]);
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm transition-colors ${
                                  linkedCatalogId === cat.id
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'hover:bg-slate-100'
                                }`}
                              >
                                {linkedCatalogId === cat.id ? (
                                  <CheckCircle2 size={14} className="text-primary-600" />
                                ) : (
                                  <Link2 size={14} className="text-slate-400" />
                                )}
                                <span className="flex-1">
                                  <span className="font-medium">{cat.name}</span>
                                  {cat.brand && <span className="text-xs text-slate-400"> • {cat.brand}</span>}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {!searchingCatalog && catalogMatches.length === 0 && linkedCatalogId === null && form.name.length >= 2 && (
                        <p className="text-xs text-slate-400">
                          No existing catalog match — a new catalog entry will be created.
                        </p>
                      )}
                      {linkedCatalogId && (
                        <div className="flex items-center gap-2 rounded-lg bg-success-50 p-2 text-xs text-success-700">
                          <CheckCircle2 size={14} />
                          Linked to existing catalog entry. Images and reviews will be shared.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {editingId && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Product Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="e.g. Mega Building Blocks Set" />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Brand</label>
                  <input type="text" value={form.brand} onChange={(e) => { setForm({ ...form, brand: e.target.value }); if (!editingId) searchCatalog(form.name, e.target.value); }} className="input" placeholder="e.g. LEGO" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Category</label>
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input cursor-pointer">
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input resize-none" placeholder="Describe your product..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Price (৳) *</label>
                  <input type="number" required step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" placeholder="0" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Discount %</label>
                  <input type="number" step="0.01" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} className="input" placeholder="0" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Stock *</label>
                  <input type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input" placeholder="0" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Min Age (years)</label>
                  <input type="number" value={form.min_age} onChange={(e) => setForm({ ...form, min_age: e.target.value })} className="input" placeholder="e.g. 3" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Max Age (years)</label>
                  <input type="number" value={form.max_age} onChange={(e) => setForm({ ...form, max_age: e.target.value })} className="input" placeholder="e.g. 8" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Material</label>
                  <input type="text" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="input" placeholder="e.g. ABS Plastic" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Color</label>
                  <input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="input" placeholder="e.g. Multicolor" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Origin</label>
                  <input type="text" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="input" placeholder="e.g. Imported" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Warranty</label>
                  <input type="text" value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} className="input" placeholder="e.g. 6 months" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Safety Info</label>
                <input type="text" value={form.safety_info} onChange={(e) => setForm({ ...form, safety_info: e.target.value })} className="input" placeholder="e.g. CE certified, BPA-free" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Image URL</label>
                <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" placeholder="https://..." />
                {form.image_url && (
                  <div className="mt-2 h-32 w-32 overflow-hidden rounded-lg border border-slate-200">
                    <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                {!editingId && linkedCatalogId && (
                  <p className="mt-1 text-xs text-slate-400">
                    Image will be added to the shared catalog entry.
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
                  {saving ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
