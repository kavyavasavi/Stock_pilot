
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../Service/Supabase/client'
import './pages.css'
import BackToOverview from '../components/BackToOverview'

const initialForm = {
  name: '',
  sku: '',
  category: '',
  unit: 'pcs',
  selling_price: '',
  cost_price: '',
  opening_quantity: '0',
  reorder_level: '',
  pack_size: '1',
  supplier_lead_days: '3'
}

function Products({ session }) {
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(initialForm)

  // Load business profile and products
  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, business_id, full_name, role')
      .eq('id', session.user.id)
      .single()

    if (profileError || !userProfile) {
      setError('Business profile not found.')
      setLoading(false)
      return
    }

    setProfile(userProfile)

    let query = supabase
      .from('products')
      .select('*')
      .order('name')

    query = query.eq('is_archived', showArchived)

    const { data, error: productError } = await query

    if (productError) {
      setError(productError.message)
    } else {
      setProducts(data || [])
    }

    setLoading(false)
  }, [session.user.id, showArchived])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Open new product form
  function openAddForm() {
    setEditingProduct(null)
    setForm(initialForm)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  // Open existing product for editing
  function openEditForm(product) {
    setEditingProduct(product)

    setForm({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || '',
      unit: product.unit || 'pcs',
      selling_price: String(product.selling_price),
      cost_price: String(product.cost_price),
      opening_quantity: '0',
      reorder_level: String(product.reorder_level),
      pack_size: String(product.pack_size || 1),
      supplier_lead_days: String(product.supplier_lead_days ?? 3)
    })

    setError('')
    setSuccess('')
    setShowForm(true)
  }

  function updateField(event) {
    setForm(previous => ({
      ...previous,
      [event.target.name]: event.target.value
    }))
  }

  // Save product
  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (profile?.role !== 'owner') {
      setError('Only owners can manage product details.')
      return
    }

    const selling = Number(form.selling_price)
    const cost = Number(form.cost_price)
    const openingQuantity = Number(form.opening_quantity)
    const reorder = Number(form.reorder_level)
    const pack = Number(form.pack_size)
    const lead = Number(form.supplier_lead_days)

    if (
      !form.name.trim() ||
      !form.sku.trim() ||
      !Number.isFinite(selling) ||
      !Number.isFinite(cost) ||
      !Number.isFinite(openingQuantity) ||
      !Number.isFinite(reorder) ||
      !Number.isFinite(pack) ||
      !Number.isInteger(lead) ||
      selling < 0 ||
      cost < 0 ||
      openingQuantity < 0 ||
      reorder < 0 ||
      pack <= 0 ||
      lead < 0
    ) {
      setError('Please enter valid product details.')
      return
    }

    setSaving(true)

    const productData = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim() || null,
      unit: form.unit,
      selling_price: selling,
      cost_price: cost,
      reorder_level: reorder,
      pack_size: pack,
      supplier_lead_days: lead
    }

    let result

    if (editingProduct) {
      // Editing product details must not change stock
      result = await supabase
        .from('products')
        .update({
          ...productData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProduct.id)
        .eq('business_id', profile.business_id)
    } else {
      // Create product and opening stock atomically
      result = await supabase.rpc(
        'create_product_with_opening_stock',
        {
          p_product: productData,
          p_opening_quantity: openingQuantity
        }
      )
    }

    setSaving(false)

    if (result.error) {
      setError(
        result.error.code === '23505'
          ? 'This SKU already exists in your business.'
          : result.error.message
      )
      return
    }

    setSuccess(
      editingProduct
        ? 'Product updated successfully.'
        : `Product created with ${openingQuantity} ${form.unit} opening stock.`
    )

    setShowForm(false)
    setForm(initialForm)

    await loadProducts()
  }

  // Archive product
  async function archiveProduct(product) {
    if (profile?.role !== 'owner') {
      setError('Only owners can archive products.')
      return
    }

    const confirmed = window.confirm(
      `Archive "${product.name}"? Its stock history will be preserved.`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('products')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id)
      .eq('business_id', profile.business_id)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(`${product.name} archived successfully.`)
    await loadProducts()
  }

  // Search and stock filters
  const filteredProducts = products.filter(product => {
    const query = search.toLowerCase()

    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      (product.category || '').toLowerCase().includes(query)

    const quantity = Number(product.current_quantity)
    const reorder = Number(product.reorder_level)

    const status =
      quantity === 0
        ? 'out'
        : quantity <= reorder
          ? 'low'
          : 'healthy'

    const matchesStatus =
      statusFilter === 'all' || statusFilter === status

    return matchesSearch && matchesStatus
  })

  function getStatus(product) {
    const quantity = Number(product.current_quantity)

    if (quantity === 0) return 'Out of stock'
    if (quantity <= Number(product.reorder_level)) return 'Low stock'

    return 'Healthy'
  }

  return (
    <div className="dashboard-layout">
   
      {/* Sidebar */}
      <aside className="sidebar">
        <Link to="/" className="dashboard-brand">
          <span className="brand-icon">S</span>
          StockPilot<span className="brand-ai">AI</span>
        </Link>

        <div className="sidebar-label">WORKSPACE</div>

        <Link className="sidebar-link" to="/dashboard">
          ▦ Overview
        </Link>

        <Link className="sidebar-link active" to="/products">
          □ Products
        </Link>

        <Link className="sidebar-link" to="/sales">
          ↗ Sales
        </Link>

        <Link className="sidebar-link" to="/invoices">
          ▤ Purchase invoices
        </Link>

        <Link className="sidebar-link" to="/forecasting">
          ⌁ Forecasting
        </Link>

        
        {/* <Link className="sidebar-link" to="/assistant">
        ✦ AI Assistant
        </Link> */}

        <div className="sidebar-bottom">
          <div className="user-avatar">
            {(profile?.full_name || 'U').charAt(0).toUpperCase()}
          </div>

          <div className="user-details">
            <strong>{profile?.full_name || 'User'}</strong>
            <span>{profile?.role || 'Account'}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main">
          <BackToOverview />
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-breadcrumb">
              WORKSPACE / PRODUCTS
            </span>
            <h1>Product management</h1>
          </div>

          <span className="live-status">● Live data</span>
        </header>

        <section className="welcome-row">
          <div>
            <h2>Your products</h2>
            <p>Manage product details and monitor inventory health.</p>
          </div>

          {profile?.role === 'owner' && !showArchived && (
            <button
              className="add-product-button"
              onClick={openAddForm}
            >
              + Add product
            </button>
          )}
        </section>

        {error && (
          <div className="dashboard-error">{error}</div>
        )}

        {success && (
          <div className="product-success">{success}</div>
        )}

        {/* Inventory */}
        <section className="inventory-section">

          <div className="inventory-heading">
            <div>
              <h2>
                {showArchived ? 'Archived products' : 'Active inventory'}
              </h2>

              <p>{filteredProducts.length} products displayed</p>
            </div>

            <input
              className="product-search"
              placeholder="Search product, SKU or category..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>

          <div className="product-filters">

            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
            >
              <option value="all">All stock statuses</option>
              <option value="healthy">Healthy</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>

            <button
              className="secondary-button"
              onClick={() => {
                setShowArchived(value => !value)
                setStatusFilter('all')
                setSearch('')
              }}
            >
              {showArchived ? 'View active products' : 'View archived'}
            </button>

          </div>

          {loading ? (
            <div className="dashboard-loading">
              Loading products...
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="product-table">

                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Unit</th>
                    <th>Quantity</th>
                    <th>Reorder level</th>
                    <th>Selling price</th>
                    <th>Status</th>

                    {profile?.role === 'owner' && (
                      <th>Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map(product => (
                    <tr key={product.id}>

                      <td>
                        <strong>{product.name}</strong>
                        <small>
                          {product.category || 'Uncategorized'}
                        </small>
                      </td>

                      <td>{product.sku}</td>
                      <td>{product.unit}</td>
                      <td>{product.current_quantity} {product.unit}</td>
                      <td>{product.reorder_level} {product.unit}</td>

                      <td>
                        ₹{Number(product.selling_price).toFixed(2)}
                      </td>

                      <td>
                        <span
                          className={`stock-status ${
                            getStatus(product) === 'Healthy'
                              ? 'status-healthy'
                              : getStatus(product) === 'Low stock'
                                ? 'status-low'
                                : 'status-out'
                          }`}
                        >
                          {getStatus(product)}
                        </span>
                      </td>

                      {profile?.role === 'owner' && (
                        <td>
                          <div className="product-actions">

                            {!showArchived && (
                              <>
                                <button
                                  onClick={() => openEditForm(product)}
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => archiveProduct(product)}
                                >
                                  Archive
                                </button>
                              </>
                            )}

                          </div>
                        </td>
                      )}

                    </tr>
                  ))}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td
                        colSpan={profile?.role === 'owner' ? 8 : 7}
                        className="empty-products"
                      >
                        No products found.
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          )}

        </section>

        {/* Add/Edit product modal */}
        {showForm && (
          <div className="modal-backdrop">

            <form
              className="product-modal"
              onSubmit={handleSave}
            >

              <div className="modal-heading">
                <div>
                  <h2>
                    {editingProduct ? 'Edit product' : 'Add product'}
                  </h2>

                  <p>
                    {editingProduct
                      ? 'Update product information. Stock is unchanged.'
                      : 'Add product details and its opening inventory.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowForm(false)}
                >
                  ×
                </button>
              </div>

              <label>Product name</label>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                required
              />

              <label>SKU</label>
              <input
                name="sku"
                value={form.sku}
                onChange={updateField}
                required
              />

              <label>Category</label>
              <input
                name="category"
                value={form.category}
                onChange={updateField}
              />

              <label>Unit</label>
              <select
                name="unit"
                value={form.unit}
                onChange={updateField}
              >
                <option value="pcs">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="litre">Litres</option>
                <option value="box">Boxes</option>
              </select>

              <div className="form-grid">

                <div>
                  <label>Selling price (₹)</label>
                  <input
                    name="selling_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.selling_price}
                    onChange={updateField}
                    required
                  />
                </div>

                <div>
                  <label>Cost price (₹)</label>
                  <input
                    name="cost_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_price}
                    onChange={updateField}
                    required
                  />
                </div>

                {!editingProduct && (
                  <div>
                    <label>Opening quantity</label>
                    <input
                      name="opening_quantity"
                      type="number"
                      min="0"
                      step="0.001"
                      value={form.opening_quantity}
                      onChange={updateField}
                      required
                    />
                  </div>
                )}

                <div>
                  <label>Reorder level</label>
                  <input
                    name="reorder_level"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.reorder_level}
                    onChange={updateField}
                    required
                  />
                </div>

                <div>
                  <label>Pack size</label>
                  <input
                    name="pack_size"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={form.pack_size}
                    onChange={updateField}
                    required
                  />
                </div>

                <div>
                  <label>Supplier lead time (days)</label>
                  <input
                    name="supplier_lead_days"
                    type="number"
                    min="0"
                    step="1"
                    value={form.supplier_lead_days}
                    onChange={updateField}
                    required
                  />
                </div>

              </div>

              <div className="auth-security">
                {editingProduct
                  ? 'Editing product details will not change current stock.'
                  : 'Opening stock will be recorded automatically in your stock movement history.'}
              </div>

              {error && (
                <div className="auth-error">{error}</div>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingProduct
                    ? 'Update product'
                    : 'Save product'}
              </button>

            </form>
          </div>
        )}

      </main>
    </div>
  )
}

export default Products
