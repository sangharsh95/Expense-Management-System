
document.addEventListener("DOMContentLoaded", () => {
    

    // ===== Local storage data =====
    let users = JSON.parse(localStorage.getItem("users") || "[]");
    let expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
    let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

    
    

    // ===== LOGIN =====
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", e => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value.trim().toLowerCase();
            const password = document.getElementById("loginPassword").value.trim();
            const role = document.getElementById("loginRole").value;

            const user = users.find(u => u.email.toLowerCase() === email && u.password === password && u.role === role);

            if (user) {
                localStorage.setItem("currentUser", JSON.stringify(user));
                window.location.href = "dashboard.html";
            } else {
                alert("Invalid credentials!");
            }
        });
    }

    // ===== REGISTER =====
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", e => {
            e.preventDefault();
            const name = document.getElementById("regName").value.trim();
            const email = document.getElementById("regEmail").value.trim().toLowerCase();
            const password = document.getElementById("regPassword").value.trim();
            const role = document.getElementById("regRole").value;
            const msgEl = document.getElementById("regMessage");

            // basic validation with inline messages and focus
            if (!name) {
                if (msgEl) { msgEl.style.color = "#c00"; msgEl.textContent = "Please enter your name."; }
                document.getElementById("regName").focus();
                return;
            }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                if (msgEl) { msgEl.style.color = "#c00"; msgEl.textContent = "Please enter a valid email."; }
                document.getElementById("regEmail").focus();
                return;
            }
            if (!password || password.length < 4) {
                if (msgEl) { msgEl.style.color = "#c00"; msgEl.textContent = "Password must be at least 4 characters."; }
                document.getElementById("regPassword").focus();
                return;
            }
            if (!role) {
                if (msgEl) { msgEl.style.color = "#c00"; msgEl.textContent = "Please select a role."; }
                document.getElementById("regRole").focus();
                return;
            }

            if (users.find(u => u.email && u.email.toLowerCase() === email)) {
                if (msgEl) { msgEl.style.color = "#c00"; msgEl.textContent = "User already exists! Try logging in."; }
                document.getElementById("regEmail").focus();
                return;
            }

            const user = { name, email, password, role };
            users.push(user);
            localStorage.setItem("users", JSON.stringify(users));
            if (msgEl) { msgEl.style.color = "#0a0"; msgEl.textContent = "Registered successfully — redirecting to login..."; }
            setTimeout(() => window.location.href = "index.html", 900);
        });
    }

    // ===== DASHBOARD =====
    const dashboardRoleElem = document.getElementById("dashboardRole");
    if (dashboardRoleElem) {
        if (!currentUser) {
            alert("Please login first!");
            window.location.href = "index.html";
            return;
        }

        dashboardRoleElem.innerText = `${currentUser.name} (${currentUser.role})`;

        // Show/hide sections
        const sections = {
            Employee: document.getElementById("employeeSection"),
            Manager: document.getElementById("managerSection"),
            Admin: document.getElementById("adminSection")
        };
        Object.keys(sections).forEach(r => {
            if (sections[r]) sections[r].style.display = (r === currentUser.role) ? "block" : "none";
        });

        // Populate admin users list if admin
        if (currentUser.role === "Admin") {
            const allUsersList = document.getElementById("allUsers");
            if (allUsersList) {
                allUsersList.innerHTML = "";
                users.forEach(u => {
                    const li = document.createElement("li");
                    li.textContent = `${u.name} - ${u.email} (${u.role})`;
                    allUsersList.appendChild(li);
                });
            }
        }

        renderExpenses();
    }

    // ===== LOGOUT BUTTON =====
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        // create a robust global logout function (also usable from onclick attr)
        window.logout = function() {
            // UI feedback
            try {
                const b = document.getElementById('logoutBtn');
                if (b) {
                    b.disabled = true;
                    b.textContent = 'Logging out...';
                    b.style.opacity = '0.7';
                }
            } catch (e) {}

            // helper to finalize client-side logout and redirect
            const finalize = () => {
                try { localStorage.removeItem('currentUser'); } catch (e) {}
                try { window.location.replace('index.html'); } catch (e) { window.location.href = 'index.html'; }
            };

            // Try server-side logout endpoints, if any. If they fail or time out, finalize locally.
            const attempts = [
                { url: '/logout', method: 'POST' },
                { url: '/api/logout', method: 'POST' }
            ];

            // Sequentially attempt endpoints with a small timeout
            let done = false;

            const tryNext = (i) => {
                if (done || i >= attempts.length) return finalize();
                const a = attempts[i];
                // attempt fetch with credentials so cookies/sessions are cleared
                fetch(a.url, { method: a.method, credentials: 'include', headers: { 'Content-Type':'application/json' } })
                    .then(res => {
                        // consider 2xx or 204 success
                        if (res.ok) {
                            done = true;
                            finalize();
                        } else {
                            // try next
                            setTimeout(() => tryNext(i+1), 250);
                        }
                    }).catch(err => {
                        // network error or not found — try next
                        setTimeout(() => tryNext(i+1), 250);
                    });
            };

            // give the fetch attempts a short grace period then finalize if nothing responds
            tryNext(0);
            // safety fallback after 2s
            setTimeout(() => { if (!done) finalize(); }, 2000);
        }

        // wire both listener and onclick property for robustness
        logoutBtn.addEventListener("click", window.logout);
        logoutBtn.onclick = window.logout;
    }

    // delegated handler (in case event propagation is altered elsewhere)
    document.addEventListener('click', (e) => {
        const el = e.target;
        if (!el) return;
        if (el.dataset && el.dataset.action === 'logout') {
            e.preventDefault();
            window.logout && window.logout();
        }
    });


    // ===== EMPLOYEE EXPENSE SUBMISSION =====
    const expenseForm = document.getElementById("expenseForm");
    if (expenseForm) {
        expenseForm.addEventListener("submit", e => {
            e.preventDefault();
            if (!currentUser) { alert("Please login first!"); return; }

            // gather and validate values
            const amountRaw = document.getElementById("expAmount").value;
            const amount = parseFloat((amountRaw || "").toString().trim());
            const category = document.getElementById("expCategory").value.trim();
            const description = document.getElementById("expDesc").value.trim();
            const date = document.getElementById("expDate").value;

            if (!isFinite(amount) || amount <= 0) { alert("Please enter a valid amount greater than 0."); return; }
            if (!category) { alert("Please enter a category."); return; }
            if (!description) { alert("Please enter a description."); return; }
            if (!date) { alert("Please select a date."); return; }

            // normalize approver emails to lowercase for reliable matching
            const approvers = users
                .filter(u => u.role === "Manager" || u.role === "Admin")
                .map(u => (u.email || '').toString().toLowerCase());
            if (approvers.length === 0) { alert("No approvers exist. Ask Admin to add approvers."); return; }

            const expense = {
                employee: (currentUser.name || '').toString().trim(),
                // store email lowercased so matching is robust
                employeeEmail: (currentUser.email || '').toString().toLowerCase(),
                amount: amount,
                category: category,
                description: description,
                date: date,
                status: "Pending",
                approverEmails: approvers
            };

            expenses.push(expense);
            localStorage.setItem("expenses", JSON.stringify(expenses));
            // friendly feedback inline instead of blocking alert
            alert("Expense submitted!");
            expenseForm.reset();
            // refresh currentUser value (in-memory) and rerender
            currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
            renderExpenses();
        });
    }

    // ===== RENDER EXPENSES =====
    function renderExpenses() {
        // Clear all possible table bodies
        const empBody = document.getElementById("employeeExpenseTableBody");
        const mgrBody = document.getElementById("managerExpenseTableBody");
        const adminBody = document.getElementById("adminExpenseTableBody");
        if (empBody) empBody.innerHTML = "";
        if (mgrBody) mgrBody.innerHTML = "";
        if (adminBody) adminBody.innerHTML = "";

        // Populate rows using the original expenses array index so approve/reject map correctly
        expenses.forEach((exp, globalIndex) => {
            // Employee view: only their own expenses
            if (currentUser.role === "Employee") {
                const matchesByEmail = exp.employeeEmail && currentUser.email && exp.employeeEmail.toLowerCase() === currentUser.email.toLowerCase();
                const matchesByName = exp.employee === currentUser.name;
                if (matchesByEmail || matchesByName) {
                    if (!empBody) return;
                    const tr = document.createElement("tr");
                    tr.innerHTML = `<td>${globalIndex + 1}</td>
                                    <td>${exp.employee}</td>
                                    <td>${(isFinite(exp.amount) ? exp.amount.toFixed(2) : exp.amount)}</td>
                                    <td>${exp.category}</td>
                                    <td>${exp.description}</td>
                                    <td>${exp.date}</td>
                                    <td>${exp.status}</td>`;
                    empBody.appendChild(tr);
                }
                    }

            // Manager view: expenses where manager is an approver
            if (currentUser.role === "Manager" && exp.approverEmails && exp.approverEmails.includes(currentUser.email)) {
                if (!mgrBody) return;
                const tr = document.createElement("tr");
                tr.innerHTML = `<td>${globalIndex + 1}</td>
                                <td>${exp.employee}</td>
                                <td>${(isFinite(exp.amount) ? exp.amount.toFixed(2) : exp.amount)}</td>
                                <td>${exp.category}</td>
                                <td>${exp.description}</td>
                                <td>${exp.date}</td>
                                <td>${exp.status}</td>
                                <td>${exp.status === "Pending" ? `<button class="approveBtn" data-index="${globalIndex}">Approve</button>
                                                                 <button class="rejectBtn" data-index="${globalIndex}">Reject</button>` : ''}</td>`;
                mgrBody.appendChild(tr);
            }

            // Admin view: show all expenses
            if (currentUser.role === "Admin") {
                if (!adminBody) return;
                const tr = document.createElement("tr");
                tr.innerHTML = `<td>${globalIndex + 1}</td>
                                <td>${exp.employee}</td>
                                <td>${(isFinite(exp.amount) ? exp.amount.toFixed(2) : exp.amount)}</td>
                                <td>${exp.category}</td>
                                <td>${exp.description}</td>
                                <td>${exp.date}</td>
                                <td>${exp.status}</td>`;
                adminBody.appendChild(tr);
            }
        });

        // Attach approval/rejection events dynamically (use event delegation for safety)
        document.querySelectorAll(".approveBtn").forEach(btn => {
            btn.removeEventListener && btn.removeEventListener("click", () => {});
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.index, 10);
                if (!Number.isInteger(idx) || !expenses[idx]) return;
                expenses[idx].status = "Approved";
                localStorage.setItem("expenses", JSON.stringify(expenses));
                renderExpenses();
            });
        });

        document.querySelectorAll(".rejectBtn").forEach(btn => {
            btn.removeEventListener && btn.removeEventListener("click", () => {});
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.index, 10);
                if (!Number.isInteger(idx) || !expenses[idx]) return;
                expenses[idx].status = "Rejected";
                localStorage.setItem("expenses", JSON.stringify(expenses));
                renderExpenses();
            });
        });
    }
});
