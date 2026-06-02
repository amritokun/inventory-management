import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Package, Plus, Trash2, Edit2, Upload, ScanLine, Download } from 'lucide-react';
import Barcode from 'react-barcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function App() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', quantity: 0, price: 0, description: ''
  });
  const [imageFile, setImageFile] = useState(null);
  
  const [printItem, setPrintItem] = useState(null);
  const printRef = useRef();

  // Scanner State
  const [scannerMode, setScannerMode] = useState('view'); // view, add, remove
  const scanBufferRef = useRef('');
  const scanTimeoutRef = useRef(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'Enter') {
        if (scanBufferRef.current.length > 0) {
          const barcodeStr = scanBufferRef.current;
          const item = itemsRef.current.find(i => i.sku === barcodeStr || i.barcode === barcodeStr);
          if (item) {
            if (scannerMode === 'add') {
              handleUpdateStock(item.id, 1);
            } else if (scannerMode === 'remove') {
              handleUpdateStock(item.id, -1);
            }
          } else {
            console.warn(`No item found for scanned barcode: ${barcodeStr}`);
          }
          scanBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        scanBufferRef.current += e.key;
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = setTimeout(() => {
          scanBufferRef.current = '';
        }, 150);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannerMode]);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    let html5QrcodeScanner;
    if (showScanner) {
      const timer = setTimeout(() => {
        const readerElement = document.getElementById("reader");
        if (readerElement) {
          html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: {width: 250, height: 100} },
            /* verbose= */ false
          );
          html5QrcodeScanner.render((decodedText) => {
            setFormData(prev => ({ ...prev, barcode: decodedText }));
            setShowScanner(false);
          }, (error) => {
            // Handle scan errors quietly
          });
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        if (html5QrcodeScanner) {
          html5QrcodeScanner.clear().catch(error => console.error("Failed to clear scanner", error));
        }
      };
    }
    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [showScanner]);

  const fetchItems = async () => {
    try {
      const res = await axios.get('/api/items');
      setItems(res.data.items);
    } catch (err) {
      console.error('Error fetching items', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });
    if (imageFile) {
      data.append('image', imageFile);
    }

    try {
      if (editingItem) {
        await axios.put(`/api/items/${editingItem.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post('/api/items', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setShowForm(false);
      setEditingItem(null);
      setImageFile(null);
      setFormData({ name: '', sku: '', barcode: '', quantity: 0, price: 0, description: '' });
      fetchItems();
    } catch (err) {
      console.error('Error saving item', err);
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      alert(`Error saving item: ${errorMsg}`);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name, sku: item.sku || '', barcode: item.barcode || '', 
      quantity: item.quantity, price: item.price, description: item.description || ''
    });
    setImageFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`/api/items/${id}`);
        fetchItems();
      } catch (err) {
        console.error('Error deleting item', err);
      }
    }
  };

  const handleUpdateStock = async (id, change) => {
    let updatedQuantity;
    
    setItems(prevItems => {
      const newItems = (prevItems || []).map(item => {
        if (item.id === id) {
          updatedQuantity = Math.max(0, Number(item.quantity) + change);
          return { ...item, quantity: updatedQuantity };
        }
        return item;
      });
      return newItems;
    });

    if (updatedQuantity !== undefined) {
      try {
        await axios.patch(`/api/items/${id}/stock`, { quantity: updatedQuantity });
      } catch (err) {
        console.error('Error updating stock', err);
        fetchItems(); 
        alert('Error updating stock');
      }
    }
  };

  const downloadPDF = async (item) => {
    // Set the item to print and wait for render
    setPrintItem(item);
    
    // Use a temporary delay to ensure the hidden component renders with the new item
    setTimeout(async () => {
      if (!printRef.current) return;
      
      try {
        // Create canvas from the print element
        const canvas = await html2canvas(printRef.current, {
          scale: 3, // Higher scale for better quality
          backgroundColor: '#ffffff',
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // 50mm x 25mm in points (1mm = 2.83465 points)
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [50, 25]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, 50, 25);
        pdf.save(`${item.sku || 'barcode'}.pdf`);
      } catch (err) {
        console.error('PDF generation failed', err);
        alert('Failed to generate PDF');
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Package className="w-8 h-8 text-blue-600" />
            Inventory Manager
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-1 flex">
              <button 
                onClick={() => setScannerMode('view')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium ${scannerMode === 'view' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >View Mode</button>
              <button 
                onClick={() => setScannerMode('add')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium ${scannerMode === 'add' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >Stock Up (+1)</button>
              <button 
                onClick={() => setScannerMode('remove')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium ${scannerMode === 'remove' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >Sale (-1)</button>
            </div>
            <button 
              onClick={() => {
                setEditingItem(null);
                setFormData({ name: '', sku: '', barcode: '', quantity: 0, price: 0, description: '' });
                setImageFile(null);
                setShowForm(!showForm);
                setShowScanner(false);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : <><Plus className="w-5 h-5" /> Add Item</>}
            </button>
          </div>
        </header>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode Value</label>
                <div className="flex gap-2">
                  <input type="text" name="barcode" value={formData.barcode} onChange={handleInputChange} className="w-full border rounded p-2" />
                  <button type="button" onClick={() => setShowScanner(!showScanner)} className="bg-gray-200 p-2 rounded hover:bg-gray-300">
                    <ScanLine className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input required type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full border rounded p-2" />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                  <input required type="number" step="0.01" name="price" value={formData.price} onChange={handleInputChange} className="w-full border rounded p-2" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded p-2" rows="3"></textarea>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-gray-100 border border-gray-300 px-4 py-2 rounded hover:bg-gray-200">
                    <Upload className="w-5 h-5" />
                    <span>Choose File</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  <span className="text-sm text-gray-500">{imageFile ? imageFile.name : 'No file chosen'}</span>
                </div>
              </div>
              
              {showScanner && (
                <div className="md:col-span-2 mt-4">
                  <div id="reader" className="w-full max-sm mx-auto"></div>
                </div>
              )}

              <div className="md:col-span-2 flex justify-end mt-4">
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium">
                  {editingItem ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(items || []).map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(item.barcode || item.sku) ? (
                      <div className="flex flex-col gap-1">
                        <div className="scale-75 origin-left">
                          <Barcode value={item.barcode || item.sku} format="CODE39" height={40} fontSize={14} width={1.5} />
                        </div>
                        <div className="text-[24px] leading-none" style={{ fontFamily: "'Libre Barcode 39', system-ui" }}>
                          *{item.barcode || item.sku}*
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No Data</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleUpdateStock(item.id, -1)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-6 h-6 rounded flex items-center justify-center font-bold" disabled={item.quantity <= 0}>-</button>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.quantity > 10 ? 'bg-green-100 text-green-800' : item.quantity > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {item.quantity} in stock
                      </span>
                      <button onClick={() => handleUpdateStock(item.id, 1)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-6 h-6 rounded flex items-center justify-center font-bold">+</button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    ₹{Number(item.price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {(item.barcode || item.sku) && (
                        <button onClick={() => downloadPDF(item)} className="text-green-600 hover:text-green-900 p-1" title="Download PDF Barcode">
                          <Download className="w-5 h-5" />
                        </button>
                      )}
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900 p-1">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 p-1">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No items in inventory. Add one to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Component for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
        <div ref={printRef} style={{ 
          width: '50mm', 
          height: '25mm', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'white' 
        }}>
          {printItem && (printItem.barcode || printItem.sku) ? (
            <div className="flex flex-col items-center">
              <Barcode 
                value={printItem.barcode || printItem.sku} 
                format="CODE39"
                height={40} 
                fontSize={10} 
                width={1.2} 
                margin={0} 
                displayValue={true} 
                textMargin={2}
              />
              <div className="text-[20px] leading-none mt-1" style={{ fontFamily: "'Libre Barcode 39', system-ui" }}>
                *{printItem.barcode || printItem.sku}*
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;