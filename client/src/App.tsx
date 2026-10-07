import React, { useState, useEffect } from 'react';
import { PlusCircle, List, Package, X, Camera, ChevronLeft, LogOut, UserCircle, ScanBarcode, Pencil, Trash2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';
const IMAGE_BASE_URL = (import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:4300/assets/img/imagenes' || 'http://192.168.1.63:4300/assets/img/imagenes' || 'http://192.168.1.63:3000/assets/img/imagenes').replace(/\/$/, '');

interface Catalogo {
  id: number;
  nombre: string;
}

interface Producto {
  idproducto: number;
  nombre: string;
  codigoproducto: string;
  stock: number;
  precioventa: number;
  precioblister?: number;
  preciocaja?: number;
  vencimiento?: string;
  ubicacion?: string;
  composicion?: string;
  codbarra?: string;
  estado?: string;
  nombrelaboratorio?: string;
  idlaboratorio?: number;
  idpresentacion?: number;
  idunidadmedida?: number;
  laboratorio?: { idlaboratorio?: number; nombrelaboratorio?: string };
  presentacion?: { idpresentacion?: number; nombrepresentacion?: string; nombre?: string };
  unidadmedida?: { idunidadmedida?: number; nombreunidad?: string; nombre?: string };
  imagen_path: string | null;
}

interface LoginCreds {
  usuario: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

interface ProductFormData {
  nombre: string;
  codbarra: string;
  vencimiento: string;
  ubicacion: string;
  idunidad: string;
  idpresentacion: string;
  idlaboratorio: string;
  composicion: string;
  precioventa: string;
  precioblister: string;
  preciocaja: string;
  stock: string;
}

const createEmptyFormData = (): ProductFormData => {
  const defaultExpirationDate = new Date();
  defaultExpirationDate.setFullYear(defaultExpirationDate.getFullYear() + 1);

  return {
    nombre: '',
    codbarra: '',
    vencimiento: [
      defaultExpirationDate.getFullYear(),
      String(defaultExpirationDate.getMonth() + 1).padStart(2, '0'),
      String(defaultExpirationDate.getDate()).padStart(2, '0')
    ].join('-'),
    ubicacion: '',
    idunidad: '',
    idpresentacion: '',
    idlaboratorio: '',
    composicion: '',
    precioventa: '0',
    precioblister: '0',
    preciocaja: '0',
    stock: '0'
  };
};

function App() {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [catalogos, setCatalogos] = useState<{
    unidades: Catalogo[],
    presentaciones: Catalogo[],
    laboratorios: Catalogo[]
  }>({ unidades: [], presentaciones: [], laboratorios: [] });

  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'nombre' | 'codbarra'>('nombre');
  const [token, setToken] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ nombre: '', usuario: '', password: '' });
  const [formData, setFormData] = useState<ProductFormData>(createEmptyFormData);
  const [image, setImage] = useState<File | null>(null);
  const [internalCode, setInternalCode] = useState(`NewFarma-${Date.now()}`);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const handleScanResult = (decodedText: string) => {
    if (view === 'list') {
      setSearchTerm(decodedText);
    } else {
      setFormData(prev => ({ ...prev, codbarra: decodedText }));
    }
    setShowBarcodeScanner(false);
  };

  useEffect(() => {
    if (!showBarcodeScanner) {
      setScannerError(null);
      return;
    }

    let html5QrcodeScanner: Html5Qrcode | null = null;
    let isMounted = true;

    const initScanner = async () => {
      try {
        setScannerError(null);
        html5QrcodeScanner = new Html5Qrcode("barcode-scanner-viewport");

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 160 },
          aspectRatio: 1.333333
        };

        const onScanSuccess = (decodedText: string) => {
          if (isMounted) {
            handleScanResult(decodedText);
          }
        };

        const onScanFailure = () => {
          // ignore frame scan failures
        };

        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const backCamera = cameras.find(c =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('trasera') ||
              c.label.toLowerCase().includes('posterior') ||
              c.label.toLowerCase().includes('environment')
            );
            const cameraId = backCamera ? backCamera.id : cameras[0].id;
            await html5QrcodeScanner.start(cameraId, config, onScanSuccess, onScanFailure);
          } else {
            await html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
          }
        } catch (camErr) {
          console.warn("Fallo al obtener cámara específica, probando modo genérico:", camErr);
          await html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
        }
      } catch (err: any) {
        console.error("Error al iniciar escáner:", err);
        if (isMounted) {
          setScannerError("La cámara en vivo en dispositivos móviles sobre HTTP requiere un entorno seguro o dar permisos. Puedes usar la opción 'Tomar foto' a continuación.");
        }
      }
    };

    const timer = setTimeout(() => {
      initScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrcodeScanner) {
        if (html5QrcodeScanner.isScanning) {
          html5QrcodeScanner.stop().catch(err => console.error("Error al detener scanner:", err));
        }
      }
    };
  }, [showBarcodeScanner, view]);

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      const html5Qrcode = new Html5Qrcode("barcode-scanner-viewport");
      const decodedText = await html5Qrcode.scanFile(file, true);
      handleScanResult(decodedText);
    } catch (err) {
      console.error("Error al escanear foto:", err);
      setScannerError("No se detectó un código de barras claro en la foto. Intenta tomar la foto más cerca y enfocar bien el código.");
    }
  };

  const normalizeList = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    const candidates = [payload.list, payload.data, payload.items, payload.productos, payload.result];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  };

  const normalizeCatalog = (payload: any, idFields: string[], nameFields: string[]): Catalogo[] => {
    return normalizeList(payload)
      .map(item => ({
        id: idFields.map(field => item?.[field]).find(value => value !== undefined && value !== null),
        nombre: nameFields.map(field => item?.[field]).find(value => value !== undefined && value !== null) ?? ''
      }))
      .filter(item => item.id !== undefined && item.nombre !== '');
  };

  const getProductImageUrl = (imageName: string) => {
    const normalizedName = imageName.replace(/^[/\\]+/, '');
    return `${IMAGE_BASE_URL}/${encodeURIComponent(normalizedName)}`;
  };

  const getAuthHeaders = () => {
    const currentToken = token ?? localStorage.getItem('token');
    return currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setSessionUser(localStorage.getItem('sessionUser'));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      fetchCatalogos(storedToken);
      fetchProducts(storedToken);
    }
  }, []);

  useEffect(() => {
    const currentToken = token ?? localStorage.getItem('token');
    if (view === 'create' && currentToken && catalogos.unidades.length === 0 && catalogos.presentaciones.length === 0 && catalogos.laboratorios.length === 0) {
      fetchCatalogos(currentToken);
    }
  }, [view, token, catalogos.unidades.length, catalogos.presentaciones.length, catalogos.laboratorios.length]);

  const login = async (creds: LoginCreds) => {
    try {
      const payload = {
        usuario: creds.usuario.trim(),
        password: creds.password
      };

      const res = await axios.post<TokenResponse>(`${API_URL}/auth/login`, payload);
      const t = res.data.access_token;
      setToken(t);
      setSessionUser(payload.usuario);
      localStorage.setItem('token', t);
      localStorage.setItem('sessionUser', payload.usuario);
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      fetchCatalogos(t);
      fetchProducts(t);
      alert('Login exitoso');
    } catch (err) {
      alert('Credenciales inválidas');
      console.error(err);
    }
  };

  const register = async (userData: { nombre: string; usuario: string; password: string }) => {
    try {
      const payload = {
        nombreusuario: userData.usuario.trim(),
        clave: userData.password,
        fechacreacion: new Date().toISOString()
      };

      const res = await axios.post<TokenResponse>(`${API_URL}/auth/register`, payload);
      const t = res.data.access_token;
      setToken(t);
      setSessionUser(userData.usuario.trim());
      localStorage.setItem('token', t);
      localStorage.setItem('sessionUser', userData.usuario.trim());
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      fetchCatalogos(t);
      fetchProducts(t);
      alert('Registro exitoso');
    } catch (err) {
      alert('Error en el registro');
      console.error(err);
    }
  };

  const fetchCatalogos = async (currentToken = token) => {
    try {
      const headers = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
      const [unidadesRes, presentacionesRes, laboratoriosRes] = await Promise.all([
        axios.get(`${API_URL}/unidadmedida`, { params: { page: 1, xpage: 100 }, headers }),
        axios.get(`${API_URL}/presentacion`, { params: { page: 1, xpage: 100 }, headers }),
        axios.get(`${API_URL}/laboratorio`, { params: { page: 1, xpage: 100 }, headers })
      ]);
      setCatalogos({
        unidades: normalizeCatalog(unidadesRes.data, ['idunidadmedida', 'id'], ['nombreunidad', 'nombre']),
        presentaciones: normalizeCatalog(presentacionesRes.data, ['idpresentacion', 'id'], ['nombrepresentacion', 'nombre']),
        laboratorios: normalizeCatalog(laboratoriosRes.data, ['idlaboratorio', 'id'], ['nombrelaboratorio', 'nombre'])
      });
    } catch (err) {
      console.error('Error cargando catálogos', err);
    }
  };

  const fetchProducts = async (currentToken = token, query: { search?: string; codbarra?: string } = {}) => {
    setLoading(true);
    try {
      const headers = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
      const res = await axios.get(`${API_URL}/producto`, {
        params: { page: 1, xpage: 100, ...query },
        headers
      });
      setProducts(normalizeList(res.data));
    } catch (err) {
      console.error('Error cargando productos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || view !== 'list') return;

    const timeoutId = window.setTimeout(() => {
      const value = searchTerm.trim();
      fetchProducts(token, value
        ? searchMode === 'codbarra' ? { codbarra: value } : { search: value }
        : {}
      );
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, searchMode, token, view]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'login') {
      await login({ usuario: authForm.usuario, password: authForm.password });
      return;
    }
    await register({ nombre: authForm.nombre, usuario: authForm.usuario, password: authForm.password });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = searchTerm.trim();
    const currentToken = token ?? localStorage.getItem('token');

    if (!currentToken) return;

    if (!value) {
      await fetchProducts(currentToken);
      return;
    }

    await fetchProducts(currentToken, searchMode === 'codbarra'
      ? { codbarra: value }
      : { search: value });
  };

  const handleStartCreate = () => {
    setEditingProduct(null);
    setFormData(createEmptyFormData());
    setImage(null);
    setInternalCode(`NewFarma-${Date.now()}`);
    setView('create');
  };

  const handleEditProduct = (product: Producto) => {
    setEditingProduct(product);

    let formattedVencimiento = '';
    if (product.vencimiento) {
      if (product.vencimiento.includes('/')) {
        const parts = product.vencimiento.split('/');
        if (parts.length === 3) {
          formattedVencimiento = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else if (product.vencimiento.includes('-')) {
        formattedVencimiento = product.vencimiento;
      }
    }

    setFormData({
      nombre: product.nombre || '',
      codbarra: product.codbarra || '',
      vencimiento: formattedVencimiento || createEmptyFormData().vencimiento,
      ubicacion: product.ubicacion || '',
      idunidad: product.unidadmedida?.idunidadmedida ? String(product.unidadmedida.idunidadmedida) : (product.idunidadmedida ? String(product.idunidadmedida) : ''),
      idpresentacion: product.presentacion?.idpresentacion ? String(product.presentacion.idpresentacion) : (product.idpresentacion ? String(product.idpresentacion) : ''),
      idlaboratorio: product.laboratorio?.idlaboratorio ? String(product.laboratorio.idlaboratorio) : (product.idlaboratorio ? String(product.idlaboratorio) : ''),
      composicion: product.composicion || '',
      precioventa: String(product.precioventa ?? 0),
      precioblister: String(product.precioblister ?? 0),
      preciocaja: String(product.preciocaja ?? 0),
      stock: String(product.stock ?? 0)
    });
    setInternalCode(product.codigoproducto || `NewFarma-${Date.now()}`);
    setImage(null);
    setView('create');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    const producto = {
      idproducto: editingProduct ? editingProduct.idproducto : null,
      codigoproducto: editingProduct ? editingProduct.codigoproducto : internalCode,
      nombre: formData.nombre,
      codbarra: formData.codbarra,
      vencimiento: formData.vencimiento,
      ubicacion: formData.ubicacion,
      composicion: formData.composicion,
      precioventa: Number(formData.precioventa),
      precioblister: Number(formData.precioblister),
      preciocaja: Number(formData.preciocaja),
      stock: Number(formData.stock),
      estado: editingProduct?.estado || '1',
      imagen_path: image ? image.name : (editingProduct ? editingProduct.imagen_path : null),
      unidadmedida: formData.idunidad ? { idunidadmedida: Number(formData.idunidad) } : null,
      presentacion: formData.idpresentacion ? { idpresentacion: Number(formData.idpresentacion) } : null,
      laboratorio: formData.idlaboratorio ? { idlaboratorio: Number(formData.idlaboratorio) } : null
    };

    const productoBlob = new Blob([JSON.stringify(producto)], { type: 'application/json' });
    data.append('producto', productoBlob);

    // Se adjunta la imagen si el usuario seleccionó un nuevo archivo (con imagen)
    // Si no hay archivo (sin imagen), no se incluye 'imagen' en FormData
    if (image) {
      data.append('imagen', image);
    }

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API_URL}/producto`, data, {
        headers: { 'Content-Type': 'multipart/form-data', ...headers }
      });
      alert(editingProduct ? 'Producto actualizado con éxito' : 'Producto registrado con éxito');
      setView('list');
      setEditingProduct(null);
      setFormData(createEmptyFormData());
      setImage(null);
      setInternalCode(`NewFarma-${Date.now()}`);
      await Promise.all([
        fetchProducts(token ?? localStorage.getItem('token') ?? undefined),
        fetchCatalogos(token ?? localStorage.getItem('token') ?? undefined)
      ]);
    } catch (err) {
      alert(editingProduct ? 'Error al actualizar producto' : 'Error al registrar producto');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Seguro que desea eliminar este producto?')) {
      try {
        await axios.delete(`${API_URL}/producto/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchProducts();
        alert('Producto eliminado');
      } catch (err) {
        alert('Error al eliminar producto');
        console.error(err);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sessionUser');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setSessionUser(null);
    setProducts([]);
    setCatalogos({ unidades: [], presentaciones: [], laboratorios: [] });
    setView('list');
  };

  if (!token) {
    return (
      <div className="app">
        <header className="header">
          <h1>Mis Productos</h1>
        </header>

        <main className="container auth-page-shell" aria-hidden="true">
          <div className="empty-state">Inicia sesión para consultar tus productos.</div>
        </main>

        <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <form onSubmit={handleAuthSubmit} className="product-form auth-dialog">
            <div className="card form-card">
              <div className="auth-dialog-header">
                <div>
                  <span className="auth-kicker">Acceso seguro</span>
                  <h2 id="auth-title">{authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
                </div>
              </div>
              {authMode === 'register' && (
                <div className="form-group">
                  <label>Nombre</label>
                  <input type="text" name="nombre" className="form-control" placeholder="Tu nombre" value={authForm.nombre} onChange={handleAuthInputChange} required />
                </div>
              )}

              <div className="form-group">
                <label>Usuario</label>
                <input type="text" name="usuario" className="form-control" placeholder="usuario o correo" value={authForm.usuario} onChange={handleAuthInputChange} required />
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <input type="password" name="password" className="form-control" placeholder="••••••••" value={authForm.password} onChange={handleAuthInputChange} required />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Procesando...' : authMode === 'login' ? 'Ingresar' : 'Registrarse'}
                </button>
              </div>

              <div className="form-group" style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthForm({ nombre: '', usuario: '', password: '' });
                  }}
                >
                  {authMode === 'login' ? 'Crear una cuenta' : 'Ya tengo cuenta'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        {view === 'create' && (
          <button className="icon-button" type="button" onClick={() => setView('list')} aria-label="Volver al listado">
            <ChevronLeft size={25} />
          </button>
        )}
        <h1>{view === 'list' ? 'Mis Productos' : 'Crear Producto'}</h1>
        <div className="session-controls">
          <span className="session-user" title={`Usuario: ${sessionUser || 'actual'}`}>
            <UserCircle size={19} />
            <span>{sessionUser || 'Usuario'}</span>
          </span>
          <button className="logout-button" type="button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
        {view === 'create' && (
          <button className="icon-button" type="button" onClick={() => setView('list')} aria-label="Cerrar formulario">
            <X size={22} />
          </button>
        )}
      </header>

      <main className="container">
        {view === 'list' ? (
          <>
            <form className="search-bar" onSubmit={handleSearch}>
              <label htmlFor="product-search">Buscar producto</label>
              <div className="search-controls">
                <select
                  aria-label="Criterio de búsqueda"
                  value={searchMode}
                  onChange={e => setSearchMode(e.target.value as 'nombre' | 'codbarra')}
                >
                  <option value="nombre">Nombre</option>
                  <option value="codbarra">Código de barras</option>
                </select>
                {searchMode === 'codbarra' ? (
                  <div className="barcode-input-wrapper" style={{ flex: 1 }}>
                    <input
                      id="product-search"
                      type="search"
                      className="form-control"
                      placeholder="Ingrese código de barras..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    <button
                      type="button"
                      className="barcode-scan-btn"
                      onClick={() => setShowBarcodeScanner(true)}
                      title="Escanear código de barras con la cámara"
                    >
                      <ScanBarcode size={20} />
                    </button>
                  </div>
                ) : (
                  <input
                    id="product-search"
                    type="search"
                    className="form-control"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ flex: 1 }}
                  />
                )}
                <button type="submit" className="btn search-button">Buscar</button>
              </div>
            </form>
            <div className="product-list">
              {loading ? <p>Cargando...</p> : products.length === 0 ? (
                <p className="empty-state">
                  {searchTerm ? 'No se encontraron productos.' : 'No hay productos registrados.'}
                </p>
              ) : products.map(p => (
                <div key={p.idproducto} className="card product-card">
                  <div className="product-image">
                    {p.imagen_path ? (
                      <img src={getProductImageUrl(p.imagen_path)} alt={p.nombre} />)
                      : <Package size={36} />}
                  </div>
                  <div className="product-details">
                    <h3>{p.nombre}</h3>
                    <p>{p.nombrelaboratorio || p.laboratorio?.nombrelaboratorio || 'Sin laboratorio'}</p>
                    <div className="product-meta">
                      <span className="product-price">S/ {Number(p.precioventa || 0).toFixed(2)}</span>
                      <span className="stock">Stock: {p.stock}</span>
                    </div>
                  </div>
                  <div className="product-actions" style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleEditProduct(p)}
                      title="Editar producto"
                      style={{ color: 'var(--primary)' }}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDelete(p.idproducto)}
                      title="Eliminar producto"
                      style={{ color: '#dc2626' }}
                    >
                      <Trash2 size={18} />
                    </button>
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
                  <div className="barcode-input-wrapper">
                    <input
                      type="text"
                      name="codbarra"
                      className="form-control"
                      placeholder="Escanee o escriba el código"
                      value={formData.codbarra}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      className="barcode-scan-btn"
                      onClick={() => setShowBarcodeScanner(true)}
                      title="Escanear código de barras con la cámara"
                    >
                      <ScanBarcode size={20} />
                    </button>
                  </div>
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
                    <span>
                      {image
                        ? image.name
                        : (editingProduct?.imagen_path
                          ? `Imagen actual: ${editingProduct.imagen_path} (Clic para cambiar)`
                          : 'Subir o tomar foto (opcional)')}
                    </span>
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
                <button type="button" className="btn btn-secondary" onClick={() => { setView('list'); setEditingProduct(null); }}>Cancelar</button>
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Guardando...' : (editingProduct ? 'Actualizar Producto' : 'Crear Producto')}
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
        <button className={`nav-item ${view === 'create' ? 'active' : ''}`} onClick={handleStartCreate}>
          <PlusCircle size={24} />
          <span>Registrar</span>
        </button>
      </nav>

      {showBarcodeScanner && (
        <div className="scanner-modal-backdrop" onClick={() => setShowBarcodeScanner(false)}>
          <div className="scanner-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="scanner-modal-header">
              <h3>
                <ScanBarcode size={20} />
                Escanear Código de Barras
              </h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowBarcodeScanner(false)}
                title="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="scanner-modal-body">
              <div className="scanner-viewport-wrapper">
                <div id="barcode-scanner-viewport"></div>
              </div>
              <p className="scanner-instruction">
                Sitúa el código de barras frente a la cámara o toma una foto del código.
              </p>

              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0, minHeight: '38px', padding: '6px 14px', fontSize: '13px' }}>
                  <Camera size={18} />
                  <span>Tomar foto o subir imagen</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileScan}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {scannerError && (
                <div className="scanner-error">
                  {scannerError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;