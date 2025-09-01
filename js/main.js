// Load Filters on Refresh
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const orderby = params.get("$orderby");
  const filter  = params.get("$filter");
  fetchPeopleFromODATA(orderby, filter);
});


/** MODALS */
function showModal({ title, body, footer }) {
    document.getElementById("modal-title").innerHTML = title || "";
    document.getElementById("modal-body").innerHTML = body || "";
    document.getElementById("modal-footer").innerHTML = footer || "";
    document.getElementById("modal").style.display = "flex";
}

document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
})


// Table Head Columns
class Column {
    constructor({ id, caption, size = 100, align = "left", hide = false,
        isSortable = true, isFilterable = true, data_type = "string" }) {
        this.id = id;
        this.caption = caption;
        this.size = size;
        this.align = align;
        this.hide = hide;
        this.isSortable = isSortable;
        this.isFilterable = isFilterable;
        this.data_type = data_type
    }
}

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

        //  HEAD    
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

        //  BODY 
        const tbody = document.createElement("tbody");

        this.filteredData.forEach(row => {
            const tr2 = document.createElement("tr");
            this.columns.forEach(col => {
                if (!col.hide) {
                    const td = document.createElement("td");
                    td.style.textAlign = col.align;
                    td.textContent = row[col.id] ?? ""; 
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

    setData(newData) {
        this.rawData = newData;
        this.filteredData = [...newData];
        this.currentPage = 1;
        this.render();
    }
}

const columns = [
    new Column({ id: 'UserName', caption: 'UserName' }),
    new Column({ id: 'FirstName', caption: 'First Name' }),
    new Column({ id: 'LastName', caption: 'Last Name' }),
    new Column({ id: 'MiddleName', caption: 'MiddleName' }),
    new Column({ id: 'Gender', caption: 'Gender' }),
    new Column({ id: 'Age', caption: 'Age' }),
    // new Column({ id: 'Actions', caption: 'Actions' })
];

let ODATATable = null;


/** ----------- SORT ------------ */
// sortFields: [{ field: "LastName", order: "asc" }, { field: "FirstName", order: "desc" }]
function applySort(sortFields) {
  const orderby = sortFields
    .filter(sf => sf.field) 
    .map(sf => `${sf.field} ${sf.order}`)
    .join(", ");

  const params = new URLSearchParams(window.location.search);
  if (orderby) params.set("$orderby", orderby);
  else params.delete("$orderby");

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);

  fetchPeopleFromODATA(orderby);
}

// SORTINGTABLE
document.getElementById("sort").addEventListener("click", () => {
  const sortableCols = columns.filter(c => c.isSortable && !c.hide);
  const optionsHtml = sortableCols.map(
    c => `<option value="${c.id}">${c.caption}</option>`
  ).join("");

  showModal({
    title: "Sort Tickets",
    body: `
      <div id="sortFields">
        <div class="sortRow">
            <select class="sortField">${optionsHtml}</select>
            <select class="sortOrder">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
            </select>
        </div>
      </div>
      <button id="addSort">+ Add Another</button>
    `,
    footer: `
      <button id="resetSort">Reset</button>
      <button id="applySort">Apply</button>
    `
  });

  // Add more sort rows
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

  // Apply sorting
  document.getElementById("applySort").addEventListener("click", () => {
    const sortFields = [...document.querySelectorAll(".sortRow")].map(row => ({
      field: row.querySelector(".sortField").value,
      order: row.querySelector(".sortOrder").value
    }));

    applySort(sortFields);
    document.getElementById("modal").style.display = "none";
  });

  // Reset sorting
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
            .filter(Boolean) // Remove empty strings from unsupported ops
            .join(" and ");
        
        params.set("$filter", filterExpr);
    } else {
        params.delete("$filter");
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);  // Update the browsers URL
    const orderby = params.get("$orderby"); // Reuse sort if in URL
    fetchPeopleFromODATA(orderby, params.get("$filter"));
}

async function fetchPeopleFromODATA(orderby = null, filter = null) {
    let baseURL = "https://services.odata.org/TripPinRESTierService/People";
    const params = [];

    if (orderby) params.push(`$orderby=${encodeURIComponent(orderby)}`);
    if (filter) params.push(`$filter=${encodeURIComponent(filter)}`);

    // FIXED: string interpolation
    const url = params.length ? `${baseURL}?${params.join("&")}` : baseURL;
    console.log("fetching: ", url);

    const res = await fetch(url);
    const json = await res.json();

    const data = json.value.map(p => ({
        UserName: p.UserName,
        FirstName: p.FirstName,
        LastName: p.LastName,
        MiddleName: p.MiddleName || "",
        Gender: p.Gender,
        Age: p.Age || ""
    }));

    if (!ODATATable) {
        ODATATable = new DynamicTable("tableContainer", columns, data, 5);
    } else {
        ODATATable.setData(data);
    }
}


document.getElementById("filter").addEventListener("click", () => {
    const filterableCols = columns.filter(c => c.isFilterable && !c.hide);
    const optionsHtml = filterableCols.map(
        c => `<option value="${c.id}">${c.caption}</option>`
    ).join("");

    showModal({
        title: "Filter Tickets",
        body: `
            <div id="filterFields">
                <div class="filterRow">
                    <select class="filterField">${optionsHtml}</select>
                    <select class="filterOp">
                        <option value="equals">Equals</option>
                        <option value="contains">Contains</option>
                        <option value="starts">Starts With</option>
                        <option value="ends">Ends With</option>
                    </select>
                    <input class="filterVal" placeholder="Value" />
                </div>
            </div>
            <button id="addFilterBtn">+ Add Another</button>
        `,
        footer: `
            <button id="resetFilter">Reset</button>
            <button id="applyFilterBtn">Apply</button>
        `
    });

    // Add new filter row
    document.getElementById("addFilterBtn").addEventListener("click", () => {
        const div = document.createElement("div");
        div.className = "filterRow";
        div.innerHTML = `
            <select class="filterField">${optionsHtml}</select>
            <select class="filterOp">
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="starts">Starts With</option>
                <option value="ends">Ends With</option>
            </select>
            <input class="filterVal" placeholder="Value" />
        `;
        document.getElementById("filterFields").appendChild(div);
    });

    // Apply filters
    document.getElementById("applyFilterBtn").addEventListener("click", () => {
        const filterFields = [...document.querySelectorAll(".filterRow")].map(row => ({
            field: row.querySelector(".filterField").value,  
            op: row.querySelector(".filterOp").value,        
            value: row.querySelector(".filterVal").value
        }));

        applyFilter(filterFields);
        document.getElementById("modal").style.display = "none";
    });

    // Reset filters
    document.getElementById("resetFilter").addEventListener("click", () => {
        const params = new URLSearchParams(window.location.search);
        params.delete("$filter");
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);

        fetchPeopleFromODATA(params.get("$orderby"));
        document.getElementById("modal").style.display = "none";
    });
});




