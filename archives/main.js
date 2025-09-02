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


/** ----------- SORT */

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
        <button id="addSort"  class="filter-body" style="margin-top:10px;  background:none; border:none; cursor:pointer ">
            <svg width="83" height="16" viewBox="0 0 83 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 5.33333H2V4H14V5.33333ZM9.20667 10.6667H6.66667V12H8.72667C8.80667 11.52 8.97333 11.0733 9.20667 10.6667ZM12 7.33333H4V8.66667H12V7.33333ZM12 10V12H10V13.3333H12V15.3333H13.3333V13.3333H15.3333V12H13.3333V10H12Z" fill="#5856D6"/>
            <path d="M28.2628 12.5H26.2855L29.2983 3.77273H31.6761L34.6847 12.5H32.7074L30.5213 5.76705H30.4531L28.2628 12.5ZM28.1392 9.0696H32.8097V10.5099H28.1392V9.0696ZM37.8082 12.6065C37.3111 12.6065 36.8608 12.4787 36.4574 12.223C36.0568 11.9645 35.7386 11.5852 35.5028 11.0852C35.2699 10.5824 35.1534 9.96591 35.1534 9.2358C35.1534 8.4858 35.2741 7.86222 35.5156 7.36506C35.7571 6.86506 36.0781 6.49148 36.4787 6.24432C36.8821 5.99432 37.3239 5.86932 37.804 5.86932C38.1705 5.86932 38.4759 5.93182 38.7202 6.05682C38.9673 6.17898 39.1662 6.33239 39.3168 6.51705C39.4702 6.69886 39.5866 6.87784 39.6662 7.05398H39.7216V3.77273H41.5327V12.5H39.7429V11.4517H39.6662C39.581 11.6335 39.4602 11.8139 39.304 11.9929C39.1506 12.169 38.9503 12.3153 38.7031 12.4318C38.4588 12.5483 38.1605 12.6065 37.8082 12.6065ZM38.3835 11.1619C38.6761 11.1619 38.9233 11.0824 39.125 10.9233C39.3295 10.7614 39.4858 10.5355 39.5938 10.2457C39.7045 9.95597 39.7599 9.61648 39.7599 9.22727C39.7599 8.83807 39.706 8.5 39.598 8.21307C39.4901 7.92614 39.3338 7.70455 39.1293 7.5483C38.9247 7.39205 38.6761 7.31392 38.3835 7.31392C38.0852 7.31392 37.8338 7.39489 37.6293 7.55682C37.4247 7.71875 37.2699 7.94318 37.1648 8.23011C37.0597 8.51705 37.0071 8.84943 37.0071 9.22727C37.0071 9.60795 37.0597 9.9446 37.1648 10.2372C37.2727 10.527 37.4276 10.7543 37.6293 10.919C37.8338 11.081 38.0852 11.1619 38.3835 11.1619ZM45.4371 12.6065C44.94 12.6065 44.4897 12.4787 44.0863 12.223C43.6857 11.9645 43.3675 11.5852 43.1317 11.0852C42.8988 10.5824 42.7823 9.96591 42.7823 9.2358C42.7823 8.4858 42.9031 7.86222 43.1445 7.36506C43.386 6.86506 43.707 6.49148 44.1076 6.24432C44.511 5.99432 44.9528 5.86932 45.4329 5.86932C45.7994 5.86932 46.1048 5.93182 46.3491 6.05682C46.5962 6.17898 46.7951 6.33239 46.9457 6.51705C47.0991 6.69886 47.2156 6.87784 47.2951 7.05398H47.3505V3.77273H49.1616V12.5H47.3718V11.4517H47.2951C47.2099 11.6335 47.0891 11.8139 46.9329 11.9929C46.7795 12.169 46.5792 12.3153 46.332 12.4318C46.0877 12.5483 45.7894 12.6065 45.4371 12.6065ZM46.0124 11.1619C46.305 11.1619 46.5522 11.0824 46.7539 10.9233C46.9585 10.7614 47.1147 10.5355 47.2227 10.2457C47.3335 9.95597 47.3888 9.61648 47.3888 9.22727C47.3888 8.83807 47.3349 8.5 47.2269 8.21307C47.119 7.92614 46.9627 7.70455 46.7582 7.5483C46.5536 7.39205 46.305 7.31392 46.0124 7.31392C45.7141 7.31392 45.4627 7.39489 45.2582 7.55682C45.0536 7.71875 44.8988 7.94318 44.7937 8.23011C44.6886 8.51705 44.636 8.84943 44.636 9.22727C44.636 9.60795 44.6886 9.9446 44.7937 10.2372C44.9016 10.527 45.0565 10.7543 45.2582 10.919C45.4627 11.081 45.7141 11.1619 46.0124 11.1619ZM53.4656 12.5V3.77273H59.244V5.29403H55.3107V7.37358H58.8604V8.89489H55.3107V12.5H53.4656ZM60.451 12.5V5.95455H62.2663V12.5H60.451ZM61.3629 5.1108C61.093 5.1108 60.8615 5.02131 60.6683 4.84233C60.478 4.66051 60.3828 4.44318 60.3828 4.19034C60.3828 3.94034 60.478 3.72585 60.6683 3.54688C60.8615 3.36506 61.093 3.27415 61.3629 3.27415C61.6328 3.27415 61.8629 3.36506 62.0533 3.54688C62.2464 3.72585 62.343 3.94034 62.343 4.19034C62.343 4.44318 62.2464 4.66051 62.0533 4.84233C61.8629 5.02131 61.6328 5.1108 61.3629 5.1108ZM65.5359 3.77273V12.5H63.7205V3.77273H65.5359ZM70.4716 5.95455V7.31818H66.5298V5.95455H70.4716ZM67.4247 4.38636H69.2401V10.4886C69.2401 10.6562 69.2656 10.7869 69.3168 10.8807C69.3679 10.9716 69.4389 11.0355 69.5298 11.0724C69.6236 11.1094 69.7315 11.1278 69.8537 11.1278C69.9389 11.1278 70.0241 11.1207 70.1094 11.1065C70.1946 11.0895 70.2599 11.0767 70.3054 11.0682L70.5909 12.419C70.5 12.4474 70.3722 12.4801 70.2074 12.517C70.0426 12.5568 69.8423 12.581 69.6065 12.5895C69.169 12.6065 68.7855 12.5483 68.456 12.4148C68.1293 12.2812 67.875 12.0739 67.6932 11.7926C67.5114 11.5114 67.4219 11.1562 67.4247 10.7273V4.38636ZM74.5668 12.6278C73.8935 12.6278 73.3139 12.4915 72.8281 12.2188C72.3452 11.9432 71.973 11.554 71.7116 11.0511C71.4503 10.5455 71.3196 9.94744 71.3196 9.2571C71.3196 8.58381 71.4503 7.9929 71.7116 7.48438C71.973 6.97585 72.3409 6.57955 72.8153 6.29545C73.2926 6.01136 73.8523 5.86932 74.4943 5.86932C74.9261 5.86932 75.3281 5.93892 75.7003 6.07812C76.0753 6.21449 76.402 6.42045 76.6804 6.69602C76.9616 6.97159 77.1804 7.31818 77.3366 7.7358C77.4929 8.15057 77.571 8.63636 77.571 9.19318V9.69176H72.044V8.56676H75.8622C75.8622 8.3054 75.8054 8.07386 75.6918 7.87216C75.5781 7.67045 75.4205 7.51278 75.2188 7.39915C75.0199 7.28267 74.7884 7.22443 74.5241 7.22443C74.2486 7.22443 74.0043 7.28835 73.7912 7.41619C73.581 7.54119 73.4162 7.71023 73.2969 7.9233C73.1776 8.13352 73.1165 8.3679 73.1136 8.62642V9.69602C73.1136 10.0199 73.1733 10.2997 73.2926 10.5355C73.4148 10.7713 73.5866 10.9531 73.8082 11.081C74.0298 11.2088 74.2926 11.2727 74.5966 11.2727C74.7983 11.2727 74.983 11.2443 75.1506 11.1875C75.3182 11.1307 75.4616 11.0455 75.581 10.9318C75.7003 10.8182 75.7912 10.679 75.8537 10.5142L77.5327 10.625C77.4474 11.0284 77.2727 11.3807 77.0085 11.6818C76.7472 11.9801 76.4091 12.2131 75.9943 12.3807C75.5824 12.5455 75.1065 12.6278 74.5668 12.6278ZM78.7557 12.5V5.95455H80.5156V7.09659H80.5838C80.7031 6.69034 80.9034 6.38352 81.1847 6.17614C81.4659 5.96591 81.7898 5.8608 82.1562 5.8608C82.2472 5.8608 82.3452 5.86648 82.4503 5.87784C82.5554 5.8892 82.6477 5.90483 82.7273 5.92472V7.53551C82.642 7.50994 82.5241 7.48722 82.3736 7.46733C82.223 7.44744 82.0852 7.4375 81.9602 7.4375C81.6932 7.4375 81.4545 7.49574 81.2443 7.61222C81.0369 7.72585 80.8722 7.88494 80.75 8.08949C80.6307 8.29403 80.571 8.52983 80.571 8.79688V12.5H78.7557Z" fill="#5856D6"/>
            </svg>
        </button>
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


        /**  FILTER */
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

const filter = document.getElementById("filter");
filter.addEventListener("click", () => {
    const filterableCols = columns.filter(c => c.isFilterable && !c.hide);
    const optionsHtml = filterableCols.map(c => `<option value="${c.id}"> ${c.caption} </option>`).join("");
    
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
        <button id="addFilterBtn" style="margin-top:10px;  background:none; border:none; cursor:pointer ">
          <svg width="83" height="16" viewBox="0 0 83 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 5.33333H2V4H14V5.33333ZM9.20667 10.6667H6.66667V12H8.72667C8.80667 11.52 8.97333 11.0733 9.20667 10.6667ZM12 7.33333H4V8.66667H12V7.33333ZM12 10V12H10V13.3333H12V15.3333H13.3333V13.3333H15.3333V12H13.3333V10H12Z" fill="#5856D6"/>
          <path d="M28.2628 12.5H26.2855L29.2983 3.77273H31.6761L34.6847 12.5H32.7074L30.5213 5.76705H30.4531L28.2628 12.5ZM28.1392 9.0696H32.8097V10.5099H28.1392V9.0696ZM37.8082 12.6065C37.3111 12.6065 36.8608 12.4787 36.4574 12.223C36.0568 11.9645 35.7386 11.5852 35.5028 11.0852C35.2699 10.5824 35.1534 9.96591 35.1534 9.2358C35.1534 8.4858 35.2741 7.86222 35.5156 7.36506C35.7571 6.86506 36.0781 6.49148 36.4787 6.24432C36.8821 5.99432 37.3239 5.86932 37.804 5.86932C38.1705 5.86932 38.4759 5.93182 38.7202 6.05682C38.9673 6.17898 39.1662 6.33239 39.3168 6.51705C39.4702 6.69886 39.5866 6.87784 39.6662 7.05398H39.7216V3.77273H41.5327V12.5H39.7429V11.4517H39.6662C39.581 11.6335 39.4602 11.8139 39.304 11.9929C39.1506 12.169 38.9503 12.3153 38.7031 12.4318C38.4588 12.5483 38.1605 12.6065 37.8082 12.6065ZM38.3835 11.1619C38.6761 11.1619 38.9233 11.0824 39.125 10.9233C39.3295 10.7614 39.4858 10.5355 39.5938 10.2457C39.7045 9.95597 39.7599 9.61648 39.7599 9.22727C39.7599 8.83807 39.706 8.5 39.598 8.21307C39.4901 7.92614 39.3338 7.70455 39.1293 7.5483C38.9247 7.39205 38.6761 7.31392 38.3835 7.31392C38.0852 7.31392 37.8338 7.39489 37.6293 7.55682C37.4247 7.71875 37.2699 7.94318 37.1648 8.23011C37.0597 8.51705 37.0071 8.84943 37.0071 9.22727C37.0071 9.60795 37.0597 9.9446 37.1648 10.2372C37.2727 10.527 37.4276 10.7543 37.6293 10.919C37.8338 11.081 38.0852 11.1619 38.3835 11.1619ZM45.4371 12.6065C44.94 12.6065 44.4897 12.4787 44.0863 12.223C43.6857 11.9645 43.3675 11.5852 43.1317 11.0852C42.8988 10.5824 42.7823 9.96591 42.7823 9.2358C42.7823 8.4858 42.9031 7.86222 43.1445 7.36506C43.386 6.86506 43.707 6.49148 44.1076 6.24432C44.511 5.99432 44.9528 5.86932 45.4329 5.86932C45.7994 5.86932 46.1048 5.93182 46.3491 6.05682C46.5962 6.17898 46.7951 6.33239 46.9457 6.51705C47.0991 6.69886 47.2156 6.87784 47.2951 7.05398H47.3505V3.77273H49.1616V12.5H47.3718V11.4517H47.2951C47.2099 11.6335 47.0891 11.8139 46.9329 11.9929C46.7795 12.169 46.5792 12.3153 46.332 12.4318C46.0877 12.5483 45.7894 12.6065 45.4371 12.6065ZM46.0124 11.1619C46.305 11.1619 46.5522 11.0824 46.7539 10.9233C46.9585 10.7614 47.1147 10.5355 47.2227 10.2457C47.3335 9.95597 47.3888 9.61648 47.3888 9.22727C47.3888 8.83807 47.3349 8.5 47.2269 8.21307C47.119 7.92614 46.9627 7.70455 46.7582 7.5483C46.5536 7.39205 46.305 7.31392 46.0124 7.31392C45.7141 7.31392 45.4627 7.39489 45.2582 7.55682C45.0536 7.71875 44.8988 7.94318 44.7937 8.23011C44.6886 8.51705 44.636 8.84943 44.636 9.22727C44.636 9.60795 44.6886 9.9446 44.7937 10.2372C44.9016 10.527 45.0565 10.7543 45.2582 10.919C45.4627 11.081 45.7141 11.1619 46.0124 11.1619ZM53.4656 12.5V3.77273H59.244V5.29403H55.3107V7.37358H58.8604V8.89489H55.3107V12.5H53.4656ZM60.451 12.5V5.95455H62.2663V12.5H60.451ZM61.3629 5.1108C61.093 5.1108 60.8615 5.02131 60.6683 4.84233C60.478 4.66051 60.3828 4.44318 60.3828 4.19034C60.3828 3.94034 60.478 3.72585 60.6683 3.54688C60.8615 3.36506 61.093 3.27415 61.3629 3.27415C61.6328 3.27415 61.8629 3.36506 62.0533 3.54688C62.2464 3.72585 62.343 3.94034 62.343 4.19034C62.343 4.44318 62.2464 4.66051 62.0533 4.84233C61.8629 5.02131 61.6328 5.1108 61.3629 5.1108ZM65.5359 3.77273V12.5H63.7205V3.77273H65.5359ZM70.4716 5.95455V7.31818H66.5298V5.95455H70.4716ZM67.4247 4.38636H69.2401V10.4886C69.2401 10.6562 69.2656 10.7869 69.3168 10.8807C69.3679 10.9716 69.4389 11.0355 69.5298 11.0724C69.6236 11.1094 69.7315 11.1278 69.8537 11.1278C69.9389 11.1278 70.0241 11.1207 70.1094 11.1065C70.1946 11.0895 70.2599 11.0767 70.3054 11.0682L70.5909 12.419C70.5 12.4474 70.3722 12.4801 70.2074 12.517C70.0426 12.5568 69.8423 12.581 69.6065 12.5895C69.169 12.6065 68.7855 12.5483 68.456 12.4148C68.1293 12.2812 67.875 12.0739 67.6932 11.7926C67.5114 11.5114 67.4219 11.1562 67.4247 10.7273V4.38636ZM74.5668 12.6278C73.8935 12.6278 73.3139 12.4915 72.8281 12.2188C72.3452 11.9432 71.973 11.554 71.7116 11.0511C71.4503 10.5455 71.3196 9.94744 71.3196 9.2571C71.3196 8.58381 71.4503 7.9929 71.7116 7.48438C71.973 6.97585 72.3409 6.57955 72.8153 6.29545C73.2926 6.01136 73.8523 5.86932 74.4943 5.86932C74.9261 5.86932 75.3281 5.93892 75.7003 6.07812C76.0753 6.21449 76.402 6.42045 76.6804 6.69602C76.9616 6.97159 77.1804 7.31818 77.3366 7.7358C77.4929 8.15057 77.571 8.63636 77.571 9.19318V9.69176H72.044V8.56676H75.8622C75.8622 8.3054 75.8054 8.07386 75.6918 7.87216C75.5781 7.67045 75.4205 7.51278 75.2188 7.39915C75.0199 7.28267 74.7884 7.22443 74.5241 7.22443C74.2486 7.22443 74.0043 7.28835 73.7912 7.41619C73.581 7.54119 73.4162 7.71023 73.2969 7.9233C73.1776 8.13352 73.1165 8.3679 73.1136 8.62642V9.69602C73.1136 10.0199 73.1733 10.2997 73.2926 10.5355C73.4148 10.7713 73.5866 10.9531 73.8082 11.081C74.0298 11.2088 74.2926 11.2727 74.5966 11.2727C74.7983 11.2727 74.983 11.2443 75.1506 11.1875C75.3182 11.1307 75.4616 11.0455 75.581 10.9318C75.7003 10.8182 75.7912 10.679 75.8537 10.5142L77.5327 10.625C77.4474 11.0284 77.2727 11.3807 77.0085 11.6818C76.7472 11.9801 76.4091 12.2131 75.9943 12.3807C75.5824 12.5455 75.1065 12.6278 74.5668 12.6278ZM78.7557 12.5V5.95455H80.5156V7.09659H80.5838C80.7031 6.69034 80.9034 6.38352 81.1847 6.17614C81.4659 5.96591 81.7898 5.8608 82.1562 5.8608C82.2472 5.8608 82.3452 5.86648 82.4503 5.87784C82.5554 5.8892 82.6477 5.90483 82.7273 5.92472V7.53551C82.642 7.50994 82.5241 7.48722 82.3736 7.46733C82.223 7.44744 82.0852 7.4375 81.9602 7.4375C81.6932 7.4375 81.4545 7.49574 81.2443 7.61222C81.0369 7.72585 80.8722 7.88494 80.75 8.08949C80.6307 8.29403 80.571 8.52983 80.571 8.79688V12.5H78.7557Z" fill="#5856D6"/>
          </svg>
        </button>
        `,
        footer: `           
             <button id="resetFilter" class="cancel">Reset </button>
            <button id="applyFilterBtn" class="modal-close-btn">Submit</button>
        `
    });

    // Add New Filter Row
    document.getElementById("addFilterBtn").addEventListener("click", () => {
        const div = document.createElement("div");
        div.innerHTML = `
                    <select class="filterField">${optionsHtml}</select>
                    <select class="filterOp">
                        <option value="equals">Equals</option>
                        <option value="contains">Contains</option>
                        <option value="starts">Starts With</option>
                        <option value="ends">Ends With</option>
                    </select>
                    <input class="filterVal" placeholder="Value" />        
        `
        document.getElementById("filterFields").appendChild(div);
    })

    // Apply filters
    document.getElementById("applyFilterBtn").addEventListener("click", () => {
        const filterFields = [...document.querySelectorAll(".filterRow")].map(row => ({
            field: row.querySelector(".filterField").value,  
            op: row.querySelector(".filterOp").value,        
            value: row.querySelector(".filterVal").value
        }))

        applyFilter(filterFields);
        document.getElementById("modal").style.display = "none";
    })

        // Reset filters
    document.getElementById("resetFilter").addEventListener("click", () => {
        const params = new URLSearchParams(window.location.search);
        params.delete("$filter");
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);

        fetchPeopleFromODATA(params.get("$orderby"));
        document.getElementById("modal").style.display = "none";
    });
})



        /** FETCH DATA */
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
        // console.log("Fetching:", url);

        const response = await fetch(url, { signal: controller.signal, headers: { "Accept": "application/json" } });
        if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
        
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