import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Package, Plus, Trash2, Edit2, Upload, ScanLine, Printer } from 'lucide-react';
import Barcode from 'react-barcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useReactToPrint } from 'react-to-print';

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

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    let html5QrcodeScanner;
    if (showScanner) {
      html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: {width: 250, height: 100} },
        /* verbose= */ false
      );
      html5QrcodeScanner.render((decodedText) => {
        setFormData(prev => ({ ...prev, barcode: decodedText }));
        setShowScanner(false);
        html5QrcodeScanner.clear();
      }, (error) => {
        // Handle scan errors quietly
      });
    }
    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [showScanner]);

  const fetchItems = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/items');
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
        await axios.put(`http://localhost:3001/api/items/${editingItem.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post('http://localhost:3001/api/items', data, {
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
      alert('Error saving item');
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
        await axios.delete(`http://localhost:3001/api/items/${id}`);
        fetchItems();
      } catch (err) {
        console.error('Error deleting item', err);
      }
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: `
      @page {
        size: 50mm 25mm;
        margin: 0;
      }
      @media print {
        body { margin: 0; }
        .print-container {
          width: 50mm;
          height: 25mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          page-break-after: always;
        }
      }
    `
  });

  const triggerPrint = (item) => {
    setPrintItem(item);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Package className="w-8 h-8 text-blue-600" />
            Inventory Manager
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
                  <div id="reader" className="w-full max-w-sm mx-auto"></div>
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
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {item.image_url ? (
                        <img src={`http://localhost:3001${item.image_url}`} alt={item.name} className="w-12 h-12 object-cover rounded" />
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
                    {item.barcode ? (
                      <div className="scale-75 origin-left">
                        <Barcode value={item.barcode} height={40} fontSize={14} width={1.5} />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No barcode</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.quantity > 10 ? 'bg-green-100 text-green-800' : item.quantity > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {item.quantity} in stock
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    ₹{Number(item.price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {item.barcode && (
                        <button onClick={() => triggerPrint(item)} className="text-gray-600 hover:text-gray-900 p-1" title="Print Barcode">
                          <Printer className="w-5 h-5" />
                        </button>
                      )}
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900 p-1">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 p-1">
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

      {/* Hidden Printable Component */}
      <div style={{ display: 'none' }}>
        {printItem && printItem.barcode && (
          <div ref={printRef} className="print-container bg-white flex flex-col items-center justify-center h-full w-full box-border" style={{ width: '50mm', height: '25mm' }}>
            <div className="text-[10px] font-bold truncate w-full text-center px-1 pt-1 mb-[-5px]">
              {printItem.name}
            </div>
            <div className="scale-[0.6] origin-top">
              <Barcode value={printItem.barcode} height={30} fontSize={16} width={1.5} margin={0} />
            </div>
            <div className="text-[10px] font-bold text-center mt-[-5px] pb-1">
              ₹{Number(printItem.price).toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;