Snippet 1 (pushState)
nextBtn.onclick = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", currentPage + 1);
    if (orderby) params.set("$orderby", orderby);
    if (filter) params.set("$filter", filter);
    window.history.pushState({}, "", `?${params.toString()}`);
    fetchPeopleFromODATA(orderby, filter, currentPage + 1, pageSize);
}


🔑 Key Behaviors:

pushState adds a new history entry → every time you click "Next", the browser history stack gets a new state.

User can press Back to go to the previous page number.

Example: /people?page=1 → /people?page=2 → /people?page=3.

Explicitly carries over orderby and filter.

Even if they are not in the URL, it forces them back.

Fetch call uses the function arguments (orderby, filter) directly rather than reading them from the URL again.

👉 This version is better for navigation consistency — users can use browser forward/back buttons to navigate pages.

Snippet 2 (replaceState)
nextBtn.onclick = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", currentPage + 1);
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
    fetchPeopleFromODATA(params.get("$orderby"), params.get("$filter"), currentPage + 1, pageSize);
};


🔑 Key Behaviors:

replaceState replaces current history entry → no new history is created.

User pressing Back won’t return to previous page numbers (they’ll exit the app/page instead).

Example: /people?page=1 becomes /people?page=2, overwriting it.

Only updates page.

If orderby or filter were not already in params, they get lost.

So if you were on /people?page=1&$orderby=FirstName, after navigating, it may drop $orderby.

Fetch call pulls filters from the URL instead of directly from variables.

👉 This version is lighter, avoids cluttering history, but makes navigation/back button less user-friendly and risks losing filters.

✅ Recommendation:

Use pushState (Snippet 1) if you want proper pagination navigation with history support.

Use replaceState (Snippet 2) if you want a "single-page feel" where URL updates but history doesn’t pile up.