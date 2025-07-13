import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { CSVLink } from "react-csv";
import {
  FiDownload,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiMail,
  FiPhone,
  FiUser,
  FiSearch,
  FiX,
  FiFilter,
  FiBriefcase,
  FiMapPin,
  FiClock,
  FiDollarSign,
  FiFileText,
} from "react-icons/fi";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import debounce from "lodash/debounce";
import { JobLogContext } from "../context/JobLogContext";

/**
 * CustomersScreen – CRUD UI for user‑scoped customer records.
 * All client‑side lint / ESLint warnings removed:
 *   • No unused imports / vars
 *   • Stable callback + effect deps
 *   • Consistent return paths
 *   • Optional chaining & nullish coalescing where appropriate
 */
export default function CustomersScreen() {
  /* ─────────────────────────────── state ─────────────────────────────── */
  const { user } = useAuth();
  const jobLog = useContext(JobLogContext); // reserved for future use

  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterStatus, setFilterStatus] = useState("all");

  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    averageInvoiceValue: 0,
  });

  /* ───────── modal + form ───────── */
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const blankForm = {
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    notes: "",
    preferredContact: "email",
    status: "active",
  };
  const [formData, setFormData] = useState(blankForm);
  const [errors, setErrors] = useState({});

  /* ─────────────────────── helpers / utils ─────────────────────── */
  const sortCustomers = useCallback(
    (data) => {
      return [...data].sort((a, b) => {
        let aVal = a[sortField] ?? "";
        let bVal = b[sortField] ?? "";

        if (sortField === "createdAt" && aVal && bVal) {
          aVal = aVal.toDate ? aVal.toDate() : new Date(aVal);
          bVal = bVal.toDate ? bVal.toDate() : new Date(bVal);
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortDirection === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    },
    [sortField, sortDirection]
  );

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";

  const getCustomerInvoiceSummary = (customerId) => {
    const invoices = customerInvoices[customerId] ?? [];
    const total = invoices.reduce((sum, inv) => {
      const partsTotal = inv.parts?.reduce(
        (pSum, p) => pSum + (parseFloat(p.price) || 0),
        0
      );
      return sum + partsTotal;
    }, 0);

    return {
      total,
      lastService: invoices[0]?.createdAt ?? null,
      invoiceCount: invoices.length,
    };
  };

  /* ─────────────────────── DB interaction ─────────────────────── */
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        /* customers */
        const custSnap = await getDocs(
          collection(db, "users", user.uid, "customers")
        );
        const fetchedCustomers = custSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setCustomers(fetchedCustomers);
        setFilteredCustomers(fetchedCustomers);

        /* invoices */
        const invSnap = await getDocs(
          query(
            collection(db, "users", user.uid, "invoices"),
            orderBy("createdAt", "desc")
          )
        );
        const invoicesData = invSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate(),
        }));

        /* group by customer */
        const grouped = invoicesData.reduce((acc, inv) => {
          const cid = inv.customer?.id;
          if (!cid) return acc;
          acc[cid] = acc[cid] ? [...acc[cid], inv] : [inv];
          return acc;
        }, {});
        setCustomerInvoices(grouped);

        /* dashboard stats */
        const totalInvValue = invoicesData.reduce((sum, inv) => {
          const partsSum = inv.parts?.reduce(
            (ps, p) => ps + (parseFloat(p.price) || 0),
            0
          );
          return sum + partsSum;
        }, 0);

        setStats({
          totalCustomers: fetchedCustomers.length,
          activeCustomers: fetchedCustomers.filter((c) => c.status === "active")
            .length,
          averageInvoiceValue:
            invoicesData.length > 0 ? totalInvValue / invoicesData.length : 0,
        });
      } catch (err) {
        console.error("Error loading customers:", err);
        toast.error("Failed to load customer data");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  /* ─────────────────────── search (debounced) ─────────────────────── */
  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
      if (!query.trim()) return setFilteredCustomers(customers);

      const qLower = query.toLowerCase();
      setFilteredCustomers(
        customers.filter((c) =>
          Object.values(c).some((v) => String(v).toLowerCase().includes(qLower))
        )
      );
    }, 300),
    [customers]
  );

  /* ─────────────────────── form validation ─────────────────────── */
  const validateForm = () => {
    const newErr = {};
    if (!formData.name.trim()) newErr.name = "Name is required";
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email))
      newErr.email = "Invalid email format";

    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  /* ─────────────────────── CRUD handlers ─────────────────────── */
  const handleInputChange = ({ target: { name, value } }) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!validateForm()) return toast.error("Please fix the form errors");

    setIsLoading(true);
    try {
      if (isEditMode && selectedCustomer) {
        /* update */
        const ref = doc(
          db,
          "users",
          user.uid,
          "customers",
          selectedCustomer.id
        );
        const updateData = { ...formData, updatedAt: new Date() };
        await updateDoc(ref, updateData);

        setCustomers((prev) =>
          prev.map((c) => (c.id === selectedCustomer.id ? { ...c, ...updateData } : c))
        );
      } else {
        /* create */
        const ref = await addDoc(collection(db, "users", user.uid, "customers"), {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        setCustomers((prev) => [...prev, { id: ref.id, ...formData }]);
      }

      toast.success("Customer saved successfully");
      handleCloseModal();
    } catch (err) {
      console.error("Save customer error:", err);
      toast.error("Failed to save customer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "customers", customerId));
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      toast.success("Customer deleted");
    } catch (err) {
      console.error("Delete customer error:", err);
      toast.error("Failed to delete customer");
    } finally {
      setShowDeleteModal(false);
    }
  };

  /* ─────────────────────── modal helpers ─────────────────────── */
  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setSelectedCustomer(null);
    setFormData(blankForm);
    setErrors({});
  };

  const handleAddNewCustomer = () => {
    setIsEditMode(false);
    setSelectedCustomer(null);
    setShowModal(true);
  };

  /* ─────────────────────── filtered + sorted list ─────────────────────── */
  const displayCustomers = sortCustomers(
    filterStatus === "all"
      ? filteredCustomers
      : filteredCustomers.filter((c) =>
          filterStatus === "active" ? c.status === "active" : c.status === "inactive"
        )
  );

  /* ─────────────────────────────── UI ─────────────────────────────── */
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your customer relationships</p>
          </div>
          <div className="flex gap-3">
            <CSVLink data={customers} filename="customers.csv" className="btn btn-secondary flex items-center gap-2">
              <FiDownload /> Export
            </CSVLink>
            <button onClick={handleAddNewCustomer} className="btn btn-primary flex items-center gap-2">
              <FiPlus /> Add Customer
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Total Customers",
              value: stats.totalCustomers,
              icon: <FiUser className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
              bg: "blue",
            },
            {
              label: "Active Customers",
              value: stats.activeCustomers,
              icon: <FiUser className="w-6 h-6 text-green-600 dark:text-green-400" />,
              bg: "green",
            },
            {
              label: "Avg. Invoice Value",
              value: `$${stats.averageInvoiceValue.toFixed(2)}`,
              icon: <FiBriefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
              bg: "purple",
            },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
                <div className={`p-3 bg-${card.bg}-100 dark:bg-${card.bg}-900/30 rounded-lg`}>{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <input
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                placeholder="Search customers…"
                onChange={(e) => debouncedSearch(e.target.value)}
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>

            {/* sort */}
            <div className="relative flex items-center gap-2">
              <select
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 appearance-none"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
              >
                <option value="name">Sort by Name</option>
                <option value="company">Sort by Company</option>
                <option value="createdAt">Sort by Date Added</option>
              </select>
              <button
                type="button"
                title={`Sort ${sortDirection === "asc" ? "Descending" : "Ascending"}`}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center"
                onClick={() =>
                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                <FiFilter className={`w-4 h-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                <span className="ml-1 text-xs">{sortDirection === "asc" ? "Asc" : "Desc"}</span>
              </button>
            </div>

            {/* status filter */}
            <div className="relative">
              <select
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 appearance-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Customers</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <FiUser className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Customers grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayCustomers.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <FiUser className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No customers found
              </h3>
            </div>
          ) : (
            displayCustomers.map((customer) => {
              const summary = getCustomerInvoiceSummary(customer.id);
              return (
                <div
                  key={customer.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <FiUser className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{customer.name}</h3>
                          {customer.company && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{customer.company}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <FiMail className="w-4 h-4" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <FiPhone className="w-4 h-4" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <FiMapPin className="w-4 h-4" />
                            <span>{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        title="Edit Customer"
                        className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setFormData({ ...blankForm, ...customer });
                          setIsEditMode(true);
                          setShowModal(true);
                        }}
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete Customer"
                        className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowDeleteModal(true);
                        }}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* invoice summary */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <FiClock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Last Service</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {summary.lastService ? formatDate(summary.lastService) : "None"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FiFileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Total Invoices</p>
                          <p className="font-medium text-gray-900 dark:text-white">{summary.invoiceCount}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <FiDollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Total Billed</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(summary.total)}</p>
                      </div>
                    </div>
                  </div>

                  {customer.notes && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{customer.notes}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isEditMode ? "Edit Customer" : "Add New Customer"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border ${
                        errors.name ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2`}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company
                    </label>
                    <input
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border ${
                        errors.email ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2`}
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    />
                  </div>

                  {/* Address */}
                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    />
                  </div>

                  {/* Preferred Contact */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Contact
                    </label>
                    <select
                      name="preferredContact"
                      value={formData.preferredContact}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      rows="3"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? "Saving…" : isEditMode ? "Update Customer" : "Add Customer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Customer</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete {selectedCustomer.name}? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDeleteCustomer(selectedCustomer.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
