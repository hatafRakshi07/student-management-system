import React, { useState } from 'react'
import { Package, Search, Plus, QrCode, Shield, CheckCircle } from 'lucide-react'

const DEMO_STATS = { total_assets: 347, available_assets: 198, assigned_assets: 132, total_valuation: 4862500 }

const DEMO_ASSETS = [
  { id: 1, asset_code: 'COMP-001', item_name: 'Dell Inspiron Desktop PC', category: 'Computers', location: 'Computer Lab 1', purchase_price: 45000, status: 'Active' },
  { id: 2, asset_code: 'COMP-002', item_name: 'HP EliteBook Laptop', category: 'Computers', location: 'Admin Office', purchase_price: 62000, status: 'Active' },
  { id: 3, asset_code: 'FURN-041', item_name: 'Classroom Bench (6-seater)', category: 'Furniture', location: 'Room 204', purchase_price: 7200, status: 'Active' },
  { id: 4, asset_code: 'PROJ-007', item_name: 'Epson EB-X51 Projector', category: 'AV Equipment', location: 'Seminar Hall', purchase_price: 38500, status: 'Active' },
  { id: 5, asset_code: 'LAB-019', item_name: 'Binocular Microscope', category: 'Lab Equipment', location: 'Science Lab', purchase_price: 24000, status: 'Active' },
  { id: 6, asset_code: 'FURN-018', item_name: 'Steel Almirah', category: 'Furniture', location: 'Staff Room', purchase_price: 9500, status: 'Active' },
  { id: 7, asset_code: 'ELEC-003', item_name: 'Ceiling Fan (48")', category: 'Electrical', location: 'Classroom 301', purchase_price: 3200, status: 'Active' },
  { id: 8, asset_code: 'COMP-015', item_name: 'HP LaserJet Printer', category: 'Computers', location: 'Office', purchase_price: 18500, status: 'Under Repair' },
  { id: 9, asset_code: 'FURN-092', item_name: 'Revolving Chair', category: 'Furniture', location: 'Principal Cabin', purchase_price: 5500, status: 'Active' },
  { id: 10, asset_code: 'LAB-031', item_name: 'Digital Weighing Balance', category: 'Lab Equipment', location: 'Chemistry Lab', purchase_price: 12000, status: 'Active' },
]

export default function AdminInventoryHub() {
  const [stats] = useState(DEMO_STATS)
  const [assets] = useState(DEMO_ASSETS)
  const [search, setSearch] = useState('')


  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Package className="w-7 h-7 text-primary-700" /> Inventory & Asset Management ERP Command Center
        </h1>
        <p className="page-subtitle">Track Equipment, Barcode/QR Tokens, Asset Valuation & Maintenance Logs</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border border-blue-100 dark:border-blue-900/40">
            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats.total_assets}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Cataloged Assets</p>
          </div>
          <div className="card p-4 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-xl font-black text-emerald-600">{stats.available_assets}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Available Assets in Stock</p>
          </div>
          <div className="card p-4 border border-purple-100 dark:border-purple-900/40">
            <p className="text-xl font-black text-purple-600">{stats.assigned_assets}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Assigned to Staff/Labs</p>
          </div>
          <div className="card p-4 border border-amber-100 dark:border-amber-900/40">
            <p className="text-xl font-black text-amber-600">₹{stats.total_valuation.toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Inventory Valuation</p>
          </div>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <div className="table-container max-h-[450px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3">Asset Code</th>
                <th className="p-3">Item Description</th>
                <th className="p-3">Category</th>
                <th className="p-3">Location</th>
                <th className="p-3 text-right">Purchase Price ₹</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {assets.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-mono font-bold text-primary-700">{a.asset_code}</td>
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{a.item_name}</td>
                  <td className="p-3 text-purple-700 dark:text-purple-300 font-semibold">{a.category}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{a.location}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600">₹{a.purchase_price.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-center"><span className="badge badge-green">{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
