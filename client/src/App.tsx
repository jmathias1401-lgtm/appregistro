import React, { useState, useEffect } from 'react';
import { PlusCircle, List, Package, X, Camera, ChevronLeft } from 'lucide-react';
import axios from 'axios';

const API_ORIGIN = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
const API_URL = `${API_ORIGIN}/api`;

interface Catalogo {
  id: number;
  nombre: string;
}

interface Product {
  idproducto: number;
  nombre: string;
  codigoproducto: string;
  stock: number;
  precioventa: number;
  nombrelaboratorio: string;
  imagen_path: string | null;
}

function App() {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [catalogos, setCatalogos] = useState<{
    unidades: Catalogo[],
    presentaciones: Catalogo[],
    laboratorios: Catalogo[]
  }>({ unidades: [], presentaciones: [], laboratorios: [] });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    codbarra: '',
    vencimiento: '',
    ubicacion: '',
    idunidad: '',
    idpresentacion: '',
    idlaboratorio: '',
    composicion: '',
    precioventa: '0',
    precioblister: '0',
    preciocaja: '0',
    stock: '0'
  });
  const [image, setImage] = useState<File | null>(null);
  const [internalCode, setInternalCode] = useState(() => `NewFarma-${Date.now()}`);

  useEffect(() => {
    fetchCatalogos();
    fetchProducts();
  }, []);

  const fetchCatalogos = async () => {
    try {
      const res = await axios.get(`${API_URL}/catalogos`);
      setCatalogos(res.data);
    } catch (err) {
      console.error('Error cargando catálogos', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/productos`);
      setProducts(res.data);
    } catch (err) {
      console.error('Error cargando productos', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const filteredProducts = products.filter(product =>
    product.nombre.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value));
    if (image) data.append('imagen', image);

    try {
      await axios.post(`${API_URL}/productos`, data);
      alert('Producto registrado con éxito');
      setView('list');
      fetchProducts();
      setFormData({
        nombre: '', codbarra: '', vencimiento: '', ubicacion: '',
        idunidad: '', idpresentacion: '', idlaboratorio: '',
        composicion: '', precioventa: '0', precioblister: '0', preciocaja: '0', stock: '0'
      });
      setImage(null);
      setInternalCode(`NewFarma-${Date.now()}`);
    } catch (err) {
      alert('Error al registrar producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        {view === 'create' && (
          <button className="icon-button" type="button" onClick={() => setView('list')} aria-label="Volver al listado">
            <ChevronLeft size={25} />
          </button>
        )}
        <h1>{view === 'list' ? 'Mis Productos' : 'Crear Producto'}</h1>
        {view === 'create' && (
          <button className="icon-button" type="button" onClick={() => setView('list')} aria-label="Cerrar formulario">
            <X size={22} />
          </button>
        )}
      </header>

      <main className="container">
        {view === 'list' ? (
          <>
            <div className="search-bar">
              <label htmlFor="product-search">Buscar producto</label>
              <input
                id="product-search"
                type="search"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="product-list">
            {loading ? <p>Cargando...</p> : filteredProducts.length === 0 ? (
              <p className="empty-state">
                {searchTerm ? 'No se encontraron productos con ese nombre.' : 'No hay productos registrados.'}
              </p>
            ) : filteredProducts.map(p => (
              <div key={p.idproducto} className="card product-card">
                <div className="product-image">
                  {p.imagen_path ? (
                    <img src={`${API_ORIGIN}/${p.imagen_path}`} alt={p.nombre} />
                  ) : <Package size={36} />}
                </div>
                <div className="product-details">
                  <h3>{p.nombre}</h3>
                  <p>{p.nombrelaboratorio || 'Sin laboratorio'}</p>
                  <div className="product-meta">
                    <span className="product-price">S/ {Number(p.precioventa || 0).toFixed(2)}</span>
                    <span className="stock">Stock: {p.stock}</span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="product-form">
            <div className="card form-card">
              <div className="form-group">
                <label>Nombre del Producto</label>
                <input type="text" name="nombre" className="form-control" placeholder="Ej: Plumón Indeleble..." required value={formData.nombre} onChange={handleInputChange} />
              </div>

              <div className="field-grid field-grid-three">
                <div className="form-group">
                  <label>Código de Barras</label>
                  <input type="text" name="codbarra" className="form-control" placeholder="Escanee o escriba el código" value={formData.codbarra} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Código Interno</label>
                  <input type="text" className="form-control readonly" value={internalCode} readOnly />
                </div>
                <div className="form-group">
                  <label>Fecha de Vencimiento</label>
                  <input type="date" name="vencimiento" className="form-control" value={formData.vencimiento} onChange={handleInputChange} />
                </div>
              </div>

              <div className="field-grid field-grid-four">
                <div className="form-group">
                  <label>Ubicación</label>
                  <input type="text" name="ubicacion" className="form-control" placeholder="Ej: Almacén A-1" value={formData.ubicacion} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Unidad de Medida</label>
                  <select name="idunidad" className="form-control" value={formData.idunidad} onChange={handleInputChange}>
                    <option value="">Seleccionar...</option>
                    {catalogos.unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Presentación</label>
                  <select name="idpresentacion" className="form-control" value={formData.idpresentacion} onChange={handleInputChange}>
                    <option value="">Seleccionar...</option>
                    {catalogos.presentaciones.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                <label>Marca (Laboratorio)</label>
                <select name="idlaboratorio" className="form-control" value={formData.idlaboratorio} onChange={handleInputChange}>
                  <option value="">Seleccionar...</option>
                  {catalogos.laboratorios.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
                </div>
              </div>

              <div className="form-group">
                <label>Composición / Descripción</label>
                <textarea name="composicion" className="form-control" rows={3} value={formData.composicion} onChange={handleInputChange}></textarea>
              </div>

              <div className="form-group">
                <label>Imagen del Producto</label>
                <div className="upload-area">
                  <input type="file" id="image-upload" onChange={handleImageChange} accept="image/*" capture="environment" />
                  <label htmlFor="image-upload">
                    <Camera size={30} />
                    <span>{image ? image.name : 'Subir o tomar foto'}</span>
                  </label>
                </div>
              </div>

              <div className="price-grid">
                <div className="form-group">
                  <label>P. Unidad</label>
                  <div className="money-input"><span>S/</span><input type="number" min="0" step="0.01" name="precioventa" className="form-control" value={formData.precioventa} onChange={handleInputChange} /></div>
                </div>
                <div className="form-group">
                  <label>P. Blister</label>
                  <div className="money-input"><span>S/</span><input type="number" min="0" step="0.01" name="precioblister" className="form-control" value={formData.precioblister} onChange={handleInputChange} /></div>
                </div>
                <div className="form-group">
                  <label>P. Caja</label>
                  <div className="money-input"><span>S/</span><input type="number" min="0" step="0.01" name="preciocaja" className="form-control" value={formData.preciocaja} onChange={handleInputChange} /></div>
                </div>
                <div className="form-group">
                  <label>Stock Actual</label>
                  <input type="number" min="0" name="stock" className="form-control" value={formData.stock} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setView('list')}>Cancelar</button>
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Guardando...' : 'Crear Producto'}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
          <List size={24} />
          <span>Listado</span>
        </button>
        <button className={`nav-item ${view === 'create' ? 'active' : ''}`} onClick={() => setView('create')}>
          <PlusCircle size={24} />
          <span>Registrar</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
