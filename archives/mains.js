import { refreshDOM } from "./utils.js";
refreshDOM();

// Active nav link
document.querySelectorAll('.nav-link').forEach(link => {
  if (link.href === window.location.href) {
    link.classList.add('active');
  }
});


// Load Filters on Refresh
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const orderby = params.get("$orderby"); 
    const filter = params.get("$filter");  
    const page = parseInt(params.get("page") || "1", 7)
    fetchPeopleFromODATA(orderby, filter, page);  
});



/** MODALS */
function showModal({ title, body, footer }) {
    document.getElementById("modal-title").innerHTML = title || "";
    document.getElementById("modal-body").innerHTML = body || "";
    document.getElementById("modal-footer").innerHTML = footer || "";
    document.getElementById("modal").style.display = "flex";
}

// Close modal
document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
});


// Table Head Columns
class Column {
    constructor({ id, caption, size = 100, align = "left", hide = false,
        isSortable = true, isFilterable = true, data_type = "string", render = null }) {
        this.id = id;                 
        this.caption = caption;       
        this.size = size;            
        this.align = align;          
        this.hide = hide;             
        this.isSortable = isSortable; 
        this.isFilterable = isFilterable;
        this.data_type = data_type;  
        this.render = render;
    }
}

// DynamicTable class
class DynamicTable {
    constructor(containerId, columns, data, rowsPerPage = 10) {
        this.container = document.getElementById(containerId);
        this.columns = columns;         
        this.rawData = data;           
        this.filteredData = [...data];
        this.currentPage = 1;          
        this.rowsPerPage = rowsPerPage; 
        this.sortColumn = null;        
        this.sortDirection = "asc";     
        this.render();                 
    }

    render() {
        this.container.innerHTML = "";  
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

    setSort(field, direction) {
        this.sortColumn = field;
        this.sortDirection = direction;

        this.filteredData.sort((a, b) => {
            let v1 = a[field] ?? "";
            let v2 = b[field] ?? "";

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

    setData(newData, page=1) {
        this.rawData = newData;
        this.filteredData = [...newData];
        this.currentPage = page; 
        this.render();
    }
}


let ODATATable = null; 

// Column definitions
const columns = [
    new Column({ id: 'UserName', caption: 'UserName' }),
    new Column({ id: 'FirstName', caption: 'First Name' }),
    new Column({ id: 'LastName', caption: 'Last Name' }),
    new Column({ id: 'MiddleName', caption: 'MiddleName',isSortable: false }),
    new Column({
        id: 'Gender',
        caption: 'Gender',
        isSortable:false,
        render: (row) => {
            if (row.Gender === "Male") {
                return `<span style="color:grey;">${row.Gender}</span>`;
            } else if (row.Gender === "Female") {
                return `<span style="color:purple;">${row.Gender}</span>`;
            }
            return `<span>${row.Gender || "N/A"}</span>`;
        }
    }),
    new Column({ id: 'Age', caption: 'Age', isSortable: false, hide: true }),
    new Column({
        id: "PreferredContact",
        caption: "Contact Info",
        isSortable: false,
        render: (row) => {
            if (!Array.isArray(row.Emails) || row.Emails.length === 0) {
                return "<p>No emails available</p>";
            }
            return `
                <div>
                    ${row.Emails.map(email => `<p style="color:grey; padding:4px 0">${email}</p>`).join("")}
                </div>
            `;
        }
    }),
];



/** SORT */
let activeSorts = [];

function applySort(sortFields) {
    const orderby = sortFields
        .filter(sf => sf.field) 
        .map(sf => `${sf.field} ${sf.order}`) 
        .join(", ");

    const params = new URLSearchParams(window.location.search);
    if (orderby) {
        params.set("$orderby", orderby);
        activeSorts = sortFields; 
    } else {
        params.delete("$orderby");
        activeSorts = [];
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);

    fetchPeopleFromODATA(orderby); 
    updateButtonState()
}


const sort = document.getElementById("sort");
sort.addEventListener("click", () => {
    const sortableCols = columns.filter(c => c.isSortable && !c.hide);
    const optionsHtml = sortableCols
        .map(c => `<option value="${c.id}">${c.caption}</option>`)
        .join("");

    showModal({
        title: `
        <svg width="133" height="25" viewBox="0 0 133 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 22L14 18H17V8H14L18 4L22 8H19V18H22M2 20V18H12V20M2 14V12H9V14M2 8V6H6V8H2Z"  fill="#DB8A74"/>
        </svg>`,
        body: `
            <div id="sortFields"></div>
            <button id="addSort" style="margin-top:10px; background:none; border:none; cursor:pointer">
                    <svg width="84" height="16" viewBox="0 0 84 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.6666 8.66671H8.66659V12.6667H7.33325V8.66671H3.33325V7.33337H7.33325V3.33337H8.66659V7.33337H12.6666V8.66671Z"  fill="#5856D6"/>
                </svg>
            </button>
        `,
        footer: `     
            <button id="resetSort" class="cancel">Reset</button>
            <button id="applySort" class="modal-close-btn">Apply</button>
        `
    });

    const sortFieldsDiv = document.getElementById("sortFields");

    // create a row
    function createSortRow(field = "", order = "asc") {
        const div = document.createElement("div");
        div.classList.add("sortRow");
        div.style.display = "flex";
        div.style.gap = "8px";
        div.style.marginBottom = "6px";

        div.innerHTML = `
        <select class="sortField">${optionsHtml}</select>
        <select class="sortOrder">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
        </select>
        <button class="deleteSortBtn" style="border:none;background:none;cursor:pointer; ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 3V4H4V6H5V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V6H20V4H15V3H9ZM7 6H17V19H7V6ZM9 8V17H11V8H9ZM13 8V17H15V8H13Z" fill="#A10900"/>
            </svg>
        </button>
        `;

        if (field) div.querySelector(".sortField").value = field;
        if (order) div.querySelector(".sortOrder").value = order;

        div.querySelector(".deleteSortBtn").addEventListener("click", () => {
        div.remove();
        });

        sortFieldsDiv.appendChild(div);
    }

    // Prefill 
    if (activeSorts.length > 0) {
        activeSorts.forEach(sf => createSortRow(sf.field, sf.order));
    } else {
        createSortRow();
    }

    document.getElementById("addSort").addEventListener("click", () => {
        createSortRow();
    });

    document.getElementById("applySort").addEventListener("click", () => {
        const sortFields = [...document.querySelectorAll(".sortRow")].map(row => ({
        field: row.querySelector(".sortField").value,
        order: row.querySelector(".sortOrder").value
        })).filter(sf => sf.field);

        applySort(sortFields);
        document.getElementById("modal").style.display = "none";
    });

    // Reset sorts
    document.getElementById("resetSort").addEventListener("click", () => {
        const params = new URLSearchParams(window.location.search);
        params.delete("$orderby");
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);

        activeSorts = []; 
        fetchPeopleFromODATA(); 
        document.getElementById("modal").style.display = "none";
    });
});



/**  FILTER */
let activeFilters = [];

function applyFilter(filterFields) {
    const params = new URLSearchParams(window.location.search);

    if (filterFields.length) {
        const filterExpr = filterFields.map(f => {
            switch (f.op) {
                case "equals":
                    return `${f.field} eq '${f.value}'`;
                case "contains":
                    return `contains(${f.field}, '${f.value}')`;
                case "starts":
                    return `startswith(${f.field}, '${f.value}')`;
                case "ends":
                    return `endswith(${f.field}, '${f.value}')`;
                default:
                    return "";
            }
        })
        .filter(Boolean) 
        .join(" and ");
        
        params.set("$filter", filterExpr);
        activeFilters = filterFields; 
    } else {
        params.delete("$filter");
        activeFilters = [];
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);  

    const orderby = params.get("$orderby"); 
    fetchPeopleFromODATA(orderby, params.get("$filter")); 
    updateButtonState()
}

const filter = document.getElementById("filter");
filter.addEventListener("click", () => {
    const filterableCols = columns.filter(c => c.isFilterable && !c.hide);

    const optionsHtml = filterableCols.map(c =>
        `<option value="${c.id}">${c.caption}</option>`
    ).join("");

    showModal({
        title: `
          <svg width="130" height="25" viewBox="0 0 130 25" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 13H18V11H6M3 6V8H21V6M10 18H14V16H10V18Z" fill="#DB8A74"/>
      
          </svg>
        `,
        body: `
        <div id="filterFields"></div>
        <button id="addFilterBtn" style="margin-top:10px;  background:none; border:none; cursor:pointer ">
           <svg width="83" height="16" viewBox="0 0 83 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path  fill="#5856D6"/>
          </svg>
        </button>
        `,
        footer: `
            <button id="resetFilter" class="cancel">Reset</button>
            <button id="applyFilterBtn" class="modal-close-btn">Apply</button>
        `
    });

    const filterFieldsDiv = document.getElementById("filterFields");

    function createFilterRow(field = "", op = "equals", value = "") {
        const div = document.createElement("div");
        div.classList.add("filterRow");
        div.style.display = "flex";
        div.style.gap = "8px";
        div.style.marginBottom = "6px";

        div.innerHTML = `
            <select class="filterField">${optionsHtml}</select>
            <select class="filterOp">
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="starts">Starts With</option>
                <option value="ends">Ends With</option>
            </select>
            <input class="filterVal" placeholder="Value" />
            <button class="deleteFilterBtn" style="border:none;background:none;cursor:pointer; ">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 3V4H4V6H5V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V6H20V4H15V3H9ZM7 6H17V19H7V6ZM9 8V17H11V8H9ZM13 8V17H15V8H13Z" fill="#A10900"/>
                </svg>
            </button>
        `;

        if (field) div.querySelector(".filterField").value = field;
        if (op) div.querySelector(".filterOp").value = op;
        if (value) div.querySelector(".filterVal").value = value;

        div.querySelector(".deleteFilterBtn").addEventListener("click", () => {
            div.remove();
        });

        filterFieldsDiv.appendChild(div);
    }

    if (activeFilters.length > 0) {
        activeFilters.forEach(f => createFilterRow(f.field, f.op, f.value));
    } else {
        createFilterRow();
        null;
    }

    document.getElementById("addFilterBtn").addEventListener("click", () => {
        createFilterRow();
    });

    document.getElementById("applyFilterBtn").addEventListener("click", () => {
        const filterFields = [...document.querySelectorAll(".filterRow")].map(row => ({
            field: row.querySelector(".filterField").value,
            op: row.querySelector(".filterOp").value,
            value: row.querySelector(".filterVal").value
        })).filter(f => f.field && f.value);

        applyFilter(filterFields);
        document.getElementById("modal").style.display = "none";
    });

    document.getElementById("resetFilter").addEventListener("click", () => {
        const params = new URLSearchParams(window.location.search);
        params.delete("$filter");
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);

        activeFilters = [];
        fetchPeopleFromODATA(params.get("$orderby"));
        document.getElementById("modal").style.display = "none";
    });
});


/** UPDATE SORT AND FILTER BUTTONS */
function updateButtonState() {
    updateBtn(document.getElementById("sort"), activeSorts.length, "Sort");
    updateBtn(document.getElementById("filter"), activeFilters.length, "Filter");
}

function updateBtn(button, count, label) {
    if (count > 0) {
        button.innerHTML = `
            <div style="
                display:inline-flex;
                align-items:center;
                background:#7b1b1b;
                color:#fff;
                padding:4px 8px;
                font-family:sans-serif;
                font-size:14px;
            ">
                <span style="margin-right:4px;">${count}</span>
                <span style="text-decoration:underline;">${label}</span>
                <button class="clear-btn" style="
                    background:#5a0f0f;
                    color:white;
                    border:none;
                    margin-left:6px;
                    cursor:pointer;
                    font-size:14px;
                    padding:0 4px;
                ">X</button>
            </div>
        `;

        button.querySelector(".clear-btn").onclick = () => {
            if (label.toLowerCase() === "sort") activeSorts = [];
            if (label.toLowerCase() === "filter") activeFilters = [];
            updateButtonState();
        };
    } else {
        button.innerHTML = `<span>${label}</span>`;
    }
}


        /** FETCH DATA */
let lastController = null;
async function fetchPeopleFromODATA(orderby = null, filter = null, page = 1, pageSize = 10) {
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
        if (!response.ok) throw new Error(`Fetch failed! ${response.status} ${response.statusText}`);
        
        const json = await response.json();
        const items = Array.isArray(json.value) ? json.value : [];

        if (!ODATATable) {
            ODATATable = new DynamicTable("tableContainer", columns, items, pageSize);
        } else {
            ODATATable.setData(items, page);
        }

        ODATATable.currentPage = page;

        const totalCount = typeof json["@odata.count"] === "number" ? json["@odata.count"] : items.length;
        renderPagination(totalCount, pageSize, page, orderby, filter);

        // console.log("Total Count:", totalCount, "Page:", page, "PageSize:", pageSize, "Total Pages:", Math.ceil(totalCount / pageSize));
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

        /** PAGINATION */
const paginationDiv = document.getElementById("pagination");
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
        params.set("page", currentPage - 1);  
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