// ============================================================
// ERP PO System - Main Application Script
// ============================================================

// This checks if you are running locally or on the live server
const API_URL = "/api"


// --- Authentication ---

function getToken() {
    return localStorage.getItem("token");
}

function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
    };
}

// Redirect to login if not authenticated
(function requireAuth() {
    if (!getToken() && !window.location.href.includes("login.html")) {
        window.location.href = "login.html";
    }
})();

function logout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

// --- Product Data ---
let products = [];

// --- Load Vendors ---
async function loadVendors() {
    const vendorSelect = document.getElementById("vendor");
    if (!vendorSelect) return;
    try {
        const response = await fetch(`${API_URL}/vendors/`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) return;
        const vendors = await response.json();
        vendors.forEach(v => {
            const opt = document.createElement("option");
            opt.value = v.id;
            opt.text = v.name;
            vendorSelect.appendChild(opt);
        });
    } catch (err) {
        console.error("Error loading vendors:", err);
    }
}

// --- Load Products ---
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products/`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) return;
        products = await response.json();
        populateProductDropdowns();
    } catch (err) {
        console.error("Error loading products:", err);
    }
}

function populateProductDropdowns() {
    document.querySelectorAll(".product-select").forEach(select => {
        const cur = select.value;
        select.innerHTML = '<option value="">-- Select Product --</option>';
        products.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name + " (₹" + p.unit_price + ")";
            select.appendChild(opt);
        });
        if (cur) select.value = cur;
    });
}

// --- Price & Total ---
function updatePrice(select) {
    const pid = parseInt(select.value);
    const product = products.find(p => p.id === pid);
    const row = select.closest("tr");
    const priceInput = row.querySelector(".price");
    priceInput.value = product ? product.unit_price.toFixed(2) : "";
    calculateTotal();
}

function calculateTotal() {
    let subtotal = 0;
    document.querySelectorAll("#items tr").forEach(row => {
        const qty = parseFloat(row.querySelector(".quantity").value) || 0;
        const price = parseFloat(row.querySelector(".price").value) || 0;
        subtotal += qty * price;
    });
    const tax = subtotal * 0.05;
    const total = subtotal + tax;
    const s = document.getElementById("subtotal");
    if (s) s.textContent = subtotal.toFixed(2);
    const t = document.getElementById("taxAmount");
    if (t) t.textContent = tax.toFixed(2);
    const tot = document.getElementById("total");
    if (tot) tot.textContent = total.toFixed(2);
}

// --- Row Management ---
function addRow() {
    const table = document.getElementById("items");
    if (!table) return;
    const alert = document.getElementById("noProductsAlert");
    if (alert) alert.classList.add("d-none");
    const row = document.createElement("tr");
    row.classList.add("product-row");
    row.innerHTML = '<td><select class="form-control product-select" onchange="updatePrice(this)"><option value="">-- Select Product --</option></select></td><td><input type="number" class="form-control quantity" min="1" value="1" oninput="calculateTotal()" placeholder="Qty"></td><td><input type="number" class="form-control price" readonly placeholder="Auto-filled"></td><td><button type="button" class="btn btn-danger btn-sm" onclick="deleteRow(this)">Delete</button></td>';
    table.appendChild(row);
    populateProductDropdowns();
    calculateTotal();
}

function deleteRow(btn) {
    btn.closest("tr").remove();
    calculateTotal();
    const rows = document.querySelectorAll("#items tr");
    if (rows.length === 0) {
        const a = document.getElementById("noProductsAlert");
        if (a) a.classList.remove("d-none");
    }
}

// --- Create PO ---
async function createPO(e) {
    e.preventDefault();
    const vendor = document.getElementById("vendor");
    const btn = document.getElementById("createBtn");
    const btnText = document.getElementById("createBtnText");
    const spinner = document.getElementById("createSpinner");

    vendor.classList.remove("is-invalid");

    if (!vendor.value) { vendor.classList.add("is-invalid"); vendor.focus(); return; }

    const rows = document.querySelectorAll("#items tr");
    if (rows.length === 0) { alert("Please add at least one product."); return; }

    const items = [];
    let invalid = false;
    rows.forEach(row => {
        const ps = row.querySelector(".product-select");
        const qty = parseInt(row.querySelector(".quantity").value) || 0;
        const price = parseFloat(row.querySelector(".price").value) || 0;
        if (!ps.value || qty <= 0) { invalid = true; }
        items.push({ product_id: parseInt(ps.value), quantity: qty, price: price });
    });
    if (invalid) { alert("Please select a product and valid quantity for all rows."); return; }

    btn.disabled = true;
    btnText.textContent = "Creating...";
    spinner.classList.remove("d-none");

    try {
        const response = await fetch(`${API_URL}/purchase-orders/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                vendor_id: parseInt(vendor.value),
                items: items
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to create PO");
        }
        alert("Purchase Order Created Successfully!");
        window.location.href = "index.html";
    } catch (error) {
        alert("Error: " + error.message);
        btn.disabled = false;
        btnText.textContent = "Create Purchase Order";
        spinner.classList.add("d-none");
    }
}

// --- Dashboard ---
async function loadDashboard() {
    const table = document.getElementById("poTable");
    if (!table) return;
    const loading = document.getElementById("loadingState");
    const empty = document.getElementById("emptyState");
    const container = document.getElementById("tableContainer");

    try {
        const response = await fetch(`${API_URL}/purchase-orders/`, {
            headers: getAuthHeaders()
        });
        if (response.status === 401) { logout(); return; }
        if (!response.ok) throw new Error("Failed to load POs");

        const data = await response.json();
        if (loading) loading.classList.add("d-none");

        if (data.length === 0) {
            if (empty) empty.classList.remove("d-none");
            if (container) container.classList.add("d-none");
            return;
        }

        if (empty) empty.classList.add("d-none");
        if (container) container.classList.remove("d-none");
        table.innerHTML = "";

        data.forEach(po => {
            const sc = getStatusClass(po.status);
            const row = document.createElement("tr");
            row.innerHTML = '<td><strong>#' + po.id + '</strong></td><td>' + esc(po.reference_no) + '</td><td>' + esc(po.vendor) + '</td><td class="fw-semibold">₹' + parseFloat(po.total_amount).toFixed(2) + '</td><td><select class="form-select form-select-sm status-select ' + sc + '" onchange="updateStatus(' + po.id + ', this.value, this)"><option value="Pending"' + (po.status === "Pending" ? " selected" : "") + '>Pending</option><option value="Approved"' + (po.status === "Approved" ? " selected" : "") + '>Approved</option><option value="Rejected"' + (po.status === "Rejected" ? " selected" : "") + '>Rejected</option></select></td><td><button class="btn btn-danger btn-sm w-100" onclick="deletePO(' + po.id + ')">Delete</button></td>';
            table.appendChild(row);
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        if (loading) loading.classList.add("d-none");
        if (container) container.classList.remove("d-none");
        table.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Failed to load purchase orders.</td></tr>';
    }
}

function getStatusClass(s) {
    if (s === "Approved") return "status-approved";
    if (s === "Rejected") return "status-rejected";
    return "status-pending";
}

function esc(text) {
    const d = document.createElement("div");
    d.appendChild(document.createTextNode(text || ""));
    return d.innerHTML;
}

// --- Delete PO ---
async function deletePO(id) {
    if (!confirm("Are you sure you want to delete this PO?")) return;
    
    try {
        const response = await fetch(`${API_URL}/purchase-orders/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 404) throw new Error("Purchase Order not found");
            throw new Error("Failed to delete PO");
        }
        
        alert("Purchase Order Deleted Successfully");
        loadDashboard();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// --- Status Update ---
async function updateStatus(id, status, el) {
    try {
        const response = await fetch(`${API_URL}/purchase-orders/${id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: status })
        });
        if (!response.ok) throw new Error("Failed");
        el.className = "form-select form-select-sm status-select " + getStatusClass(status);
    } catch (err) {
        alert("Error updating status");
        loadDashboard();
    }
}

// --- AI Description ---
async function generateDescription() {
    const ps = document.querySelector(".product-select");
    const desc = document.getElementById("description");
    const btn = document.getElementById("aiDescBtn");
    if (!ps || !ps.value) { alert("Select a product first."); return; }
    const name = ps.options[ps.selectedIndex].text;
    btn.disabled = true;
    btn.textContent = "Generating...";
    try {
        const response = await fetch(`${API_URL}/generate-description`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ name: name })
        });
        const data = await response.json();
        desc.value = data.description;
    } catch (err) {
        alert("Error generating description.");
    } finally {
        btn.disabled = false;
        btn.textContent = "✨ AI Description";
    }
}

// --- Init ---
(function init() {
    if (document.getElementById("poTable")) { loadDashboard(); }
    if (document.getElementById("poForm")) {
        loadVendors();
        loadProducts();
        document.getElementById("poForm").addEventListener("submit", createPO);
    }
})();
