

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

        // ---------- HEAD ----------
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

        // ---------- BODY ----------
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

}

const columns = [
    new Column({ id: 'UserName', caption: 'UserName' }),
    new Column({ id: 'FirstName', caption: 'First Name' }),
    new Column({ id: 'LastName', caption: 'Last Name' }),
    new Column({ id: 'MiddleName', caption: 'MiddleName' }),
    new Column({ id: 'Gender', caption: 'Gender' }),
    new Column({ id: 'Age', caption: 'Age' })
];



async function fetchPeopleFromODATA() {
  const res = await fetch("https://services.odata.org/TripPinRESTierService/People")

  const json = await res.json();

  const data = json.value.map(p => ({
    UserName: p.UserName,
    FirstName: p.FirstName,
    LastName: p.LastName,
    MiddleName: p.MiddleName ?? "",
    Gender: p.Gender,
    Age: p.Age ?? ""
  }))

  new DynamicTable("tableContainer", columns, data, 5)
}


fetchPeopleFromODATA();






const columns2 = [
    new Column({ id: 'ticket_id', caption: "Ticket ID", data_type: "number", size: 25 }),
    new Column({ id: 'raised_by', caption: "Raised by", align: 'right' }),
    new Column({ id: 'ticket_details', caption: "Ticket Details" }),
    new Column({ id: 'date_created', caption: "Date Created" }),
    new Column({ id: 'actions', caption: "Actions" })
];

// const data = [
//   { username: "jdoe", first_name: "John", last_name: "Doe", middle_name: "A", gender: "Male", age: 29 },
//   { username: "asmith", first_name: "Alice", last_name: "Smith", middle_name: "B", gender: "Female", age: 34 },
//   { username: "bwilliams", first_name: "Bob", last_name: "Williams", middle_name: "C", gender: "Male", age: 41 },
//   { username: "cjohnson", first_name: "Carol", last_name: "Johnson", middle_name: "D", gender: "Female", age: 25 },
//   { username: "dmiller", first_name: "David", last_name: "Miller", middle_name: "E", gender: "Male", age: 37 }
// ];

// const data2 = [
//   { 
//     ticket_id: 1, 
//     raised_by: "jdoe", 
//     ticket_details: "Login issue on portal", 
//     date_created: "2025-08-20", 
//     actions: "View"
//   },
//   { 
//     ticket_id: 2, 
//     raised_by: "asmith", 
//     ticket_details: "Page not loading on dashboard", 
//     date_created: "2025-08-21", 
//     actions: "View"
//   },
//   { 
//     ticket_id: 3, 
//     raised_by: "bwilliams", 
//     ticket_details: "Password reset not working", 
//     date_created: "2025-08-22", 
//     actions: "Edit"
//   },
//   { 
//     ticket_id: 4, 
//     raised_by: "cjohnson", 
//     ticket_details: "Feature request: Dark mode", 
//     date_created: "2025-08-23", 
//     actions: "Close"
//   },
//   { 
//     ticket_id: 5, 
//     raised_by: "dmiller", 
//     ticket_details: "Error 500 on reports page", 
//     date_created: "2025-08-24", 
//     actions: "View"
//   }
// ];



// const table2 = new DynamicTable("tableContainer2", columns2, data2, 3);
