// Load Filters on Refresh
// When the page loads, we check if there are $orderby or $filter query params in the URL
// and fetch data from the OData API accordingly.
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const orderby = params.get("$orderby"); // Get current sort field/order
    const filter = params.get("$filter");  // Get current filter expression
    const page = parseInt(params.get("page") || "1", 10)
  fetchPeopleFromODATA(orderby, filter, page);  // Fetch data from OData API
});


// GET IDS
const paginationDiv = document.getElementById("pagination");


/** MODALS */
// Function to show a modal (popup) with dynamic content
function showModal({ title, body, footer }) {
    document.getElementById("modal-title").innerHTML = title || "";
    document.getElementById("modal-body").innerHTML = body || "";
    document.getElementById("modal-footer").innerHTML = footer || "";
    document.getElementById("modal").style.display = "flex"; // Show modal
}

// Close modal when 'X' is clicked
document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
});


// Table Head Columns definition
// Column class stores metadata about table columns (id, caption, width, alignment, etc.)
class Column {
    constructor({ id, caption, size = 100, align = "left", hide = false,
        isSortable = true, isFilterable = true, data_type = "string", render = null }) {
        this.id = id;                  // Field name in data
        this.caption = caption;        // Column header
        this.size = size;              // Width in px
        this.align = align;            // Text alignment
        this.hide = hide;              // Hide column or not
        this.isSortable = isSortable;  // Can sort this column
        this.isFilterable = isFilterable; // Can filter this column
        this.data_type = data_type;    // Type: string, number, etc.
        this.render = render;
    }
}

// DynamicTable class manages table rendering, sorting, filtering, and pagination
class DynamicTable {
    constructor(containerId, columns, data, rowsPerPage = 10) {
        this.container = document.getElementById(containerId); // DOM container
        this.columns = columns;         // Columns metadata
        this.rawData = data;            // Original fetched data
        this.filteredData = [...data];  // Data after filtering/sorting
        this.currentPage = 1;           // Current page number
        this.rowsPerPage = rowsPerPage; // Rows per page
        this.sortColumn = null;         // Current sort field
        this.sortDirection = "asc";     // Sort direction
        this.render();                  // Initial render
    }

    // Render table in container
    render() {
        this.container.innerHTML = "";  // Clear previous table
        const table = document.createElement("table");

        // TABLE HEADER
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        this.columns.forEach(col => {
            if (!col.hide) {
                const th = document.createElement("th");
                th.style.width = col.size + "px";
                th.style.textAlign = col.align;
                th.textContent = col.caption;
                tr.appendChild(th);
            }
        });
        thead.appendChild(tr);
        table.appendChild(thead);

        // TABLE BODY
        const tbody = document.createElement("tbody");

        this.filteredData.forEach(row => {
        const tr2 = document.createElement("tr");
           this.columns.forEach(col => {
                if (!col.hide) {
                    const td = document.createElement("td");
                    td.style.textAlign = col.align;

                    // If column has a custom render function, use it
                    if (typeof col.render === "function") {
                        td.innerHTML = col.render(row);
                    } else {
                        td.textContent = row[col.id] ?? "";
                    }

                    tr2.appendChild(td);
                }
            });

            tbody.appendChild(tr2);
        });

        table.appendChild(tbody);
        this.container.appendChild(table);
    }

    // Apply sorting to filteredData and re-render
    setSort(field, direction) {
        this.sortColumn = field;
        this.sortDirection = direction;

        this.filteredData.sort((a, b) => {
            let v1 = a[field] ?? "";
            let v2 = b[field] ?? "";

            // Convert numeric fields to Number for correct comparison
            if (!isNaN(v1) && !isNaN(v2)) {
                v1 = Number(v1);
                v2 = Number(v2);
            } else {
                v1 = String(v1).toLowerCase();
                v2 = String(v2).toLowerCase();
            }

            if (v1 < v2) return this.sortDirection === "asc" ? -1 : 1;
            if (v1 > v2) return this.sortDirection === "asc" ? 1 : -1;
            return 0;
        });
        
        this.render();
    }

    // Update table data (e.g., after fetch or filtering)
    setData(newData, page=1) {
        this.rawData = newData;
        this.filteredData = [...newData];
        this.currentPage = page; 
        this.render();
    }
}

// Column definitions
const columns = [
    new Column({ id: 'UserName', caption: 'UserName' }),
    new Column({ id: 'FirstName', caption: 'First Name' }),
    new Column({ id: 'LastName', caption: 'Last Name' }),
    new Column({ id: 'MiddleName', caption: 'MiddleName' }),
    new Column({ id: 'Gender', caption: 'Gender' }),
    new Column({ id: 'Age', caption: 'Age' }),
    new Column({ 
        id: "PreferredContact", 
        caption: "Contact Info", 
        render: (row) => {
            // row.Emails is an array
            if (!Array.isArray(row.Emails) || row.Emails.length === 0) {
                return "<p>No emails available</p>";
            }
            return `<div>${row.Emails.map(email => `<p>${email}</p>`).join("")}</div>`;
        }
    }),
];

let ODATATable = null; // Global table instance


/** ----------- SORT ------------ */

// Apply multiple sort fields
// sortFields: [{ field: "LastName", order: "asc" }, ...]
function applySort(sortFields) {
  const orderby = sortFields
    .filter(sf => sf.field) 
    .map(sf => `${sf.field} ${sf.order}`) // Build OData $orderby string
    .join(", ");

  const params = new URLSearchParams(window.location.search);
  if (orderby) params.set("$orderby", orderby);  // If orderby has value → set $orderby=FirstName asc, LastName desc.
  else params.delete("$orderby"); //If not → remove $orderby from URL (reset sorting)

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl); // Update URL without reload

  fetchPeopleFromODATA(orderby); // Fetch sorted data from OData API
}

// Open sort modal on click
document.getElementById("sort").addEventListener("click", () => {
  const sortableCols = columns.filter(c => c.isSortable && !c.hide);
  const optionsHtml = sortableCols.map(
    c => `<option value="${c.id}">${c.caption}</option>`
  ).join("");

  showModal({
    title: "Sort Tickets",
    body: `
      <div id="sortFields" class="filter-body">
        <div class="sortRow" >
            <select class="sortField">${optionsHtml}</select>
            <select class="sortOrder">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
            </select>
        </div>
      </div>
      <button id="addSort">Add More Sort</button>
    `,
    footer: `     
        <button id="resetSort" class="cancel">Reset</button>
        <button id="applySort" class="modal-close-btn">Submit</button>
    `
  });

  // Add more sort rows dynamically
  document.getElementById("addSort").addEventListener("click", () => {
    const div = document.createElement("div");
    div.className = "sortRow";
    div.innerHTML = `
      <select class="sortField">${optionsHtml}</select>
      <select class="sortOrder">
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    `;
    document.getElementById("sortFields").appendChild(div);
  });

  // Submit sort
  document.getElementById("applySort").addEventListener("click", () => {
    const sortFields = [...document.querySelectorAll(".sortRow")].map(row => ({
      field: row.querySelector(".sortField").value,
      order: row.querySelector(".sortOrder").value
    }));

    applySort(sortFields);
    document.getElementById("modal").style.display = "none";
  });

  // Reset sort
  document.getElementById("resetSort").addEventListener("click", () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("$orderby");
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);

    fetchPeopleFromODATA(); // reload default data
    document.getElementById("modal").style.display = "none";
  });
});


/** ----------- FILTER ------------ */

// Apply filters and update URL & table
function applyFilter(filterFields) {
    const params = new URLSearchParams(window.location.search);

    if (filterFields.length) {
        const filterExpr = filterFields.map(f => {
            switch (f.op) {
                case "equals":
                    return `${f.field} eq '${f.value}'`;
                case "contains":
                    return `contains(${f.field}, '${f.value}')`
                case "starts":
                    return `startswith(${f.field}, '${f.value}')`;
                case "ends":
                    return `endswith(${f.field}, '${f.value}')`;
                default:
                    return "";
            }
        })
        .filter(Boolean) // Remove unsupported operations
        .join(" and ");
        
        params.set("$filter", filterExpr);
    } else {
        params.delete("$filter");
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);  // Update the URL
    const orderby = params.get("$orderby"); // Keep previous sorting
    fetchPeopleFromODATA(orderby, params.get("$filter")); // Fetch filtered data
}


// Fetch data from OData API
let lastController = null;
async function fetchPeopleFromODATA(orderby = null, filter = null, page = 1, pageSize = 5) {
    if (lastController) lastController.abort();
    const controller = new AbortController();
    lastController = controller;

    try {
        const baseURL = "https://services.odata.org/v4/TripPinServiceRW/People";
        const params = [];

        if (orderby) params.push(`$orderby=${encodeURIComponent(orderby)}`);
        if (filter) params.push(`$filter=${encodeURIComponent(filter)}`);
        params.push(`$count=true`);
        params.push(`$top=${pageSize}`);
        params.push(`$skip=${(page - 1) * pageSize}`);

        const url = `${baseURL}?${params.join("&")}`;
        console.log("Fetching:", url);

        const response = await fetch(url, { signal: controller.signal, headers: { "Accept": "application/json" } });
        if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
        
        const json = await response.json();
        const items = Array.isArray(json.value) ? json.value : [];

        if (!ODATATable) {
            ODATATable = new DynamicTable("tableContainer", columns, items, pageSize);
        } else {
            ODATATable.setData(items, page);
        }

        // ✅ Always update current page here
        ODATATable.currentPage = page;

        const totalCount = typeof json["@odata.count"] === "number" ? json["@odata.count"] : items.length;
        renderPagination(totalCount, pageSize, page, orderby, filter);

        console.log("Total Count:", totalCount, "Page:", page, "PageSize:", pageSize, "Total Pages:", Math.ceil(totalCount / pageSize));
    } catch (err) {
        if (err.name === "AbortError") {
            console.log("Fetch aborted");
            return;
        }
        console.error("Error fetching OData:", err);
    } finally {
        lastController = null;
    }
}


function renderPagination(totalCount, pageSize, currentPage, orderby, filter) {
    paginationDiv.innerHTML = "";
    const totalPages = Math.ceil(20 / pageSize);
    // PREVIOUS BUTTON
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Previous";
    prevBtn.classList.add("pagination-btn",  "prev-btn");
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        const params = new URLSearchParams(window.location.search);
        params.set("page", currentPage - 1);  // Go 1 page back
        if (orderby) params.set("$orderby", orderby);
        if (filter) params.set("$filter", filter);
        window.history.pushState({}, "", `?${params.toString()}`);
        fetchPeopleFromODATA(orderby, filter, currentPage - 1, pageSize);
    };
    paginationDiv.appendChild(prevBtn);

    // PAGE NUMBERS
    for (let i = 1; i <= totalPages; i++){
        const pageBtn = document.createElement("button");
        pageBtn.textContent = i;
        pageBtn.classList.add("pagination-btn", "page-no");

        if (i === currentPage) {
            pageBtn.classList.add("active-page");
            pageBtn.disabled = true;
        }

        pageBtn.onclick = () => {
            const params = new URLSearchParams(window.location.search);
            params.set("page", i);
            if (orderby) params.set("$orderby", orderby);
            if (filter) params.set("$filter", filter);

            window.history.pushState({}, "", `?${params.toString()}`);
            fetchPeopleFromODATA(orderby, filter, i, pageSize);
        }
        paginationDiv.appendChild(pageBtn)
    }

    // NEXT BUTTON
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next";
    nextBtn.classList.add("pagination-btn", "next-btn");
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        const params = new URLSearchParams(window.location.search);
        params.set("page", currentPage + 1);
        if (orderby) params.set("$orderby", orderby);
        if (filter) params.set("$filter", filter);
        window.history.pushState({}, "", `?${params.toString()}`);
        fetchPeopleFromODATA(orderby, filter, currentPage + 1, pageSize);
    }
    paginationDiv.appendChild(nextBtn);
}