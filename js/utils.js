
export function refreshDOM() {
    document.addEventListener("DOMContentLoaded", () => {
    const refreshBtn = document.getElementById("refresh");
    refreshBtn.addEventListener("click", () => {
        window.location.reload();
    });
    });
}



export function activeUrl() {
    document.querySelectorAll(".nav-link").forEach(link => {
    if (link.href === window.location.href) link.classList.add("active");
    });
}




/** UPDATE SORT AND FILTER BUTTONS */
export function updateButtonState() {
    updateBtn(document.getElementById("sort"), activeSorts.length, "Sort");
    updateBtn(document.getElementById("filter"), activeFilters.length, "Filter");
}

export function updateBtn(button, count, label) {
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