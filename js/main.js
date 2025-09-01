
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
    new Column({ id: 'Age', caption: 'Age' })
];

let ODATATable = null;

// Apply sort and persist in the URL
function applySort(field, order) {
    const params = new URLSearchParams(window.location.search);
    params.set(`$orderby`, `${field} ${order}`);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
    fetchPeopleFromODATA(field, order)
}

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("$orderby")) {
        const [field, order] = params.get("$orderby").split(" ");
        fetchPeopleFromODATA(field, order);
    } else {
        fetchPeopleFromODATA();
    }
})

async function fetchPeopleFromODATA(sortField = null, sortOrder = "asc") {
    let baseURL = "https://services.odata.org/TripPinRESTierService/People"
    let url = baseURL;

    if (sortField) {
        url += `?$orderby=${sortField} ${sortOrder}`;
    }

    const res = await fetch(url);
    const json = await res.json();

    const data = json.value.map(p => ({
        UserName: p.UserName,
        FirstName: p.FirstName,
        LastName: p.LastName,
        MiddleName: p.MiddleName || "",
        Gender: p.Gender,
        Age: p.Age || ""
    }))

    if (!ODATATable) {
        ODATATable = new DynamicTable("tableContainer", columns, data, 5);
    } else {
        ODATATable.setData(data)
    }
}


fetchPeopleFromODATA();

function showModal({ title, body, footer }) {
  document.getElementById("modal-title").innerHTML = title || "";
  document.getElementById("modal-body").innerHTML = body || "";
  document.getElementById("modal-footer").innerHTML = footer || "";
  document.getElementById("modal").style.display = "flex";
}

document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
})

document.getElementById("sort").addEventListener("click", () => {

})



// SORTINGTABLE

document.getElementById("sort").addEventListener("click", () => {
  // Build options dynamically from columns
  const sortableCols = columns.filter(c => c.isSortable && !c.hide);

  const optionsHtml = sortableCols.map(
    c => `<option value="${c.id}">${c.caption}</option>`
  ).join("");
  showModal({
    title: "Sort Tickets",
    body: `
      <label>Choose field:</label>
      <select id="sortField">${optionsHtml}</select>
      <br><br>
      <label>Order:</label>
      <select id="sortOrder">
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    `,
    footer: `<button id="applySort">Apply</button>`
  });

  // attach handler for Apply
  document.getElementById("applySort").addEventListener("click", () => {
    const field = document.getElementById("sortField").value;
    const order = document.getElementById("sortOrder").value;

    applySort(field, order);
    document.getElementById("modal").style.display = "none";
  });
});


