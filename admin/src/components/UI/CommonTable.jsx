import React, { useState } from "react";
import { ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function CommonTable({
  columns,
  data = [],
  loading = false,
  searchPlaceholder = "Search...",
  searchKey = "",
  bulkActions = null,
  selectedIds = [],
  onSelectChange = null,
}) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Handle Search
  const filteredData = data.filter((item) => {
    if (!search || !searchKey) return true;
    const val = item[searchKey];
    return val ? String(val).toLowerCase().includes(search.toLowerCase()) : true;
  });

  // Handle Sort
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (aVal === undefined || bVal === undefined) return 0;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }

    return sortOrder === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  // Handle Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = sortedData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleSelectAll = (e) => {
    if (!onSelectChange) return;
    if (e.target.checked) {
      onSelectChange(paginatedData.map((d) => d._id || d.id));
    } else {
      onSelectChange([]);
    }
  };

  const handleSelectOne = (id) => {
    if (!onSelectChange) return;
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectChange([...selectedIds, id]);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-emerald-100/50 shadow-sm overflow-hidden font-sans">
      {/* Table Header Bar with search and bulk actions */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {searchKey && (
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-100 bg-slate-50/50 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:bg-white transition"
            />
          </div>
        )}
        {bulkActions && selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-emerald-50/80 px-4 py-1.5 rounded-full border border-emerald-100 animate-fadeUp">
            <span className="text-xs font-semibold text-emerald-800">
              {selectedIds.length} item(s) selected
            </span>
            <div className="h-4 w-px bg-emerald-200"></div>
            {bulkActions}
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
              {onSelectChange && (
                <th className="py-4 px-6 w-10">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-200 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.field}
                  onClick={() => col.sortable && toggleSort(col.field)}
                  className={`py-4 px-6 ${col.sortable ? "cursor-pointer select-none hover:bg-slate-100 transition" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.headerName}
                    {col.sortable && sortField === col.field && (
                      sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (onSelectChange ? 1 : 0)} className="text-center py-12 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading items...
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectChange ? 1 : 0)} className="text-center py-12 text-slate-400">
                  No records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={row._id || row.id || idx} className="hover:bg-slate-50/50 transition">
                  {onSelectChange && (
                    <td className="py-3.5 px-6">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row._id || row.id)}
                        onChange={() => handleSelectOne(row._id || row.id)}
                        className="rounded border-slate-200 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.field} className="py-3.5 px-6 whitespace-nowrap">
                      {col.renderCell ? col.renderCell(row) : row[col.field]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">
          Showing {paginatedData.length} of {filteredData.length} records
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
